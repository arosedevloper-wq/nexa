import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Coins, Play, RefreshCw, Trophy, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../../lib/audioService";
import { evaluateLiveGameRound } from "../../constants/liveGameConfig";

interface ThemedSlotsGameProps {
  chips: number;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest?: (type: "greet" | "win" | "lose") => void;
  theme?: string;
}

const THEMES = [
  { id: "pharaoh", name: "Pharaoh's Gold", symbols: ["🏺", "👁️", "👑", "🐍", "7️⃣", "💎"] },
  { id: "cosmic", name: "Cosmic Reels", symbols: ["🚀", "🪐", "⭐", "👽", "7️⃣", "💎"] },
  { id: "cyber", name: "Cyberpunk Spins", symbols: ["🤖", "⚡", "🕶️", "💾", "7️⃣", "💎"] },
  { id: "fruit", name: "Retro Fruit Deluxe", symbols: ["🍒", "🍋", "🍊", "🍇", "7️⃣", "💎"] },
  { id: "magic_ace", name: "Magic Ace VIP", symbols: ["♠️", "🃏", "💎", "⭐", "7️⃣", "👑"] },
  { id: "boxing_king", name: "Boxing King", symbols: ["🥊", "🏆", "🥊", "⚡", "7️⃣", "👑"] },
];

export const ThemedSlotsGame: React.FC<ThemedSlotsGameProps> = ({
  chips,
  onWin,
  onLose,
  onCommentaryRequest,
  theme,
}) => {
  const [selectedTheme, setSelectedTheme] = useState(() => {
    if (theme) {
      const match = THEMES.find((t) => t.id === theme);
      if (match) return match;
    }
    return THEMES[0];
  });
  const [betAmount, setBetAmount] = useState<number>(100);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [reels, setReels] = useState<string[]>(["7️⃣", "7️⃣", "7️⃣", "7️⃣", "7️⃣"]);
  const [lastWin, setLastWin] = useState<number>(0);
  const [message, setMessage] = useState<string>("Select a slot theme and press SPIN!");

  const handleSpin = () => {
    if (chips < betAmount) {
      alert("Insufficient chips!");
      return;
    }
    casinoAudio.playWheelSpin();
    setIsSpinning(true);
    setLastWin(0);

    const isWin = evaluateLiveGameRound();

    setTimeout(() => {
      setIsSpinning(false);
      let newReels: string[] = [];

      if (isWin) {
        // Match 3 or 5 of a kind
        const winSym = selectedTheme.symbols[Math.floor(Math.random() * selectedTheme.symbols.length)];
        newReels = [winSym, winSym, winSym, winSym, winSym];
      } else {
        // Random mixed reels
        newReels = Array(5).fill(0).map(() => selectedTheme.symbols[Math.floor(Math.random() * selectedTheme.symbols.length)]);
      }
      setReels(newReels);

      if (isWin) {
        casinoAudio.playWin();
        const win = betAmount * 10;
        setLastWin(win);
        onWin(win, `${selectedTheme.name} 5-of-a-Kind Win! (+$${win.toLocaleString()})`);
        setMessage(`🎰 5-OF-A-KIND JACKPOT! Won $${win.toLocaleString()}!`);
        if (onCommentaryRequest) onCommentaryRequest("win");
      } else {
        casinoAudio.playLose();
        onLose(betAmount, `${selectedTheme.name} Spin Loss (-$${betAmount.toLocaleString()})`);
        setMessage("No winning paylines hit. Spin again!");
        if (onCommentaryRequest) onCommentaryRequest("lose");
      }
    }, 1000);
  };

  return (
    <div className="w-full bg-slate-950 rounded-2xl border border-purple-500/30 p-5 shadow-2xl font-sans text-slate-100 flex flex-col gap-4">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-400">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              THEMED SLOTS <span className="text-xs bg-purple-500/20 text-purple-400 border border-purple-500/40 px-2 py-0.5 rounded-full uppercase">{selectedTheme.name}</span>
            </h2>
            <p className="text-xs text-slate-400">Switch themes and spin 5 reels for high-payline rewards!</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl font-mono text-xs flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-400" />
          <span className="text-amber-300 font-bold">${chips.toLocaleString()}</span>
        </div>
      </div>

      {/* Theme Switcher */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {THEMES.map((theme) => (
          <button
            key={theme.id}
            onClick={() => setSelectedTheme(theme)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono border transition ${
              selectedTheme.id === theme.id
                ? "bg-purple-500 text-slate-950 border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.5)]"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
            }`}
          >
            {theme.name}
          </button>
        ))}
      </div>

      {/* 5 Slot Reels Display */}
      <div className="grid grid-cols-5 gap-3 bg-slate-900/90 p-6 rounded-2xl border border-slate-800">
        {reels.map((sym, i) => (
          <motion.div
            key={i}
            animate={isSpinning ? { y: [0, -30, 30, 0] } : { y: 0 }}
            transition={{ repeat: isSpinning ? Infinity : 0, duration: 0.15 }}
            className="h-24 sm:h-28 bg-slate-950 border border-purple-500/30 rounded-xl flex items-center justify-center text-4xl sm:text-5xl shadow-inner"
          >
            {sym}
          </motion.div>
        ))}
      </div>

      {/* Controls */}
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
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-lg py-3 rounded-xl shadow-lg transition cursor-pointer disabled:opacity-50"
          >
            {isSpinning ? "SPINNING REELS..." : `SPIN REELS ($${betAmount})`}
          </button>
        </div>
      </div>

      <div className="text-center text-xs font-mono text-slate-400 bg-slate-900/40 p-2 rounded-lg">
        {message}
      </div>
    </div>
  );
};
export default ThemedSlotsGame;
