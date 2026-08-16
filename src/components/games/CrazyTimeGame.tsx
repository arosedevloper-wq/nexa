import React, { useState, useEffect } from "react";
import { Sparkles, Zap, Coins, Trophy, RotateCcw, Flame, Play, Crown, Dices, Gift } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../../lib/audioService";
import { evaluateLiveGameRound } from "../../constants/liveGameConfig";

interface CrazyTimeGameProps {
  chips: number;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest?: (type: "greet" | "win" | "lose") => void;
  rtpBias?: string;
}

interface SegmentDef {
  label: string;
  type: "number" | "bonus";
  color: string;
  payoutMultiplier: number;
}

const SEGMENTS: SegmentDef[] = [
  { label: "1", type: "number", color: "#38bdf8", payoutMultiplier: 1 },
  { label: "2", type: "number", color: "#f43f5e", payoutMultiplier: 2 },
  { label: "1", type: "number", color: "#38bdf8", payoutMultiplier: 1 },
  { label: "5", type: "number", color: "#eab308", payoutMultiplier: 5 },
  { label: "2", type: "number", color: "#f43f5e", payoutMultiplier: 2 },
  { label: "10", type: "number", color: "#a855f7", payoutMultiplier: 10 },
  { label: "COIN FLIP", type: "bonus", color: "#10b981", payoutMultiplier: 15 },
  { label: "1", type: "number", color: "#38bdf8", payoutMultiplier: 1 },
  { label: "2", type: "number", color: "#f43f5e", payoutMultiplier: 2 },
  { label: "CASH HUNT", type: "bonus", color: "#ec4899", payoutMultiplier: 25 },
  { label: "1", type: "number", color: "#38bdf8", payoutMultiplier: 1 },
  { label: "PACHINKO", type: "bonus", color: "#6366f1", payoutMultiplier: 50 },
  { label: "2", type: "number", color: "#f43f5e", payoutMultiplier: 2 },
  { label: "CRAZY TIME", type: "bonus", color: "#f97316", payoutMultiplier: 100 },
];

export const CrazyTimeGame: React.FC<CrazyTimeGameProps> = ({
  chips,
  onWin,
  onLose,
  onCommentaryRequest,
  rtpBias,
}) => {
  const [selectedBetSpot, setSelectedBetSpot] = useState<string>("CRAZY TIME");
  const [betAmount, setBetAmount] = useState<number>(50);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [wheelRotation, setWheelRotation] = useState<number>(0);
  const [topSlotResult, setTopSlotResult] = useState<{ spot: string; mult: number } | null>(null);
  const [winningSegment, setWinningSegment] = useState<SegmentDef | null>(null);
  const [lastWinAmount, setLastWinAmount] = useState<number | null>(null);
  const [bonusMiniGame, setBonusMiniGame] = useState<string | null>(null);

  const betSpots = ["1", "2", "5", "10", "COIN FLIP", "CASH HUNT", "PACHINKO", "CRAZY TIME"];
  const quickBets = [10, 25, 50, 100, 250, 500];

  const spinGameShow = async () => {
    if (isSpinning) return;
    if (chips < betAmount) {
      casinoAudio.playLose();
      return;
    }

    casinoAudio.playChipClink();
    onLose(betAmount, `Crazy Time Bet on [${selectedBetSpot}] ($${betAmount})`);

    setIsSpinning(true);
    setWinningSegment(null);
    setLastWinAmount(null);
    setBonusMiniGame(null);

    // 1. Top Slot Reel Spin Animation
    casinoAudio.playWheelSpin(0.05);
    const topSlotSpot = betSpots[Math.floor(Math.random() * betSpots.length)];
    const topSlotMults = [2, 3, 5, 7, 10, 15, 25, 50];
    const topSlotMult = topSlotMults[Math.floor(Math.random() * topSlotMults.length)];
    setTopSlotResult({ spot: topSlotSpot, mult: topSlotMult });

    await new Promise((r) => setTimeout(r, 1200));

    // 2. Wheel Spin Animation
    casinoAudio.playWheelSpin(0.08);
    const isWinAllowed = evaluateLiveGameRound(undefined, rtpBias);
    let chosenIndex: number;
    if (!isWinAllowed) {
      // Pick a losing segment relative to selectedBetSpot
      const losingIndices = SEGMENTS.map((s, idx) => ({ s, idx })).filter((item) => item.s.label !== selectedBetSpot);
      if (losingIndices.length > 0) {
        chosenIndex = losingIndices[Math.floor(Math.random() * losingIndices.length)].idx;
      } else {
        chosenIndex = Math.floor(Math.random() * SEGMENTS.length);
      }
    } else {
      chosenIndex = Math.floor(Math.random() * SEGMENTS.length);
    }
    const segment = SEGMENTS[chosenIndex];

    const segmentAngle = 360 / SEGMENTS.length;
    const extraSpins = 360 * 6;
    const targetAngle = wheelRotation + extraSpins + (360 - chosenIndex * segmentAngle);

    setWheelRotation(targetAngle);

    await new Promise((r) => setTimeout(r, 3800));

    setWinningSegment(segment);
    setIsSpinning(false);

    // Evaluate Top Slot Bonus Multiplier Match
    let extraMult = 1;
    if (topSlotResult && topSlotResult.spot === segment.label) {
      extraMult = topSlotResult.mult;
    }

    // Check if player won on their bet spot
    if (selectedBetSpot === segment.label) {
      if (segment.type === "bonus") {
        setBonusMiniGame(segment.label);
      }

      const totalMult = segment.payoutMultiplier * extraMult;
      const winPayout = Math.floor(betAmount * (totalMult + 1)); // win payout

      casinoAudio.playJackpot();
      setLastWinAmount(winPayout);
      onWin(
        winPayout,
        `Crazy Time Hit [${segment.label}] ${extraMult > 1 ? `Top Slot ${extraMult}x Match!` : ""} -> $${winPayout}`
      );
    } else {
      casinoAudio.playLose();
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-slate-950 border border-orange-500/30 rounded-2xl p-4 sm:p-6 text-white shadow-2xl relative overflow-hidden backdrop-blur-xl">
      {/* Background Atmosphere */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-gradient-to-b from-orange-500/15 via-red-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800/80 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Flame className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-wide bg-gradient-to-r from-orange-300 via-amber-200 to-red-400 bg-clip-text text-transparent">
                CRAZY TIME
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-orange-500/20 border border-orange-500/40 text-orange-300 rounded-full uppercase tracking-wider">
                LIVE GAME SHOW & TOP SLOT
              </span>
            </div>
            <p className="text-xs text-slate-400">Top Slot Multipliers up to 50x + 4 Interactive Bonus Rounds!</p>
          </div>
        </div>

        {/* Balance Display */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-orange-500/30 px-4 py-2 rounded-xl shadow-inner">
          <Coins className="w-5 h-5 text-amber-400" />
          <span className="text-xs text-slate-400 font-medium">Balance:</span>
          <span className="text-base font-bold text-amber-300">${chips.toLocaleString()}</span>
        </div>
      </div>

      {/* Top Slot Reel & Wheel Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
        {/* Top Slot Multiplier Box */}
        <div className="md:col-span-4 bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col items-center justify-center text-center">
          <span className="text-[10px] font-extrabold text-orange-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5" /> TOP SLOT MULTIPLIER REEL
          </span>

          <div className="flex items-center justify-center gap-3 bg-slate-950 border-2 border-orange-500/40 p-3 rounded-xl w-full">
            <span className="text-lg font-black text-amber-300">
              {topSlotResult ? topSlotResult.spot : "SPINNING"}
            </span>
            <span className="text-sm font-bold text-slate-500">x</span>
            <span className="text-lg font-black text-orange-400">
              {topSlotResult ? `${topSlotResult.mult}x` : "?"}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            Top Slot multipliers apply if the wheel lands on the matching segment!
          </p>
        </div>

        {/* 3D Wheel Display */}
        <div className="md:col-span-8 bg-slate-900/60 border border-slate-800/80 p-6 rounded-xl flex flex-col items-center justify-center relative">
          <div className="w-52 h-52 sm:w-60 sm:h-60 rounded-full border-4 border-orange-500/60 shadow-2xl relative flex items-center justify-center overflow-hidden bg-slate-950">
            <motion.div
              animate={{ rotate: wheelRotation }}
              transition={{ duration: 3.8, ease: "easeOut" }}
              className="w-full h-full rounded-full flex items-center justify-center relative"
            >
              {SEGMENTS.map((seg, idx) => {
                const angle = (360 / SEGMENTS.length) * idx;
                return (
                  <div
                    key={idx}
                    style={{
                      transform: `rotate(${angle}deg) translateY(-90px)`,
                      backgroundColor: seg.color,
                    }}
                    className="absolute text-[8px] font-black text-slate-950 px-1.5 py-0.5 rounded shadow-sm uppercase whitespace-nowrap"
                  >
                    {seg.label}
                  </div>
                );
              })}
            </motion.div>

            {/* Center Pin */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-amber-600 border-2 border-slate-900 z-10 flex items-center justify-center shadow-lg">
              <Crown className="w-6 h-6 text-slate-950" />
            </div>
          </div>

          {winningSegment && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-3 flex items-center gap-3 bg-orange-950/90 border border-orange-500/50 px-4 py-1.5 rounded-xl text-xs font-black"
            >
              <span>WHEEL LANDED:</span>
              <span className="text-amber-300 text-sm font-extrabold uppercase">{winningSegment.label}</span>
              {lastWinAmount !== null && (
                <span className="text-emerald-400 font-extrabold">Win: +${lastWinAmount.toLocaleString()}!</span>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Betting Spots Grid */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl mb-6">
        <label className="text-xs font-bold text-slate-300 mb-3 block">CHOOSE YOUR BETTING SPOT:</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {betSpots.map((spot) => {
            const isSelected = selectedBetSpot === spot;
            const isBonus = ["COIN FLIP", "CASH HUNT", "PACHINKO", "CRAZY TIME"].includes(spot);

            return (
              <button
                key={spot}
                onClick={() => setSelectedBetSpot(spot)}
                className={`py-3.5 rounded-xl font-black text-xs border transition-all flex flex-col items-center justify-center ${
                  isSelected
                    ? "bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 border-orange-300 shadow-lg shadow-orange-500/30 scale-102"
                    : isBonus
                    ? "bg-purple-950/60 border-purple-500/40 text-purple-300 hover:border-purple-400"
                    : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                }`}
              >
                <span>{spot}</span>
                {isBonus && <span className="text-[9px] font-bold text-amber-300 mt-0.5">BONUS ROUND</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bet Amount & Spin Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">BET:</span>
          <input
            type="number"
            disabled={isSpinning}
            value={betAmount}
            onChange={(e) => setBetAmount(Math.max(0.10, Math.min(5000, Number(e.target.value))))}
            className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-amber-300 font-bold text-sm outline-none"
          />
          {quickBets.map((val) => (
            <button
              key={val}
              onClick={() => setBetAmount(val)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border ${
                betAmount === val ? "bg-orange-500/20 border-orange-500 text-orange-300" : "bg-slate-950 border-slate-800 text-slate-400"
              }`}
            >
              ${val}
            </button>
          ))}
        </div>

        <button
          disabled={isSpinning}
          onClick={spinGameShow}
          className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-black text-sm transition-all shadow-xl flex items-center justify-center gap-2 ${
            isSpinning
              ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
              : "bg-gradient-to-r from-orange-400 via-amber-300 to-red-400 text-slate-950 shadow-orange-500/30 hover:from-orange-300 hover:to-amber-200 cursor-pointer"
          }`}
        >
          <Play className="w-5 h-5 fill-slate-950" />
          {isSpinning ? "SPINNING CRAZY TIME..." : `SPIN CRAZY TIME ($${betAmount})`}
        </button>
      </div>
    </div>
  );
};

export default CrazyTimeGame;
