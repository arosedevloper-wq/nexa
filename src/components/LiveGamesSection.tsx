import React, { useState, useEffect } from "react";
import { 
  Radio, 
  Sparkles, 
  TrendingUp, 
  Play, 
  ArrowRight, 
  ShieldCheck, 
  Coins, 
  Tv, 
  Zap,
  Award
} from "lucide-react";
import { motion } from "motion/react";
import { CASINO_GAMES_CATALOG, CasinoGame } from "../data/gamesList";
import { casinoAudio } from "../lib/audioService";
import { LiveGameStage } from "./LiveGameStage";

interface LiveGamesSectionProps {
  chips: number;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onLaunchGame: (gameId: string, category: string, gameName: string) => void;
  selectedGameInfo?: { id: string; name: string } | null;
}

export const LiveGamesSection: React.FC<LiveGamesSectionProps> = ({
  chips,
  onWin,
  onLose,
  onLaunchGame,
  selectedGameInfo,
}) => {
  const [selectedLiveGame, setSelectedLiveGame] = useState<{ id: string; name: string } | null>(selectedGameInfo || null);
  const [activeTabMode, setActiveTabMode] = useState<"catalog" | "crash_embedded">("catalog");

  useEffect(() => {
    if (selectedGameInfo) {
      setSelectedLiveGame(selectedGameInfo);
    }
  }, [selectedGameInfo]);

  // Get Crash Rocket game
  const crashGame = CASINO_GAMES_CATALOG.find((g) => g.id === "primary-crash");

  // Get the 5 new premium live games
  const newLiveGames = CASINO_GAMES_CATALOG.filter((g) => 
    ["primary-lightning-roulette", "primary-crazy-time", "primary-live-blackjack", "primary-mega-ball", "primary-baccarat-squeeze"].includes(g.id)
  );

  // Get all remaining live games
  const otherLiveGames = CASINO_GAMES_CATALOG.filter((g) => 
    (g.category === "live" || g.category === "table") &&
    !["primary-lightning-roulette", "primary-crazy-time", "primary-live-blackjack", "primary-mega-ball", "primary-baccarat-squeeze", "primary-crash"].includes(g.id)
  );

  const handleSelectGame = (gameId: string, gameName: string) => {
    casinoAudio.playClick();
    // Open directly in high-fidelity live game stage
    setSelectedLiveGame({ id: gameId, name: gameName });
  };

  // If player opened a specific live game stage
  if (selectedLiveGame) {
    return (
      <LiveGameStage
        gameId={selectedLiveGame.id}
        gameName={selectedLiveGame.name}
        chips={chips}
        onBack={() => setSelectedLiveGame(null)}
        onWin={onWin}
        onLose={onLose}
      />
    );
  }

  return (
    <div className="space-y-6 font-mono">
      
      {/* Live Section Header & House Edge Notification */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950/60 to-slate-950 border border-rose-500/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-rose-500 via-red-600 to-amber-500 flex items-center justify-center text-white shadow-[0_0_20px_rgba(244,63,94,0.6)]">
            <Radio className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight uppercase">
                LIVE CASINO HUB
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-400 font-extrabold text-[9px] uppercase tracking-wider flex items-center gap-1 animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
                4K STREAMS
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time broadcasts, high-limit tables & live multiplier game shows.
            </p>
          </div>
        </div>

        {/* Global Security Sync Banner */}
        <div className="relative z-10 bg-slate-900/90 border border-emerald-500/40 px-3.5 py-2 rounded-2xl text-[10px] font-bold text-emerald-400 flex items-center gap-2 shadow-lg">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
          <div>
            <span className="text-white block font-black">PROVABLY FAIR SYSTEM</span>
            <span className="text-slate-400">Cryptographically Verified & Encrypted</span>
          </div>
        </div>
      </div>

      {/* 5 NEW PREMIUM LIVE GAMES SECTION */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-400 animate-pulse" />
          <h3 className="text-sm font-serif font-black text-amber-300 uppercase tracking-wider">
            PREMIUM NEW LIVE TABLES (5 TITLES)
          </h3>
        </div>

        <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
          {newLiveGames.map((game, idx) => (
            <motion.div
              key={game.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelectGame(game.id, game.name)}
              style={{ animationDelay: `${(idx % 6) * 0.3}s` }}
              className="group relative rounded-xl sm:rounded-2xl border border-slate-800/80 bg-[#0d131e]/95 hover:border-cyan-400/90 hover:shadow-[0_0_26px_rgba(6,182,212,0.4)] shadow-lg transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between active:scale-[0.97] touch-manipulation animate-neon-pulse-cyan"
            >
              {/* Top Edge Neon Glowing Pulse Line */}
              <div className="h-[2px] w-full bg-gradient-to-r from-cyan-500 via-teal-300 to-cyan-500 opacity-80 group-hover:opacity-100 transition-opacity" />

              {/* Photorealistic Character Art Header with Laser Sheen */}
              <div className="relative h-28 xs:h-32 sm:h-36 md:h-40 w-full overflow-hidden shrink-0 bg-slate-950 laser-sheen-effect">
                <img
                  src={game.artworkUrl || "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80"}
                  alt={game.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-500 filter contrast-105 brightness-95"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d131e] via-transparent to-black/40" />

                {/* BC.Game Signature Quick 'Play' Hover Overlay with Pulsing Ring */}
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-1.5 z-20">
                  <div className="relative">
                    <div className="absolute -inset-1.5 rounded-full bg-cyan-400/30 animate-ping opacity-70 pointer-events-none" />
                    <div className="h-8 w-8 sm:h-11 sm:w-11 rounded-full bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 flex items-center justify-center text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.85)] transform scale-75 group-hover:scale-100 transition-transform duration-300 relative z-10">
                      <Play className="h-4 w-4 sm:h-5 sm:w-5 fill-slate-950 stroke-0 ml-0.5" />
                    </div>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-mono font-black text-cyan-300 tracking-widest uppercase drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">
                    JOIN TABLE
                  </span>
                </div>

                {/* Character Tag Badge Top-Left */}
                {game.characterTag && (
                  <div className="absolute top-1.5 left-1.5 z-10">
                    <span className="px-1.5 py-0.5 rounded-md bg-black/85 border border-amber-400/50 text-[7.5px] sm:text-[8.5px] font-mono font-bold uppercase text-amber-300 backdrop-blur-md shadow-sm flex items-center gap-1">
                      <Sparkles className="h-2 w-2 text-amber-400 shrink-0 animate-pulse" />
                      <span className="truncate max-w-[55px] sm:max-w-none">{game.characterTag}</span>
                    </span>
                  </div>
                )}

                {/* Live Badge Top-Right */}
                <div className="absolute top-1.5 right-1.5 z-10 flex items-center gap-1">
                  {game.badge ? (
                    <span className="px-1.5 py-0.5 rounded-md bg-rose-600/95 border border-rose-300 text-[7.5px] sm:text-[8px] font-mono font-black uppercase text-white shadow-[0_0_8px_rgba(225,29,72,0.6)]">
                      {game.badge}
                    </span>
                  ) : (
                    <div className="flex items-center gap-1 bg-black/85 backdrop-blur-md px-1.5 py-0.5 rounded-md border border-rose-500/50 shadow-sm">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500" />
                      </span>
                      <span className="text-[7.5px] sm:text-[8px] font-mono font-extrabold uppercase text-rose-300">
                        LIVE
                      </span>
                    </div>
                  )}
                </div>

                {/* Floating Game Icon Emblem with Neon Glow */}
                <div className="absolute bottom-1.5 left-1.5 z-10 h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-black/85 border border-cyan-400/60 shadow-[0_0_12px_rgba(6,182,212,0.3)] backdrop-blur-md flex items-center justify-center text-xs sm:text-sm transition-all">
                  <span>{game.icon}</span>
                </div>

                {/* Bottom-Right Live Player Count Badge */}
                <div className="absolute bottom-1.5 right-1.5 z-10 flex items-center gap-1 bg-black/85 backdrop-blur-md px-1.5 py-0.5 rounded-full border border-emerald-500/40 shadow-sm">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  <span className="text-[7px] sm:text-[8px] font-mono font-bold text-emerald-300 tracking-wider">
                    {120 + ((idx * 47) % 180)} LIVE
                  </span>
                </div>
              </div>

              {/* Compact Card Content */}
              <div className="p-2 sm:p-2.5 relative z-10 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-100 group-hover:text-cyan-300 transition-colors truncate tracking-tight">
                    {game.name}
                  </h4>
                  <p className="text-[9px] sm:text-[10px] text-slate-400 font-mono truncate mt-0.5">
                    {game.description}
                  </p>
                </div>

                <div className="border-t border-slate-800/80 pt-1.5 mt-2 flex items-center justify-between text-[8px] sm:text-[9px] font-mono">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 uppercase text-[7.5px] sm:text-[8px]">POTENTIAL:</span>
                    <strong className="text-amber-300 font-extrabold drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]">{game.multiplier}</strong>
                  </div>

                  <span className="text-cyan-400 font-extrabold text-[8px] sm:text-[9px] uppercase tracking-wider flex items-center gap-1 drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]">
                    JOIN <ArrowRight className="h-2.5 w-2.5" />
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* OTHER LIVE & TABLE GAMES */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-serif font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
          <Tv className="h-4 w-4 text-cyan-400 animate-pulse" /> ALL OTHER LIVE DEALER TABLES
        </h3>

        <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
          {otherLiveGames.map((game, idx) => (
            <div
              key={game.id}
              onClick={() => handleSelectGame(game.id, game.name)}
              style={{ animationDelay: `${(idx % 6) * 0.35}s` }}
              className="group relative rounded-xl sm:rounded-2xl border border-slate-800/80 bg-[#0d131e]/95 hover:border-cyan-400/90 hover:shadow-[0_0_26px_rgba(6,182,212,0.4)] shadow-lg transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between active:scale-[0.97] touch-manipulation animate-neon-pulse-cyan"
            >
              {/* Top Edge Neon Glowing Pulse Line */}
              <div className="h-[2px] w-full bg-gradient-to-r from-cyan-500 via-sky-300 to-cyan-500 opacity-80 group-hover:opacity-100 transition-opacity" />

              {/* Photorealistic Artwork Header with Laser Sheen */}
              <div className="relative h-28 xs:h-32 sm:h-36 md:h-40 w-full overflow-hidden shrink-0 bg-slate-950 laser-sheen-effect">
                <img
                  src={game.artworkUrl || "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80"}
                  alt={game.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-500 filter contrast-105 brightness-95"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d131e] via-transparent to-black/40" />

                {/* BC.Game Signature Quick 'Play' Hover Overlay */}
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-1.5 z-20">
                  <div className="relative">
                    <div className="absolute -inset-1.5 rounded-full bg-cyan-400/30 animate-ping opacity-70 pointer-events-none" />
                    <div className="h-8 w-8 sm:h-11 sm:w-11 rounded-full bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 flex items-center justify-center text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.85)] transform scale-75 group-hover:scale-100 transition-transform duration-300 relative z-10">
                      <Play className="h-4 w-4 sm:h-5 sm:w-5 fill-slate-950 stroke-0 ml-0.5" />
                    </div>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-mono font-black text-cyan-300 tracking-widest uppercase drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">
                    JOIN TABLE
                  </span>
                </div>

                {/* Character Tag */}
                {game.characterTag && (
                  <div className="absolute top-1.5 left-1.5 z-10">
                    <span className="px-1.5 py-0.5 rounded-md bg-black/85 border border-amber-400/40 text-[7.5px] sm:text-[8.5px] font-mono font-bold uppercase text-amber-300 backdrop-blur-md">
                      <span className="truncate max-w-[55px] sm:max-w-none">{game.characterTag}</span>
                    </span>
                  </div>
                )}

                <div className="absolute top-1.5 right-1.5 z-10">
                  <span className="text-[7.5px] sm:text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-black/85 text-slate-300 border border-slate-700/80 backdrop-blur-md uppercase">
                    {game.category}
                  </span>
                </div>

                <div className="absolute bottom-1.5 left-1.5 z-10 h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-black/85 border border-cyan-400/60 shadow-[0_0_12px_rgba(6,182,212,0.3)] backdrop-blur-md flex items-center justify-center text-xs sm:text-sm transition-all">
                  {game.icon}
                </div>

                {/* Bottom-Right Live Player Count Badge */}
                <div className="absolute bottom-1.5 right-1.5 z-10 flex items-center gap-1 bg-black/85 backdrop-blur-md px-1.5 py-0.5 rounded-full border border-emerald-500/40 shadow-sm">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  <span className="text-[7px] sm:text-[8px] font-mono font-bold text-emerald-300 tracking-wider">
                    {65 + ((idx * 31) % 150)} LIVE
                  </span>
                </div>
              </div>

              <div className="p-1.5 sm:p-2.5 md:p-3 relative z-10 flex-1 flex flex-col justify-between">
                <div>
                  <h5 className="font-bold text-[9.5px] xs:text-[11px] sm:text-xs md:text-sm text-slate-100 group-hover:text-cyan-300 transition-colors truncate tracking-tight">
                    {game.name}
                  </h5>
                  <p className="text-[8px] xs:text-[9.5px] sm:text-[10px] text-slate-400 font-mono truncate mt-0.5 hidden xs:block">
                    {game.description}
                  </p>
                </div>

                <div className="mt-1 sm:mt-2 pt-1 sm:pt-2 border-t border-slate-800/80 flex items-center justify-between text-[7.5px] xs:text-[8.5px] sm:text-[9.5px] font-mono">
                  <span className="text-amber-300 font-extrabold">{game.multiplier}</span>
                  <span className="text-cyan-400 font-extrabold text-[7.5px] sm:text-[9px] uppercase tracking-wider flex items-center gap-0.5 sm:gap-1">
                    PLAY <ArrowRight className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
