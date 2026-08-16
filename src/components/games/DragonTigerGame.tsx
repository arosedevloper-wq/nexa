import React, { useState } from "react";
import { Flame, Shield, Coins, RefreshCw, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../../lib/audioService";
import { evaluateLiveGameRound } from "../../constants/liveGameConfig";

interface DragonTigerGameProps {
  chips: number;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest?: (type: "greet" | "win" | "lose") => void;
}

export const DragonTigerGame: React.FC<DragonTigerGameProps> = ({
  chips,
  onWin,
  onLose,
  onCommentaryRequest,
}) => {
  const [betAmount, setBetAmount] = useState<number>(100);
  const [selectedBet, setSelectedBet] = useState<"DRAGON" | "TIGER" | "TIE">("DRAGON");
  const [dragonCard, setDragonCard] = useState<string>("K♠");
  const [tigerCard, setTigerCard] = useState<string>("7♥");
  const [isDealing, setIsDealing] = useState<boolean>(false);
  const [history, setHistory] = useState<string[]>(["D", "T", "D", "D", "T"]);
  const [message, setMessage] = useState<string>("Bet on DRAGON, TIGER, or TIE and click DEAL!");

  const handleDeal = () => {
    if (chips < betAmount) {
      alert("Insufficient chips!");
      return;
    }
    casinoAudio.playCardFlip();
    setIsDealing(true);

    const isWin = evaluateLiveGameRound();

    setTimeout(() => {
      setIsDealing(false);

      if (isWin) {
        if (selectedBet === "DRAGON") {
          setDragonCard("K♠");
          setTigerCard("5♥");
        } else if (selectedBet === "TIGER") {
          setDragonCard("3♦");
          setTigerCard("Q♣");
        } else {
          setDragonCard("10♠");
          setTigerCard("10♥");
        }

        casinoAudio.playWin();
        const mult = selectedBet === "TIE" ? 8 : 2;
        const win = betAmount * mult;
        onWin(win, `Dragon Tiger Win on ${selectedBet}! (+$${win.toLocaleString()})`);
        setHistory((prev) => [selectedBet.charAt(0), ...prev].slice(0, 10));
        setMessage(`🐉 DRAGON TIGER WIN! ${selectedBet} won the duel! Won $${win.toLocaleString()}!`);
        if (onCommentaryRequest) onCommentaryRequest("win");
      } else {
        if (selectedBet === "DRAGON") {
          setDragonCard("4♠");
          setTigerCard("K♥");
          setHistory((prev) => ["T", ...prev].slice(0, 10));
        } else {
          setDragonCard("K♠");
          setTigerCard("2♥");
          setHistory((prev) => ["D", ...prev].slice(0, 10));
        }

        casinoAudio.playLose();
        onLose(betAmount, `Dragon Tiger Loss on ${selectedBet} (-$${betAmount.toLocaleString()})`);
        setMessage("Opposing card won the duel. House wins round.");
        if (onCommentaryRequest) onCommentaryRequest("lose");
      }
    }, 800);
  };

  return (
    <div className="w-full bg-slate-950 rounded-2xl border border-red-500/30 p-5 shadow-2xl font-sans text-slate-100 flex flex-col gap-4">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              DRAGON TIGER <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/40 px-2 py-0.5 rounded-full uppercase">High-Card Showdown</span>
            </h2>
            <p className="text-xs text-slate-400">Dragon vs Tiger single-card duel with 8:1 Tie payouts!</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl font-mono text-xs flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-400" />
          <span className="text-amber-300 font-bold">${chips.toLocaleString()}</span>
        </div>
      </div>

      {/* History Road Map */}
      <div className="flex items-center gap-2 overflow-x-auto">
        <span className="text-[10px] font-bold text-slate-500 uppercase">Bead Road:</span>
        {history.map((h, i) => (
          <span key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
            h === "D" ? "bg-red-600 text-white" : h === "T" ? "bg-amber-500 text-slate-950" : "bg-emerald-500 text-slate-950"
          }`}>
            {h}
          </span>
        ))}
      </div>

      {/* Showdown Arena */}
      <div className="grid grid-cols-2 gap-4 bg-slate-900/80 p-6 rounded-2xl border border-slate-800 min-h-[200px]">
        <div className="flex flex-col items-center justify-center p-4 bg-red-950/30 rounded-xl border border-red-500/40">
          <span className="text-xs font-bold text-red-400 uppercase mb-2">DRAGON</span>
          <div className="w-16 h-24 bg-gradient-to-tr from-red-950 to-slate-900 border border-red-500 rounded-xl flex items-center justify-center font-bold font-mono text-2xl text-white shadow-xl">
            {isDealing ? "🎴" : dragonCard}
          </div>
        </div>

        <div className="flex flex-col items-center justify-center p-4 bg-amber-950/30 rounded-xl border border-amber-500/40">
          <span className="text-xs font-bold text-amber-400 uppercase mb-2">TIGER</span>
          <div className="w-16 h-24 bg-gradient-to-tr from-amber-950 to-slate-900 border border-amber-500 rounded-xl flex items-center justify-center font-bold font-mono text-2xl text-white shadow-xl">
            {isDealing ? "🎴" : tigerCard}
          </div>
        </div>
      </div>

      {/* Bet Options */}
      <div className="grid grid-cols-3 gap-3">
        {(["DRAGON", "TIE", "TIGER"] as const).map((bet) => (
          <button
            key={bet}
            onClick={() => setSelectedBet(bet)}
            disabled={isDealing}
            className={`py-3 rounded-xl font-black font-mono text-xs border transition ${
              selectedBet === bet
                ? bet === "DRAGON"
                  ? "bg-red-600 text-white border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                  : bet === "TIGER"
                  ? "bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                  : "bg-emerald-500 text-slate-950 border-emerald-400"
                : "bg-slate-900 text-slate-400 border-slate-800"
            }`}
          >
            {bet} {bet === "TIE" ? "(8:1)" : "(1:1)"}
          </button>
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
            disabled={isDealing}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-amber-300 font-bold"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={handleDeal}
            disabled={isDealing}
            className="w-full bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-lg py-3 rounded-xl shadow-lg transition disabled:opacity-50 cursor-pointer"
          >
            {isDealing ? "DEALING CARDS..." : `DEAL SHOWDOWN ($${betAmount})`}
          </button>
        </div>
      </div>

      <div className="text-center text-xs font-mono text-slate-400 bg-slate-900/40 p-2 rounded-lg">
        {message}
      </div>
    </div>
  );
};
export default DragonTigerGame;
