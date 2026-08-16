import { CASINO_GAMES_CATALOG, CasinoGame } from "../data/gamesList";

export interface GameConfigOverride {
  gameId?: string;
  minBet?: number;
  maxBet?: number;
  rtpPercent?: number; // e.g., 95, 98, 92
  status?: "Playable" | "VIP Locked" | "Under Maintenance";
  badge?: string;
  featured?: boolean;
  totalBetsCount?: number;
  totalVolumeChips?: number;
  totalPayoutChips?: number;
}

const PORTFOLIO_OVERRIDES_KEY = "casino_game_portfolio_v1";

export function getPortfolioOverrides(): Record<string, GameConfigOverride> {
  try {
    const raw = localStorage.getItem(PORTFOLIO_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error("Failed to load portfolio overrides:", e);
    return {};
  }
}

export function savePortfolioOverride(gameId: string, override: Partial<GameConfigOverride>) {
  try {
    const current = getPortfolioOverrides();
    const existing = current[gameId] || { gameId };
    current[gameId] = {
      ...existing,
      ...override
    };
    localStorage.setItem(PORTFOLIO_OVERRIDES_KEY, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent("portfolio_updated", { detail: { gameId, override: current[gameId] } }));
    window.dispatchEvent(new Event("storage"));
  } catch (e) {
    console.error("Failed to save portfolio override:", e);
  }
}

export function recordGameStats(gameId: string, betAmount: number, payoutAmount: number) {
  try {
    const current = getPortfolioOverrides();
    const existing = current[gameId] || { gameId };
    const betsCount = (existing.totalBetsCount || 0) + 1;
    const volume = (existing.totalVolumeChips || 0) + betAmount;
    const payout = (existing.totalPayoutChips || 0) + payoutAmount;

    current[gameId] = {
      ...existing,
      totalBetsCount: betsCount,
      totalVolumeChips: volume,
      totalPayoutChips: payout
    };
    localStorage.setItem(PORTFOLIO_OVERRIDES_KEY, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent("portfolio_updated", { detail: { gameId, override: current[gameId] } }));
  } catch (e) {
    console.error("Failed to record game stats:", e);
  }
}

export function getMergedGameCatalog(): (CasinoGame & {
  rtpPercent: number;
  status: "Playable" | "VIP Locked" | "Under Maintenance";
  totalBetsCount: number;
  totalVolumeChips: number;
  totalPayoutChips: number;
})[] {
  const overrides = getPortfolioOverrides();
  return CASINO_GAMES_CATALOG.map((game) => {
    const ov: GameConfigOverride = overrides[game.id] || overrides[game.name] || {};
    const parsedMin = ov.minBet !== undefined ? parseFloat(String(ov.minBet)) : (game.minBet !== undefined ? parseFloat(String(game.minBet)) : 0.10);
    const parsedMax = ov.maxBet !== undefined ? parseFloat(String(ov.maxBet)) : (game.maxBet !== undefined ? parseFloat(String(game.maxBet)) : 1000);
    const parsedRtp = ov.rtpPercent !== undefined ? parseFloat(String(ov.rtpPercent)) : 96.5;

    return {
      ...game,
      minBet: !isNaN(parsedMin) ? parsedMin : 0.10,
      maxBet: !isNaN(parsedMax) ? parsedMax : 1000,
      status: ov.status || game.status,
      badge: ov.badge !== undefined ? ov.badge : game.badge,
      rtpPercent: !isNaN(parsedRtp) ? parsedRtp : 96.5,
      totalBetsCount: ov.totalBetsCount || Math.floor(Math.random() * 250) + 12,
      totalVolumeChips: ov.totalVolumeChips || Math.floor(Math.random() * 850000) + 25000,
      totalPayoutChips: ov.totalPayoutChips || Math.floor(Math.random() * 780000) + 22000
    };
  });
}
