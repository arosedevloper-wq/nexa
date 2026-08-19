import React, { useState, useEffect } from "react";
import { Coins, Play, Sparkles, ShieldAlert, Crown, RotateCcw, Lock, Unlock, Flame, Zap } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../../lib/audioService";
import { evaluateLiveGameRound } from "../../constants/liveGameConfig";

interface SanQuentinGameProps {
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

const INMATES: SymbolDef[] = [
  { id: "beef_dick", name: "Beef Dick", icon: "🗿", bg: "from-red-950/80 to-stone-950 border-red-600/60", basePayout: 40 },
  { id: "loco_luis", name: "Loco Luis", icon: "🤡", bg: "from-orange-950/80 to-stone-950 border-orange-600/60", basePayout: 25 },
  { id: "heinrich", name: "Heinrich", icon: "🪖", bg: "from-amber-950/80 to-stone-950 border-amber-600/60", basePayout: 18 },
  { id: "biker_bill", name: "Biker Bill", icon: "🧔", bg: "from-purple-950/80 to-stone-950 border-purple-600/60", basePayout: 12 },
  { id: "crazy_joe", name: "Crazy Joe", icon: "😼", bg: "from-slate-900 to-stone-950 border-slate-700", basePayout: 8 },
  { id: "handcuffs", name: "Handcuffs", icon: "⛓️", bg: "from-stone-900 to-stone-950 border-stone-800", basePayout: 4 },
  { id: "soap", name: "Soap", icon: "🧼", bg: "from-stone-900 to-stone-950 border-stone-800", basePayout: 2 },
  { id: "lighter", name: "Lighter", icon: "🪵", bg: "from-stone-900 to-stone-950 border-stone-800", basePayout: 1 },
];

interface CellItem {
  uid: string;
  symbolId: string;
  isXWays?: boolean;
  xWaysMultiplier?: number;
  isRazorSplit?: boolean;
  isJumpingWild?: boolean;
  wildMultiplier?: number;
  isScatter?: boolean;
}

export const SanQuentinGame: React.FC<SanQuentinGameProps> = ({
  chips,
  onWin,
  onLose,
  onCommentaryRequest,
  rtpBias,
}) => {
  const [bet, setBet] = useState<number>(50);
  const [mainGrid, setMainGrid] = useState<CellItem[][]>([]);
  const [topEnhancers, setTopEnhancers] = useState<{ open: boolean; content: string }[]>(
    Array(5).fill({ open: false, content: "LOCKED" })
  );
  const [bottomEnhancers, setBottomEnhancers] = useState<{ open: boolean; content: string }[]>(
    Array(5).fill({ open: false, content: "LOCKED" })
  );

  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [freeSpinsLeft, setFreeSpinsLeft] = useState<number>(0);
  const [totalBonusWin, setTotalBonusWin] = useState<number>(0);
  const [jumpingWilds, setJumpingWilds] = useState<{ reel: number; row: number; mult: number }[]>([]);
  const [activePayways, setActivePayways] = useState<number>(243);
  const [lastWinAmount, setLastWinAmount] = useState<number | null>(null);

  const quickBets = [10, 25, 50, 100, 250, 500];

  const getRandomCell = (): CellItem => {
    // 3.5% xWays symbol (splits into 2x or 3x identical inmate symbols)
    if (Math.random() < 0.035) {
      const mult = Math.random() < 0.5 ? 2 : 3;
      return { uid: Math.random().toString(), symbolId: "xways", isXWays: true, xWaysMultiplier: mult };
    }
    // 2.5% Razor Split (splits row symbols)
    if (Math.random() < 0.025) {
      return { uid: Math.random().toString(), symbolId: "razor", isRazorSplit: true };
    }
    // 3% Guard Tower Scatter
    if (Math.random() < 0.03) {
      return { uid: Math.random().toString(), symbolId: "scatter_tower", isScatter: true };
    }

    const randInmate = INMATES[Math.floor(Math.random() * INMATES.length)];
    return { uid: Math.random().toString(), symbolId: randInmate.id };
  };

  useEffect(() => {
    const grid: CellItem[][] = [];
    for (let c = 0; c < 5; c++) {
      const col: CellItem[] = [];
      for (let r = 0; r < 3; r++) {
        col.push(getRandomCell());
      }
      grid.push(col);
    }
    setMainGrid(grid);
  }, []);

  const spin = async (isFreeSpin = false, currentBet = bet) => {
    if (isSpinning) return;

    if (!isFreeSpin) {
      if (chips < currentBet) {
        casinoAudio.playLose();
        return;
      }
      casinoAudio.playChipClink();
      onLose(currentBet, `San Quentin xWays Bet ($${currentBet})`);
    }

    setIsSpinning(true);
    setLastWinAmount(null);

    casinoAudio.playWheelSpin(0.1);

    const isWinAllowed = evaluateLiveGameRound(undefined, rtpBias);

    // 1. Generate 5x3 main grid
    let currentGrid: CellItem[][] = [];
    let scatterCount = 0;
    let totalXWaysFactor = 1;

    if (!isWinAllowed && !isFreeSpin) {
      // Force non-matching low inmate grid
      const baseInmates = INMATES.slice(2);
      for (let c = 0; c < 5; c++) {
        const col: CellItem[] = [];
        for (let r = 0; r < 3; r++) {
          const s = baseInmates[(c * 2 + r) % baseInmates.length];
          col.push({ uid: Math.random().toString(), symbolId: s.id });
        }
        currentGrid.push(col);
      }
    } else {
      for (let c = 0; c < 5; c++) {
        const col: CellItem[] = [];
        for (let r = 0; r < 3; r++) {
          const item = getRandomCell();
          if (item.isScatter) scatterCount++;
          if (item.isXWays && item.xWaysMultiplier) {
            totalXWaysFactor *= item.xWaysMultiplier;
          }
          col.push(item);
        }
        currentGrid.push(col);
      }
    }

    // 2. Unlock Enhancers based on scatters or free spin mode
    const newTop = Array(5).fill(0).map((_, idx) => {
      const shouldOpen = isFreeSpin || (idx < scatterCount);
      return {
        open: shouldOpen,
        content: shouldOpen ? (Math.random() < 0.4 ? "WILD" : "xWAYS 3x") : "LOCKED",
      };
    });
    const newBottom = Array(5).fill(0).map((_, idx) => {
      const shouldOpen = isFreeSpin || (idx < scatterCount);
      return {
        open: shouldOpen,
        content: shouldOpen ? (Math.random() < 0.3 ? "RAZOR SPLIT" : "WILD") : "LOCKED",
      };
    });

    setTopEnhancers(newTop);
    setBottomEnhancers(newBottom);

    // Dynamic Payways Calculation: Base 243 ways * xWays multipliers
    const payways = Math.min(46656, 243 * totalXWaysFactor);
    setActivePayways(payways);

    // Handle Jumping Wilds in Lockdown Spins
    let updatedJumpingWilds = [...jumpingWilds];
    if (isFreeSpin) {
      if (updatedJumpingWilds.length === 0) {
        // Init 2 Jumping Wilds
        updatedJumpingWilds = [
          { reel: 1, row: 1, mult: 2 },
          { reel: 3, row: 1, mult: 2 },
        ];
      } else {
        // Jump positions and double multipliers
        updatedJumpingWilds = updatedJumpingWilds.map((jw) => ({
          reel: Math.floor(Math.random() * 5),
          row: Math.floor(Math.random() * 3),
          mult: Math.min(512, jw.mult * 2),
        }));
      }
      setJumpingWilds(updatedJumpingWilds);

      // Inject Jumping Wilds into current grid
      updatedJumpingWilds.forEach((jw) => {
        if (currentGrid[jw.reel] && currentGrid[jw.reel][jw.row]) {
          currentGrid[jw.reel][jw.row] = {
            uid: Math.random().toString(),
            symbolId: "jumping_wild",
            isJumpingWild: true,
            wildMultiplier: jw.mult,
          };
        }
      });
    } else {
      setJumpingWilds([]);
    }

    setMainGrid(currentGrid);
    await new Promise((res) => setTimeout(res, 450));

    // Resolve xWays splits
    currentGrid = currentGrid.map((col) =>
      col.map((item) => {
        if (item.isXWays) {
          const topInmate = INMATES[0];
          return {
            ...item,
            symbolId: topInmate.id,
            isXWays: false,
          };
        }
        return item;
      })
    );
    setMainGrid([...currentGrid]);

    // Calculate payouts
    let totalWin = 0;
    const wildMultiplierSum = updatedJumpingWilds.reduce((a, b) => a + b.mult, 1);

    for (let r = 0; r < 3; r++) {
      const firstSym = currentGrid[0][r];
      let matchCount = 1;
      let targetId = firstSym.symbolId;

      for (let c = 1; c < 5; c++) {
        const item = currentGrid[c][r];
        if (item.symbolId === targetId || item.isJumpingWild || targetId === "jumping_wild") {
          matchCount++;
          if (targetId === "jumping_wild" && !item.isJumpingWild) {
            targetId = item.symbolId;
          }
        } else {
          break;
        }
      }

      if (matchCount >= 3) {
        const def = INMATES.find((s) => s.id === targetId) || INMATES[0];
        const payScale = matchCount === 5 ? 1.0 : matchCount === 4 ? 0.4 : 0.15;
        totalWin += currentBet * def.basePayout * payScale * (payways / 243) * wildMultiplierSum;
      }
    }

    const finalWin = Math.floor(totalWin);

    if (finalWin > 0) {
      casinoAudio.playWin();
      setLastWinAmount(finalWin);
      if (isFreeSpin) {
        setTotalBonusWin((prev) => prev + finalWin);
      } else {
        onWin(finalWin, `San Quentin xWays Win (${payways.toLocaleString()} Ways) -> $${finalWin}`);
      }
    }

    setIsSpinning(false);

    // Trigger Lockdown Free Spins (3+ Scatters)
    if (scatterCount >= 3 && !isFreeSpin) {
      casinoAudio.playJackpot();
      setFreeSpinsLeft(12);
      setTotalBonusWin(0);
      setTimeout(() => spin(true, currentBet), 1000);
    } else if (isFreeSpin) {
      if (freeSpinsLeft > 1) {
        setFreeSpinsLeft((prev) => prev - 1);
        setTimeout(() => spin(true, currentBet), 650);
      } else {
        const bonusTotal = totalBonusWin + finalWin;
        if (bonusTotal > 0) {
          onWin(bonusTotal, `San Quentin Lockdown Spins Total ($${bonusTotal})`);
        }
        setFreeSpinsLeft(0);
        setTotalBonusWin(0);
        setJumpingWilds([]);
      }
    }
  };

  const buyBonus = () => {
    const cost = bet * 100;
    if (chips < cost || isSpinning) return;

    casinoAudio.playChipClink();
    onLose(cost, `Buy San Quentin 12 Lockdown Spins ($${cost})`);
    setFreeSpinsLeft(12);
    setTotalBonusWin(0);

    setTimeout(() => spin(true, bet), 500);
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-stone-950 border border-red-600/40 rounded-2xl p-4 sm:p-6 text-white shadow-2xl relative overflow-hidden backdrop-blur-xl">
      {/* Background Gritty Prison Atmosphere */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-gradient-to-b from-red-600/15 via-orange-950/20 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-red-900/60 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-stone-900 flex items-center justify-center shadow-lg shadow-red-600/20 border border-red-500/40">
            <Lock className="w-6 h-6 text-red-200 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-wide bg-gradient-to-r from-red-400 via-orange-300 to-amber-200 bg-clip-text text-transparent">
                SAN QUENTIN xWAYS
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-red-600/20 border border-red-500/40 text-red-300 rounded-full uppercase tracking-wider">
                UP TO 46,656 PAYWAYS
              </span>
            </div>
            <p className="text-xs text-stone-400">Unlock Enhancer Cells • xWays Splitting Inmates • Lockdown Free Spins</p>
          </div>
        </div>

        {/* Balance Display */}
        <div className="flex items-center gap-2 bg-stone-900/90 border border-red-500/40 px-4 py-2 rounded-xl shadow-inner">
          <Coins className="w-5 h-5 text-amber-400" />
          <span className="text-xs text-stone-400 font-medium">Balance:</span>
          <span className="text-base font-bold text-amber-300">${chips.toLocaleString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side Controls */}
        <div className="lg:col-span-4 flex flex-col gap-4 bg-stone-900/60 border border-red-900/40 p-4 rounded-xl">
          {/* Bet Selector */}
          <div>
            <label className="text-xs font-semibold text-stone-300 mb-2 flex items-center justify-between">
              <span>BET AMOUNT ($)</span>
              <span className="text-[10px] text-red-400">MIN $0.10 • MAX $5,000</span>
            </label>
            <div className="relative">
              <input
                type="number"
                disabled={isSpinning || freeSpinsLeft > 0}
                value={bet}
                onChange={(e) => setBet(Math.max(0.10, Math.min(5000, Number(e.target.value))))}
                className="w-full bg-stone-950 border border-stone-800 focus:border-red-500 rounded-xl px-4 py-2.5 text-amber-300 font-bold text-lg outline-none disabled:opacity-50 transition-all"
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
                      ? "bg-red-600/20 border-red-500 text-red-300"
                      : "bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700"
                  } disabled:opacity-40`}
                >
                  ${val}
                </button>
              ))}
            </div>
          </div>

          {/* Feature Buy Box */}
          <div className="bg-gradient-to-br from-red-950/60 to-stone-950 border border-red-500/40 p-3.5 rounded-xl flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-red-300 flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-red-400" /> LOCKDOWN SPINS
              </span>
              <span className="text-xs font-bold text-red-400">100x BET (${bet * 100})</span>
            </div>
            <button
              disabled={isSpinning || freeSpinsLeft > 0 || chips < bet * 100}
              onClick={buyBonus}
              className="w-full py-2.5 rounded-lg text-xs font-black bg-gradient-to-r from-red-500 via-orange-400 to-amber-500 text-stone-950 hover:from-red-400 shadow-md shadow-red-500/20 disabled:opacity-40 transition-all"
            >
              FEATURE BUY (${(bet * 100).toLocaleString()})
            </button>
          </div>

          {/* Stats & Payways Box */}
          <div className="bg-stone-950/80 border border-stone-800 p-3.5 rounded-xl flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-stone-400">Active Payways:</span>
              <span className="font-black text-amber-300 text-base">{activePayways.toLocaleString()} Ways</span>
            </div>
            {freeSpinsLeft > 0 && (
              <div className="flex justify-between items-center text-xs border-t border-stone-800 pt-2 text-red-300">
                <span className="font-extrabold">LOCKDOWN SPINS:</span>
                <span className="font-black text-lg text-amber-300">{freeSpinsLeft} LEFT</span>
              </div>
            )}
          </div>

          {/* Spin Action Button */}
          <button
            disabled={isSpinning}
            onClick={() => spin(false, bet)}
            className={`w-full py-4 rounded-xl font-black transition-all shadow-xl flex items-center justify-center gap-2 text-lg tracking-wide ${
              isSpinning
                ? "bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed"
                : "bg-gradient-to-r from-red-500 via-orange-400 to-amber-500 hover:from-red-400 text-stone-950 shadow-red-600/30 cursor-pointer"
            }`}
          >
            <Play className="w-6 h-6 fill-stone-950" />
            {isSpinning ? "CELL DOOR OPENING..." : `SPIN SAN QUENTIN ($${bet})`}
          </button>
        </div>

        {/* Right Cell Grid with Enhancer Row Bars */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center bg-stone-900/40 border border-red-900/40 p-4 rounded-xl relative">
          <div className="flex flex-col gap-2 w-full max-w-[500px] my-auto p-3 bg-stone-950/90 rounded-2xl border border-red-600/30 shadow-2xl">
            {/* Top Enhancers Row */}
            <div className="grid grid-cols-5 gap-2">
              {topEnhancers.map((enh, idx) => (
                <div
                  key={idx}
                  className={`h-8 rounded-lg border text-[9px] font-black flex items-center justify-center uppercase transition-all ${
                    enh.open
                      ? "bg-red-950/80 border-red-500 text-red-300 shadow-sm"
                      : "bg-stone-900 border-stone-800 text-stone-600"
                  }`}
                >
                  {enh.open ? enh.content : "🔒 LOCKED"}
                </div>
              ))}
            </div>

            {/* Main 5x3 Grid */}
            <div className="grid grid-cols-5 gap-2">
              {mainGrid.map((col, cIdx) => (
                <div key={cIdx} className="flex flex-col gap-2">
                  {col.map((cell) => {
                    let inmateDef = INMATES.find((s) => s.id === cell.symbolId);

                    return (
                      <motion.div
                        key={cell.uid}
                        layout
                        initial={{ y: -15, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center border shadow-md relative overflow-hidden bg-gradient-to-br ${
                          cell.isXWays
                            ? "from-amber-600/60 via-orange-700/60 to-stone-950 border-amber-400 shadow-amber-500/40"
                            : cell.isRazorSplit
                            ? "from-red-600/60 via-stone-900 to-stone-950 border-red-400 shadow-red-500/40"
                            : cell.isJumpingWild
                            ? "from-yellow-500/60 via-amber-600/60 to-stone-950 border-yellow-300 shadow-yellow-500/50"
                            : cell.isScatter
                            ? "from-red-950 via-stone-900 to-stone-950 border-red-500"
                            : inmateDef?.bg || "from-stone-900 to-stone-950 border-stone-800"
                        }`}
                      >
                        {cell.isXWays ? (
                          <div className="flex flex-col items-center">
                            <span className="text-xl sm:text-2xl font-black text-amber-300">xWAYS</span>
                            <span className="text-[8px] font-black text-amber-400">{cell.xWaysMultiplier}x SPLIT</span>
                          </div>
                        ) : cell.isJumpingWild ? (
                          <div className="flex flex-col items-center">
                            <span className="text-xl sm:text-2xl">🔥</span>
                            <span className="text-[9px] font-black text-yellow-300">{cell.wildMultiplier}x WILD</span>
                          </div>
                        ) : cell.isScatter ? (
                          <div className="flex flex-col items-center">
                            <span className="text-xl sm:text-2xl">🚨</span>
                            <span className="text-[8px] font-black text-red-300">TOWER</span>
                          </div>
                        ) : (
                          <span className="text-xl sm:text-2xl">{inmateDef?.icon || "🗿"}</span>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Bottom Enhancers Row */}
            <div className="grid grid-cols-5 gap-2">
              {bottomEnhancers.map((enh, idx) => (
                <div
                  key={idx}
                  className={`h-8 rounded-lg border text-[9px] font-black flex items-center justify-center uppercase transition-all ${
                    enh.open
                      ? "bg-red-950/80 border-red-500 text-red-300 shadow-sm"
                      : "bg-stone-900 border-stone-800 text-stone-600"
                  }`}
                >
                  {enh.open ? enh.content : "🔒 LOCKED"}
                </div>
              ))}
            </div>
          </div>

          <div className="w-full flex items-center justify-between text-xs text-stone-400 border-t border-red-900/60 pt-3 mt-4 px-2">
            <div>
              Active Ways: <span className="text-amber-300 font-extrabold">{activePayways.toLocaleString()}</span>
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

export default SanQuentinGame;
