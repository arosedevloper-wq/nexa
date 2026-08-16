import React, { useState, useEffect } from "react";
import { Coins, Play, RefreshCw, Trophy, Sparkles, Zap, RotateCcw, Check, Flame, Award, Hash, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../../lib/audioService";
import { evaluateLiveGameRound } from "../../constants/liveGameConfig";

interface VipKenoGameProps {
  chips: number;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest?: (type: "greet" | "win" | "lose") => void;
  rtpBias?: string;
}

// Standard Keno Payout Multiplier Table based on Spots Selected (1-10) and Hits Matched (0-10)
const KENO_PAYOUT_TABLE: Record<number, Record<number, number>> = {
  1: { 1: 3.8 },
  2: { 1: 1.0, 2: 7.5 },
  3: { 2: 2.0, 3: 25.0 },
  4: { 2: 1.0, 3: 5.0, 4: 80.0 },
  5: { 3: 3.0, 4: 18.0, 5: 300.0 },
  6: { 3: 1.0, 4: 7.0, 5: 75.0, 6: 1200.0 },
  7: { 4: 2.0, 5: 20.0, 6: 250.0, 7: 3500.0 },
  8: { 4: 1.0, 5: 12.0, 6: 90.0, 7: 1000.0, 8: 7500.0 },
  9: { 5: 6.0, 6: 40.0, 7: 350.0, 8: 3000.0, 9: 15000.0 },
  10: { 0: 2.0, 5: 3.0, 6: 15.0, 7: 100.0, 8: 1000.0, 9: 5000.0, 10: 25000.0 },
};

export const VipKenoGame: React.FC<VipKenoGameProps> = ({
  chips,
  onWin,
  onLose,
  onCommentaryRequest,
  rtpBias,
}) => {
  const [bet, setBet] = useState<number>(50);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [hits, setHits] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawSpeed, setDrawSpeed] = useState<"normal" | "fast" | "turbo">("fast");
  const [isWinRound, setIsWinRound] = useState<boolean>(false);
  const [lastWinAmount, setLastWinAmount] = useState<number>(0);
  const [lastMultiplier, setLastMultiplier] = useState<number>(0);
  const [stats, setStats] = useState({ totalGames: 0, totalWins: 0, maxMultiplier: 0 });

  const quickBets = [10, 25, 50, 100, 250, 500];

  // Number Grid 1-80
  const kenoGrid = Array.from({ length: 80 }, (_, i) => i + 1);

  // Toggle Spot Selection
  const toggleNumber = (num: number) => {
    if (isDrawing) return;
    casinoAudio.playChipClink();

    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(selectedNumbers.filter((n) => n !== num));
    } else {
      if (selectedNumbers.length >= 10) return;
      setSelectedNumbers([...selectedNumbers, num]);
    }
  };

  // Quick Pick Random Spots
  const quickPick = (count: number = 10) => {
    if (isDrawing) return;
    casinoAudio.playCardFlip();
    const shuffled = [...kenoGrid].sort(() => Math.random() - 0.5);
    setSelectedNumbers(shuffled.slice(0, count));
  };

  const clearSelection = () => {
    if (isDrawing) return;
    setSelectedNumbers([]);
    setDrawnNumbers([]);
    setHits([]);
    setIsWinRound(false);
  };

  // Start Keno Draw
  const startDraw = async () => {
    if (selectedNumbers.length === 0 || isDrawing) return;
    if (chips < bet) {
      casinoAudio.playLose();
      return;
    }

    casinoAudio.playChipClink();
    onLose(bet, `Placed $${bet} VIP Keno Bet (${selectedNumbers.length} Picks)`);

    setIsDrawing(true);
    setDrawnNumbers([]);
    setHits([]);
    setIsWinRound(false);
    setLastWinAmount(0);

    // Pick 20 unique winning balls from 1-80
    const isWinAllowed = evaluateLiveGameRound(undefined, rtpBias);
    let winningPool: number[];
    if (!isWinAllowed) {
      const unselected = kenoGrid.filter((n) => !selectedNumbers.includes(n)).sort(() => Math.random() - 0.5);
      winningPool = unselected.slice(0, 20);
    } else {
      winningPool = [...kenoGrid].sort(() => Math.random() - 0.5).slice(0, 20);
    }

    const speedMs = drawSpeed === "turbo" ? 30 : drawSpeed === "fast" ? 75 : 150;
    const currentDrawn: number[] = [];
    const currentHits: number[] = [];

    for (let i = 0; i < winningPool.length; i++) {
      const num = winningPool[i];
      currentDrawn.push(num);

      if (selectedNumbers.includes(num)) {
        currentHits.push(num);
        casinoAudio.playWin();
      } else {
        casinoAudio.playWheelSpin(0.02);
      }

      setDrawnNumbers([...currentDrawn]);
      setHits([...currentHits]);

      await new Promise((resolve) => setTimeout(resolve, speedMs));
    }

    // Evaluate Win
    const hitCount = currentHits.length;
    const spotCount = selectedNumbers.length;
    const multTable = KENO_PAYOUT_TABLE[spotCount] || {};
    let mult = multTable[hitCount] || 0;

    if (rtpBias === "HIGH" || rtpBias === "JACKPOT") {
      mult = parseFloat((mult * 1.15).toFixed(2));
    }

    const winAmount = Math.floor(bet * mult);

    if (winAmount > 0) {
      casinoAudio.playJackpot();
      onWin(winAmount, `VIP Keno Hit ${hitCount}/${spotCount} Spots -> ${mult}x ($${winAmount})`);
      setIsWinRound(true);
      setLastWinAmount(winAmount);
      setLastMultiplier(mult);

      if (onCommentaryRequest) {
        onCommentaryRequest("win");
      }
    } else {
      casinoAudio.playLose();
      if (onCommentaryRequest) {
        onCommentaryRequest("lose");
      }
    }

    setStats((prev) => ({
      totalGames: prev.totalGames + 1,
      totalWins: prev.totalWins + (winAmount > 0 ? 1 : 0),
      maxMultiplier: Math.max(prev.maxMultiplier, mult),
    }));

    setIsDrawing(false);
  };

  const spotCount = selectedNumbers.length;
  const currentPayoutMap = KENO_PAYOUT_TABLE[spotCount] || {};

  return (
    <div className="w-full max-w-5xl mx-auto bg-slate-950 border border-purple-500/30 rounded-2xl p-4 sm:p-6 text-white shadow-2xl relative overflow-hidden backdrop-blur-xl">
      {/* Background Glow */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800/80 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Hash className="w-6 h-6 text-white stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-wide bg-gradient-to-r from-purple-400 via-pink-300 to-amber-300 bg-clip-text text-transparent">
                VIP KENO 80
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-500/20 border border-purple-500/40 text-purple-300 rounded-full uppercase tracking-wider">
                AUTO-DRAW SPEED
              </span>
            </div>
            <p className="text-xs text-slate-400">Select up to 10 lucky numbers and watch 20 winning balls draw</p>
          </div>
        </div>

        {/* Balance Display */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-purple-500/30 px-4 py-2 rounded-xl shadow-inner">
          <Coins className="w-5 h-5 text-amber-400" />
          <span className="text-xs text-slate-400 font-medium">Balance:</span>
          <span className="text-base font-bold text-amber-300">${chips.toLocaleString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Control Column */}
        <div className="lg:col-span-4 flex flex-col gap-4 bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl">
          {/* Bet Input */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
              <span>BET AMOUNT ($)</span>
              <span className="text-[10px] text-purple-400">MIN $0.10 • MAX $5,000</span>
            </label>
            <div className="relative">
              <input
                type="number"
                disabled={isDrawing}
                value={bet}
                onChange={(e) => setBet(Math.max(0.10, Math.min(5000, Number(e.target.value))))}
                className="w-full bg-slate-950 border border-slate-700 focus:border-purple-500 rounded-xl px-4 py-2.5 text-amber-300 font-bold text-lg outline-none disabled:opacity-50 transition-all"
              />
              <span className="absolute right-3 top-3 text-xs font-bold text-slate-500">USD</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 mt-2">
              {quickBets.map((val) => (
                <button
                  key={val}
                  disabled={isDrawing}
                  onClick={() => setBet(val)}
                  className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    bet === val
                      ? "bg-purple-500/20 border-purple-500 text-purple-300"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  } disabled:opacity-40`}
                >
                  ${val}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Selection Buttons */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
              <span>SPOT PICK ACTIONS</span>
              <span className="text-[10px] text-amber-300 font-bold">{selectedNumbers.length} / 10 PICKED</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                disabled={isDrawing}
                onClick={() => quickPick(5)}
                className="py-2 bg-slate-800/90 border border-slate-700 hover:bg-slate-700/80 text-xs font-bold rounded-lg transition-all disabled:opacity-40"
              >
                AUTO 5
              </button>
              <button
                disabled={isDrawing}
                onClick={() => quickPick(10)}
                className="py-2 bg-purple-900/40 border border-purple-600/60 hover:bg-purple-800/50 text-xs font-bold text-purple-200 rounded-lg transition-all disabled:opacity-40"
              >
                AUTO 10
              </button>
              <button
                disabled={isDrawing}
                onClick={clearSelection}
                className="py-2 bg-rose-950/40 border border-rose-800/60 hover:bg-rose-900/50 text-xs font-bold text-rose-300 rounded-lg transition-all disabled:opacity-40 flex items-center justify-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> CLEAR
              </button>
            </div>
          </div>

          {/* Speed Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-2 block">
              DRAW SPEED
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(["normal", "fast", "turbo"] as const).map((spd) => (
                <button
                  key={spd}
                  disabled={isDrawing}
                  onClick={() => setDrawSpeed(spd)}
                  className={`py-2 text-xs font-bold uppercase rounded-lg border transition-all ${
                    drawSpeed === spd
                      ? "bg-purple-500 text-slate-950 border-purple-400 font-extrabold shadow-md shadow-purple-500/30"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  } disabled:opacity-40`}
                >
                  {spd}
                </button>
              ))}
            </div>
          </div>

          {/* Payout Table for Selected Spot Count */}
          <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-1.5 font-bold text-purple-300">
              <span>HITS MATCHED</span>
              <span>PAYOUT MULTIPLIER</span>
            </div>
            {spotCount > 0 ? (
              Object.entries(currentPayoutMap).map(([hitCount, mult]) => (
                <div
                  key={hitCount}
                  className={`flex justify-between items-center text-xs py-1 px-2 rounded ${
                    hits.length === Number(hitCount) && !isDrawing
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-extrabold"
                      : "text-slate-300"
                  }`}
                >
                  <span>{hitCount} Hits</span>
                  <span className="font-extrabold text-amber-400">{mult}x (${Math.floor(bet * mult).toLocaleString()})</span>
                </div>
              ))
            ) : (
              <span className="text-xs text-slate-500 text-center py-2">Select 1–10 spots on grid to view payout multipliers</span>
            )}
          </div>

          {/* Play Action */}
          <button
            disabled={selectedNumbers.length === 0 || isDrawing}
            onClick={startDraw}
            className={`w-full py-3.5 rounded-xl font-black transition-all shadow-lg flex items-center justify-center gap-2 text-base tracking-wide ${
              selectedNumbers.length > 0 && !isDrawing
                ? "bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 hover:from-purple-400 hover:to-amber-300 text-slate-950 shadow-purple-500/25 cursor-pointer"
                : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
            }`}
          >
            <Play className="w-5 h-5 fill-slate-950" />
            {isDrawing ? "DRAWING 20 BALLS..." : `START DRAW ($${bet})`}
          </button>
        </div>

        {/* Right 80-Number Keno Grid & Drawn Balls */}
        <div className="lg:col-span-8 flex flex-col gap-4 bg-slate-900/40 border border-slate-800/80 p-4 sm:p-6 rounded-xl">
          {/* Drawn Balls Display */}
          <div className="bg-slate-950/90 border border-slate-800 p-3 rounded-xl">
            <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
              <span className="font-bold flex items-center gap-1.5 text-purple-300">
                <Sparkles className="w-4 h-4 text-purple-400" /> DRAWN BALLS ({drawnNumbers.length} / 20)
              </span>
              <span className="text-amber-400 font-extrabold">HITS: {hits.length}</span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto min-h-[42px] pb-1">
              {drawnNumbers.length === 0 && (
                <span className="text-xs text-slate-600 italic">Drawn winning numbers will appear here sequentially...</span>
              )}
              {drawnNumbers.map((num, idx) => {
                const isHit = selectedNumbers.includes(num);
                return (
                  <motion.div
                    key={idx}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 border shadow-md ${
                      isHit
                        ? "bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 border-amber-300 shadow-amber-500/40 scale-110"
                        : "bg-gradient-to-br from-purple-900 to-slate-900 text-purple-200 border-purple-700/60"
                    }`}
                  >
                    {num}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* 80 Grid */}
          <div className="grid grid-cols-10 gap-1.5 sm:gap-2 w-full p-2 bg-slate-950/80 rounded-2xl border border-slate-800">
            {kenoGrid.map((num) => {
              const isSelected = selectedNumbers.includes(num);
              const isDrawn = drawnNumbers.includes(num);
              const isHit = isSelected && isDrawn;

              return (
                <button
                  key={num}
                  disabled={isDrawing}
                  onClick={() => toggleNumber(num)}
                  className={`aspect-square rounded-lg text-xs font-extrabold flex items-center justify-center transition-all border ${
                    isHit
                      ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 border-amber-300 shadow-lg shadow-amber-500/40 scale-105 z-10"
                      : isDrawn
                      ? "bg-purple-950/80 border-purple-700/80 text-purple-300 opacity-90"
                      : isSelected
                      ? "bg-gradient-to-br from-purple-600 to-indigo-700 text-white border-purple-400 shadow-md shadow-purple-500/30"
                      : "bg-slate-900/80 border-slate-800 text-slate-400 hover:border-purple-500/50 hover:text-white"
                  } disabled:cursor-not-allowed`}
                >
                  {num}
                </button>
              );
            })}
          </div>

          {/* Win / Outcome Result Banner */}
          <AnimatePresence>
            {!isDrawing && drawnNumbers.length === 20 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-xl border flex items-center justify-between shadow-xl ${
                  isWinRound
                    ? "bg-amber-950/80 border-amber-500/60 text-amber-300"
                    : "bg-slate-900 border-slate-800 text-slate-400"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Trophy className={`w-5 h-5 ${isWinRound ? "text-amber-400" : "text-slate-500"}`} />
                  <div>
                    <span className="font-extrabold text-sm block">
                      {isWinRound
                        ? `WINNER! ${hits.length} SPOT HITS (${lastMultiplier}x)`
                        : `DRAW COMPLETE (${hits.length} Hits)`}
                    </span>
                    <span className="text-xs opacity-80">
                      {isWinRound
                        ? `Won $${lastWinAmount.toLocaleString()} chips payout!`
                        : "No qualifying hit payout this round."}
                    </span>
                  </div>
                </div>

                <button
                  onClick={startDraw}
                  className="px-4 py-2 bg-purple-500 text-slate-950 rounded-lg text-xs font-black hover:bg-purple-400 transition-all"
                >
                  RE-DRAW
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default VipKenoGame;
