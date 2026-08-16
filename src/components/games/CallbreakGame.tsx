import React, { useState } from "react";
import { Award, Shield, Coins, RefreshCw, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../../lib/audioService";
import { evaluateLiveGameRound } from "../../constants/liveGameConfig";

interface CallbreakGameProps {
  chips: number;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest?: (type: "greet" | "win" | "lose") => void;
}

export const CallbreakGame: React.FC<CallbreakGameProps> = ({
  chips,
  onWin,
  onLose,
  onCommentaryRequest,
}) => {
  const [betAmount, setBetAmount] = useState<number>(100);
  const [bidTricks, setBidTricks] = useState<number>(3);
  const [wonTricks, setWonTricks] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("Set your Callbreak Bid (1-8 Tricks) and start trick play!");

  const handleStartMatch = () => {
    if (chips < betAmount) {
      alert("Insufficient chips!");
      return;
    }
    casinoAudio.playCardFlip();
    setIsPlaying(true);

    const isWin = evaluateLiveGameRound();

    setTimeout(() => {
      setIsPlaying(false);

      if (isWin) {
        const achieved = bidTricks + Math.floor(Math.random() * 2);
        setWonTricks(achieved);

        casinoAudio.playWin();
        const win = betAmount * (1 + achieved * 0.5);
        onWin(win, `Callbreak Met Bid (${achieved}/${bidTricks} Tricks)! (+$${win.toLocaleString()})`);
        setMessage(`♠️ CALLBREAK BID MET! Won ${achieved} tricks against bid of ${bidTricks}! Payout $${win.toLocaleString()}!`);
        if (onCommentaryRequest) onCommentaryRequest("win");
      } else {
        const achieved = Math.max(0, bidTricks - 1);
        setWonTricks(achieved);

        casinoAudio.playLose();
        onLose(betAmount, `Callbreak Underbid (${achieved}/${bidTricks} Tricks) (-$${betAmount.toLocaleString()})`);
        setMessage(`Failed bid! Won only ${achieved}/${bidTricks} tricks. Negative score penalty applied.`);
        if (onCommentaryRequest) onCommentaryRequest("lose");
      }
    }, 1000);
  };

  return (
    <div className="w-full bg-slate-950 rounded-2xl border border-blue-500/30 p-5 shadow-2xl font-sans text-slate-100 flex flex-col gap-4">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400">
            <Award className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              CALLBREAK <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/40 px-2 py-0.5 rounded-full uppercase">Trick-Taking Spades</span>
            </h2>
            <p className="text-xs text-slate-400">Bid tricks (1-8), lead suits, and trump with Spades to win score multipliers!</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl font-mono text-xs flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-400" />
          <span className="text-amber-300 font-bold">${chips.toLocaleString()}</span>
        </div>
      </div>

      {/* Bid selector */}
      <div className="flex flex-col items-center justify-center bg-slate-900/80 p-5 rounded-2xl border border-slate-800 gap-3">
        <span className="text-xs font-bold text-slate-400 uppercase">Select Your Trick Call Bid:</span>
        <div className="flex gap-2 flex-wrap justify-center">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((b) => (
            <button
              key={b}
              onClick={() => setBidTricks(b)}
              disabled={isPlaying}
              className={`w-10 h-10 rounded-xl font-bold font-mono text-sm border transition ${
                bidTricks === b ? "bg-blue-500 text-slate-950 border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.5)]" : "bg-slate-950 text-slate-400 border-slate-800"
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <label className="text-xs font-bold text-slate-400 block mb-1">BET AMOUNT ($)</label>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(Math.max(10, Number(e.target.value)))}
            disabled={isPlaying}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-amber-300 font-bold"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={handleStartMatch}
            disabled={isPlaying}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-lg py-3 rounded-xl shadow-lg transition disabled:opacity-50 cursor-pointer"
          >
            {isPlaying ? "PLAYING TRICKS..." : `START CALLBREAK ($${betAmount})`}
          </button>
        </div>
      </div>

      <div className="text-center text-xs font-mono text-slate-400 bg-slate-900/40 p-2 rounded-lg">
        {message}
      </div>
    </div>
  );
};
export default CallbreakGame;
