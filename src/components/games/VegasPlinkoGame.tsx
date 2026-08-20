import React, { useState, useEffect, useRef } from "react";
import { Coins, Play, RefreshCw, Trophy, ArrowDown, Sparkles, Activity, ShieldAlert, Zap, Flame } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../../lib/audioService";
import { evaluateLiveGameRound } from "../../constants/liveGameConfig";

interface VegasPlinkoGameProps {
  chips: number;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest?: (type: "greet" | "win" | "lose") => void;
  rtpBias?: string;
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
}

interface PlinkoPeg {
  x: number;
  y: number;
  radius: number;
  flashIntensity: number;
}

interface PlinkoBin {
  x: number;
  width: number;
  multiplier: number;
  label: string;
  color: string;
  hits: number;
}

interface PlinkoParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  radius: number;
}

const RISK_MULTIPLIERS = {
  low: [2.5, 1.5, 1.2, 0.8, 0.6, 0.8, 1.2, 1.5, 2.5],
  medium: [8.0, 3.5, 1.5, 0.5, 0.3, 0.5, 1.5, 3.5, 8.0],
  high: [29.0, 10.0, 3.0, 0.2, 0.0, 0.2, 3.0, 10.0, 29.0],
};

const RISK_THEMES = {
  low: {
    border: "border-cyan-500/40",
    text: "text-cyan-400",
    bgActive: "bg-cyan-500 text-slate-950 shadow-cyan-500/40",
    ballColor: "#06b6d4",
  },
  medium: {
    border: "border-amber-500/40",
    text: "text-amber-400",
    bgActive: "bg-amber-500 text-slate-950 shadow-amber-500/40",
    ballColor: "#f59e0b",
  },
  high: {
    border: "border-rose-500/40",
    text: "text-rose-400",
    bgActive: "bg-rose-500 text-slate-950 shadow-rose-500/40",
    ballColor: "#f43f5e",
  },
};

export const VegasPlinkoGame: React.FC<VegasPlinkoGameProps> = ({
  chips,
  onWin,
  onLose,
  onCommentaryRequest,
  rtpBias,
}) => {
  const [bet, setBet] = useState<number>(50);
  const [risk, setRisk] = useState<"low" | "medium" | "high">("medium");
  const [autoDrop, setAutoDrop] = useState<boolean>(false);
  const [stats, setStats] = useState({ totalDrops: 0, totalWins: 0, maxMultiplier: 0 });
  const [binHitCounts, setBinHitCounts] = useState<number[]>(Array(9).fill(0));

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const ballsRef = useRef<PlinkoBall[]>([]);
  const pegsRef = useRef<PlinkoPeg[]>([]);
  const binsRef = useRef<PlinkoBin[]>([]);
  const particlesRef = useRef<PlinkoParticle[]>([]);
  const autoDropRef = useRef<boolean>(autoDrop);

  autoDropRef.current = autoDrop;

  const quickBets = [10, 25, 50, 100, 250, 500];

  // Canvas dimensions
  const width = 520;
  const height = 560;

  // Sound rate limiter
  const lastPegSoundRef = useRef<number>(0);
  const triggerPegSound = () => {
    const now = Date.now();
    if (now - lastPegSoundRef.current > 40) {
      casinoAudio.playWheelSpin(0.05);
      lastPegSoundRef.current = now;
    }
  };

  // Initialize Pegboard & Bins
  useEffect(() => {
    const rows = 9;
    const startY = 60;
    const rowHeight = 42;
    const createdPegs: PlinkoPeg[] = [];

    for (let r = 0; r < rows; r++) {
      const count = r + 3; // 3 pegs at top, 11 pegs at bottom
      const totalWidth = (count - 1) * 38;
      const startX = (width - totalWidth) / 2;

      for (let c = 0; c < count; c++) {
        createdPegs.push({
          x: startX + c * 38,
          y: startY + r * rowHeight,
          radius: 4,
          flashIntensity: 0,
        });
      }
    }
    pegsRef.current = createdPegs;

    // Build landing bins at bottom
    const mults = RISK_MULTIPLIERS[risk];
    const binCount = mults.length;
    const binWidth = (width - 40) / binCount;
    const startBinX = 20;

    const createdBins: PlinkoBin[] = mults.map((m, idx) => {
      let color = "#10b981"; // Emerald
      if (m >= 10.0) color = "#ef4444"; // Red/Rose
      else if (m >= 3.0) color = "#f59e0b"; // Amber
      else if (m < 1.0) color = "#64748b"; // Slate

      return {
        x: startBinX + idx * binWidth,
        width: binWidth,
        multiplier: m,
        label: `${m}x`,
        color: color,
        hits: 0,
      };
    });

    binsRef.current = createdBins;
    setBinHitCounts(Array(binCount).fill(0));
  }, [risk]);

  // Main Physics Animation Loop
  useEffect(() => {
    let lastTime = performance.now();

    const updatePhysics = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.033);
      lastTime = time;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Clear Canvas with smooth trail fade
      ctx.fillStyle = "rgba(2, 6, 23, 0.92)";
      ctx.fillRect(0, 0, width, height);

      // Draw Top Launcher Spout
      ctx.beginPath();
      ctx.arc(width / 2, 20, 14, 0, Math.PI * 2);
      ctx.fillStyle = "#1e293b";
      ctx.fill();
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Update & Draw Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= dt;

        if (p.life <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        const alpha = p.life / p.maxLife;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * alpha, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      // Draw Pegs with Collision Glow
      const gravity = 550; // pixels / s^2
      pegsRef.current.forEach((peg) => {
        if (peg.flashIntensity > 0) {
          peg.flashIntensity = Math.max(0, peg.flashIntensity - dt * 3.5);
        }

        ctx.beginPath();
        ctx.arc(peg.x, peg.y, peg.radius + (peg.flashIntensity > 0 ? 1.5 : 0), 0, Math.PI * 2);

        if (peg.flashIntensity > 0) {
          ctx.fillStyle = "#ffffff";
          ctx.shadowColor = "#38bdf8";
          ctx.shadowBlur = 12;
        } else {
          ctx.fillStyle = "#cbd5e1";
          ctx.shadowBlur = 0;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Update Balls
      for (let i = ballsRef.current.length - 1; i >= 0; i--) {
        const ball = ballsRef.current[i];

        // Apply Gravity & Subtle Drag
        ball.vy += gravity * dt;
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        // Peg Collisions
        pegsRef.current.forEach((peg) => {
          const dx = ball.x - peg.x;
          const dy = ball.y - peg.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = ball.radius + peg.radius;

          if (dist < minDist) {
            triggerPegSound();
            peg.flashIntensity = 1.0;

            // Spawn bounce sparks
            for (let k = 0; k < 3; k++) {
              particlesRef.current.push({
                x: peg.x,
                y: peg.y,
                vx: (Math.random() - 0.5) * 80,
                vy: (Math.random() - 0.5) * 80,
                color: ball.color,
                life: 0.25,
                maxLife: 0.25,
                radius: 2,
              });
            }

            // Normal bounce vector
            const nx = dx / (dist || 1);
            const ny = dy / (dist || 1);

            // Reflect velocity with coefficient of restitution (elasticity = 0.55)
            const dot = ball.vx * nx + ball.vy * ny;
            ball.vx = (ball.vx - 1.55 * dot * nx) + (Math.random() - 0.5) * 20;
            ball.vy = (ball.vy - 1.55 * dot * ny);

            // Push ball out of overlap
            const overlap = minDist - dist;
            ball.x += nx * overlap;
            ball.y += ny * overlap;
          }
        });

        // Left/Right Canvas Bounds
        if (ball.x - ball.radius < 15) {
          ball.x = 15 + ball.radius;
          ball.vx = Math.abs(ball.vx) * 0.6;
        } else if (ball.x + ball.radius > width - 15) {
          ball.x = width - 15 - ball.radius;
          ball.vx = -Math.abs(ball.vx) * 0.6;
        }

        // Draw Glowing Ball
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = ball.color;
        ctx.shadowColor = ball.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Bottom Bins Collision
        const binY = height - 50;
        if (ball.y >= binY) {
          // Check landing bin index
          const landedBinIdx = binsRef.current.findIndex(
            (b) => ball.x >= b.x && ball.x < b.x + b.width
          );

          let bin = binsRef.current[landedBinIdx >= 0 ? landedBinIdx : Math.floor(binsRef.current.length / 2)];
          const isWinRound = evaluateLiveGameRound(undefined, rtpBias);
          if (!isWinRound) {
            // Force middle bin (low multiplier 0.2x - 0.6x)
            const middleIdx = Math.floor(binsRef.current.length / 2);
            bin = binsRef.current[middleIdx] || bin;
          }

          const returnAmount = Math.floor(ball.betAmount * bin.multiplier);
          const netProfit = returnAmount - ball.betAmount;

          if (netProfit > 0) {
            casinoAudio.playWin();
            onWin(netProfit, `Plinko (${ball.risk.toUpperCase()}) landed ${bin.multiplier}x (+ $${netProfit})`);
          } else {
            casinoAudio.playLose();
            const lossAmt = ball.betAmount - returnAmount;
            if (lossAmt > 0) {
              onLose(lossAmt, `Plinko (${ball.risk.toUpperCase()}) landed ${bin.multiplier}x (- $${lossAmt})`);
            }
          }

          setBinHitCounts((prev) => {
            const copy = [...prev];
            const idx = landedBinIdx >= 0 ? landedBinIdx : 4;
            copy[idx] = (copy[idx] || 0) + 1;
            return copy;
          });

          setStats((prev) => ({
            totalDrops: prev.totalDrops + 1,
            totalWins: prev.totalWins + returnAmount,
            maxMultiplier: Math.max(prev.maxMultiplier, bin.multiplier),
          }));

          // Remove ball from active list
          ballsRef.current.splice(i, 1);
        }
      }

      // Draw Landing Bins
      const binY = height - 45;
      binsRef.current.forEach((b) => {
        ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.roundRect(b.x + 2, binY, b.width - 4, 38, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = b.color;
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(b.label, b.x + b.width / 2, binY + 22);
      });

      animationFrameRef.current = requestAnimationFrame(updatePhysics);
    };

    animationFrameRef.current = requestAnimationFrame(updatePhysics);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [risk, onWin]);

  // Drop Ball Action
  const dropBall = (customX?: number) => {
    if (chips < bet) {
      casinoAudio.playLose();
      setAutoDrop(false);
      return;
    }

    casinoAudio.playChipClink();
    onLose(bet, `Plinko Ball Drop ($${bet})`);

    const spawnX = customX !== undefined ? Math.max(width * 0.15, Math.min(width * 0.85, customX)) : (width / 2 + (Math.random() - 0.5) * 12);
    ballsRef.current.push({
      id: Math.random().toString(),
      x: spawnX,
      y: 25,
      vx: (Math.random() - 0.5) * 15,
      vy: 10,
      radius: 6.5,
      color: RISK_THEMES[risk].ballColor,
      betAmount: bet,
      risk: risk,
    });

    if (onCommentaryRequest && Math.random() < 0.2) {
      onCommentaryRequest("greet");
    }
  };

  // Passive touch event listener on canvas for zero-delay mobile drops
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const relativeX = ((touch.clientX - rect.left) / rect.width) * width;
        dropBall(relativeX);
      }
    };

    canvas.addEventListener("touchstart", handleTouchStart, { passive: true });

    return () => {
      canvas.removeEventListener("touchstart", handleTouchStart);
    };
  }, [chips, bet, risk, width]);

  // Auto Drop Interval
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (autoDrop) {
      interval = setInterval(() => {
        dropBall();
      }, 450);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoDrop, bet, risk, chips]);

  return (
    <div className="w-full max-w-5xl mx-auto bg-slate-950 border border-cyan-500/30 rounded-2xl p-4 sm:p-6 text-white shadow-2xl relative overflow-hidden backdrop-blur-xl">
      {/* Glow ambient background */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800/80 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <ArrowDown className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-wide bg-gradient-to-r from-cyan-400 via-blue-300 to-indigo-400 bg-clip-text text-transparent">
                VEGAS PLINKO
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 rounded-full uppercase tracking-wider">
                HIGH FPS PHYSICS
              </span>
            </div>
            <p className="text-xs text-slate-400">Drop golden balls down pin obstacles into multiplier bins</p>
          </div>
        </div>

        {/* Balance Display */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-cyan-500/30 px-4 py-2 rounded-xl shadow-inner">
          <Coins className="w-5 h-5 text-amber-400" />
          <span className="text-xs text-slate-400 font-medium">Balance:</span>
          <span className="text-base font-bold text-amber-300">${chips.toLocaleString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Controls */}
        <div className="lg:col-span-4 flex flex-col gap-4 bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl">
          {/* Bet Amount Input */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
              <span>BET PER BALL ($)</span>
              <span className="text-[10px] text-cyan-400">MIN $0.10 • MAX $5,000</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={bet}
                onChange={(e) => setBet(Math.max(0.10, Math.min(5000, Number(e.target.value))))}
                className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-amber-300 font-bold text-lg outline-none transition-all"
              />
              <span className="absolute right-3 top-3 text-xs font-bold text-slate-500">USD</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 mt-2">
              {quickBets.map((val) => (
                <button
                  key={val}
                  onClick={() => setBet(val)}
                  className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    bet === val
                      ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  ${val}
                </button>
              ))}
            </div>
          </div>

          {/* Risk Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
              <span>RISK MULTIPLIER MODE</span>
              <span className={`text-[10px] font-bold uppercase ${RISK_THEMES[risk].text}`}>
                {risk} RISK
              </span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["low", "medium", "high"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRisk(r)}
                  className={`py-2.5 rounded-xl font-extrabold text-xs uppercase border transition-all ${
                    risk === r
                      ? RISK_THEMES[r].bgActive
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Multiplier Spectrum Preview */}
          <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Current Bins Multipliers ({risk})
            </span>
            <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
              {RISK_MULTIPLIERS[risk].map((m, idx) => (
                <div
                  key={idx}
                  className={`px-1.5 py-1 rounded text-[10px] font-black min-w-[32px] text-center ${
                    m >= 10.0
                      ? "bg-red-950/80 text-red-400 border border-red-800/60"
                      : m >= 3.0
                      ? "bg-amber-950/80 text-amber-400 border border-amber-800/60"
                      : "bg-slate-800/80 text-slate-300"
                  }`}
                >
                  {m}x
                </div>
              ))}
            </div>
          </div>

          {/* Controls: Drop Single / Auto Drop */}
          <div className="flex flex-col gap-2.5 mt-2">
            <button
              onClick={() => dropBall()}
              className="w-full py-3.5 rounded-xl font-black text-slate-950 bg-gradient-to-r from-cyan-400 via-blue-300 to-indigo-400 hover:from-cyan-300 hover:to-blue-400 transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 text-base tracking-wide cursor-pointer"
            >
              <ArrowDown className="w-5 h-5 stroke-[3]" /> DROP BALL (${bet})
            </button>

            <button
              onClick={() => setAutoDrop(!autoDrop)}
              className={`w-full py-2.5 rounded-xl font-bold transition-all border flex items-center justify-center gap-2 text-xs ${
                autoDrop
                  ? "bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse"
                  : "bg-slate-800/90 border-slate-700 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <Zap className="w-4 h-4 text-amber-400" />
              {autoDrop ? "STOP AUTO DROP" : "ENABLE FAST AUTO DROP"}
            </button>
          </div>

          {/* Stats Bar */}
          <div className="mt-auto text-[11px] text-slate-400 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60 flex flex-col gap-1">
            <div className="flex justify-between">
              <span>Total Balls Dropped:</span>
              <span className="font-extrabold text-white">{stats.totalDrops}</span>
            </div>
            <div className="flex justify-between">
              <span>Peak Multiplier Hit:</span>
              <span className="font-extrabold text-amber-300">{stats.maxMultiplier}x</span>
            </div>
          </div>
        </div>

        {/* Right Canvas Display */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center bg-slate-900/40 border border-slate-800/80 p-3 sm:p-4 rounded-xl relative">
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const relativeX = ((e.clientX - rect.left) / rect.width) * width;
              dropBall(relativeX);
            }}
            className="w-full max-w-[500px] h-auto aspect-[520/560] rounded-2xl border border-slate-800 shadow-2xl bg-slate-950 touch-none select-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};

export default VegasPlinkoGame;
