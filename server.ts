import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { createRateLimiter } from "./server/rateLimiter";
import { 
  validateRowLevelSecurity, 
  executeAtomicGameTransaction, 
  executeAtomicWithdrawal, 
  getOrCreateWallet, 
  refundRejectedWithdrawal,
  syncWalletBalance
} from "./server/walletManager";
import { evaluateServerGameOutcome, setServerRtpConfig, getServerRtpConfig } from "./server/gameEngine";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Health Check API endpoint for hosting platforms
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    databaseEngine: "Atomic Persistent Storage Engine",
    securityRules: "Row Level Security & Atomic Wallet Locks Active"
  });
});

// -------------------------------------------------------------
// 1. SERVER-AUTHORITATIVE GAME PLAY ENDPOINT (Rate-Limited + Atomic Lock)
// -------------------------------------------------------------
app.post(
  "/api/game/play",
  createRateLimiter(3000, 10), // Max 10 plays per 3 seconds
  validateRowLevelSecurity,
  async (req, res) => {
    try {
      const { gameId, betAmount, choices } = req.body;
      const authUser = (req as any).authenticatedUser;

      if (!gameId || typeof betAmount !== "number" || betAmount <= 0) {
        return res.status(400).json({
          error: "INVALID_PARAMETERS",
          message: "gameId and positive numeric betAmount are required.",
        });
      }

      // Evaluate outcome strictly on server
      const outcome = evaluateServerGameOutcome(gameId, betAmount, choices || {});

      // Atomic Wallet Debit/Credit with Non-negative Lock
      const txResult = await executeAtomicGameTransaction(
        authUser,
        authUser,
        betAmount,
        outcome.winAmount,
        gameId
      );

      if (!txResult.success) {
        return res.status(400).json({
          error: "TRANSACTION_FAILED",
          message: txResult.error || "Transaction could not be completed.",
          currentBalance: txResult.newBalance,
        });
      }

      return res.json({
        success: true,
        transactionId: txResult.transactionId,
        gameId,
        betAmount,
        winAmount: outcome.winAmount,
        multiplier: outcome.multiplier,
        isWin: outcome.isWin,
        resultDetails: outcome.resultDetails,
        newBalance: txResult.newBalance,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("Error in /api/game/play:", err);
      return res.status(500).json({
        error: "INTERNAL_SERVER_ERROR",
        message: err.message || "An unexpected error occurred processing game turn.",
      });
    }
  }
);

// -------------------------------------------------------------
// 2. RLS WALLET BALANCE & TRANSACTIONS API
// -------------------------------------------------------------
app.get("/api/wallet/balance", validateRowLevelSecurity, (req, res) => {
  const authUser = (req as any).authenticatedUser;
  const wallet = getOrCreateWallet(authUser, authUser);

  res.json({
    userId: wallet.userId,
    balance: wallet.balance,
    transactions: wallet.transactions.slice(0, 20),
  });
});

// Sync client-side balance if logged in via legacy local state
app.post("/api/wallet/sync", validateRowLevelSecurity, async (req, res) => {
  const authUser = (req as any).authenticatedUser;
  const { balance } = req.body;
  if (typeof balance === "number") {
    const updated = await syncWalletBalance(authUser, authUser, balance);
    return res.json({ success: true, balance: updated });
  }
  return res.status(400).json({ error: "INVALID_BALANCE" });
});

// -------------------------------------------------------------
// 3. WITHDRAWAL ENDPOINT (Rate-Limited, Atomic Escrow Deduction)
// -------------------------------------------------------------
app.post(
  "/api/wallet/withdraw",
  createRateLimiter(5000, 3), // Max 3 withdrawal requests per 5s
  validateRowLevelSecurity,
  async (req, res) => {
    try {
      const { amount, cryptoAsset, walletAddress } = req.body;
      const authUser = (req as any).authenticatedUser;

      if (typeof amount !== "number" || amount < 10) {
        return res.status(400).json({
          error: "INVALID_AMOUNT",
          message: "Minimum withdrawal amount is $10.",
        });
      }

      if (!walletAddress || typeof walletAddress !== "string" || !walletAddress.trim()) {
        return res.status(400).json({
          error: "INVALID_ADDRESS",
          message: "A valid receiving wallet address is required.",
        });
      }

      const result = await executeAtomicWithdrawal(
        authUser,
        authUser,
        amount,
        cryptoAsset || "USDT",
        walletAddress.trim()
      );

      if (!result.success) {
        return res.status(400).json({
          error: "WITHDRAWAL_FAILED",
          message: result.error || "Unable to process withdrawal.",
          currentBalance: result.newBalance,
        });
      }

      return res.json({
        success: true,
        status: "pending_admin_approval",
        withdrawalId: result.withdrawalId,
        amount,
        cryptoAsset: cryptoAsset || "USDT",
        walletAddress: walletAddress.trim(),
        newBalance: result.newBalance,
        message: "Withdrawal submitted for admin review. Funds escrowed.",
      });
    } catch (err: any) {
      console.error("Error in /api/wallet/withdraw:", err);
      return res.status(500).json({
        error: "INTERNAL_SERVER_ERROR",
        message: err.message || "Failed to submit withdrawal request.",
      });
    }
  }
);

// -------------------------------------------------------------
// 5. GLOBAL ADMIN RTP & WIN/LOSE RATIO CONTROL ENDPOINTS
// -------------------------------------------------------------
app.get("/api/admin/rtp", (req, res) => {
  res.json({
    success: true,
    rtpConfig: getServerRtpConfig(),
  });
});

app.post("/api/admin/rtp", (req, res) => {
  try {
    const { globalRtp, rtpBias, customWinRatio, forceLoseMode } = req.body;
    
    setServerRtpConfig({
      ...(typeof globalRtp === "number" ? { globalRtp } : {}),
      ...(rtpBias ? { rtpBias } : {}),
      ...(typeof customWinRatio === "number" ? { customWinRatio } : {}),
      ...(typeof forceLoseMode === "boolean" ? { forceLoseMode } : {}),
    });

    const updatedConfig = getServerRtpConfig();
    return res.json({
      success: true,
      message: "Server Global RTP & Win/Lose configuration updated successfully.",
      rtpConfig: updatedConfig,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Initialize Gemini client lazily to avoid crashing on startup if the key is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Casino VIP Host API Endpoint
app.post("/api/host/commentary", async (req, res) => {
  const { gameState, promptType } = req.body;

  const currentChips = gameState?.chips ?? 1000;
  const recentHistory = gameState?.history ?? [];
  const activeGame = gameState?.activeGame ?? "Lobby";
  const consecutiveLosses = gameState?.consecutiveLosses ?? 0;
  const totalWon = gameState?.totalWon ?? 0;
  const loanCount = gameState?.loanCount ?? 0;

  const contextPrompt = `
The player is currently in the ${activeGame} section of the Royal Neon Casino.
- Current chip balance: $${currentChips}
- Active game: ${activeGame}
- Consecutive losses: ${consecutiveLosses}
- Total chips won in this session: $${totalWon}
- Number of loans taken: ${loanCount}
- Recent event log: ${JSON.stringify(recentHistory.slice(-5))}

The event triggering this request is: "${promptType}".
Deliver a response tailored to this action.
`;

  // Graceful offline fallback when API key is missing or calls fail
  const fallbacks: Record<string, any> = {
    greet: {
      commentary: "Welcome to the Royal Neon Casino floor! I'm Vegas Vance, your host. Grab your chips, pick your game, and let's see if Lady Luck is on your side tonight!",
      tips: "Always start small to warm up the slots, then double down when the reels start feeling hot!",
      hostMood: "suave"
    },
    spin: {
      commentary: "Spinning those wheels, I see! The neon lights are sparkling, and I can smell a massive payout in the air!",
      tips: "In Slots, luck favors the bold—but matching paylines is where the true glory lies.",
      hostMood: "enthusiastic"
    },
    win: {
      commentary: "Ding ding ding! We have a winner on the floor! Absolute masterclass in betting there—keep that fire burning!",
      tips: "A true high roller knows when to press their advantage. Let it ride!",
      hostMood: "enthusiastic"
    },
    lose: {
      commentary: "Ah, the cards can be cruel, but remember: the next deal is always a fresh start. Dust yourself off, friend.",
      tips: "Blackjack is all about playing the percentages. Never stand on a soft 12 if the dealer is showing an Ace!",
      hostMood: "encouraging"
    },
    loan: {
      commentary: "Vance's credit line is always open for our premium VIPs. Here's a fresh stack of $500 chips. Make them count!",
      tips: "Use this fresh capital wisely. Focus on high-value bets on the Roulette table to bounce back quick!",
      hostMood: "playful"
    },
    bankrupt: {
      commentary: "Cleaned out? Don't sweat it, pal. Every legend has a comeback story. Request a Vance Loan or hit the Daily Spin to get back in the action!",
      tips: "The Daily Reward Wheel spins completely free of charge. Give it a whirl!",
      hostMood: "dramatic"
    },
    strategy: {
      commentary: "Sizing up the board, are we? Smart players analyze the field. Whether it's the roulette layout or the dealer's card, knowledge is power.",
      tips: "Roulette splits and corners offer better coverage while still keeping the multiplier high!",
      hostMood: "suave"
    }
  };

  try {
    const ai = getGeminiClient();
    if (!ai) {
      const type = fallbacks[promptType] ? promptType : "greet";
      return res.json(fallbacks[type]);
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contextPrompt,
      config: {
        systemInstruction: `You are "Vegas Vance", the legendary, smooth-talking, exceptionally charismatic VIP Host of the Royal Neon Casino. 
Your tone is suave, encouraging, theatrical, and full of casino flavor (using terms like "double down", "dealer's choice", "high roller", "lady luck", "jackpot").
You love big risk and high-stakes plays. If the player is winning, celebrate lavishly and hype them up. 
If the player is on a losing streak or bankrupt, offer smooth encouragement, maybe tease them playfully, and invite them to take a loan, try the Daily Spin, or change their strategy.
Always keep it lighthearted, entertaining, and highly engaging. Never lecture them about gambling risks; treat this as an immersive, fun, virtual arcade/casino simulation.

Return a JSON object containing:
1. "commentary": Vance's dynamic comment, spoken directly to the player (1-2 sentences).
2. "tips": A short, clever betting tip or casino joke based on their situation (1 sentence).
3. "hostMood": One of "enthusiastic", "suave", "encouraging", "dramatic", "playful".`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            commentary: {
              type: Type.STRING,
              description: "The VIP host's direct remarks to the player.",
            },
            tips: {
              type: Type.STRING,
              description: "A clever game tip, fortune-teller slot advice, or tactical Blackjack/Roulette advice.",
            },
            hostMood: {
              type: Type.STRING,
              description: "The host's dynamic mood (e.g., 'enthusiastic', 'suave', 'encouraging', 'dramatic', 'playful').",
            },
          },
          required: ["commentary", "tips", "hostMood"],
        },
      },
    });

    const resultText = response.text?.trim() || "";
    const parsedData = JSON.parse(resultText);
    res.json(parsedData);
  } catch (error: any) {
    console.log("VIP Host dynamic mode encountered an issue, serving fallback:", error.message || error);
    const type = fallbacks[promptType] ? promptType : "greet";
    res.json(fallbacks[type]);
  }
});

// Configure Vite middleware or serve static assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    
    // Handle SPA routing correctly
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
