import React from "react";
import logoImg from "../assets/images/nexaspin_crypto_logo_1785439134632.jpg";

interface NexaSpinLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showSubtitle?: boolean;
  className?: string;
}

export const NexaSpinLogo: React.FC<NexaSpinLogoProps> = ({
  size = "md",
  showSubtitle = true,
  className = "",
}) => {
  const sizeMap = {
    sm: { img: "h-7 w-7", text: "text-base", sub: "text-[8px]" },
    md: { img: "h-9 w-9", text: "text-lg sm:text-xl", sub: "text-[9px]" },
    lg: { img: "h-12 w-12", text: "text-2xl sm:text-3xl", sub: "text-[10px]" },
    xl: { img: "h-16 w-16 sm:h-20 sm:w-20", text: "text-4xl sm:text-5xl", sub: "text-xs" },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Glowing Hexagonal Crypto Logo Emblem */}
      <div className="relative group cursor-pointer">
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-emerald-400 to-amber-500 rounded-2xl blur-md opacity-75 group-hover:opacity-100 transition-all duration-500 animate-pulse" />
        <div className={`relative ${currentSize.img} rounded-2xl bg-slate-950 border border-cyan-400/40 p-0.5 overflow-hidden shadow-lg flex items-center justify-center shrink-0`}>
          <img
            src={logoImg}
            alt="NexaSpin Crypto Casino Logo"
            className="w-full h-full object-cover rounded-xl group-hover:scale-110 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col">
        <div className={`font-black tracking-tight font-sans flex items-center gap-0.5 ${currentSize.text} leading-none`}>
          <span className="bg-gradient-to-r from-cyan-300 via-teal-200 to-white bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]">
            NEXA
          </span>
          <span className="bg-gradient-to-r from-emerald-400 via-green-300 to-yellow-300 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(52,211,153,0.6)] font-extrabold">
            SPIN
          </span>
          <span className="text-amber-400 text-xs ml-0.5 animate-bounce">⚡</span>
        </div>

        {showSubtitle && (
          <span className={`font-mono ${currentSize.sub} font-bold uppercase tracking-[0.22em] text-cyan-400/90 flex items-center gap-1 mt-0.5`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
            Crypto Casino
          </span>
        )}
      </div>
    </div>
  );
};

export default NexaSpinLogo;
