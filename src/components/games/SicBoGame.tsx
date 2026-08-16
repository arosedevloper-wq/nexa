import React, { useState, useEffect, useRef } from "react";
import { Dices, Coins, Trophy, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../../lib/audioService";
import { evaluateLiveGameRound } from "../../constants/liveGameConfig";

interface SicBoGameProps {
  chips: number;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest?: (type: "greet" | "win" | "lose") => void;
}

const DICE_SYMBOLS = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

export const SicBoGame: React.FC<SicBoGameProps> = ({
  chips,
  onWin,
  onLose,
  onCommentaryRequest,
}) => {
  const [betAmount, setBetAmount] = useState<number>(100);
  const [selectedBet, setSelectedBet] = useState<"SMALL" | "BIG" | "TRIPLE">("SMALL");
  const [dice, setDice] = useState<number[]>([1, 2, 3]);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("Select SMALL (4-10), BIG (11-17) or TRIPLE and click SHAKE DOME!");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Canvas Glass Dome Dice Shaker 60fps loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = (canvas.width = 300);
    const height = (canvas.height = 200);

    ctx.clearRect(0, 0, width, height);

    // Glass dome outline
    ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 80, 0, Math.PI * 2);
    ctx.stroke();

    // Draw 3 Dice Inside Dome
    const offset = isShaking ? (Math.random() - 0.5) * 15 : 0;

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 42px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillText(DICE_SYMBOLS[dice[0] - 1] || "⚀", width / 2 - 40 + offset, height / 2 + offset);
    ctx.fillText(DICE_SYMBOLS[dice[1] - 1] || "⚁", width / 2 + offset, height / 2 - 15 + offset);
    ctx.fillText(DICE_SYMBOLS[dice[2] - 1] || "⚂", width / 2 + 40 + offset, height / 2 + offset);
  }, [dice, isShaking]);

  const handleRollDome = () => {
    if (chips < betAmount) {
      alert("Insufficient chips!");
      return;
    }
    casinoAudio.playDiceRoll();
    setIsShaking(true);

    const isWin = evaluateLiveGameRound();

    const shakeInterval = setInterval(() => {
      setDice([
        Math.floor(1 + Math.random() * 6),
        Math.floor(1 + Math.random() * 6),
        Math.floor(1 + Math.random() * 6),
      ]);
    }, 80);

    setTimeout(() => {
      clearInterval(shakeInterval);
      setIsShaking(false);

      let finalDice = [1, 2, 3];
      if (isWin) {
        if (selectedBet === "SMALL") finalDice = [1, 2, 3]; // Sum = 6 (Small)
        else if (selectedBet === "BIG") finalDice = [4, 5, 6]; // Sum = 15 (Big)
        else finalDice = [5, 5, 5]; // Triple 5s
      } else {
        if (selectedBet === "SMALL") finalDice = [5, 5, 5]; // Big / Triple
        else finalDice = [1, 1, 2]; // Small
      }

      setDice(finalDice);
      const sum = finalDice.reduce((a, b) => a + b, 0);

      if (isWin) {
        casinoAudio.playWin();
        const mult = selectedBet === "TRIPLE" ? 30 : 2;
        const win = betAmount * mult;
        onWin(win, `Sic Bo Win on ${selectedBet} (Sum ${sum})! (+$${win.toLocaleString()})`);
        setMessage(`🎲 SIC BO DOME WIN! Dice Sum = ${sum} (${selectedBet} HIT!). Won $${win.toLocaleString()}!`);
        if (onCommentaryRequest) onCommentaryRequest("win");
      } else {
        casinoAudio.playLose();
        onLose(betAmount, `Sic Bo Loss on ${selectedBet} (Sum ${sum}) (-$${betAmount.toLocaleString()})`);
        setMessage(`Dice Sum = ${sum}. House won round.`);
        if (onCommentaryRequest) onCommentaryRequest("lose");
      }
    }, 1200);
  };

  return (
    <div className="w-full bg-slate-950 rounded-2xl border border-cyan-500/30 p-5 shadow-2xl font-sans text-slate-100 flex flex-col gap-4">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
            <Dices className="w-6 h-6 animate-spin" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              SIC BO <span className="text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 px-2 py-0.5 rounded-full uppercase">3-Dice Dome</span>
            </h2>
            <p className="text-xs text-slate-400">Ancient 3-dice shaker with Small, Big, and 30:1 Triple payouts!</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl font-mono text-xs flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-400" />
          <span className="text-amber-300 font-bold">${chips.toLocaleString()}</span>
        </div>
      </div>

      {/* Glass Dome Canvas */}
      <div className="flex justify-center bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
        <canvas ref={canvasRef} className="w-[300px] h-[200px] block" />
      </div>

      {/* Bet Type Selection */}
      <div className="grid grid-cols-3 gap-3">
        {(["SMALL", "BIG", "TRIPLE"] as const).map((b) => (
          <button
            key={b}
            onClick={() => setSelectedBet(b)}
            disabled={isShaking}
            className={`py-3 rounded-xl font-black font-mono text-xs border transition ${
              selectedBet === b ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.5)]" : "bg-slate-900 text-slate-400 border-slate-800"
            }`}
          >
            {b} {b === "TRIPLE" ? "(30:1)" : "(1:1)"}
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
            onChange={(e) => setBetAmount(Math.max(0.10, Number(e.target.value)))}
            disabled={isShaking}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-amber-300 font-bold"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={handleRollDome}
            disabled={isShaking}
            className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-slate-950 font-black text-lg py-3 rounded-xl shadow-lg transition disabled:opacity-50 cursor-pointer"
          >
            {isShaking ? "SHAKING DOME..." : `SHAKE DOME ($${betAmount})`}
          </button>
        </div>
      </div>

      <div className="text-center text-xs font-mono text-slate-400 bg-slate-900/40 p-2 rounded-lg">
        {message}
      </div>
    </div>
  );
};
export default SicBoGame;
