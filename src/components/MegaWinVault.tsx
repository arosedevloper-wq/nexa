import React, { useState, useEffect } from "react";
import { Lock, Unlock, Sparkles, Trophy, Key, Timer, AlertTriangle, CheckCircle, Coins, ShieldCheck, ChevronDown, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../lib/audioService";

interface MegaWinVaultProps {
  currentUser: {
    role: "player" | "admin" | "agent";
    name: string;
    email?: string;
    phoneNumber?: string;
  };
  megaWinState: {
    selectedWinnerEmail: string;
    selectedWinnerName: string;
    selectedWinnerPhone: string;
    windowStart: number;
    windowEnd: number;
    isClaimed: boolean;
    amount: number;
    playedPlayers?: string[];
  } | null;
  onClaimMegaWin: (amount: number, isWin: boolean) => void;
  onAddAuditLog: (msg: string, type: "info" | "warning" | "success" | "danger") => void;
  chips: number;
  onReRollMegaWinner?: () => void;
}

export default function MegaWinVault({ currentUser, megaWinState, onClaimMegaWin, onAddAuditLog, chips, onReRollMegaWinner }: MegaWinVaultProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isOpening, setIsOpening] = useState(false);
  const [openingStep, setOpeningStep] = useState(0); // 0: locked, 1: cracking, 2: success, 3: failed
  const [timeRemaining, setTimeRemaining] = useState("");
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorType, setErrorType] = useState<"already_played" | "insufficient_chips" | "">("");

  const dismissTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleDismissWidget = (e: React.MouseEvent) => {
    e.stopPropagation();
    casinoAudio.playClick();
    setIsVisible(false);
    setIsExpanded(false);

    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
    }

    // Automatically reappear after 5 minutes (300,000 ms)
    dismissTimerRef.current = setTimeout(() => {
      setIsVisible(true);
    }, 5 * 60 * 1000);
  };

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, []);

  // Update Countdown Timer
  useEffect(() => {
    if (!megaWinState) return;

    const updateTimer = () => {
      const now = Date.now();
      const diff = megaWinState.windowEnd - now;

      if (diff <= 0) {
        setTimeRemaining("00:00:00");
        return;
      }

      const days = Math.floor(diff / (24 * 3600 * 1000));
      const hours = Math.floor((diff % (24 * 3600 * 1000)) / (3600 * 1000));
      const minutes = Math.floor((diff % (3600 * 1000)) / (60 * 1000));
      const seconds = Math.floor((diff % (60 * 1000)) / 1000);

      const daysStr = days > 0 ? `${days}d ` : "";
      setTimeRemaining(`${daysStr}${hours.toString().padStart(2, "0")}h ${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [megaWinState]);

  if (!megaWinState) {
    return (
      <div className="p-6 rounded-3xl border border-slate-900 bg-slate-950/80 backdrop-blur-xl text-center">
        <p className="text-slate-400 font-mono text-xs">Initializing VIP Mega Win Vault...</p>
      </div>
    );
  }

  const userEmail = currentUser.email?.toLowerCase() || "anonymous";
  const hasPlayed = currentUser.role !== "admin" && (megaWinState.playedPlayers || []).includes(userEmail);

  // Guarantee No Winners (House Win Bias / 0.00% Probability)
  const isWinnerMatched = () => {
    // Winning probability for $10,000 grand prize strictly set to 0.00% so no player can unlock full vault payout
    return false;
  };

  const isEligible = isWinnerMatched();

  // Anonymize the designated winner's name for privacy/mystery (e.g. "Research Niam" -> "Re***ch Ni**m")
  const getAnonymizedName = (name: string) => {
    if (!name) return "VIP Guest";
    const parts = name.split(" ");
    return parts.map(part => {
      if (part.length <= 2) return part;
      return part.charAt(0) + part.charAt(1) + "*".repeat(part.length - 4 > 0 ? part.length - 4 : 2) + part.charAt(part.length - 1);
    }).join(" ");
  };

  const handleAttemptUnlock = () => {
    casinoAudio.playClick();

    // 1. Check if they have enough chips (minimum $100 balance/bet)
    if (chips < 100) {
      setErrorType("insufficient_chips");
      setShowErrorModal(true);
      return;
    }

    // Trigger lock-cracking simulation
    setIsOpening(true);
    setOpeningStep(1);
    onAddAuditLog(`MEGA WIN: Player ${currentUser.name} initiated Vault Codebreaker with a $100 entry bet.`, "info");
    
    // Play tick/cracking sound
    let ticks = 0;
    const playCrackTick = () => {
      if (ticks < 8) {
        casinoAudio.playWheelSpin(0.1);
        ticks++;
        setTimeout(playCrackTick, 350);
      }
    };
    playCrackTick();

    setTimeout(() => {
      const isWinner = isWinnerMatched(); // Always false (0.00% probability)
      if (isWinner) {
        setOpeningStep(2);
        casinoAudio.playVaultUnlock();
        setTimeout(() => casinoAudio.playMegaWin(), 300);
        onClaimMegaWin(10000, true); // Maximum reward pool of $10,000
      } else {
        setOpeningStep(3);
        casinoAudio.playLose();
        onClaimMegaWin(10000, false);
      }
    }, 3000);
  };

  return (
    <div id="mega-win-vault-container">
      {/* Floating Toggle Button on Main Screen (Centered at the top) */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="fixed top-24 sm:top-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 sm:gap-2 max-w-[98vw] sm:max-w-max px-1"
          >
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                casinoAudio.playClick();
                setIsExpanded(prev => !prev);
              }}
              className="flex items-center gap-2 sm:gap-3 px-2.5 py-1.5 sm:px-5 sm:py-2.5 rounded-full bg-gradient-to-r from-amber-950/95 via-slate-950/95 to-fuchsia-950/95 border-2 border-amber-400/80 hover:border-amber-300 hover:bg-amber-950/80 shadow-[0_0_25px_rgba(245,158,11,0.5)] hover:shadow-[0_0_40px_rgba(245,158,11,0.8)] transition-all duration-300 cursor-pointer text-left select-none group relative overflow-hidden backdrop-blur-2xl"
            >
              {/* Animated golden shine beam */}
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-yellow-400/20 to-fuchsia-500/10 animate-pulse pointer-events-none" />

              {/* Glowing Icon Container */}
              <div className="p-1.5 sm:p-2 rounded-full bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.7)] shrink-0 group-hover:scale-110 transition-transform">
                <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-slate-950 font-black animate-bounce" />
              </div>

              {/* Text Block with tight mobile layout */}
              <div className="flex flex-col justify-center min-w-0">
                <div className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap">
                  <span className="font-mono text-[11px] xs:text-xs sm:text-sm font-black text-amber-300 tracking-tight drop-shadow-[0_0_8px_rgba(245,158,11,0.7)] flex items-center gap-1">
                    $10,000 VIP VAULT
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-amber-400/20 border border-amber-400/40 text-[9px] font-mono font-black text-amber-200 uppercase tracking-widest hidden xs:inline-block">
                    HOT
                  </span>
                </div>
                <div className="flex items-center gap-1 font-mono text-[9px] sm:text-[10px] font-extrabold text-slate-300 whitespace-nowrap">
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${megaWinState?.isClaimed ? "bg-emerald-400" : "bg-amber-400 animate-ping"}`} />
                  <span className="text-slate-400">STATUS:</span>
                  <span className={megaWinState?.isClaimed ? "text-emerald-400 font-black" : "text-amber-300 font-black animate-pulse"}>
                    {megaWinState?.isClaimed ? "UNLOCKED" : "READY TO CRACK"}
                  </span>
                </div>
              </div>

              {/* Chevron Arrow Indicator */}
              <div className={`p-1 sm:p-1.5 rounded-full bg-slate-900/90 border border-amber-500/40 text-amber-400 group-hover:bg-amber-900/50 transition-all duration-300 shrink-0 ml-0.5 ${isExpanded ? "bg-amber-950 text-amber-300" : ""}`}>
                <ChevronDown className={`h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
              </div>
            </motion.button>

            {/* Cross (X) Close Button to hide for 5 minutes */}
            <button
              type="button"
              onClick={handleDismissWidget}
              className="p-2 sm:p-2.5 rounded-full bg-slate-950/95 border-2 border-amber-500/60 hover:border-red-500/80 hover:bg-red-950/80 text-slate-400 hover:text-red-300 shadow-[0_0_15px_rgba(0,0,0,0.8)] transition-all duration-200 cursor-pointer backdrop-blur-2xl shrink-0 group active:scale-95"
              title="Close Vault widget (reappears in 5 minutes)"
            >
              <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded Floating Vault Modal / Drawer Card */}
      <AnimatePresence>
        {isExpanded && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
            {/* Backdrop click to collapse */}
            <div 
              className="absolute inset-0" 
              onClick={() => {
                casinoAudio.playClick();
                setIsExpanded(false);
              }} 
            />

            <motion.div
              initial={{ scale: 0.9, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 30, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-fuchsia-500/70 bg-gradient-to-b from-slate-950 via-slate-950/98 to-slate-900/95 backdrop-blur-2xl relative shadow-[0_0_80px_rgba(217,70,239,0.5)] p-5 sm:p-7 space-y-6 z-10"
            >
              {/* Top Glow Accent Line */}
              <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-fuchsia-600 via-indigo-500 to-cyan-500 shadow-[0_2px_15px_rgba(217,70,239,0.6)] rounded-t-3xl" />

              {/* Modal Header Bar with Close Button */}
              <div className="flex items-center justify-between border-b border-fuchsia-500/20 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-fuchsia-950/80 border border-fuchsia-500/50 text-fuchsia-400 shadow-[0_0_12px_rgba(217,70,239,0.4)]">
                    <Trophy className="h-6 w-6 text-fuchsia-400 animate-bounce" />
                  </div>
                  <div>
                    <h3 className="font-mono text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2 drop-shadow-[0_0_12px_rgba(217,70,239,0.6)]">
                      🏆 $10,000 VIP Vault
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] uppercase tracking-widest text-fuchsia-400 font-extrabold font-mono animate-pulse">🔥 GRAND JACKPOT ACTIVE</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-[11px] font-mono text-slate-300 font-bold">
                        Vault Status: <span className={megaWinState.isClaimed ? "text-emerald-400" : "text-fuchsia-300"}>{megaWinState.isClaimed ? "UNLOCKED" : "SECURED"}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    casinoAudio.playClick();
                    setIsExpanded(false);
                  }}
                  className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-fuchsia-500/50 hover:bg-fuchsia-950/50 transition-all cursor-pointer"
                  title="Close Vault"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Main Vault Content Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Left Side: Vault Visual Representation */}
                <div className="md:col-span-5 flex flex-col items-center justify-center p-3 relative">
                  <div className="relative h-44 w-44 rounded-full bg-slate-950 border-4 border-fuchsia-500/30 flex items-center justify-center shadow-[inset_0_0_30px_rgba(217,70,239,0.2)] overflow-hidden">
                    {/* Outer radial gears with glowing rotation */}
                    <motion.div
                      animate={isOpening && openingStep === 1 ? { rotate: 360 } : { rotate: [0, 360] }}
                      transition={isOpening && openingStep === 1 ? { repeat: Infinity, duration: 1.5, ease: "linear" } : { repeat: Infinity, duration: 25, ease: "linear" }}
                      className="absolute inset-2 border-4 border-dashed border-fuchsia-500/20 rounded-full opacity-60"
                    />

                    <AnimatePresence mode="wait">
                      {megaWinState.isClaimed || (isOpening && openingStep === 2) ? (
                        <motion.div
                          key="unlocked"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          className="flex flex-col items-center gap-1.5 z-10"
                        >
                          <Unlock className="h-16 w-16 text-emerald-400 filter drop-shadow-[0_0_15px_rgba(52,211,153,0.5)] animate-bounce" />
                          <span className="text-[10px] font-mono font-bold text-emerald-400 tracking-wider">UNLOCKED</span>
                        </motion.div>
                      ) : isOpening && openingStep === 1 ? (
                        <motion.div
                          key="cracking"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          className="flex flex-col items-center gap-2 z-10 text-center"
                        >
                          <Key className="h-14 w-14 text-amber-400 animate-spin" />
                          <span className="text-[9px] font-mono font-bold text-amber-400 tracking-wider animate-pulse uppercase">CRACKING CODE...</span>
                        </motion.div>
                      ) : isOpening && openingStep === 3 ? (
                        <motion.div
                          key="failed"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          className="flex flex-col items-center gap-1.5 z-10"
                        >
                          <Lock className="h-16 w-16 text-red-500 filter drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
                          <span className="text-[10px] font-mono font-bold text-red-500 tracking-wider">FAILED</span>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="locked"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          className="flex flex-col items-center gap-1.5 z-10"
                        >
                          <Lock className="h-16 w-16 text-fuchsia-500 animate-pulse filter drop-shadow-[0_0_15px_rgba(217,70,239,0.5)]" />
                          <span className="text-[10px] font-mono font-bold text-fuchsia-400 tracking-wider animate-pulse">SECURED</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Right Side: Ledger and Rules Info */}
                <div className="md:col-span-7 space-y-4 font-mono">
                  <div className="bg-slate-950/60 border border-fuchsia-500/20 rounded-2xl p-4 space-y-3 shadow-inner">
                    {/* Countdown / Availability status */}
                    <div className="flex items-center justify-between border-b border-white/[0.04] pb-2 text-xs">
                      <span className="text-slate-400 flex items-center gap-1.5 font-bold"><Timer className="h-4.5 w-4.5 text-fuchsia-400 shrink-0 animate-pulse" /> Vault Availability:</span>
                      <span className="text-fuchsia-400 font-extrabold uppercase animate-pulse">ALWAYS OPEN / PLAY ANYTIME</span>
                    </div>

                    {/* Selected Winner info */}
                    <div className="flex items-center justify-between border-b border-white/[0.04] pb-2 text-xs">
                      <span className="text-slate-500 flex items-center gap-1.5"><ShieldCheck className="h-4.5 w-4.5 text-slate-400 shrink-0" /> Target Secret Winner:</span>
                      <span className="font-bold text-emerald-400 animate-pulse">
                        ANY ACTIVE PLAYER
                      </span>
                    </div>

                    {/* Claim Status */}
                    <div className="flex items-center justify-between border-b border-white/[0.04] pb-2 text-xs">
                      <span className="text-slate-500 flex items-center gap-1.5"><Coins className="h-4.5 w-4.5 text-slate-400 shrink-0" /> Prize Pool:</span>
                      <span className="text-amber-400 font-extrabold text-sm drop-shadow-[0_0_10px_rgba(245,158,11,0.4)]">$10,000 USDT</span>
                    </div>

                    {/* High-tech Cyber Odds and Analytics Graphics */}
                    <div className="pt-2 border-t border-white/[0.04] space-y-4">
                      <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-950/80 p-3.5 rounded-xl border border-fuchsia-500/10">
                        {/* 10x10 Probability Grid Visualizer */}
                        <div className="flex flex-col items-center shrink-0">
                          <div className="grid grid-cols-10 gap-1 p-1.5 bg-slate-900/90 rounded-lg border border-slate-800">
                            {Array.from({ length: 100 }).map((_, i) => (
                              <div key={i} className="relative h-2 w-2">
                                <span className="block h-2 w-2 rounded-full bg-slate-800/80 hover:bg-slate-750 transition-colors" />
                              </div>
                            ))}
                          </div>
                          <span className="text-[9px] font-bold text-red-400 mt-1.5 tracking-wider uppercase">Vault Locked (0.00%)</span>
                        </div>

                        {/* Digital Spec Sheet */}
                        <div className="flex-1 w-full space-y-2.5 text-[10px] text-slate-400">
                          <div className="flex justify-between items-center border-b border-white/[0.02] pb-1">
                            <span className="text-slate-500 flex items-center gap-1">⚡ WIN PROBABILITY:</span>
                            <span className="text-rose-400 font-black bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-500/20">0.00% LOCKED</span>
                          </div>
                          <div className="flex justify-between items-center border-b border-white/[0.02] pb-1">
                            <span className="text-slate-500 flex items-center gap-1">💸 ATTEMPT COST:</span>
                            <span className="text-amber-400 font-bold">$100 USDT</span>
                          </div>
                          <div className="flex justify-between items-center border-b border-white/[0.02] pb-1">
                            <span className="text-slate-500 flex items-center gap-1">🏆 REWARD VALUE:</span>
                            <span className="text-emerald-400 font-black tracking-tight drop-shadow-[0_0_4px_rgba(52,211,153,0.3)]">$10,000 USDT</span>
                          </div>
                          <div className="flex justify-between items-center pb-0.5">
                            <span className="text-slate-500 flex items-center gap-1">🔒 REQ BALANCE:</span>
                            <span className="text-cyan-400 font-bold uppercase tracking-wider">MIN $100 DEPOSIT</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Large Glowing & Alive Lucrative Claim/Trigger Button Wrapper */}
                  <div className="relative group/btn w-full">
                    {/* Pulsing Outer Neon Aura Glow */}
                    {chips >= 100 && !isOpening && (
                      <>
                        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-amber-400 via-fuchsia-500 to-yellow-400 opacity-80 blur-lg group-hover/btn:opacity-100 transition duration-500 animate-pulse group-hover/btn:duration-200" />
                        <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-yellow-300 via-pink-600 to-amber-500 opacity-40 blur-xl animate-ping pointer-events-none" style={{ animationDuration: '3s' }} />
                      </>
                    )}

                    <motion.button
                      whileHover={chips >= 100 && !isOpening ? { scale: 1.025, y: -1 } : {}}
                      whileTap={chips >= 100 && !isOpening ? { scale: 0.96 } : {}}
                      onClick={handleAttemptUnlock}
                      disabled={isOpening}
                      className={`relative overflow-hidden w-full py-4.5 px-6 rounded-2xl font-mono text-sm sm:text-base font-black tracking-wider transition-all cursor-pointer shadow-2xl flex flex-col sm:flex-row items-center justify-center gap-3 border-2 ${
                        isOpening
                          ? "bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed"
                          : chips < 100
                          ? "bg-slate-900/80 text-red-400 border-red-900/60 cursor-not-allowed"
                          : "bg-gradient-to-r from-amber-500 via-rose-600 to-amber-400 bg-[length:200%_100%] hover:bg-right transition-all duration-500 text-white border-amber-200 shadow-[0_0_50px_rgba(245,158,11,0.8),0_0_70px_rgba(225,29,72,0.6)] hover:shadow-[0_0_70px_rgba(245,158,11,1),0_0_90px_rgba(225,29,72,0.9)]"
                      }`}
                    >
                      {/* Animated Shimmering Ray Sweep */}
                      {chips >= 100 && !isOpening && (
                        <div className="absolute inset-0 w-2/3 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12 animate-[shimmer_2s_infinite] pointer-events-none" />
                      )}

                      {isOpening ? (
                        <span className="flex items-center gap-2 text-amber-300 animate-pulse">
                          <Key className="h-5 w-5 text-amber-400 animate-spin" />
                          Decrypting Vault Security Protocols...
                        </span>
                      ) : chips < 100 ? (
                        <span className="flex items-center gap-2">
                          <Coins className="h-5 w-5 text-red-400" />
                          NEED $100 BALANCE/DEPOSIT TO PLAY
                        </span>
                      ) : (
                        <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left z-10 w-full justify-center">
                          {/* Left Badge: Prize Pool */}
                          <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-amber-300/60 shadow-inner shrink-0 group-hover/btn:border-amber-200">
                            <Trophy className="h-5 w-5 text-amber-300 animate-bounce filter drop-shadow-[0_0_10px_rgba(252,211,77,0.9)]" />
                            <div className="flex flex-col items-start leading-none">
                              <span className="text-[9px] font-extrabold text-amber-300/80 tracking-widest uppercase">GRAND JACKPOT</span>
                              <span className="text-amber-200 text-xs font-black tracking-wider drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]">
                                $10,000 USDT
                              </span>
                            </div>
                          </div>

                          {/* Center Text Action */}
                          <div className="flex items-center gap-2.5 text-white font-black tracking-widest text-base sm:text-lg drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
                            <Sparkles className="h-5 w-5 text-amber-300 animate-spin" style={{ animationDuration: '4s' }} />
                            <span className="bg-gradient-to-r from-white via-amber-100 to-yellow-200 bg-clip-text text-transparent filter drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
                              UNLOCK JACKPOT
                            </span>
                            <span className="text-amber-300 text-xs font-extrabold bg-black/40 px-2.5 py-1 rounded-lg border border-amber-300/50 shadow-inner">
                              $100
                            </span>
                          </div>
                        </div>
                      )}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Modal overlay upon successful cracking */}
      <AnimatePresence>
        {isOpening && openingStep === 2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/98 flex flex-col items-center justify-center p-6 text-center z-40 rounded-3xl border border-fuchsia-500/30"
          >
            <div className="max-w-xs flex flex-col items-center">
              <Trophy className="h-12 w-12 text-yellow-400 animate-bounce mb-3 filter drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
              <span className="text-[9px] uppercase font-mono tracking-widest text-slate-500 font-bold">VIP CODEBREAKER UNLOCKED</span>
              <div className="mt-2 text-2xl font-mono font-black text-emerald-400 tracking-tight drop-shadow-[0_0_12px_rgba(52,211,153,0.35)]">
                $10,000 CLAIMED!
              </div>
              <p className="text-xs text-slate-400 font-mono mt-3 leading-relaxed">
                The vault has cracked open successfully! Exactly $10,000 USDT has been added to your bank balance and logged onto the high-roller ledger.
              </p>

              <button
                onClick={() => {
                  casinoAudio.playClick();
                  setIsOpening(false);
                  setOpeningStep(0);
                  if (onReRollMegaWinner) {
                    onReRollMegaWinner(); // instantly re-roll and reset the claimed state
                  }
                }}
                className="mt-6 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 font-mono text-xs font-black tracking-widest text-white rounded-xl cursor-pointer active:scale-95 transition-all shadow-[0_0_10px_rgba(79,70,229,0.3)]"
              >
                DISMISS & COLLECT
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Failure Modal overlay upon failed decryption */}
      <AnimatePresence>
        {isOpening && openingStep === 3 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/98 flex flex-col items-center justify-center p-6 text-center z-40 rounded-3xl border border-red-500/30"
          >
            <div className="max-w-xs flex flex-col items-center">
              <AlertTriangle className="h-12 w-12 text-red-500 animate-bounce mb-3 filter drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
              <span className="text-[9px] uppercase font-mono tracking-widest text-slate-500 font-bold">DECRYPTION FAILED</span>
              <div className="mt-2 text-xl font-mono font-black text-red-500 tracking-tight drop-shadow-[0_0_12px_rgba(239,68,68,0.35)]">
                $100 FORFEITED
              </div>
              <p className="text-xs text-slate-400 font-mono mt-3 leading-relaxed">
                The encryption security protocols re-aligned dynamically upon intrusion detection. Decryption failed. $100 has been transferred to the house pool reserves.
              </p>
              <p className="text-[10px] text-fuchsia-400 font-mono mt-2 font-bold animate-pulse">
                *Requires minimum $100 balance/deposit to re-attempt!*
              </p>

              <button
                onClick={() => {
                  casinoAudio.playClick();
                  setIsOpening(false);
                  setOpeningStep(0);
                }}
                className="mt-6 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 font-mono text-xs font-black tracking-widest text-slate-300 rounded-xl cursor-pointer active:scale-95 transition-all"
              >
                TRY AGAIN
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Informative Error Alerts */}
      <AnimatePresence>
        {showErrorModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              className="max-w-md w-full bg-slate-950 border-2 border-red-500/30 rounded-3xl p-6 text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none" />

              <AlertTriangle className="h-14 w-14 text-red-500 mx-auto mb-4 filter drop-shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-bounce" />
              
              <h4 className="font-mono text-lg font-black text-white uppercase tracking-tight">MINIMUM $100 REQUIREMENT</h4>
              <div className="mt-4 bg-slate-900 border border-slate-850 p-4 rounded-2xl text-left text-xs font-mono text-slate-400 space-y-2.5">
                <p>
                  ⚠️ **INSUFFICIENT FUNDS:** You need at least **$100 USDT** in your deposit/chips balance to play the Codecracker Vault.
                </p>
                <p>
                  • **Your Balance:** ${chips.toLocaleString()} USDT
                </p>
                <p>
                  • **Required Balance:** $100 USDT
                </p>
                <p className="text-slate-500">
                  *Make a quick deposit or play standard games in the catalog to build up a minimum balance of $100 USDT to attempt cracking the VIP vault.*
                </p>
              </div>

              <button
                onClick={() => {
                  casinoAudio.playClick();
                  setShowErrorModal(false);
                }}
                className="mt-6 w-full py-2.5 bg-red-950/60 hover:bg-red-900/50 text-red-400 border border-red-500/30 font-mono text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                DISMISS
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
