/**
 * GLOBAL LIVE GAME CONFIGURATION & RTP ENGINE
 * 
 * Enforces global RTP, customizable win ratios, RTP bias modes, anti-streak protection, and Force Lose.
 */

export interface LiveGameConfig {
  houseEdge: number;      // 0.95 (95% House Edge)
  userWinRatio: number;   // 0.05 (5% User Winning Ratio)
  rtpPercentage: number;  // 5.0% Return To Player
  isEnforced: boolean;
  lastUpdated: string;
}

export const GLOBAL_LIVE_GAME_CONFIG: LiveGameConfig = {
  houseEdge: 0.95,
  userWinRatio: 0.05,
  rtpPercentage: 5.0,
  isEnforced: true,
  lastUpdated: new Date().toISOString(),
};

/**
 * Checks if Force Lose Mode is triggered.
 * Triggers if Force Lose Mode is active (default ON) or player session net wins >= 500 USDT.
 */
export function shouldForceLose(): boolean {
  if (typeof window === "undefined") return false;
  const forceLoseVal = localStorage.getItem("casino_force_lose_mode");
  const isForceLoseEnabled = forceLoseVal !== "false"; // Default true unless explicitly "false"

  if (isForceLoseEnabled) return true;

  const sessionNetWins = Number(localStorage.getItem("casino_session_net_wins") || 0);
  if (sessionNetWins >= 500) {
    return true;
  }
  return false;
}

/**
 * Checks and updates consecutive player win counter to prevent excessive winning streaks.
 * Limits consecutive wins to max 1-2 before enforcing house win.
 */
export function checkWinStreakLimit(): boolean {
  if (typeof window === "undefined") return false;
  const streak = Number(sessionStorage.getItem("casino_consecutive_wins") || 0);
  return streak >= 2; // Disallow 3+ consecutive wins
}

export function recordRoundOutcome(isWin: boolean): void {
  if (typeof window === "undefined") return;
  if (isWin) {
    const current = Number(sessionStorage.getItem("casino_consecutive_wins") || 0);
    sessionStorage.setItem("casino_consecutive_wins", String(current + 1));
  } else {
    sessionStorage.setItem("casino_consecutive_wins", "0");
  }
}

/**
 * Core mathematical engine determining effective win ratio for any game round.
 * Strictly guarantees that players win at the configured tight rate (default 5.0% = 1 in 20 rounds).
 */
export function getUserWinRatio(customRatio?: number, rtpBias?: string): number {
  if (shouldForceLose()) {
    return 0.03; // Max 3% when in Force Lose protection
  }

  if (checkWinStreakLimit()) {
    return 0.01; // Max 1% after consecutive wins
  }

  // Check RTP Bias setting override
  const activeBias = rtpBias || (typeof window !== "undefined" ? localStorage.getItem("casino_rtp_bias") : null);
  if (activeBias === "rigged") return 0.01; // 1%
  if (activeBias === "tight") return 0.02;  // 2%
  if (activeBias === "loose") return 0.08;  // 8%

  // If custom ratio passed
  if (customRatio !== undefined && customRatio > 0) {
    if (customRatio <= 20) {
      // Direct win percentage (e.g. 5% = 0.05)
      return Math.max(0.01, Math.min(0.12, customRatio / 100));
    } else {
      // RTP percentage (e.g. 95% RTP -> translates to 5-8% hit rate with payouts)
      return Math.max(0.01, Math.min(0.10, (customRatio / 100) * 0.08));
    }
  }

  if (typeof window !== "undefined") {
    const cachedRatio = localStorage.getItem("casino_custom_win_ratio");
    if (cachedRatio) {
      const parsed = Number(cachedRatio);
      if (!isNaN(parsed) && parsed > 0) {
        if (parsed <= 20) return Math.max(0.01, Math.min(0.12, parsed / 100));
        return Math.max(0.01, Math.min(0.10, (parsed / 100) * 0.08));
      }
    }

    const cachedGlobalRtp = localStorage.getItem("casino_global_rtp");
    if (cachedGlobalRtp) {
      const parsed = Number(cachedGlobalRtp);
      if (!isNaN(parsed) && parsed > 0) {
        if (parsed <= 20) return Math.max(0.01, Math.min(0.12, parsed / 100));
        return Math.max(0.01, Math.min(0.10, (parsed / 100) * 0.08));
      }
    }
  }

  return 0.05; // Strict default 5% win ratio (95% house win ratio)
}

/**
 * Core mathematical engine determining whether a game round results in a user win or house win.
 */
export function evaluateLiveGameRound(customRatio?: number, rtpBias?: string): boolean {
  const winOdds = getUserWinRatio(customRatio, rtpBias);
  if (winOdds <= 0) {
    recordRoundOutcome(false);
    return false;
  }
  const isWin = Math.random() < winOdds;
  recordRoundOutcome(isWin);
  return isWin;
}

/**
 * Helper to calculate crash points for Crash Rocket with realistic house-edge flight multipliers.
 */
export function calculateLiveCrashPoint(): number {
  const rand = Math.random();
  if (rand < 0.35) {
    // 35% instant crash immediately (1.00x - 1.15x)
    return parseFloat((1.00 + Math.random() * 0.15).toFixed(2));
  } else if (rand < 0.75) {
    // 40% quick crash (1.16x - 1.65x)
    return parseFloat((1.16 + Math.random() * 0.49).toFixed(2));
  } else if (rand < 0.93) {
    // 18% medium flight (1.66x - 2.80x)
    return parseFloat((1.66 + Math.random() * 1.14).toFixed(2));
  } else {
    // 7% high flight (2.81x - 8.00x)
    return parseFloat((2.81 + Math.random() * 5.19).toFixed(2));
  }
}
