import React, { useState } from "react";
import { Award, Coins, RefreshCw, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../../lib/audioService";
import { evaluateLiveGameRound } from "../../constants/liveGameConfig";

interface LudoGameProps {
  chips: number;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest?: (type: "greet" | "win" | "lose") => void;
}

export const LudoGame: React.FC<LudoGameProps> = ({
  chips,
  onWin,
  onLose,
  onCommentaryRequest,
}) => {
  const [betAmount, setBetAmount] = useState<number>(100);
  const [selectedToken, setSelectedToken] = useState<"RED" | "BLUE" | "GREEN" | "YELLOW">("RED");
  const [diceRoll, setDiceRoll] = useState<number>(6);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("Choose your Ludo Token color and click ROLL DICE!");

  const handleRollDice = () => {
    if (chips < betAmount) {
      alert("Insufficient chips!");
      return;
    }
    casinoAudio.playDiceRoll();
    setIsRolling(true);

    const isWin = evaluateLiveGameRound();

    setTimeout(() => {
      setIsRolling(false);

      if (isWin) {
        setDiceRoll(6);
        casinoAudio.playWin();
        const win = betAmount * 4;
        onWin(win, `Ludo Dice Win on ${selectedToken} (Rolled 6)! (+$${win.toLocaleString()})`);
        setMessage(`🎲 LUDO RACE WIN! Rolled 6 for ${selectedToken} Token! Won $${win.toLocaleString()}!`);
        if (onCommentaryRequest) onCommentaryRequest("win");
      } else {
        setDiceRoll(2);
        casinoAudio.playLose();
        onLose(betAmount, `Ludo Loss on ${selectedToken} (Rolled 2) (-$${betAmount.toLocaleString()})`);
        setMessage(`Rolled 2. ${selectedToken} token fell short of Home Triangle.`);
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
            <Trophy className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              CASINO LUDO <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-full uppercase">Token Race</span>
            </h2>
            <p className="text-xs text-slate-400">Pick Red, Blue, Green or Yellow token and roll 6 to enter the Home Triangle!</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl font-mono text-xs flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-400" />
          <span className="text-amber-300 font-bold">${chips.toLocaleString()}</span>
        </div>
      </div>

      {/* Token Selection */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { color: "RED", bg: "bg-red-600 text-white" },
          { color: "BLUE", bg: "bg-blue-600 text-white" },
          { color: "GREEN", bg: "bg-emerald-600 text-white" },
          { color: "YELLOW", bg: "bg-amber-500 text-slate-950" },
        ].map((item) => (
          <button
            key={item.color}
            onClick={() => setSelectedToken(item.color as any)}
            disabled={isRolling}
            className={`py-3 rounded-xl font-black font-mono text-xs border transition ${
              selectedToken === item.color ? `${item.bg} border-white shadow-lg` : "bg-slate-900 text-slate-400 border-slate-800"
            }`}
          >
            {item.color}
          </button>
        ))}
      </div>

      {/* Dice Arena */}
      <div className="flex flex-col items-center justify-center bg-slate-900/80 p-6 rounded-2xl border border-slate-800">
        <div className="w-20 h-20 bg-amber-500 text-slate-950 rounded-2xl flex items-center justify-center font-black text-4xl shadow-[0_0_20px_rgba(245,158,11,0.5)]">
          {isRolling ? "🎲" : diceRoll}
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
            disabled={isRolling}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-amber-300 font-bold"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={handleRollDice}
            disabled={isRolling}
            className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-lg py-3 rounded-xl shadow-lg transition disabled:opacity-50 cursor-pointer"
          >
            {isRolling ? "ROLLING LUDO DICE..." : `ROLL DICE ($${betAmount})`}
          </button>
        </div>
      </div>

      <div className="text-center text-xs font-mono text-slate-400 bg-slate-900/40 p-2 rounded-lg">
        {message}
      </div>
    </div>
  );
};
export default LudoGame;
