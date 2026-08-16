import React, { useState } from "react";
import { X, ArrowLeft, Coins, Sparkles, HelpCircle, Shield, Maximize2 } from "lucide-react";
import FloorRulesModal from "./FloorRulesModal";
import { getRegisteredGame, GameConfig, getGlobalRtp } from "../data/gameData";

// Engine Imports
import { SlotsEngine } from "./engines/SlotsEngine";
import { TableEngine } from "./engines/TableEngine";
import { ArcadeEngine } from "./engines/ArcadeEngine";
import { LiveEngine } from "./engines/LiveEngine";

// Active Dedicated Game Imports
import ChickenDashGame from "./games/ChickenDashGame";
import CrazyTimeGame from "./games/CrazyTimeGame";
import SuperAceGame from "./games/SuperAceGame";
import ThemedSlotsGame from "./games/ThemedSlotsGame";
import TeenPattiGame from "./games/TeenPattiGame";
import RummyGame from "./games/RummyGame";
import CallbreakGame from "./games/CallbreakGame";
import DragonTigerGame from "./games/DragonTigerGame";
import SicBoGame from "./games/SicBoGame";
import LudoGame from "./games/LudoGame";
import ScratchCardsGame from "./games/ScratchCardsGame";
import FortuneGemsGame from "./games/FortuneGemsGame";
import MoneyComingGame from "./games/MoneyComingGame";
import RoyalFishingGame from "./games/RoyalFishingGame";
import CyberMinesGame from "./games/CyberMinesGame";
import VegasPlinkoGame from "./games/VegasPlinkoGame";
import VipKenoGame from "./games/VipKenoGame";
import GatesOfOlympusGame from "./games/GatesOfOlympusGame";
import SweetBonanzaGame from "./games/SweetBonanzaGame";
import SicBoTriplePitGame from "./games/SicBoTriplePitGame";
import SugarRush1000Game from "./games/SugarRush1000Game";
import AmericanRouletteGame from "./games/AmericanRouletteGame";
import WantedDeadOrAWildGame from "./games/WantedDeadOrAWildGame";
import Classic65BlackjackGame from "./games/Classic65BlackjackGame";
import RazorReturnsGame from "./games/RazorReturnsGame";
import SanQuentinGame from "./games/SanQuentinGame";
import EuropeanRouletteGame from "./games/EuropeanRouletteGame";
import MonopolyLiveGame from "./games/MonopolyLiveGame";
import BookOfDeadGame from "./games/BookOfDeadGame";
import BaccaratDragon7Game from "./games/BaccaratDragon7Game";
import SpeedBingo80Game from "./games/SpeedBingo80Game";
import NeonPlinko from "./NeonPlinko";
import LuxuryBaccarat from "./LuxuryBaccarat";
import BlackjackGame from "./BlackjackGame";
import RouletteGame from "./RouletteGame";
import VideoPokerGame from "./VideoPokerGame";
import CyberMines from "./CyberMines";
import InteractiveHighLow from "./InteractiveHighLow";
import SlotsGame from "./SlotsGame";
import { LiveGameStage } from "./LiveGameStage";
import { getPortfolioOverrides } from "../lib/portfolioManager";

interface GameModalProps {
  isOpen: boolean;
  gameId: string;
  gameName?: string;
  chips: number;
  onClose: () => void;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest?: (type: "greet" | "win" | "lose") => void;
  rtpBias?: string;
  globalRtp?: number;
  forcedOutcome?: string;
  onClearForcedOutcome?: () => void;
}

export const GameModal: React.FC<GameModalProps> = ({
  isOpen,
  gameId,
  gameName,
  chips,
  onClose,
  onWin,
  onLose,
  onCommentaryRequest,
  rtpBias,
  globalRtp,
  forcedOutcome,
  onClearForcedOutcome,
}) => {
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

  const activeGlobalRtp = globalRtp !== undefined ? globalRtp : getGlobalRtp();

  if (!isOpen || !gameId) return null;

  // Retrieve game configuration from central gameData registry
  const registeredGame = getRegisteredGame(gameId) || getRegisteredGame(gameName || "");

  // Create fallback config if game is dynamically launched from extended 1000+ catalog
  const gameConfig: GameConfig = registeredGame || {
    id: gameId,
    name: gameName || gameId.replace(/_/g, " "),
    category: "slots",
    engine: "slots",
    minBet: 0.10,
    maxBet: 1000,
    payout: "250x Multiplier",
    rtp: "97.0%",
    description: "A high-roller NexaSpin casino station.",
    icon: "🎰",
    badge: "EXPANDED",
    status: "Playable",
  };

  const normalizedId = (gameId || "").toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const normalizedName = (gameName || "").toLowerCase();

  // Check Portfolio Admin status overrides
  const portfolioOverrides = getPortfolioOverrides();
  const gameOverride = portfolioOverrides[gameId] || portfolioOverrides[gameName || ""] || {};
  const currentStatus = gameOverride.status || gameConfig.status || "Playable";

  if (currentStatus === "Under Maintenance") {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
        <div className="w-full max-w-lg p-8 bg-slate-950 border border-rose-500/40 rounded-3xl text-center font-mono space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto text-3xl animate-pulse">
            ⚠️
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-wider">
            Game Station Under Maintenance
          </h2>
          <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
            The <strong className="text-amber-400">{gameConfig.name}</strong> station is temporarily offline for scheduled security maintenance.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-400 text-slate-950 font-black text-xs uppercase cursor-pointer hover:scale-105 transition-all shadow-lg"
          >
            Close & Return
          </button>
        </div>
      </div>
    );
  }

  // Render appropriate dedicated component or modular engine
  const renderGameContent = () => {
    if (normalizedId === "chicken_dash" || normalizedId === "frog_dash") {
      return <ChickenDashGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} />;
    }
    if (normalizedId === "crazy_time") {
      return <CrazyTimeGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} />;
    }
    if (normalizedId === "super_ace" || normalizedId === "superace") {
      return <SuperAceGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} />;
    }
    if (normalizedId === "magic_ace") {
      return <ThemedSlotsGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} theme="magic_ace" />;
    }
    if (normalizedId === "boxing_king") {
      return <ThemedSlotsGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} theme="boxing_king" />;
    }
    if (normalizedId === "teen_patti") {
      return <TeenPattiGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} />;
    }
    if (normalizedId === "rummy") {
      return <RummyGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} />;
    }
    if (normalizedId === "callbreak") {
      return <CallbreakGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} />;
    }
    if (normalizedId === "dragon_tiger") {
      return <DragonTigerGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} />;
    }
    if (normalizedId === "sic_bo" || normalizedId === "sicbo" || normalizedId === "sic_bo_triple_pit") {
      return <SicBoTriplePitGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} rtpBias={rtpBias} />;
    }
    if (normalizedId === "gates_of_olympus" || normalizedId === "olympus" || normalizedId === "gates_of_olympus_v2" || normalizedId === "gates_of_olympus_deluxe") {
      return <GatesOfOlympusGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} rtpBias={rtpBias} />;
    }
    if (normalizedId === "sweet_bonanza" || normalizedId === "bonanza" || normalizedId === "sweet_bonanza_v2" || normalizedId === "sweet_bonanza_deluxe") {
      return <SweetBonanzaGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} rtpBias={rtpBias} />;
    }
    if (normalizedId === "sugar_rush_1000" || normalizedId === "sugarrush" || normalizedId === "sugar_rush" || normalizedId === "sugar_rush_1000_v2") {
      return <SugarRush1000Game chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} rtpBias={rtpBias} />;
    }
    if (normalizedId === "american_roulette" || normalizedId === "roulette_american" || normalizedId === "americanroulette" || normalizedId === "american_roulette_vip") {
      return <AmericanRouletteGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} rtpBias={rtpBias} />;
    }
    if (normalizedId === "crazy_time" || normalizedId === "crazytime") {
      return <CrazyTimeGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} rtpBias={rtpBias} />;
    }
    if (normalizedId === "wanted_dead_or_a_wild" || normalizedId === "wanted" || normalizedId === "wanted_wild") {
      return <WantedDeadOrAWildGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} rtpBias={rtpBias} />;
    }
    if (normalizedId === "classic_65_blackjack" || normalizedId === "blackjack_65" || normalizedId === "classic65blackjack") {
      return <Classic65BlackjackGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} rtpBias={rtpBias} />;
    }
    if (normalizedId === "razor_returns" || normalizedId === "razorreturns" || normalizedId === "razor" || normalizedId === "razor_returns_v2") {
      return <RazorReturnsGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} rtpBias={rtpBias} />;
    }
    if (normalizedId === "san_quentin" || normalizedId === "san_quentin_xways" || normalizedId === "sanquentin" || normalizedId === "san_quentin_v2") {
      return <SanQuentinGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} rtpBias={rtpBias} />;
    }
    if (normalizedId === "european_roulette" || normalizedId === "europeanroulette" || normalizedId === "euro_roulette" || normalizedId === "european_roulette_single_zero") {
      return <EuropeanRouletteGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} rtpBias={rtpBias} />;
    }
    if (normalizedId === "monopoly_live" || normalizedId === "monopoly" || normalizedId === "monopolylive") {
      return <MonopolyLiveGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} rtpBias={rtpBias} />;
    }
    if (normalizedId === "book_of_dead" || normalizedId === "bookofdead" || normalizedId === "book_dead" || normalizedId === "book_of_dead_deluxe") {
      return <BookOfDeadGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} rtpBias={rtpBias} />;
    }
    if (normalizedId === "baccarat_dragon_7" || normalizedId === "baccarat_dragon7" || normalizedId === "dragon_7" || normalizedId === "dragon7" || normalizedId === "baccarat_dragon_7_pit" || normalizedId === "baccarat_dragon_7_vip") {
      return <BaccaratDragon7Game chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} rtpBias={rtpBias} />;
    }
    if (normalizedId === "speed_bingo_80" || normalizedId === "speedbingo80" || normalizedId === "bingo_80" || normalizedId === "speed_bingo" || normalizedId === "speed_bingo_80_card" || normalizedId === "speed_bingo_80_turbo") {
      return <SpeedBingo80Game chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} rtpBias={rtpBias} />;
    }
    if (normalizedId === "ludo") {
      return <LudoGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} />;
    }
    if (normalizedId === "scratch_cards") {
      return <ScratchCardsGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} />;
    }
    if (normalizedId === "fortune_gems") {
      return <FortuneGemsGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} />;
    }
    if (normalizedId === "money_coming") {
      return <MoneyComingGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} />;
    }
    if (normalizedId === "royal_fishing") {
      return <RoyalFishingGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} />;
    }
    if (normalizedId === "plinko" || normalizedId === "vegas_plinko" || normalizedId === "neon_plinko" || normalizedId === "plinko_pegs") {
      return <VegasPlinkoGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} rtpBias={rtpBias} />;
    }
    if (normalizedId === "mines" || normalizedId === "cyber_mines" || normalizedId === "cybermines") {
      return <CyberMinesGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} rtpBias={rtpBias} />;
    }
    if (normalizedId === "keno" || normalizedId === "vip_keno" || normalizedId === "keno_80") {
      return <VipKenoGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} rtpBias={rtpBias} />;
    }
    if (normalizedId === "baccarat" || normalizedId === "luxury_baccarat") {
      return <LuxuryBaccarat chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest || (() => {})} />;
    }
    if (normalizedId === "blackjack") {
      return <BlackjackGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={(type: any) => onCommentaryRequest?.(type === "strategy" ? "greet" : type)} rtpBias={rtpBias as any} forcedOutcome={forcedOutcome as any} onClearForcedOutcome={onClearForcedOutcome} />;
    }
    if (normalizedId === "roulette") {
      return <RouletteGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={(type: any) => onCommentaryRequest?.(type === "spin" ? "greet" : type === "strategy" ? "greet" : type)} rtpBias={rtpBias as any} forcedOutcome={forcedOutcome as any} onClearForcedOutcome={onClearForcedOutcome} />;
    }
    if (normalizedId === "mines") {
      return <CyberMinesGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} rtpBias={rtpBias} />;
    }
    if (normalizedId === "video_poker") {
      return <VideoPokerGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest || (() => {})} />;
    }
    if (normalizedId === "high_low" || normalizedId === "highlow") {
      return <InteractiveHighLow chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest || (() => {})} />;
    }
    if (normalizedId === "classic_slots") {
      return <SlotsGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={(type: any) => onCommentaryRequest?.(type === "spin" ? "greet" : type)} rtpBias={rtpBias as any} forcedOutcome={forcedOutcome as any} onClearForcedOutcome={onClearForcedOutcome} />;
    }
    // 27. Live Mega Ball
    if (normalizedId.includes("mega_ball") || normalizedId.includes("bingo")) {
      return <LiveGameStage gameId="mega_ball" gameName="Mega Ball VIP" chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest || (() => {})} rtpBias={rtpBias} forcedOutcome={forcedOutcome} onClearForcedOutcome={onClearForcedOutcome} />;
    }
    // 28. Live Lightning Roulette
    if (normalizedId.includes("lightning")) {
      return <LiveGameStage gameId="lightning_roulette" gameName="Live Lightning Roulette" chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest || (() => {})} rtpBias={rtpBias} forcedOutcome={forcedOutcome} onClearForcedOutcome={onClearForcedOutcome} />;
    }
    // 29. Funky Time
    if (normalizedId.includes("funky")) {
      return <LiveGameStage gameId="funky_time" gameName="Funky Time VIP Wheel" chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest || (() => {})} rtpBias={rtpBias} forcedOutcome={forcedOutcome} onClearForcedOutcome={onClearForcedOutcome} />;
    }
    // 30. Live Blackjack
    if (normalizedId.includes("live_blackjack") || (normalizedId.includes("live") && normalizedId.includes("blackjack"))) {
      return <LiveGameStage gameId="live_blackjack" gameName="Live Blackjack VIP Infinite" chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest || (() => {})} rtpBias={rtpBias} forcedOutcome={forcedOutcome} onClearForcedOutcome={onClearForcedOutcome} />;
    }

    // Modular Engine Fallbacks for expanded 1000+ catalog
    switch (gameConfig.engine) {
      case "slots":
        return <SlotsEngine gameConfig={gameConfig} chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} globalRtp={activeGlobalRtp} rtpBias={rtpBias} />;
      case "table":
        return <TableEngine gameConfig={gameConfig} chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} globalRtp={activeGlobalRtp} rtpBias={rtpBias} />;
      case "arcade":
        return <ArcadeEngine gameConfig={gameConfig} chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} globalRtp={activeGlobalRtp} rtpBias={rtpBias} />;
      case "live":
        return <LiveEngine gameConfig={gameConfig} chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} globalRtp={activeGlobalRtp} rtpBias={rtpBias} />;
      default:
        return <SlotsEngine gameConfig={gameConfig} chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} globalRtp={activeGlobalRtp} rtpBias={rtpBias} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex flex-col p-2 sm:p-4 overflow-y-auto">
      {/* Top Shell Header */}
      <div className="w-full max-w-6xl mx-auto flex items-center justify-between bg-slate-900/90 border border-amber-500/30 px-4 py-3 rounded-2xl shadow-2xl mb-4 gap-2">
        <button
          onClick={onClose}
          className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-emerald-400 text-slate-950 text-xs font-mono font-black uppercase px-4 py-2.5 rounded-xl cursor-pointer hover:scale-105 transition-all shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit to Lobby</span>
        </button>

        <div className="flex items-center gap-2 overflow-hidden">
          <Sparkles className="w-4 h-4 text-[#FFD700] shrink-0 animate-pulse" />
          <span className="font-mono font-black text-sm uppercase tracking-wider text-[#FFD700] truncate">
            {gameConfig.name}
          </span>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-amber-950 border border-amber-500/40 text-[9px] font-mono font-bold uppercase text-amber-300">
            Min ${gameConfig.minBet} | Payout: {gameConfig.payout}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsRulesModalOpen(true)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-amber-500/30 px-3 py-2 rounded-xl text-amber-300 text-xs font-mono font-bold uppercase transition-all cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Rules</span>
          </button>

          <div className="bg-black/80 border border-amber-500/40 px-3 py-2 rounded-xl font-mono text-xs flex items-center gap-1.5 shadow-inner">
            <Coins className="w-4 h-4 text-[#FFD700]" />
            <span className="text-[#00FF66] font-black">${chips.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Main Game Content Stage */}
      <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col justify-center">
        {renderGameContent()}
      </div>

      {/* Floor & Game Rules Modal */}
      <FloorRulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        highlightGame={gameConfig.name}
      />
    </div>
  );
};

export default GameModal;
