import React, { useState } from "react";
import { Award, Zap, Coins, RefreshCw, Trophy, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../../lib/audioService";
import { evaluateLiveGameRound } from "../../constants/liveGameConfig";

interface SuperAceGameProps {
  chips: number;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest?: (type: "greet" | "win" | "lose") => void;
}

const CARD_SYMBOLS = [
  { rank: "A", name: "Ace Gold", isGold: true, multiplier: 10 },
  { rank: "K", name: "King", isGold: false, multiplier: 5 },
  { rank: "Q", name: "Queen", isGold: false, multiplier: 4 },
  { rank: "J", name: "Jack", isGold: false, multiplier: 3 },
  { rank: "10", name: "Ten", isGold: false, multiplier: 2 },
  { rank: "WILD", name: "Super Wild", isGold: true, multiplier: 15 },
];

export const SuperAceGame: React.FC<SuperAceGameProps> = ({
  chips,
  onWin,
  onLose,
  onCommentaryRequest,
}) => {
  const [betAmount, setBetAmount] = useState<number>(100);
  const [comboLevel, setComboLevel] = useState<number>(1);
  const [grid, setGrid] = useState<any[][]>([
    [CARD_SYMBOLS[0], CARD_SYMBOLS[1], CARD_SYMBOLS[2], CARD_SYMBOLS[3]],
    [CARD_SYMBOLS[1], CARD_SYMBOLS[0], CARD_SYMBOLS[3], CARD_SYMBOLS[4]],
    [CARD_SYMBOLS[2], CARD_SYMBOLS[4], CARD_SYMBOLS[0], CARD_SYMBOLS[1]],
    [CARD_SYMBOLS[0], CARD_SYMBOLS[2], CARD_SYMBOLS[1], CARD_SYMBOLS[0]],
  ]);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [lastWin, setLastWin] = useState<number>(0);
  const [message, setMessage] = useState<string>("Press SPIN to flip Golden Cards and trigger Cascade Combos!");

  const handleSpin = () => {
    if (chips < betAmount) {
      alert("Insufficient chips!");
      return;
    }
    casinoAudio.playCardFlip();
    setIsSpinning(true);
    setLastWin(0);

    const isWinRound = evaluateLiveGameRound();

    setTimeout(() => {
      setIsSpinning(false);
      let newCombo = 1;

      // Generate grid symbols
      const newGrid = Array(4).fill(0).map(() =>
        Array(4).fill(0).map(() => {
          if (isWinRound && Math.random() < 0.35) {
            return CARD_SYMBOLS[0]; // Golden Ace
          }
          return CARD_SYMBOLS[Math.floor(Math.random() * CARD_SYMBOLS.length)];
        })
      );
      setGrid(newGrid);

      if (isWinRound) {
        casinoAudio.playWin();
        newCombo = Math.floor(2 + Math.random() * 3);
        setComboLevel(newCombo);
        const win = Math.floor(betAmount * newCombo * 2.5);
        setLastWin(win);
        onWin(win, `Super Ace Combo Cascade (${newCombo}x Multiplier)! (+$${win.toLocaleString()})`);
        setMessage(`🌟 SUPER ACE COMBO HIT! Triggered ${newCombo}x Golden Combo! Won $${win.toLocaleString()}!`);
        if (onCommentaryRequest) onCommentaryRequest("win");
      } else {
        casinoAudio.playLose();
        setComboLevel(1);
        onLose(betAmount, `Super Ace spin no matching combos (-$${betAmount.toLocaleString()})`);
        setMessage("No card elimination combos matched. Spin again!");
        if (onCommentaryRequest) onCommentaryRequest("lose");
      }
    }, 800);
  };

  return (
    <div className="w-full bg-slate-950 rounded-2xl border border-amber-500/30 p-5 shadow-2xl font-sans text-slate-100 flex flex-col gap-4">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
            <Award className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              SUPER ACE <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-full uppercase">Card Slot Hybrid</span>
            </h2>
            <p className="text-xs text-slate-400">Flip Golden Ace Cards for cascading multipliers up to 10x!</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl font-mono text-xs flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-400" />
          <span className="text-amber-300 font-bold">${chips.toLocaleString()}</span>
        </div>
      </div>

      {/* Combo Multiplier Tracker */}
      <div className="flex items-center justify-center gap-2 bg-slate-900/80 p-2 rounded-xl border border-slate-800 font-mono text-xs font-bold">
        <span className="text-slate-400">CASCADE MULTIPLIER:</span>
        {[1, 2, 3, 5, 10].map((m) => (
          <span key={m} className={`px-2.5 py-1 rounded-lg ${comboLevel >= m ? "bg-amber-500 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.5)]" : "bg-slate-950 text-slate-600 border border-slate-800"}`}>
            {m}x
          </span>
        ))}
      </div>

      {/* 4x4 Card Grid */}
      <div className="grid grid-cols-4 gap-3 bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
        {grid.map((row, rIdx) =>
          row.map((cell, cIdx) => (
            <motion.div
              key={`${rIdx}-${cIdx}`}
              animate={isSpinning ? { rotateY: 180 } : { rotateY: 0 }}
              transition={{ duration: 0.4 }}
              className={`h-20 sm:h-24 rounded-xl border flex flex-col items-center justify-center font-bold text-lg sm:text-xl shadow-lg ${
                cell.isGold
                  ? "bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-300 text-slate-950 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                  : "bg-slate-950 text-slate-200 border-slate-800"
              }`}
            >
              <span>{cell.rank}</span>
              <span className="text-[9px] uppercase tracking-wider font-mono opacity-80">{cell.name}</span>
            </motion.div>
          ))
        )}
      </div>

      {/* Control Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <label className="text-xs font-bold text-slate-400 block mb-1">BET AMOUNT ($)</label>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(Math.max(10, Number(e.target.value)))}
            disabled={isSpinning}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-amber-300 font-bold"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={handleSpin}
            disabled={isSpinning}
            className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-lg py-3 rounded-xl shadow-lg transition disabled:opacity-50 cursor-pointer"
          >
            {isSpinning ? "FLIPPING CARDS..." : `FLIP CARDS ($${betAmount})`}
          </button>
        </div>
      </div>

      <div className="text-center text-xs font-mono text-slate-400 bg-slate-900/40 p-2 rounded-lg">
        {message}
      </div>
    </div>
  );
};
export default SuperAceGame;
