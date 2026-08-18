import React, { useState } from "react";
import { Award, Coins, RefreshCw, Trophy, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../../lib/audioService";
import { evaluateLiveGameRound } from "../../constants/liveGameConfig";

interface RummyGameProps {
  chips: number;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest?: (type: "greet" | "win" | "lose") => void;
}

export const RummyGame: React.FC<RummyGameProps> = ({
  chips,
  onWin,
  onLose,
  onCommentaryRequest,
}) => {
  const [betAmount, setBetAmount] = useState<number>(100);
  const [isMelding, setIsMelding] = useState<boolean>(false);
  const [sequences, setSequences] = useState<string[][]>([
    ["4♠", "5♠", "6♠"],
    ["J♥", "Q♥", "K♥"],
    ["8♦", "8♣", "8♠"],
  ]);
  const [score, setScore] = useState<number>(0);
  const [message, setMessage] = useState<string>("Draw cards to arrange Pure Sequences & Sets, then DECLARE!");

  const handleDeclareWin = () => {
    if (chips < betAmount) {
      setMessage("Insufficient chips! Please claim bonus or deposit chips to play.");
      casinoAudio.playClick();
      return;
    }
    casinoAudio.playCardFlip();
    setIsMelding(true);

    const isWin = evaluateLiveGameRound();

    setTimeout(() => {
      setIsMelding(false);

      if (isWin) {
        setSequences([
          ["A♠", "2♠", "3♠"], // Pure sequence
          ["10♥", "J♥", "Q♥", "K♥"],
          ["7♦", "7♣", "7♠"],
        ]);
        setScore(0); // 0 points is valid declaration!

        casinoAudio.playWin();
        const win = betAmount * 3;
        onWin(win, `Rummy Valid Declaration (0 points)! (+$${win.toLocaleString()})`);
        setMessage(`🃏 VALID RUMMY DECLARATION! 0 Points penalty! Won $${win.toLocaleString()}!`);
        if (onCommentaryRequest) onCommentaryRequest("win");
      } else {
        setSequences([
          ["4♠", "9♠", "6♠"], // Invalid
          ["J♥", "2♥", "K♥"],
          ["8♦", "8♣", "3♠"],
        ]);
        setScore(45);

        casinoAudio.playLose();
        onLose(betAmount, `Rummy invalid declaration 45 penalty points (-$${betAmount.toLocaleString()})`);
        setMessage("Invalid Sequence! 45 penalty points incurred. House wins.");
        if (onCommentaryRequest) onCommentaryRequest("lose");
      }
    }, 800);
  };

  return (
    <div className="w-full bg-slate-950 rounded-2xl border border-emerald-500/30 p-5 shadow-2xl font-sans text-slate-100 flex flex-col gap-4">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              INDIAN RUMMY <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full uppercase">Melding Card Game</span>
            </h2>
            <p className="text-xs text-slate-400">Arrange 13 cards into Pure Sequences and Sets for 0-point declarations!</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl font-mono text-xs flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-400" />
          <span className="text-amber-300 font-bold">${chips.toLocaleString()}</span>
        </div>
      </div>

      {/* Melded Hand Groups */}
      <div className="flex flex-col gap-3 bg-slate-900/80 p-5 rounded-2xl border border-slate-800">
        <span className="text-xs font-bold text-slate-400 uppercase">Your Melded Card Groups</span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {sequences.map((seq, idx) => (
            <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-emerald-500/30 flex flex-col items-center">
              <span className="text-[10px] font-mono text-emerald-400 mb-2">Group #{idx + 1}</span>
              <div className="flex gap-1.5">
                {seq.map((card, cIdx) => (
                  <div key={cIdx} className="w-10 h-14 bg-slate-900 border border-emerald-400/50 rounded-lg flex items-center justify-center font-bold font-mono text-white text-xs shadow">
                    {card}
                  </div>
                ))}
              </div>
            </div>
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
            onChange={(e) => setBetAmount(Math.max(0.10, Number(e.target.value)))}
            disabled={isMelding}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-amber-300 font-bold"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={handleDeclareWin}
            disabled={isMelding}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-lg py-3 rounded-xl shadow-lg transition disabled:opacity-50 cursor-pointer"
          >
            {isMelding ? "VALIDATING MELDS..." : `DECLARE WIN ($${betAmount})`}
          </button>
        </div>
      </div>

      <div className="text-center text-xs font-mono text-slate-400 bg-slate-900/40 p-2 rounded-lg">
        {message}
      </div>
    </div>
  );
};
export default RummyGame;
