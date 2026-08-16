import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Trophy, Flame, TrendingUp, Zap, Clock, Coins, Star, Award, Heart, CheckCircle } from "lucide-react";
import { casinoAudio } from "../lib/audioService";

interface LiveWinnersFeedProps {
  onAwardChips: (amount: number, description: string) => void;
  currentUser: { name: string; email: string; avatarUrl?: string } | null;
}

interface WinEvent {
  id: string;
  name: string;
  game: string;
  gameIcon: string;
  gameColor: string;
  bet: number;
  multiplier: number;
  payout: number;
  time: string;
  badge: string;
  badgeColor: string;
  isJackpot: boolean;
}

const PLAYER_NAMES = [
  "Roni_Vegas", "JackpotBoss", "Spins_King", "Crash_Master", "Hassan_007",
  "Lucky_Bhai", "PlinkoGamer", "Slot_Guru", "Dhaka_Titan", "Mymensingh_High",
  "Narayanganj_VIP", "Casino_Queen", "Vance_Student", "Sylhet_Star", "Khulna_Elite",
  "AlphaWinner", "Golden_Chip", "Crypto_Spinner", "HighRoll_BD", "Royal_Streak"
];

const GAMES = [
  { name: "Slots Machine", icon: "🍒", color: "text-amber-400", badge: "SUPER BONUS", badgeColor: "bg-amber-500/10 border-amber-500/30 text-amber-400" },
  { name: "Blackjack Table", icon: "🃏", color: "text-fuchsia-400", badge: "VIP HAND", badgeColor: "bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-400" },
  { name: "Roulette Wheel", icon: "🔴", color: "text-emerald-400", badge: "HOT SPEED", badgeColor: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" },
  { name: "Crash Rocket", icon: "🚀", color: "text-rose-400", badge: "500x MOON", badgeColor: "bg-rose-500/10 border-rose-500/30 text-rose-400" },
  { name: "Cyber Mines", icon: "💣", color: "text-teal-400", badge: "MEGA GRID", badgeColor: "bg-teal-500/10 border-teal-500/30 text-teal-400" },
  { name: "Luxury Baccarat", icon: "👑", color: "text-yellow-400", badge: "ZERO TAX", badgeColor: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400" },
  { name: "Neon Plinko", icon: "🔵", color: "text-cyan-400", badge: "EXCLUSIVE", badgeColor: "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" }
];

export default function LiveWinnersFeed({ onAwardChips, currentUser }: LiveWinnersFeedProps) {
  const [wins, setWins] = useState<WinEvent[]>([]);
  const [activeTab, setActiveTab] = useState<"recent" | "jackpots">("recent");
  
  // Daily Chest State
  const [lastClaimTime, setLastClaimTime] = useState<string | null>(() => {
    return localStorage.getItem("vegas_daily_booster_claim");
  });
  const [claimStatus, setClaimStatus] = useState<"idle" | "claiming" | "claimed">("idle");
  const [awardedAmount, setAwardedAmount] = useState<number>(0);
  const [showChestAnimation, setShowChestAnimation] = useState<boolean>(false);

  // Initialize with some default mock wins
  useEffect(() => {
    const initialWins: WinEvent[] = Array.from({ length: 6 }).map((_, i) => {
      const game = GAMES[Math.floor(Math.random() * GAMES.length)];
      const player = PLAYER_NAMES[Math.floor(Math.random() * PLAYER_NAMES.length)];
      const bet = Math.floor(50 + Math.random() * 450);
      const isJackpot = Math.random() < 0.15;
      const multiplier = isJackpot 
        ? parseFloat((50 + Math.random() * 200).toFixed(1))
        : parseFloat((1.5 + Math.random() * 8.5).toFixed(1));
      
      return {
        id: `win-${Date.now()}-${i}`,
        name: player,
        game: game.name,
        gameIcon: game.icon,
        gameColor: game.color,
        bet,
        multiplier,
        payout: parseFloat((bet * multiplier).toFixed(2)),
        time: `${i * 15 + 4}s ago`,
        badge: game.badge,
        badgeColor: game.badgeColor,
        isJackpot
      };
    });
    setWins(initialWins);
  }, []);

  // Set up timer to feed live wins constantly
  useEffect(() => {
    const interval = setInterval(() => {
      const game = GAMES[Math.floor(Math.random() * GAMES.length)];
      const player = PLAYER_NAMES[Math.floor(Math.random() * PLAYER_NAMES.length)];
      const bet = Math.floor(50 + Math.random() * 950);
      const isJackpot = Math.random() < 0.10;
      const multiplier = isJackpot 
        ? parseFloat((75 + Math.random() * 350).toFixed(1))
        : parseFloat((1.2 + Math.random() * 18).toFixed(1));

      const newWin: WinEvent = {
        id: `win-${Date.now()}-${Math.random()}`,
        name: player,
        game: game.name,
        gameIcon: game.icon,
        gameColor: game.color,
        bet,
        multiplier,
        payout: parseFloat((bet * multiplier).toFixed(2)),
        time: "Just now",
        badge: isJackpot ? "🎰 JACKPOT HIT" : game.badge,
        badgeColor: isJackpot 
          ? "bg-amber-500/20 border-amber-400 text-yellow-300 animate-pulse font-extrabold"
          : game.badgeColor,
        isJackpot
      };

      setWins((prevWins) => {
        // Keep last 15 wins, and update older "Just now" to seconds
        const updated = prevWins.map(w => {
          if (w.time === "Just now") return { ...w, time: "4s ago" };
          if (w.time.includes("s ago")) {
            const secs = parseInt(w.time) + 4;
            return { ...w, time: `${secs}s ago` };
          }
          return w;
        });
        return [newWin, ...updated].slice(0, 15);
      });

      // Subtle feedback sound for high jackpot hits in the background (very rare, 5% volume)
      if (isJackpot) {
        casinoAudio.playChipClink();
      }
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Filter wins
  const displayedWins = wins.filter(w => {
    if (activeTab === "jackpots") return w.isJackpot || w.multiplier >= 15;
    return true;
  });

  // Claim Daily Vegas Booster
  const handleClaimBooster = () => {
    if (lastClaimTime) {
      const diff = Date.now() - new Date(lastClaimTime).getTime();
      const hoursLeft = 24 - diff / (1000 * 60 * 60);
      if (hoursLeft > 0) {
        casinoAudio.playClick();
        return;
      }
    }

    casinoAudio.playChipClink();
    setClaimStatus("claiming");
    setShowChestAnimation(true);

    setTimeout(() => {
      // Award premium chip booster of 0.10 USDT (10 cents)
      const rewards = [0.10];
      const winAmt = rewards[Math.floor(Math.random() * rewards.length)];
      
      onAwardChips(winAmt, "🎁 Vegas Golden VIP Daily Booster Chest");
      setAwardedAmount(winAmt);
      setClaimStatus("claimed");
      
      const nowStr = new Date().toISOString();
      localStorage.setItem("vegas_daily_booster_claim", nowStr);
      setLastClaimTime(nowStr);
      
      casinoAudio.playWin();
    }, 1800);
  };

  const getCooldownText = () => {
    if (!lastClaimTime) return "CLAIM UNLOCKED";
    const diff = Date.now() - new Date(lastClaimTime).getTime();
    const msLeft = 24 * 60 * 60 * 1000 - diff;
    if (msLeft <= 0) return "CLAIM UNLOCKED";
    
    const hrs = Math.floor(msLeft / (1000 * 60 * 60));
    const mins = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
    return `NEXT RECLAIM IN: ${hrs}H ${mins}M`;
  };

  const isClaimAvailable = () => {
    if (!lastClaimTime) return true;
    const diff = Date.now() - new Date(lastClaimTime).getTime();
    return diff >= 24 * 60 * 60 * 1000;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full font-mono">
      
      {/* 1. Daily Golden Booster chest panel (Left 5 columns) */}
      <div className="lg:col-span-5 bg-gradient-to-b from-slate-900/90 via-slate-950/80 to-slate-950 border border-amber-500/20 p-5 rounded-3xl relative overflow-hidden flex flex-col justify-between shadow-[0_4px_30px_rgba(245,158,11,0.03)] group">
        
        {/* Subtle decorative glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.08),transparent_70%)] pointer-events-none group-hover:scale-110 transition-transform duration-1000" />
        
        {/* Banner Title */}
        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-yellow-400 text-[9px] font-black tracking-widest uppercase animate-pulse">
              VIP EXCLUSIVE
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-slate-400 font-bold tracking-widest">VEGAS HIGHWAY</span>
          </div>
          <h3 className="text-base font-black tracking-wider text-white uppercase flex items-center gap-2 mt-1">
            🎁 GOLDEN VIP BOOSTER CHEST
          </h3>
          <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
            Crack open Vance's luxury cargo container once a day. Win a guaranteed stake booster instantly.
          </p>
        </div>

        {/* Chest Display Stage */}
        <div className="relative z-10 py-6 flex flex-col items-center justify-center">
          
          <AnimatePresence mode="wait">
            {!showChestAnimation ? (
              <motion.div
                key="chest-closed"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="relative cursor-pointer"
                onClick={() => isClaimAvailable() && handleClaimBooster()}
              >
                {/* Behind Glow Particle rings */}
                <div className="absolute inset-0 bg-yellow-500/10 rounded-full filter blur-2xl animate-pulse scale-125" />
                
                {/* Premium Golden Floating Box */}
                <div className="w-24 h-24 flex items-center justify-center text-6xl hover:scale-110 active:scale-95 transition-transform duration-300 relative select-none">
                  <span className="filter drop-shadow-[0_0_20px_rgba(245,158,11,0.6)] animate-bounce duration-1000">🎁</span>
                  <div className="absolute -top-1 -right-1 bg-rose-600 text-[8px] text-white font-black px-1.5 py-0.5 rounded-full animate-bounce">
                    READY
                  </div>
                </div>
              </motion.div>
            ) : claimStatus === "claiming" ? (
              <motion.div
                key="chest-opening"
                initial={{ scale: 0.9 }}
                animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.15, 1.1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="flex flex-col items-center gap-3 py-4"
              >
                <span className="text-6xl filter drop-shadow-[0_0_30px_rgba(245,158,11,0.8)]">⚡</span>
                <span className="text-[10px] font-bold text-yellow-400 tracking-widest uppercase animate-pulse">
                  CRACKING CONTAINER LOCKS...
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="chest-opened"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-2 text-center"
              >
                {/* Sparkle icons */}
                <div className="relative">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-2xl animate-ping opacity-50">✨</div>
                  <span className="text-6xl filter drop-shadow-[0_0_40px_rgba(245,158,11,0.9)]">🎉</span>
                </div>
                
                <div className="space-y-1">
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-widest block">
                    BOOSTER CRACKED!
                  </span>
                  <span className="text-xl font-black text-amber-300 tracking-wider block">
                    +${awardedAmount.toFixed(2)} CHIPS
                  </span>
                  <span className="text-[9px] text-slate-500 font-sans block">
                    Stake successfully updated in player wallet registry.
                  </span>
                </div>

                <button
                  onClick={() => setShowChestAnimation(false)}
                  className="mt-3 px-4 py-1.5 bg-slate-900 border border-slate-800 text-[9px] font-bold text-slate-400 rounded-lg hover:text-white hover:border-slate-700 transition-all uppercase"
                >
                  Confirm Claim
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action Button & Cooldown */}
        <div className="relative z-10">
          <button
            disabled={!isClaimAvailable() || claimStatus === "claiming"}
            onClick={handleClaimBooster}
            className={`w-full py-3 rounded-2xl font-mono text-xs font-black uppercase tracking-wider transition-all duration-300 border flex items-center justify-center gap-2 cursor-pointer ${
              isClaimAvailable()
                ? "bg-gradient-to-r from-amber-500 to-yellow-600 border-amber-400 text-slate-950 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-98"
                : "bg-slate-950 border-slate-900 text-slate-600 cursor-not-allowed"
            }`}
          >
            <Zap className="h-4 w-4 shrink-0" />
            <span>{isClaimAvailable() ? "CRACK FREE BONUS CHEST" : getCooldownText()}</span>
          </button>
        </div>

      </div>

      {/* 2. Interactive Real-time Winners ledger Feed (Right 7 columns) */}
      <div className="lg:col-span-7 bg-slate-950/80 border border-slate-900 p-5 rounded-3xl flex flex-col gap-4 relative overflow-hidden shadow-inner">
        
        {/* Absolute Background Hex Grid or details */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1.5px,transparent_1.5px),linear-gradient(90deg,rgba(255,255,255,0.01)_1.5px,transparent_1.5px)] bg-[size:16px_16px] pointer-events-none" />

        {/* Header Controls */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.04] pb-3.5">
          <div className="flex items-center gap-2.5">
            <Trophy className="h-4.5 w-4.5 text-yellow-500 shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-black text-white uppercase tracking-wider leading-none">
                LIVE FLOOR PAYOUTS STREAM
              </span>
              <span className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">
                Real-time player bet stream verification
              </span>
            </div>
          </div>

          {/* Toggle Tabs */}
          <div className="flex bg-slate-900/60 border border-slate-800 p-1 rounded-xl shrink-0">
            <button
              onClick={() => { casinoAudio.playClick(); setActiveTab("recent"); }}
              className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase transition-all tracking-wider cursor-pointer ${
                activeTab === "recent"
                  ? "bg-amber-500/20 text-yellow-400 border border-amber-400/20"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              All Payouts
            </button>
            <button
              onClick={() => { casinoAudio.playClick(); setActiveTab("jackpots"); }}
              className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase transition-all tracking-wider cursor-pointer flex items-center gap-1 ${
                activeTab === "jackpots"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/20"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Flame className="h-3 w-3 animate-pulse text-rose-500" /> Huge Hits
            </button>
          </div>
        </div>

        {/* Winning Cards Viewport Container */}
        <div className="relative z-10 max-h-[250px] overflow-y-auto space-y-2.5 pr-1.5 scrollbar-thin">
          <AnimatePresence initial={false}>
            {displayedWins.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center text-slate-600 gap-2">
                <Clock className="h-8 w-8 text-slate-800 animate-spin duration-3000" />
                <p className="text-[10px] uppercase font-bold tracking-widest">Waiting for incoming high payouts...</p>
              </div>
            ) : (
              displayedWins.map((win) => (
                <motion.div
                  key={win.id}
                  initial={{ opacity: 0, x: -20, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: "auto" }}
                  exit={{ opacity: 0, scale: 0.9, height: 0 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-3 relative overflow-hidden transition-all group/win ${
                    win.isJackpot 
                      ? "bg-amber-500/[0.04] border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.06)] hover:border-amber-400" 
                      : "bg-slate-900/40 border-slate-900 hover:border-white/[0.06] hover:bg-slate-900/60"
                  }`}
                >
                  {/* Payout Information Grid */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-slate-950 border border-white/[0.04] flex items-center justify-center text-xl shrink-0 group-hover/win:scale-105 transition-transform duration-300">
                      {win.gameIcon}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black text-white hover:text-amber-300 transition-colors cursor-pointer">
                          {win.name}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[7px] font-extrabold uppercase border tracking-wider ${win.badgeColor}`}>
                          {win.badge}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-400">
                        <span>Wagered ${win.bet}</span>
                        <span className="text-slate-600">•</span>
                        <span className={win.gameColor}>{win.game}</span>
                      </div>
                    </div>
                  </div>

                  {/* Multiplier and Total Win Amount */}
                  <div className="flex flex-col items-end shrink-0 pl-1.5">
                    <span className={`text-[12px] font-bold font-mono tracking-wide ${
                      win.multiplier >= 15 ? "text-amber-400" : "text-emerald-400"
                    }`}>
                      +{win.multiplier}x
                    </span>
                    <span className="text-[11px] font-black text-white tracking-wider mt-0.5">
                      ${win.payout.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-[7px] text-slate-500 mt-0.5 font-sans flex items-center gap-1 uppercase font-bold">
                      <Clock className="h-2 w-2" /> {win.time}
                    </span>
                  </div>

                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

      </div>

    </div>
  );
}
