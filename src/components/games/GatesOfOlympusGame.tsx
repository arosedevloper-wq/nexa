import React, { useState, useEffect } from "react";
import { Coins, Play, Sparkles, Zap, RotateCcw, Flame, Trophy, Crown, ShieldAlert, FastForward } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../../lib/audioService";
import { evaluateLiveGameRound } from "../../constants/liveGameConfig";

interface GatesOfOlympusGameProps {
  chips: number;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest?: (type: "greet" | "win" | "lose") => void;
  rtpBias?: string;
}

interface SymbolDef {
  id: string;
  name: string;
  icon?: string;
  iconChar?: string;
  color: string;
  bg: string;
  basePayout: number; // payout multiplier for 12+ match
}

const SYMBOLS: SymbolDef[] = [
  { id: "crown", name: "Crown of Gods", icon: "👑", color: "text-amber-400", bg: "from-amber-900/60 to-yellow-950/80 border-amber-500/50", basePayout: 50 },
  { id: "hourglass", name: "Golden Hourglass", icon: "⌛", color: "text-amber-300", bg: "from-amber-950/60 to-orange-950/80 border-amber-600/50", basePayout: 25 },
  { id: "ring", name: "Ruby Ring", icon: "💍", color: "text-rose-400", bg: "from-rose-950/60 to-red-950/80 border-rose-500/50", basePayout: 15 },
  { id: "goblet", name: "Gold Goblet", icon: "🏆", color: "text-yellow-400", bg: "from-yellow-950/60 to-amber-950/80 border-yellow-500/50", basePayout: 12 },
  { id: "gem_red", name: "Red Gem", icon: "💎", color: "text-red-400", bg: "from-red-950/50 to-slate-900 border-red-500/40", basePayout: 10 },
  { id: "gem_purple", name: "Purple Gem", icon: "🔮", color: "text-purple-400", bg: "from-purple-950/50 to-slate-900 border-purple-500/40", basePayout: 8 },
  { id: "gem_yellow", name: "Yellow Gem", icon: "⭐", color: "text-amber-400", bg: "from-amber-950/50 to-slate-900 border-amber-500/40", basePayout: 5 },
  { id: "gem_green", name: "Green Gem", icon: "Emerald", iconChar: "❇️", color: "text-emerald-400", bg: "from-emerald-950/50 to-slate-900 border-emerald-500/40", basePayout: 4 },
  { id: "gem_blue", name: "Blue Gem", iconChar: "🔷", color: "text-cyan-400", bg: "from-cyan-950/50 to-slate-900 border-cyan-500/40", basePayout: 2 },
];

interface CellItem {
  uid: string;
  symbolId: string;
  multiplier?: number;
  isScatter?: boolean;
  isWinning?: boolean;
}

export const GatesOfOlympusGame: React.FC<GatesOfOlympusGameProps> = ({
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
  const [totalFreeSpinsWin, setTotalFreeSpinsWin] = useState<number>(0);
  const [globalMultiplier, setGlobalMultiplier] = useState<number>(0);
  const [roundMultiplier, setRoundMultiplier] = useState<number>(0);
  const [tumbleWin, setTumbleWin] = useState<number>(0);
  const [zeusLightning, setZeusLightning] = useState<boolean>(false);
  const [multiplierOrbsDropped, setMultiplierOrbsDropped] = useState<number[]>([]);
  const [autoSpin, setAutoSpin] = useState<boolean>(false);

  const quickBets = [10, 25, 50, 100, 250, 500];

  // Helper to generate a random grid cell
  const getRandomCell = (): CellItem => {
    const isScatter = Math.random() < 0.04;
    if (isScatter) {
      return { uid: Math.random().toString(), symbolId: "zeus", isScatter: true };
    }
    const isMult = Math.random() < 0.06;
    if (isMult) {
      const mults = [2, 3, 5, 8, 10, 15, 25, 50, 100, 250, 500];
      const weights = [35, 25, 15, 10, 7, 4, 2, 1, 0.6, 0.3, 0.1];
      let sum = weights.reduce((a, b) => a + b, 0);
      let rand = Math.random() * sum;
      let chosen = 2;
      for (let i = 0; i < mults.length; i++) {
        if (rand < weights[i]) {
          chosen = mults[i];
          break;
        }
        rand -= weights[i];
      }
      return { uid: Math.random().toString(), symbolId: "multiplier", multiplier: chosen };
    }

    const randSym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    return { uid: Math.random().toString(), symbolId: randSym.id };
  };

  // Generate initial grid 6 cols x 5 rows
  useEffect(() => {
    const newGrid: CellItem[][] = [];
    for (let c = 0; c < 6; c++) {
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
        setAutoSpin(false);
        return;
      }
      casinoAudio.playChipClink();
      onLose(currentBet, `Gates of Olympus Bet ($${currentBet})`);
    }

    setIsSpinning(true);
    setTumbleWin(0);
    setRoundMultiplier(0);
    setZeusLightning(false);
    setMultiplierOrbsDropped([]);

    // Evaluate round win/loss status via Global RTP Engine
    const isWinRound = evaluateLiveGameRound(undefined, rtpBias);

    // Generate initial tumble grid
    casinoAudio.playWheelSpin(0.1);
    let currentGrid: CellItem[][] = [];
    if (!isWinRound && !isFreeSpin) {
      // Force non-winning grid (max 5 of any symbol, no scatters)
      const baseSymbols = SYMBOLS.map((s) => s.id);
      const pool: string[] = [];
      for (const sId of baseSymbols.slice(0, 6)) {
        for (let i = 0; i < 5; i++) pool.push(sId);
      }
      pool.sort(() => Math.random() - 0.5);
      let idx = 0;
      for (let c = 0; c < 6; c++) {
        const col: CellItem[] = [];
        for (let r = 0; r < 5; r++) {
          col.push({ uid: Math.random().toString(), symbolId: pool[idx++] || baseSymbols[0] });
        }
        currentGrid.push(col);
      }
    } else {
      for (let c = 0; c < 6; c++) {
        const col: CellItem[] = [];
        for (let r = 0; r < 5; r++) {
          col.push(getRandomCell());
        }
        currentGrid.push(col);
      }
    }
    setGrid(currentGrid);
    await new Promise((res) => setTimeout(res, 350));

    // Process Tumble Engine Loop
    let accumulatedWin = 0;
    let accumulatedMults: number[] = [];
    let keepsTumbling = true;
    let scatterCount = 0;

    while (keepsTumbling) {
      // 1. Count symbol frequencies
      const counts: Record<string, number> = {};
      scatterCount = 0;

      for (let c = 0; c < 6; c++) {
        for (let r = 0; r < 5; r++) {
          const item = currentGrid[c][r];
          if (item.isScatter) {
            scatterCount++;
          } else if (!item.multiplier) {
            counts[item.symbolId] = (counts[item.symbolId] || 0) + 1;
          }
        }
      }

      // 2. Identify winning symbols (8+ required for payout)
      const winningSymbolIds = new Set<string>();
      let tumbleBaseWin = 0;

      Object.entries(counts).forEach(([symId, cnt]) => {
        if (cnt >= 8) {
          winningSymbolIds.add(symId);
          const def = SYMBOLS.find((s) => s.id === symId);
          if (def) {
            const scale = cnt >= 12 ? 1.0 : cnt >= 10 ? 0.6 : 0.35;
            tumbleBaseWin += currentBet * (def.basePayout * scale / 10);
          }
        }
      });

      if (winningSymbolIds.size > 0) {
        // We have winning matches!
        casinoAudio.playWin();

        // Mark winning cells
        currentGrid = currentGrid.map((col) =>
          col.map((item) => {
            if (winningSymbolIds.has(item.symbolId)) {
              return { ...item, isWinning: true };
            }
            return item;
          })
        );
        setGrid([...currentGrid]);
        await new Promise((res) => setTimeout(res, 400));

        // Collect any multipliers present in grid
        for (let c = 0; c < 6; c++) {
          for (let r = 0; r < 5; r++) {
            if (currentGrid[c][r].multiplier) {
              const val = currentGrid[c][r].multiplier!;
              accumulatedMults.push(val);
              setZeusLightning(true);
            }
          }
        }

        accumulatedWin += tumbleBaseWin;
        setTumbleWin(accumulatedWin);

        // Remove winning cells and tumble new ones down
        const tumbledGrid: CellItem[][] = [];
        for (let c = 0; c < 6; c++) {
          const remaining = currentGrid[c].filter((item) => !item.isWinning);
          const needed = 5 - remaining.length;
          const newTop: CellItem[] = [];
          for (let i = 0; i < needed; i++) {
            newTop.push(getRandomCell());
          }
          tumbledGrid.push([...newTop, ...remaining]);
        }

        currentGrid = tumbledGrid;
        setGrid([...currentGrid]);
        await new Promise((res) => setTimeout(res, 400));
      } else {
        // Check for standalone multipliers if there was any win
        if (accumulatedWin > 0) {
          for (let c = 0; c < 6; c++) {
            for (let r = 0; r < 5; r++) {
              if (currentGrid[c][r].multiplier) {
                const val = currentGrid[c][r].multiplier!;
                if (!accumulatedMults.includes(val)) {
                  accumulatedMults.push(val);
                  setZeusLightning(true);
                }
              }
            }
          }
        }
        keepsTumbling = false;
      }
    }

    // Check Zeus Scatter Free Spins Trigger (4+ Scatters)
    if (scatterCount >= 4) {
      casinoAudio.playJackpot();
      setFreeSpinsLeft((prev) => prev + 15);
    }

    // Sum up multipliers
    const totalMultSum = accumulatedMults.reduce((a, b) => a + b, 0);
    setMultiplierOrbsDropped(accumulatedMults);

    let effectiveMult = Math.max(1, totalMultSum);
    if (isFreeSpin && globalMultiplier > 0) {
      effectiveMult = Math.max(1, globalMultiplier + totalMultSum);
      setGlobalMultiplier(effectiveMult);
    } else if (totalMultSum > 0) {
      setGlobalMultiplier(totalMultSum);
    }

    setRoundMultiplier(effectiveMult);

    const finalWin = Math.floor(accumulatedWin * effectiveMult);

    if (finalWin > 0) {
      casinoAudio.playWin();
      if (isFreeSpin) {
        setTotalFreeSpinsWin((prev) => prev + finalWin);
      } else {
        onWin(finalWin, `Gates of Olympus Win ${effectiveMult > 1 ? `(${effectiveMult}x Multiplier)` : ''} -> $${finalWin}`);
      }
    }

    setIsSpinning(false);

    // Continue Free Spins automatically if active
    if (isFreeSpin) {
      if (freeSpinsLeft > 1) {
        setFreeSpinsLeft((prev) => prev - 1);
        setTimeout(() => spin(true, currentBet), 600);
      } else {
        // Free spins finished
        const bonusTotal = totalFreeSpinsWin + finalWin;
        if (bonusTotal > 0) {
          onWin(bonusTotal, `Gates of Olympus Free Spins Bonus Total ($${bonusTotal})`);
        }
        setFreeSpinsLeft(0);
        setTotalFreeSpinsWin(0);
        setGlobalMultiplier(0);
      }
    } else if (scatterCount >= 4) {
      // Start free spins round
      setFreeSpinsLeft(15);
      setTotalFreeSpinsWin(0);
      setTimeout(() => spin(true, currentBet), 1000);
    }
  };

  const buyBonus = () => {
    const bonusCost = bet * 100;
    if (chips < bonusCost || isSpinning) return;

    casinoAudio.playChipClink();
    onLose(bonusCost, `Buy Gates of Olympus 15 Free Spins ($${bonusCost})`);
    setFreeSpinsLeft(15);
    setTotalFreeSpinsWin(0);
    setGlobalMultiplier(0);

    setTimeout(() => spin(true, bet), 500);
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-slate-950 border border-amber-500/30 rounded-2xl p-4 sm:p-6 text-white shadow-2xl relative overflow-hidden backdrop-blur-xl">
      {/* Background Zeus Aura */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-gradient-to-b from-amber-500/15 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800/80 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Zap className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-wide bg-gradient-to-r from-amber-300 via-yellow-200 to-purple-400 bg-clip-text text-transparent">
                GATES OF OLYMPUS
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-full uppercase tracking-wider">
                PAY ANYWHERE SCATTER
              </span>
            </div>
            <p className="text-xs text-slate-400">8+ matching symbols payout anywhere + Zeus Lightning Multipliers up to 500x</p>
          </div>
        </div>

        {/* Balance Display */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-amber-500/30 px-4 py-2 rounded-xl shadow-inner">
          <Coins className="w-5 h-5 text-amber-400" />
          <span className="text-xs text-slate-400 font-medium">Balance:</span>
          <span className="text-base font-bold text-amber-300">${chips.toLocaleString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side Controls & Buy Feature */}
        <div className="lg:col-span-4 flex flex-col gap-4 bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl">
          {/* Bet Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
              <span>BET AMOUNT ($)</span>
              <span className="text-[10px] text-amber-400">MIN $10 • MAX $5,000</span>
            </label>
            <div className="relative">
              <input
                type="number"
                disabled={isSpinning || freeSpinsLeft > 0}
                value={bet}
                onChange={(e) => setBet(Math.max(10, Math.min(5000, Number(e.target.value))))}
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-4 py-2.5 text-amber-300 font-bold text-lg outline-none disabled:opacity-50 transition-all"
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
                      ? "bg-amber-500/20 border-amber-500 text-amber-300"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  } disabled:opacity-40`}
                >
                  ${val}
                </button>
              ))}
            </div>
          </div>

          {/* Buy Free Spins Feature Box */}
          <div className="bg-gradient-to-br from-amber-950/40 via-purple-950/40 to-slate-950 border border-amber-500/40 p-3.5 rounded-xl flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-amber-300 flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-400" /> BUY FREE SPINS
              </span>
              <span className="text-xs font-bold text-amber-400">100x BET (${bet * 100})</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Instantly trigger 15 Free Spins where Zeus Multipliers build globally!
            </p>
            <button
              disabled={isSpinning || freeSpinsLeft > 0 || chips < bet * 100}
              onClick={buyBonus}
              className="w-full py-2.5 rounded-lg text-xs font-black bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 hover:from-amber-300 hover:to-yellow-300 shadow-md shadow-amber-500/20 disabled:opacity-40 transition-all"
            >
              FEATURE BUY (${(bet * 100).toLocaleString()})
            </button>
          </div>

          {/* Active Multipliers & Free Spins Box */}
          <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Global Accumulated Multiplier:</span>
              <span className="font-black text-amber-300 text-base">{globalMultiplier > 0 ? `${globalMultiplier}x` : "1x"}</span>
            </div>
            {freeSpinsLeft > 0 && (
              <div className="flex justify-between items-center text-xs border-t border-slate-800 pt-2 text-purple-300">
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
                : "bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 shadow-amber-500/30 cursor-pointer"
            }`}
          >
            <Play className="w-6 h-6 fill-slate-950" />
            {isSpinning ? "TUMBLING..." : `SPIN OLYMPUS ($${bet})`}
          </button>
        </div>

        {/* Right 6x5 Slots Grid & Zeus Animation */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl relative">
          {/* Floating Zeus Lightning Overlay */}
          <AnimatePresence>
            {zeusLightning && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-2 right-4 z-20 bg-amber-500/20 border border-amber-400 px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-black text-amber-300 shadow-lg shadow-amber-500/40 animate-pulse"
              >
                <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300 animate-bounce" />
                ZEUS STRIKES MULTIPLIER!
              </motion.div>
            )}
          </AnimatePresence>

          {/* 6x5 Grid Layout */}
          <div className="grid grid-cols-6 gap-2 w-full max-w-[540px] aspect-[6/5] my-auto p-2.5 bg-slate-950/90 rounded-2xl border border-amber-500/30 shadow-2xl">
            {grid.map((col, cIdx) => (
              <div key={cIdx} className="flex flex-col gap-2">
                {col.map((cell) => {
                  let symDef = SYMBOLS.find((s) => s.id === cell.symbolId);

                  return (
                    <motion.div
                      key={cell.uid}
                      layout
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1, scale: cell.isWinning ? [1, 1.15, 0] : 1 }}
                      transition={{ duration: 0.25 }}
                      className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center border shadow-md relative overflow-hidden bg-gradient-to-br ${
                        cell.isScatter
                          ? "from-amber-500/30 via-yellow-600/30 to-purple-950 border-amber-400 shadow-amber-500/40"
                          : cell.multiplier
                          ? "from-purple-900/60 to-indigo-950 border-purple-400 shadow-purple-500/40"
                          : symDef?.bg || "from-slate-900 to-slate-950 border-slate-800"
                      }`}
                    >
                      {cell.isScatter ? (
                        <div className="flex flex-col items-center">
                          <span className="text-2xl sm:text-3xl">⚡</span>
                          <span className="text-[9px] font-black text-amber-300 uppercase">ZEUS</span>
                        </div>
                      ) : cell.multiplier ? (
                        <div className="flex flex-col items-center">
                          <Sparkles className="w-4 h-4 text-yellow-300 animate-spin" />
                          <span className="text-sm sm:text-base font-black text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.9)]">
                            {cell.multiplier}x
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <span className="text-xl sm:text-2xl">{symDef?.icon || (symDef as any)?.iconChar || "💎"}</span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Tumble Win Summary Bar */}
          <div className="w-full flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-3 mt-4 px-2">
            <div>
              Tumble Win: <span className="text-emerald-400 font-extrabold">${tumbleWin.toLocaleString()}</span>
            </div>
            <div>
              Current Multiplier: <span className="text-amber-300 font-extrabold">{roundMultiplier > 0 ? `${roundMultiplier}x` : "1x"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GatesOfOlympusGame;
