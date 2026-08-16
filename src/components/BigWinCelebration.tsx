import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Trophy, Star } from "lucide-react";
import { casinoAudio } from "../lib/audioService";

interface Particle {
  id: number;
  startX: number;
  startY: number;
  midX: number;
  peakY: number;
  endX: number;
  endY: number;
  initialRotate: number;
  rotateAmount: number;
  scale: number;
  duration: number;
  delay: number;
  color: string;
  type: "coin" | "star" | "confetti" | "sparkle";
  size: number;
  aspectRatio?: string;
}

interface BigWinCelebrationProps {
  key?: string;
  amount: number;
  onClose: () => void;
}

export default function BigWinCelebration({ amount, onClose }: BigWinCelebrationProps) {
  const [showContent, setShowContent] = useState(true);

  // Trigger audio and auto close celebration after 6 seconds
  useEffect(() => {
    casinoAudio.playMegaWin();
    const timer = setTimeout(() => {
      setShowContent(false);
      setTimeout(onClose, 800); // Allow fade out animation
    }, 5500);
    return () => clearTimeout(timer);
  }, [onClose]);

  // Determine win tier
  const tier = useMemo(() => {
    if (amount >= 500) return { label: "MEGA WIN!", color: "from-amber-400 via-yellow-300 to-amber-500", shadow: "shadow-yellow-500/50", sound: "jackpot" };
    if (amount >= 200) return { label: "BIG WIN!", color: "from-cyan-400 via-teal-300 to-emerald-400", shadow: "shadow-cyan-500/40", sound: "bigwin" };
    return { label: "NICE WIN!", color: "from-purple-400 via-pink-400 to-indigo-400", shadow: "shadow-purple-500/30", sound: "nice" };
  }, [amount]);

  // Generate particles
  const particles = useMemo(() => {
    const temp: Particle[] = [];
    const count = amount >= 500 ? 120 : amount >= 200 ? 70 : 40;
    
    const colors = [
      "bg-amber-400", "bg-yellow-300", "bg-yellow-500", // Gold shades
      "bg-emerald-400", "bg-teal-400", "bg-cyan-400", // Cool shades
      "bg-rose-500", "bg-fuchsia-500", "bg-purple-500", // Warm shades
      "bg-orange-500", "bg-red-500"
    ];

    // Helper to generate a particle from a specific starting point
    const createParticle = (id: number, startX: number, startY: number, angleRange: [number, number], velocityRange: [number, number], customType?: "coin" | "star" | "confetti" | "sparkle") => {
      // Angle in radians
      const angle = (Math.random() * (angleRange[1] - angleRange[0]) + angleRange[0]) * (Math.PI / 180);
      const velocity = Math.random() * (velocityRange[1] - velocityRange[0]) + velocityRange[0];
      
      // Calculate parabolic trajectory offsets
      const distance = velocity * 15;
      const endX = startX + Math.cos(angle) * distance;
      
      // Arc peak
      const peakHeight = Math.random() * 200 + 100;
      const peakY = startY - Math.sin(angle) * distance - peakHeight;
      const endY = window.innerHeight + 50; // Falls off screen

      // Type
      const r = Math.random();
      const type = customType || (r < 0.4 ? "coin" : r < 0.6 ? "star" : r < 0.95 ? "confetti" : "sparkle");

      const size = type === "coin" 
        ? Math.random() * 12 + 12  // 12px to 24px
        : type === "star" 
          ? Math.random() * 10 + 10  // 10px to 20px
          : Math.random() * 6 + 6;   // 6px to 12px

      return {
        id,
        startX,
        startY,
        midX: startX + Math.cos(angle) * distance * 0.5,
        peakY,
        endX,
        endY,
        initialRotate: Math.random() * 360,
        rotateAmount: (Math.random() - 0.5) * 720,
        scale: Math.random() * 0.4 + 0.8,
        duration: Math.random() * 1.5 + 2.0, // 2 to 3.5 seconds flight
        delay: Math.random() * 0.5, // Staggered spawn
        color: colors[Math.floor(Math.random() * colors.length)],
        type,
        size,
        aspectRatio: type === "confetti" ? (Math.random() < 0.5 ? "aspect-[3/1]" : "aspect-[2/1]") : "aspect-square"
      };
    };

    // 1. Center burst particles
    const centerCount = Math.floor(count * 0.6);
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2 - 50;

    for (let i = 0; i < centerCount; i++) {
      // 360 degrees explosion
      temp.push(createParticle(i, centerX, centerY, [0, 360], [15, 35]));
    }

    // 2. Add side fountains for big & mega wins
    if (amount >= 200) {
      const fountainCount = Math.floor(count * 0.4);
      // Left bottom fountain shooting up-right (angle: 30 to 75 degrees)
      const leftCount = Math.floor(fountainCount / 2);
      for (let i = 0; i < leftCount; i++) {
        temp.push(createParticle(
          centerCount + i,
          50, // bottom-left
          window.innerHeight - 50,
          [30, 75],
          [25, 45],
          Math.random() < 0.7 ? "coin" : "confetti"
        ));
      }

      // Right bottom fountain shooting up-left (angle: 105 to 150 degrees)
      const rightCount = fountainCount - leftCount;
      for (let i = 0; i < rightCount; i++) {
        temp.push(createParticle(
          centerCount + leftCount + i,
          window.innerWidth - 50, // bottom-right
          window.innerHeight - 50,
          [105, 150],
          [25, 45],
          Math.random() < 0.7 ? "coin" : "confetti"
        ));
      }
    }

    return temp;
  }, [amount]);

  return (
    <div className="fixed inset-0 z-[1000] pointer-events-none overflow-hidden flex items-center justify-center">
      {/* Dimmed glass overlay */}
      <AnimatePresence>
        {showContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] transition-all"
            style={{ pointerEvents: "auto" }} // Intercept clicks to prevent clicking games behind it during jackpot
            onClick={() => {
              // Quick tap to dismiss
              setShowContent(false);
              setTimeout(onClose, 500);
            }}
          />
        )}
      </AnimatePresence>

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((p) => {
          return (
            <motion.div
              key={p.id}
              initial={{
                x: p.startX - p.size / 2,
                y: p.startY - p.size / 2,
                opacity: 0,
                scale: 0,
                rotate: p.initialRotate,
              }}
              animate={showContent ? {
                x: [p.startX - p.size / 2, p.midX - p.size / 2, p.endX - p.size / 2],
                y: [p.startY - p.size / 2, p.peakY - p.size / 2, p.endY],
                opacity: [0, 1, 1, 0.9, 0],
                scale: [0, p.scale, p.scale, p.scale * 0.7, 0],
                rotate: p.initialRotate + p.rotateAmount,
              } : { opacity: 0 }}
              transition={{
                duration: p.duration,
                ease: [0.1, 0.8, 0.25, 1], // Custom snappy ease out then fall
                delay: p.delay,
              }}
              className={`absolute pointer-events-none flex items-center justify-center shadow-lg rounded-sm`}
              style={{
                width: p.size,
                height: p.size,
              }}
            >
              {p.type === "coin" && (
                <div className="w-full h-full rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 border border-amber-300 shadow-md flex items-center justify-center font-sans font-black text-amber-950 select-none text-[8px] sm:text-[10px] leading-none">
                  $
                </div>
              )}

              {p.type === "star" && (
                <div className="w-full h-full flex items-center justify-center text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]">
                  <Star className="w-full h-full fill-amber-300 stroke-amber-500" />
                </div>
              )}

              {p.type === "confetti" && (
                <div className={`w-full h-full ${p.aspectRatio} ${p.color} rounded-[1px] opacity-90 shadow-sm`} />
              )}

              {p.type === "sparkle" && (
                <div className="w-full h-full bg-white rotate-45 scale-75 blur-[0.5px] rounded-[1px] animate-pulse shadow-[0_0_6px_#fff]" />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Epic Center Banner Card */}
      <AnimatePresence>
        {showContent && (
          <motion.div
            initial={{ opacity: 0, scale: 0.3, y: 100, rotate: -5 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0, 
              rotate: 0,
              transition: {
                type: "spring",
                stiffness: 120,
                damping: 10,
                mass: 0.8
              }
            }}
            exit={{ opacity: 0, scale: 0.5, y: -80, rotate: 5, transition: { duration: 0.4 } }}
            className="relative z-10 mx-4 max-w-sm sm:max-w-md w-full bg-slate-950/90 border border-amber-500/30 p-6 sm:p-8 rounded-3xl text-center shadow-2xl backdrop-blur-xl flex flex-col items-center gap-4 overflow-hidden"
            style={{ pointerEvents: "auto" }}
          >
            {/* Ambient gold glow backplate */}
            <div className="absolute -inset-10 bg-gradient-to-b from-amber-500/10 via-transparent to-transparent opacity-50 blur-3xl pointer-events-none" />

            {/* Top Icon Badge */}
            <motion.div 
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: [0, 1.2, 1], rotate: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 p-0.5 shadow-lg flex items-center justify-center relative"
            >
              <div className="absolute -inset-1 bg-yellow-400 rounded-2xl blur opacity-30 animate-pulse" />
              <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center">
                <Trophy className="h-8 w-8 text-amber-400 animate-bounce" />
              </div>
            </motion.div>

            {/* Header Text */}
            <div className="space-y-1">
              <motion.h1 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className={`text-4xl sm:text-5xl font-mono font-black tracking-tighter bg-gradient-to-r ${tier.color} bg-clip-text text-transparent drop-shadow-sm select-none`}
              >
                {tier.label}
              </motion.h1>
              <p className="text-xs font-mono uppercase tracking-widest text-slate-500">
                Payout Settled & Cleared
              </p>
            </div>

            {/* Massive Amount Count Up Display */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [0.8, 1.1, 1], opacity: 1 }}
              transition={{
                delay: 0.6,
                scale: { type: "keyframes", duration: 0.5, ease: "easeOut" },
                opacity: { type: "spring", stiffness: 100 }
              }}
              className="py-3 px-6 bg-slate-900/60 border border-slate-850 rounded-2xl min-w-[200px] shadow-inner relative flex flex-col items-center justify-center"
            >
              <span className="absolute -top-2.5 bg-amber-500/10 border border-amber-500/20 text-[9px] text-amber-400 px-2 py-0.5 rounded-full uppercase tracking-widest font-mono font-bold">
                Balance Credited
              </span>
              <div className="text-3xl sm:text-4xl font-mono font-black text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.25)] flex items-center gap-1.5 mt-1">
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  $
                </motion.span>
                <CountUp value={amount} delay={0.8} />
              </div>
            </motion.div>

            {/* Sparkle decorative icons */}
            <div className="flex gap-1.5 text-amber-500/70">
              <Sparkles className="h-4 w-4 animate-pulse" />
              <span className="text-[10px] font-mono tracking-widest uppercase text-slate-400 font-bold">NexaSpin Crypto Casino Payout</span>
              <Sparkles className="h-4 w-4 animate-pulse" />
            </div>

            {/* Close Button / Subtitle */}
            <button
              onClick={() => {
                casinoAudio.playClick();
                setShowContent(false);
                setTimeout(onClose, 500);
              }}
              className="mt-2 w-full max-w-[150px] py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer shadow-lg active:scale-95 text-center block"
            >
              Collect Payout
            </button>
            <span className="text-[9px] text-slate-600 font-mono">Tap anywhere to collect</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Simple CountUp component to animate the number ticking up
function CountUp({ value, delay }: { value: number; delay: number }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 1200; // 1.2s animation

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Easing function outQuad
      const easedProgress = progress * (2 - progress);
      
      setCurrent(Math.floor(easedProgress * value));

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCurrent(value);
      }
    };

    const runTimer = setTimeout(() => {
      window.requestAnimationFrame(step);
    }, delay * 1000);

    return () => clearTimeout(runTimer);
  }, [value, delay]);

  return <span>{current.toLocaleString()}</span>;
}
