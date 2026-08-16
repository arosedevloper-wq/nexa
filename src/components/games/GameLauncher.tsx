import React, { useState } from "react";
import { ArrowLeft, Gamepad2, Coins, Sparkles, Volume2, VolumeX, Maximize2, Scale, HelpCircle } from "lucide-react";
import FloorRulesModal from "../FloorRulesModal";
import ChickenDashGame from "./ChickenDashGame";
import CrazyTimeGame from "./CrazyTimeGame";
import SuperAceGame from "./SuperAceGame";
import ThemedSlotsGame from "./ThemedSlotsGame";
import TeenPattiGame from "./TeenPattiGame";
import RummyGame from "./RummyGame";
import CallbreakGame from "./CallbreakGame";
import DragonTigerGame from "./DragonTigerGame";
import SicBoGame from "./SicBoGame";
import LudoGame from "./LudoGame";
import ScratchCardsGame from "./ScratchCardsGame";
import FortuneGemsGame from "./FortuneGemsGame";
import MoneyComingGame from "./MoneyComingGame";
import RoyalFishingGame from "./RoyalFishingGame";
import CyberMinesGame from "./CyberMinesGame";
import VegasPlinkoGame from "./VegasPlinkoGame";
import VipKenoGame from "./VipKenoGame";
import GatesOfOlympusGame from "./GatesOfOlympusGame";
import SweetBonanzaGame from "./SweetBonanzaGame";
import SicBoTriplePitGame from "./SicBoTriplePitGame";
import SugarRush1000Game from "./SugarRush1000Game";
import AmericanRouletteGame from "./AmericanRouletteGame";
import WantedDeadOrAWildGame from "./WantedDeadOrAWildGame";
import Classic65BlackjackGame from "./Classic65BlackjackGame";
import RazorReturnsGame from "./RazorReturnsGame";
import SanQuentinGame from "./SanQuentinGame";
import EuropeanRouletteGame from "./EuropeanRouletteGame";
import MonopolyLiveGame from "./MonopolyLiveGame";
import BookOfDeadGame from "./BookOfDeadGame";
import BaccaratDragon7Game from "./BaccaratDragon7Game";
import SpeedBingo80Game from "./SpeedBingo80Game";
import NeonPlinko from "../NeonPlinko";
import LuxuryBaccarat from "../LuxuryBaccarat";
import BlackjackGame from "../BlackjackGame";
import RouletteGame from "../RouletteGame";
import VideoPokerGame from "../VideoPokerGame";
import CyberMines from "../CyberMines";
import InteractiveHighLow from "../InteractiveHighLow";
import SlotsGame from "../SlotsGame";
import { LiveGameStage } from "../LiveGameStage";
import { getRegisteredGame, GameConfig } from "../../data/gameData";
import { SlotsEngine } from "../engines/SlotsEngine";
import { TableEngine } from "../engines/TableEngine";
import { ArcadeEngine } from "../engines/ArcadeEngine";
import { LiveEngine } from "../engines/LiveEngine";
import { getPortfolioOverrides, GameConfigOverride } from "../../lib/portfolioManager";

interface GameLauncherProps {
  gameId: string;
  gameName?: string;
  chips: number;
  onBack: () => void;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest?: (type: "greet" | "win" | "lose") => void;
  rtpBias?: string;
  forcedOutcome?: string;
  onClearForcedOutcome?: () => void;
}

export const GameLauncher: React.FC<GameLauncherProps> = ({
  gameId,
  gameName,
  chips,
  onBack,
  onWin,
  onLose,
  onCommentaryRequest,
  rtpBias,
  forcedOutcome,
  onClearForcedOutcome,
}) => {
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const normalizedId = (gameId || "").toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const normalizedName = (gameName || "").toLowerCase();

  const portfolioOverrides = getPortfolioOverrides();
  const gameOverride: GameConfigOverride = portfolioOverrides[gameId] || portfolioOverrides[gameName || ""] || {};
  const currentStatus = gameOverride.status || "Playable";

  if (currentStatus === "Under Maintenance") {
    return (
      <div className="w-full max-w-4xl mx-auto p-8 bg-slate-950 border border-rose-500/40 rounded-3xl text-center font-mono space-y-4 my-8 shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto text-3xl animate-pulse">
          ⚠️
        </div>
        <h2 className="text-xl font-black text-white uppercase tracking-wider">
          Game Station Under Maintenance
        </h2>
        <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
          The <strong className="text-amber-400">{gameName || gameId}</strong> station is temporarily offline for scheduled security & database maintenance by System Administrators. Please check back shortly or select another game from the portfolio.
        </p>
        <button
          onClick={onBack}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-400 text-slate-950 font-black text-xs uppercase cursor-pointer hover:scale-105 transition-all shadow-lg"
        >
          Return to Game Lobby
        </button>
      </div>
    );
  }

  if (currentStatus === "VIP Locked") {
    return (
      <div className="w-full max-w-4xl mx-auto p-8 bg-slate-950 border border-amber-500/40 rounded-3xl text-center font-mono space-y-4 my-8 shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto text-3xl">
          👑
        </div>
        <h2 className="text-xl font-black text-white uppercase tracking-wider">
          VIP Gold Restricted Station
        </h2>
        <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
          The <strong className="text-amber-400">{gameName || gameId}</strong> station requires VIP Gold rank or higher. Contact an Admin to unlock your account tier.
        </p>
        <button
          onClick={onBack}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-400 text-slate-950 font-black text-xs uppercase cursor-pointer hover:scale-105 transition-all shadow-lg"
        >
          Return to Game Lobby
        </button>
      </div>
    );
  }

  const renderActiveGame = () => {
    // 1. Vegas Plinko
    if (normalizedId === "plinko" || normalizedId === "vegas_plinko" || normalizedId === "neon_plinko" || normalizedId === "plinko_pegs") {
      return <VegasPlinkoGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} rtpBias={rtpBias} />;
    }

    // 2. Cyber Mines
    if (normalizedId === "mines" || normalizedId === "cyber_mines" || normalizedId === "cybermines") {
      return <CyberMinesGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} rtpBias={rtpBias} />;
    }

    // 3. VIP Keno
    if (normalizedId === "keno" || normalizedId === "vip_keno" || normalizedId === "keno_80") {
      return <VipKenoGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} rtpBias={rtpBias} />;
    }

    // 4. Chicken / Frog Dash
    if (normalizedId === "chicken_dash" || normalizedId === "frog_dash") {
      return <ChickenDashGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} />;
    }

    // 5. Crazy Time
    if (normalizedId === "crazy_time") {
      return <CrazyTimeGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} />;
    }

    // 6. Super Ace
    if (normalizedId === "super_ace" || normalizedId === "superace") {
      return <SuperAceGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} />;
    }

    // 7. Magic Ace
    if (normalizedId === "magic_ace") {
      return <ThemedSlotsGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} theme="magic_ace" />;
    }

    // 8. Boxing King
    if (normalizedId === "boxing_king") {
      return <ThemedSlotsGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} theme="boxing_king" />;
    }

    // 9. Teen Patti
    if (normalizedId === "teen_patti") {
      return <TeenPattiGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} />;
    }

    // 10. Rummy
    if (normalizedId === "rummy") {
      return <RummyGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} />;
    }

    // 11. Callbreak
    if (normalizedId === "callbreak") {
      return <CallbreakGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} />;
    }

    // 12. Dragon Tiger
    if (normalizedId === "dragon_tiger") {
      return <DragonTigerGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} />;
    }

    // 13. Baccarat Squeeze
    if (normalizedId === "baccarat" || normalizedId === "luxury_baccarat") {
      return <LuxuryBaccarat chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest || (() => {})} />;
    }

    // 14. Sic Bo
    if (normalizedId === "sic_bo" || normalizedId === "sicbo" || normalizedId === "sic_bo_triple_pit") {
      return <SicBoTriplePitGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} rtpBias={rtpBias} />;
    }

    // 14b. Gates of Olympus
    if (normalizedId === "gates_of_olympus" || normalizedId === "olympus" || normalizedId === "gates_of_olympus_v2" || normalizedId === "gates_of_olympus_deluxe") {
      return <GatesOfOlympusGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} rtpBias={rtpBias} />;
    }

    // 14c. Sweet Bonanza
    if (normalizedId === "sweet_bonanza" || normalizedId === "bonanza" || normalizedId === "sweet_bonanza_v2" || normalizedId === "sweet_bonanza_deluxe") {
      return <SweetBonanzaGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} rtpBias={rtpBias} />;
    }

    // 14d. Sugar Rush 1000
    if (normalizedId === "sugar_rush_1000" || normalizedId === "sugarrush" || normalizedId === "sugar_rush" || normalizedId === "sugar_rush_1000_v2") {
      return <SugarRush1000Game chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} rtpBias={rtpBias} />;
    }

    // 14e. American Roulette
    if (normalizedId === "american_roulette" || normalizedId === "roulette_american" || normalizedId === "americanroulette" || normalizedId === "american_roulette_vip") {
      return <AmericanRouletteGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} rtpBias={rtpBias} />;
    }

    // 14f. Crazy Time
    if (normalizedId === "crazy_time" || normalizedId === "crazytime") {
      return <CrazyTimeGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} rtpBias={rtpBias} />;
    }

    // 14g. Wanted Dead or a Wild
    if (normalizedId === "wanted_dead_or_a_wild" || normalizedId === "wanted" || normalizedId === "wanted_wild") {
      return <WantedDeadOrAWildGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} rtpBias={rtpBias} />;
    }

    // 14h. Classic 6:5 Blackjack
    if (normalizedId === "classic_65_blackjack" || normalizedId === "blackjack_65" || normalizedId === "classic65blackjack") {
      return <Classic65BlackjackGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} rtpBias={rtpBias} />;
    }

    // 14i. Razor Returns
    if (normalizedId === "razor_returns" || normalizedId === "razorreturns" || normalizedId === "razor" || normalizedId === "razor_returns_v2") {
      return <RazorReturnsGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} rtpBias={rtpBias} />;
    }

    // 14j. San Quentin xWays
    if (normalizedId === "san_quentin" || normalizedId === "san_quentin_xways" || normalizedId === "sanquentin" || normalizedId === "san_quentin_v2") {
      return <SanQuentinGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} rtpBias={rtpBias} />;
    }

    // 14k. European Roulette
    if (normalizedId === "european_roulette" || normalizedId === "europeanroulette" || normalizedId === "euro_roulette" || normalizedId === "european_roulette_single_zero") {
      return <EuropeanRouletteGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} rtpBias={rtpBias} />;
    }

    // 14l. Monopoly Live
    if (normalizedId === "monopoly_live" || normalizedId === "monopoly" || normalizedId === "monopolylive") {
      return <MonopolyLiveGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} rtpBias={rtpBias} />;
    }

    // 14m. Book of Dead
    if (normalizedId === "book_of_dead" || normalizedId === "bookofdead" || normalizedId === "book_dead" || normalizedId === "book_of_dead_deluxe") {
      return <BookOfDeadGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} rtpBias={rtpBias} />;
    }

    // 14n. Baccarat Dragon 7
    if (normalizedId === "baccarat_dragon_7" || normalizedId === "baccarat_dragon7" || normalizedId === "dragon_7" || normalizedId === "dragon7" || normalizedId === "baccarat_dragon_7_pit" || normalizedId === "baccarat_dragon_7_vip") {
      return <BaccaratDragon7Game chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} rtpBias={rtpBias} />;
    }

    // 14o. Speed Bingo 80
    if (normalizedId === "speed_bingo_80" || normalizedId === "speedbingo80" || normalizedId === "bingo_80" || normalizedId === "speed_bingo" || normalizedId === "speed_bingo_80_card" || normalizedId === "speed_bingo_80_turbo") {
      return <SpeedBingo80Game chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} rtpBias={rtpBias} />;
    }

    // 15. Ludo
    if (normalizedId === "ludo") {
      return <LudoGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} />;
    }

    // 16. Scratch Cards
    if (normalizedId === "scratch_cards") {
      return <ScratchCardsGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} />;
    }

    // 17. Fortune Gems
    if (normalizedId === "fortune_gems") {
      return <FortuneGemsGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} />;
    }

    // 18. Money Coming
    if (normalizedId === "money_coming") {
      return <MoneyComingGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} />;
    }

    // 19. Royal Fishing
    if (normalizedId === "royal_fishing") {
      return <RoyalFishingGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} />;
    }

    // 20. High Low
    if (normalizedId === "high_low" || normalizedId === "highlow") {
      return <InteractiveHighLow chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest || (() => {})} />;
    }

    // 21. Blackjack
    if (normalizedId === "blackjack") {
      return <BlackjackGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={(type: any) => onCommentaryRequest?.(type === "strategy" ? "greet" : type)} rtpBias={rtpBias as any} forcedOutcome={forcedOutcome as any} onClearForcedOutcome={onClearForcedOutcome} />;
    }

    // 22. Roulette
    if (normalizedId === "roulette") {
      return <RouletteGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={(type: any) => onCommentaryRequest?.(type === "spin" ? "greet" : type === "strategy" ? "greet" : type)} rtpBias={rtpBias as any} forcedOutcome={forcedOutcome as any} onClearForcedOutcome={onClearForcedOutcome} />;
    }

    // 23. Mines
    if (normalizedId === "mines") {
      return <CyberMinesGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} rtpBias={rtpBias} />;
    }

    // 24. Video Poker
    if (normalizedId === "video_poker") {
      return <VideoPokerGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest || (() => {})} />;
    }

    // 25. Mega Ball / Bingo
    if (normalizedId === "mega_ball") {
      return <LiveGameStage gameId="mega_ball" gameName="Mega Ball VIP" chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest || (() => {})} rtpBias={rtpBias} forcedOutcome={forcedOutcome} onClearForcedOutcome={onClearForcedOutcome} />;
    }

    // 26. Classic Cosmic Slots
    if (normalizedId === "classic_slots") {
      return <SlotsGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={(type: any) => onCommentaryRequest?.(type === "spin" ? "greet" : type)} rtpBias={rtpBias as any} forcedOutcome={forcedOutcome as any} onClearForcedOutcome={onClearForcedOutcome} />;
    }

    // 28. Live Lightning Roulette
    if (normalizedId === "lightning_roulette") {
      return <LiveGameStage gameId="lightning_roulette" gameName="Live Lightning Roulette" chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest || (() => {})} rtpBias={rtpBias} forcedOutcome={forcedOutcome} onClearForcedOutcome={onClearForcedOutcome} />;
    }

    // 29. Funky Time Disco
    if (normalizedId === "funky_time") {
      return <LiveGameStage gameId="funky_time" gameName="Funky Time VIP Wheel" chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest || (() => {})} rtpBias={rtpBias} forcedOutcome={forcedOutcome} onClearForcedOutcome={onClearForcedOutcome} />;
    }

    // 30. Live Blackjack
    if (normalizedId === "live_blackjack") {
      return <LiveGameStage gameId="live_blackjack" gameName="Live Blackjack VIP Infinite" chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest || (() => {})} rtpBias={rtpBias} forcedOutcome={forcedOutcome} onClearForcedOutcome={onClearForcedOutcome} />;
    }

    // Modular Engine Fallback for expanded catalog
    const registered = getRegisteredGame(gameId) || getRegisteredGame(gameName || "");
    const fallbackConfig: GameConfig = registered || {
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
      status: "Playable",
    };

    switch (fallbackConfig.engine) {
      case "slots":
        return <SlotsEngine gameConfig={fallbackConfig} chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} />;
      case "table":
        return <TableEngine gameConfig={fallbackConfig} chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} />;
      case "arcade":
        return <ArcadeEngine gameConfig={fallbackConfig} chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} />;
      case "live":
        return <LiveEngine gameConfig={fallbackConfig} chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} />;
      default:
        return <ThemedSlotsGame chips={chips} onWin={onWin} onLose={onLose} onCommentaryRequest={onCommentaryRequest} />;
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Top Game Shell Navigation Bar - Sleek Gold/Emerald VIP Styling */}
      <div className="flex items-center justify-between bg-slate-900/95 backdrop-blur-lg border border-amber-500/30 px-3.5 py-2.5 rounded-2xl shadow-[0_0_25px_rgba(255,215,0,0.15)] gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-emerald-400 hover:from-emerald-400 hover:to-amber-500 text-slate-950 text-xs font-mono font-black uppercase tracking-wider px-3.5 py-2.5 rounded-xl transition cursor-pointer min-h-[44px] min-w-[44px] touch-manipulation select-none active:scale-95 shadow-[0_0_15px_rgba(0,255,102,0.4)] border border-emerald-300"
          id="game-shell-exit-btn"
        >
          <ArrowLeft className="w-4 h-4 stroke-[3]" />
          <span className="hidden sm:inline">Exit to Lobby</span>
          <span className="sm:hidden">Lobby</span>
        </button>

        <div className="flex items-center gap-2 overflow-hidden">
          <Sparkles className="w-4 h-4 text-[#FFD700] shrink-0 animate-pulse" />
          <span className="font-mono font-black text-xs sm:text-sm uppercase tracking-wider text-[#FFD700] truncate drop-shadow-[0_2px_8px_rgba(255,215,0,0.4)]">
            {gameName || gameId.replace(/_/g, " ")}
          </span>
          <span className="hidden md:inline-block px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-[9px] font-mono font-bold uppercase text-amber-300">
            VIP SUITE
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsRulesModalOpen(true)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-amber-500/30 px-3 py-2 rounded-xl text-amber-300 hover:text-amber-200 text-xs font-mono font-bold uppercase transition-all cursor-pointer active:scale-95 min-h-[44px]"
            title="View Floor & Game Rules"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Rules</span>
          </button>

          <div className="bg-black/80 border border-amber-500/40 px-3 py-2 rounded-xl font-mono text-xs flex items-center gap-1.5 min-h-[44px] shadow-inner">
            <Coins className="w-4 h-4 text-[#FFD700]" />
            <span className="text-[#00FF66] font-black tracking-wide">${chips.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Render Active Component inside VIP Canvas */}
      <div className="w-full min-h-[400px] rounded-3xl border border-amber-500/30 bg-slate-950/90 backdrop-blur-xl p-1 sm:p-2 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
        {renderActiveGame()}
      </div>

      {/* Floor & Game Rules Modal */}
      <FloorRulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        initialTab={
          normalizedId.includes("blackjack") || normalizedId.includes("baccarat") || normalizedId.includes("poker") || normalizedId.includes("roulette") || normalizedId.includes("teen") || normalizedId.includes("dragon") || normalizedId.includes("rummy") || normalizedId.includes("callbreak")
            ? "cards"
            : normalizedId.includes("mines") || normalizedId.includes("plinko") || normalizedId.includes("dash")
            ? "house"
            : normalizedId.includes("slot") || normalizedId.includes("ace") || normalizedId.includes("gems") || normalizedId.includes("money")
            ? "slots"
            : "house"
        }
        highlightGame={gameName || gameId}
      />
    </div>
  );
};

export default GameLauncher;
