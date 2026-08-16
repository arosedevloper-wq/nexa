import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

interface AnimatedChipsCounterProps {
  value: number;
  className?: string;
}

export default function AnimatedChipsCounter({ value, className = "" }: AnimatedChipsCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [delta, setDelta] = useState<number | null>(null);
  const [deltaId, setDeltaId] = useState(0);
  const prevValueRef = useRef(value);

  useEffect(() => {
    const prev = prevValueRef.current;
    if (prev === value) return;

    // Set delta
    const diff = value - prev;
    setDelta(diff);
    setDeltaId((id) => id + 1);

    // Animate displayValue from prev to value
    let startTimestamp: number | null = null;
    const duration = 800; // 0.8 seconds duration for snappy feel

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);

      // cubic ease-out easing
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentVal = Math.floor(prev + easedProgress * diff);
      
      setDisplayValue(currentVal);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
        prevValueRef.current = value;
      }
    };

    const animFrame = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [value]);

  return (
    <div className="relative flex items-center justify-start select-none">
      <span className={className}>
        ${displayValue.toLocaleString()}
      </span>

      <AnimatePresence>
        {delta !== null && delta !== 0 && (
          <motion.span
            key={deltaId}
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: -22, scale: 1 }}
            exit={{ opacity: 0, y: -36, scale: 0.85 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} // smooth ease out
            className={`absolute right-0 text-[10px] font-black tracking-wider px-1.5 py-0.5 rounded-md border pointer-events-none z-30 ${
              delta > 0 
                ? "text-emerald-400 bg-emerald-950/90 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.3)]" 
                : "text-rose-400 bg-rose-950/90 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.3)]"
            }`}
          >
            {delta > 0 ? `+` : ``}{delta.toLocaleString()}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
