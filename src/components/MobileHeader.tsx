import React from "react";
import { Plus, Volume2, VolumeX, Menu, Bot, Shield } from "lucide-react";
import AnimatedChipsCounter from "./AnimatedChipsCounter";
import { casinoAudio } from "../lib/audioService";
import NexaSpinLogo from "./NexaSpinLogo";

interface MobileHeaderProps {
  chips: number;
  bonusBalance: number;
  currentUser: {
    name: string;
    role: string;
  } | null;
  onOpenDeposit: () => void;
  onLogout: () => void;
  isSfxMuted: boolean;
  onToggleSfx: () => void;
  onOpenFloorRules?: () => void;
  onOpenMenu: () => void;
  onOpenVanceAi?: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  chips,
  bonusBalance = 0,
  onOpenDeposit,
  isSfxMuted,
  onToggleSfx,
  onOpenMenu,
  onOpenVanceAi,
}) => {
  return (
    <header className="block lg:hidden sticky top-0 z-40 bg-[#080B11]/95 backdrop-blur-2xl border-b border-white/[0.08] px-3 py-2 shadow-[0_4px_30px_rgba(0,0,0,0.9)] select-none scanline-effect">
      <div className="flex items-center justify-between gap-2">
        
        {/* Left: Hamburger Menu Trigger & Brand */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              casinoAudio.playClick();
              onOpenMenu();
            }}
            className="h-10 w-10 rounded-xl bg-slate-900/90 border border-amber-500/30 active:bg-amber-500/20 active:border-amber-500/50 text-amber-400 flex items-center justify-center transition-all active:scale-95 relative shadow-[0_0_12px_rgba(245,158,11,0.15)] touch-manipulation cursor-pointer"
            aria-label="Open App Menu"
          >
            <Menu className="h-5 w-5" />
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-[#00FF66] rounded-full animate-pulse border border-black shadow-[0_0_6px_#00FF66]" />
          </button>

          <div className="flex items-center shrink-0">
            <NexaSpinLogo size="sm" showSubtitle={false} />
          </div>

          {/* High-Tech Provably Fair Status Chip */}
          <div className="hidden xs:flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-[9px] font-mono text-emerald-400 font-bold">
            <Shield className="h-2.5 w-2.5 text-emerald-400 animate-pulse" />
            <span className="tracking-tight">100% FAIR</span>
          </div>
        </div>

        {/* Center/Right: Interactive Wallet & Quick Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          
          {/* Main Wallet Balance Pill with 1-Tap Deposit */}
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-[#0d131f] to-[#151c2c] border border-amber-500/40 rounded-xl px-2.5 py-1 shadow-[0_0_12px_rgba(245,158,11,0.15),inset_0_0_8px_rgba(0,0,0,0.8)]">
            <div className="flex items-center gap-0.5">
              <span className="text-amber-400 font-black text-xs drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]">$</span>
              <AnimatedChipsCounter value={chips} className="text-amber-300 font-mono font-black text-xs tracking-tight" />
            </div>

            <button
              onClick={() => {
                casinoAudio.playChipClink();
                onOpenDeposit();
              }}
              className="ml-0.5 bg-gradient-to-r from-[#00FF66] via-emerald-400 to-[#00FF66] hover:from-[#00e65c] hover:to-emerald-500 text-slate-950 font-black text-[9px] px-2 py-1 rounded-lg flex items-center gap-0.5 active:scale-95 transition-all shadow-[0_0_10px_rgba(0,255,102,0.4)] tracking-wider uppercase cursor-pointer touch-manipulation"
            >
              <Plus className="h-3 w-3 stroke-[3]" />
              <span className="font-mono text-[9px]">DEPOSIT</span>
            </button>
          </div>

          {/* Locked Bonus Pill */}
          {bonusBalance > 0 && (
            <div 
              onClick={() => {
                casinoAudio.playClick();
                onOpenDeposit();
              }}
              className="hidden sm:flex items-center gap-1 bg-amber-950/40 border border-amber-500/30 rounded-xl px-2 py-1 cursor-pointer hover:border-amber-400/60 transition-all"
              title="Locked Bonus Vault: Unlocks with 30x Real Play Wagering"
            >
              <span className="text-[10px]">🔒</span>
              <span className="text-[10px] font-mono font-bold text-amber-300">${bonusBalance.toFixed(0)}</span>
              <span className="text-[8px] font-mono font-black text-amber-500 uppercase">BONUS</span>
            </div>
          )}

          {/* Vance AI Host Quick Button */}
          {onOpenVanceAi && (
            <button
              onClick={() => {
                casinoAudio.playClick();
                onOpenVanceAi();
              }}
              className="h-9 w-9 rounded-xl bg-purple-950/80 border border-purple-500/50 text-purple-300 flex items-center justify-center active:scale-95 transition-all shadow-[0_0_12px_rgba(168,85,247,0.3)] relative cursor-pointer touch-manipulation"
              title="Vegas Vance AI Host"
              aria-label="Vegas Vance AI Host"
            >
              <Bot className="h-4 w-4 animate-pulse text-purple-300" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
              </span>
            </button>
          )}

          {/* Quick Sound Toggle */}
          <button
            onClick={onToggleSfx}
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-700/60 text-slate-400 hover:text-white transition-all active:scale-95 shadow-sm cursor-pointer touch-manipulation"
            title="Toggle SFX"
            aria-label="Toggle sound effects"
          >
            {!isSfxMuted ? (
              <Volume2 className="h-4 w-4 text-[#00FF66]" />
            ) : (
              <VolumeX className="h-4 w-4 text-slate-500" />
            )}
          </button>

        </div>

      </div>
    </header>
  );
};
