import React, { useState, useEffect, useRef } from "react";
import { Coins, Play, RefreshCw, Trophy, ArrowDown, Activity, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../lib/audioService";
import { evaluateLiveGameRound } from "../constants/liveGameConfig";

interface NeonPlinkoProps {
  chips: number;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest: (type: "greet" | "win" | "lose") => void;
}

interface PlinkoBall {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  betAmount: number;
  risk: "low" | "medium" | "high";
  isWin?: boolean;
}

interface PlinkoPeg {
  x: number;
  y: number;
  radius: number;
  flashIntensity: number; // For neon hit feedback animation
}

interface PlinkoBin {
  x: number;
  width: number;
  multiplier: number;
  label: string;
  color: string;
  glowColor: string;
}

const RISK_MULTIPLIERS = {
  low: [2.5, 1.6, 1.2, 0.8, 0.6, 0.8, 1.2, 1.6, 2.5],
  medium: [6.0, 3.0, 1.5, 0.5, 0.2, 0.5, 1.5, 3.0, 6.0],
  high: [16.0, 9.0, 3.0, 0.2, 0.0, 0.2, 3.0, 9.0, 16.0],
};

const RISK_COLORS = {
  low: {
    border: "border-cyan-500/30",
    bg: "bg-cyan-950/20",
    text: "text-cyan-400",
    btnActive: "bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]",
    glow: "rgba(6,182,212,0.6)",
  },
  medium: {
    border: "border-amber-500/30",
    bg: "bg-amber-950/20",
    text: "text-amber-400",
    btnActive: "bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]",
    glow: "rgba(245,158,11,0.6)",
  },
  high: {
    border: "border-rose-500/30",
    bg: "bg-rose-950/20",
    text: "text-rose-400",
    btnActive: "bg-rose-500 text-slate-950 shadow-[0_0_15px_rgba(244,63,94,0.4)]",
    glow: "rgba(244,63,94,0.6)",
  },
};

export default function NeonPlinko({ chips, onWin, onLose, onCommentaryRequest }: NeonPlinkoProps) {
  const [bet, setBet] = useState(25);
  const [risk, setRisk] = useState<"low" | "medium" | "high">("medium");
  const [stats, setStats] = useState({ totalDrops: 0, totalBets: 0, totalWins: 0, maxWin: 0 });
  const [autoDrop, setAutoDrop] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const ballsRef = useRef<PlinkoBall[]>([]);
  const pegsRef = useRef<PlinkoPeg[]>([]);
  const binsRef = useRef<PlinkoBin[]>([]);
  const isAutoRef = useRef(autoDrop);

  isAutoRef.current = autoDrop;

  // Sound limits to prevent audio clipping during fast drops
  const lastSoundTimeRef = useRef(0);
  const playPegSound = () => {
    const now = Date.now();
    if (now - lastSoundTimeRef.current > 45) {
      casinoAudio.playWheelSpin(0.04);
      lastSoundTimeRef.current = now;
    }
  };

  // Dimensions
  const width = 500;
  const height = 550;
  const pegRadius = 4;
  const ballRadius = 6;
  const rows = 8; // Row index 0 to 7

  // Generate Board Layout
  useEffect(() => {
    // Pegs
    const pegs: PlinkoPeg[] = [];
    const startY = 80;
    const rowSpacing = 42;
    const pegSpacingX = 36;
    const centerX = width / 2;

    for (let r = 0; r < rows; r++) {
      const pegsInRow = r + 3; // Row 0 has 3 pegs, Row 7 has 10 pegs
      const rowY = startY + r * rowSpacing;
      const rowWidth = (pegsInRow - 1) * pegSpacingX;
      const rowStartX = centerX - rowWidth / 2;

      for (let p = 0; p < pegsInRow; p++) {
        pegs.push({
          x: rowStartX + p * pegSpacingX,
          y: rowY,
          radius: pegRadius,
          flashIntensity: 0,
        });
      }
    }
    pegsRef.current = pegs;

    // Multiplier bins at the bottom
    const currentMultipliers = RISK_MULTIPLIERS[risk];
    const binCount = currentMultipliers.length;
    const binWidth = width / binCount;
    const bins: PlinkoBin[] = [];

    const binColors = [
      { text: "#f43f5e", glow: "rgba(244,63,94,0.5)" }, // edge 10x
      { text: "#f97316", glow: "rgba(249,115,22,0.5)" },
      { text: "#eab308", glow: "rgba(234,179,8,0.5)" },
      { text: "#10b981", glow: "rgba(16,185,129,0.5)" },
      { text: "#38bdf8", glow: "rgba(56,189,248,0.5)" }, // center
      { text: "#10b981", glow: "rgba(16,185,129,0.5)" },
      { text: "#eab308", glow: "rgba(234,179,8,0.5)" },
      { text: "#f97316", glow: "rgba(249,115,22,0.5)" },
      { text: "#f43f5e", glow: "rgba(244,63,94,0.5)" }, // edge 10x
    ];

    for (let i = 0; i < binCount; i++) {
      bins.push({
        x: i * binWidth,
        width: binWidth,
        multiplier: currentMultipliers[i],
        label: `${currentMultipliers[i]}x`,
        color: binColors[i % binColors.length].text,
        glowColor: binColors[i % binColors.length].glow,
      });
    }
    binsRef.current = bins;
  }, [risk]);

  // Main Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let localFrame: number;

    const gravity = 0.16;
    const bounceFactor = 0.55;
    const pegFriction = 0.98;

    const update = () => {
      // 1. Update Peg Flashes
      pegsRef.current.forEach((peg) => {
        if (peg.flashIntensity > 0) {
          peg.flashIntensity -= 0.08;
          if (peg.flashIntensity < 0) peg.flashIntensity = 0;
        }
      });

      // 2. Update Balls
      const balls = ballsRef.current;
      const bins = binsRef.current;
      const activeBalls: PlinkoBall[] = [];

      for (let i = 0; i < balls.length; i++) {
        const ball = balls[i];

        // Apply physics
        ball.vy += gravity;
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Peg Collisions
        pegsRef.current.forEach((peg) => {
          const dx = ball.x - peg.x;
          const dy = ball.y - peg.y;
          const distance = Math.hypot(dx, dy);
          const minDist = ball.radius + peg.radius;

          if (distance < minDist) {
            // Push out
            const angle = Math.atan2(dy, dx);
            ball.x = peg.x + Math.cos(angle) * minDist;
            ball.y = peg.y + Math.sin(angle) * minDist;

            // Reflect velocity vector
            const speed = Math.hypot(ball.vx, ball.vy);
            // Dynamic collision deflection with a random kick left/right
            const dispersion = (Math.random() - 0.5) * 0.4;
            ball.vx = Math.cos(angle + dispersion) * speed * bounceFactor;
            ball.vy = Math.sin(angle + dispersion) * speed * bounceFactor;

            // Keep vertical speed moving down so balls don't get stuck
            if (ball.vy < 0.2) ball.vy = 0.5;

            // Flash peg
            peg.flashIntensity = 1.0;
            playPegSound();
          }
        });

        // Boundary walls collision
        const leftBoundary = 15;
        const rightBoundary = width - 15;
        if (ball.x - ball.radius < leftBoundary) {
          ball.x = leftBoundary + ball.radius;
          ball.vx = -ball.vx * bounceFactor;
        } else if (ball.x + ball.radius > rightBoundary) {
          ball.x = rightBoundary - ball.radius;
          ball.vx = -ball.vx * bounceFactor;
        }

        // Check if ball landed in bin
        const binLineY = height - 55;
        if (ball.y >= binLineY) {
          const binWidth = width / bins.length;
          let landingBinIndex = Math.floor(ball.x / binWidth);
          landingBinIndex = Math.max(0, Math.min(bins.length - 1, landingBinIndex));
          const bin = bins[landingBinIndex];

          // Calculate payout
          const winAmount = Math.round(ball.betAmount * bin.multiplier);

          if (winAmount > 0) {
            onWin(winAmount, `Neon Plinko: Dropped $${ball.betAmount} on ${ball.risk.toUpperCase()} risk, hit ${bin.label} bin!`);
            casinoAudio.playWin();
          } else {
            casinoAudio.playLose();
          }

          // Update game stats
          setStats((prev) => {
            const nextWins = prev.totalWins + (winAmount > 0 ? 1 : 0);
            return {
              totalDrops: prev.totalDrops + 1,
              totalBets: prev.totalBets + ball.betAmount,
              totalWins: nextWins,
              maxWin: Math.max(prev.maxWin, winAmount),
            };
          });

          // Request Vance commentary occasionally
          if (bin.multiplier >= 3) {
            onCommentaryRequest("win");
          } else if (bin.multiplier === 0) {
            onCommentaryRequest("lose");
          }
        } else {
          activeBalls.push(ball);
        }
      }

      ballsRef.current = activeBalls;

      // 3. Render
      ctx.clearRect(0, 0, width, height);

      // Draw background board details
      ctx.fillStyle = "#020617"; // dark slate 950
      ctx.fillRect(0, 0, width, height);

      // Draw grid container outline
      ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
      ctx.lineWidth = 1;
      ctx.strokeRect(10, 10, width - 20, height - 20);

      // Draw neon side limits guides
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.strokeStyle = "rgba(244, 63, 94, 0.15)";
      ctx.moveTo(15, 60);
      ctx.lineTo(15, height - 70);
      ctx.moveTo(width - 15, 60);
      ctx.lineTo(width - 15, height - 70);
      ctx.stroke();

      // Draw Multiplier Bins
      bins.forEach((bin) => {
        const binY = height - 50;
        const binH = 40;

        // Draw Bin Container Box
        ctx.shadowBlur = 8;
        ctx.shadowColor = bin.glowColor;
        ctx.strokeStyle = bin.color;
        ctx.lineWidth = 1.5;
        
        ctx.strokeRect(bin.x + 2, binY, bin.width - 4, binH);

        // Fill background subtly
        ctx.fillStyle = "rgba(15, 23, 42, 0.6)";
        ctx.fillRect(bin.x + 2, binY, bin.width - 4, binH);

        // Multiplier Text
        ctx.shadowBlur = 4;
        ctx.fillStyle = bin.color;
        ctx.font = "black 11px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(bin.label, bin.x + bin.width / 2, binY + 24);
      });

      // Reset shadows for pegs
      ctx.shadowBlur = 0;

      // Draw Pegs
      pegsRef.current.forEach((peg) => {
        // Draw peg outer neon aura if flashing
        if (peg.flashIntensity > 0) {
          ctx.beginPath();
          ctx.arc(peg.x, peg.y, peg.radius + 6 * peg.flashIntensity, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(234, 179, 8, ${peg.flashIntensity * 0.25})`;
          ctx.fill();
        }

        // Draw core peg
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
        ctx.fillStyle = peg.flashIntensity > 0 ? "#facc15" : "rgba(255, 255, 255, 0.35)";
        ctx.fill();
        
        // Inner point
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = peg.flashIntensity > 0 ? "#ffffff" : "rgba(255, 255, 255, 0.6)";
        ctx.fill();
      });

      // Draw Balls
      ballsRef.current.forEach((ball) => {
        // Outer core blur
        ctx.shadowBlur = 12;
        ctx.shadowColor = ball.color;
        
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        ctx.lineWidth = 2.5;
        ctx.strokeStyle = ball.color;
        ctx.stroke();
      });

      // Reset shadows
      ctx.shadowBlur = 0;

      // Draw emitter pointer at top
      ctx.beginPath();
      ctx.arc(width / 2, 45, 12, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.stroke();
      ctx.fill();

      ctx.fillStyle = "#a78bfa"; // violet glow emit point
      ctx.beginPath();
      ctx.arc(width / 2, 45, 4, 0, Math.PI * 2);
      ctx.fill();

      localFrame = requestAnimationFrame(update);
    };

    localFrame = requestAnimationFrame(update);
    animationFrameRef.current = localFrame;

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [risk]);

  // Auto-Drop simulation
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (autoDrop) {
      interval = setInterval(() => {
        handleDropBall();
      }, 700);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoDrop, bet, risk, chips]);

  const handleDropBall = () => {
    if (chips < bet) {
      setAutoDrop(false);
      return;
    }

    casinoAudio.playChipClink();
    onLose(bet, `Placed $${bet} Plinko Drop Bet`);

    // Spawn slightly offset from center top so they cascade randomly
    const startOffset = (Math.random() - 0.5) * 16;
    const colors = ["#f43f5e", "#10b981", "#06b6d4", "#eab308", "#a855f7", "#ec4899"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const isWin = evaluateLiveGameRound();

    const newBall: PlinkoBall = {
      id: Math.random().toString(36).substring(2, 9),
      x: width / 2 + startOffset,
      y: 45,
      vx: (Math.random() - 0.5) * 1.5,
      vy: 1,
      radius: ballRadius,
      color: randomColor,
      betAmount: bet,
      risk: risk,
      isWin: isWin,
    };

    ballsRef.current.push(newBall);
  };

  const adjustBet = (amount: number) => {
    casinoAudio.playClick();
    setBet(amount);
  };

  return (
    <div id="plinko-game-container" className="flex flex-col gap-6 p-4 sm:p-6 rounded-3xl border border-slate-900 bg-slate-950/80 backdrop-blur-xl relative overflow-hidden shadow-2xl glow-fuchsia">
      {/* Background aesthetics */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/15 via-slate-950/20 to-slate-950 pointer-events-none" />
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[9px] uppercase tracking-widest font-mono font-black rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400">
              EXCLUSIVE VIP
            </span>
            <span className="flex items-center gap-1 text-[9px] uppercase tracking-widest font-mono font-black rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Sparkles className="h-2.5 w-2.5 text-purple-400" /> NEW RE-DESIGNS
            </span>
          </div>
          <h2 className="text-xl font-sans font-black text-white tracking-tight mt-1 flex items-center gap-2">
            Neon Plinko <span className="text-rose-500 text-sm">$</span>
          </h2>
        </div>

        {/* Stats strip */}
        <div className="flex gap-4 font-mono text-[10px] text-slate-500 bg-slate-900/40 border border-white/[0.02] p-2.5 rounded-2xl">
          <div className="flex flex-col">
            <span className="text-slate-400 font-extrabold uppercase">BALLS DROPPED</span>
            <span className="text-xs font-black text-slate-100">{stats.totalDrops}</span>
          </div>
          <div className="w-[1px] bg-white/[0.04]" />
          <div className="flex flex-col">
            <span className="text-slate-400 font-extrabold uppercase">TOTAL BET</span>
            <span className="text-xs font-black text-slate-100">${stats.totalBets}</span>
          </div>
          <div className="w-[1px] bg-white/[0.04]" />
          <div className="flex flex-col">
            <span className="text-slate-400 font-extrabold uppercase">MAX WIN</span>
            <span className="text-xs font-black text-amber-400">${stats.maxWin}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start z-10">
        {/* Left Interactive panel - Canvas board */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center p-3 bg-slate-950/70 border border-white/[0.02] rounded-3xl relative overflow-hidden shadow-inner">
          <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none">
            <ArrowDown className="h-4 w-4 text-violet-400/60 animate-bounce" />
          </div>

          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="w-full max-w-[440px] aspect-[500/550] bg-slate-950 rounded-2xl shadow-xl select-none"
          />
        </div>

        {/* Right Controls panel */}
        <div className="lg:col-span-5 space-y-5">
          {/* Risk Level Options */}
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-white/[0.02] space-y-3.5">
            <label className="block text-[10px] uppercase font-mono tracking-widest text-slate-400 font-extrabold">
              Risk Level Matrix
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["low", "medium", "high"] as const).map((r) => {
                const isActive = risk === r;
                return (
                  <button
                    key={r}
                    onClick={() => {
                      casinoAudio.playClick();
                      setRisk(r);
                    }}
                    className={`py-3 px-2 text-center rounded-xl font-mono text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      isActive
                        ? RISK_COLORS[r].btnActive
                        : "bg-slate-900 hover:bg-slate-850 text-slate-400 border border-white/[0.02] hover:text-white"
                    }`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bet Size Inputs */}
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-white/[0.02] space-y-4">
            <div className="flex justify-between items-center">
              <label className="block text-[10px] uppercase font-mono tracking-widest text-slate-400 font-extrabold flex items-center gap-1.5">
                <Coins className="h-3.5 w-3.5 text-slate-400" /> DROPPING CHIP VALUE
              </label>
              <span className="text-[10px] font-mono font-bold text-emerald-400">USDT</span>
            </div>

            <div className="flex gap-2">
              <input
                type="number"
                min={0.10}
                step={0.10}
                max={Math.max(0.10, chips)}
                value={bet}
                onChange={(e) => setBet(Math.max(0.10, Number(e.target.value)))}
                className="flex-1 px-4 py-3 bg-slate-950 border border-white/[0.04] hover:border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl font-mono text-xs font-bold text-white transition-all shadow-inner"
              />
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {[10, 25, 50, 100].map((amt) => (
                <button
                  key={amt}
                  onClick={() => adjustBet(amt)}
                  className="py-2 rounded-lg bg-slate-950 hover:bg-slate-900 border border-white/[0.02] font-mono text-[10px] text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  ${amt}
                </button>
              ))}
              <button
                onClick={() => adjustBet(chips)}
                className="py-2 rounded-lg bg-slate-950 hover:bg-slate-900 border border-rose-500/20 font-mono text-[10px] text-rose-400 hover:text-rose-300 font-bold transition-all cursor-pointer"
              >
                MAX
              </button>
            </div>
          </div>

          {/* Action Launch Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleDropBall}
              disabled={chips < bet}
              className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-sans font-black text-sm rounded-2xl shadow-lg shadow-indigo-950/40 hover:shadow-indigo-500/10 cursor-pointer transition-all disabled:opacity-40 active:scale-[0.98] flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              <Play className="h-4 w-4 fill-white text-white" /> Drop Ball (${bet})
            </button>

            <button
              onClick={() => {
                casinoAudio.playClick();
                setAutoDrop((prev) => !prev);
              }}
              disabled={chips < bet}
              className={`w-full py-3.5 border font-sans font-black text-xs rounded-2xl tracking-widest uppercase transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2 ${
                autoDrop
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
                  : "bg-slate-900 hover:bg-slate-850 border-white/[0.02] text-slate-300 hover:text-white"
              }`}
            >
              <Activity className={`h-4 w-4 ${autoDrop ? "animate-pulse text-rose-400" : ""}`} />
              {autoDrop ? "Stop Auto Mode" : "Start Auto Drop"}
            </button>
          </div>

          {/* Multiplier Info Box */}
          <div className="p-4 bg-slate-950/60 border border-white/[0.01] rounded-2xl font-mono text-[10px] text-slate-500 leading-relaxed space-y-1.5">
            <div className="font-extrabold text-slate-400 uppercase tracking-wider">Physics Board Mechanics</div>
            <p>
              In this high-roller Plinko variant, your chip falls down an offset peg layout. Left and right deflections are fully computed with real-time elasticity. Bins at the bottom award multipliers. Lower Risk is safer; High Risk includes high multiplier payouts (up to 16x) with a chance of hitting a 0x blank zone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
