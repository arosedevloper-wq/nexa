import React, { useState } from "react";
import { 
  X, Gamepad2, Radio, Sparkles, User, Gift, Wallet, Shield, 
  Scale, LogOut, Flame, Trophy, Coins, Bot, Search, ArrowUpRight, 
  ChevronRight, Volume2, VolumeX, CreditCard, History, CircleDollarSign,
  Crown, Zap, MessageSquare, Layers, Dices, Cpu, GraduationCap
} from "lucide-react";
import { GameType } from "../types";
import { casinoAudio } from "../lib/audioService";
import { motion, AnimatePresence } from "motion/react";
import AnimatedChipsCounter from "./AnimatedChipsCounter";
import NexaSpinLogo from "./NexaSpinLogo";

interface MobileAppDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: GameType;
  onChangeTab: (tab: GameType) => void;
  currentUser: {
    name: string;
    role: string;
    email?: string;
  } | null;
  chips: number;
  bonusBalance: number;
  onOpenDeposit: () => void;
  onLogout: () => void;
  isSfxMuted: boolean;
  onToggleSfx: () => void;
  onOpenFloorRules: () => void;
  onOpenVanceAi?: () => void;
  unreadChatCount?: number;
}

export const MobileAppDrawer: React.FC<MobileAppDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onChangeTab,
  currentUser,
  chips,
  bonusBalance,
  onOpenDeposit,
  onLogout,
  isSfxMuted,
  onToggleSfx,
  onOpenFloorRules,
  onOpenVanceAi,
  unreadChatCount = 0,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSelectNav = (tab: GameType, scrollTo?: string) => {
    casinoAudio.playClick();
    onChangeTab(tab);
    onClose();
    if (scrollTo) {
      setTimeout(() => {
        const el = document.getElementById(scrollTo);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    }
  };

  const navCategories = [
    {
      title: "GAMING LOBBY",
      items: [
        { id: "lobby" as GameType, label: "All Games Lobby", icon: Gamepad2, badge: "POPULAR", badgeColor: "bg-[#00FF66] text-black" },
        { id: "live" as GameType, label: "Live Casino Floor", icon: Radio, badge: "LIVE 24/7", badgeColor: "bg-rose-500 text-white animate-pulse" },
        { id: "slots" as GameType, label: "Cyber Slots & Megaways", icon: Dices, badge: "HOT", badgeColor: "bg-amber-400 text-black" },
        { id: "crash" as GameType, label: "Crash & Turbos", icon: Zap, badge: "HIGH-X", badgeColor: "bg-cyan-400 text-black" },
        { id: "baccarat" as GameType, label: "Luxury Baccarat & Cards", icon: Layers, badge: "VIP", badgeColor: "bg-purple-500 text-white" },
        { id: "plinko" as GameType, label: "Original Arcade Games", icon: Cpu },
      ]
    },
    {
      title: "VIP REWARDS & JACKPOTS",
      items: [
        { id: "megawin" as GameType, label: "VIP $10,000 Mega Vault", icon: Trophy, badge: "JACKPOT", badgeColor: "bg-gradient-to-r from-amber-400 to-yellow-300 text-black font-extrabold" },
        { id: "dailyspin" as GameType, label: "Daily Fortune Wheel", icon: Gift, badge: "FREE", badgeColor: "bg-emerald-400 text-black font-bold" },
        { id: "quests" as GameType, label: "Daily Quests & Milestones", icon: Flame, badge: "REWARDS", badgeColor: "bg-fuchsia-500 text-white" },
      ]
    },
    {
      title: "BANKING & PORTFOLIO",
      items: [
        { id: "stats" as GameType, label: "Deposit & Withdraw Funds", icon: CircleDollarSign, badge: "INSTANT", badgeColor: "bg-emerald-500 text-white" },
        { id: "stats" as GameType, label: "My Stats & Ledger", icon: History },
      ]
    },
    {
      title: "GUIDES & ACADEMY",
      items: [
        { id: "lobby" as GameType, label: "Player Academy & Rules", icon: GraduationCap, badge: "GUIDE", badgeColor: "bg-amber-400 text-black font-bold", scrollTo: "player-academy-and-guide" },
      ]
    }
  ];

  // Filter items if searching
  const filteredCategories = navCategories.map(cat => ({
    ...cat,
    items: cat.items.filter(item => item.label.toLowerCase().includes(searchTerm.toLowerCase()))
  })).filter(cat => cat.items.length > 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          
          {/* Dark Glass Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
          />

          {/* Drawer Body Sliding in from Left */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="relative w-[88%] max-w-[340px] h-full bg-[#080B10] border-r border-amber-500/20 text-white shadow-[10px_0_40px_rgba(0,0,0,0.9)] flex flex-col z-10 overflow-hidden"
          >
            {/* Top Header Banner */}
            <div className="p-4 bg-gradient-to-b from-[#111622] to-[#080B10] border-b border-white/10 flex items-center justify-between shrink-0">
              <NexaSpinLogo size="sm" showSubtitle={true} />
              <button
                onClick={() => {
                  casinoAudio.playClick();
                  onClose();
                }}
                className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white active:scale-90 transition-all"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Content Container */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 custom-scrollbar">
              
              {/* User Profile Card */}
              {currentUser ? (
                <div className="p-3.5 bg-gradient-to-r from-[#121824] to-[#1a2334] border border-amber-500/30 rounded-2xl shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
                    <Crown className="h-20 w-20 text-amber-400" />
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-emerald-400 p-0.5 shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                        <div className="h-full w-full bg-slate-950 rounded-[14px] flex items-center justify-center text-amber-300 font-extrabold text-lg">
                          {currentUser.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <span className="absolute -bottom-1 -right-1 bg-[#00FF66] text-slate-950 font-black text-[8px] px-1 py-0.2 rounded-full border border-black uppercase">
                        VIP
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-extrabold text-sm text-white truncate">{currentUser.name}</h4>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md capitalize shrink-0 font-bold">
                          {currentUser.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono truncate">{currentUser.email || "High Roller Account"}</p>
                    </div>
                  </div>

                  {/* Balance Bar inside Profile Card */}
                  <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[9px] font-mono text-slate-400 block uppercase font-bold">Available Chips</span>
                      <div className="flex items-center gap-1">
                        <span className="text-amber-400 font-black text-sm">$</span>
                        <AnimatedChipsCounter value={chips} className="text-amber-300 font-mono font-black text-sm" />
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        casinoAudio.playChipClink();
                        onOpenDeposit();
                        onClose();
                      }}
                      className="bg-gradient-to-r from-[#00FF66] to-emerald-400 hover:from-[#00e65c] hover:to-emerald-500 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,255,102,0.4)] active:scale-95 transition-all"
                    >
                      <CreditCard className="h-3.5 w-3.5 stroke-[2.5]" />
                      Deposit
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl text-center">
                  <p className="text-xs text-slate-300 font-bold mb-2">Access Royal Neon Features</p>
                  <button
                    onClick={() => handleSelectNav("lobby")}
                    className="w-full py-2 bg-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md active:scale-95 transition-all"
                  >
                    LOGIN / REGISTER
                  </button>
                </div>
              )}

              {/* Quick Vance AI Host Action Banner */}
              <button
                onClick={() => {
                  if (onOpenVanceAi) onOpenVanceAi();
                  onClose();
                }}
                className="w-full p-3 bg-gradient-to-r from-purple-950/60 via-indigo-950/60 to-purple-900/60 border border-purple-500/40 rounded-2xl flex items-center justify-between gap-2 group active:scale-98 transition-all shadow-[0_0_20px_rgba(168,85,247,0.15)]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 group-hover:scale-110 transition-transform">
                    <Bot className="h-5 w-5 text-purple-300 animate-pulse" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-black text-purple-200 block leading-tight">Ask Vegas Vance AI</span>
                    <span className="text-[10px] text-purple-300/80 font-mono">24/7 VIP Concierge & Chips Host</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* In-Menu Game Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search games or features..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#111622] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-[#00FF66]/50 transition-colors"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Categorized Nav Lists */}
              <div className="space-y-4">
                {filteredCategories.map((cat, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="text-[9px] font-mono font-black tracking-widest text-slate-500 px-2 uppercase">
                      {cat.title}
                    </div>
                    <div className="space-y-0.5">
                      {cat.items.map((item) => {
                        const IconComponent = item.icon;
                        const isActive = activeTab === item.id;

                        return (
                          <button
                            key={item.id + item.label}
                            onClick={() => handleSelectNav(item.id, (item as any).scrollTo)}
                            className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between transition-all active:scale-98 ${
                              isActive
                                ? "bg-gradient-to-r from-[#00FF66]/20 to-emerald-500/10 border border-[#00FF66]/40 text-[#00FF66] font-bold"
                                : "text-slate-300 hover:bg-white/5 hover:text-white border border-transparent"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <IconComponent className={`h-4 w-4 ${isActive ? "text-[#00FF66]" : "text-slate-400"}`} />
                              <span className="text-xs font-medium">{item.label}</span>
                            </div>

                            {item.badge && (
                              <span className={`text-[8px] px-1.5 py-0.5 rounded-md ${item.badgeColor || "bg-slate-800 text-slate-300"}`}>
                                {item.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Staff / Admin Dedicated Section if Authorized */}
                {currentUser && ["admin", "subadmin", "agent"].includes(currentUser.role) && (
                  <div className="space-y-1 pt-2 border-t border-white/10">
                    <div className="text-[9px] font-mono font-black tracking-widest text-amber-400 px-2 uppercase flex items-center gap-1">
                      <Shield className="h-3 w-3" /> STAFF AUTHORITY CONTROL
                    </div>
                    
                    {currentUser.role === "admin" && (
                      <button
                        onClick={() => handleSelectNav("admin")}
                        className="w-full px-3 py-2.5 rounded-xl flex items-center justify-between bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold hover:bg-amber-500/20 transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <Crown className="h-4 w-4 text-amber-400" />
                          <span className="text-xs">Master Admin Panel</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-amber-400" />
                      </button>
                    )}

                    {(currentUser.role === "subadmin" || currentUser.role === "admin") && (
                      <button
                        onClick={() => handleSelectNav("admin")}
                        className="w-full px-3 py-2.5 rounded-xl flex items-center justify-between bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold hover:bg-cyan-500/20 transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <Shield className="h-4 w-4 text-cyan-400" />
                          <span className="text-xs">Sub-Admin Terminal</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-cyan-400" />
                      </button>
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* Bottom Fixed Footer inside Drawer */}
            <div className="p-3 bg-[#0B0E14] border-t border-white/10 shrink-0 space-y-2">
              
              <div className="flex items-center justify-between gap-2">
                {/* Audio SFX Toggle */}
                <button
                  onClick={onToggleSfx}
                  className="flex-1 py-2 px-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center gap-1.5 text-xs text-slate-300 hover:text-white transition-all active:scale-95"
                >
                  {!isSfxMuted ? (
                    <>
                      <Volume2 className="h-3.5 w-3.5 text-[#00FF66]" />
                      <span>Sound ON</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="h-3.5 w-3.5 text-slate-500" />
                      <span>Sound OFF</span>
                    </>
                  )}
                </button>

                {/* Floor Rules */}
                <button
                  onClick={() => {
                    onOpenFloorRules();
                    onClose();
                  }}
                  className="flex-1 py-2 px-3 bg-amber-950/30 border border-amber-500/30 rounded-xl flex items-center justify-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-all active:scale-95"
                >
                  <Scale className="h-3.5 w-3.5" />
                  <span>Rules</span>
                </button>
              </div>

              {/* Logout Button */}
              {currentUser && (
                <button
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="w-full py-2 px-3 bg-rose-950/40 border border-rose-500/30 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-rose-400 hover:bg-rose-900/40 transition-all active:scale-95"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out Account</span>
                </button>
              )}

              <div className="text-center pt-1">
                <p className="text-[9px] font-mono text-slate-600">Royal Neon Mobile v3.5 • High-Roller Engine</p>
              </div>

            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
