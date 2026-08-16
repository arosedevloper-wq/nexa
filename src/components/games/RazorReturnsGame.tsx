import React, { useState, useEffect } from "react";
import { Coins, Play, Sparkles, Zap, RotateCcw, Crown, Anchor, Waves } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../../lib/audioService";

interface RazorReturnsGameProps {
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
  { id: "golden_shark", name: "Golden Shark", icon: "🦈", bg: "from-amber-500/40 via-yellow-600/40 to-slate-950 border-amber-400", basePayout: 50 },
  { id: "orange_shark", name: "Orange Shark", icon: "🐠", bg: "from-orange-950/60 to-slate-900 border-orange-500/50", basePayout: 25 },
  { id: "purple_shark", name: "Purple Shark", icon: "🦑", bg: "from-purple-950/60 to-slate-900 border-purple-500/50", basePayout: 15 },
  { id: "green_shark", name: "Green Shark", icon: "🐢", bg: "from-emerald-950/60 to-slate-900 border-emerald-500/50", basePayout: 10 },
  { id: "diver_helmet", name: "Diver Helmet", icon: "🤿", bg: "from-cyan-950/60 to-slate-900 border-cyan-500/50", basePayout: 5 },
  { id: "anchor", name: "Anchor", icon: "⚓", bg: "from-slate-900 to-slate-950 border-slate-700", basePayout: 3 },
  { id: "periscope", name: "Periscope", icon: "🔭", bg: "from-slate-900 to-slate-950 border-slate-700", basePayout: 2 },
];

interface CellItem {
  uid: string;
  symbolId: string;
  isSeaweedMystery?: boolean;
  isTorpedoScatter?: boolean;
  coinValue?: number;
  isWinning?: boolean;
}

export const RazorReturnsGame: React.FC<RazorReturnsGameProps> = ({
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
  const [instantCoinsWon, setInstantCoinsWon] = useState<number>(0);
  const [lastWinAmount, setLastWinAmount] = useState<number | null>(null);

  const quickBets = [10, 25, 50, 100, 250, 500];

  const getRandomCell = (): CellItem => {
    // 6% Seaweed Mystery Symbols (Nudge & Reveal)
    if (Math.random() < 0.06) {
      return { uid: Math.random().toString(), symbolId: "mystery_seaweed", isSeaweedMystery: true };
    }
    // 3.5% Torpedo Scatter
    if (Math.random() < 0.035) {
      return { uid: Math.random().toString(), symbolId: "torpedo_scatter", isTorpedoScatter: true };
    }
    // 4% Instant Coin Symbol (1x to 100x instant cash)
    if (Math.random() < 0.04) {
      const coinMults = [1, 2, 5, 10, 25, 50, 100];
      const coin = coinMults[Math.floor(Math.random() * coinMults.length)];
      return { uid: Math.random().toString(), symbolId: "instant_coin", coinValue: coin };
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
      onLose(currentBet, `Razor Returns Bet ($${currentBet})`);
    }

    setIsSpinning(true);
    setLastWinAmount(null);
    setInstantCoinsWon(0);

    casinoAudio.playWheelSpin(0.1);

    // 5x5 Grid Spin
    let currentGrid: CellItem[][] = [];
    let torpedoScatters = 0;
    let instantCoinPayout = 0;
    let mysteryCount = 0;

    for (let c = 0; c < 5; c++) {
      const col: CellItem[] = [];
      for (let r = 0; r < 5; r++) {
        const item = getRandomCell();
        if (item.isTorpedoScatter) torpedoScatters++;
        if (item.coinValue) instantCoinPayout += currentBet * item.coinValue;
        if (item.isSeaweedMystery) mysteryCount++;
        col.push(item);
      }
      currentGrid.push(col);
    }

    setGrid(currentGrid);
    await new Promise((res) => setTimeout(res, 450));

    // Nudge & Reveal Seaweed Mystery Symbols
    if (mysteryCount > 0) {
      casinoAudio.playWin();
      // Reveal mystery symbols into high-value Golden Shark or Instant Coins
      const revealedSymbol = SYMBOLS[Math.floor(Math.random() * 3)];
      currentGrid = currentGrid.map((col) =>
        col.map((item) => {
          if (item.isSeaweedMystery) {
            return { ...item, symbolId: revealedSymbol.id, isSeaweedMystery: false };
          }
          return item;
        })
      );
      setGrid([...currentGrid]);
      await new Promise((res) => setTimeout(res, 400));
    }

    // Evaluate 5-in-a-row paylines
    let totalWin = instantCoinPayout;
    setInstantCoinsWon(instantCoinPayout);

    for (let r = 0; r < 5; r++) {
      const firstSym = currentGrid[0][r];
      let matchCount = 1;
      const targetId = firstSym.symbolId;

      for (let c = 1; c < 5; c++) {
        const item = currentGrid[c][r];
        if (item.symbolId === targetId) {
          matchCount++;
        } else {
          break;
        }
      }

      if (matchCount >= 3) {
        const def = SYMBOLS.find((s) => s.id === targetId) || SYMBOLS[0];
        const payScale = matchCount === 5 ? 1.0 : matchCount === 4 ? 0.4 : 0.15;
        totalWin += currentBet * def.basePayout * payScale;
      }
    }

    const finalWin = Math.floor(totalWin);

    if (finalWin > 0) {
      casinoAudio.playWin();
      setLastWinAmount(finalWin);
      if (isFreeSpin) {
        setTotalBonusWin((prev) => prev + finalWin);
      } else {
        onWin(finalWin, `Razor Returns Win -> $${finalWin}`);
      }
    }

    setIsSpinning(false);

    // Torpedo Free Spins Trigger (3+ Scatters)
    if (torpedoScatters >= 3 && !isFreeSpin) {
      casinoAudio.playJackpot();
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
          onWin(bonusTotal, `Razor Returns Torpedo Free Spins Total ($${bonusTotal})`);
        }
        setFreeSpinsLeft(0);
        setTotalBonusWin(0);
      }
    }
  };

  const buyBonus = () => {
    const cost = bet * 100;
    if (chips < cost || isSpinning) return;

    casinoAudio.playChipClink();
    onLose(cost, `Buy Razor Returns 10 Torpedo Free Spins ($${cost})`);
    setFreeSpinsLeft(10);
    setTotalBonusWin(0);

    setTimeout(() => spin(true, bet), 500);
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-slate-950 border border-cyan-500/30 rounded-2xl p-4 sm:p-6 text-white shadow-2xl relative overflow-hidden backdrop-blur-xl">
      {/* Background Atmosphere */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-gradient-to-b from-cyan-500/15 via-blue-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800/80 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Waves className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-wide bg-gradient-to-r from-cyan-300 via-blue-200 to-amber-200 bg-clip-text text-transparent">
                RAZOR RETURNS
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 rounded-full uppercase tracking-wider">
                NUDGE & REVEAL MYSTERY SEAWEED
              </span>
            </div>
            <p className="text-xs text-slate-400">Golden Shark Instant Coins up to 100x + Torpedo Scatter Free Spins!</p>
          </div>
        </div>

        {/* Balance Display */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-cyan-500/30 px-4 py-2 rounded-xl shadow-inner">
          <Coins className="w-5 h-5 text-amber-400" />
          <span className="text-xs text-slate-400 font-medium">Balance:</span>
          <span className="text-base font-bold text-amber-300">${chips.toLocaleString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side Controls */}
        <div className="lg:col-span-4 flex flex-col gap-4 bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl">
          {/* Bet Amount Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
              <span>BET AMOUNT ($)</span>
              <span className="text-[10px] text-cyan-400">MIN $10 • MAX $5,000</span>
            </label>
            <div className="relative">
              <input
                type="number"
                disabled={isSpinning || freeSpinsLeft > 0}
                value={bet}
                onChange={(e) => setBet(Math.max(10, Math.min(5000, Number(e.target.value))))}
                className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-amber-300 font-bold text-lg outline-none disabled:opacity-50 transition-all"
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
                      ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  } disabled:opacity-40`}
                >
                  ${val}
                </button>
              ))}
            </div>
          </div>

          {/* Feature Buy Box */}
          <div className="bg-gradient-to-br from-cyan-950/40 via-blue-950/40 to-slate-950 border border-cyan-500/40 p-3.5 rounded-xl flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-cyan-300 flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-cyan-400" /> BUY 10 TORPEDO SPINS
              </span>
              <span className="text-xs font-bold text-cyan-400">100x BET (${bet * 100})</span>
            </div>
            <button
              disabled={isSpinning || freeSpinsLeft > 0 || chips < bet * 100}
              onClick={buyBonus}
              className="w-full py-2.5 rounded-lg text-xs font-black bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500 text-slate-950 hover:from-cyan-300 shadow-md shadow-cyan-500/20 disabled:opacity-40 transition-all"
            >
              FEATURE BUY (${(bet * 100).toLocaleString()})
            </button>
          </div>

          {/* Free Spins Display */}
          {freeSpinsLeft > 0 && (
            <div className="bg-cyan-950/80 border border-cyan-500/50 p-3 rounded-xl flex justify-between items-center text-xs">
              <span className="font-bold text-cyan-300">TORPEDO SPINS REMAINING:</span>
              <span className="font-black text-lg text-amber-300">{freeSpinsLeft}</span>
            </div>
          )}

          {/* Spin Action Button */}
          <button
            disabled={isSpinning}
            onClick={() => spin(false, bet)}
            className={`w-full py-4 rounded-xl font-black transition-all shadow-xl flex items-center justify-center gap-2 text-lg tracking-wide ${
              isSpinning
                ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                : "bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-500 hover:from-cyan-300 text-slate-950 shadow-cyan-500/30 cursor-pointer"
            }`}
          >
            <Play className="w-6 h-6 fill-slate-950" />
            {isSpinning ? "DIVING UNDERWATER..." : `SPIN RAZOR RETURNS ($${bet})`}
          </button>
        </div>

        {/* Right 5x5 Grid */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl relative">
          <div className="grid grid-cols-5 gap-2 w-full max-w-[500px] aspect-square my-auto p-2.5 bg-slate-950/90 rounded-2xl border border-cyan-500/30 shadow-2xl">
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
                        cell.isSeaweedMystery
                          ? "from-emerald-800/60 via-teal-900/60 to-slate-950 border-emerald-400"
                          : cell.isTorpedoScatter
                          ? "from-red-950 via-rose-950 to-slate-950 border-red-500"
                          : cell.coinValue
                          ? "from-amber-500/40 via-yellow-600/40 to-slate-950 border-amber-400"
                          : symDef?.bg || "from-slate-900 to-slate-950 border-slate-800"
                      }`}
                    >
                      {cell.isSeaweedMystery ? (
                        <div className="flex flex-col items-center">
                          <span className="text-xl sm:text-2xl">🌿</span>
                          <span className="text-[8px] font-black text-emerald-300 uppercase">MYSTERY</span>
                        </div>
                      ) : cell.isTorpedoScatter ? (
                        <div className="flex flex-col items-center">
                          <span className="text-xl sm:text-2xl">🚀</span>
                          <span className="text-[8px] font-black text-red-300 uppercase">TORPEDO</span>
                        </div>
                      ) : cell.coinValue ? (
                        <div className="flex flex-col items-center">
                          <span className="text-xl sm:text-2xl">🪙</span>
                          <span className="text-[9px] font-black text-amber-300">{cell.coinValue}x COIN</span>
                        </div>
                      ) : (
                        <span className="text-xl sm:text-2xl">{symDef?.icon || "🦈"}</span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="w-full flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-3 mt-4 px-2">
            <div>
              Instant Coins: <span className="text-amber-300 font-extrabold">${instantCoinsWon.toLocaleString()}</span>
            </div>
            {lastWinAmount !== null && (
              <div className="text-emerald-400 font-black">
                Total Win: +${lastWinAmount.toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RazorReturnsGame;
