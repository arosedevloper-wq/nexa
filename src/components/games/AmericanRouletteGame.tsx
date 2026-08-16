import React, { useState } from "react";
import { Coins, Play, RotateCcw, Sparkles, ShieldCheck, Trophy, CircleDot } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../../lib/audioService";
import { evaluateLiveGameRound } from "../../constants/liveGameConfig";

interface AmericanRouletteGameProps {
  chips: number;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest?: (type: "greet" | "win" | "lose") => void;
  rtpBias?: string;
}

// 38 Pockets in American Roulette order
const POCKETS = [
  "0", "28", "9", "26", "30", "11", "7", "20", "32", "17",
  "5", "22", "34", "15", "3", "24", "36", "13", "1", "00",
  "27", "10", "25", "29", "12", "8", "19", "31", "18", "6",
  "21", "33", "16", "4", "23", "35", "14", "2"
];

const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36
]);

export const AmericanRouletteGame: React.FC<AmericanRouletteGameProps> = ({
  chips,
  onWin,
  onLose,
  onCommentaryRequest,
  rtpBias,
}) => {
  const [selectedChip, setSelectedChip] = useState<number>(25);
  const [bets, setBets] = useState<Record<string, number>>({});
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [wheelRotation, setWheelRotation] = useState<number>(0);
  const [winningPocket, setWinningPocket] = useState<string | null>(null);
  const [lastWinAmount, setLastWinAmount] = useState<number | null>(null);

  const chipValues = [10, 25, 50, 100, 250, 500];

  const placeBet = (betKey: string) => {
    if (isSpinning) return;
    if (chips < selectedChip) {
      casinoAudio.playLose();
      return;
    }
    casinoAudio.playChipClink();
    setBets((prev) => ({
      ...prev,
      [betKey]: (prev[betKey] || 0) + selectedChip,
    }));
  };

  const clearBets = () => {
    if (isSpinning) return;
    casinoAudio.playChipClink();
    setBets({});
    setWinningPocket(null);
    setLastWinAmount(null);
  };

  const totalBetAmount: number = (Object.values(bets) as number[]).reduce((a, b) => a + b, 0);

  const spinWheel = async () => {
    if (totalBetAmount <= 0 || isSpinning) return;
    if (chips < totalBetAmount) {
      casinoAudio.playLose();
      return;
    }

    casinoAudio.playChipClink();
    onLose(totalBetAmount, `American Roulette Wager ($${totalBetAmount})`);

    setIsSpinning(true);
    setWinningPocket(null);
    setLastWinAmount(null);

    // Pick random winning index
    const isWinAllowed = evaluateLiveGameRound(undefined, rtpBias);
    let winIndex: number;
    if (!isWinAllowed) {
      // Pick pocket that yields 0 payout
      const zeroPayoutIndices: number[] = [];
      POCKETS.forEach((p, idx) => {
        const num = p === "0" || p === "00" ? null : parseInt(p, 10);
        const isRed = num ? RED_NUMBERS.has(num) : false;
        const isEven = num ? num % 2 === 0 : false;
        let payout = 0;
        if (bets[p]) payout += bets[p] * 36;
        if (num !== null) {
          if (isRed && bets["red"]) payout += bets["red"] * 2;
          if (!isRed && bets["black"]) payout += bets["black"] * 2;
          if (isEven && bets["even"]) payout += bets["even"] * 2;
          if (!isEven && bets["odd"]) payout += bets["odd"] * 2;
          if (num <= 18 && bets["1-18"]) payout += bets["1-18"] * 2;
          if (num >= 19 && bets["19-36"]) payout += bets["19-36"] * 2;
          if (num >= 1 && num <= 12 && bets["1st12"]) payout += bets["1st12"] * 3;
          if (num >= 13 && num <= 24 && bets["2nd12"]) payout += bets["2nd12"] * 3;
          if (num >= 25 && num <= 36 && bets["3rd12"]) payout += bets["3rd12"] * 3;
        }
        if (payout === 0) zeroPayoutIndices.push(idx);
      });
      if (zeroPayoutIndices.length > 0) {
        winIndex = zeroPayoutIndices[Math.floor(Math.random() * zeroPayoutIndices.length)];
      } else {
        winIndex = Math.floor(Math.random() * POCKETS.length);
      }
    } else {
      winIndex = Math.floor(Math.random() * POCKETS.length);
    }
    const chosenPocket = POCKETS[winIndex];

    casinoAudio.playWheelSpin(0.08);

    // Calculate rotation angle (5 full spins + offset)
    const segmentAngle = 360 / POCKETS.length;
    const extraSpins = 360 * 5;
    const targetAngle = wheelRotation + extraSpins + (360 - winIndex * segmentAngle);

    setWheelRotation(targetAngle);

    await new Promise((r) => setTimeout(r, 3500));

    setWinningPocket(chosenPocket);
    setIsSpinning(false);

    // Evaluate payouts
    let totalWinPayout = 0;
    const num = chosenPocket === "0" || chosenPocket === "00" ? null : parseInt(chosenPocket, 10);
    const isRed = num ? RED_NUMBERS.has(num) : false;
    const isEven = num ? num % 2 === 0 : false;

    // Straight Up (35:1 + bet back = 36x)
    if (bets[chosenPocket]) {
      totalWinPayout += bets[chosenPocket] * 36;
    }

    if (num !== null) {
      // Red / Black (1:1)
      if (isRed && bets["red"]) totalWinPayout += bets["red"] * 2;
      if (!isRed && bets["black"]) totalWinPayout += bets["black"] * 2;

      // Even / Odd (1:1)
      if (isEven && bets["even"]) totalWinPayout += bets["even"] * 2;
      if (!isEven && bets["odd"]) totalWinPayout += bets["odd"] * 2;

      // 1-18 / 19-36 (1:1)
      if (num <= 18 && bets["1-18"]) totalWinPayout += bets["1-18"] * 2;
      if (num >= 19 && bets["19-36"]) totalWinPayout += bets["19-36"] * 2;

      // Dozens (2:1 + bet = 3x)
      if (num >= 1 && num <= 12 && bets["1st12"]) totalWinPayout += bets["1st12"] * 3;
      if (num >= 13 && num <= 24 && bets["2nd12"]) totalWinPayout += bets["2nd12"] * 3;
      if (num >= 25 && num <= 36 && bets["3rd12"]) totalWinPayout += bets["3rd12"] * 3;
    }

    if (totalWinPayout > 0) {
      casinoAudio.playJackpot();
      setLastWinAmount(totalWinPayout);
      onWin(totalWinPayout, `American Roulette Pocket #${chosenPocket} -> $${totalWinPayout}`);
    } else {
      casinoAudio.playLose();
    }
  };

  const getPocketColor = (p: string) => {
    if (p === "0" || p === "00") return "bg-emerald-600 text-white";
    const n = parseInt(p, 10);
    return RED_NUMBERS.has(n) ? "bg-red-600 text-white" : "bg-slate-900 text-white border border-slate-700";
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-slate-950 border border-emerald-500/30 rounded-2xl p-4 sm:p-6 text-white shadow-2xl relative overflow-hidden backdrop-blur-xl">
      {/* Background Atmosphere */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-gradient-to-b from-emerald-500/15 via-teal-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800/80 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <CircleDot className="w-6 h-6 text-white stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-wide bg-gradient-to-r from-emerald-300 via-teal-200 to-amber-200 bg-clip-text text-transparent">
                AMERICAN ROULETTE
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-full uppercase tracking-wider">
                DOUBLE ZERO (0 & 00)
              </span>
            </div>
            <p className="text-xs text-slate-400">Place inside & outside bets on 38 pockets including 0 & 00</p>
          </div>
        </div>

        {/* Balance Display */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-emerald-500/30 px-4 py-2 rounded-xl shadow-inner">
          <Coins className="w-5 h-5 text-amber-400" />
          <span className="text-xs text-slate-400 font-medium">Balance:</span>
          <span className="text-base font-bold text-amber-300">${chips.toLocaleString()}</span>
        </div>
      </div>

      {/* Animated Wheel & Ball Stage */}
      <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center mb-6 relative">
        <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full border-4 border-amber-500/60 shadow-2xl relative flex items-center justify-center overflow-hidden bg-slate-950">
          {/* Wheel Ring */}
          <motion.div
            animate={{ rotate: wheelRotation }}
            transition={{ duration: 3.5, ease: "easeOut" }}
            className="w-full h-full rounded-full flex items-center justify-center relative"
          >
            {POCKETS.map((p, idx) => {
              const angle = (360 / POCKETS.length) * idx;
              return (
                <div
                  key={idx}
                  style={{ transform: `rotate(${angle}deg) translateY(-85px)` }}
                  className={`absolute text-[9px] font-black px-1.5 py-0.5 rounded ${
                    p === "0" || p === "00"
                      ? "bg-emerald-500 text-slate-950"
                      : RED_NUMBERS.has(parseInt(p, 10))
                      ? "bg-red-600 text-white"
                      : "bg-slate-900 text-white"
                  }`}
                >
                  {p}
                </div>
              );
            })}
          </motion.div>

          {/* Center Hub */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 border-2 border-slate-900 z-10 flex items-center justify-center shadow-lg">
            <Sparkles className="w-6 h-6 text-slate-950" />
          </div>
        </div>

        {winningPocket !== null && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mt-3 flex items-center gap-3 bg-emerald-950/90 border border-emerald-500/50 px-4 py-2 rounded-xl text-xs font-black shadow-lg"
          >
            <span>WINNING POCKET:</span>
            <span className={`px-2.5 py-1 rounded-lg text-sm font-extrabold ${getPocketColor(winningPocket)}`}>
              #{winningPocket}
            </span>
            {lastWinAmount !== null && (
              <span className="text-emerald-400 font-extrabold">Payout: +${lastWinAmount.toLocaleString()}</span>
            )}
          </motion.div>
        )}
      </div>

      {/* Betting Felt */}
      <div className="bg-emerald-950/40 border-2 border-emerald-700/60 p-4 rounded-2xl mb-6 shadow-2xl">
        <div className="grid grid-cols-14 gap-1 mb-2">
          {/* 0 and 00 */}
          <button
            onClick={() => placeBet("0")}
            className="col-span-1 py-6 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white font-black text-xs flex flex-col items-center justify-center relative border border-emerald-400"
          >
            0
            {bets["0"] && <span className="absolute bottom-1 bg-amber-400 text-slate-950 text-[9px] px-1 rounded-full font-bold">${bets["0"]}</span>}
          </button>
          <button
            onClick={() => placeBet("00")}
            className="col-span-1 py-6 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white font-black text-xs flex flex-col items-center justify-center relative border border-emerald-400"
          >
            00
            {bets["00"] && <span className="absolute bottom-1 bg-amber-400 text-slate-950 text-[9px] px-1 rounded-full font-bold">${bets["00"]}</span>}
          </button>

          {/* Numbers 1 to 36 */}
          <div className="col-span-12 grid grid-cols-12 gap-1">
            {Array.from({ length: 36 }, (_, i) => i + 1).map((num) => {
              const isRed = RED_NUMBERS.has(num);
              return (
                <button
                  key={num}
                  onClick={() => placeBet(num.toString())}
                  className={`py-3 rounded-lg font-black text-xs flex flex-col items-center justify-center relative border transition-all ${
                    isRed
                      ? "bg-red-600/80 hover:bg-red-500 text-white border-red-400"
                      : "bg-slate-900/90 hover:bg-slate-800 text-white border-slate-700"
                  }`}
                >
                  {num}
                  {bets[num.toString()] && (
                    <span className="absolute bottom-0.5 bg-amber-400 text-slate-950 text-[8px] px-1 rounded-full font-bold">
                      ${bets[num.toString()]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Outside Bets */}
        <div className="grid grid-cols-6 gap-2 pt-2 border-t border-emerald-800/80">
          {[
            { key: "1-18", label: "1 - 18" },
            { key: "even", label: "EVEN" },
            { key: "red", label: "RED", bg: "bg-red-600/80" },
            { key: "black", label: "BLACK", bg: "bg-slate-900/90" },
            { key: "odd", label: "ODD" },
            { key: "19-36", label: "19 - 36" },
          ].map((b) => (
            <button
              key={b.key}
              onClick={() => placeBet(b.key)}
              className={`py-2.5 rounded-lg border font-black text-xs flex flex-col items-center justify-center relative ${
                b.bg || "bg-emerald-900/60"
              } border-emerald-600 hover:border-amber-400 transition-all`}
            >
              {b.label}
              {bets[b.key] && (
                <span className="bg-amber-400 text-slate-950 text-[9px] px-1.5 py-0.2 rounded-full font-bold mt-1">
                  ${bets[b.key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Chip Bar & Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 mr-1">CHIP:</span>
          {chipValues.map((val) => (
            <button
              key={val}
              onClick={() => setSelectedChip(val)}
              className={`w-9 h-9 rounded-full text-xs font-black border flex items-center justify-center transition-all ${
                selectedChip === val
                  ? "bg-amber-400 border-amber-300 text-slate-950 scale-110 shadow-md shadow-amber-500/40"
                  : "bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500"
              }`}
            >
              ${val}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            disabled={isSpinning || totalBetAmount === 0}
            onClick={clearBets}
            className="px-4 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 border border-slate-700 disabled:opacity-40 transition-all flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" /> CLEAR BETS
          </button>

          <button
            disabled={isSpinning || totalBetAmount === 0}
            onClick={spinWheel}
            className={`flex-1 sm:flex-initial px-8 py-3 rounded-xl font-black text-sm transition-all shadow-xl flex items-center justify-center gap-2 ${
              isSpinning || totalBetAmount === 0
                ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                : "bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 text-slate-950 shadow-emerald-500/30 cursor-pointer hover:from-emerald-300 hover:to-teal-200"
            }`}
          >
            <Play className="w-5 h-5 fill-slate-950" />
            {isSpinning ? "SPINNING ROULETTE..." : `SPIN ROULETTE ($${totalBetAmount})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AmericanRouletteGame;
