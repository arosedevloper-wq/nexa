import React from "react";
import { Gamepad2, Radio, User, Plus, Gift, Menu } from "lucide-react";
import { GameType } from "../types";
import { casinoAudio } from "../lib/audioService";
import { motion } from "motion/react";

interface MobileBottomNavProps {
  activeTab: GameType;
  onChangeTab: (tab: GameType) => void;
  onOpenDeposit: () => void;
  onOpenMenu: () => void;
  unreadChatCount?: number;
  bonusAmount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onChangeTab,
  onOpenDeposit,
  onOpenMenu,
  unreadChatCount = 0,
}) => {
  const isLiveActive = [
    "live", 
    "crash", 
    "plinko", 
    "mines", 
    "baccarat", 
    "hilo", 
    "roulette", 
    "blackjack", 
    "videopoker",
    "lightning_roulette",
    "crazy_time",
    "live_blackjack",
    "mega_ball",
    "baccarat_squeeze"
  ].includes(activeTab);
  
  const isBonusActive = ["dailyspin", "quests", "megawin"].includes(activeTab);
  const isProfileActive = ["stats", "admin"].includes(activeTab);

  const handleTabClick = (tab: GameType) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(10);
      } catch (_) {}
    }
    casinoAudio.playClick();
    onChangeTab(tab);
  };

  const handleDepositClick = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(14);
      } catch (_) {}
    }
    casinoAudio.playChipClink();
    onOpenDeposit();
  };

  const handleMenuClick = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(10);
      } catch (_) {}
    }
    casinoAudio.playClick();
    onOpenMenu();
  };

  return (
    <nav aria-label="Mobile Navigation" className="fixed bottom-0 inset-x-0 z-50 lg:hidden pointer-events-auto select-none">
      {/* Top subtle glow accent bar */}
      <div className="h-[1.5px] w-full bg-gradient-to-r from-transparent via-amber-400/50 via-emerald-400/60 to-transparent" />
      
      <div className="bg-[#070A10]/95 backdrop-blur-3xl border-t border-white/[0.09] px-2 py-1.5 pb-safe flex items-center justify-around shadow-[0_-16px_48px_rgba(0,0,0,0.98)]">
        
        {/* Item 1: MENU DRAWER TRIGGER */}
        <button
          onClick={handleMenuClick}
          className="flex flex-col items-center justify-center py-1 px-1.5 min-h-[44px] min-w-[44px] rounded-xl text-slate-400 hover:text-amber-300 active:scale-90 transition-all touch-manipulation cursor-pointer"
          aria-label="Open Casino Menu"
        >
          <Menu className="h-5 w-5 text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
          <span className="text-[10px] font-mono font-bold tracking-tight mt-0.5 text-amber-300">Menu</span>
        </button>

        {/* Item 2: Lobby */}
        <button
          onClick={() => handleTabClick("lobby")}
          className={`flex flex-col items-center justify-center py-1 px-1.5 min-h-[44px] min-w-[44px] rounded-xl transition-all active:scale-90 relative cursor-pointer touch-manipulation ${
            activeTab === "lobby"
              ? "text-[#00FF66]"
              : "text-slate-400 hover:text-slate-200"
          }`}
          aria-label="Casino Lobby"
        >
          {activeTab === "lobby" && (
            <motion.div
              layoutId="mobileNavActiveGlow"
              className="absolute -top-1.5 inset-x-2 h-1 bg-[#00FF66] rounded-full shadow-[0_0_12px_#00FF66]"
            />
          )}
          <Gamepad2 className={`h-5 w-5 ${activeTab === "lobby" ? "text-[#00FF66] drop-shadow-[0_0_10px_rgba(0,255,102,0.9)]" : ""}`} />
          <span className="text-[10px] font-mono font-bold tracking-tight mt-0.5">Lobby</span>
        </button>

        {/* Item 3: LIVE CASINO */}
        <button
          onClick={() => handleTabClick("live")}
          className={`flex flex-col items-center justify-center py-1 px-1.5 min-h-[44px] min-w-[44px] rounded-xl transition-all active:scale-90 relative cursor-pointer touch-manipulation ${
            isLiveActive
              ? "text-rose-400 font-extrabold"
              : "text-slate-400 hover:text-slate-200"
          }`}
          aria-label="Live Casino Tables"
        >
          {isLiveActive && (
            <motion.div
              layoutId="mobileNavActiveGlow"
              className="absolute -top-1.5 inset-x-2 h-1 bg-rose-500 rounded-full shadow-[0_0_12px_#f43f5e]"
            />
          )}
          <div className="relative">
            <Radio className={`h-5 w-5 ${isLiveActive ? "text-rose-500 drop-shadow-[0_0_12px_rgba(244,63,94,0.9)]" : "text-rose-400/80"}`} />
            <span className="absolute -top-1 -right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-[0_0_6px_#f43f5e]" />
            </span>
          </div>
          <span className={`text-[10px] font-mono font-black tracking-wider uppercase mt-0.5 ${isLiveActive ? "text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.6)]" : "text-slate-300"}`}>
            LIVE
          </span>
        </button>

        {/* Item 4: QUICK DEPOSIT BUTTON */}
        <button
          onClick={handleDepositClick}
          className="flex flex-col items-center justify-center py-1 px-1.5 min-h-[44px] min-w-[44px] rounded-xl transition-all active:scale-90 relative cursor-pointer touch-manipulation text-[#00FF66] hover:text-emerald-300"
          aria-label="Quick Deposit"
        >
          <div className="relative flex items-center justify-center">
            <div className="h-5 w-5 rounded-lg bg-gradient-to-tr from-[#00FF66] via-emerald-400 to-amber-300 text-slate-950 flex items-center justify-center shadow-[0_0_14px_rgba(0,255,102,0.7)]">
              <Plus className="h-3.5 w-3.5 stroke-[3]" />
            </div>
          </div>
          <span className="text-[10px] font-mono font-black tracking-tight mt-0.5 text-[#00FF66] drop-shadow-[0_0_6px_rgba(0,255,102,0.5)]">
            Deposit
          </span>
        </button>

        {/* Item 5: BONUS / REWARDS */}
        <button
          onClick={() => handleTabClick("dailyspin")}
          className={`flex flex-col items-center justify-center py-1 px-1.5 min-h-[44px] min-w-[44px] rounded-xl transition-all active:scale-90 relative cursor-pointer touch-manipulation ${
            isBonusActive
              ? "text-[#FFD700]"
              : "text-slate-400 hover:text-slate-200"
          }`}
          aria-label="Free Daily Bonuses"
        >
          {isBonusActive && (
            <motion.div
              layoutId="mobileNavActiveGlow"
              className="absolute -top-1.5 inset-x-2 h-1 bg-[#FFD700] rounded-full shadow-[0_0_12px_#FFD700]"
            />
          )}
          <div className="relative">
            <Gift className={`h-5 w-5 ${isBonusActive ? "text-[#FFD700] drop-shadow-[0_0_10px_rgba(255,215,0,0.9)]" : "text-amber-400"}`} />
            <span className="absolute -top-1.5 -right-2 px-1 py-0.2 bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black text-[7px] rounded-full animate-bounce shadow-sm">
              FREE
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold tracking-tight mt-0.5">Bonus</span>
        </button>

        {/* Item 6: PORTFOLIO / PROFILE */}
        <button
          onClick={() => handleTabClick("stats")}
          className={`flex flex-col items-center justify-center py-1 px-1.5 min-h-[44px] min-w-[44px] rounded-xl transition-all active:scale-90 relative cursor-pointer touch-manipulation ${
            isProfileActive
              ? "text-[#00FF66]"
              : "text-slate-400 hover:text-slate-200"
          }`}
          aria-label="Wallet & Stats"
        >
          {isProfileActive && (
            <motion.div
              layoutId="mobileNavActiveGlow"
              className="absolute -top-1.5 inset-x-2 h-1 bg-[#00FF66] rounded-full shadow-[0_0_12px_#00FF66]"
            />
          )}
          <div className="relative">
            <User className={`h-5 w-5 ${isProfileActive ? "text-[#00FF66] drop-shadow-[0_0_10px_rgba(0,255,102,0.9)]" : ""}`} />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-rose-500 rounded-full animate-ping border border-black" />
            )}
          </div>
          <span className="text-[10px] font-mono font-bold tracking-tight mt-0.5">Wallet</span>
        </button>

      </div>
    </nav>
  );
};
