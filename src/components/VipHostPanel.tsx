import React, { useState, useEffect } from "react";
import { Sparkles, MessageSquareCode, HelpCircle, Loader, Landmark, Radio, Palette, Coins, Clock, Check, X, Shield } from "lucide-react";
import { CommentaryState, HostMood } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../lib/audioService";
import { getBankingRequests } from "../constants/bankingRequests";
import { getRegisteredPlayers } from "../constants/defaultPlayers";
import { processDepositApprovalForPlayer } from "../lib/depositBonusHelper";

interface VipHostPanelProps {
  commentaryState: CommentaryState;
  onAskAdvice: () => void;
  onTakeLoan: () => void;
  chips: number;
  loanCount: number;
  onUpdateChips?: (amount: number) => void;
}

const MOOD_THEMES: Record<HostMood, { bg: string; border: string; glow: string; text: string; label: string; emoji: string; color: string }> = {
  suave: {
    bg: "from-slate-950/90 via-indigo-950/30 to-fuchsia-950/30",
    border: "border-fuchsia-500/40 hover:border-fuchsia-400",
    glow: "glow-fuchsia",
    text: "text-fuchsia-400",
    label: "Suave VIP Mode",
    emoji: "🕶️",
    color: "#d946ef",
  },
  enthusiastic: {
    bg: "from-slate-950/90 via-emerald-950/30 to-slate-950/90",
    border: "border-emerald-500/40 hover:border-emerald-400",
    glow: "glow-emerald",
    text: "text-emerald-400",
    label: "High Hype Mode",
    emoji: "🔥",
    color: "#10b981",
  },
  encouraging: {
    bg: "from-slate-950/90 via-cyan-950/30 to-slate-950/90",
    border: "border-cyan-400/40 hover:border-cyan-300",
    glow: "glow-cyan",
    text: "text-cyan-400",
    label: "Golden Coach",
    emoji: "🤝",
    color: "#22d3ee",
  },
  dramatic: {
    bg: "from-slate-950/90 via-red-950/30 to-slate-950/90",
    border: "border-red-500/40 hover:border-red-400",
    glow: "glow-red",
    text: "text-red-400",
    label: "Showtime Drama",
    emoji: "🎭",
    color: "#ef4444",
  },
  playful: {
    bg: "from-slate-950/90 via-amber-950/30 to-slate-950/90",
    border: "border-amber-500/40 hover:border-amber-400",
    glow: "glow-gold",
    text: "text-amber-400",
    label: "Feeling Lucky",
    emoji: "🎰",
    color: "#f59e0b",
  },
};

export default function VipHostPanel({
  commentaryState,
  onAskAdvice,
  onTakeLoan,
  chips,
  loanCount,
  onUpdateChips,
}: VipHostPanelProps) {
  const { commentary, tips, hostMood, loading } = commentaryState;
  const theme = MOOD_THEMES[hostMood] || MOOD_THEMES.suave;
  const [showLoanConfirmation, setShowLoanConfirmation] = useState(false);
  const [cryptoDeposits, setCryptoDeposits] = useState<any[]>([]);
  const [adminSuccessMessage, setAdminSuccessMessage] = useState<string | null>(null);

  // Dynamic Theme state
  const [activeTheme, setActiveTheme] = useState<"neon" | "gold" | "midnight">(() => {
    const cached = localStorage.getItem("casino_theme");
    return (cached as "neon" | "gold" | "midnight") || "neon";
  });

  // Apply theme class on body & save to localStorage
  useEffect(() => {
    document.body.classList.remove("theme-neon", "theme-gold", "theme-midnight");
    document.body.classList.add(`theme-${activeTheme}`);
    localStorage.setItem("casino_theme", activeTheme);
  }, [activeTheme]);

  const loadCryptoDeposits = () => {
    const stored = localStorage.getItem("p2p_crypto_deposits");
    if (stored) {
      try {
        setCryptoDeposits(JSON.parse(stored));
      } catch (err) {
        console.error("Error loading crypto deposits", err);
      }
    } else {
      setCryptoDeposits([]);
    }
  };

  useEffect(() => {
    loadCryptoDeposits();
    const handleSync = () => {
      loadCryptoDeposits();
    };
    window.addEventListener("storage", handleSync);
    window.addEventListener("p2p_deposit_submitted", handleSync);
    const interval = setInterval(loadCryptoDeposits, 2000);
    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("p2p_deposit_submitted", handleSync);
      clearInterval(interval);
    };
  }, []);

  const handleApprove = (reqId: string, email: string, amountUSDT: number) => {
    casinoAudio.playWin();

    // 1. Update in p2p_crypto_deposits
    const storedCrypto = localStorage.getItem("p2p_crypto_deposits");
    let currentCryptoList: any[] = [];
    if (storedCrypto) {
      try {
        const list = JSON.parse(storedCrypto);
        currentCryptoList = list.map((item: any) => {
          if (item.id === reqId) {
            return { ...item, status: "approved" };
          }
          return item;
        });
        localStorage.setItem("p2p_crypto_deposits", JSON.stringify(currentCryptoList));
        setCryptoDeposits(currentCryptoList);
      } catch (e) {
        console.error(e);
      }
    }

    // 2. Update in casino_banking_requests_v1
    const listBanking = getBankingRequests();
    const updatedBankingList = listBanking.map((item: any) => {
      if (item.id === reqId) {
        return { ...item, status: "approved" };
      }
      return item;
    });
    localStorage.setItem("casino_banking_requests_v1", JSON.stringify(updatedBankingList));

    // 3. Credit player in registered_players_v1 & calculate deposit bonus / wagering requirement
    processDepositApprovalForPlayer(email, amountUSDT, reqId);

    // 4. Update currently logged in player's live chips
    const currentUserJSON = localStorage.getItem("casino_user");
    if (currentUserJSON) {
      try {
        const currentUserObj = JSON.parse(currentUserJSON);
        if (currentUserObj.email?.toLowerCase() === email.toLowerCase()) {
          // Add to live state
          if (onUpdateChips) {
            onUpdateChips(chips + amountUSDT);
          }
          // Also update casino_chips
          localStorage.setItem("casino_chips", String(chips + amountUSDT));
        }
      } catch (e) {
        console.error(e);
      }
    }

    // 5. Add custom transaction log to standard logs
    const storedTx = localStorage.getItem("casino_transactions");
    if (storedTx) {
      try {
        const transactionsList = JSON.parse(storedTx);
        const newTx = {
          id: Math.random().toString(36).substring(2, 9),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          amount: amountUSDT,
          description: `Approved Crypto Deposit (USDT TRC20)`,
          type: "reward",
        };
        localStorage.setItem("casino_transactions", JSON.stringify([newTx, ...transactionsList].slice(0, 50)));
      } catch (e) {}
    }

    // Dispatch storage events to refresh lists in real time
    window.dispatchEvent(new Event("storage"));
    setAdminSuccessMessage(`Approved $${amountUSDT.toLocaleString()} chips for player successfully!`);
    setTimeout(() => setAdminSuccessMessage(null), 3000);
  };

  const handleDecline = (reqId: string) => {
    casinoAudio.playLose();

    // 1. Update in p2p_crypto_deposits
    const storedCrypto = localStorage.getItem("p2p_crypto_deposits");
    let currentCryptoList: any[] = [];
    if (storedCrypto) {
      try {
        const list = JSON.parse(storedCrypto);
        currentCryptoList = list.map((item: any) => {
          if (item.id === reqId) {
            return { ...item, status: "declined" };
          }
          return item;
        });
        localStorage.setItem("p2p_crypto_deposits", JSON.stringify(currentCryptoList));
        setCryptoDeposits(currentCryptoList);
      } catch (e) {
        console.error(e);
      }
    }

    // 2. Update in casino_banking_requests_v1
    const listBanking = getBankingRequests();
    const updatedList = listBanking.map((item: any) => {
      if (item.id === reqId) {
        return { ...item, status: "rejected" };
      }
      return item;
    });
    localStorage.setItem("casino_banking_requests_v1", JSON.stringify(updatedList));

    window.dispatchEvent(new Event("storage"));
    setAdminSuccessMessage("P2P Crypto request has been declined.");
    setTimeout(() => setAdminSuccessMessage(null), 3000);
  };

  return (
    <div 
      id="vip-host-container" 
      className={`relative w-full overflow-hidden rounded-2xl border bg-gradient-to-br ${theme.bg} p-3.5 sm:p-5 md:p-6 backdrop-blur-xl transition-all duration-700 shadow-2xl animate-sweep ${theme.border} border-accent/40`}
    >
      {/* Absolute Ambient Orb */}
      <div 
        className="absolute -right-16 -top-16 h-36 w-36 rounded-full blur-3xl transition-all duration-700 opacity-20 pointer-events-none" 
        style={{ backgroundColor: "var(--theme-accent)" }}
      />
      <div 
        className="absolute -left-16 -bottom-16 h-36 w-36 rounded-full blur-3xl transition-all duration-700 opacity-10 pointer-events-none" 
        style={{ backgroundColor: "var(--theme-accent)" }}
      />
      
      <div className="flex flex-col md:flex-row gap-3.5 sm:gap-6 items-center md:items-start relative z-10">
        
        {/* Vegas Vance Avatar & Pulse Waves */}
        <div className="flex flex-col items-center shrink-0 w-full md:w-auto">
          <div className="relative">
            {/* Pulsing Back Glow Rings */}
            <div 
              className="absolute -inset-2 rounded-full opacity-20 blur-md animate-pulse" 
              style={{ background: `radial-gradient(circle, var(--theme-accent) 0%, transparent 70%)` }}
            />
            
            <div className="relative h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 rounded-full border-2 border-white/10 overflow-hidden bg-slate-950/95 p-1 flex items-center justify-center shadow-2xl transition-all duration-500">
              {/* Spinning Loader Overlay */}
              {loading ? (
                <span className="absolute inset-0 flex items-center justify-center bg-slate-950/80">
                  <Loader className="h-6 w-6 sm:h-8 sm:w-8 text-white animate-spin" />
                </span>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-white/5" />
              )}
              
              {/* Vance Avatar Icon */}
              <div className="text-2xl sm:text-3xl md:text-4xl select-none transform hover:scale-110 transition-transform duration-300">
                {theme.emoji}
              </div>

              {/* Status Indicator DOT */}
              <span className="absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 flex h-3 w-3 sm:h-4 sm:w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 sm:h-4 sm:w-4 bg-emerald-500 border-2 border-slate-950"></span>
              </span>
            </div>
          </div>

          <div className="mt-2 sm:mt-3.5 text-center">
            <h4 className="font-mono text-xs sm:text-sm font-bold tracking-wider text-white flex items-center gap-1.5 justify-center">
              VEGAS VANCE <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-accent animate-pulse" />
            </h4>
            <span className="inline-block text-[8px] sm:text-[9px] uppercase tracking-widest font-mono font-bold px-2 py-0.5 rounded-full bg-slate-900/90 border border-slate-800 mt-1 shadow text-accent">
              {theme.label}
            </span>
          </div>

          {/* Dynamic Speaking Audio Spectrum Waves */}
          {!loading && commentary && (
            <div className="flex items-center gap-0.5 mt-2 sm:mt-3 h-3 sm:h-4">
              {[0.7, 0.4, 0.9, 0.5, 0.8, 0.3, 0.6].map((multiplier, idx) => (
                <motion.span
                  key={idx}
                  className="w-[2.5px] sm:w-[3px] rounded-full"
                  style={{ backgroundColor: "var(--theme-accent)" }}
                  animate={{
                    height: ["3px", `${14 * multiplier}px`, "3px"],
                  }}
                  transition={{
                    duration: 0.8 + idx * 0.1,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
          )}

          {/* Dynamic Theme Accent Selector */}
          <div className="mt-3 sm:mt-5 w-full flex flex-col items-center border-t border-slate-900/60 pt-2.5 sm:pt-4">
            <span className="text-[8px] font-mono tracking-widest text-slate-500 uppercase font-black mb-1.5 flex items-center gap-1">
              <Palette className="h-2.5 w-2.5 text-accent animate-pulse" /> UI ACCENT
            </span>
            <div className="flex flex-row md:flex-col gap-1 w-full justify-center md:justify-start max-w-none md:max-w-[100px]">
              {[
                { id: "neon", label: "Neon", dot: "bg-fuchsia-500", glow: "shadow-fuchsia-500/20" },
                { id: "gold", label: "Gold", dot: "bg-amber-500", glow: "shadow-amber-500/20" },
                { id: "midnight", label: "Midnight", dot: "bg-cyan-500", glow: "shadow-cyan-500/20" }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    casinoAudio.playClick();
                    setActiveTheme(t.id as any);
                  }}
                  className={`px-2 py-1 rounded-lg font-mono text-[9px] font-bold transition-all cursor-pointer flex items-center gap-1 justify-center md:justify-start flex-1 md:flex-initial border ${
                    activeTheme === t.id
                      ? "bg-slate-950 text-white border-accent shadow-lg"
                      : "text-slate-500 hover:text-slate-300 hover:bg-slate-900/40 border-transparent"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${t.dot} ${t.glow} shadow-md shrink-0`} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Vance's Speech Bubble & Options */}
        <div className="flex-1 w-full flex flex-col justify-between min-h-0 sm:min-h-[170px]">
          
          <div className="relative rounded-xl sm:rounded-2xl border border-white/5 bg-slate-950/60 p-3 sm:p-5 shadow-inner backdrop-blur-md">
            
            {/* Header for bubble */}
            <div className="flex justify-between items-center mb-2 sm:mb-3 border-b border-slate-900/60 pb-1.5 sm:pb-2">
              <span className="text-[9px] sm:text-[10px] font-mono tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
                <Radio className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-rose-500 animate-pulse" /> Live Transmission
              </span>
              <div className="flex items-center gap-1">
                <span className="h-1 w-1 rounded-full bg-indigo-500 animate-pulse" style={{ backgroundColor: "var(--theme-accent)" }} />
                <span className="text-[8px] sm:text-[9px] font-mono text-slate-500">Host Audio Feed</span>
              </div>
            </div>

            {loading ? (
              <div className="space-y-2.5 py-1.5">
                <div className="h-2.5 sm:h-3 bg-slate-900 rounded-full animate-pulse w-5/6"></div>
                <div className="h-2.5 sm:h-3 bg-slate-900 rounded-full animate-pulse w-2/3"></div>
                <div className="h-2.5 sm:h-3 bg-slate-900 rounded-full animate-pulse w-3/4"></div>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-2.5 sm:space-y-3.5"
              >
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans tracking-wide">
                  "{commentary}"
                </p>
                
                {tips && (
                  <div className="bg-slate-950/40 rounded-xl p-2.5 sm:p-3 border border-white/[0.03] shadow-md">
                    <span className="text-[8.5px] sm:text-[9px] uppercase font-mono tracking-widest text-accent font-bold block mb-0.5 sm:mb-1">
                      💡 Vance's Insider Strategy
                    </span>
                    <p className="text-[10.5px] sm:text-[11.5px] text-slate-400 font-sans italic leading-normal">
                      {tips}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Action Row */}
          <div className="mt-3 sm:mt-4.5 flex flex-wrap gap-2 items-center justify-between">
            <button
              id="btn-ask-vance"
              onClick={onAskAdvice}
              disabled={loading}
              className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-[11px] sm:text-xs font-mono font-bold text-slate-200 rounded-xl transition-all duration-300 shadow-lg active:scale-95 cursor-pointer hover:shadow-accent/5 group"
            >
              <HelpCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-accent group-hover:rotate-12 transition-transform" />
              Ask Vance for Advice
            </button>

            {chips < 100 && (
              <button
                id="btn-loan-vance"
                onClick={() => setShowLoanConfirmation(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-red-500/20 to-amber-500/20 hover:from-red-500/30 hover:to-amber-500/30 border border-amber-500/40 hover:border-amber-400 text-[11px] sm:text-xs font-mono font-bold text-amber-300 rounded-xl transition-all duration-300 shadow-md animate-pulse cursor-pointer"
              >
                <Landmark className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-400" />
                Emergency Loan ($500)
              </button>
            )}
          </div>

        </div>
      </div>



      {/* Loan Confirmation Modal */}
      <AnimatePresence>
        {showLoanConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/98 flex flex-col justify-center items-center p-6 text-center z-50 rounded-2xl border border-amber-500/30 backdrop-blur-lg"
          >
            <div className="h-12 w-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-3">
              <Landmark className="h-6 w-6 text-amber-400 animate-bounce" />
            </div>
            <h5 className="font-mono text-lg text-white font-black tracking-tight">Vance's High Roller Ledger</h5>
            <p className="text-xs text-slate-300 max-w-sm mt-2 mb-5 leading-relaxed font-sans">
              Need a top-up, friend? Vance will credit <strong className="text-emerald-400">$500 chips</strong> directly to your balance right now. Repay it anytime from your bank ledger when you are winning!
              <span className="block text-slate-500 text-[10px] mt-1.5 font-mono">Total Loan Count: {loanCount}</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  onTakeLoan();
                  setShowLoanConfirmation(false);
                }}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-xs font-mono font-bold text-slate-950 rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                Sign & Credit $500
              </button>
              <button
                onClick={() => setShowLoanConfirmation(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-xs font-mono font-bold text-slate-400 hover:text-white rounded-xl border border-slate-800 transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
