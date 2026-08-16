import React, { useState, useEffect } from "react";
import { Gift, RefreshCw, Sparkles, CheckCircle, Flame } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../lib/audioService";

interface DailySpinProps {
  onWin: (amount: number, historyMsg: string) => void;
  onCommentaryRequest: (type: "greet" | "win") => void;
}

const SPIN_SECTORS = [
  { amount: 10, color: "bg-slate-900 border-slate-800 text-slate-300" },
  { amount: 25, color: "bg-gradient-to-b from-fuchsia-950 to-purple-950 border-fuchsia-800 text-fuchsia-400" },
  { amount: 50, color: "bg-slate-900 border-slate-800 text-slate-300" },
  { amount: 100, color: "bg-gradient-to-b from-amber-950 to-amber-900 border-amber-800 text-amber-400 font-extrabold" },
  { amount: 15, color: "bg-slate-900 border-slate-800 text-slate-300" },
  { amount: 30, color: "bg-gradient-to-b from-cyan-950 to-teal-950 border-cyan-800 text-cyan-400" },
  { amount: 20, color: "bg-slate-900 border-slate-800 text-slate-300" },
  { amount: 75, color: "bg-gradient-to-b from-emerald-950 to-emerald-900 border-emerald-800 text-emerald-400 font-semibold" },
];

export default function DailySpin({ onWin, onCommentaryRequest }: DailySpinProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [claimableTime, setClaimableTime] = useState<number | null>(null);
  const [resultAmount, setResultAmount] = useState<number | null>(null);

  useEffect(() => {
    const lastSpin = localStorage.getItem("last_daily_spin");
    if (lastSpin) {
      const nextClaim = Number(lastSpin) + 24 * 60 * 60 * 1000; // 24 hour cooldown
      setClaimableTime(nextClaim);
    }
    onCommentaryRequest("greet");
  }, []);

  const triggerSpin = () => {
    if (isSpinning) return;
    if (claimableTime && Date.now() < claimableTime) return;

    setIsSpinning(true);
    setResultAmount(null);

    // Start sweeping sound immediately
    casinoAudio.playWheelSpin(0.45);
    
    // Play repeating ticks that decelerate dynamically in sync with the physics easing over 6 seconds
    const duration = 6000;
    const startTime = Date.now();
    const playTick = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= duration) return;

      casinoAudio.playWheelSpin(0.06);
      
      // Progress from 0 to 1
      const progress = elapsed / duration;
      // Exponentially slow down the tick rate based on rotation easing progress
      const nextDelay = 60 + Math.pow(progress, 3.5) * 1200;
      
      setTimeout(playTick, nextDelay);
    };
    setTimeout(playTick, 60);

    const sectorIdx = Math.floor(Math.random() * SPIN_SECTORS.length);
    const reward = SPIN_SECTORS[sectorIdx];

    const sectorAngle = 360 / SPIN_SECTORS.length;
    const targetAngle = sectorIdx * sectorAngle;

    // Use 10 complete rotations for high velocity and smooth wind down
    const totalSpins = 10;
    const finalRotation = rotation + 360 * totalSpins - targetAngle;

    setRotation(finalRotation);

    setTimeout(() => {
      setIsSpinning(false);
      setResultAmount(reward.amount);
      onWin(reward.amount, `Claimed Daily Reward of $${reward.amount} USDT`);
      
      const now = Date.now();
      localStorage.setItem("last_daily_spin", String(now));
      setClaimableTime(now + 24 * 60 * 60 * 1000); // 24 hour cooldown
      onCommentaryRequest("win");
    }, duration);
  };

  const getCooldownString = () => {
    if (!claimableTime) return "";
    const remaining = Math.max(0, claimableTime - Date.now());
    if (remaining <= 0) return "";
    
    const hours = Math.floor(remaining / (3600 * 1000));
    const minutes = Math.floor((remaining % (3600 * 1000)) / (60 * 1000));
    const seconds = Math.floor((remaining % (60 * 1000)) / 1000);
    
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isLocked = claimableTime ? nowTick < claimableTime : false;

  return (
    <div id="dailyspin-game-container" className="flex flex-col items-center gap-6 p-4 sm:p-6 rounded-3xl border border-slate-900 bg-slate-950/80 backdrop-blur-xl relative overflow-hidden shadow-2xl glow-amber">
      
      {/* Neon banner accent */}
      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 shadow-[0_2px_15px_rgba(245,158,11,0.5)]" />

      <div className="text-center border-b border-white/[0.04] pb-4 w-full">
        <span className="text-[10px] uppercase tracking-widest text-amber-400 font-bold block mb-0.5 font-mono">🎁 FREE BONUS INCENTIVE</span>
        <h3 className="font-mono text-xl font-black text-white flex items-center gap-2 justify-center tracking-tight">
          <Gift className="h-5.5 w-5.5 text-amber-400 animate-bounce" /> Vegas Daily Wheel
        </h3>
      </div>

      {/* Rotating Wheel of Fortune with gold indicators */}
      <div className="scale-90 min-[400px]:scale-100 origin-center flex justify-center items-center py-1">
        <div className="relative h-68 w-68 rounded-full border-8 border-amber-800 bg-slate-900 flex items-center justify-center overflow-hidden shadow-[inset_0_4px_20px_rgba(0,0,0,0.9),0_10px_35px_rgba(0,0,0,0.8)]">
          
          {/* Ticker Pin (Stationary at Top) */}
          <div className="absolute top-0 h-0 w-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-amber-400 z-30 filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.7)]" />

          {/* Rotated sectors wheel */}
          <motion.div
            animate={{ rotate: rotation }}
            transition={{ duration: 6, ease: [0.08, 0.8, 0.15, 1.0] }}
            className="absolute inset-1.5 rounded-full bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center border-2 border-white/[0.04] will-change-transform"
          >
            {SPIN_SECTORS.map((sector, idx) => {
              const rot = (idx * 360) / SPIN_SECTORS.length;
              return (
                <div
                  key={idx}
                  className="absolute inset-0 origin-center flex flex-col items-center justify-start pointer-events-none"
                  style={{ transform: `rotate(${rot}deg)` }}
                >
                  {/* Custom sector layout */}
                  <div className={`h-28 w-14 rounded-t-xl flex flex-col items-center justify-center text-xs font-mono font-black mt-1 ${sector.color} border-t-2 border-white/[0.05] shadow-lg`}>
                    <Sparkles className="h-3 w-3 mb-1.5 opacity-30" />
                    <span className="tracking-tight">${sector.amount}</span>
                  </div>
                </div>
              );
            })}
          </motion.div>

          {/* Center Golden Core */}
          <button
            onClick={triggerSpin}
            disabled={isLocked || isSpinning}
            className={`absolute h-18 w-18 rounded-full border-4 border-amber-500 shadow-[0_4px_20px_rgba(245,158,11,0.5)] flex flex-col items-center justify-center font-mono font-black text-slate-950 select-none z-20 cursor-pointer hover:scale-105 active:scale-90 transition-all ${
              isLocked
                ? "bg-gradient-to-b from-slate-800 to-slate-900 text-slate-500 border-slate-700 cursor-not-allowed shadow-none"
                : isSpinning
                ? "bg-slate-700 text-amber-500 border-slate-600"
                : "bg-gradient-to-b from-amber-300 via-yellow-400 to-amber-500"
            }`}
          >
            {isLocked ? (
              <span className="text-[9px] uppercase font-bold text-slate-500">LOCKED</span>
            ) : isSpinning ? (
              <RefreshCw className="h-5 w-5 animate-spin text-amber-500" />
            ) : (
              <span className="text-xs uppercase tracking-widest font-black">SPIN</span>
            )}
          </button>
        </div>
      </div>

      {/* Timing and Status Panel */}
      <div className="flex flex-col items-center gap-3 w-full bg-slate-950/60 p-5 rounded-2xl border border-white/[0.03] text-center shadow-inner">
        {isLocked ? (
          <div className="space-y-1.5">
            <span className="text-xs font-mono text-slate-500 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
              <Flame className="h-4 w-4 text-amber-500 animate-pulse" /> RE-CHARGE COOLING
            </span>
            <div className="text-2xl font-mono font-black text-amber-400 tracking-tight animate-pulse">{getCooldownString()}</div>
          </div>
        ) : (
          <div className="space-y-1">
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 justify-center font-bold tracking-wider uppercase">
              <CheckCircle className="h-4 w-4 animate-pulse" /> CYLINDER UNLOCKED!
            </span>
            <p className="text-[11px] text-slate-500 font-mono">Press the central trigger core to claim your complimentary bundle.</p>
          </div>
        )}
      </div>

      {/* Claim confirmation animation overlay */}
      <AnimatePresence>
        {resultAmount && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/98 flex flex-col items-center justify-center p-6 text-center z-40 rounded-3xl border border-amber-500/30"
          >
            <div className="max-w-xs flex flex-col items-center">
              <Sparkles className="h-11 w-11 text-amber-400 animate-bounce mb-3" />
              <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 font-bold">DAILY INCENTIVE BUNDLE</span>
              <div className="mt-2 text-2xl font-mono font-black text-amber-400 tracking-tight drop-shadow-[0_0_10px_rgba(245,158,11,0.35)]">
                +${resultAmount} Chips Added!
              </div>
              <p className="text-xs text-slate-500 font-mono mt-3 leading-relaxed">
                Your free high-roller chip stack has been instantly credited to your VIP purse. Best of luck on the casino floors!
              </p>

              <button
                onClick={() => setResultAmount(null)}
                className="mt-7 px-6 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-500 font-mono text-xs font-black tracking-widest text-white rounded-xl cursor-pointer active:scale-95 transition-all shadow-[0_0_10px_rgba(217,70,239,0.3)]"
              >
                DISMISS REWARD
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

