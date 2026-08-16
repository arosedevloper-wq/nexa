import React, { useState, useEffect, useRef } from "react";
import { Coins, Play, RefreshCw, Trophy, AlertTriangle, Sparkles } from "lucide-react";
import { SlotsSymbol } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../lib/audioService";
import { evaluateLiveGameRound, getUserWinRatio } from "../constants/liveGameConfig";
import { playServerAuthoritativeGame } from "../lib/serverGameClient";

interface SlotsGameProps {
  chips: number;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest: (type: "spin" | "win" | "lose") => void;
  rtpBias?: "standard" | "loose" | "tight" | "rigged" | "custom";
  forcedOutcome?: "none" | "jackpot" | "lose";
  onClearForcedOutcome?: () => void;
}

const SLOT_SYMBOLS: SlotsSymbol[] = [
  { icon: "🍒", label: "Cherry", multiplier: 3, color: "text-rose-400 font-bold" },
  { icon: "🍋", label: "Lemon", multiplier: 5, color: "text-amber-300 font-bold" },
  { icon: "🍊", label: "Orange", multiplier: 8, color: "text-orange-400 font-bold" },
  { icon: "🍇", label: "Grape", multiplier: 12, color: "text-purple-400 font-bold" },
  { icon: "🔔", label: "Bell", multiplier: 20, color: "text-yellow-400 font-bold" },
  { icon: "💎", label: "Diamond", multiplier: 50, color: "text-cyan-300 animate-pulse font-extrabold" },
  { icon: "7️⃣", label: "Lucky Seven", multiplier: 150, color: "text-rose-500 font-black animate-bounce" },
];

export default function SlotsGame({ chips, onWin, onLose, onCommentaryRequest, rtpBias, forcedOutcome, onClearForcedOutcome }: SlotsGameProps) {
  const [bet, setBet] = useState(10);
  const [reels, setReels] = useState<SlotsSymbol[]>([SLOT_SYMBOLS[0], SLOT_SYMBOLS[0], SLOT_SYMBOLS[0]]);
  const [spinning, setSpinning] = useState(false);
  const [spinResults, setSpinResults] = useState<{ win: boolean; payout: number; multiplier: number; matchType: string } | null>(null);
  const [stats, setStats] = useState({ totalSpins: 0, biggestWin: 0 });

  const spinIntervalRefs = useRef<Array<NodeJS.Timeout | null>>([null, null, null]);

  // Clean intervals on unmount
  useEffect(() => {
    return () => {
      spinIntervalRefs.current.forEach((ref) => {
        if (ref) clearInterval(ref);
      });
    };
  }, []);

  const handleSpin = () => {
    if (spinning) return;
    if (chips < bet) {
      onCommentaryRequest("lose");
      return;
    }

    setSpinning(true);
    setSpinResults(null);
    onCommentaryRequest("spin");

    // Deduct the bet immediately
    onLose(bet, `Placed $${bet} Slots Bet`);

    // Trigger Server-Authoritative Game Turn
    playServerAuthoritativeGame("slots", bet, { forcedOutcome }, "player@nexaspin.com");

    // Determine target symbols ahead of time based on admin overrides
    let predeterminedSymbols: SlotsSymbol[] = [];
    if (forcedOutcome === "jackpot") {
      const jackSymbol = SLOT_SYMBOLS.find(s => s.label === "Lucky Seven") || SLOT_SYMBOLS[6];
      predeterminedSymbols = [jackSymbol, jackSymbol, jackSymbol];
      if (onClearForcedOutcome) onClearForcedOutcome();
    } else if (forcedOutcome === "lose") {
      predeterminedSymbols = [SLOT_SYMBOLS[0], SLOT_SYMBOLS[2], SLOT_SYMBOLS[4]];
      if (onClearForcedOutcome) onClearForcedOutcome();
    } else {
      // Standard gameplay: calculate win probability based on system_config house win-rate logic (5% house edge default)
      const cachedConfig = localStorage.getItem("casino_system_config_v1");
      let winRate = getUserWinRatio(); // Default 5% user win ratio (95% house lose ratio)
      if (cachedConfig) {
        try {
          const cfg = JSON.parse(cachedConfig);
          if (rtpBias === "loose") winRate = 0.05;
          else if (rtpBias === "tight") winRate = 0.02;
          else if (rtpBias === "rigged") winRate = 0.01;
          else if (rtpBias === "custom" && cfg.customWinRatio !== undefined) winRate = cfg.customWinRatio / 100;
          else if (cfg.houseWinRate !== undefined) winRate = 1 - cfg.houseWinRate;
        } catch (e) {}
      } else {
        const customRatio = Number(localStorage.getItem("casino_custom_win_ratio"));
        if (customRatio) winRate = customRatio / 100;
      }

      const isWin = evaluateLiveGameRound();
      if (isWin) {
        // Player wins: double or triple, excluding Lucky Seven triple (Jackpot)
        const nonJackpotSymbols = SLOT_SYMBOLS.slice(0, 6); // Cherry, Lemon, Orange, Grape, Bell, Diamond
        const winType = Math.random() < 0.25 ? "triple" : "double";
        if (winType === "triple") {
          const matchSym = nonJackpotSymbols[Math.floor(Math.random() * nonJackpotSymbols.length)];
          predeterminedSymbols = [matchSym, matchSym, matchSym];
        } else {
          const matchSym = nonJackpotSymbols[Math.floor(Math.random() * nonJackpotSymbols.length)];
          let thirdSym = nonJackpotSymbols[Math.floor(Math.random() * nonJackpotSymbols.length)];
          while (thirdSym.label === matchSym.label) {
            thirdSym = nonJackpotSymbols[Math.floor(Math.random() * nonJackpotSymbols.length)];
          }
          predeterminedSymbols = [matchSym, matchSym, thirdSym];
        }
      } else {
        // Player loses: 3 distinct symbols, and NO Cherries (to avoid single-cherry scatter wins)
        const losingSymbols = SLOT_SYMBOLS.slice(1); // Lemon, Orange, Grape, Bell, Diamond, Lucky Seven
        const shuffled = [...losingSymbols].sort(() => Math.random() - 0.5);
        predeterminedSymbols = [shuffled[0], shuffled[1], shuffled[2]];
      }
    }

    // Fill in rest if empty
    for (let i = 0; i < 3; i++) {
      if (!predeterminedSymbols[i]) {
        predeterminedSymbols[i] = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
      }
    }

    const finalSymbols: SlotsSymbol[] = [];

    // Spin speed intervals
    const spinDurations = [1200, 1800, 2400]; // Staggered stops

    spinDurations.forEach((duration, reelIndex) => {
      // Rapid shuffle
      spinIntervalRefs.current[reelIndex] = setInterval(() => {
        if (reelIndex === 0) {
          casinoAudio.playWheelSpin(0.06);
        }
        setReels((prev) => {
          const next = [...prev];
          next[reelIndex] = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
          return next;
        });
      }, 80 + reelIndex * 25);

      // Stop scheduling
      setTimeout(() => {
        if (spinIntervalRefs.current[reelIndex]) {
          clearInterval(spinIntervalRefs.current[reelIndex]!);
          spinIntervalRefs.current[reelIndex] = null;
        }

        // Play mechanical reel stop sound when each individual reel stops
        casinoAudio.playReelStop();

        // Final calculated pick
        const rolledSymbol = predeterminedSymbols[reelIndex];
        finalSymbols[reelIndex] = rolledSymbol;

        setReels((prev) => {
          const next = [...prev];
          next[reelIndex] = rolledSymbol;
          return next;
        });

        // If the last reel stops, evaluate results
        if (reelIndex === 2) {
          evaluateResults(finalSymbols);
        }
      }, duration);
    });
  };

  const evaluateResults = (rolledReels: SlotsSymbol[]) => {
    const [r1, r2, r3] = rolledReels;
    let win = false;
    let multiplier = 0;
    let payout = 0;
    let matchType = "";

    if (r1.label === r2.label && r2.label === r3.label) {
      // 3 of a kind
      win = true;
      multiplier = r1.multiplier;
      payout = bet * multiplier;
      matchType = `Triple ${r1.label}! (${multiplier}x)`;
    } else if (r1.label === r2.label || r2.label === r3.label || r1.label === r3.label) {
      // 2 of a kind
      win = true;
      const matchSymbol = r1.label === r2.label ? r1 : r3;
      multiplier = Math.ceil(matchSymbol.multiplier * 0.4); // 40% of standard triple payout
      payout = bet * multiplier;
      matchType = `Double ${matchSymbol.label}! (${multiplier}x)`;
    } else {
      // Check scatter or close call
      const cherryCount = rolledReels.filter(r => r.label === "Cherry").length;
      if (cherryCount > 0) {
        win = true;
        multiplier = cherryCount === 1 ? 1 : 2;
        payout = bet * multiplier;
        matchType = `${cherryCount}x Cherry Scatter!`;
      }
    }

    setTimeout(() => {
      setSpinning(false);
      setStats((prev) => ({
        totalSpins: prev.totalSpins + 1,
        biggestWin: payout > prev.biggestWin ? payout : prev.biggestWin,
      }));

      if (win) {
        if (multiplier >= 5) {
          casinoAudio.playMegaWin();
        } else {
          casinoAudio.playWin();
        }
        onWin(payout, `Won $${payout} on Slots (${matchType})`);
        setSpinResults({ win: true, payout, multiplier, matchType });
        onCommentaryRequest("win");
      } else {
        casinoAudio.playLose();
        setSpinResults({ win: false, payout: 0, multiplier: 0, matchType: "No matches. Better luck next spin!" });
        onCommentaryRequest("lose");
      }
    }, 200);
  };

  return (
    <div id="slots-game-container" className="flex flex-col gap-6 p-4 sm:p-6 rounded-3xl border border-slate-900 bg-slate-950/80 backdrop-blur-xl relative overflow-hidden shadow-2xl glow-gold">
      
      {/* Decorative premium hardware lighting frame */}
      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 shadow-[0_2px_15px_rgba(245,158,11,0.5)]" />
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/[0.04] pb-4">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-amber-400 font-bold block mb-0.5 font-mono">👑 HIGH ROLLER MACHINE</span>
          <h3 className="font-mono text-xl font-black text-white flex items-center gap-2 tracking-tight">
            <Coins className="h-5.5 w-5.5 text-amber-400 animate-pulse" /> Cosmic Reel Slots
          </h3>
        </div>
        <div className="flex items-center gap-4 bg-slate-950/60 border border-white/[0.03] rounded-2xl px-4 py-2 font-mono text-xs w-full sm:w-auto justify-between sm:justify-start">
          <div className="text-slate-500">
            Spins: <span className="text-slate-300 font-bold">{stats.totalSpins}</span>
          </div>
          <div className="h-4 w-px bg-white/[0.06]" />
          <div className="text-amber-400 font-bold flex items-center gap-1">
            <Trophy className="h-3.5 w-3.5" /> Best Win: ${stats.biggestWin}
          </div>
        </div>
      </div>

      {/* Main Reels Display Cabinet */}
      <div className="relative py-6 sm:py-8 px-4 sm:px-6 bg-slate-950 border border-white/[0.03] rounded-3xl shadow-[inset_0_4px_30px_rgba(0,0,0,0.9)] max-w-lg mx-auto w-full">
        {/* Neon Light Bars flanking the slot reels */}
        <div className="absolute left-2 top-4 bottom-4 w-1 bg-gradient-to-b from-rose-500 via-amber-500 to-rose-500 rounded-full opacity-60 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
        <div className="absolute right-2 top-4 bottom-4 w-1 bg-gradient-to-b from-rose-500 via-amber-500 to-rose-500 rounded-full opacity-60 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />

        {/* Las Vegas Style Payline Highlight Banner */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-20 border-y-2 border-dashed border-amber-500/25 bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 pointer-events-none z-10 flex items-center justify-between px-3">
          <span className="text-[9px] font-bold text-amber-500/40 font-mono tracking-widest">PAYLINE</span>
          <span className="text-[9px] font-bold text-amber-500/40 font-mono tracking-widest">PAYLINE</span>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4.5 relative z-20">
          {reels.map((symbol, idx) => (
            <div
              key={idx}
              className={`relative flex flex-col justify-center items-center h-28 sm:h-36 rounded-2xl bg-gradient-to-b from-slate-900/90 via-slate-950/98 to-slate-900/90 border-2 transition-all duration-300 overflow-hidden shadow-inner ${
                spinning ? "border-amber-500/30 scale-[0.98]" : "border-white/[0.04]"
              }`}
            >
              {/* Internal shadow shading for a curved glass depth effect */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80 pointer-events-none z-10" />
              <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none z-10" />

              {/* Symbol container with high-end staggered keyframe transitions */}
              <motion.div
                animate={spinning ? { y: [0, -120, 120, 0], scale: [1, 0.85, 0.85, 1] } : { scale: 1 }}
                transition={spinning ? { repeat: Infinity, duration: 0.14 } : { type: "spring", stiffness: 180, damping: 15 }}
                className="flex flex-col items-center select-none z-20"
              >
                <span className="text-4xl sm:text-5.5xl filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.7)] transform hover:scale-110 transition-transform duration-200">
                  {symbol.icon}
                </span>
                <span className={`text-[8px] sm:text-[9px] font-mono tracking-widest font-black uppercase mt-1.5 sm:mt-3 px-1 sm:px-1.5 py-0.5 rounded-md bg-white/[0.02] border border-white/[0.03] ${symbol.color} max-w-full truncate`}>
                  {symbol.label}
                </span>
              </motion.div>

              {/* Status active ring */}
              <div className={`absolute top-2 right-2 h-1.5 w-1.5 rounded-full ${spinning ? "bg-amber-400 animate-ping" : "bg-emerald-500"}`} />
            </div>
          ))}
        </div>
      </div>

      {/* Bet Configuration & Dynamic Control Desk */}
      <div className="flex flex-col md:flex-row gap-5 items-center justify-between bg-slate-950/60 p-5 rounded-2xl border border-white/[0.03] shadow-inner">
        {/* Betting panel */}
        <div className="flex flex-col gap-2 w-full md:w-auto">
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-400" /> SELECT WAGER AMOUNT
          </span>
          <div className="flex flex-wrap gap-1.5">
            {[10, 25, 50, 100, 500].map((betValue) => (
              <button
                key={betValue}
                onClick={() => {
                  casinoAudio.playChipClink();
                  setBet(betValue);
                }}
                disabled={spinning}
                className={`px-4 py-2 font-mono text-xs rounded-xl border transition-all duration-250 cursor-pointer active:scale-95 ${
                  bet === betValue
                    ? "bg-amber-400 border-amber-300 text-slate-950 font-extrabold shadow-[0_0_15px_rgba(245,158,11,0.35)]"
                    : "bg-slate-900/90 border-white/[0.03] text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                ${betValue}
              </button>
            ))}
          </div>
        </div>

        {/* Spin action controls */}
        <div className="w-full md:w-auto flex items-center gap-4 justify-end">
          <div className="text-right font-mono hidden sm:block shrink-0">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block mb-0.5">COST PER SPIN</span>
            <span className="text-base font-black text-white">${bet} Chips</span>
          </div>

          <button
            id="btn-spin-reels"
            onClick={handleSpin}
            disabled={spinning || chips < bet}
            className={`w-full md:w-48 py-3.5 px-6 rounded-2xl text-sm font-mono font-black tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 ${
              spinning
                ? "bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed"
                : chips < bet
                ? "bg-rose-950/40 text-rose-500 border border-rose-500/30 font-bold"
                : "bg-gradient-to-r from-amber-400 via-rose-500 to-indigo-500 text-white hover:shadow-[0_0_25px_rgba(245,158,11,0.4)]"
            }`}
          >
            {spinning ? (
              <>
                <RefreshCw className="h-4.5 w-4.5 animate-spin" /> SPINNING...
              </>
            ) : chips < bet ? (
              <>
                <AlertTriangle className="h-4.5 w-4.5" /> RE-CHARGE WALLET
              </>
            ) : (
              <>
                <Play className="h-4.5 w-4.5 fill-current" /> SPIN REELS
              </>
            )}
          </button>
        </div>
      </div>

      {/* Pay Table Board with hover highlight */}
      <div className="border-t border-white/[0.03] pt-5 mt-1">
        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-extrabold block mb-3 text-center">
          ROYAL SLOTS PAYTABLE (3X SYMBOLS MATCHED)
        </span>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5">
          {SLOT_SYMBOLS.map((s, idx) => (
            <div 
              key={idx} 
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-950/50 border border-white/[0.02] hover:border-amber-500/20 hover:bg-slate-900/40 transition-all duration-300"
            >
              <span className="text-3xl select-none filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">{s.icon}</span>
              <span className="text-xs font-mono font-black text-slate-100 mt-2">{s.multiplier}x</span>
              <span className="text-[8px] font-mono text-slate-500 tracking-wider font-semibold mt-0.5 uppercase">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Results overlay notice banner */}
      <AnimatePresence>
        {spinResults && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`p-5 rounded-2xl border text-center font-mono shadow-2xl relative ${
              spinResults.win
                ? "bg-emerald-950/50 border-emerald-500/30 text-emerald-300 glow-emerald"
                : "bg-slate-950/80 border-slate-900 text-slate-400"
            }`}
          >
            {spinResults.win ? (
              <div className="flex flex-col items-center gap-1.5 relative z-10">
                <div className="h-10 w-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-1 animate-bounce">
                  <Trophy className="h-5.5 w-5.5 text-amber-400" />
                </div>
                <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold">{spinResults.matchType}</span>
                <span className="text-xl font-black text-white bg-gradient-to-r from-emerald-400 to-indigo-300 bg-clip-text text-transparent">
                  +${spinResults.payout} CHIPS CREDITED
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs tracking-wide text-slate-400">{spinResults.matchType}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

