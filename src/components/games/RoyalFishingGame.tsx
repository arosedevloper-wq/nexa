import React, { useState, useEffect, useRef } from "react";
import { Crosshair, Coins, Trophy, Zap, Shield } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../../lib/audioService";
import { evaluateLiveGameRound } from "../../constants/liveGameConfig";

interface RoyalFishingGameProps {
  chips: number;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest?: (type: "greet" | "win" | "lose") => void;
}

interface Fish {
  id: number;
  x: number;
  y: number;
  speed: number;
  type: string;
  emoji: string;
  multiplier: number;
  hp: number;
}

export const RoyalFishingGame: React.FC<RoyalFishingGameProps> = ({
  chips,
  onWin,
  onLose,
  onCommentaryRequest,
}) => {
  const [betAmount, setBetAmount] = useState<number>(50);
  const [scoreWin, setScoreWin] = useState<number>(0);
  const [message, setMessage] = useState<string>("Aim Cannon and Click Ocean to fire laser bullets at Golden Fish!");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fishesRef = useRef<Fish[]>([]);
  const bulletsRef = useRef<{ x: number; y: number; vx: number; vy: number }[]>([]);

  // Initialize Swimming Ocean Fish
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = (canvas.width = canvas.parentElement?.clientWidth || 600);
    const height = (canvas.height = 320);

    // Initial fish batch
    fishesRef.current = [
      { id: 1, x: 50, y: 80, speed: 1.5, type: "Goldfish", emoji: "🐠", multiplier: 2, hp: 1 },
      { id: 2, x: 200, y: 150, speed: 1.0, type: "Golden Dragon", emoji: "🐉", multiplier: 20, hp: 5 },
      { id: 3, x: 400, y: 220, speed: 2.0, type: "Octopus King", emoji: "🐙", multiplier: 10, hp: 3 },
      { id: 4, x: 500, y: 100, speed: 1.2, type: "Shark", emoji: "🦈", multiplier: 15, hp: 4 },
    ];

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Underwater Ocean Gradient
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, "#0369a1");
      grad.addColorStop(1, "#0c4a6e");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Render Swimming Fish
      ctx.font = "bold 32px sans-serif";
      fishesRef.current.forEach((fish) => {
        fish.x += fish.speed;
        if (fish.x > width + 40) fish.x = -40;
        ctx.fillText(fish.emoji, fish.x, fish.y);
      });

      // Render Cannon Bullets
      ctx.fillStyle = "#f59e0b";
      bulletsRef.current.forEach((b, idx) => {
        b.x += b.vx;
        b.y += b.vy;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
        ctx.fill();

        // Check Collision with Fish
        fishesRef.current.forEach((fish) => {
          const dist = Math.hypot(b.x - fish.x, b.y - fish.y);
          if (dist < 30) {
            fish.hp -= 1;
            bulletsRef.current.splice(idx, 1);

            if (fish.hp <= 0) {
              // Fish Captured!
              const isWinRound = evaluateLiveGameRound();
              if (isWinRound) {
                casinoAudio.playWin();
                const win = betAmount * fish.multiplier;
                onWin(win, `Captured Royal ${fish.type} (${fish.multiplier}x)! (+$${win.toLocaleString()})`);
                setMessage(`🎯 CAPTURED ROYAL ${fish.type.toUpperCase()}! Won $${win.toLocaleString()}!`);
                if (onCommentaryRequest) onCommentaryRequest("win");
              } else {
                casinoAudio.playLose();
                onLose(betAmount, `Cannon shot missed target (-$${betAmount.toLocaleString()})`);
                setMessage(`Cannon hit ${fish.type}, but fish escaped!`);
              }
              // Respawn fish
              fish.x = -40;
              fish.hp = fish.multiplier / 2;
            }
          }
        });
      });

      // Draw Player Cannon at Bottom Center
      ctx.fillStyle = "#38bdf8";
      ctx.beginPath();
      ctx.arc(width / 2, height, 35, 0, Math.PI, true);
      ctx.fill();

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [betAmount]);

  const handleShootCannon = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (chips < betAmount) {
      alert("Insufficient chips!");
      return;
    }
    casinoAudio.playLaserShot();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const targetX = e.clientX - rect.left;
    const targetY = e.clientY - rect.top;

    const cannonX = canvas.width / 2;
    const cannonY = canvas.height;

    const angle = Math.atan2(targetY - cannonY, targetX - cannonX);
    const speed = 12;

    bulletsRef.current.push({
      x: cannonX,
      y: cannonY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    });
  };

  return (
    <div className="w-full bg-slate-950 rounded-2xl border border-sky-500/30 p-5 shadow-2xl font-sans text-slate-100 flex flex-col gap-4">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-500/10 border border-sky-500/30 rounded-xl text-sky-400">
            <Crosshair className="w-6 h-6 animate-spin" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              ROYAL FISHING <span className="text-xs bg-sky-500/20 text-sky-400 border border-sky-500/40 px-2 py-0.5 rounded-full uppercase">Arcade Laser Shooter</span>
            </h2>
            <p className="text-xs text-slate-400">Click anywhere on the ocean canvas to aim laser bullets at Dragon Fish & Sharks!</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl font-mono text-xs flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-400" />
          <span className="text-amber-300 font-bold">${chips.toLocaleString()}</span>
        </div>
      </div>

      {/* Ocean Canvas Arena */}
      <div className="relative w-full rounded-2xl border border-slate-800 overflow-hidden shadow-inner cursor-crosshair">
        <canvas ref={canvasRef} onClick={handleShootCannon} className="w-full h-[320px] block" />
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <label className="text-xs font-bold text-slate-400 block mb-1">BULLET CANNON POWER ($ / SHOT)</label>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(Math.max(10, Number(e.target.value)))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-amber-300 font-bold"
          />
        </div>

        <div className="flex items-end">
          <div className="text-xs font-mono text-slate-400">
            💡 <span className="text-sky-300 font-bold">Instruction:</span> Click directly on swimming fish to fire cannon lasers!
          </div>
        </div>
      </div>

      <div className="text-center text-xs font-mono text-slate-400 bg-slate-900/40 p-2 rounded-lg">
        {message}
      </div>
    </div>
  );
};
export default RoyalFishingGame;
