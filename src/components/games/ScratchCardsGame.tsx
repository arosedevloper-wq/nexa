import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Coins, RefreshCw, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../../lib/audioService";
import { evaluateLiveGameRound } from "../../constants/liveGameConfig";

interface ScratchCardsGameProps {
  chips: number;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest?: (type: "greet" | "win" | "lose") => void;
}

const PRIZE_SYMBOLS = ["💎", "👑", "7️⃣", "💰", "🍒", "⭐"];

export const ScratchCardsGame: React.FC<ScratchCardsGameProps> = ({
  chips,
  onWin,
  onLose,
  onCommentaryRequest,
}) => {
  const [betAmount, setBetAmount] = useState<number>(100);
  const [gridSymbols, setGridSymbols] = useState<string[]>(["💎", "💎", "💎", "👑", "7️⃣", "💰", "🍒", "⭐", "👑"]);
  const [revealed, setRevealed] = useState<boolean[]>(Array(9).fill(false));
  const [isBought, setIsBought] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("Buy a Scratch Card ($100) and scrub tiles or click AUTO-SCRATCH!");

  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  const handleBuyCard = () => {
    if (chips < betAmount) {
      alert("Insufficient chips!");
      return;
    }
    casinoAudio.playClick();
    setIsBought(true);
    setRevealed(Array(9).fill(false));

    const isWin = evaluateLiveGameRound();
    let symbols: string[] = [];

    if (isWin) {
      symbols = ["💎", "💎", "💎", "👑", "7️⃣", "💰", "🍒", "⭐", "👑"]; // Match 3 Diamonds!
    } else {
      symbols = ["💎", "👑", "7️⃣", "💰", "🍒", "⭐", "👑", "💰", "🍒"]; // No 3 matching
    }

    setGridSymbols(symbols);
    setMessage("Card Purchased! Scratch off the silver foil or click AUTO-SCRATCH.");
  };

  const handleScratchTile = (index: number) => {
    if (!isBought || revealed[index]) return;
    casinoAudio.playClick();

    const newRevealed = [...revealed];
    newRevealed[index] = true;
    setRevealed(newRevealed);

    // Check if all 9 revealed
    if (newRevealed.filter(Boolean).length === 9) {
      checkWinCondition(gridSymbols);
    }
  };

  const handleAutoScratch = () => {
    if (!isBought) return;
    casinoAudio.playWin();
    setRevealed(Array(9).fill(true));
    checkWinCondition(gridSymbols);
  };

  const checkWinCondition = (symbols: string[]) => {
    // Count occurrences
    const counts: { [key: string]: number } = {};
    symbols.forEach((s) => (counts[s] = (counts[s] || 0) + 1));

    let matchedThree = false;
    Object.values(counts).forEach((cnt) => {
      if (cnt >= 3) matchedThree = true;
    });

    if (matchedThree) {
      casinoAudio.playWin();
      const win = betAmount * 10;
      onWin(win, `Scratch Card Match 3 Winner! (+$${win.toLocaleString()})`);
      setMessage(`🎉 MATCH 3 WINNER! Uncovered 3 Matching Gems! Won $${win.toLocaleString()}!`);
      if (onCommentaryRequest) onCommentaryRequest("win");
    } else {
      casinoAudio.playLose();
      onLose(betAmount, `Scratch Card no 3 matching symbols (-$${betAmount.toLocaleString()})`);
      setMessage("No 3 matching symbols. Buy a new card to try again!");
      if (onCommentaryRequest) onCommentaryRequest("lose");
    }
    setIsBought(false);
  };

  return (
    <div className="w-full bg-slate-950 rounded-2xl border border-pink-500/30 p-5 shadow-2xl font-sans text-slate-100 flex flex-col gap-4">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-pink-500/10 border border-pink-500/30 rounded-xl text-pink-400">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              SCRATCH CARDS <span className="text-xs bg-pink-500/20 text-pink-400 border border-pink-500/40 px-2 py-0.5 rounded-full uppercase">Instant Win Foil</span>
            </h2>
            <p className="text-xs text-slate-400">Scrub silver foil off 9 grid tiles to uncover 3 matching cash symbols!</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl font-mono text-xs flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-400" />
          <span className="text-amber-300 font-bold">${chips.toLocaleString()}</span>
        </div>
      </div>

      {/* 3x3 Scratch Foil Grid */}
      <div className="grid grid-cols-3 gap-3 bg-slate-900/80 p-5 rounded-2xl border border-slate-800">
        {gridSymbols.map((sym, idx) => (
          <div
            key={idx}
            onClick={() => handleScratchTile(idx)}
            className={`h-24 sm:h-28 rounded-xl border flex items-center justify-center text-4xl sm:text-5xl cursor-pointer transition shadow-lg ${
              revealed[idx]
                ? "bg-slate-950 border-pink-500/40 text-white"
                : "bg-gradient-to-tr from-slate-800 to-slate-700 border-slate-600 text-slate-400 hover:border-pink-400"
            }`}
          >
            {revealed[idx] ? sym : "🪙"}
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <label className="text-xs font-bold text-slate-400 block mb-1">CARD COST ($)</label>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(Math.max(10, Number(e.target.value)))}
            disabled={isBought}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-amber-300 font-bold"
          />
        </div>

        <div className="flex items-end gap-2">
          {!isBought ? (
            <button
              onClick={handleBuyCard}
              className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-black text-lg py-3 rounded-xl shadow-lg transition cursor-pointer"
            >
              BUY SCRATCH CARD (${betAmount})
            </button>
          ) : (
            <button
              onClick={handleAutoScratch}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-lg py-3 rounded-xl shadow-lg transition cursor-pointer animate-pulse"
            >
              AUTO-SCRATCH ALL 🌟
            </button>
          )}
        </div>
      </div>

      <div className="text-center text-xs font-mono text-slate-400 bg-slate-900/40 p-2 rounded-lg">
        {message}
      </div>
    </div>
  );
};
export default ScratchCardsGame;
