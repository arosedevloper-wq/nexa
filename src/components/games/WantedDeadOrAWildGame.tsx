import React, { useState, useEffect } from "react";
import { Coins, Play, Sparkles, Flame, ShieldAlert, Crown, RotateCcw, Crosshair, Skull, Zap } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../../lib/audioService";
import { evaluateLiveGameRound } from "../../constants/liveGameConfig";

interface WantedDeadOrAWildGameProps {
  chips: number;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest?: (type: "greet" | "win" | "lose") => void;
  rtpBias?: string;
}

interface SymbolDef {
  id: string;
  name: string;
  icon: string;
  bg: string;
  basePayout: number;
}

const SYMBOLS: SymbolDef[] = [
  { id: "bull_skull", name: "Bull Skull", icon: "💀", bg: "from-amber-950/80 to-stone-950 border-amber-600/50", basePayout: 20 },
  { id: "outlaw", name: "Outlaw Mask", icon: "🤠", bg: "from-amber-900/60 to-red-950/80 border-amber-500/50", basePayout: 12 },
  { id: "whiskey", name: "Whiskey Jug", icon: "🍾", bg: "from-amber-950/60 to-orange-950/80 border-amber-600/50", basePayout: 8 },
  { id: "revolver", name: "Revolver", icon: "🔫", bg: "from-slate-900 to-amber-950/60 border-slate-700", basePayout: 5 },
  { id: "money_bag", name: "Money Bag", icon: "💰", bg: "from-yellow-950/60 to-amber-950/80 border-yellow-500/50", basePayout: 4 },
  { id: "card_a", name: "Ace", icon: "🅰️", bg: "from-slate-950 to-stone-900 border-slate-800", basePayout: 2 },
  { id: "card_k", name: "King", icon: "👑", bg: "from-slate-950 to-stone-900 border-slate-800", basePayout: 1.5 },
];

interface CellItem {
  uid: string;
  symbolId: string;
  isVS?: boolean;
  isWild?: boolean;
  isScatterVS?: boolean;
  isScatterTrain?: boolean;
  vsMultiplier?: number;
  isWinning?: boolean;
}

export const WantedDeadOrAWildGame: React.FC<WantedDeadOrAWildGameProps> = ({
  chips,
  onWin,
  onLose,
  onCommentaryRequest,
  rtpBias,
}) => {
  const [bet, setBet] = useState<number>(50);
  const [grid, setGrid] = useState<CellItem[][]>([]);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [freeSpinsLeft, setFreeSpinsLeft] = useState<number>(0);
  const [bonusMode, setBonusMode] = useState<"DUEL" | "TRAIN" | null>(null);
  const [totalBonusWin, setTotalBonusWin] = useState<number>(0);
  const [activeDuelMults, setActiveDuelMults] = useState<number[]>([]);
  const [lastWinAmount, setLastWinAmount] = useState<number | null>(null);

  const quickBets = [10, 25, 50, 100, 250, 500];

  const getRandomCell = (): CellItem => {
    // 3% VS Symbol (triggers Duel reel expansion + multiplier 2x to 100x)
    if (Math.random() < 0.035) {
      const mults = [2, 3, 4, 5, 10, 25, 50, 100];
      const m = mults[Math.floor(Math.random() * mults.length)];
      return { uid: Math.random().toString(), symbolId: "vs", isVS: true, vsMultiplier: m };
    }
    // 2.5% Duel Scatter
    if (Math.random() < 0.025) {
      return { uid: Math.random().toString(), symbolId: "scatter_duel", isScatterVS: true };
    }
    // 2.5% Train Robbery Scatter
    if (Math.random() < 0.025) {
      return { uid: Math.random().toString(), symbolId: "scatter_train", isScatterTrain: true };
    }
    // 4% Wild
    if (Math.random() < 0.04) {
      return { uid: Math.random().toString(), symbolId: "wild", isWild: true };
    }

    const rand = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    return { uid: Math.random().toString(), symbolId: rand.id };
  };

  useEffect(() => {
    const newGrid: CellItem[][] = [];
    for (let c = 0; c < 5; c++) {
      const col: CellItem[] = [];
      for (let r = 0; r < 5; r++) {
        col.push(getRandomCell());
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
      onLose(currentBet, `Wanted Dead or a Wild Bet ($${currentBet})`);
    }

    setIsSpinning(true);
    setLastWinAmount(null);
    setActiveDuelMults([]);

    casinoAudio.playWheelSpin(0.1);

    const isWinAllowed = evaluateLiveGameRound(undefined, rtpBias);

    // 5x5 spin reel generation
    let currentGrid: CellItem[][] = [];
    let duelScatters = 0;
    let trainScatters = 0;
    const collectedVSMults: number[] = [];

    if (!isWinAllowed && !isFreeSpin) {
      // Force low-paying non-matching grid
      const baseSyms = SYMBOLS.slice(4);
      for (let c = 0; c < 5; c++) {
        const col: CellItem[] = [];
        for (let r = 0; r < 5; r++) {
          const s = baseSyms[(c * 2 + r) % baseSyms.length];
          col.push({ uid: Math.random().toString(), symbolId: s.id });
        }
        currentGrid.push(col);
      }
    } else {
      for (let c = 0; c < 5; c++) {
        const col: CellItem[] = [];
        for (let r = 0; r < 5; r++) {
          const item = getRandomCell();
          if (item.isScatterVS) duelScatters++;
          if (item.isScatterTrain) trainScatters++;
          if (item.isVS && item.vsMultiplier) {
            collectedVSMults.push(item.vsMultiplier);
          }
          col.push(item);
        }
        currentGrid.push(col);
      }
    }

    setGrid(currentGrid);
    await new Promise((res) => setTimeout(res, 450));

    // Handle VS Reel Expansion
    if (collectedVSMults.length > 0) {
      casinoAudio.playWin();
      setActiveDuelMults(collectedVSMults);
      // Expand VS columns to full Wilds with multipliers
      currentGrid = currentGrid.map((col) => {
        const hasVS = col.some((item) => item.isVS);
        if (hasVS) {
          const vsItem = col.find((item) => item.isVS);
          return col.map((item) => ({
            ...item,
            symbolId: "wild_vs",
            isWild: true,
            vsMultiplier: vsItem?.vsMultiplier || 2,
          }));
        }
        return col;
      });
      setGrid([...currentGrid]);
      await new Promise((res) => setTimeout(res, 400));
    }

    // Evaluate 5-in-a-row paylines across 5 rows
    let totalWin = 0;
    const multSum = collectedVSMults.reduce((a, b) => a + b, 1);

    for (let r = 0; r < 5; r++) {
      const firstSym = currentGrid[0][r];
      let matchCount = 1;
      let targetId = firstSym.symbolId;

      for (let c = 1; c < 5; c++) {
        const item = currentGrid[c][r];
        if (item.symbolId === targetId || item.isWild || targetId === "wild" || targetId === "wild_vs") {
          matchCount++;
          if ((targetId === "wild" || targetId === "wild_vs") && !item.isWild) {
            targetId = item.symbolId;
          }
        } else {
          break;
        }
      }

      if (matchCount >= 3) {
        const def = SYMBOLS.find((s) => s.id === targetId) || SYMBOLS[0];
        const payScale = matchCount === 5 ? 1.0 : matchCount === 4 ? 0.5 : 0.2;
        totalWin += currentBet * def.basePayout * payScale * multSum;
      }
    }

    const finalWin = Math.floor(totalWin);

    if (finalWin > 0) {
      casinoAudio.playWin();
      setLastWinAmount(finalWin);
      if (isFreeSpin) {
        setTotalBonusWin((prev) => prev + finalWin);
      } else {
        onWin(finalWin, `Wanted Dead or a Wild Win ${multSum > 1 ? `(Duel Mult ${multSum}x)` : ''} -> $${finalWin}`);
      }
    }

    setIsSpinning(false);

    // Free Spins Trigger Check
    if (duelScatters >= 3 && !isFreeSpin) {
      casinoAudio.playJackpot();
      setBonusMode("DUEL");
      setFreeSpinsLeft(10);
      setTotalBonusWin(0);
      setTimeout(() => spin(true, currentBet), 1000);
    } else if (trainScatters >= 3 && !isFreeSpin) {
      casinoAudio.playJackpot();
      setBonusMode("TRAIN");
      setFreeSpinsLeft(10);
      setTotalBonusWin(0);
      setTimeout(() => spin(true, currentBet), 1000);
    } else if (isFreeSpin) {
      if (freeSpinsLeft > 1) {
        setFreeSpinsLeft((prev) => prev - 1);
        setTimeout(() => spin(true, currentBet), 600);
      } else {
        const bonusTotal = totalBonusWin + finalWin;
        if (bonusTotal > 0) {
          onWin(bonusTotal, `Wanted Free Spins [${bonusMode}] Total ($${bonusTotal})`);
        }
        setFreeSpinsLeft(0);
        setBonusMode(null);
        setTotalBonusWin(0);
      }
    }
  };

  const buyBonus = (mode: "DUEL" | "TRAIN") => {
    const cost = bet * 100;
    if (chips < cost || isSpinning) return;

    casinoAudio.playChipClink();
    onLose(cost, `Buy Wanted [${mode}] 10 Free Spins ($${cost})`);
    setBonusMode(mode);
    setFreeSpinsLeft(10);
    setTotalBonusWin(0);

    setTimeout(() => spin(true, bet), 500);
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-stone-950 border border-amber-600/40 rounded-2xl p-4 sm:p-6 text-white shadow-2xl relative overflow-hidden backdrop-blur-xl">
      {/* Background Atmosphere */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-gradient-to-b from-amber-600/15 via-red-950/20 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-amber-900/60 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-600 to-red-800 flex items-center justify-center shadow-lg shadow-amber-600/20 border border-amber-500/40">
            <Crosshair className="w-6 h-6 text-amber-200 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-wide bg-gradient-to-r from-amber-400 via-orange-300 to-red-400 bg-clip-text text-transparent">
                WANTED DEAD OR A WILD
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-600/20 border border-amber-500/40 text-amber-300 rounded-full uppercase tracking-wider">
                DUEL EXPANDING WILDS UP TO 100X
              </span>
            </div>
            <p className="text-xs text-stone-400">Land VS symbols to trigger reel duel wild multipliers + 2 Legendary Bonus Rounds!</p>
          </div>
        </div>

        {/* Balance Display */}
        <div className="flex items-center gap-2 bg-stone-900/90 border border-amber-500/40 px-4 py-2 rounded-xl shadow-inner">
          <Coins className="w-5 h-5 text-amber-400" />
          <span className="text-xs text-stone-400 font-medium">Balance:</span>
          <span className="text-base font-bold text-amber-300">${chips.toLocaleString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side Controls */}
        <div className="lg:col-span-4 flex flex-col gap-4 bg-stone-900/60 border border-amber-900/40 p-4 rounded-xl">
          {/* Bet Selector */}
          <div>
            <label className="text-xs font-semibold text-stone-300 mb-2 flex items-center justify-between">
              <span>BET AMOUNT ($)</span>
              <span className="text-[10px] text-amber-400">MIN $0.10 • MAX $5,000</span>
            </label>
            <div className="relative">
              <input
                type="number"
                disabled={isSpinning || freeSpinsLeft > 0}
                value={bet}
                onChange={(e) => setBet(Math.max(0.10, Math.min(5000, Number(e.target.value))))}
                className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-amber-300 font-bold text-lg outline-none disabled:opacity-50 transition-all"
              />
              <span className="absolute right-3 top-3 text-xs font-bold text-stone-500">USD</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 mt-2">
              {quickBets.map((val) => (
                <button
                  key={val}
                  disabled={isSpinning || freeSpinsLeft > 0}
                  onClick={() => setBet(val)}
                  className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    bet === val
                      ? "bg-amber-600/20 border-amber-500 text-amber-300"
                      : "bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700"
                  } disabled:opacity-40`}
                >
                  ${val}
                </button>
              ))}
            </div>
          </div>

          {/* Feature Buys */}
          <div className="grid grid-cols-2 gap-2">
            <button
              disabled={isSpinning || freeSpinsLeft > 0 || chips < bet * 100}
              onClick={() => buyBonus("DUEL")}
              className="p-3 rounded-xl bg-gradient-to-br from-amber-950/60 to-red-950/80 border border-amber-500/40 text-left flex flex-col gap-1 hover:border-amber-400 disabled:opacity-40 transition-all"
            >
              <span className="text-xs font-black text-amber-300 flex items-center gap-1">
                <Skull className="w-3.5 h-3.5 text-red-400" /> DUEL AT DAWN
              </span>
              <span className="text-[10px] text-stone-400">100x BET (${bet * 100})</span>
            </button>

            <button
              disabled={isSpinning || freeSpinsLeft > 0 || chips < bet * 100}
              onClick={() => buyBonus("TRAIN")}
              className="p-3 rounded-xl bg-gradient-to-br from-orange-950/60 to-amber-950/80 border border-orange-500/40 text-left flex flex-col gap-1 hover:border-orange-400 disabled:opacity-40 transition-all"
            >
              <span className="text-xs font-black text-orange-300 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-400" /> TRAIN ROBBERY
              </span>
              <span className="text-[10px] text-stone-400">100x BET (${bet * 100})</span>
            </button>
          </div>

          {/* Bonus Counter */}
          {freeSpinsLeft > 0 && (
            <div className="bg-amber-950/80 border border-amber-500/50 p-3 rounded-xl flex justify-between items-center text-xs">
              <span className="font-bold text-amber-300">FREE SPINS [{bonusMode}]:</span>
              <span className="font-black text-lg text-amber-400">{freeSpinsLeft} LEFT</span>
            </div>
          )}

          {/* Spin Action Button */}
          <button
            disabled={isSpinning}
            onClick={() => spin(false, bet)}
            className={`w-full py-4 rounded-xl font-black transition-all shadow-xl flex items-center justify-center gap-2 text-lg tracking-wide ${
              isSpinning
                ? "bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed"
                : "bg-gradient-to-r from-amber-500 via-orange-400 to-red-500 hover:from-amber-400 hover:to-orange-300 text-stone-950 shadow-amber-600/30 cursor-pointer"
            }`}
          >
            <Play className="w-6 h-6 fill-stone-950" />
            {isSpinning ? "SPINNING REELS..." : `SPIN WANTED ($${bet})`}
          </button>
        </div>

        {/* Right 5x5 Grid Layout */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center bg-stone-900/40 border border-amber-900/40 p-4 rounded-xl relative">
          {activeDuelMults.length > 0 && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute top-2 right-4 z-20 bg-amber-500/20 border border-amber-400 px-3 py-1 rounded-full text-xs font-black text-amber-300 flex items-center gap-1.5 animate-pulse"
            >
              <Zap className="w-4 h-4 text-yellow-300" /> DUEL MULTIPLIER {activeDuelMults.join("x + ")}x!
            </motion.div>
          )}

          <div className="grid grid-cols-5 gap-2 w-full max-w-[500px] aspect-square my-auto p-2.5 bg-stone-950/90 rounded-2xl border border-amber-600/30 shadow-2xl">
            {grid.map((col, cIdx) => (
              <div key={cIdx} className="flex flex-col gap-2">
                {col.map((cell) => {
                  let symDef = SYMBOLS.find((s) => s.id === cell.symbolId);

                  return (
                    <motion.div
                      key={cell.uid}
                      layout
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center border shadow-md relative overflow-hidden bg-gradient-to-br ${
                        cell.isVS
                          ? "from-amber-600/60 via-red-800/60 to-stone-950 border-amber-400 shadow-amber-500/40"
                          : cell.isWild
                          ? "from-yellow-600/60 via-amber-700/60 to-stone-950 border-yellow-400 shadow-yellow-500/40"
                          : cell.isScatterVS || cell.isScatterTrain
                          ? "from-red-950 via-amber-950 to-stone-950 border-red-500"
                          : symDef?.bg || "from-stone-900 to-stone-950 border-stone-800"
                      }`}
                    >
                      {cell.isVS ? (
                        <div className="flex flex-col items-center">
                          <span className="text-xl sm:text-2xl font-black text-amber-300 tracking-tighter">VS</span>
                          <span className="text-[9px] font-black text-amber-400">{cell.vsMultiplier}x</span>
                        </div>
                      ) : cell.isWild ? (
                        <div className="flex flex-col items-center">
                          <span className="text-xl sm:text-2xl">⭐</span>
                          <span className="text-[9px] font-black text-yellow-300">WILD</span>
                        </div>
                      ) : cell.isScatterVS ? (
                        <div className="flex flex-col items-center">
                          <span className="text-lg sm:text-xl">⚔️</span>
                          <span className="text-[8px] font-black text-red-300">DUEL</span>
                        </div>
                      ) : cell.isScatterTrain ? (
                        <div className="flex flex-col items-center">
                          <span className="text-lg sm:text-xl">🚂</span>
                          <span className="text-[8px] font-black text-orange-300">TRAIN</span>
                        </div>
                      ) : (
                        <span className="text-xl sm:text-2xl">{symDef?.icon || "🤠"}</span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="w-full flex items-center justify-between text-xs text-stone-400 border-t border-amber-900/60 pt-3 mt-4 px-2">
            <div>
              Paylines: <span className="text-amber-300 font-extrabold">5 Horizontal Lines</span>
            </div>
            {lastWinAmount !== null && (
              <div className="text-emerald-400 font-black">
                Win: +${lastWinAmount.toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WantedDeadOrAWildGame;
