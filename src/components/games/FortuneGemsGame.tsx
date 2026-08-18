import React, { useState } from "react";
import { Gem, Coins, RefreshCw, Trophy, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../../lib/audioService";
import { evaluateLiveGameRound } from "../../constants/liveGameConfig";

interface FortuneGemsGameProps {
  chips: number;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest?: (type: "greet" | "win" | "lose") => void;
}

const GEMS = [
  { name: "Ruby", icon: "💎", color: "text-rose-500", mult: 5 },
  { name: "Emerald", icon: "🟢", color: "text-emerald-400", mult: 3 },
  { name: "Sapphire", icon: "🔵", color: "text-cyan-400", mult: 2 },
  { name: "Diamond Wild", icon: "⭐", color: "text-amber-300", mult: 10 },
];

export const FortuneGemsGame: React.FC<FortuneGemsGameProps> = ({
  chips,
  onWin,
  onLose,
  onCommentaryRequest,
}) => {
  const [betAmount, setBetAmount] = useState<number>(100);
  const [grid, setGrid] = useState<string[][]>([
    ["💎", "💎", "💎"],
    ["🟢", "🔵", "⭐"],
    ["💎", "⭐", "💎"],
  ]);
  const [multiplierReel, setMultiplierReel] = useState<number>(5);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("Spin the 3x3 Gem Grid + 4th Multiplier Reel!");

  const handleSpinGems = () => {
    if (chips < betAmount) {
      setMessage("Insufficient chips! Please claim bonus or deposit chips to play.");
      casinoAudio.playClick();
      return;
    }
    casinoAudio.playWheelSpin();
    setIsSpinning(true);

    const isWin = evaluateLiveGameRound();

    setTimeout(() => {
      setIsSpinning(false);

      if (isWin) {
        setGrid([
          ["💎", "💎", "💎"],
          ["💎", "💎", "💎"],
          ["💎", "💎", "💎"],
        ]);
        const mult = [2, 3, 5, 10, 15][Math.floor(Math.random() * 5)];
        setMultiplierReel(mult);

        casinoAudio.playWin();
        const win = betAmount * mult * 3;
        onWin(win, `Fortune Gems Match (Wheel ${mult}x Multiplier)! (+$${win.toLocaleString()})`);
        setMessage(`💎 FORTUNE GEMS JACKPOT! Matched 3 Rubies x ${mult}x Multiplier Reel! Won $${win.toLocaleString()}!`);
        if (onCommentaryRequest) onCommentaryRequest("win");
      } else {
        setGrid([
          ["💎", "🟢", "🔵"],
          ["🔵", "💎", "🟢"],
          ["🟢", "🔵", "💎"],
        ]);
        setMultiplierReel(1);

        casinoAudio.playLose();
        onLose(betAmount, `Fortune Gems no matching payline (-$${betAmount.toLocaleString()})`);
        setMessage("No 3 matching gem paylines. Spin again!");
        if (onCommentaryRequest) onCommentaryRequest("lose");
      }
    }, 900);
  };

  return (
    <div className="w-full bg-slate-950 rounded-2xl border border-rose-500/30 p-5 shadow-2xl font-sans text-slate-100 flex flex-col gap-4">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400">
            <Gem className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              FORTUNE GEMS <span className="text-xs bg-rose-500/20 text-rose-400 border border-rose-500/40 px-2 py-0.5 rounded-full uppercase">3x3 + 4th Reel Wheel</span>
            </h2>
            <p className="text-xs text-slate-400">Match Rubies, Emeralds, and Wild Stars with up to 15x Multiplier Wheel boost!</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl font-mono text-xs flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-400" />
          <span className="text-amber-300 font-bold">${chips.toLocaleString()}</span>
        </div>
      </div>

      {/* Grid + 4th Reel Area */}
      <div className="grid grid-cols-4 gap-3 bg-slate-900/80 p-5 rounded-2xl border border-slate-800">
        {/* 3x3 Grid */}
        <div className="col-span-3 grid grid-cols-3 gap-2">
          {grid.map((row, r) =>
            row.map((gem, c) => (
              <motion.div
                key={`${r}-${c}`}
                animate={isSpinning ? { rotate: [0, 360] } : { rotate: 0 }}
                transition={{ duration: 0.3 }}
                className="h-20 bg-slate-950 border border-rose-500/30 rounded-xl flex items-center justify-center text-3xl shadow-inner"
              >
                {gem}
              </motion.div>
            ))
          )}
        </div>

        {/* 4th Reel Multiplier */}
        <div className="col-span-1 bg-gradient-to-b from-amber-500 to-yellow-500 text-slate-950 rounded-xl border border-amber-300 flex flex-col items-center justify-center p-2 shadow-xl">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-900">4TH REEL</span>
          <span className="text-3xl font-black font-mono mt-1">{multiplierReel}x</span>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <label className="text-xs font-bold text-slate-400 block mb-1">BET AMOUNT ($)</label>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(Math.max(0.10, Number(e.target.value)))}
            disabled={isSpinning}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-amber-300 font-bold"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={handleSpinGems}
            disabled={isSpinning}
            className="w-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-lg py-3 rounded-xl shadow-lg transition disabled:opacity-50 cursor-pointer"
          >
            {isSpinning ? "SPINNING GEMS..." : `SPIN GEMS ($${betAmount})`}
          </button>
        </div>
      </div>

      <div className="text-center text-xs font-mono text-slate-400 bg-slate-900/40 p-2 rounded-lg">
        {message}
      </div>
    </div>
  );
};
export default FortuneGemsGame;
