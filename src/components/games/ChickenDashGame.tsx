import React, { useState, useEffect, useRef } from "react";
import { Footprints, Shield, Zap, Coins, Trophy, ArrowRight, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../../lib/audioService";
import { evaluateLiveGameRound } from "../../constants/liveGameConfig";

interface ChickenDashGameProps {
  chips: number;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest?: (type: "greet" | "win" | "lose") => void;
}

const STEP_MULTIPLIERS = [1.20, 1.55, 2.10, 3.20, 5.00, 8.50, 15.00, 30.00, 60.00, 120.00];

export const ChickenDashGame: React.FC<ChickenDashGameProps> = ({
  chips,
  onWin,
  onLose,
  onCommentaryRequest,
}) => {
  const [betAmount, setBetAmount] = useState<number>(100);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [gameState, setGameState] = useState<"idle" | "playing" | "crashed" | "cashed_out">("idle");
  const [winAmount, setWinAmount] = useState<number>(0);
  const [trapStep, setTrapStep] = useState<number>(5);
  const [message, setMessage] = useState<string>("Press START DASH to begin your frog road crossing!");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Draw 60fps canvas representation of frog crossing lanes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = (canvas.width = canvas.parentElement?.clientWidth || 600);
    const height = (canvas.height = 280);

    ctx.clearRect(0, 0, width, height);

    // Draw Lanes
    const numLanes = STEP_MULTIPLIERS.length;
    const laneWidth = width / (numLanes + 1);

    for (let i = 0; i <= numLanes; i++) {
      const x = i * laneWidth;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      if (i > 0 && i <= numLanes) {
        // Multiplier tag on top
        ctx.fillStyle = i <= currentStep ? "#10b981" : "#64748b";
        ctx.font = "bold 11px monospace";
        ctx.fillText(`${STEP_MULTIPLIERS[i - 1]}x`, x - 15, 25);
      }
    }

    // Draw Frog/Chicken Token
    const frogX = (currentStep + 0.5) * laneWidth;
    const frogY = height / 2;

    if (gameState === "playing" || gameState === "cashed_out") {
      ctx.fillStyle = "#10b981";
      ctx.shadowColor = "#10b981";
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(frogX, frogY, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("🐸", frogX - 10, frogY + 6);
    } else if (gameState === "crashed") {
      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 24px sans-serif";
      ctx.fillText("💥 SQUISHED!", frogX - 40, frogY);
    }
  }, [currentStep, gameState]);

  const handleStartDash = () => {
    if (chips < betAmount) {
      alert("Insufficient chips!");
      return;
    }
    casinoAudio.playClick();

    // Evaluate trap step
    const isWin = evaluateLiveGameRound();
    const trap = isWin ? Math.floor(6 + Math.random() * 4) : Math.floor(1 + Math.random() * 4);
    setTrapStep(trap);

    setCurrentStep(0);
    setGameState("playing");
    setMessage("Frog placed at Lane 0! Press STEP FORWARD to cross lanes.");
  };

  const handleStepForward = () => {
    if (gameState !== "playing") return;
    casinoAudio.playClick();

    const nextStep = currentStep + 1;
    if (nextStep >= trapStep) {
      // Hit trap!
      casinoAudio.playCrashExplosion();
      setGameState("crashed");
      onLose(betAmount, `Chicken Dash squished at Lane ${nextStep} (-$${betAmount.toLocaleString()})`);
      setMessage(`SQUISHED AT LANE ${nextStep}! Bet lost.`);
      if (onCommentaryRequest) onCommentaryRequest("lose");
    } else {
      // Safe step!
      casinoAudio.playWin();
      setCurrentStep(nextStep);
      const mult = STEP_MULTIPLIERS[nextStep - 1];
      setMessage(`SAFE STEP! Reached Lane ${nextStep} (${mult}x). Step further or CASH OUT!`);
    }
  };

  const handleCashout = () => {
    if (gameState !== "playing" || currentStep === 0) return;
    casinoAudio.playWin();
    const mult = STEP_MULTIPLIERS[currentStep - 1];
    const win = Math.floor(betAmount * mult);
    setWinAmount(win);
    setGameState("cashed_out");

    onWin(win, `Chicken Dash Cashout at ${mult}x (+$${win.toLocaleString()})`);
    setMessage(`CASHED OUT AT ${mult}x! Won $${win.toLocaleString()}!`);
    if (onCommentaryRequest) onCommentaryRequest("win");
  };

  return (
    <div className="w-full bg-slate-950 rounded-2xl border border-emerald-500/30 p-5 shadow-2xl font-sans text-slate-100 flex flex-col gap-4">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <Footprints className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              FROG / CHICKEN DASH <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full uppercase">Lane Runner</span>
            </h2>
            <p className="text-xs text-slate-400">Step across dangerous lanes to multiply your bet up to 120x!</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl font-mono text-xs flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-400" />
          <span className="text-amber-300 font-bold">${chips.toLocaleString()}</span>
        </div>
      </div>

      {/* Canvas Arena */}
      <div className="relative w-full bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden min-h-[280px] flex items-center justify-center">
        <canvas ref={canvasRef} className="w-full h-[280px] block" />
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <label className="text-xs font-bold text-slate-400 block mb-1">BET AMOUNT ($)</label>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(Math.max(10, Number(e.target.value)))}
            disabled={gameState === "playing"}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-amber-300 font-bold"
          />
        </div>

        {gameState !== "playing" ? (
          <div className="md:col-span-2 flex items-end">
            <button
              onClick={handleStartDash}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-lg py-3 rounded-xl shadow-lg transition cursor-pointer"
            >
              START DASH (${betAmount})
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={handleStepForward}
              className="bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-lg py-3 rounded-xl shadow-lg hover:scale-[1.02] transition cursor-pointer flex items-center justify-center gap-2"
            >
              STEP FORWARD 🐸
            </button>
            <button
              onClick={handleCashout}
              disabled={currentStep === 0}
              className="bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-lg py-3 rounded-xl shadow-lg hover:scale-[1.02] transition cursor-pointer disabled:opacity-40"
            >
              CASHOUT (${currentStep > 0 ? Math.floor(betAmount * STEP_MULTIPLIERS[currentStep - 1]).toLocaleString() : 0})
            </button>
          </>
        )}
      </div>

      <div className="text-center text-xs font-mono text-slate-400 bg-slate-900/40 p-2 rounded-lg">
        {message}
      </div>
    </div>
  );
};
export default ChickenDashGame;
