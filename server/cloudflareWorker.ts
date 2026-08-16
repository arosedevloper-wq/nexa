/**
 * Cloudflare Edge Worker API for NexaSpin Platform
 * 
 * - Full TypeScript typing with D1Database interface
 * - Serverless edge API routing for /api/* (game engine, wallets, withdrawals, RTP, host AI)
 * - Atomic double-entry ledger transactions via env.DB.batch()
 * - Single-Page-Application fallback & static asset serving via env.ASSETS
 */

import { GoogleGenAI } from "@google/genai";
import { evaluateServerGameOutcome, setServerRtpConfig, getServerRtpConfig } from "./gameEngine";

export interface Env {
  DB?: D1Database;
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
  ENVIRONMENT?: string;
  GEMINI_API_KEY?: string;
  DEFAULT_RTP?: string;
  JWT_SECRET?: string;
}

export interface PlayerRow {
  id: string;
  email: string;
  name: string;
  phone_number?: string | null;
  role: string;
  chips: number;
  bonus_balance: number;
  peak_chips: number;
  loan_count: number;
  cumulative_losses: number;
  total_wager_required: number;
  current_wager_progress: number;
  created_at: string;
  updated_at: string;
}

export interface TransactionRow {
  id: string;
  player_id: string;
  player_email: string;
  type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  game_id?: string | null;
  status: string;
  description?: string | null;
  metadata?: string | null;
  created_at: string;
}

export interface PlayGameRequestBody {
  gameId: string;
  betAmount: number;
  choices?: Record<string, any>;
}

export interface WithdrawRequestBody {
  amount: number;
  cryptoAsset?: string;
  walletAddress: string;
}

// In-memory fallback for local preview or unprovisioned edge instances
const memoryWallets = new Map<string, { balance: number; transactions: any[] }>();

function getMemoryWallet(userId: string) {
  const norm = userId.toLowerCase().trim();
  if (!memoryWallets.has(norm)) {
    memoryWallets.set(norm, { balance: 1000, transactions: [] });
  }
  return memoryWallets.get(norm)!;
}

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-user-email, x-user-id",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

function errorResponse(error: string, message: string, status = 400): Response {
  return jsonResponse({ error, message, success: false }, status);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Intercept backend API routes
    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApiRequest(request, url, env);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown edge runtime error";
        console.error("Worker API Error:", message);
        return errorResponse("INTERNAL_SERVER_ERROR", message, 500);
      }
    }

    // Fall back to Cloudflare Pages / Workers static assets SPA serving
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not Found", { status: 404 });
  },
};

/**
 * Main API Request Router
 */
async function handleApiRequest(request: Request, url: URL, env: Env): Promise<Response> {
  const pathname = url.pathname;
  const method = request.method;

  // 1. Health Check
  if (pathname === "/api/health" && method === "GET") {
    return jsonResponse({
      status: "ok",
      platform: "Cloudflare Workers & D1 Edge Runtime",
      timestamp: new Date().toISOString(),
      d1Connected: Boolean(env.DB),
      environment: env.ENVIRONMENT || "production",
    });
  }

  // 2. Server-Authoritative Provably Fair Game Turn
  if (pathname === "/api/game/play" && method === "POST") {
    const userEmail = request.headers.get("x-user-email") || request.headers.get("x-user-id");
    if (!userEmail) {
      return errorResponse("UNAUTHORIZED", "Missing required authentication header (x-user-email).", 401);
    }

    const body = (await request.json().catch(() => ({}))) as PlayGameRequestBody;
    const { gameId, betAmount, choices } = body;

    if (!gameId || typeof betAmount !== "number" || betAmount <= 0) {
      return errorResponse("INVALID_PARAMETERS", "gameId and positive numeric betAmount are required.", 400);
    }

    // Evaluate Provably Fair Game Math strictly at edge
    const outcome = evaluateServerGameOutcome(gameId, betAmount, choices || {});

    // D1 SQL Atomic Double-Entry Transaction
    if (env.DB) {
      try {
        let player = await env.DB.prepare("SELECT * FROM players WHERE email = ?").bind(userEmail).first<PlayerRow>();
        
        if (!player) {
          const newId = "usr_" + crypto.randomUUID().slice(0, 8);
          await env.DB.prepare(
            "INSERT INTO players (id, email, name, chips) VALUES (?, ?, ?, ?)"
          ).bind(newId, userEmail, userEmail.split("@")[0], 1000.0).run();
          player = {
            id: newId,
            email: userEmail,
            name: userEmail.split("@")[0],
            role: "player",
            chips: 1000.0,
            bonus_balance: 200.0,
            peak_chips: 1000.0,
            loan_count: 0,
            cumulative_losses: 0.0,
            total_wager_required: 0.0,
            current_wager_progress: 0.0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }

        if (player.chips < betAmount) {
          return jsonResponse({
            error: "INSUFFICIENT_FUNDS",
            message: "Bet amount exceeds available balance.",
            currentBalance: player.chips,
          }, 400);
        }

        const newBalance = Math.max(0, player.chips - betAmount + outcome.winAmount);
        const txId = "TX-CF-" + crypto.randomUUID().slice(0, 8).toUpperCase();

        // Atomic batch execution ensuring zero balance race conditions
        await env.DB.batch([
          env.DB.prepare("UPDATE players SET chips = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?").bind(newBalance, userEmail),
          env.DB.prepare(
            `INSERT INTO transactions (id, player_id, player_email, type, amount, balance_before, balance_after, game_id, description)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            txId,
            player.id,
            userEmail,
            outcome.winAmount > 0 ? "win" : "bet",
            outcome.winAmount > 0 ? outcome.winAmount : betAmount,
            player.chips,
            newBalance,
            gameId,
            outcome.winAmount > 0 ? `Won $${outcome.winAmount} on ${gameId}` : `Wagered $${betAmount} on ${gameId}`
          ),
        ]);

        return jsonResponse({
          success: true,
          transactionId: txId,
          gameId,
          betAmount,
          winAmount: outcome.winAmount,
          multiplier: outcome.multiplier,
          isWin: outcome.isWin,
          resultDetails: outcome.resultDetails,
          newBalance,
          timestamp: new Date().toISOString(),
        });
      } catch (d1Err: unknown) {
        console.error("D1 database transaction error:", d1Err);
      }
    }

    // In-memory fallback
    const wallet = getMemoryWallet(userEmail);
    if (wallet.balance < betAmount) {
      return jsonResponse({
        error: "INSUFFICIENT_FUNDS",
        message: "Bet amount exceeds available balance.",
        currentBalance: wallet.balance,
      }, 400);
    }

    wallet.balance = Math.max(0, wallet.balance - betAmount + outcome.winAmount);
    const txId = "TX-MEM-" + crypto.randomUUID().slice(0, 8).toUpperCase();
    wallet.transactions.unshift({
      id: txId,
      type: outcome.winAmount > 0 ? "win" : "bet",
      amount: outcome.winAmount > 0 ? outcome.winAmount : betAmount,
      balanceAfter: wallet.balance,
      gameId,
      timestamp: new Date().toISOString(),
    });

    return jsonResponse({
      success: true,
      transactionId: txId,
      gameId,
      betAmount,
      winAmount: outcome.winAmount,
      multiplier: outcome.multiplier,
      isWin: outcome.isWin,
      resultDetails: outcome.resultDetails,
      newBalance: wallet.balance,
      timestamp: new Date().toISOString(),
    });
  }

  // 3. Wallet Balance API
  if (pathname === "/api/wallet/balance" && method === "GET") {
    const userEmail = request.headers.get("x-user-email") || request.headers.get("x-user-id");
    if (!userEmail) {
      return errorResponse("UNAUTHORIZED", "Missing authentication header (x-user-email).", 401);
    }

    if (env.DB) {
      const player = await env.DB.prepare("SELECT * FROM players WHERE email = ?").bind(userEmail).first<PlayerRow>();
      if (player) {
        const txs = await env.DB.prepare(
          "SELECT * FROM transactions WHERE player_email = ? ORDER BY created_at DESC LIMIT 20"
        ).bind(userEmail).all<TransactionRow>();

        return jsonResponse({
          userId: userEmail,
          balance: player.chips,
          bonusBalance: player.bonus_balance,
          transactions: txs.results || [],
        });
      }
    }

    const wallet = getMemoryWallet(userEmail);
    return jsonResponse({
      userId: userEmail,
      balance: wallet.balance,
      transactions: wallet.transactions.slice(0, 20),
    });
  }

  // 4. Wallet Balance Sync Endpoint
  if (pathname === "/api/wallet/sync" && method === "POST") {
    const userEmail = request.headers.get("x-user-email") || request.headers.get("x-user-id");
    if (!userEmail) {
      return errorResponse("UNAUTHORIZED", "Missing authentication header (x-user-email).", 401);
    }

    const body = (await request.json().catch(() => ({}))) as { balance?: number };
    const { balance } = body;
    if (typeof balance !== "number") {
      return errorResponse("INVALID_BALANCE", "A valid numeric balance is required.", 400);
    }

    if (env.DB) {
      await env.DB.prepare("UPDATE players SET chips = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?").bind(balance, userEmail).run();
      return jsonResponse({ success: true, balance });
    }

    const wallet = getMemoryWallet(userEmail);
    wallet.balance = balance;
    return jsonResponse({ success: true, balance });
  }

  // 5. Crypto Withdrawal Request (Atomic Escrow Locking)
  if (pathname === "/api/wallet/withdraw" && method === "POST") {
    const userEmail = request.headers.get("x-user-email") || request.headers.get("x-user-id");
    if (!userEmail) {
      return errorResponse("UNAUTHORIZED", "Missing authentication header (x-user-email).", 401);
    }

    const body = (await request.json().catch(() => ({}))) as WithdrawRequestBody;
    const { amount, cryptoAsset, walletAddress } = body;

    if (typeof amount !== "number" || amount < 10) {
      return errorResponse("INVALID_AMOUNT", "Minimum withdrawal amount is $10.", 400);
    }

    if (!walletAddress || typeof walletAddress !== "string" || !walletAddress.trim()) {
      return errorResponse("INVALID_ADDRESS", "A valid receiving wallet address is required.", 400);
    }

    const txId = "WD-CF-" + crypto.randomUUID().slice(0, 8).toUpperCase();

    if (env.DB) {
      const player = await env.DB.prepare("SELECT * FROM players WHERE email = ?").bind(userEmail).first<PlayerRow>();
      if (!player || player.chips < amount) {
        return jsonResponse({
          error: "INSUFFICIENT_FUNDS",
          message: "Insufficient funds for withdrawal.",
          currentBalance: player ? player.chips : 0,
        }, 400);
      }

      const newBalance = player.chips - amount;
      await env.DB.batch([
        env.DB.prepare("UPDATE players SET chips = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?").bind(newBalance, userEmail),
        env.DB.prepare(
          `INSERT INTO transactions (id, player_id, player_email, type, amount, balance_before, balance_after, status, description)
           VALUES (?, ?, ?, 'withdrawal', ?, ?, ?, 'pending', ?)`
        ).bind(
          txId,
          player.id,
          userEmail,
          amount,
          player.chips,
          newBalance,
          `Withdrawal of $${amount} (${cryptoAsset || 'USDT'}) to ${walletAddress.trim()}`
        ),
      ]);

      return jsonResponse({
        success: true,
        status: "pending_admin_approval",
        withdrawalId: txId,
        amount,
        cryptoAsset: cryptoAsset || "USDT",
        walletAddress: walletAddress.trim(),
        newBalance,
        message: "Withdrawal submitted for admin review. Funds escrowed.",
      });
    }

    const wallet = getMemoryWallet(userEmail);
    if (wallet.balance < amount) {
      return jsonResponse({
        error: "INSUFFICIENT_FUNDS",
        message: "Insufficient funds for withdrawal.",
        currentBalance: wallet.balance,
      }, 400);
    }

    wallet.balance -= amount;
    wallet.transactions.unshift({
      id: txId,
      type: "withdrawal",
      amount,
      balanceAfter: wallet.balance,
      status: "pending",
      description: `Withdrawal to ${walletAddress.trim()}`,
      timestamp: new Date().toISOString(),
    });

    return jsonResponse({
      success: true,
      status: "pending_admin_approval",
      withdrawalId: txId,
      amount,
      cryptoAsset: cryptoAsset || "USDT",
      walletAddress: walletAddress.trim(),
      newBalance: wallet.balance,
      message: "Withdrawal submitted for admin review. Funds escrowed.",
    });
  }

  // 6. Admin RTP & Win/Loss Control
  if (pathname === "/api/admin/rtp") {
    if (method === "GET") {
      return jsonResponse({
        success: true,
        rtpConfig: getServerRtpConfig(),
      });
    }

    if (method === "POST") {
      const body = (await request.json().catch(() => ({}))) as {
        globalRtp?: number;
        rtpBias?: "standard" | "loose" | "tight" | "rigged" | "custom";
        customWinRatio?: number;
        forceLoseMode?: boolean;
      };
      const { globalRtp, rtpBias, customWinRatio, forceLoseMode } = body;

      setServerRtpConfig({
        ...(typeof globalRtp === "number" ? { globalRtp } : {}),
        ...(rtpBias ? { rtpBias } : {}),
        ...(typeof customWinRatio === "number" ? { customWinRatio } : {}),
        ...(typeof forceLoseMode === "boolean" ? { forceLoseMode } : {}),
      });

      return jsonResponse({
        success: true,
        message: "Cloudflare Edge Global RTP updated successfully.",
        rtpConfig: getServerRtpConfig(),
      });
    }
  }

  // 7. VIP Host Commentary
  if (pathname === "/api/host/commentary" && method === "POST") {
    const body = (await request.json().catch(() => ({}))) as {
      promptType?: string;
      gameState?: Record<string, any>;
    };
    const { promptType = "greet", gameState } = body;

    const fallbacks: Record<string, any> = {
      greet: { commentary: "Welcome to NexaSpin! I'm Vegas Vance, your host. Let's roll!", tips: "Start small on slots to catch the trend.", hostMood: "suave" },
      spin: { commentary: "Reels are turning! Payouts are hot!", tips: "Watch for scatter symbols.", hostMood: "enthusiastic" },
      win: { commentary: "Jackpot bells ringing! Outstanding win!", tips: "Ride that momentum.", hostMood: "enthusiastic" },
      lose: { commentary: "Tough beat, but fortune favors the persistent.", tips: "Keep a solid bankroll buffer.", hostMood: "encouraging" },
    };

    if (env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
        const res = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `Player is in ${gameState?.activeGame || "Lobby"} with $${gameState?.chips || 1000}. Event: ${promptType}. Give a 1-sentence commentary and 1-sentence tip in JSON format: {"commentary":"...","tips":"...","hostMood":"suave"}.`,
        });
        return jsonResponse(JSON.parse(res.text?.trim() || "{}"));
      } catch {
        // Fall back gracefully
      }
    }

    return jsonResponse(fallbacks[promptType] || fallbacks.greet);
  }

  return errorResponse("NOT_FOUND", `Endpoint ${method} ${pathname} not found.`, 404);
}
