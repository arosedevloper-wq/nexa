import React, { useState, useEffect } from "react";
import { Coins, Play, Sparkles, BookOpen, Crown, RotateCcw, Skull, Flame } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../../lib/audioService";

interface BookOfDeadGameProps {
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

const EGYPTIAN_SYMBOLS: SymbolDef[] = [
  { id: "rich_wilde", name: "Rich Wilde", icon: "🤠", bg: "from-amber-600/80 via-yellow-700/80 to-stone-950 border-amber-400", basePayout: 100 },
  { id: "pharaoh", name: "Pharaoh", icon: "👑", bg: "from-yellow-600/70 via-amber-800/70 to-stone-950 border-amber-500", basePayout: 50 },
  { id: "anubis", name: "Anubis", icon: "🐕", bg: "from-purple-950/80 via-indigo-950/80 to-stone-950 border-purple-500", basePayout: 30 },
  { id: "horus", name: "Horus Bird", icon: "🦅", bg: "from-emerald-950/80 via-teal-950/80 to-stone-950 border-emerald-500", basePayout: 20 },
  { id: "card_a", name: "Ace", icon: "🅰️", bg: "from-stone-900 to-stone-950 border-stone-800", basePayout: 5 },
  { id: "card_k", name: "King", icon: "👑", bg: "from-stone-900 to-stone-950 border-stone-800", basePayout: 4 },
  { id: "card_q", name: "Queen", icon: "👸", bg: "from-stone-900 to-stone-950 border-stone-800", basePayout: 3 },
  { id: "card_j", name: "Jack", icon: "🃏", bg: "from-stone-900 to-stone-950 border-stone-800", basePayout: 2 },
  { id: "card_10", name: "10", icon: "🔟", bg: "from-stone-900 to-stone-950 border-stone-800", basePayout: 1 },
];

interface CellItem {
  uid: string;
  symbolId: string;
  isTombScatter?: boolean;
  isExpanded?: boolean;
}

export const BookOfDeadGame: React.FC<BookOfDeadGameProps> = ({
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
  const [totalBonusWin, setTotalBonusWin] = useState<number>(0);
  const [expandingSymbol, setExpandingSymbol] = useState<SymbolDef | null>(null);
  const [lastWinAmount, setLastWinAmount] = useState<number | null>(null);

  const quickBets = [10, 25, 50, 100, 250, 500];

  const getRandomCell = (): CellItem => {
    // 4.5% Golden Tomb Scatter/Wild
    if (Math.random() < 0.045) {
      return { uid: Math.random().toString(), symbolId: "tomb_scatter", isTombScatter: true };
    }
    const rand = EGYPTIAN_SYMBOLS[Math.floor(Math.random() * EGYPTIAN_SYMBOLS.length)];
    return { uid: Math.random().toString(), symbolId: rand.id };
  };

  useEffect(() => {
    const newGrid: CellItem[][] = [];
    for (let c = 0; c < 5; c++) {
      const col: CellItem[] = [];
      for (let r = 0; r < 3; r++) {
        col.push(getRandomCell());
      }
      newGrid.push(col);
    }
    setGrid(newGrid);
  }, []);

  const spin = async (isFreeSpin = false, currentBet = bet, activeExpanding = expandingSymbol) => {
    if (isSpinning) return;

    if (!isFreeSpin) {
      if (chips < currentBet) {
        casinoAudio.playLose();
        return;
      }
      casinoAudio.playChipClink();
      onLose(currentBet, `Book of Dead Bet ($${currentBet})`);
    }

    setIsSpinning(true);
    setLastWinAmount(null);

    casinoAudio.playWheelSpin(0.1);

    // 5x3 Grid Spin
    let currentGrid: CellItem[][] = [];
    let scatterCount = 0;

    for (let c = 0; c < 5; c++) {
      const col: CellItem[] = [];
      for (let r = 0; r < 3; r++) {
        const item = getRandomCell();
        if (item.isTombScatter) scatterCount++;
        col.push(item);
      }
      currentGrid.push(col);
    }

    setGrid(currentGrid);
    await new Promise((res) => setTimeout(res, 450));

    // Handle Expanding Symbol in Free Spins Mode
    if (isFreeSpin && activeExpanding) {
      let containsExpanding = false;
      currentGrid.forEach((col) => {
        col.forEach((item) => {
          if (item.symbolId === activeExpanding.id) containsExpanding = true;
        });
      });

      if (containsExpanding) {
        casinoAudio.playWin();
        // Expand symbol across full reels where present
        currentGrid = currentGrid.map((col) => {
          const hasSymbol = col.some((item) => item.symbolId === activeExpanding.id || item.isTombScatter);
          if (hasSymbol) {
            return col.map((item) => ({
              ...item,
              symbolId: activeExpanding.id,
              isExpanded: true,
            }));
          }
          return col;
        });
        setGrid([...currentGrid]);
        await new Promise((res) => setTimeout(res, 400));
      }
    }

    // Evaluate Payline Wins (10 Fixed Lines simulation)
    let totalWin = 0;

    for (let r = 0; r < 3; r++) {
      const firstSym = currentGrid[0][r];
      let matchCount = 1;
      let targetId = firstSym.symbolId;

      for (let c = 1; c < 5; c++) {
        const item = currentGrid[c][r];
        if (item.symbolId === targetId || item.isTombScatter || targetId === "tomb_scatter") {
          matchCount++;
          if (targetId === "tomb_scatter" && !item.isTombScatter) {
            targetId = item.symbolId;
          }
        } else {
          break;
        }
      }

      if (matchCount >= 3) {
        const def = EGYPTIAN_SYMBOLS.find((s) => s.id === targetId) || EGYPTIAN_SYMBOLS[0];
        const payScale = matchCount === 5 ? 1.0 : matchCount === 4 ? 0.4 : 0.15;
        totalWin += currentBet * def.basePayout * payScale;
      }
    }

    // Scatter Tomb Instant Payouts (3+ Tomb Scatters)
    if (scatterCount >= 3) {
      totalWin += currentBet * (scatterCount === 5 ? 200 : scatterCount === 4 ? 20 : 2);
    }

    const finalWin = Math.floor(totalWin);

    if (finalWin > 0) {
      casinoAudio.playWin();
      setLastWinAmount(finalWin);
      if (isFreeSpin) {
        setTotalBonusWin((prev) => prev + finalWin);
      } else {
        onWin(finalWin, `Book of Dead Win -> $${finalWin}`);
      }
    }

    setIsSpinning(false);

    // Trigger or Re-Trigger Tomb Free Spins (3+ Scatters)
    if (scatterCount >= 3) {
      casinoAudio.playJackpot();
      const chosenExpanding = activeExpanding || EGYPTIAN_SYMBOLS[Math.floor(Math.random() * 4)];
      setExpandingSymbol(chosenExpanding);

      if (!isFreeSpin) {
        setFreeSpinsLeft(10);
        setTotalBonusWin(0);
        setTimeout(() => spin(true, currentBet, chosenExpanding), 1000);
      } else {
        // Re-trigger
        setFreeSpinsLeft((prev) => prev + 10);
        setTimeout(() => spin(true, currentBet, chosenExpanding), 600);
      }
    } else if (isFreeSpin) {
      if (freeSpinsLeft > 1) {
        setFreeSpinsLeft((prev) => prev - 1);
        setTimeout(() => spin(true, currentBet, activeExpanding), 600);
      } else {
        const bonusTotal = totalBonusWin + finalWin;
        if (bonusTotal > 0) {
          onWin(bonusTotal, `Book of Dead Tomb Free Spins Total ($${bonusTotal})`);
        }
        setFreeSpinsLeft(0);
        setTotalBonusWin(0);
        setExpandingSymbol(null);
      }
    }
  };

  const buyBonus = () => {
    const cost = bet * 80;
    if (chips < cost || isSpinning) return;

    casinoAudio.playChipClink();
    onLose(cost, `Buy Book of Dead 10 Tomb Free Spins ($${cost})`);
    
    const chosenExpanding = EGYPTIAN_SYMBOLS[Math.floor(Math.random() * 4)];
    setExpandingSymbol(chosenExpanding);
    setFreeSpinsLeft(10);
    setTotalBonusWin(0);

    setTimeout(() => spin(true, bet, chosenExpanding), 500);
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-stone-950 border border-amber-500/40 rounded-2xl p-4 sm:p-6 text-white shadow-2xl relative overflow-hidden backdrop-blur-xl">
      {/* Ancient Egyptian Tomb Atmosphere */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-gradient-to-b from-amber-500/15 via-yellow-700/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-amber-900/60 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 via-yellow-600 to-amber-800 flex items-center justify-center shadow-lg shadow-amber-500/20 border border-amber-300">
            <BookOpen className="w-6 h-6 text-stone-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-wide bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
                BOOK OF DEAD
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-full uppercase tracking-wider">
                EXPANDING SYMBOLS • TOMB SCATTERS
              </span>
            </div>
            <p className="text-xs text-stone-400">Golden Tomb Scatters/Wilds • Free Spins Re-Triggers up to 5,000x</p>
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
          {/* Bet Amount Selector */}
          <div>
            <label className="text-xs font-semibold text-stone-300 mb-2 flex items-center justify-between">
              <span>BET AMOUNT ($)</span>
              <span className="text-[10px] text-amber-400">MIN $10 • MAX $5,000</span>
            </label>
            <div className="relative">
              <input
                type="number"
                disabled={isSpinning || freeSpinsLeft > 0}
                value={bet}
                onChange={(e) => setBet(Math.max(10, Math.min(5000, Number(e.target.value))))}
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
                      ? "bg-amber-500/20 border-amber-500 text-amber-300"
                      : "bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700"
                  } disabled:opacity-40`}
                >
                  ${val}
                </button>
              ))}
            </div>
          </div>

          {/* Feature Buy Box */}
          <div className="bg-gradient-to-br from-amber-950/60 to-stone-950 border border-amber-500/40 p-3.5 rounded-xl flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-amber-300 flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-400" /> BUY 10 TOMB SPINS
              </span>
              <span className="text-xs font-bold text-amber-400">80x BET (${bet * 80})</span>
            </div>
            <button
              disabled={isSpinning || freeSpinsLeft > 0 || chips < bet * 80}
              onClick={buyBonus}
              className="w-full py-2.5 rounded-lg text-xs font-black bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 text-stone-950 hover:from-amber-300 shadow-md shadow-amber-500/20 disabled:opacity-40 transition-all"
            >
              FEATURE BUY (${(bet * 80).toLocaleString()})
            </button>
          </div>

          {/* Active Bonus & Expanding Symbol Status */}
          {expandingSymbol && (
            <div className="bg-amber-950/80 border border-amber-500/50 p-3 rounded-xl flex items-center justify-between text-xs">
              <div>
                <div className="font-extrabold text-amber-300">SPECIAL EXPANDING SYMBOL:</div>
                <div className="text-base font-black text-white flex items-center gap-1 mt-0.5">
                  <span>{expandingSymbol.icon}</span> {expandingSymbol.name}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-stone-400 font-bold">SPINS LEFT</div>
                <div className="text-lg font-black text-amber-300">{freeSpinsLeft}</div>
              </div>
            </div>
          )}

          {/* Spin Action Button */}
          <button
            disabled={isSpinning}
            onClick={() => spin(false, bet)}
            className={`w-full py-4 rounded-xl font-black transition-all shadow-xl flex items-center justify-center gap-2 text-lg tracking-wide ${
              isSpinning
                ? "bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed"
                : "bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:from-amber-300 text-stone-950 shadow-amber-500/30 cursor-pointer"
            }`}
          >
            <Play className="w-6 h-6 fill-stone-950" />
            {isSpinning ? "OPENING TOMB..." : `SPIN BOOK OF DEAD ($${bet})`}
          </button>
        </div>

        {/* Right 5x3 Grid */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center bg-stone-900/40 border border-amber-900/40 p-4 rounded-xl relative">
          <div className="grid grid-cols-5 gap-2.5 w-full max-w-[500px] aspect-[5/3] my-auto p-3 bg-stone-950/90 rounded-2xl border border-amber-500/40 shadow-2xl">
            {grid.map((col, cIdx) => (
              <div key={cIdx} className="flex flex-col gap-2.5">
                {col.map((cell) => {
                  let symDef = EGYPTIAN_SYMBOLS.find((s) => s.id === cell.symbolId);

                  return (
                    <motion.div
                      key={cell.uid}
                      layout
                      initial={{ y: -15, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center border shadow-md relative overflow-hidden bg-gradient-to-br ${
                        cell.isTombScatter
                          ? "from-amber-400 via-yellow-600 to-amber-900 border-amber-300 shadow-amber-500/50 ring-2 ring-amber-300"
                          : cell.isExpanded
                          ? "from-amber-500/60 via-yellow-600/60 to-stone-950 border-amber-300 scale-105 z-10"
                          : symDef?.bg || "from-stone-900 to-stone-950 border-stone-800"
                      }`}
                    >
                      {cell.isTombScatter ? (
                        <div className="flex flex-col items-center">
                          <span className="text-2xl sm:text-3xl">📖</span>
                          <span className="text-[8px] font-black text-stone-950 uppercase tracking-widest bg-amber-300 px-1 rounded mt-0.5">TOMB</span>
                        </div>
                      ) : (
                        <span className="text-2xl sm:text-3xl">{symDef?.icon || "🤠"}</span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="w-full flex items-center justify-between text-xs text-stone-400 border-t border-amber-900/60 pt-3 mt-4 px-2">
            <div>
              Special Tomb Wild: <span className="text-amber-300 font-extrabold">Triggers 10 Free Spins + 200x Scatter</span>
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

export default BookOfDeadGame;
