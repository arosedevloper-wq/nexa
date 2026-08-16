import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Gift,
  Trophy,
  Crown,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Zap,
  Flame,
  ShieldCheck,
  CheckCircle2,
  Coins,
  Users,
  Timer,
  Check,
  Copy
} from "lucide-react";
import { casinoAudio } from "../lib/audioService";
import { GameType } from "../types";

export interface HeroSlide {
  id: string;
  badge: string;
  badgeStyle: string;
  badgeIcon: React.ReactNode;
  headline: string;
  description: string;
  subHighlight: string;
  ctaText: string;
  bgImage: string;
  accentGlow: string;
  targetTab: GameType | "banking" | "dailyspin" | "megawin" | "highroller";
  promoCode?: string;
  claimedCount: number;
  timerBadge: string;
  neonTheme: {
    pulseAnim: string;
    borderGlow: string;
    outerShadow: string;
    topBarGradient: string;
    ambientBloom: string;
    accentColor: string;
    buttonGrad: string;
    playShadow: string;
    pillBg: string;
  };
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: "loss_recovery",
    badge: "🛡️ LOSS RECOVERY",
    badgeStyle: "bg-blue-500/20 text-blue-300 border-blue-400/60 shadow-[0_0_15px_rgba(59,130,246,0.5)]",
    badgeIcon: <ShieldCheck className="h-4 w-4 text-blue-300 animate-pulse" />,
    headline: "20% CASHBACK ON LOSSES",
    description: "Play a minimum of $70 on any game today and get 20% back credited directly to your balance.",
    subHighlight: "Automatic Daily Settlement • Zero Minimum Wager",
    ctaText: "CLAIM CASHBACK",
    bgImage: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=1200&q=80",
    accentGlow: "from-blue-600/35 via-indigo-500/15 to-transparent",
    targetTab: "stats",
    promoCode: "RECOVER20",
    claimedCount: 2419,
    timerBadge: "DAILY MIDNIGHT PAYOUT",
    neonTheme: {
      pulseAnim: "animate-neon-pulse-blue",
      borderGlow: "border-blue-500/80",
      outerShadow: "shadow-[0_0_35px_rgba(59,130,246,0.35)]",
      topBarGradient: "from-blue-500 via-indigo-300 to-sky-400",
      ambientBloom: "from-blue-600/25 via-indigo-600/15 to-sky-500/20",
      accentColor: "text-blue-300",
      buttonGrad: "from-blue-500 via-indigo-400 to-sky-400",
      playShadow: "shadow-[0_0_25px_rgba(59,130,246,0.8)]",
      pillBg: "bg-blue-950/80 border-blue-500/40 text-blue-300"
    }
  },
  {
    id: "tiered_deposit",
    badge: "⚡ TIERED DEPOSIT PACK",
    badgeStyle: "bg-amber-500/20 text-amber-300 border-amber-400/60 shadow-[0_0_15px_rgba(245,158,11,0.5)]",
    badgeIcon: <Zap className="h-4 w-4 text-amber-300 animate-pulse" />,
    headline: "CRYPTO INSTANT DEPOSIT AND GET UP-TO 400% INSTANT DEPOSIT BONUS",
    description: "CRYPTO INSTANT DEPOSIT AND GET UP-TO 400% INSTANT DEPOSIT BONUS, 200% MATCH ON 1ST DEPOSIT + 300% MATCH ON 2ND DEPOSIT + 400% MATCH ON 3RD DEPOSIT",
    subHighlight: "1st Deposit: 200% Match • 2nd Deposit: 300% Match • 3rd Deposit: 400% Match",
    ctaText: "DEPOSIT & BOOST",
    bgImage: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
    accentGlow: "from-amber-500/35 via-yellow-500/15 to-transparent",
    targetTab: "stats",
    promoCode: "BOOST400",
    claimedCount: 4892,
    timerBadge: "INSTANT AUTOMATIC MATCH",
    neonTheme: {
      pulseAnim: "animate-gold-pulse-glow",
      borderGlow: "border-amber-400/80",
      outerShadow: "shadow-[0_0_35px_rgba(245,158,11,0.35)]",
      topBarGradient: "from-amber-500 via-yellow-300 to-amber-500",
      ambientBloom: "from-amber-500/25 via-yellow-500/15 to-rose-500/20",
      accentColor: "text-amber-300",
      buttonGrad: "from-amber-400 via-yellow-300 to-amber-500",
      playShadow: "shadow-[0_0_25px_rgba(245,158,11,0.85)]",
      pillBg: "bg-amber-950/80 border-amber-500/40 text-amber-300"
    }
  },
  {
    id: "vip_vault",
    badge: "👑 VIP EXCLUSIVE",
    badgeStyle: "bg-emerald-500/20 text-emerald-300 border-emerald-400/60 shadow-[0_0_15px_rgba(16,185,129,0.5)]",
    badgeIcon: <Crown className="h-4 w-4 text-emerald-300 animate-pulse" />,
    headline: "$10,000 VIP VAULT UNLOCK",
    description: "Crack the vault door for an exclusive chance to instant-win up to $10,000 USDT in grand rewards.",
    subHighlight: "Zero Wagering Requirements • Instant Vault Key",
    ctaText: "UNLOCK VAULT",
    bgImage: "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=1200&q=80",
    accentGlow: "from-emerald-500/35 via-teal-500/15 to-transparent",
    targetTab: "megawin",
    promoCode: "VIPVAULT",
    claimedCount: 1208,
    timerBadge: "TIER 5+ VIP EXCLUSIVE",
    neonTheme: {
      pulseAnim: "animate-neon-pulse",
      borderGlow: "border-[#00FF66]/80",
      outerShadow: "shadow-[0_0_35px_rgba(0,255,102,0.35)]",
      topBarGradient: "from-emerald-500 via-[#00FF66] to-teal-400",
      ambientBloom: "from-emerald-500/25 via-[#00FF66]/15 to-teal-500/20",
      accentColor: "text-[#00FF66]",
      buttonGrad: "from-[#00FF66] via-emerald-400 to-teal-500",
      playShadow: "shadow-[0_0_25px_rgba(0,255,102,0.85)]",
      pillBg: "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
    }
  },
  {
    id: "high_roller_race",
    badge: "🏆 LEADERBOARD RACE",
    badgeStyle: "bg-rose-500/20 text-rose-300 border-rose-400/60 shadow-[0_0_15px_rgba(244,63,94,0.5)]",
    badgeIcon: <Trophy className="h-4 w-4 text-rose-400 animate-bounce" />,
    headline: "$15,000 SPEED TOURNAMENT",
    description: "Compete on the high-roller leaderboard and claim the grand prize pool.",
    subHighlight: "Live Real-Time Leaderboard • Grand Cash Prize Pool",
    ctaText: "JOIN RACE",
    bgImage: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1200&q=80",
    accentGlow: "from-rose-500/35 via-pink-500/15 to-transparent",
    targetTab: "live",
    claimedCount: 3105,
    timerBadge: "LIVE RACE IN PROGRESS",
    neonTheme: {
      pulseAnim: "animate-neon-pulse-rose",
      borderGlow: "border-rose-400/80",
      outerShadow: "shadow-[0_0_35px_rgba(244,63,94,0.35)]",
      topBarGradient: "from-rose-500 via-amber-400 to-rose-500",
      ambientBloom: "from-rose-500/25 via-pink-500/15 to-amber-500/20",
      accentColor: "text-rose-300",
      buttonGrad: "from-rose-500 via-amber-400 to-yellow-400",
      playShadow: "shadow-[0_0_25px_rgba(244,63,94,0.85)]",
      pillBg: "bg-rose-950/80 border-rose-500/40 text-rose-300"
    }
  },
  {
    id: "daily_spin_wheel",
    badge: "🎁 DAILY REWARD",
    badgeStyle: "bg-purple-500/20 text-purple-300 border-purple-400/60 shadow-[0_0_15px_rgba(168,85,247,0.5)]",
    badgeIcon: <Gift className="h-4 w-4 text-purple-300 animate-bounce" />,
    headline: "FREE DAILY LUCKY WHEEL SPIN",
    description: "Log in daily to spin the fortune wheel for guaranteed bonus chips and free spins.",
    subHighlight: "100% Guaranteed Prize • Resets Daily at Midnight",
    ctaText: "SPIN NOW",
    bgImage: "https://images.unsplash.com/photo-1511193311914-0346f16efe90?auto=format&fit=crop&w=1200&q=80",
    accentGlow: "from-purple-500/35 via-fuchsia-500/15 to-transparent",
    targetTab: "dailyspin",
    claimedCount: 6740,
    timerBadge: "FREE DAILY ENTRY",
    neonTheme: {
      pulseAnim: "animate-neon-pulse-purple",
      borderGlow: "border-purple-400/80",
      outerShadow: "shadow-[0_0_35px_rgba(168,85,247,0.35)]",
      topBarGradient: "from-purple-500 via-fuchsia-400 to-purple-500",
      ambientBloom: "from-purple-500/25 via-fuchsia-500/15 to-pink-500/20",
      accentColor: "text-purple-300",
      buttonGrad: "from-purple-500 via-fuchsia-400 to-pink-500",
      playShadow: "shadow-[0_0_25px_rgba(168,85,247,0.85)]",
      pillBg: "bg-purple-950/80 border-purple-500/40 text-purple-300"
    }
  },
  {
    id: "affiliate_program",
    badge: "🤝 PARTNER & EARN",
    badgeStyle: "bg-cyan-500/20 text-cyan-300 border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.5)]",
    badgeIcon: <Users className="h-4 w-4 text-cyan-300 animate-pulse" />,
    headline: "20% AFFILIATE COMMISSIONS",
    description: "Invite friends and earn an instant 20% lifetime bonus on all partner activity and earnings.",
    subHighlight: "Instant Lifetime Commission • Direct Wallet Credit",
    ctaText: "GET REFERRAL LINK",
    bgImage: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1200&q=80",
    accentGlow: "from-cyan-500/35 via-teal-500/15 to-transparent",
    targetTab: "stats",
    promoCode: "PARTNER20",
    claimedCount: 1980,
    timerBadge: "LIFETIME RECURRING REVENUE",
    neonTheme: {
      pulseAnim: "animate-neon-pulse-cyan",
      borderGlow: "border-cyan-400/80",
      outerShadow: "shadow-[0_0_35px_rgba(6,182,212,0.35)]",
      topBarGradient: "from-cyan-500 via-sky-300 to-cyan-500",
      ambientBloom: "from-cyan-500/25 via-sky-500/15 to-teal-500/20",
      accentColor: "text-cyan-300",
      buttonGrad: "from-cyan-400 via-sky-300 to-blue-500",
      playShadow: "shadow-[0_0_25px_rgba(6,182,212,0.85)]",
      pillBg: "bg-cyan-950/80 border-cyan-500/40 text-cyan-300"
    }
  }
];

interface PromotionalHeroBannerProps {
  onSelectTab: (tab: GameType | "banking" | "dailyspin" | "megawin" | "highroller") => void;
  onOpenDepositModal?: () => void;
}

export const PromotionalHeroBanner: React.FC<PromotionalHeroBannerProps> = ({
  onSelectTab,
  onOpenDepositModal
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Touch Swipe Handling
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // Auto-sliding interval (every 5000ms / 5 seconds)
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const handlePrev = () => {
    casinoAudio.playClick();
    setCurrentIndex((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  };

  const handleNext = () => {
    casinoAudio.playClick();
    setCurrentIndex((prev) => (prev + 1) % HERO_SLIDES.length);
  };

  const handleAction = (slide: HeroSlide) => {
    casinoAudio.playWin();
    if (slide.targetTab === "stats" && onOpenDepositModal) {
      onOpenDepositModal();
    } else {
      onSelectTab(slide.targetTab);
    }
  };

  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    casinoAudio.playChipClink();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Touch swipe logic
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 50) {
      handleNext();
    } else if (distance < -50) {
      handlePrev();
    }
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  const currentSlide = HERO_SLIDES[currentIndex];

  return (
    <div className="relative w-full">
      {/* Outer Dynamic Glowing Neon Aura Bloom Backdrop */}
      <div
        className={`absolute -inset-1 sm:-inset-2 rounded-2xl sm:rounded-3xl bg-gradient-to-r ${currentSlide.neonTheme.ambientBloom} blur-2xl opacity-65 pointer-events-none transition-all duration-700 animate-banner-aura`}
      />

      {/* Main Unified Grand Hero Banner Container */}
      <section
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative w-full rounded-2xl sm:rounded-3xl border ${currentSlide.neonTheme.borderGlow} bg-[#090D14]/95 backdrop-blur-2xl ${currentSlide.neonTheme.pulseAnim} ${currentSlide.neonTheme.outerShadow} overflow-hidden select-none group transition-all duration-500`}
      >
        {/* Top Edge Neon Glowing Pulse Line */}
        <div
          className={`absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r ${currentSlide.neonTheme.topBarGradient} z-30 opacity-90 group-hover:opacity-100 transition-opacity`}
        />

        {/* Bottom Edge Subtle Laser Line */}
        <div
          className={`absolute bottom-0 left-0 right-0 h-[1.5px] bg-gradient-to-r ${currentSlide.neonTheme.topBarGradient} z-30 opacity-60`}
        />

        {/* Slide Image Background Container - Uniform Big Banner Height Across All Slides */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide.id}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="relative w-full h-[360px] xs:h-[380px] sm:h-[400px] md:h-[420px] lg:h-[440px] flex flex-col justify-between overflow-hidden laser-sheen-effect"
          >
            {/* Background Image with Dark Vignette & Dynamic Aura Color Gradients */}
            <div className="absolute inset-0 z-0">
              <img
                src={currentSlide.bgImage}
                alt={currentSlide.headline}
                className="w-full h-full object-cover filter brightness-[0.42] contrast-125 transition-transform duration-700 group-hover:scale-105"
              />
              {/* Dark & Neon Gradient Overlays */}
              <div className={`absolute inset-0 bg-gradient-to-r ${currentSlide.accentGlow} opacity-80`} />
              <div className="absolute inset-0 bg-gradient-to-t from-[#090D14] via-[#090D14]/70 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#090D14] via-[#090D14]/85 to-transparent" />
              
              {/* Radial Center Accent Glow */}
              <div className="absolute -top-16 -left-16 w-80 h-80 rounded-full bg-white/5 blur-3xl pointer-events-none" />
            </div>

            {/* Banner Main Content Layout - Fixed Spacing & Uniform Rhythm */}
            <div className="relative z-10 w-full px-4 sm:px-8 py-5 sm:py-6 flex flex-col justify-between h-full">
              
              {/* Top Row: Badge Overlay, Live Active Claimers, Live Status Indicator & Slide Counter */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Category / Campaign Badge */}
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] sm:text-xs font-mono font-black uppercase tracking-wider backdrop-blur-md ${currentSlide.badgeStyle}`}
                  >
                    {currentSlide.badgeIcon}
                    <span>{currentSlide.badge}</span>
                  </div>

                  {/* Live Active Claimers Count Badge */}
                  <div className="hidden xs:flex items-center gap-1.5 bg-black/85 backdrop-blur-md px-2.5 py-1 rounded-full border border-emerald-500/50 shadow-sm">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-mono font-extrabold text-emerald-300 tracking-wider">
                      {currentSlide.claimedCount.toLocaleString()} CLAIMED TODAY
                    </span>
                  </div>

                  {/* Timer / Settlement Badge */}
                  <div className="hidden md:flex items-center gap-1 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-amber-500/30 text-[9px] font-mono text-amber-300 font-bold">
                    <Timer className="h-3 w-3 text-amber-400 animate-pulse" />
                    <span>{currentSlide.timerBadge}</span>
                  </div>
                </div>

                {/* Slide Counter Indicator with Glowing Pill */}
                <div className="flex items-center gap-1.5 bg-black/75 border border-white/15 px-3 py-1 rounded-full text-[10px] sm:text-xs font-mono text-amber-300 font-black backdrop-blur-md shadow-sm">
                  <span className={`${currentSlide.neonTheme.accentColor} drop-shadow-[0_0_6px_currentColor]`}>
                    0{currentIndex + 1}
                  </span>
                  <span className="text-slate-600">/</span>
                  <span className="text-slate-400">0{HERO_SLIDES.length}</span>
                </div>
              </div>

              {/* Center Content: Headline, Description & Sub-highlight */}
              <div className="space-y-2 sm:space-y-3 max-w-3xl my-auto py-2">
                <motion.h2
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.35, delay: 0.08 }}
                  className="font-serif font-black text-xl xs:text-2xl sm:text-3xl md:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400 drop-shadow-[0_3px_12px_rgba(0,0,0,0.95)] tracking-tight leading-tight"
                >
                  {currentSlide.headline}
                </motion.h2>

                <motion.p
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.35, delay: 0.12 }}
                  className="text-xs sm:text-sm md:text-base font-semibold text-slate-100 drop-shadow max-w-2xl leading-relaxed"
                >
                  {currentSlide.description}
                </motion.p>

                <motion.div
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.35, delay: 0.16 }}
                  className="flex items-center gap-2 text-[10px] sm:text-xs font-mono text-amber-300 font-extrabold flex-wrap"
                >
                  <span className="flex items-center gap-1 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md">
                    <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0 animate-pulse" />
                    <span>{currentSlide.subHighlight}</span>
                  </span>
                </motion.div>
              </div>

              {/* Bottom Controls: Primary CTA, Promo Code Copy Button & Micro-Indicators */}
              <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
                <div className="flex items-center gap-3">
                  {/* High Impact Primary CTA Button with Neon Glow Aura & Pulsing Ring */}
                  <button
                    onClick={() => handleAction(currentSlide)}
                    className={`relative group px-5 py-2.5 sm:px-7 sm:py-3 rounded-xl bg-gradient-to-r ${currentSlide.neonTheme.buttonGrad} text-slate-950 font-mono text-xs sm:text-sm font-black tracking-wider uppercase ${currentSlide.neonTheme.playShadow} transition-all duration-200 cursor-pointer flex items-center gap-2 active:scale-95 shrink-0 overflow-hidden`}
                  >
                    <div className="absolute -inset-1 rounded-xl bg-white/25 animate-ping opacity-50 pointer-events-none" />
                    <span className="relative z-10">{currentSlide.ctaText}</span>
                    <ArrowRight className="h-4 w-4 relative z-10 transition-transform group-hover:translate-x-1" />
                  </button>

                  {/* Promo Code Copy Button with Interactive Feedback */}
                  {currentSlide.promoCode && (
                    <button
                      onClick={(e) => handleCopyCode(e, currentSlide.promoCode!)}
                      className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-slate-950/85 border border-amber-500/50 hover:border-amber-400 text-amber-300 font-mono text-xs font-bold transition-all cursor-pointer backdrop-blur-md active:scale-95 shadow-md"
                      title="Click to copy promo code"
                    >
                      <Coins className="h-3.5 w-3.5 text-amber-400" />
                      <span>{copiedCode === currentSlide.promoCode ? "COPIED!" : `CODE: ${currentSlide.promoCode}`}</span>
                      {copiedCode === currentSlide.promoCode ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-slate-400" />
                      )}
                    </button>
                  )}
                </div>

                {/* Mobile Active Claimers fallback */}
                <div className="flex xs:hidden items-center gap-1 bg-black/80 px-2 py-1 rounded-full text-[8px] font-mono text-emerald-400 font-bold border border-emerald-500/40">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{currentSlide.claimedCount.toLocaleString()} CLAIMED</span>
                </div>
              </div>

            </div>
          </motion.div>
        </AnimatePresence>

        {/* Left Navigation Arrow with Neon Hover Flare */}
        <button
          onClick={handlePrev}
          aria-label="Previous promotional slide"
          className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-amber-500/50 hover:border-amber-300 text-amber-300 hover:text-white transition-all cursor-pointer shadow-lg backdrop-blur-md active:scale-95 hidden sm:flex items-center justify-center opacity-85 hover:opacity-100 hover:shadow-[0_0_15px_rgba(245,158,11,0.5)] touch-manipulation"
          title="Previous Promo"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* Right Navigation Arrow with Neon Hover Flare */}
        <button
          onClick={handleNext}
          aria-label="Next promotional slide"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-amber-500/50 hover:border-amber-300 text-amber-300 hover:text-white transition-all cursor-pointer shadow-lg backdrop-blur-md active:scale-95 hidden sm:flex items-center justify-center opacity-85 hover:opacity-100 hover:shadow-[0_0_15px_rgba(245,158,11,0.5)] touch-manipulation"
          title="Next Promo"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Pagination Dots with Neon Glowing Active Indicator at Bottom Center */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 shadow-md">
          {HERO_SLIDES.map((slide, idx) => (
            <button
              key={slide.id}
              onClick={() => {
                casinoAudio.playClick();
                setCurrentIndex(idx);
              }}
              aria-label={`Go to slide ${idx + 1}`}
              className={`transition-all duration-300 rounded-full cursor-pointer touch-manipulation ${
                currentIndex === idx
                  ? `w-8 h-2.5 bg-gradient-to-r ${slide.neonTheme.buttonGrad} shadow-[0_0_12px_rgba(255,215,0,0.9)]`
                  : "w-2.5 h-2.5 bg-slate-600 hover:bg-slate-400"
              }`}
              title={`Slide ${idx + 1}: ${slide.headline}`}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

export default PromotionalHeroBanner;
