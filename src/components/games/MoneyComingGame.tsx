import React, { useState } from "react";
import { Coins, Flame, Trophy, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../../lib/audioService";
import { evaluateLiveGameRound } from "../../constants/liveGameConfig";

interface MoneyComingGameProps {
  chips: number;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest?: (type: "greet" | "win" | "lose") => void;
}

export const MoneyComingGame: React.FC<MoneyComingGameProps> = ({
  chips,
  onWin,
  onLose,
  onCommentaryRequest,
}) => {
  const [betAmount, setBetAmount] = useState<number>(100);
  const [reels, setReels] = useState<string[]>(["10", "00", "10X"]);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("Spin the JILI Numeric Reels to form instant cash payouts!");

  const handleSpinReels = () => {
    if (chips < betAmount) {
      alert("Insufficient chips!");
      return;
    }
    casinoAudio.playWheelSpin();
    setIsSpinning(true);

    const isWin = evaluateLiveGameRound();

    setTimeout(() => {
      setIsSpinning(false);

      if (isWin) {
        setReels(["50", "00", "10X"]);
        casinoAudio.playWin();
        const win = betAmount * 50;
        onWin(win, `Money Coming Numeric Win (5000)! (+$${win.toLocaleString()})`);
        setMessage(`💵 MONEY COMING! Formed 5000 x 10X Feature Reel! Won $${win.toLocaleString()}!`);
        if (onCommentaryRequest) onCommentaryRequest("win");
      } else {
        setReels(["00", "00", "1X"]);
        casinoAudio.playLose();
        onLose(betAmount, `Money Coming formed 0 payout (-$${betAmount.toLocaleString()})`);
        setMessage("Numeric reels formed 0 payout. Spin again!");
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
            <Coins className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              MONEY COMING <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-full uppercase">JILI Numeric Slot</span>
            </h2>
            <p className="text-xs text-slate-400">Numeric reels form exact cash amounts multiplied by the 3rd feature reel!</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl font-mono text-xs flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-400" />
          <span className="text-amber-300 font-bold">${chips.toLocaleString()}</span>
        </div>
      </div>

      {/* 3 Numeric Reels Display */}
      <div className="grid grid-cols-3 gap-4 bg-slate-900/80 p-6 rounded-2xl border border-slate-800">
        {reels.map((r, i) => (
          <div key={i} className="h-28 bg-slate-950 border border-amber-500/40 rounded-xl flex flex-col items-center justify-center font-mono font-black text-3xl sm:text-4xl text-amber-300 shadow-inner">
            <span>{r}</span>
            <span className="text-[9px] text-slate-500 uppercase">{i === 2 ? "FEATURE REEL" : `DIGIT #${i + 1}`}</span>
          </div>
        ))}
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
            onClick={handleSpinReels}
            disabled={isSpinning}
            className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-lg py-3 rounded-xl shadow-lg transition disabled:opacity-50 cursor-pointer"
          >
            {isSpinning ? "SPINNING REELS..." : `SPIN MONEY REELS ($${betAmount})`}
          </button>
        </div>
      </div>

      <div className="text-center text-xs font-mono text-slate-400 bg-slate-900/40 p-2 rounded-lg">
        {message}
      </div>
    </div>
  );
};
export default MoneyComingGame;
