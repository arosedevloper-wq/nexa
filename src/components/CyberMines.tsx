import React, { useState, useEffect } from "react";
import { Coins, Play, Trophy, Sparkles, AlertTriangle, Bomb, HelpCircle, Check, DollarSign } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../lib/audioService";
import { evaluateLiveGameRound } from "../constants/liveGameConfig";

interface CyberMinesProps {
  chips: number;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest: (type: "greet" | "win" | "lose") => void;
}

interface TileState {
  id: number;
  isMine: boolean;
  isRevealed: boolean;
  isExploded: boolean;
}

// Function to compute combinations nCr
function nCr(n: number, r: number): number {
  if (r < 0 || r > n) return 0;
  if (r === 0 || r === n) return 1;
  let result = 1;
  for (let i = 1; i <= r; i++) {
    result = (result * (n - i + 1)) / i;
  }
  return result;
}

// Compute Mines multiplier based on total tiles (25), mines count, and revealed safe tiles
function getMinesMultiplier(totalMines: number, revealedSafeCount: number): number {
  if (revealedSafeCount === 0) return 1.0;
  const totalTiles = 25;
  const totalSafeTiles = totalTiles - totalMines;
  if (revealedSafeCount > totalSafeTiles) return 0;

  const prob = nCr(totalSafeTiles, revealedSafeCount) / nCr(totalTiles, revealedSafeCount);
  const fairMultiplier = 1.1 / prob; // add small offset bonus/house adjustment
  // Standard casino house edge adjustment (e.g. 96% return to player)
  const finalMult = fairMultiplier * 0.96;
  return Math.max(1.01, parseFloat(finalMult.toFixed(2)));
}

export default function CyberMines({ chips, onWin, onLose, onCommentaryRequest }: CyberMinesProps) {
  const [bet, setBet] = useState(50);
  const [minesCount, setMinesCount] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tiles, setTiles] = useState<TileState[]>([]);
  const [revealedSafeCount, setRevealedSafeCount] = useState(0);
  const [isWinRound, setIsWinRound] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [wonThisRound, setWonThisRound] = useState(false);
  const [payoutMultiplier, setPayoutMultiplier] = useState(1.0);
  const [stats, setStats] = useState({ totalGames: 0, totalBets: 0, totalWins: 0, maxWinMultiplier: 1.0 });

  // Generate blank initial board for display in inactive state
  useEffect(() => {
    if (!isPlaying) {
      resetBoardDisplay();
    }
  }, [minesCount, isPlaying]);

  const resetBoardDisplay = () => {
    const tempTiles: TileState[] = Array.from({ length: 25 }, (_, i) => ({
      id: i,
      isMine: false,
      isRevealed: false,
      isExploded: false,
    }));
    setTiles(tempTiles);
    setRevealedSafeCount(0);
    setPayoutMultiplier(1.0);
    setIsGameOver(false);
    setWonThisRound(false);
  };

  const startGame = () => {
    if (chips < bet) {
      casinoAudio.playLose();
      return;
    }

    casinoAudio.playChipClink();
    onLose(bet, `Placed $${bet} Cyber Mines Bet`);

    // Place random mines
    const minePositions = new Set<number>();
    while (minePositions.size < minesCount) {
      const randomPos = Math.floor(Math.random() * 25);
      minePositions.add(randomPos);
    }

    const initialTiles: TileState[] = Array.from({ length: 25 }, (_, i) => ({
      id: i,
      isMine: minePositions.has(i),
      isRevealed: false,
      isExploded: false,
    }));

    setTiles(initialTiles);
    setRevealedSafeCount(0);
    setIsWinRound(evaluateLiveGameRound());
    setPayoutMultiplier(1.0);
    setIsPlaying(true);
    setIsGameOver(false);
    setWonThisRound(false);

    setStats((prev) => ({
      ...prev,
      totalGames: prev.totalGames + 1,
      totalBets: prev.totalBets + bet,
    }));
  };

  const handleTileClick = (clickedIndex: number) => {
    if (!isPlaying || isGameOver) return;
    const tile = tiles[clickedIndex];
    if (tile.isRevealed) return;

    // Reveal tile
    const updatedTiles = [...tiles];
    updatedTiles[clickedIndex] = { ...tile, isRevealed: true };

    if (tile.isMine) {
      // Hit a mine! Boom!
      updatedTiles[clickedIndex].isExploded = true;
      // Reveal all mines to show where they were
      updatedTiles.forEach((t) => {
        if (t.isMine) {
          t.isRevealed = true;
        }
      });

      setTiles(updatedTiles);
      setIsGameOver(true);
      setIsPlaying(false);
      setWonThisRound(false);
      casinoAudio.playLose();
      onCommentaryRequest("lose");
    } else {
      // Safe tile revealed!
      const nextSafeCount = revealedSafeCount + 1;
      const nextMult = getMinesMultiplier(minesCount, nextSafeCount);

      setTiles(updatedTiles);
      setRevealedSafeCount(nextSafeCount);
      setPayoutMultiplier(nextMult);
      casinoAudio.playWin();

      // If all safe tiles are found, trigger automatic jackpot/max win
      const totalSafeTiles = 25 - minesCount;
      if (nextSafeCount === totalSafeTiles) {
        handleCashOutWithTiles(updatedTiles, nextMult);
      }
    }
  };

  const handleCashOut = () => {
    if (!isPlaying || isGameOver) return;
    handleCashOutWithTiles(tiles, payoutMultiplier);
  };

  const handleCashOutWithTiles = (currentTiles: TileState[], finalMult: number) => {
    const finalWin = bet * finalMult;
    
    // Reveal everything
    const updatedTiles = currentTiles.map((t) => ({ ...t, isRevealed: true }));
    setTiles(updatedTiles);
    setIsGameOver(true);
    setIsPlaying(false);
    setWonThisRound(true);

    onWin(finalWin, `Cyber Mines: Successfully cashed out ${finalMult}x on a ${minesCount}-mine layout! Earned $${finalWin.toFixed(2)}.`);
    casinoAudio.playWin();

    setStats((prev) => ({
      ...prev,
      totalWins: prev.totalWins + 1,
      maxWinMultiplier: Math.max(prev.maxWinMultiplier, finalMult),
    }));

    if (finalMult >= 2.5) {
      onCommentaryRequest("win");
    }
  };

  const adjustBet = (amount: number) => {
    if (isPlaying) return;
    casinoAudio.playClick();
    setBet(amount);
  };

  // Pre-calculate multipliers list for preview
  const previewMultipliers = [1, 2, 3, 4, 5].map((count) => ({
    count,
    mult: getMinesMultiplier(minesCount, count),
  }));

  return (
    <div id="mines-game-container" className="flex flex-col gap-6 p-4 sm:p-6 rounded-3xl border border-slate-900 bg-slate-950/80 backdrop-blur-xl relative overflow-hidden shadow-2xl glow-fuchsia">
      {/* Background ambient visuals */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-950/20 via-slate-950/30 to-slate-950 pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[9px] uppercase tracking-widest font-mono font-black rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              TACTICAL MINI-GAME
            </span>
            <span className="flex items-center gap-1 text-[9px] uppercase tracking-widest font-mono font-black rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <Sparkles className="h-2.5 w-2.5 text-rose-400" /> NEW RE-DESIGNS
            </span>
          </div>
          <h2 className="text-xl font-sans font-black text-white tracking-tight mt-1 flex items-center gap-2">
            Cyber Mines <span className="text-emerald-500 text-sm">$</span>
          </h2>
        </div>

        {/* Stats Strip */}
        <div className="flex gap-4 font-mono text-[10px] text-slate-500 bg-slate-900/40 border border-white/[0.02] p-2.5 rounded-2xl">
          <div className="flex flex-col">
            <span className="text-slate-400 font-extrabold uppercase">GAMES PLAYED</span>
            <span className="text-xs font-black text-slate-100">{stats.totalGames}</span>
          </div>
          <div className="w-[1px] bg-white/[0.04]" />
          <div className="flex flex-col">
            <span className="text-slate-400 font-extrabold uppercase">TOTAL BET</span>
            <span className="text-xs font-black text-slate-100">${stats.totalBets}</span>
          </div>
          <div className="w-[1px] bg-white/[0.04]" />
          <div className="flex flex-col">
            <span className="text-slate-400 font-extrabold uppercase">MAX MULTIPLIER</span>
            <span className="text-xs font-black text-emerald-400">{stats.maxWinMultiplier.toFixed(2)}x</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch z-10">
        {/* Left Side: Game Controller Panel */}
        <div className="lg:col-span-4 flex flex-col justify-between p-5 bg-slate-900/40 border border-white/[0.02] rounded-2xl space-y-4">
          <div className="space-y-4">
            {/* Bet Input Section */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] uppercase font-mono tracking-widest text-slate-400 font-extrabold flex items-center gap-1.5">
                  <Coins className="h-3.5 w-3.5 text-slate-400" /> WAGER AMOUNT
                </label>
                <span className="text-[10px] font-mono font-bold text-emerald-400">USDT</span>
              </div>

              <input
                type="number"
                min={10}
                max={Math.max(10, chips)}
                disabled={isPlaying}
                value={bet}
                onChange={(e) => setBet(Math.max(10, Number(e.target.value)))}
                className="w-full px-4 py-3 bg-slate-950 border border-white/[0.04] disabled:opacity-50 hover:border-slate-850 focus:border-emerald-500 focus:outline-none rounded-xl font-mono text-xs font-bold text-white transition-all shadow-inner"
              />

              <div className="grid grid-cols-5 gap-1.5">
                {[10, 25, 50, 100].map((amt) => (
                  <button
                    key={amt}
                    disabled={isPlaying}
                    onClick={() => adjustBet(amt)}
                    className="py-1.5 rounded-lg bg-slate-950 hover:bg-slate-900 disabled:opacity-50 border border-white/[0.02] font-mono text-[10px] text-slate-400 hover:text-white transition-all cursor-pointer"
                  >
                    ${amt}
                  </button>
                ))}
                <button
                  disabled={isPlaying}
                  onClick={() => adjustBet(chips)}
                  className="py-1.5 rounded-lg bg-slate-950 hover:bg-slate-900 disabled:opacity-50 border border-emerald-500/20 font-mono text-[10px] text-emerald-400 hover:text-emerald-300 font-bold transition-all cursor-pointer"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Mine Count Section */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] uppercase font-mono tracking-widest text-slate-400 font-extrabold flex items-center gap-1.5">
                  <Bomb className="h-3.5 w-3.5 text-rose-400" /> MINES ON FIELD
                </label>
                <span className="text-[10px] font-mono font-bold text-rose-400">{minesCount} Mines</span>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={24}
                  disabled={isPlaying}
                  value={minesCount}
                  onChange={(e) => {
                    casinoAudio.playClick();
                    setMinesCount(Number(e.target.value));
                  }}
                  className="flex-1 accent-rose-500 cursor-pointer h-1.5 bg-slate-950 rounded-lg appearance-none"
                />
              </div>

              <div className="grid grid-cols-4 gap-1.5 mt-2">
                {[1, 3, 5, 10, 15, 20, 24].map((num) => (
                  <button
                    key={num}
                    disabled={isPlaying}
                    onClick={() => {
                      casinoAudio.playClick();
                      setMinesCount(num);
                    }}
                    className={`py-1.5 rounded-lg border text-[10px] font-mono transition-all cursor-pointer ${
                      minesCount === num
                        ? "bg-rose-500 text-white border-rose-400 font-bold"
                        : "bg-slate-950 border-white/[0.02] text-slate-400 hover:text-white"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Payout Forecast multiplier previews */}
            <div className="bg-slate-950/60 p-3 rounded-xl border border-white/[0.01] space-y-2">
              <div className="text-[9px] uppercase tracking-wider font-mono font-bold text-slate-500">
                Wager Forecast (Consecutive Safe Tiles)
              </div>
              <div className="grid grid-cols-5 gap-1 text-center">
                {previewMultipliers.map(({ count, mult }) => (
                  <div key={count} className="p-1 bg-slate-900/50 rounded border border-white/[0.01]">
                    <div className="text-[8px] text-slate-500 font-mono">#{count}</div>
                    <div className="text-[9.5px] font-mono font-black text-emerald-400">
                      {mult.toFixed(2)}x
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pt-4">
            {!isPlaying ? (
              <button
                onClick={startGame}
                disabled={chips < bet}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-sans font-black text-xs rounded-2xl shadow-lg shadow-emerald-950/40 hover:shadow-emerald-500/10 cursor-pointer transition-all disabled:opacity-40 active:scale-[0.98] flex items-center justify-center gap-2 uppercase tracking-widest"
              >
                <Play className="h-4 w-4 fill-white text-white" /> PLACE WAGER (${bet})
              </button>
            ) : (
              <button
                onClick={handleCashOut}
                disabled={revealedSafeCount === 0}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-sans font-black text-sm rounded-2xl shadow-lg shadow-amber-950/30 hover:shadow-amber-400/20 cursor-pointer transition-all disabled:opacity-40 active:scale-[0.98] flex flex-col items-center justify-center gap-0.5 tracking-wider"
              >
                <span className="flex items-center gap-1.5 uppercase font-black text-xs">
                  <DollarSign className="h-4 w-4" /> CASH OUT
                </span>
                <span className="text-[10px] font-mono font-bold opacity-80">
                  Claim ${(bet * payoutMultiplier).toFixed(2)} ({payoutMultiplier.toFixed(2)}x)
                </span>
              </button>
            )}

            {isPlaying && (
              <div className="text-center">
                <span className="text-[9px] font-mono text-slate-500 animate-pulse uppercase tracking-widest">
                  Reveal safe tiles on the grid to multiplier up!
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: 5x5 Mines grid board & live score */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Real-time Game Screen Overlay / multiplier display */}
          <div className="grid grid-cols-3 gap-2.5 items-center p-3.5 bg-slate-950/50 border border-white/[0.02] rounded-2xl font-mono text-xs">
            <div className="flex flex-col items-center p-2 rounded-xl bg-slate-900/30 border border-white/[0.01]">
              <span className="text-[8px] text-slate-500 uppercase font-black">SAFE REVEALED</span>
              <span className="text-sm font-black text-white mt-0.5">
                {revealedSafeCount} / {25 - minesCount}
              </span>
            </div>

            <div className="flex flex-col items-center p-2 rounded-xl bg-slate-900/30 border border-white/[0.01] relative overflow-hidden">
              <span className="text-[8px] text-slate-500 uppercase font-black">CURRENT PROFIT</span>
              <span className="text-sm font-black text-emerald-400 mt-0.5">
                ${(bet * (payoutMultiplier - 1.0)).toFixed(2)}
              </span>
            </div>

            <div className="flex flex-col items-center p-2 rounded-xl bg-slate-900/30 border border-white/[0.01]">
              <span className="text-[8px] text-slate-500 uppercase font-black">NEXT MULTIPLIER</span>
              <span className="text-sm font-black text-amber-400 mt-0.5">
                {getMinesMultiplier(minesCount, revealedSafeCount + 1).toFixed(2)}x
              </span>
            </div>
          </div>

          {/* Grid visual card */}
          <div className="flex-1 flex items-center justify-center p-6 bg-slate-950/80 border border-white/[0.03] rounded-3xl relative min-h-[380px]">
            {/* Status Feedback Overlay screen */}
            <AnimatePresence>
              {isGameOver && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-950/90 z-20 flex flex-col items-center justify-center p-6 text-center rounded-3xl"
                >
                  {wonThisRound ? (
                    <div className="space-y-4">
                      <div className="inline-flex p-3 bg-amber-500/10 border border-amber-500/30 rounded-full animate-bounce">
                        <Trophy className="h-8 w-8 text-amber-400" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xl font-sans font-black text-white uppercase tracking-tight">
                          Round Cashed Out!
                        </h3>
                        <p className="text-xs text-slate-400 font-mono">
                          You secured your profit stack before triggering any defense grids.
                        </p>
                      </div>
                      <div className="py-2.5 px-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 inline-block font-mono">
                        <div className="text-[10px] text-slate-500 font-bold uppercase">Payout Multiplier</div>
                        <div className="text-2xl font-black text-amber-400">{payoutMultiplier.toFixed(2)}x</div>
                        <div className="text-xs font-semibold text-emerald-400 mt-0.5">+${(bet * payoutMultiplier).toFixed(2)} Chips</div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="inline-flex p-3 bg-rose-500/10 border border-rose-500/30 rounded-full animate-pulse">
                        <AlertTriangle className="h-8 w-8 text-rose-500" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xl font-sans font-black text-white uppercase tracking-tight">
                          Grid Exploded! 💥
                        </h3>
                        <p className="text-xs text-slate-400 font-mono">
                          You uncovered an automated VIP terminal security mine.
                        </p>
                      </div>
                      <div className="py-2 px-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 inline-block font-mono">
                        <div className="text-[10px] text-slate-500 font-bold uppercase">Wager lost</div>
                        <div className="text-lg font-black text-rose-500">-${bet.toFixed(2)} Chips</div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={resetBoardDisplay}
                    className="mt-6 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 border border-white/[0.04] text-slate-300 hover:text-white rounded-xl font-mono text-xs font-bold tracking-wider uppercase transition-all cursor-pointer active:scale-95"
                  >
                    Reset Field Grid
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 5x5 Grid implementation */}
            <div className="grid grid-cols-5 gap-3 w-full max-w-[340px] aspect-square">
              {tiles.map((tile, idx) => {
                const isRevealed = tile.isRevealed;
                const isMine = tile.isMine;
                const isExploded = tile.isExploded;

                return (
                  <motion.button
                    key={tile.id}
                    onClick={() => handleTileClick(idx)}
                    disabled={!isPlaying || isRevealed || isGameOver}
                    whileHover={isPlaying && !isRevealed ? { scale: 1.05 } : {}}
                    whileTap={isPlaying && !isRevealed ? { scale: 0.95 } : {}}
                    className={`aspect-square rounded-xl border relative flex items-center justify-center transition-all cursor-pointer shadow-md select-none ${
                      isRevealed
                        ? isMine
                          ? isExploded
                            ? "bg-rose-500/20 border-rose-500 text-rose-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                            : "bg-rose-950/40 border-rose-500/30 text-rose-500/80"
                          : "bg-emerald-950/40 border-emerald-500/40 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                        : isPlaying
                        ? "bg-slate-900 hover:bg-slate-850 border-white/[0.04] hover:border-emerald-500/20 shadow-inner"
                        : "bg-slate-900/60 border-white/[0.02] opacity-75"
                    }`}
                  >
                    {isRevealed ? (
                      <motion.div
                        initial={{ scale: 0.3, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 200, damping: 10 }}
                      >
                        {isMine ? (
                          isExploded ? (
                            <span className="text-xl filter drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]">💥</span>
                          ) : (
                            <Bomb className="h-5 w-5 text-rose-500" />
                          )
                        ) : (
                          <span className="text-lg filter drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]">💎</span>
                        )}
                      </motion.div>
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        {isPlaying ? (
                          <HelpCircle className="h-4 w-4 text-slate-600 group-hover:text-emerald-500 transition-colors" />
                        ) : (
                          <div className="h-1.5 w-1.5 rounded-full bg-slate-800" />
                        )}
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
