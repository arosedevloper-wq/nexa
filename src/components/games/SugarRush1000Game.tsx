import React, { useState, useEffect } from "react";
import { Coins, Play, Sparkles, Zap, RotateCcw, Crown, Trophy, Candy, Flame } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../../lib/audioService";

interface SugarRush1000GameProps {
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
  basePayout: number; // base payout for 15+ cluster
}

const CANDIES: CandyDef[] = [
  { id: "pink_gummy", name: "Pink Gummy Bear", icon: "🧸", color: "text-pink-400", bg: "from-pink-950/60 to-rose-950/80 border-pink-500/50", basePayout: 150 },
  { id: "orange_heart", name: "Orange Heart", icon: "🧡", color: "text-orange-400", bg: "from-orange-950/60 to-amber-950/80 border-orange-500/50", basePayout: 100 },
  { id: "purple_jelly", name: "Purple Jelly", icon: "🔮", color: "text-purple-400", bg: "from-purple-950/60 to-indigo-950/80 border-purple-500/50", basePayout: 60 },
  { id: "green_star", name: "Green Star", icon: "⭐", color: "text-emerald-400", bg: "from-emerald-950/60 to-teal-950/80 border-emerald-500/50", basePayout: 40 },
  { id: "red_bean", name: "Red Jelly Bean", icon: "🫘", color: "text-red-400", bg: "from-red-950/50 to-slate-900 border-red-500/40", basePayout: 25 },
  { id: "purple_bear", name: "Purple Bear", icon: "👾", color: "text-indigo-400", bg: "from-indigo-950/50 to-slate-900 border-indigo-500/40", basePayout: 15 },
  { id: "yellow_bear", name: "Yellow Bear", icon: "🐤", color: "text-yellow-400", bg: "from-yellow-950/50 to-slate-900 border-yellow-500/40", basePayout: 10 },
];

interface CellState {
  uid: string;
  candyId: string;
  isScatter?: boolean;
  isWinning?: boolean;
}

export const SugarRush1000Game: React.FC<SugarRush1000GameProps> = ({
  chips,
  onWin,
  onLose,
  onCommentaryRequest,
  rtpBias,
}) => {
  const [bet, setBet] = useState<number>(50);
  const [grid, setGrid] = useState<CellState[][]>([]);
  // 7x7 multiplier grid storing spot multipliers (2x, 4x, 8x, ..., up to 1024x)
  const [multiplierGrid, setMultiplierGrid] = useState<number[][]>(
    Array(7).fill(0).map(() => Array(7).fill(0))
  );
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [freeSpinsLeft, setFreeSpinsLeft] = useState<number>(0);
  const [totalFreeSpinsWin, setTotalFreeSpinsWin] = useState<number>(0);
  const [tumbleWin, setTumbleWin] = useState<number>(0);
  const [highestMultHit, setHighestMultHit] = useState<number>(0);

  const quickBets = [10, 25, 50, 100, 250, 500];

  const getRandomCell = (): CellState => {
    // 3.5% Scatter Rocket Drop
    if (Math.random() < 0.035) {
      return { uid: Math.random().toString(), candyId: "scatter_rocket", isScatter: true };
    }
    const randCandy = CANDIES[Math.floor(Math.random() * CANDIES.length)];
    return { uid: Math.random().toString(), candyId: randCandy.id };
  };

  useEffect(() => {
    const newGrid: CellState[][] = [];
    for (let c = 0; c < 7; c++) {
      const col: CellState[] = [];
      for (let r = 0; r < 7; r++) {
        col.push(getRandomCell());
      }
      newGrid.push(col);
    }
    setGrid(newGrid);
  }, []);

  // Find 5+ connected clusters using BFS
  const findClusters = (currentGrid: CellState[][]) => {
    const visited = Array(7).fill(0).map(() => Array(7).fill(false));
    const clusters: { symbolId: string; coords: [number, number][] }[] = [];

    for (let c = 0; c < 7; c++) {
      for (let r = 0; r < 7; r++) {
        if (!visited[c][r]) {
          const item = currentGrid[c][r];
          if (item.isScatter) {
            visited[c][r] = true;
            continue;
          }

          const targetId = item.candyId;
          const clusterCoords: [number, number][] = [];
          const queue: [number, number][] = [[c, r]];
          visited[c][r] = true;

          while (queue.length > 0) {
            const [currC, currR] = queue.shift()!;
            clusterCoords.push([currC, currR]);

            // 4-directional neighbors
            const neighbors: [number, number][] = [
              [currC - 1, currR],
              [currC + 1, currR],
              [currC, currR - 1],
              [currC, currR + 1],
            ];

            for (const [nc, nr] of neighbors) {
              if (
                nc >= 0 && nc < 7 && nr >= 0 && nr < 7 &&
                !visited[nc][nr] &&
                currentGrid[nc][nr].candyId === targetId &&
                !currentGrid[nc][nr].isScatter
              ) {
                visited[nc][nr] = true;
                queue.push([nc, nr]);
              }
            }
          }

          if (clusterCoords.length >= 5) {
            clusters.push({ symbolId: targetId, coords: clusterCoords });
          }
        }
      }
    }

    return clusters;
  };

  const spin = async (isFreeSpin = false, currentBet = bet) => {
    if (isSpinning) return;

    if (!isFreeSpin) {
      if (chips < currentBet) {
        casinoAudio.playLose();
        return;
      }
      casinoAudio.playChipClink();
      onLose(currentBet, `Sugar Rush 1000 Bet ($${currentBet})`);
      // Reset multiplier spots on normal base spin if not in free spins
      setMultiplierGrid(Array(7).fill(0).map(() => Array(7).fill(0)));
    }

    setIsSpinning(true);
    setTumbleWin(0);

    // Initial fill
    casinoAudio.playWheelSpin(0.1);
    let currentGrid: CellState[][] = [];
    for (let c = 0; c < 7; c++) {
      const col: CellState[] = [];
      for (let r = 0; r < 7; r++) {
        col.push(getRandomCell());
      }
      currentGrid.push(col);
    }
    setGrid(currentGrid);
    await new Promise((res) => setTimeout(res, 350));

    let accumulatedWin = 0;
    let keepsTumbling = true;
    let localMultGrid = multiplierGrid.map((row) => [...row]);
    let maxMultFound = highestMultHit;
    let scatterCount = 0;

    while (keepsTumbling) {
      // Count scatters
      scatterCount = 0;
      for (let c = 0; c < 7; c++) {
        for (let r = 0; r < 7; r++) {
          if (currentGrid[c][r].isScatter) scatterCount++;
        }
      }

      const clusters = findClusters(currentGrid);

      if (clusters.length > 0) {
        casinoAudio.playWin();

        // Mark winning cluster cells
        const winningCoordsSet = new Set<string>();
        let clusterPayout = 0;

        clusters.forEach((cl) => {
          const def = CANDIES.find((c) => c.id === cl.symbolId);
          const count = cl.coords.length;
          const scale = count >= 15 ? 1.0 : count >= 10 ? 0.6 : count >= 7 ? 0.35 : 0.2;
          const baseWin = currentBet * ((def?.basePayout || 10) * scale / 10);

          cl.coords.forEach(([c, r]) => {
            winningCoordsSet.add(`${c},${r}`);

            // Update Multiplier Spot: 0 -> 2x, 2x -> 4x, 4x -> 8x ... max 1024x
            const currentSpotMult = localMultGrid[c][r];
            let nextSpotMult = 0;
            if (currentSpotMult === 0) {
              nextSpotMult = 2;
            } else {
              nextSpotMult = Math.min(1024, currentSpotMult * 2);
            }
            localMultGrid[c][r] = nextSpotMult;
            if (nextSpotMult > maxMultFound) maxMultFound = nextSpotMult;

            // Apply multiplier to win
            const spotMult = Math.max(1, localMultGrid[c][r]);
            clusterPayout += (baseWin / count) * spotMult;
          });
        });

        setMultiplierGrid(localMultGrid.map((row) => [...row]));
        setHighestMultHit(maxMultFound);

        // Highlight winners
        currentGrid = currentGrid.map((col, cIdx) =>
          col.map((cell, rIdx) => {
            if (winningCoordsSet.has(`${cIdx},${rIdx}`)) {
              return { ...cell, isWinning: true };
            }
            return cell;
          })
        );
        setGrid([...currentGrid]);
        await new Promise((res) => setTimeout(res, 450));

        accumulatedWin += clusterPayout;
        setTumbleWin(accumulatedWin);

        // Tumble new items down
        const tumbledGrid: CellState[][] = [];
        for (let c = 0; c < 7; c++) {
          const remaining = currentGrid[c].filter((item) => !item.isWinning);
          const needed = 7 - remaining.length;
          const newTop: CellState[] = [];
          for (let i = 0; i < needed; i++) {
            newTop.push(getRandomCell());
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

    // Free Spins Trigger (3+ Scatters)
    if (scatterCount >= 3) {
      casinoAudio.playJackpot();
      setFreeSpinsLeft((prev) => prev + 10);
    }

    const finalWin = Math.floor(accumulatedWin);

    if (finalWin > 0) {
      casinoAudio.playWin();
      if (isFreeSpin) {
        setTotalFreeSpinsWin((prev) => prev + finalWin);
      } else {
        onWin(finalWin, `Sugar Rush 1000 Cluster Win -> $${finalWin}`);
      }
    }

    setIsSpinning(false);

    if (isFreeSpin) {
      if (freeSpinsLeft > 1) {
        setFreeSpinsLeft((prev) => prev - 1);
        setTimeout(() => spin(true, currentBet), 600);
      } else {
        const bonusTotal = totalFreeSpinsWin + finalWin;
        if (bonusTotal > 0) {
          onWin(bonusTotal, `Sugar Rush 1000 Free Spins Bonus Total ($${bonusTotal})`);
        }
        setFreeSpinsLeft(0);
        setTotalFreeSpinsWin(0);
      }
    } else if (scatterCount >= 3) {
      setFreeSpinsLeft(10);
      setTotalFreeSpinsWin(0);
      setTimeout(() => spin(true, currentBet), 1000);
    }
  };

  const buyBonus = () => {
    const bonusCost = bet * 100;
    if (chips < bonusCost || isSpinning) return;

    casinoAudio.playChipClink();
    onLose(bonusCost, `Buy Sugar Rush 1000 10 Free Spins ($${bonusCost})`);
    setFreeSpinsLeft(10);
    setTotalFreeSpinsWin(0);
    setMultiplierGrid(Array(7).fill(0).map(() => Array(7).fill(0)));

    setTimeout(() => spin(true, bet), 500);
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-slate-950 border border-fuchsia-500/30 rounded-2xl p-4 sm:p-6 text-white shadow-2xl relative overflow-hidden backdrop-blur-xl">
      {/* Background Aura */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-gradient-to-b from-fuchsia-500/15 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800/80 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-600 flex items-center justify-center shadow-lg shadow-fuchsia-500/20">
            <Candy className="w-6 h-6 text-white stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-wide bg-gradient-to-r from-fuchsia-300 via-pink-200 to-amber-200 bg-clip-text text-transparent">
                SUGAR RUSH 1000
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-300 rounded-full uppercase tracking-wider">
                1024x SPOT MULTIPLIERS
              </span>
            </div>
            <p className="text-xs text-slate-400">Match 5+ connected candy clusters • Exploding spots double up to 1024x!</p>
          </div>
        </div>

        {/* Balance Display */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-fuchsia-500/30 px-4 py-2 rounded-xl shadow-inner">
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
              <span className="text-[10px] text-fuchsia-400">MIN $0.10 • MAX $5,000</span>
            </label>
            <div className="relative">
              <input
                type="number"
                disabled={isSpinning || freeSpinsLeft > 0}
                value={bet}
                onChange={(e) => setBet(Math.max(0.10, Math.min(5000, Number(e.target.value))))}
                className="w-full bg-slate-950 border border-slate-700 focus:border-fuchsia-500 rounded-xl px-4 py-2.5 text-amber-300 font-bold text-lg outline-none disabled:opacity-50 transition-all"
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
                      ? "bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-300"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  } disabled:opacity-40`}
                >
                  ${val}
                </button>
              ))}
            </div>
          </div>

          {/* Feature Buy Box */}
          <div className="bg-gradient-to-br from-fuchsia-950/40 via-purple-950/40 to-slate-950 border border-fuchsia-500/40 p-3.5 rounded-xl flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-fuchsia-300 flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-fuchsia-400" /> BUY 10 FREE SPINS
              </span>
              <span className="text-xs font-bold text-fuchsia-400">100x BET (${bet * 100})</span>
            </div>
            <button
              disabled={isSpinning || freeSpinsLeft > 0 || chips < bet * 100}
              onClick={buyBonus}
              className="w-full py-2.5 rounded-lg text-xs font-black bg-gradient-to-r from-fuchsia-500 via-pink-400 to-purple-500 text-slate-950 hover:from-fuchsia-400 hover:to-pink-300 shadow-md shadow-fuchsia-500/20 disabled:opacity-40 transition-all"
            >
              FEATURE BUY (${(bet * 100).toLocaleString()})
            </button>
          </div>

          {/* Stats Box */}
          <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Peak Spot Multiplier:</span>
              <span className="font-black text-fuchsia-300 text-base">{highestMultHit > 0 ? `${highestMultHit}x` : "1x"}</span>
            </div>
            {freeSpinsLeft > 0 && (
              <div className="flex justify-between items-center text-xs border-t border-slate-800 pt-2 text-fuchsia-300">
                <span className="font-extrabold">FREE SPINS REMAINING:</span>
                <span className="font-black text-lg text-amber-300">{freeSpinsLeft}</span>
              </div>
            )}
          </div>

          {/* Spin Action Button */}
          <button
            disabled={isSpinning}
            onClick={() => spin(false, bet)}
            className={`w-full py-4 rounded-xl font-black transition-all shadow-xl flex items-center justify-center gap-2 text-lg tracking-wide ${
              isSpinning
                ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                : "bg-gradient-to-r from-fuchsia-400 via-pink-300 to-fuchsia-500 hover:from-fuchsia-300 hover:to-pink-200 text-slate-950 shadow-fuchsia-500/30 cursor-pointer"
            }`}
          >
            <Play className="w-6 h-6 fill-slate-950" />
            {isSpinning ? "CANDIES CLUSTERING..." : `SPIN SUGAR 1000 ($${bet})`}
          </button>
        </div>

        {/* Right 7x7 Grid with Spot Multipliers */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl relative">
          <div className="grid grid-cols-7 gap-1.5 w-full max-w-[560px] aspect-square my-auto p-2 bg-slate-950/90 rounded-2xl border border-fuchsia-500/30 shadow-2xl">
            {grid.map((col, cIdx) => (
              <div key={cIdx} className="flex flex-col gap-1.5">
                {col.map((cell, rIdx) => {
                  let candyDef = CANDIES.find((c) => c.id === cell.candyId);
                  const spotMult = multiplierGrid[cIdx][rIdx];

                  return (
                    <motion.div
                      key={cell.uid}
                      layout
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1, scale: cell.isWinning ? [1, 1.2, 0] : 1 }}
                      transition={{ duration: 0.2 }}
                      className={`w-full aspect-square rounded-lg flex flex-col items-center justify-center border shadow-sm relative overflow-hidden bg-gradient-to-br ${
                        cell.isScatter
                          ? "from-fuchsia-500/40 via-purple-600/40 to-slate-950 border-fuchsia-400"
                          : candyDef?.bg || "from-slate-900 to-slate-950 border-slate-800"
                      }`}
                    >
                      {/* Spot Multiplier Overlay Badge */}
                      {spotMult > 0 && (
                        <div className="absolute top-0.5 right-0.5 bg-fuchsia-950/90 border border-fuchsia-400 px-1 py-0.2 rounded text-[9px] font-black text-fuchsia-300 z-10 shadow-sm">
                          {spotMult}x
                        </div>
                      )}

                      {cell.isScatter ? (
                        <div className="flex flex-col items-center">
                          <span className="text-xl sm:text-2xl">🚀</span>
                          <span className="text-[8px] font-black text-fuchsia-300 uppercase">BONUS</span>
                        </div>
                      ) : (
                        <span className="text-lg sm:text-xl">{candyDef?.icon || "🍬"}</span>
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
              Active Multipliers: <span className="text-fuchsia-300 font-extrabold">{highestMultHit > 0 ? `Max ${highestMultHit}x` : "None"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SugarRush1000Game;
