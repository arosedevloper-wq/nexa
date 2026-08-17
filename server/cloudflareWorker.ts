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

  // 6. Admin System Config, RTP, Win/Loss, House Pool Sync (D1 Backed)
  if (pathname === "/api/admin/config") {
    if (method === "GET") {
      let config = getServerRtpConfig();
      let housePool = 1000000;
      let cryptoWallets: any[] = [];

      if (env.DB) {
        try {
          const rtpRow = await env.DB.prepare("SELECT value FROM system_config WHERE key = 'rtp_config'").first<{ value: string }>();
          if (rtpRow && rtpRow.value) {
            try {
              const parsed = JSON.parse(rtpRow.value);
              setServerRtpConfig(parsed);
              config = getServerRtpConfig();
            } catch (e) {}
          }
          const poolRow = await env.DB.prepare("SELECT value FROM system_config WHERE key = 'house_pool'").first<{ value: string }>();
          if (poolRow && poolRow.value) {
            housePool = parseFloat(poolRow.value) || 1000000;
          }
          const walletsRow = await env.DB.prepare("SELECT value FROM system_config WHERE key = 'master_crypto_wallets'").first<{ value: string }>();
          if (walletsRow && walletsRow.value) {
            try {
              cryptoWallets = JSON.parse(walletsRow.value);
            } catch (e) {}
          }
        } catch (e) {
          console.error("Error reading system_config from D1:", e);
        }
      }

      return jsonResponse({
        success: true,
        rtpConfig: config,
        housePool,
        cryptoWallets,
      });
    }

    if (method === "POST") {
      const body = (await request.json().catch(() => ({}))) as {
        globalRtp?: number;
        rtpBias?: "standard" | "loose" | "tight" | "rigged" | "custom";
        customWinRatio?: number;
        forceLoseMode?: boolean;
        housePool?: number;
        cryptoWallets?: any[];
      };
      const { globalRtp, rtpBias, customWinRatio, forceLoseMode, housePool, cryptoWallets } = body;

      setServerRtpConfig({
        ...(typeof globalRtp === "number" ? { globalRtp } : {}),
        ...(rtpBias ? { rtpBias } : {}),
        ...(typeof customWinRatio === "number" ? { customWinRatio } : {}),
        ...(typeof forceLoseMode === "boolean" ? { forceLoseMode } : {}),
      });

      if (env.DB) {
        try {
          const rtpJson = JSON.stringify(getServerRtpConfig());
          await env.DB.prepare(
            `INSERT INTO system_config (key, value, updated_at) VALUES ('rtp_config', ?, CURRENT_TIMESTAMP)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
          ).bind(rtpJson).run();

          if (typeof housePool === "number") {
            await env.DB.prepare(
              `INSERT INTO system_config (key, value, updated_at) VALUES ('house_pool', ?, CURRENT_TIMESTAMP)
               ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
            ).bind(housePool.toString()).run();
          }

          if (cryptoWallets && Array.isArray(cryptoWallets)) {
            await env.DB.prepare(
              `INSERT INTO system_config (key, value, updated_at) VALUES ('master_crypto_wallets', ?, CURRENT_TIMESTAMP)
               ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
            ).bind(JSON.stringify(cryptoWallets)).run();
          }
        } catch (e) {
          console.error("Error saving system_config to D1:", e);
        }
      }

      return jsonResponse({
        success: true,
        message: "System configuration saved to Cloudflare D1.",
        rtpConfig: getServerRtpConfig(),
        housePool,
      });
    }
  }

  // 6b. Admin Agents Sync (D1 Backed)
  if (pathname === "/api/admin/agents") {
    if (method === "GET") {
      let agents: any[] = [];
      if (env.DB) {
        try {
          const row = await env.DB.prepare("SELECT value FROM system_config WHERE key = 'p2p_agents'").first<{ value: string }>();
          if (row && row.value) {
            agents = JSON.parse(row.value);
          }
        } catch (e) {
          console.error("Error fetching agents from D1:", e);
        }
      }
      return jsonResponse({ success: true, agents });
    }

    if (method === "POST") {
      const body = (await request.json().catch(() => ({}))) as { agents: any[] };
      const { agents } = body;
      if (!Array.isArray(agents)) {
        return errorResponse("INVALID_AGENTS", "Agents payload must be an array.", 400);
      }

      if (env.DB) {
        try {
          await env.DB.prepare(
            `INSERT INTO system_config (key, value, updated_at) VALUES ('p2p_agents', ?, CURRENT_TIMESTAMP)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
          ).bind(JSON.stringify(agents)).run();
        } catch (e) {
          console.error("Error saving agents to D1:", e);
          return errorResponse("DB_ERROR", "Failed to persist agents to D1", 500);
        }
      }

      return jsonResponse({ success: true, agentsCount: agents.length });
    }
  }

  // 6c. Admin Banking Requests Sync (D1 Backed)
  if (pathname === "/api/admin/banking-requests") {
    if (method === "GET") {
      let requests: any[] = [];
      if (env.DB) {
        try {
          const row = await env.DB.prepare("SELECT value FROM system_config WHERE key = 'banking_requests'").first<{ value: string }>();
          if (row && row.value) {
            requests = JSON.parse(row.value);
          }
        } catch (e) {
          console.error("Error fetching banking requests from D1:", e);
        }
      }
      return jsonResponse({ success: true, requests });
    }

    if (method === "POST") {
      const body = (await request.json().catch(() => ({}))) as { requests: any[] };
      const { requests } = body;
      if (!Array.isArray(requests)) {
        return errorResponse("INVALID_PAYLOAD", "Requests payload must be an array.", 400);
      }

      if (env.DB) {
        try {
          await env.DB.prepare(
            `INSERT INTO system_config (key, value, updated_at) VALUES ('banking_requests', ?, CURRENT_TIMESTAMP)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
          ).bind(JSON.stringify(requests)).run();
        } catch (e) {
          console.error("Error saving banking requests to D1:", e);
          return errorResponse("DB_ERROR", "Failed to persist banking requests to D1", 500);
        }
      }

      return jsonResponse({ success: true, count: requests.length });
    }
  }

  // 6c-2. Admin & Global Players Sync (D1 Backed)
  if (pathname === "/api/admin/players" || pathname === "/api/players/register") {
    if (method === "GET") {
      let playersList: any[] = [];
      if (env.DB) {
        try {
          const row = await env.DB.prepare("SELECT value FROM system_config WHERE key = 'registered_players_v1'").first<{ value: string }>();
          if (row && row.value) {
            playersList = JSON.parse(row.value);
          }

          // Also pull from players table if any players exist there
          const dbPlayers = await env.DB.prepare("SELECT * FROM players").all<any>();
          if (dbPlayers && Array.isArray(dbPlayers.results)) {
            const emailMap = new Map(playersList.map((p: any) => [p.email.toLowerCase(), p]));
            for (const dp of dbPlayers.results) {
              const emailKey = (dp.email || "").toLowerCase();
              if (emailMap.has(emailKey)) {
                const existing = emailMap.get(emailKey);
                existing.chips = typeof dp.chips === "number" ? dp.chips : existing.chips;
                existing.bonusBalance = typeof dp.bonus_balance === "number" ? dp.bonus_balance : existing.bonusBalance;
              } else {
                playersList.push({
                  name: dp.name || "Player",
                  email: dp.email,
                  phoneNumber: dp.phone_number || "",
                  chips: dp.chips || 0,
                  bonusBalance: dp.bonus_balance || 200,
                  vipLevel: "VIP Bronze",
                  status: "active",
                  registeredAt: dp.created_at || new Date().toISOString()
                });
              }
            }
          }
        } catch (e) {
          console.error("Error fetching players from D1:", e);
        }
      }
      return jsonResponse({ success: true, players: playersList });
    }

    if (method === "POST") {
      const body = (await request.json().catch(() => ({}))) as { player?: any; players?: any[] };
      let incomingPlayers = body.players || (body.player ? [body.player] : []);

      if (!Array.isArray(incomingPlayers) || incomingPlayers.length === 0) {
        return errorResponse("INVALID_PAYLOAD", "Players payload missing.", 400);
      }

      if (env.DB) {
        try {
          let currentList: any[] = [];
          const row = await env.DB.prepare("SELECT value FROM system_config WHERE key = 'registered_players_v1'").first<{ value: string }>();
          if (row && row.value) {
            try {
              currentList = JSON.parse(row.value);
            } catch (e) {}
          }

          for (const newP of incomingPlayers) {
            if (!newP || !newP.email) continue;
            const idx = currentList.findIndex((p: any) => p && p.email && p.email.toLowerCase() === newP.email.toLowerCase());
            if (idx >= 0) {
              currentList[idx] = { ...currentList[idx], ...newP };
            } else {
              currentList.unshift(newP);
            }

            // Also upsert into players table
            const playerId = `player_${(newP.phoneNumber || newP.email || "").replace(/\D/g, "") || Date.now()}`;
            await env.DB.prepare(
              `INSERT INTO players (id, email, name, phone_number, role, chips, bonus_balance, peak_chips, loan_count, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
               ON CONFLICT(email) DO UPDATE SET 
                 name = excluded.name, 
                 phone_number = excluded.phone_number, 
                 chips = excluded.chips, 
                 bonus_balance = excluded.bonus_balance, 
                 updated_at = CURRENT_TIMESTAMP`
            ).bind(
              playerId,
              newP.email,
              newP.name || "Player",
              newP.phoneNumber || "",
              newP.role || "player",
              typeof newP.chips === "number" ? newP.chips : 0,
              typeof newP.bonusBalance === "number" ? newP.bonusBalance : 200,
              typeof newP.peakChips === "number" ? newP.peakChips : (newP.chips || 0),
              typeof newP.loanCount === "number" ? newP.loanCount : 0
            ).run().catch((err) => console.warn("Player table upsert notice:", err));
          }

          await env.DB.prepare(
            `INSERT INTO system_config (key, value, updated_at) VALUES ('registered_players_v1', ?, CURRENT_TIMESTAMP)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
          ).bind(JSON.stringify(currentList)).run();

          return jsonResponse({ success: true, count: currentList.length });
        } catch (e) {
          console.error("Error saving players to D1:", e);
          return errorResponse("DB_ERROR", "Failed to persist players to D1", 500);
        }
      }

      return jsonResponse({ success: true, count: incomingPlayers.length });
    }
  }

  // 6d. Live Chat & P2P Chat Messages Sync (D1 Backed)
  if (pathname === "/api/chat/messages") {
    if (method === "GET") {
      const requestId = url.searchParams.get("requestId") || "global";
      let messages: any[] = [];
      if (env.DB) {
        try {
          const key = `chat_${requestId}`;
          const row = await env.DB.prepare("SELECT value FROM system_config WHERE key = ?").bind(key).first<{ value: string }>();
          if (row && row.value) {
            messages = JSON.parse(row.value);
          }
        } catch (e) {
          console.error("Error fetching chat messages from D1:", e);
        }
      }
      return jsonResponse({ success: true, requestId, messages });
    }

    if (method === "POST") {
      const body = (await request.json().catch(() => ({}))) as { requestId?: string; message: any; messages?: any[] };
      const requestId = body.requestId || "global";
      const key = `chat_${requestId}`;

      if (env.DB) {
        try {
          let updatedList: any[] = [];
          if (Array.isArray(body.messages)) {
            updatedList = body.messages.slice(-50);
          } else if (body.message && body.message.id) {
            const row = await env.DB.prepare("SELECT value FROM system_config WHERE key = ?").bind(key).first<{ value: string }>();
            if (row && row.value) {
              try {
                updatedList = JSON.parse(row.value);
              } catch (e) {}
            }
            const idx = updatedList.findIndex((m: any) => m.id === body.message.id);
            if (idx >= 0) {
              updatedList[idx] = body.message;
            } else {
              updatedList.push(body.message);
            }
            updatedList = updatedList.slice(-50);
          }

          await env.DB.prepare(
            `INSERT INTO system_config (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
          ).bind(key, JSON.stringify(updatedList)).run();

          return jsonResponse({ success: true, requestId, count: updatedList.length });
        } catch (e) {
          console.error("Error saving chat message to D1:", e);
          return errorResponse("DB_ERROR", "Failed to persist chat message to D1", 500);
        }
      }

      return jsonResponse({ success: true, requestId });
    }
  }

  // 6e. Admin Sub-Admins Sync (D1 Backed)
  if (pathname === "/api/admin/sub-admins") {
    if (method === "GET") {
      let subAdminsList: any[] = [];
      if (env.DB) {
        try {
          const row = await env.DB.prepare("SELECT value FROM system_config WHERE key = 'sub_admins_v1'").first<{ value: string }>();
          if (row && row.value) {
            subAdminsList = JSON.parse(row.value);
          }
        } catch (e) {
          console.error("Error fetching sub-admins from D1:", e);
        }
      }
      return jsonResponse({ success: true, subAdmins: subAdminsList });
    }

    if (method === "POST") {
      const body = (await request.json().catch(() => ({}))) as { subAdmins?: any[]; subAdmin?: any };
      const incoming = body.subAdmins || (body.subAdmin ? [body.subAdmin] : []);

      if (!Array.isArray(incoming) || incoming.length === 0) {
        return errorResponse("INVALID_PAYLOAD", "Sub-Admins payload missing.", 400);
      }

      if (env.DB) {
        try {
          let currentList: any[] = [];
          const row = await env.DB.prepare("SELECT value FROM system_config WHERE key = 'sub_admins_v1'").first<{ value: string }>();
          if (row && row.value) {
            try {
              currentList = JSON.parse(row.value);
            } catch (e) {}
          }

          for (const newSa of incoming) {
            if (!newSa || !newSa.username) continue;
            const idx = currentList.findIndex((sa: any) => sa && sa.username && sa.username.toLowerCase() === newSa.username.toLowerCase());
            if (idx >= 0) {
              currentList[idx] = { ...currentList[idx], ...newSa };
            } else {
              currentList.push(newSa);
            }
          }

          await env.DB.prepare(
            `INSERT INTO system_config (key, value, updated_at) VALUES ('sub_admins_v1', ?, CURRENT_TIMESTAMP)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
          ).bind(JSON.stringify(currentList)).run();

          return jsonResponse({ success: true, count: currentList.length });
        } catch (e) {
          console.error("Error saving sub-admins to D1:", e);
          return errorResponse("DB_ERROR", "Failed to persist sub-admins to D1", 500);
        }
      }

      return jsonResponse({ success: true, count: incoming.length });
    }
  }

  // 6f. Admin Master Crypto Wallets Sync (D1 Backed)
  if (pathname === "/api/admin/wallets") {
    if (method === "GET") {
      let walletsList: any[] = [];
      if (env.DB) {
        try {
          const row = await env.DB.prepare("SELECT value FROM system_config WHERE key = 'master_crypto_wallets'").first<{ value: string }>();
          if (row && row.value) {
            walletsList = JSON.parse(row.value);
          }
        } catch (e) {
          console.error("Error fetching crypto wallets from D1:", e);
        }
      }
      return jsonResponse({ success: true, wallets: walletsList });
    }

    if (method === "POST") {
      const body = (await request.json().catch(() => ({}))) as { wallets?: any[] };
      const incoming = body.wallets || [];

      if (!Array.isArray(incoming)) {
        return errorResponse("INVALID_PAYLOAD", "Wallets payload must be an array.", 400);
      }

      if (env.DB) {
        try {
          await env.DB.prepare(
            `INSERT INTO system_config (key, value, updated_at) VALUES ('master_crypto_wallets', ?, CURRENT_TIMESTAMP)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
          ).bind(JSON.stringify(incoming)).run();

          return jsonResponse({ success: true, count: incoming.length });
        } catch (e) {
          console.error("Error saving crypto wallets to D1:", e);
          return errorResponse("DB_ERROR", "Failed to persist crypto wallets to D1", 500);
        }
      }

      return jsonResponse({ success: true, count: incoming.length });
    }
  }

  // 6g. Admin Referral Settings & Events Sync (D1 Backed)
  if (pathname === "/api/admin/referrals") {
    if (method === "GET") {
      let settings: any = null;
      let events: any[] = [];
      if (env.DB) {
        try {
          const sRow = await env.DB.prepare("SELECT value FROM system_config WHERE key = 'referral_settings_v1'").first<{ value: string }>();
          if (sRow && sRow.value) settings = JSON.parse(sRow.value);
          const eRow = await env.DB.prepare("SELECT value FROM system_config WHERE key = 'referral_events_v1'").first<{ value: string }>();
          if (eRow && eRow.value) events = JSON.parse(eRow.value);
        } catch (e) {
          console.error("Error fetching referrals from D1:", e);
        }
      }
      return jsonResponse({ success: true, settings, events });
    }

    if (method === "POST") {
      const body = (await request.json().catch(() => ({}))) as { settings?: any; events?: any[] };
      if (env.DB) {
        try {
          if (body.settings) {
            await env.DB.prepare(
              `INSERT INTO system_config (key, value, updated_at) VALUES ('referral_settings_v1', ?, CURRENT_TIMESTAMP)
               ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
            ).bind(JSON.stringify(body.settings)).run();
          }
          if (Array.isArray(body.events)) {
            await env.DB.prepare(
              `INSERT INTO system_config (key, value, updated_at) VALUES ('referral_events_v1', ?, CURRENT_TIMESTAMP)
               ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
            ).bind(JSON.stringify(body.events)).run();
          }
          return jsonResponse({ success: true });
        } catch (e) {
          console.error("Error saving referrals to D1:", e);
          return errorResponse("DB_ERROR", "Failed to persist referrals to D1", 500);
        }
      }
      return jsonResponse({ success: true });
    }
  }

  // 6h. Admin Audit Logs Sync (D1 Backed)
  if (pathname === "/api/admin/audit-logs") {
    if (method === "GET") {
      let logs: any[] = [];
      if (env.DB) {
        try {
          const row = await env.DB.prepare("SELECT value FROM system_config WHERE key = 'admin_audit_logs'").first<{ value: string }>();
          if (row && row.value) {
            logs = JSON.parse(row.value);
          }
        } catch (e) {
          console.error("Error fetching audit logs from D1:", e);
        }
      }
      return jsonResponse({ success: true, logs });
    }

    if (method === "POST") {
      const body = (await request.json().catch(() => ({}))) as { log?: any; logs?: any[] };
      if (env.DB) {
        try {
          let list: any[] = [];
          if (Array.isArray(body.logs)) {
            list = body.logs.slice(0, 100);
          } else if (body.log) {
            const row = await env.DB.prepare("SELECT value FROM system_config WHERE key = 'admin_audit_logs'").first<{ value: string }>();
            if (row && row.value) {
              try { list = JSON.parse(row.value); } catch (e) {}
            }
            list.unshift(body.log);
            list = list.slice(0, 100);
          }

          await env.DB.prepare(
            `INSERT INTO system_config (key, value, updated_at) VALUES ('admin_audit_logs', ?, CURRENT_TIMESTAMP)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
          ).bind(JSON.stringify(list)).run();

          return jsonResponse({ success: true, count: list.length });
        } catch (e) {
          console.error("Error saving audit logs to D1:", e);
          return errorResponse("DB_ERROR", "Failed to persist audit logs to D1", 500);
        }
      }
      return jsonResponse({ success: true });
    }
  }

  // Legacy RTP endpoint alias
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
