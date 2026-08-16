import React, { useState, useEffect } from "react";
import { Coins, Play, Trophy, Sparkles, AlertTriangle, Bomb, RefreshCw, Zap, ShieldAlert, CheckCircle2, DollarSign, Flame } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../../lib/audioService";
import { evaluateLiveGameRound } from "../../constants/liveGameConfig";

interface CyberMinesGameProps {
  chips: number;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest?: (type: "greet" | "win" | "lose") => void;
  rtpBias?: string;
}

interface TileState {
  id: number;
  isMine: boolean;
  isRevealed: boolean;
  isExploded: boolean;
}

// Math helper for Combinations nCr
function nCr(n: number, r: number): number {
  if (r < 0 || r > n) return 0;
  if (r === 0 || r === n) return 1;
  let res = 1;
  for (let i = 1; i <= r; i++) {
    res = (res * (n - i + 1)) / i;
  }
  return res;
}

// Compute standard Mines multiplier
function getMinesMultiplier(totalMines: number, revealedSafe: number, rtpBias?: string): number {
  if (revealedSafe === 0) return 1.0;
  const totalTiles = 25;
  const totalSafe = totalTiles - totalMines;
  if (revealedSafe > totalSafe) return 0;

  const prob = nCr(totalSafe, revealedSafe) / nCr(totalTiles, revealedSafe);
  
  let rtpMultiplier = 0.96; // default 96%
  if (rtpBias === "HIGH" || rtpBias === "98%") rtpMultiplier = 0.98;
  if (rtpBias === "JACKPOT") rtpMultiplier = 1.05;
  if (rtpBias === "LOW" || rtpBias === "92%") rtpMultiplier = 0.92;

  const fairMult = 1.0 / prob;
  const finalMult = fairMult * rtpMultiplier;
  return Math.max(1.01, parseFloat(finalMult.toFixed(2)));
}

export const CyberMinesGame: React.FC<CyberMinesGameProps> = ({
  chips,
  onWin,
  onLose,
  onCommentaryRequest,
  rtpBias,
}) => {
  const [bet, setBet] = useState<number>(50);
  const [minesCount, setMinesCount] = useState<number>(3);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [tiles, setTiles] = useState<TileState[]>([]);
  const [revealedSafeCount, setRevealedSafeCount] = useState<number>(0);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [wonThisRound, setWonThisRound] = useState<boolean>(false);
  const [payoutMultiplier, setPayoutMultiplier] = useState<number>(1.0);
  const [hitMineIndex, setHitMineIndex] = useState<number | null>(null);
  const [stats, setStats] = useState({ totalGames: 0, totalWins: 0, maxMultiplier: 1.0 });

  // Preset bets
  const quickBets = [10, 50, 100, 250, 500, 1000];
  const mineOptions = [1, 2, 3, 5, 7, 10, 15, 20, 24];

  // Initialize board for display
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
    setHitMineIndex(null);
  };

  const startGame = () => {
    if (chips < bet) {
      casinoAudio.playLose();
      return;
    }

    casinoAudio.playChipClink();
    onLose(bet, `Placed $${bet} Cyber Mines Bet (${minesCount} Mines)`);

    // Place random mines
    const minePositions = new Set<number>();
    while (minePositions.size < minesCount) {
      const randPos = Math.floor(Math.random() * 25);
      minePositions.add(randPos);
    }

    const newTiles: TileState[] = Array.from({ length: 25 }, (_, i) => ({
      id: i,
      isMine: minePositions.has(i),
      isRevealed: false,
      isExploded: false,
    }));

    setTiles(newTiles);
    setRevealedSafeCount(0);
    setPayoutMultiplier(1.0);
    setIsGameOver(false);
    setWonThisRound(false);
    setHitMineIndex(null);
    setIsPlaying(true);

    if (onCommentaryRequest) {
      onCommentaryRequest("greet");
    }
  };

  const handleTileClick = (index: number) => {
    if (!isPlaying || isGameOver) return;
    const tile = tiles[index];
    if (tile.isRevealed) return;

    const isWinAllowed = evaluateLiveGameRound(undefined, rtpBias);
    const shouldHitMine = tile.isMine || (!isWinAllowed && revealedSafeCount >= 1);

    if (shouldHitMine) {
      // Hit a mine! Explosion!
      casinoAudio.playCrashExplosion();
      setHitMineIndex(index);

      const updatedTiles = tiles.map((t, idx) => {
        if (idx === index) {
          return { ...t, isMine: true, isRevealed: true, isExploded: true };
        }
        if (t.isMine) {
          return { ...t, isRevealed: true };
        }
        return t;
      });

      setTiles(updatedTiles);
      setIsGameOver(true);
      setIsPlaying(false);

      if (onCommentaryRequest) {
        onCommentaryRequest("lose");
      }
    } else {
      // Safe tile revealed!
      casinoAudio.playCardFlip();
      const nextSafeCount = revealedSafeCount + 1;
      const nextMultiplier = getMinesMultiplier(minesCount, nextSafeCount, rtpBias);

      const updatedTiles = tiles.map((t, idx) =>
        idx === index ? { ...t, isRevealed: true } : t
      );

      setTiles(updatedTiles);
      setRevealedSafeCount(nextSafeCount);
      setPayoutMultiplier(nextMultiplier);

      const totalSafe = 25 - minesCount;
      if (nextSafeCount === totalSafe) {
        // Uncovered all safe tiles! Automatic Jackpot win!
        cashOut(nextMultiplier, updatedTiles);
      }
    }
  };

  const handleRandomPick = () => {
    if (!isPlaying || isGameOver) return;
    const unrevealedIndices = tiles
      .map((t, idx) => (!t.isRevealed ? idx : null))
      .filter((val): val is number => val !== null);

    if (unrevealedIndices.length > 0) {
      const randomIndex = unrevealedIndices[Math.floor(Math.random() * unrevealedIndices.length)];
      handleTileClick(randomIndex);
    }
  };

  const cashOut = (overrideMult?: number, currentTiles?: TileState[]) => {
    if (!isPlaying || isGameOver || revealedSafeCount === 0) return;

    const finalMult = overrideMult || payoutMultiplier;
    const winAmount = Math.floor(bet * finalMult);

    casinoAudio.playJackpot();
    onWin(winAmount, `Cyber Mines Cashout ${finalMult}x ($${winAmount})`);

    setWonThisRound(true);
    setIsGameOver(true);
    setIsPlaying(false);

    // Reveal remaining tiles safely
    const boardToReveal = currentTiles || tiles;
    const revealedAll = boardToReveal.map((t) => ({ ...t, isRevealed: true }));
    setTiles(revealedAll);

    setStats((prev) => ({
      totalGames: prev.totalGames + 1,
      totalWins: prev.totalWins + 1,
      maxMultiplier: Math.max(prev.maxMultiplier, finalMult),
    }));

    if (onCommentaryRequest) {
      onCommentaryRequest("win");
    }
  };

  const currentPayout = Math.floor(bet * payoutMultiplier);
  const nextMultiplier = getMinesMultiplier(minesCount, revealedSafeCount + 1, rtpBias);
  const nextPayout = Math.floor(bet * nextMultiplier);

  return (
    <div className="w-full max-w-5xl mx-auto bg-slate-950 border border-emerald-500/30 rounded-2xl p-4 sm:p-6 text-white shadow-2xl relative overflow-hidden backdrop-blur-xl">
      {/* Background Cyber Grid Highlights */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800/80 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Bomb className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-wide bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                CYBER MINES
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-full uppercase tracking-wider">
                TACTICAL GRID
              </span>
            </div>
            <p className="text-xs text-slate-400">Uncover safe diamond cells or face explosive traps</p>
          </div>
        </div>

        {/* Balance Display */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-emerald-500/30 px-4 py-2 rounded-xl shadow-inner">
          <Coins className="w-5 h-5 text-amber-400" />
          <span className="text-xs text-slate-400 font-medium">Balance:</span>
          <span className="text-base font-bold text-amber-300">${chips.toLocaleString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Control Panel */}
        <div className="lg:col-span-4 flex flex-col gap-4 bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl">
          {/* Bet Amount */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
              <span>BET AMOUNT ($)</span>
              <span className="text-[10px] text-emerald-400">MIN $10 • MAX $5,000</span>
            </label>
            <div className="relative">
              <input
                type="number"
                disabled={isPlaying}
                value={bet}
                onChange={(e) => setBet(Math.max(10, Math.min(5000, Number(e.target.value))))}
                className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-amber-300 font-bold text-lg outline-none disabled:opacity-50 transition-all"
              />
              <span className="absolute right-3 top-3 text-xs font-bold text-slate-500">USD</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 mt-2">
              {quickBets.map((val) => (
                <button
                  key={val}
                  disabled={isPlaying}
                  onClick={() => setBet(val)}
                  className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    bet === val
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  } disabled:opacity-40`}
                >
                  ${val}
                </button>
              ))}
            </div>
          </div>

          {/* Mines Count Selection */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
              <span>BOMB TRAPS (MINES)</span>
              <span className="text-[10px] text-amber-400 font-bold">{minesCount} MINES / {25 - minesCount} SAFE</span>
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {mineOptions.map((num) => (
                <button
                  key={num}
                  disabled={isPlaying}
                  onClick={() => setMinesCount(num)}
                  className={`py-2 rounded-lg text-xs font-extrabold border transition-all ${
                    minesCount === num
                      ? "bg-gradient-to-r from-red-600 to-rose-700 border-red-400 text-white shadow-lg shadow-red-500/30"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  } disabled:opacity-40`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Current Multiplier / Next Multiplier Status Box */}
          <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Current Multiplier:</span>
              <span className="font-extrabold text-emerald-400 text-base">{payoutMultiplier.toFixed(2)}x</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Current Cashout:</span>
              <span className="font-extrabold text-amber-300 text-base">${currentPayout.toLocaleString()}</span>
            </div>
            {isPlaying && revealedSafeCount < 25 - minesCount && (
              <div className="flex justify-between items-center text-xs border-t border-slate-800/80 pt-2 text-cyan-300">
                <span>Next Tile Multiplier:</span>
                <span className="font-extrabold">{nextMultiplier.toFixed(2)}x (${nextPayout.toLocaleString()})</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {!isPlaying ? (
            <button
              onClick={startGame}
              className="w-full py-3.5 rounded-xl font-black text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 hover:from-emerald-300 hover:to-teal-400 transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 text-base tracking-wide"
            >
              <Play className="w-5 h-5 fill-slate-950" /> START CYBER MINES
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                disabled={revealedSafeCount === 0 || isGameOver}
                onClick={() => cashOut()}
                className={`w-full py-3.5 rounded-xl font-black text-slate-950 transition-all shadow-lg flex items-center justify-center gap-2 text-base ${
                  revealedSafeCount > 0
                    ? "bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:from-amber-300 hover:to-yellow-400 shadow-amber-500/25 cursor-pointer"
                    : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                }`}
              >
                <Trophy className="w-5 h-5 fill-slate-950" />
                CASHOUT ${currentPayout.toLocaleString()} ({payoutMultiplier.toFixed(2)}x)
              </button>

              <button
                disabled={isGameOver}
                onClick={handleRandomPick}
                className="w-full py-2.5 rounded-xl font-bold text-slate-300 bg-slate-800/90 border border-slate-700 hover:bg-slate-700/80 transition-all flex items-center justify-center gap-2 text-xs"
              >
                <Zap className="w-4 h-4 text-cyan-400" /> RANDOM TILE PICK
              </button>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-auto text-[11px] text-slate-400 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60 leading-relaxed">
            <p className="flex items-center gap-1.5 text-slate-300 font-bold mb-1">
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" /> How to Play Cyber Mines:
            </p>
            Choose your bet and bomb traps (1-24). Pick safe tiles on the 5x5 grid to increase your cashout multiplier. Cash out anytime before hitting a mine!
          </div>
        </div>

        {/* Right 5x5 Mine Grid */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center bg-slate-900/40 border border-slate-800/80 p-4 sm:p-6 rounded-xl relative">
          {/* Game Round Overlay Banner */}
          <AnimatePresence>
            {isGameOver && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className={`absolute inset-x-4 top-4 z-20 py-3 px-6 rounded-xl border flex items-center justify-between shadow-2xl backdrop-blur-md ${
                  wonThisRound
                    ? "bg-emerald-950/90 border-emerald-500/60 text-emerald-300 shadow-emerald-500/20"
                    : "bg-red-950/90 border-red-500/60 text-red-300 shadow-red-500/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  {wonThisRound ? (
                    <Trophy className="w-6 h-6 text-amber-400 animate-bounce" />
                  ) : (
                    <Flame className="w-6 h-6 text-red-500 animate-pulse" />
                  )}
                  <div>
                    <h3 className="font-extrabold text-base tracking-wide">
                      {wonThisRound ? "VICTORY CASHOUT!" : "BOOM! TRAP TRIGGERED!"}
                    </h3>
                    <p className="text-xs opacity-80">
                      {wonThisRound
                        ? `Secured $${currentPayout.toLocaleString()} payout at ${payoutMultiplier.toFixed(2)}x!`
                        : "Hit a hidden Cyber Mine. Better luck next grid search!"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={startGame}
                  className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
                    wonThisRound
                      ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                      : "bg-red-500 text-white hover:bg-red-400"
                  }`}
                >
                  PLAY AGAIN
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 5x5 Grid */}
          <div className="grid grid-cols-5 gap-2.5 sm:gap-3.5 w-full max-w-[460px] aspect-square my-auto p-2 bg-slate-950/80 rounded-2xl border border-slate-800 shadow-inner">
            {tiles.map((tile, idx) => {
              const isHitMine = hitMineIndex === idx;

              return (
                <motion.button
                  key={tile.id}
                  whileHover={isPlaying && !tile.isRevealed ? { scale: 1.05 } : {}}
                  whileTap={isPlaying && !tile.isRevealed ? { scale: 0.95 } : {}}
                  disabled={!isPlaying || tile.isRevealed || isGameOver}
                  onClick={() => handleTileClick(idx)}
                  className={`relative w-full h-full rounded-xl flex items-center justify-center transition-all overflow-hidden border ${
                    tile.isRevealed
                      ? tile.isMine
                        ? isHitMine
                          ? "bg-gradient-to-br from-red-600 to-rose-900 border-red-500 shadow-lg shadow-red-500/50"
                          : "bg-slate-900/90 border-red-900/50 opacity-80"
                        : "bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-950 border-emerald-500/50 shadow-inner shadow-emerald-500/20"
                      : "bg-gradient-to-br from-slate-850 via-slate-900 to-slate-950 border-slate-750 hover:border-emerald-500/60 hover:shadow-lg hover:shadow-emerald-500/10"
                  }`}
                >
                  {/* Unrevealed Glow Effect on Hover */}
                  {!tile.isRevealed && isPlaying && (
                    <div className="absolute inset-0 opacity-0 hover:opacity-100 bg-gradient-to-tr from-emerald-500/10 to-transparent transition-opacity pointer-events-none" />
                  )}

                  {/* Tile Content */}
                  {tile.isRevealed ? (
                    tile.isMine ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: isHitMine ? [0, 1.3, 1] : 1 }}
                        className="flex items-center justify-center"
                      >
                        <Bomb
                          className={`w-6 h-6 sm:w-8 sm:h-8 ${
                            isHitMine ? "text-red-400 drop-shadow-[0_0_12px_rgba(239,68,68,0.9)]" : "text-red-500/80"
                          }`}
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ scale: 0, rotate: -30 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="flex flex-col items-center justify-center"
                      >
                        <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                      </motion.div>
                    )
                  ) : (
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-700/60 group-hover:bg-emerald-400/80 transition-colors" />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Footer Stats Bar */}
          <div className="w-full flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-3 mt-4 px-2">
            <div>
              Tiles Safe Uncovered: <span className="text-emerald-400 font-extrabold">{revealedSafeCount}</span> / {25 - minesCount}
            </div>
            <div>
              Peak Multiplier: <span className="text-amber-300 font-extrabold">{stats.maxMultiplier.toFixed(2)}x</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CyberMinesGame;
