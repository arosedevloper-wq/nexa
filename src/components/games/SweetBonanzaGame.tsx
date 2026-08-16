import React, { useState, useEffect } from "react";
import { Coins, Play, Sparkles, Trophy, Flame, Zap, FastForward, Heart, Cake } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../../lib/audioService";
import { evaluateLiveGameRound } from "../../constants/liveGameConfig";

interface SweetBonanzaGameProps {
  chips: number;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest?: (type: "greet" | "win" | "lose") => void;
  rtpBias?: string;
}

interface CandyDef {
  id: string;
  name: string;
  icon: string;
  color: string;
  bg: string;
  basePayout: number; // 12+ payout multiplier
}

const CANDIES: CandyDef[] = [
  { id: "red_heart", name: "Red Heart Candy", icon: "❤️", color: "text-rose-400", bg: "from-rose-950/60 to-red-950/80 border-rose-500/50", basePayout: 50 },
  { id: "purple_candy", name: "Purple Square", icon: "🟣", color: "text-purple-400", bg: "from-purple-950/60 to-indigo-950/80 border-purple-500/50", basePayout: 25 },
  { id: "green_gem", name: "Green Pentagon", icon: "🟢", color: "text-emerald-400", bg: "from-emerald-950/60 to-teal-950/80 border-emerald-500/50", basePayout: 15 },
  { id: "blue_oval", name: "Blue Oval", icon: "🔵", color: "text-blue-400", bg: "from-blue-950/60 to-cyan-950/80 border-blue-500/50", basePayout: 12 },
  { id: "apple", name: "Red Apple", icon: "🍎", color: "text-red-400", bg: "from-red-950/50 to-slate-900 border-red-500/40", basePayout: 10 },
  { id: "plum", name: "Purple Plum", icon: "🍇", color: "text-purple-400", bg: "from-purple-950/50 to-slate-900 border-purple-500/40", basePayout: 8 },
  { id: "watermelon", name: "Watermelon", icon: "🍉", color: "text-emerald-400", bg: "from-emerald-950/50 to-slate-900 border-emerald-500/40", basePayout: 5 },
  { id: "grape", name: "Sweet Grapes", icon: "🍇", color: "text-indigo-400", bg: "from-indigo-950/50 to-slate-900 border-indigo-500/40", basePayout: 4 },
  { id: "banana", name: "Yellow Banana", icon: "🍌", color: "text-yellow-400", bg: "from-yellow-950/50 to-slate-900 border-yellow-500/40", basePayout: 2 },
];

interface BonanzaCell {
  uid: string;
  candyId: string;
  bombMultiplier?: number;
  isScatter?: boolean;
  isWinning?: boolean;
}

export const SweetBonanzaGame: React.FC<SweetBonanzaGameProps> = ({
  chips,
  onWin,
  onLose,
  onCommentaryRequest,
  rtpBias,
}) => {
  const [bet, setBet] = useState<number>(50);
  const [grid, setGrid] = useState<BonanzaCell[][]>([]);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [freeSpinsLeft, setFreeSpinsLeft] = useState<number>(0);
  const [totalFreeSpinsWin, setTotalFreeSpinsWin] = useState<number>(0);
  const [tumbleWin, setTumbleWin] = useState<number>(0);
  const [roundBombMultiplier, setRoundBombMultiplier] = useState<number>(0);
  const [sugarBombExplode, setSugarBombExplode] = useState<boolean>(false);

  const quickBets = [10, 25, 50, 100, 250, 500];

  const getRandomCandyCell = (): BonanzaCell => {
    // 4% Lollipop Scatter
    if (Math.random() < 0.04) {
      return { uid: Math.random().toString(), candyId: "lollipop", isScatter: true };
    }
    // 5% Sugar Bomb Multiplier (2x to 100x)
    if (Math.random() < 0.05) {
      const bombs = [2, 3, 5, 10, 15, 25, 50, 100];
      const val = bombs[Math.floor(Math.random() * bombs.length)];
      return { uid: Math.random().toString(), candyId: "sugar_bomb", bombMultiplier: val };
    }

    const randCandy = CANDIES[Math.floor(Math.random() * CANDIES.length)];
    return { uid: Math.random().toString(), candyId: randCandy.id };
  };

  useEffect(() => {
    const newGrid: BonanzaCell[][] = [];
    for (let c = 0; c < 6; c++) {
      const col: BonanzaCell[] = [];
      for (let r = 0; r < 5; r++) {
        col.push(getRandomCandyCell());
      }
      newGrid.push(col);
    }
    setGrid(newGrid);
  }, []);

  const spin = async (isFreeSpin = false, currentBet = bet) => {
    if (isSpinning) return;

    if (!isFreeSpin) {
      if (chips < currentBet) {
        casinoAudio.playLose();
        return;
      }
      casinoAudio.playChipClink();
      onLose(currentBet, `Sweet Bonanza Bet ($${currentBet})`);
    }

    setIsSpinning(true);
    setTumbleWin(0);
    setRoundBombMultiplier(0);
    setSugarBombExplode(false);

    // Evaluate win status via Global RTP Engine
    const isWinRound = evaluateLiveGameRound(undefined, rtpBias);

    // Initial spin fill
    casinoAudio.playWheelSpin(0.1);
    let currentGrid: BonanzaCell[][] = [];
    if (!isWinRound && !isFreeSpin) {
      // Force losing grid (max 5 of any candy, no scatters)
      const baseCandies = CANDIES.map((c) => c.id);
      const pool: string[] = [];
      for (const cId of baseCandies.slice(0, 6)) {
        for (let i = 0; i < 5; i++) pool.push(cId);
      }
      pool.sort(() => Math.random() - 0.5);
      let idx = 0;
      for (let c = 0; c < 6; c++) {
        const col: BonanzaCell[] = [];
        for (let r = 0; r < 5; r++) {
          col.push({ uid: Math.random().toString(), candyId: pool[idx++] || baseCandies[0] });
        }
        currentGrid.push(col);
      }
    } else {
      for (let c = 0; c < 6; c++) {
        const col: BonanzaCell[] = [];
        for (let r = 0; r < 5; r++) {
          col.push(getRandomCandyCell());
        }
        currentGrid.push(col);
      }
    }
    setGrid(currentGrid);
    await new Promise((res) => setTimeout(res, 350));

    // Tumbling Engine Loop
    let accumulatedWin = 0;
    let accumulatedBombs: number[] = [];
    let keepsTumbling = true;
    let scatterCount = 0;

    while (keepsTumbling) {
      const counts: Record<string, number> = {};
      scatterCount = 0;

      for (let c = 0; c < 6; c++) {
        for (let r = 0; r < 5; r++) {
          const item = currentGrid[c][r];
          if (item.isScatter) {
            scatterCount++;
          } else if (!item.bombMultiplier) {
            counts[item.candyId] = (counts[item.candyId] || 0) + 1;
          }
        }
      }

      const winningCandyIds = new Set<string>();
      let tumbleBaseWin = 0;

      Object.entries(counts).forEach(([candyId, cnt]) => {
        if (cnt >= 8) {
          winningCandyIds.add(candyId);
          const def = CANDIES.find((c) => c.id === candyId);
          if (def) {
            const scale = cnt >= 12 ? 1.0 : cnt >= 10 ? 0.6 : 0.35;
            tumbleBaseWin += currentBet * (def.basePayout * scale / 10);
          }
        }
      });

      if (winningCandyIds.size > 0) {
        casinoAudio.playWin();

        // Mark winners
        currentGrid = currentGrid.map((col) =>
          col.map((item) => {
            if (winningCandyIds.has(item.candyId)) {
              return { ...item, isWinning: true };
            }
            return item;
          })
        );
        setGrid([...currentGrid]);
        await new Promise((res) => setTimeout(res, 400));

        // Collect Sugar Bombs
        for (let c = 0; c < 6; c++) {
          for (let r = 0; r < 5; r++) {
            if (currentGrid[c][r].bombMultiplier) {
              accumulatedBombs.push(currentGrid[c][r].bombMultiplier!);
              setSugarBombExplode(true);
            }
          }
        }

        accumulatedWin += tumbleBaseWin;
        setTumbleWin(accumulatedWin);

        // Tumble new candies
        const tumbledGrid: BonanzaCell[][] = [];
        for (let c = 0; c < 6; c++) {
          const remaining = currentGrid[c].filter((item) => !item.isWinning);
          const needed = 5 - remaining.length;
          const newTop: BonanzaCell[] = [];
          for (let i = 0; i < needed; i++) {
            newTop.push(getRandomCandyCell());
          }
          tumbledGrid.push([...newTop, ...remaining]);
        }

        currentGrid = tumbledGrid;
        setGrid([...currentGrid]);
        await new Promise((res) => setTimeout(res, 400));
      } else {
        keepsTumbling = false;
      }
    }

    // Check 4+ Lollipop Scatters for 10 Free Spins
    if (scatterCount >= 4) {
      casinoAudio.playJackpot();
      setFreeSpinsLeft((prev) => prev + 10);
    }

    const bombMultSum = accumulatedBombs.reduce((a, b) => a + b, 0);
    const finalMult = Math.max(1, bombMultSum);
    setRoundBombMultiplier(finalMult);

    const finalWin = Math.floor(accumulatedWin * finalMult);

    if (finalWin > 0) {
      casinoAudio.playWin();
      if (isFreeSpin) {
        setTotalFreeSpinsWin((prev) => prev + finalWin);
      } else {
        onWin(finalWin, `Sweet Bonanza Win ${finalMult > 1 ? `(${finalMult}x Sugar Bomb Multiplier)` : ''} -> $${finalWin}`);
      }
    }

    setIsSpinning(false);

    // Continue Free Spins automatically if active
    if (isFreeSpin) {
      if (freeSpinsLeft > 1) {
        setFreeSpinsLeft((prev) => prev - 1);
        setTimeout(() => spin(true, currentBet), 600);
      } else {
        const bonusTotal = totalFreeSpinsWin + finalWin;
        if (bonusTotal > 0) {
          onWin(bonusTotal, `Sweet Bonanza Free Spins Bonus Total ($${bonusTotal})`);
        }
        setFreeSpinsLeft(0);
        setTotalFreeSpinsWin(0);
      }
    } else if (scatterCount >= 4) {
      setFreeSpinsLeft(10);
      setTotalFreeSpinsWin(0);
      setTimeout(() => spin(true, currentBet), 1000);
    }
  };

  const buyBonus = () => {
    const bonusCost = bet * 100;
    if (chips < bonusCost || isSpinning) return;

    casinoAudio.playChipClink();
    onLose(bonusCost, `Buy Sweet Bonanza 10 Free Spins ($${bonusCost})`);
    setFreeSpinsLeft(10);
    setTotalFreeSpinsWin(0);

    setTimeout(() => spin(true, bet), 500);
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-slate-950 border border-pink-500/30 rounded-2xl p-4 sm:p-6 text-white shadow-2xl relative overflow-hidden backdrop-blur-xl">
      {/* Background Sweet Glow */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-gradient-to-b from-pink-500/15 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800/80 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-400 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/20">
            <Cake className="w-6 h-6 text-white stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-wide bg-gradient-to-r from-pink-300 via-rose-200 to-purple-400 bg-clip-text text-transparent">
                SWEET BONANZA
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-pink-500/20 border border-pink-500/40 text-pink-300 rounded-full uppercase tracking-wider">
                SUGAR BOMB TUMBLE
              </span>
            </div>
            <p className="text-xs text-slate-400">Match 8+ identical candies anywhere on grid + Exploding Sugar Bombs up to 100x</p>
          </div>
        </div>

        {/* Balance Display */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-pink-500/30 px-4 py-2 rounded-xl shadow-inner">
          <Coins className="w-5 h-5 text-amber-400" />
          <span className="text-xs text-slate-400 font-medium">Balance:</span>
          <span className="text-base font-bold text-amber-300">${chips.toLocaleString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side Controls */}
        <div className="lg:col-span-4 flex flex-col gap-4 bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl">
          {/* Bet Amount */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
              <span>BET AMOUNT ($)</span>
              <span className="text-[10px] text-pink-400">MIN $0.10 • MAX $5,000</span>
            </label>
            <div className="relative">
              <input
                type="number"
                disabled={isSpinning || freeSpinsLeft > 0}
                value={bet}
                onChange={(e) => setBet(Math.max(0.10, Math.min(5000, Number(e.target.value))))}
                className="w-full bg-slate-950 border border-slate-700 focus:border-pink-500 rounded-xl px-4 py-2.5 text-amber-300 font-bold text-lg outline-none disabled:opacity-50 transition-all"
              />
              <span className="absolute right-3 top-3 text-xs font-bold text-slate-500">USD</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 mt-2">
              {quickBets.map((val) => (
                <button
                  key={val}
                  disabled={isSpinning || freeSpinsLeft > 0}
                  onClick={() => setBet(val)}
                  className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    bet === val
                      ? "bg-pink-500/20 border-pink-500 text-pink-300"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  } disabled:opacity-40`}
                >
                  ${val}
                </button>
              ))}
            </div>
          </div>

          {/* Feature Buy */}
          <div className="bg-gradient-to-br from-pink-950/40 via-purple-950/40 to-slate-950 border border-pink-500/40 p-3.5 rounded-xl flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-pink-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-pink-400" /> BUY 10 FREE SPINS
              </span>
              <span className="text-xs font-bold text-pink-400">100x BET (${bet * 100})</span>
            </div>
            <button
              disabled={isSpinning || freeSpinsLeft > 0 || chips < bet * 100}
              onClick={buyBonus}
              className="w-full py-2.5 rounded-lg text-xs font-black bg-gradient-to-r from-pink-400 via-rose-300 to-purple-400 text-slate-950 hover:from-pink-300 hover:to-rose-300 shadow-md shadow-pink-500/20 disabled:opacity-40 transition-all"
            >
              FEATURE BUY (${(bet * 100).toLocaleString()})
            </button>
          </div>

          {/* Free Spins Counter */}
          <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Sugar Bomb Multiplier:</span>
              <span className="font-black text-pink-400 text-base">{roundBombMultiplier > 0 ? `${roundBombMultiplier}x` : "1x"}</span>
            </div>
            {freeSpinsLeft > 0 && (
              <div className="flex justify-between items-center text-xs border-t border-slate-800 pt-2 text-pink-300">
                <span className="font-extrabold">FREE SPINS REMAINING:</span>
                <span className="font-black text-lg text-amber-300">{freeSpinsLeft}</span>
              </div>
            )}
          </div>

          {/* Spin Action */}
          <button
            disabled={isSpinning}
            onClick={() => spin(false, bet)}
            className={`w-full py-4 rounded-xl font-black transition-all shadow-xl flex items-center justify-center gap-2 text-lg tracking-wide ${
              isSpinning
                ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                : "bg-gradient-to-r from-pink-400 via-rose-300 to-pink-500 hover:from-pink-300 hover:to-rose-300 text-slate-950 shadow-pink-500/30 cursor-pointer"
            }`}
          >
            <Play className="w-6 h-6 fill-slate-950" />
            {isSpinning ? "CANDY TUMBLING..." : `SPIN BONANZA ($${bet})`}
          </button>
        </div>

        {/* Right 6x5 Grid */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl relative">
          <AnimatePresence>
            {sugarBombExplode && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-2 right-4 z-20 bg-pink-500/20 border border-pink-400 px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-black text-pink-300 shadow-lg shadow-pink-500/40 animate-pulse"
              >
                <Sparkles className="w-4 h-4 text-yellow-300 animate-spin" />
                SUGAR BOMB EXPLODED!
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-6 gap-2 w-full max-w-[540px] aspect-[6/5] my-auto p-2.5 bg-slate-950/90 rounded-2xl border border-pink-500/30 shadow-2xl">
            {grid.map((col, cIdx) => (
              <div key={cIdx} className="flex flex-col gap-2">
                {col.map((cell) => {
                  let candyDef = CANDIES.find((c) => c.id === cell.candyId);

                  return (
                    <motion.div
                      key={cell.uid}
                      layout
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1, scale: cell.isWinning ? [1, 1.15, 0] : 1 }}
                      transition={{ duration: 0.25 }}
                      className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center border shadow-md relative overflow-hidden bg-gradient-to-br ${
                        cell.isScatter
                          ? "from-pink-500/30 via-rose-600/30 to-purple-950 border-pink-400 shadow-pink-500/40"
                          : cell.bombMultiplier
                          ? "from-amber-900/60 to-rose-950 border-amber-400 shadow-amber-500/40"
                          : candyDef?.bg || "from-slate-900 to-slate-950 border-slate-800"
                      }`}
                    >
                      {cell.isScatter ? (
                        <div className="flex flex-col items-center">
                          <span className="text-2xl sm:text-3xl">🍭</span>
                          <span className="text-[9px] font-black text-pink-300 uppercase">BONANZA</span>
                        </div>
                      ) : cell.bombMultiplier ? (
                        <div className="flex flex-col items-center">
                          <span className="text-xl sm:text-2xl">💣</span>
                          <span className="text-xs sm:text-sm font-black text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.9)]">
                            {cell.bombMultiplier}x
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <span className="text-xl sm:text-2xl">{candyDef?.icon || "🍬"}</span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="w-full flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-3 mt-4 px-2">
            <div>
              Tumble Win: <span className="text-emerald-400 font-extrabold">${tumbleWin.toLocaleString()}</span>
            </div>
            <div>
              Sugar Multiplier: <span className="text-pink-300 font-extrabold">{roundBombMultiplier > 0 ? `${roundBombMultiplier}x` : "1x"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SweetBonanzaGame;
