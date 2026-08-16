import React, { useState } from "react";
import { Award, Shield, Coins, RefreshCw, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../../lib/audioService";
import { evaluateLiveGameRound } from "../../constants/liveGameConfig";

interface TeenPattiGameProps {
  chips: number;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest?: (type: "greet" | "win" | "lose") => void;
}

const CARDS = ["A♠", "K♠", "Q♠", "J♠", "10♠", "A♥", "K♥", "Q♥", "J♥", "10♥", "A♦", "K♦", "Q♦", "J♦", "10♦", "A♣", "K♣", "Q♣", "J♣", "10♣"];

export const TeenPattiGame: React.FC<TeenPattiGameProps> = ({
  chips,
  onWin,
  onLose,
  onCommentaryRequest,
}) => {
  const [betAmount, setBetAmount] = useState<number>(100);
  const [betType, setBetType] = useState<"BLIND" | "CHAAL">("CHAAL");
  const [playerCards, setPlayerCards] = useState<string[]>(["A♠", "A♥", "A♦"]);
  const [dealerCards, setDealerCards] = useState<string[]>(["K♠", "Q♥", "J♦"]);
  const [handRankName, setHandRankName] = useState<string>("Trail / Trio (3 of a Kind)");
  const [isDealing, setIsDealing] = useState<boolean>(false);
  const [gameResolved, setGameResolved] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("Choose BLIND or CHAAL and deal cards!");

  const handleDealRound = () => {
    if (chips < betAmount) {
      alert("Insufficient chips!");
      return;
    }
    casinoAudio.playCardFlip();
    setIsDealing(true);
    setGameResolved(false);

    const isWin = evaluateLiveGameRound();

    setTimeout(() => {
      setIsDealing(false);
      setGameResolved(true);

      if (isWin) {
        setPlayerCards(["A♠", "A♥", "A♦"]); // Trio / Trail
        setDealerCards(["K♠", "Q♥", "J♦"]);
        setHandRankName("PURE TRAIL / TRIO");

        casinoAudio.playWin();
        const win = betAmount * (betType === "BLIND" ? 4 : 2);
        onWin(win, `Teen Patti Win with ${handRankName} (+$${win.toLocaleString()})`);
        setMessage(`🎴 TEEN PATTI SHOWDOWN WIN! Player Trail defeated Dealer High Card! Won $${win.toLocaleString()}!`);
        if (onCommentaryRequest) onCommentaryRequest("win");
      } else {
        setPlayerCards(["9♠", "5♥", "2♦"]);
        setDealerCards(["A♠", "K♥", "Q♦"]);
        setHandRankName("High Card (9)");

        casinoAudio.playLose();
        onLose(betAmount, `Teen Patti loss vs Dealer High Card (-$${betAmount.toLocaleString()})`);
        setMessage("Dealer holds higher 3-card hand. House wins round.");
        if (onCommentaryRequest) onCommentaryRequest("lose");
      }
    }, 800);
  };

  return (
    <div className="w-full bg-slate-950 rounded-2xl border border-indigo-500/30 p-5 shadow-2xl font-sans text-slate-100 flex flex-col gap-4">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
            <Award className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              TEEN PATTI <span className="text-xs bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 px-2 py-0.5 rounded-full uppercase">3-Card Indian Poker</span>
            </h2>
            <p className="text-xs text-slate-400">Classic 3-card showdown with Trail, Pure Sequence, Flush & Chaal bets!</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl font-mono text-xs flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-400" />
          <span className="text-amber-300 font-bold">${chips.toLocaleString()}</span>
        </div>
      </div>

      {/* Cards Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 min-h-[220px]">
        {/* Dealer Hand */}
        <div className="flex flex-col items-center justify-center p-3 bg-slate-950/60 rounded-xl border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase mb-2">Dealer Hand</span>
          <div className="flex gap-2">
            {dealerCards.map((c, i) => (
              <div key={i} className="w-14 h-20 bg-slate-900 border border-indigo-500/30 rounded-lg flex items-center justify-center font-bold font-mono text-indigo-300 text-lg shadow">
                {gameResolved ? c : "🎴"}
              </div>
            ))}
          </div>
        </div>

        {/* Player Hand */}
        <div className="flex flex-col items-center justify-center p-3 bg-slate-950/60 rounded-xl border border-indigo-500/30">
          <span className="text-xs font-bold text-indigo-400 uppercase mb-1">Your 3-Card Hand</span>
          <span className="text-[10px] font-mono text-emerald-400 mb-2">{gameResolved ? handRankName : "Waiting..."}</span>
          <div className="flex gap-2">
            {playerCards.map((c, i) => (
              <div key={i} className="w-14 h-20 bg-gradient-to-tr from-indigo-950 to-slate-900 border border-indigo-400 rounded-lg flex items-center justify-center font-bold font-mono text-white text-lg shadow-lg">
                {c}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bet Type Switcher */}
      <div className="flex items-center gap-3 justify-center">
        <button
          onClick={() => setBetType("BLIND")}
          className={`px-4 py-2 rounded-xl font-bold font-mono text-xs border transition ${
            betType === "BLIND" ? "bg-amber-500 text-slate-950 border-amber-400" : "bg-slate-900 text-slate-400 border-slate-800"
          }`}
        >
          BLIND (2x Payout)
        </button>
        <button
          onClick={() => setBetType("CHAAL")}
          className={`px-4 py-2 rounded-xl font-bold font-mono text-xs border transition ${
            betType === "CHAAL" ? "bg-indigo-500 text-white border-indigo-400" : "bg-slate-900 text-slate-400 border-slate-800"
          }`}
        >
          CHAAL (Standard)
        </button>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <label className="text-xs font-bold text-slate-400 block mb-1">BET AMOUNT ($)</label>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(Math.max(0.10, Number(e.target.value)))}
            disabled={isDealing}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-amber-300 font-bold"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={handleDealRound}
            disabled={isDealing}
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-lg py-3 rounded-xl shadow-lg transition disabled:opacity-50 cursor-pointer"
          >
            {isDealing ? "DEALING..." : `DEAL HAND ($${betAmount})`}
          </button>
        </div>
      </div>

      <div className="text-center text-xs font-mono text-slate-400 bg-slate-900/40 p-2 rounded-lg">
        {message}
      </div>
    </div>
  );
};
export default TeenPattiGame;
