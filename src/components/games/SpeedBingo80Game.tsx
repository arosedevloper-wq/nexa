import React, { useState, useEffect } from "react";
import { Coins, Play, Sparkles, Trophy, Dices, RotateCcw, CheckCircle, Flame } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../../lib/audioService";
import { evaluateLiveGameRound } from "../../constants/liveGameConfig";

interface SpeedBingo80GameProps {
  chips: number;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest?: (type: "greet" | "win" | "lose") => void;
  rtpBias?: string;
}

interface BingoCell {
  num: number;
  col: number; // 0: Red (1-20), 1: Yellow (21-40), 2: Blue (41-60), 3: Silver (61-80)
  daubed: boolean;
}

export const SpeedBingo80Game: React.FC<SpeedBingo80GameProps> = ({
  chips,
  onWin,
  onLose,
  onCommentaryRequest,
  rtpBias,
}) => {
  const [bet, setBet] = useState<number>(25);
  const [card, setCard] = useState<BingoCell[][]>([]);
  const [drawnBalls, setDrawnBalls] = useState<number[]>([]);
  const [currentBall, setCurrentBall] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [winningPatterns, setWinningPatterns] = useState<string[]>([]);
  const [lastWinAmount, setLastWinAmount] = useState<number | null>(null);

  const quickBets = [10, 25, 50, 100, 250];

  const generateCard = (): BingoCell[][] => {
    const cols: BingoCell[][] = [];

    for (let c = 0; c < 4; c++) {
      const min = c * 20 + 1;
      const max = (c + 1) * 20;
      const colNums: number[] = [];

      while (colNums.length < 4) {
        const rand = Math.floor(Math.random() * (max - min + 1)) + min;
        if (!colNums.includes(rand)) colNums.push(rand);
      }
      colNums.sort((a, b) => a - b);

      cols.push(colNums.map((num) => ({ num, col: c, daubed: false })));
    }

    return cols;
  };

  useEffect(() => {
    setCard(generateCard());
  }, []);

  const newCard = () => {
    if (isPlaying) return;
    casinoAudio.playChipClink();
    setCard(generateCard());
    setDrawnBalls([]);
    setCurrentBall(null);
    setWinningPatterns([]);
    setLastWinAmount(null);
  };

  const startBingoDraw = async () => {
    if (isPlaying) return;

    if (chips < bet) {
      casinoAudio.playLose();
      return;
    }

    casinoAudio.playChipClink();
    onLose(bet, `Speed Bingo 80 Bet ($${bet})`);

    setIsPlaying(true);
    setDrawnBalls([]);
    setCurrentBall(null);
    setWinningPatterns([]);
    setLastWinAmount(null);

    // Reset daub state
    let activeCard = card.map((col) => col.map((cell) => ({ ...cell, daubed: false })));
    setCard([...activeCard]);

    // Prepare ball pool (1-80)
    const cardNums = activeCard.flatMap((col) => col.map((cell) => cell.num));
    const isWinAllowed = evaluateLiveGameRound(undefined, rtpBias);
    let pool: number[];
    if (!isWinAllowed) {
      const uncarded = Array.from({ length: 80 }, (_, i) => i + 1).filter((n) => !cardNums.slice(0, 12).includes(n));
      pool = uncarded.sort(() => Math.random() - 0.5);
    } else {
      pool = Array.from({ length: 80 }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
    }
    const drawn: number[] = [];

    // Rapidly draw 35 balls
    const totalDrawCount = 35;

    for (let step = 0; step < totalDrawCount; step++) {
      const randIdx = Math.floor(Math.random() * pool.length);
      const ball = pool.splice(randIdx, 1)[0];
      drawn.push(ball);

      casinoAudio.playCardFlip();
      setCurrentBall(ball);
      setDrawnBalls([...drawn]);

      // Daub card if matching
      activeCard = activeCard.map((col) =>
        col.map((cell) => {
          if (cell.num === ball) {
            return { ...cell, daubed: true };
          }
          return cell;
        })
      );
      setCard([...activeCard]);

      await new Promise((res) => setTimeout(res, 90));
    }

    // Evaluate Winning Patterns
    const detectedPatterns: string[] = [];
    let linesCount = 0;

    // Check 4 Vertical Lines
    for (let c = 0; c < 4; c++) {
      if (activeCard[c].every((cell) => cell.daubed)) linesCount++;
    }

    // Check 4 Horizontal Lines
    for (let r = 0; r < 4; r++) {
      if ([0, 1, 2, 3].every((c) => activeCard[c][r].daubed)) linesCount++;
    }

    // Check 4 Corners
    const corners = [
      activeCard[0][0].daubed,
      activeCard[3][0].daubed,
      activeCard[0][3].daubed,
      activeCard[3][3].daubed,
    ];
    const isCorners = corners.every(Boolean);

    // Check Full House (all 16 daubed)
    const isFullHouse = activeCard.every((col) => col.every((cell) => cell.daubed));

    let totalWinMultiplier = 0;

    if (isFullHouse) {
      detectedPatterns.push("FULL HOUSE (100x)");
      totalWinMultiplier += 100;
    } else {
      if (linesCount >= 2) {
        detectedPatterns.push(`DOUBLE LINE (${linesCount} Lines - 25x)`);
        totalWinMultiplier += 25;
      } else if (linesCount === 1) {
        detectedPatterns.push("SINGLE LINE (10x)");
        totalWinMultiplier += 10;
      }

      if (isCorners) {
        detectedPatterns.push("4 CORNERS (15x)");
        totalWinMultiplier += 15;
      }
    }

    setWinningPatterns(detectedPatterns);

    const finalWin = Math.floor(bet * totalWinMultiplier);

    if (finalWin > 0) {
      casinoAudio.playJackpot();
      setLastWinAmount(finalWin);
      onWin(finalWin, `Speed Bingo 80 Win (${detectedPatterns.join(", ")}) -> $${finalWin}`);
    } else {
      casinoAudio.playLose();
    }

    setIsPlaying(false);
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-slate-950 border border-purple-500/30 rounded-2xl p-4 sm:p-6 text-white shadow-2xl relative overflow-hidden backdrop-blur-xl">
      {/* Atmosphere Glow */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-gradient-to-b from-purple-500/15 via-indigo-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800/80 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 via-indigo-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Dices className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-wide bg-gradient-to-r from-purple-300 via-pink-200 to-amber-200 bg-clip-text text-transparent">
                SPEED BINGO 80
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-500/20 border border-purple-500/40 text-purple-300 rounded-full uppercase tracking-wider">
                FAST 35-BALL DRAW • UP TO 100x FULL HOUSE
              </span>
            </div>
            <p className="text-xs text-slate-400">4x4 Color Grid • Single Line, Double Line, 4 Corners & Full House</p>
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
        {/* Left Side Controls */}
        <div className="lg:col-span-4 flex flex-col gap-4 bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl">
          {/* Bet Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
              <span>CARD BET AMOUNT ($)</span>
              <span className="text-[10px] text-purple-400">MIN $0.10 • MAX $500</span>
            </label>
            <div className="relative">
              <input
                type="number"
                disabled={isPlaying}
                value={bet}
                onChange={(e) => setBet(Math.max(10, Math.min(500, Number(e.target.value))))}
                className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl px-4 py-2.5 text-amber-300 font-bold text-lg outline-none disabled:opacity-50 transition-all"
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
                      ? "bg-purple-500/20 border-purple-500 text-purple-300"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  } disabled:opacity-40`}
                >
                  ${val}
                </button>
              ))}
            </div>
          </div>

          {/* New Card Selector */}
          <button
            disabled={isPlaying}
            onClick={newCard}
            className="w-full py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-xs font-bold text-slate-300 hover:text-white disabled:opacity-40 transition-all flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" /> RE-ROLL BINGO CARD
          </button>

          {/* Pattern Paytable */}
          <div className="bg-slate-950 border border-purple-500/30 p-3 rounded-xl flex flex-col gap-1.5 text-xs">
            <span className="font-extrabold text-purple-300">PATTERN PAYOUTS:</span>
            <div className="flex justify-between text-slate-300">
              <span>Single Line:</span> <span className="font-bold text-amber-300">10x Bet</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Double Line:</span> <span className="font-bold text-amber-300">25x Bet</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>4 Corners:</span> <span className="font-bold text-amber-300">15x Bet</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Full House:</span> <span className="font-bold text-amber-300">100x Bet</span>
            </div>
          </div>

          {/* Start Draw Action Button */}
          <button
            disabled={isPlaying}
            onClick={startBingoDraw}
            className={`w-full py-4 rounded-xl font-black transition-all shadow-xl flex items-center justify-center gap-2 text-lg tracking-wide ${
              isPlaying
                ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-500 via-pink-400 to-amber-400 hover:from-purple-400 text-slate-950 shadow-purple-500/30 cursor-pointer"
            }`}
          >
            <Play className="w-6 h-6 fill-slate-950" />
            {isPlaying ? "DRAWING BALLS..." : `PLAY SPEED BINGO ($${bet})`}
          </button>
        </div>

        {/* Right Side Bingo Card & Ball Display */}
        <div className="lg:col-span-8 flex flex-col items-center justify-between bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl">
          {/* Live Ball Announcer */}
          <div className="flex items-center justify-between w-full bg-slate-950 border border-slate-800 p-3 rounded-xl mb-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400">CURRENT BALL:</span>
              {currentBall !== null ? (
                <motion.div
                  key={currentBall}
                  initial={{ scale: 0.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-700 text-slate-950 font-black text-xl flex items-center justify-center shadow-lg border-2 border-amber-300"
                >
                  {currentBall}
                </motion.div>
              ) : (
                <span className="text-sm font-bold text-slate-600">--</span>
              )}
            </div>

            <div className="text-right">
              <div className="text-[10px] text-slate-400 font-bold uppercase">BALLS DRAWN</div>
              <div className="text-base font-black text-purple-300">{drawnBalls.length} / 35</div>
            </div>
          </div>

          {/* 4x4 Color-Coded Bingo Card Grid */}
          <div className="grid grid-cols-4 gap-2.5 w-full max-w-[420px] aspect-square p-3 bg-slate-950 rounded-2xl border border-purple-500/40 shadow-2xl my-auto">
            {/* Column Headers */}
            {["RED (1-20)", "YEL (21-40)", "BLU (41-60)", "SIL (61-80)"].map((hdr, idx) => (
              <div
                key={idx}
                className={`py-1 text-[9px] font-black text-center rounded uppercase tracking-wider ${
                  idx === 0
                    ? "bg-red-950 text-red-300 border border-red-700"
                    : idx === 1
                    ? "bg-amber-950 text-amber-300 border border-amber-700"
                    : idx === 2
                    ? "bg-blue-950 text-blue-300 border border-blue-700"
                    : "bg-slate-800 text-slate-200 border border-slate-600"
                }`}
              >
                {hdr}
              </div>
            ))}

            {/* 16 Cells (4 Columns x 4 Rows) */}
            {Array.from({ length: 4 }).map((_, rIdx) =>
              Array.from({ length: 4 }).map((_, cIdx) => {
                const cell = card[cIdx]?.[rIdx];
                if (!cell) return null;

                return (
                  <motion.div
                    key={`${cIdx}-${rIdx}`}
                    layout
                    className={`rounded-xl flex flex-col items-center justify-center font-black text-lg border shadow-md relative transition-all ${
                      cell.daubed
                        ? "bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 text-slate-950 border-amber-300 scale-105 z-10 shadow-amber-500/40 ring-2 ring-amber-300"
                        : cIdx === 0
                        ? "bg-red-950/40 border-red-900/60 text-red-200"
                        : cIdx === 1
                        ? "bg-amber-950/40 border-amber-900/60 text-amber-200"
                        : cIdx === 2
                        ? "bg-blue-950/40 border-blue-900/60 text-blue-200"
                        : "bg-slate-900 border-slate-800 text-slate-200"
                    }`}
                  >
                    <span>{cell.num}</span>
                    {cell.daubed && (
                      <CheckCircle className="w-4 h-4 text-slate-950 absolute top-1 right-1 stroke-[3]" />
                    )}
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Results Ribbon */}
          <div className="w-full flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-3 mt-4 px-2">
            <div>
              Patterns:{" "}
              {winningPatterns.length > 0 ? (
                <span className="text-amber-300 font-extrabold">{winningPatterns.join(" • ")}</span>
              ) : (
                <span className="text-slate-600">None</span>
              )}
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

export default SpeedBingo80Game;
