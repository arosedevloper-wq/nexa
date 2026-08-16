import React, { useState, useEffect } from "react";
import { Coins, Play, RotateCcw, Sparkles, Trophy, Circle, Dices } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../../lib/audioService";
import { evaluateLiveGameRound } from "../../constants/liveGameConfig";

interface EuropeanRouletteGameProps {
  chips: number;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest?: (type: "greet" | "win" | "lose") => void;
  rtpBias?: string;
}

// European Wheel Order (37 pockets)
const WHEEL_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36
]);

interface BetSpot {
  id: string;
  label: string;
  payoutMultiplier: number; // 35 for single number, 2 for Red/Black etc.
  type: "number" | "outside" | "dozen" | "column" | "racetrack";
  value?: number;
}

export const EuropeanRouletteGame: React.FC<EuropeanRouletteGameProps> = ({
  chips,
  onWin,
  onLose,
  onCommentaryRequest,
  rtpBias,
}) => {
  const [selectedChip, setSelectedChip] = useState<number>(10);
  const [bets, setBets] = useState<{ [spotId: string]: number }>({});
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [winningNumber, setWinningNumber] = useState<number | null>(null);
  const [wheelRotation, setWheelRotation] = useState<number>(0);
  const [history, setHistory] = useState<number[]>([]);
  const [lastWinAmount, setLastWinAmount] = useState<number | null>(null);

  const chipValues = [5, 10, 25, 100, 500];

  const totalBetAmount = (Object.values(bets) as number[]).reduce((a: number, b: number) => a + b, 0);

  const placeBet = (spotId: string) => {
    if (isSpinning) return;
    if (chips < totalBetAmount + selectedChip) {
      casinoAudio.playLose();
      return;
    }
    casinoAudio.playChipClink();
    setBets((prev) => ({
      ...prev,
      [spotId]: (prev[spotId] || 0) + selectedChip,
    }));
  };

  const clearBets = () => {
    if (isSpinning) return;
    setBets({});
  };

  const spin = async () => {
    if (isSpinning || totalBetAmount === 0) return;

    if (chips < totalBetAmount) {
      casinoAudio.playLose();
      return;
    }

    casinoAudio.playChipClink();
    onLose(totalBetAmount, `European Roulette Bet ($${totalBetAmount})`);

    setIsSpinning(true);
    setWinningNumber(null);
    setLastWinAmount(null);

    casinoAudio.playWheelSpin(0.1);

    // Pick winning pocket
    const isWinAllowed = evaluateLiveGameRound(undefined, rtpBias);
    let winIdx: number;
    if (!isWinAllowed) {
      // Find pocket index with 0 payout
      const zeroPayoutIndices: number[] = [];
      WHEEL_NUMBERS.forEach((num, idx) => {
        let payout = 0;
        const isRed = RED_NUMBERS.has(num);
        const isEven = num !== 0 && num % 2 === 0;
        const isLow = num >= 1 && num <= 18;
        Object.entries(bets).forEach(([spotId, amount]) => {
          const amt = Number(amount) || 0;
          if (spotId === `num_${num}`) payout += amt * 36;
          if (spotId === "red" && isRed) payout += amt * 2;
          if (spotId === "black" && !isRed && num !== 0) payout += amt * 2;
          if (spotId === "even" && isEven) payout += amt * 2;
          if (spotId === "odd" && !isEven && num !== 0) payout += amt * 2;
          if (spotId === "1-18" && isLow) payout += amt * 2;
          if (spotId === "19-36" && !isLow && num !== 0) payout += amt * 2;
        });
        if (payout === 0) zeroPayoutIndices.push(idx);
      });
      if (zeroPayoutIndices.length > 0) {
        winIdx = zeroPayoutIndices[Math.floor(Math.random() * zeroPayoutIndices.length)];
      } else {
        winIdx = Math.floor(Math.random() * WHEEL_NUMBERS.length);
      }
    } else {
      winIdx = Math.floor(Math.random() * WHEEL_NUMBERS.length);
    }
    const winNum = WHEEL_NUMBERS[winIdx];

    // Calculate rotation angle (e.g. 5 full spins + pocket offset)
    const pocketAngle = 360 / WHEEL_NUMBERS.length;
    const targetAngle = 360 * 5 + (360 - winIdx * pocketAngle);

    setWheelRotation((prev) => prev + targetAngle);

    await new Promise((res) => setTimeout(res, 3500));

    setWinningNumber(winNum);
    setHistory((prev) => [winNum, ...prev.slice(0, 9)]);

    // Evaluate Wins
    let totalWin = 0;
    const isRed = RED_NUMBERS.has(winNum);
    const isEven = winNum !== 0 && winNum % 2 === 0;
    const isLow = winNum >= 1 && winNum <= 18;

    Object.entries(bets).forEach(([spotId, amount]) => {
      const amt = Number(amount) || 0;
      // Direct number match
      if (spotId === `num_${winNum}`) {
        totalWin += amt * 36; // 35:1 + original
      }
      // Red / Black
      else if (spotId === "red" && isRed) {
        totalWin += amt * 2;
      } else if (spotId === "black" && !isRed && winNum !== 0) {
        totalWin += amt * 2;
      }
      // Even / Odd
      else if (spotId === "even" && isEven) {
        totalWin += amt * 2;
      } else if (spotId === "odd" && winNum !== 0 && !isEven) {
        totalWin += amt * 2;
      }
      // Low / High
      else if (spotId === "low" && isLow) {
        totalWin += amt * 2;
      } else if (spotId === "high" && winNum >= 19 && winNum <= 36) {
        totalWin += amt * 2;
      }
      // Dozens
      else if (spotId === "doz_1" && winNum >= 1 && winNum <= 12) {
        totalWin += amt * 3;
      } else if (spotId === "doz_2" && winNum >= 13 && winNum <= 24) {
        totalWin += amt * 3;
      } else if (spotId === "doz_3" && winNum >= 25 && winNum <= 36) {
        totalWin += amt * 3;
      }
      // Columns
      else if (spotId === "col_1" && winNum % 3 === 1) {
        totalWin += amt * 3;
      } else if (spotId === "col_2" && winNum % 3 === 2) {
        totalWin += amt * 3;
      } else if (spotId === "col_3" && winNum !== 0 && winNum % 3 === 0) {
        totalWin += amt * 3;
      }
    });

    if (totalWin > 0) {
      casinoAudio.playWin();
      setLastWinAmount(totalWin);
      onWin(totalWin, `European Roulette Win (Pocket ${winNum}) -> $${totalWin}`);
    }

    setIsSpinning(false);
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-slate-950 border border-emerald-500/30 rounded-2xl p-4 sm:p-6 text-white shadow-2xl relative overflow-hidden backdrop-blur-xl">
      {/* Atmosphere Glow */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-gradient-to-b from-emerald-500/15 via-teal-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800/80 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Dices className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-wide bg-gradient-to-r from-emerald-300 via-teal-200 to-amber-200 bg-clip-text text-transparent">
                EUROPEAN ROULETTE
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-full uppercase tracking-wider">
                SINGLE ZERO (0) • 97.3% RTP
              </span>
            </div>
            <p className="text-xs text-slate-400">Classic Single Zero Layout • Inside, Outside & Dozen Bets</p>
          </div>
        </div>

        {/* Balance Display */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-emerald-500/30 px-4 py-2 rounded-xl shadow-inner">
          <Coins className="w-5 h-5 text-amber-400" />
          <span className="text-xs text-slate-400 font-medium">Balance:</span>
          <span className="text-base font-bold text-amber-300">${chips.toLocaleString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side Wheel Display */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl">
          {/* Wheel Visual */}
          <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-full border-4 border-amber-500/50 p-2 shadow-2xl bg-slate-950 flex items-center justify-center overflow-hidden">
            <motion.div
              animate={{ rotate: wheelRotation }}
              transition={{ duration: 3.5, ease: "easeOut" }}
              className="w-full h-full rounded-full border-2 border-slate-700 relative flex items-center justify-center bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-950"
            >
              {/* Center Cap */}
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 via-yellow-600 to-amber-800 border-2 border-amber-300 flex items-center justify-center shadow-lg z-10">
                <Circle className="w-8 h-8 text-slate-950 stroke-[2.5]" />
              </div>
            </motion.div>

            {/* Ball Indicator / Winner Badge */}
            {winningNumber !== null && (
              <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                <div className="bg-slate-950/90 border-2 border-amber-400 text-amber-300 px-4 py-2 rounded-xl text-center shadow-2xl backdrop-blur-md">
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">POCKET</div>
                  <div className={`text-2xl font-black ${RED_NUMBERS.has(winningNumber) ? "text-red-400" : winningNumber === 0 ? "text-emerald-400" : "text-slate-200"}`}>
                    {winningNumber}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* History Ribbon */}
          <div className="w-full mt-4 bg-slate-950 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between gap-2 overflow-x-auto">
            <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">HISTORY:</span>
            <div className="flex gap-1.5 overflow-x-auto">
              {history.map((num, idx) => (
                <span
                  key={idx}
                  className={`px-2 py-1 rounded text-xs font-bold border ${
                    num === 0
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                      : RED_NUMBERS.has(num)
                      ? "bg-red-500/20 border-red-500 text-red-300"
                      : "bg-slate-800 border-slate-700 text-slate-300"
                  }`}
                >
                  {num}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side Betting Table */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Chip Selector Bar */}
          <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
            <span className="text-xs font-bold text-slate-400">SELECT CHIP:</span>
            <div className="flex gap-2">
              {chipValues.map((val) => (
                <button
                  key={val}
                  onClick={() => setSelectedChip(val)}
                  className={`w-9 h-9 rounded-full text-xs font-black border flex items-center justify-center shadow-md transition-all ${
                    selectedChip === val
                      ? "bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 border-amber-300 scale-110"
                      : "bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  ${val}
                </button>
              ))}
            </div>
          </div>

          {/* Table Board Layout */}
          <div className="bg-slate-950 border border-emerald-500/30 p-3 rounded-xl flex flex-col gap-2">
            {/* Zero and Grid */}
            <div className="grid grid-cols-13 gap-1">
              {/* Single Zero */}
              <button
                disabled={isSpinning}
                onClick={() => placeBet("num_0")}
                className={`row-span-3 bg-emerald-900/60 border border-emerald-500/60 hover:bg-emerald-800/80 rounded-lg flex flex-col items-center justify-center font-bold text-sm text-emerald-200 relative transition-all ${
                  bets["num_0"] ? "ring-2 ring-amber-400" : ""
                }`}
              >
                0
                {bets["num_0"] && (
                  <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 text-[9px] font-black px-1 rounded-full shadow">
                    ${bets["num_0"]}
                  </span>
                )}
              </button>

              {/* Numbers 1 to 36 Grid */}
              {Array.from({ length: 36 }, (_, i) => i + 1).map((num) => {
                const isRed = RED_NUMBERS.has(num);
                const spotId = `num_${num}`;

                return (
                  <button
                    key={num}
                    disabled={isSpinning}
                    onClick={() => placeBet(spotId)}
                    className={`h-10 rounded-lg border font-bold text-xs flex items-center justify-center relative transition-all ${
                      isRed
                        ? "bg-red-950/80 border-red-600/60 text-red-200 hover:bg-red-900"
                        : "bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800"
                    } ${bets[spotId] ? "ring-2 ring-amber-400" : ""}`}
                  >
                    {num}
                    {bets[spotId] && (
                      <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 text-[9px] font-black px-1 rounded-full shadow">
                        ${bets[spotId]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Dozens Bar */}
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: "doz_1", label: "1st 12 (1-12)" },
                { id: "doz_2", label: "2nd 12 (13-24)" },
                { id: "doz_3", label: "3rd 12 (25-36)" },
              ].map((doz) => (
                <button
                  key={doz.id}
                  disabled={isSpinning}
                  onClick={() => placeBet(doz.id)}
                  className={`py-2 rounded-lg border bg-slate-900 border-slate-800 text-xs font-bold text-slate-300 hover:border-slate-600 relative transition-all ${
                    bets[doz.id] ? "ring-2 ring-amber-400" : ""
                  }`}
                >
                  {doz.label}
                  {bets[doz.id] && (
                    <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 text-[9px] font-black px-1 rounded-full shadow">
                      ${bets[doz.id]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Outside Even/Odd/Red/Black Bar */}
            <div className="grid grid-cols-6 gap-1">
              {[
                { id: "low", label: "1 to 18" },
                { id: "even", label: "EVEN" },
                { id: "red", label: "RED", bg: "bg-red-950/80 border-red-600 text-red-200" },
                { id: "black", label: "BLACK", bg: "bg-slate-900 border-slate-700 text-slate-200" },
                { id: "odd", label: "ODD" },
                { id: "high", label: "19 to 36" },
              ].map((out) => (
                <button
                  key={out.id}
                  disabled={isSpinning}
                  onClick={() => placeBet(out.id)}
                  className={`py-2 rounded-lg border text-xs font-extrabold relative transition-all ${
                    out.bg || "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600"
                  } ${bets[out.id] ? "ring-2 ring-amber-400" : ""}`}
                >
                  {out.label}
                  {bets[out.id] && (
                    <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 text-[9px] font-black px-1 rounded-full shadow">
                      ${bets[out.id]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between gap-4">
            <button
              disabled={isSpinning || totalBetAmount === 0}
              onClick={clearBets}
              className="px-4 py-3 rounded-xl border border-slate-700 bg-slate-900 text-xs font-bold text-slate-400 hover:text-white disabled:opacity-40 transition-all flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" /> CLEAR BETS
            </button>

            <button
              disabled={isSpinning || totalBetAmount === 0}
              onClick={spin}
              className={`flex-1 py-3.5 rounded-xl font-black text-slate-950 transition-all shadow-xl flex items-center justify-center gap-2 text-base tracking-wide ${
                isSpinning || totalBetAmount === 0
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                  : "bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-400 hover:from-emerald-300 shadow-emerald-500/20 cursor-pointer"
              }`}
            >
              <Play className="w-5 h-5 fill-slate-950" />
              {isSpinning ? "WHEEL SPINNING..." : `SPIN ROULETTE ($${totalBetAmount.toLocaleString()})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EuropeanRouletteGame;
