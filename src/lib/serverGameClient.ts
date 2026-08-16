export interface ServerPlayResponse {
  success: boolean;
  transactionId?: string;
  gameId?: string;
  betAmount?: number;
  winAmount?: number;
  multiplier?: number;
  isWin?: boolean;
  resultDetails?: Record<string, any>;
  newBalance?: number;
  error?: string;
  message?: string;
}

/**
 * Sends a server-authoritative game turn request.
 * The client only sends `{ gameId, betAmount, choices }`.
 * Outcome evaluation, RTP, payouts, and wallet balances are computed strictly on the server.
 */
export async function playServerAuthoritativeGame(
  gameId: string,
  betAmount: number,
  choices: Record<string, any> = {},
  userEmail: string = "player@nexaspin.com"
): Promise<ServerPlayResponse> {
  try {
    const response = await fetch("/api/game/play", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-email": userEmail,
      },
      body: JSON.stringify({
        gameId,
        betAmount,
        choices,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || "SERVER_ERROR",
        message: data.message || "Failed to process turn on server.",
        newBalance: data.currentBalance,
      };
    }

    return data;
  } catch (err: any) {
    console.error("Server-authoritative game request failed:", err);
    return {
      success: false,
      error: "NETWORK_ERROR",
      message: "Network error connecting to game server.",
    };
  }
}

/**
 * Submits an atomic withdrawal request to the server.
 */
export async function submitServerWithdrawal(
  amount: number,
  cryptoAsset: string,
  walletAddress: string,
  userEmail: string = "player@nexaspin.com"
): Promise<{
  success: boolean;
  withdrawalId?: string;
  newBalance?: number;
  error?: string;
  message?: string;
}> {
  try {
    const response = await fetch("/api/wallet/withdraw", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-email": userEmail,
      },
      body: JSON.stringify({
        amount,
        cryptoAsset,
        walletAddress,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || "WITHDRAWAL_FAILED",
        message: data.message || "Withdrawal request failed.",
      };
    }

    return data;
  } catch (err: any) {
    console.error("Withdrawal request error:", err);
    return {
      success: false,
      error: "NETWORK_ERROR",
      message: "Network error submitting withdrawal.",
    };
  }
}

/**
 * Updates Global Server RTP, RTP bias, and custom win ratios in real-time.
 */
export async function updateServerRtpConfig(config: {
  globalRtp?: number;
  rtpBias?: "standard" | "loose" | "tight" | "rigged" | "custom";
  customWinRatio?: number;
  forceLoseMode?: boolean;
}): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetch("/api/admin/rtp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(config),
    });

    const data = await response.json();
    return data;
  } catch (err: any) {
    console.error("Failed to update server RTP config:", err);
    return { success: false, message: err.message };
  }
}
