import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Gift,
  Zap,
  Trophy,
  Coins,
  ChevronLeft,
  ChevronRight,
  X,
  Copy,
  Check,
  Flame,
  ArrowRight,
  Sparkles,
  Tag,
  Maximize2,
  Crown,
  Dices,
  Swords
} from "lucide-react";
import { casinoAudio } from "../lib/audioService";
import { GameType } from "../types";

export interface PromoSlide {
  id: string;
  badge: string;
  badgeColor: string;
  icon: React.ReactNode;
  headline: string;
  highlightText: string;
  subtitle: string;
  imageUrl: string;
  code?: string;
  ctaText: string;
  targetTab: GameType | "banking" | "dailyspin" | "megawin" | "highroller";
  accentColor: string;
}

const PROMO_SLIDES: PromoSlide[] = [
  {
    id: "promo_1",
    badge: "CRYPTO BONUS",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    icon: <Gift className="h-3.5 w-3.5 text-amber-400 shrink-0 animate-bounce" />,
    headline: "CRYPTO INSTANT DEPOSIT AND GET UP-TO 400% INSTANT DEPOSIT BONUS",
    highlightText: "UP-TO 400% BONUS",
    subtitle: "CRYPTO INSTANT DEPOSIT AND GET UP-TO 400% INSTANT DEPOSIT BONUS, 200% MATCH ON 1ST DEPOSIT + 300% MATCH ON 2ND DEPOSIT + 400% MATCH ON 3RD DEPOSIT",
    imageUrl: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=200&q=80",
    code: "CRYPTO400",
    ctaText: "CLAIM BONUS",
    targetTab: "banking",
    accentColor: "from-amber-500/20 via-yellow-500/10 to-amber-600/20"
  },
  {
    id: "promo_2",
    badge: "HOT CONTEST",
    badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/40",
    icon: <Trophy className="h-3.5 w-3.5 text-rose-400 shrink-0 animate-pulse" />,
    headline: "$50,000 TURBO TOURNAMENT",
    highlightText: "PRIZE POOL ACTIVE",
    subtitle: "Rank #1 wins $12,500 Cash Jackpot • Live Leaderboard updates",
    imageUrl: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=200&q=80",
    ctaText: "ENTER CONTEST",
    targetTab: "megawin",
    accentColor: "from-rose-500/20 via-pink-500/10 to-rose-600/20"
  },
  {
    id: "promo_3",
    badge: "VIP CLUB",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    icon: <Zap className="h-3.5 w-3.5 text-emerald-400 shrink-0" />,
    headline: "15% VIP RAKEBACK DAILY CASHBACK",
    highlightText: "ON HIGH-ROLLER SLOTS",
    subtitle: "Automated midnight payout • Zero wagering requirement for cashout",
    imageUrl: "https://images.unsplash.com/photo-1596838132731-3301c3fd431b?auto=format&fit=crop&w=200&q=80",
    ctaText: "PLAY SLOTS",
    targetTab: "highroller",
    accentColor: "from-emerald-500/20 via-teal-500/10 to-emerald-600/20"
  },
  {
    id: "promo_4",
    badge: "CRYPTO BONUS",
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
    icon: <Coins className="h-3.5 w-3.5 text-cyan-400 shrink-0" />,
    headline: "10% EXTRA ON CRYPTO DEPOSITS",
    highlightText: "USDT, BTC & SOL",
    subtitle: "Instant P2P & On-Chain verification with zero processing fees",
    imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=200&q=80",
    code: "CRYPTO10",
    ctaText: "DEPOSIT CRYPTO",
    targetTab: "banking",
    accentColor: "from-cyan-500/20 via-blue-500/10 to-cyan-600/20"
  },
  {
    id: "promo_5",
    badge: "DAILY DROP",
    badgeColor: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40",
    icon: <Sparkles className="h-3.5 w-3.5 text-fuchsia-400 shrink-0" />,
    headline: "FREE DAILY LUCKY WHEEL SPIN",
    highlightText: "WIN UP TO $10,000 USDT",
    subtitle: "Resets every 24 hours • Guaranteed chip multipliers for all players",
    imageUrl: "https://images.unsplash.com/photo-1606168094336-48f205276929?auto=format&fit=crop&w=200&q=80",
    ctaText: "SPIN WHEEL",
    targetTab: "dailyspin",
    accentColor: "from-fuchsia-500/20 via-purple-500/10 to-fuchsia-600/20"
  },
  {
    id: "promo_6",
    badge: "PROGRESSIVE",
    badgeColor: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
    icon: <Crown className="h-3.5 w-3.5 text-yellow-400 shrink-0 animate-bounce" />,
    headline: "MEGA JACKPOT: $1.2M POOL",
    highlightText: "PROGRESSIVE VAULT",
    subtitle: "Every bet adds to the super pool • Crack the 6-digit vault combination",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&q=80",
    ctaText: "CRACK VAULT",
    targetTab: "megawin",
    accentColor: "from-yellow-500/20 via-amber-500/10 to-yellow-600/20"
  },
  {
    id: "promo_7",
    badge: "LIVE DEALER",
    badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
    icon: <Dices className="h-3.5 w-3.5 text-indigo-400 shrink-0" />,
    headline: "LIVE CASINO 10% SUNDAY REFUND",
    highlightText: "ALL TABLE GAMES",
    subtitle: "Blackjack, Roulette & Baccarat • Automatic weekly loss rebate",
    imageUrl: "https://images.unsplash.com/photo-1511193311914-0346f16efe90?auto=format&fit=crop&w=200&q=80",
    ctaText: "PLAY LIVE",
    targetTab: "live",
    accentColor: "from-indigo-500/20 via-purple-500/10 to-indigo-600/20"
  },
  {
    id: "promo_8",
    badge: "VIP ONLY",
    badgeColor: "bg-amber-400/20 text-amber-200 border-amber-400/40",
    icon: <Crown className="h-3.5 w-3.5 text-amber-300 shrink-0" />,
    headline: "HIGH ROLLER SUITE ACCESS",
    highlightText: "20x REWARDS MATCH",
    subtitle: "Exclusive $10k+ tables, instant personal concierge & priority cashouts",
    imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=200&q=80",
    code: "VIPSUITE",
    ctaText: "JOIN SUITE",
    targetTab: "highroller",
    accentColor: "from-amber-400/20 via-yellow-400/10 to-amber-500/20"
  },
  {
    id: "promo_9",
    badge: "NEW GAME",
    badgeColor: "bg-sky-500/20 text-sky-300 border-sky-500/40",
    icon: <Zap className="h-3.5 w-3.5 text-sky-400 shrink-0" />,
    headline: "NEW RELEASE: ZEUS MULTIPLIER",
    highlightText: "10,000x MAX WIN",
    subtitle: "Cascading reels & divine lightning bolts • Try with 20 free test rounds",
    imageUrl: "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=200&q=80",
    code: "ZEUS100",
    ctaText: "PLAY NOW",
    targetTab: "slots",
    accentColor: "from-sky-500/20 via-blue-500/10 to-sky-600/20"
  },
  {
    id: "promo_10",
    badge: "SPECIAL",
    badgeColor: "bg-red-500/20 text-red-300 border-red-500/40",
    icon: <Swords className="h-3.5 w-3.5 text-red-400 shrink-0 animate-pulse" />,
    headline: "WEEKEND DRAGON DEPOSIT RACE",
    highlightText: "DOUBLE VIP POINTS",
    subtitle: "Leaderboards reset every Sunday • Win custom NFT badges & cash rewards",
    imageUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=200&q=80",
    ctaText: "RACE NOW",
    targetTab: "megawin",
    accentColor: "from-red-500/20 via-orange-500/10 to-red-600/20"
  }
];

interface PromotionalBannerBarProps {
  onSelectTab: (tab: GameType | "banking" | "dailyspin" | "megawin" | "highroller") => void;
  onOpenPromoCodeDrawer?: (code?: string) => void;
}

export const PromotionalBannerBar: React.FC<PromotionalBannerBarProps> = ({
  onSelectTab,
  onOpenPromoCodeDrawer
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Auto rotate slides every 4 seconds unless paused
  useEffect(() => {
    if (isPaused || isDismissed) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % PROMO_SLIDES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isPaused, isDismissed]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    casinoAudio.playClick();
    setCurrentIndex((prev) => (prev - 1 + PROMO_SLIDES.length) % PROMO_SLIDES.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    casinoAudio.playClick();
    setCurrentIndex((prev) => (prev + 1) % PROMO_SLIDES.length);
  };

  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    casinoAudio.playChipClink();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleClaim = (promo: PromoSlide) => {
    casinoAudio.playWin();
    if (promo.code && onOpenPromoCodeDrawer) {
      onOpenPromoCodeDrawer(promo.code);
    }
    onSelectTab(promo.targetTab);
  };

  const activePromo = PROMO_SLIDES[currentIndex];

  if (isDismissed) {
    return (
      <div className="w-full bg-neutral-950/90 border-b border-amber-500/20 py-1 px-2 sm:px-3 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-1.5 text-amber-300 truncate min-w-0">
          <Flame className="h-3.5 w-3.5 text-amber-400 animate-pulse shrink-0" />
          <span className="font-bold truncate text-[10px] sm:text-xs">
            🎁 10 Live Casino Promotions Active (Slide {currentIndex + 1}/10)
          </span>
        </div>
        <button
          onClick={() => {
            casinoAudio.playClick();
            setIsDismissed(false);
          }}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-[10px] font-bold transition-all cursor-pointer shrink-0 ml-2 active:scale-95"
        >
          <Maximize2 className="h-3 w-3" />
          <span>SHOW PROMOS</span>
        </button>
      </div>
    );
  }

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative w-full z-20 overflow-hidden bg-gradient-to-r from-[#181102] via-[#0B0E14] to-[#181102] backdrop-blur-md border border-amber-500/50 rounded-2xl animate-gold-pulse-glow shadow-[0_4px_25px_rgba(245,158,11,0.25)] select-none laser-sheen-effect"
    >
      {/* Top glowing laser line effect */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-90" />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-1.5 sm:gap-3 min-h-[50px] sm:min-h-[56px]">
        
        {/* Navigation Left Button (Desktop/Tablet) */}
        <button
          onClick={handlePrev}
          className="hidden sm:flex p-1 sm:p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-amber-500/30 text-amber-400 hover:text-white transition-all cursor-pointer shrink-0 shadow-sm active:scale-95"
          title="Previous Promotion"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Dynamic Slide Content */}
        <div className="flex-1 overflow-hidden min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePromo.id}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex items-center justify-between gap-2 w-full"
            >
              {/* Left Column: Visual Thumbnail + Badge + Headline + Subtitle */}
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                {/* Visual Thumbnail Image */}
                <div className="relative shrink-0 group">
                  <img
                    src={activePromo.imageUrl}
                    alt={activePromo.headline}
                    onError={(e) => {
                      // Fallback if image fails to load
                      e.currentTarget.style.display = "none";
                    }}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover border border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.3)] shrink-0 transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* Subtle active pulse ring */}
                  <div className="absolute -inset-0.5 bg-amber-400/20 rounded-lg blur-[2px] pointer-events-none opacity-60 animate-pulse" />
                </div>

                {/* Badge Tag (Tablet & Desktop) */}
                <div
                  className={`hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-md border font-mono text-[9px] sm:text-[10px] font-black uppercase tracking-wider shrink-0 shadow-sm ${activePromo.badgeColor}`}
                >
                  {activePromo.icon}
                  <span>{activePromo.badge}</span>
                </div>

                {/* Text Block */}
                <div className="flex flex-col min-w-0 leading-tight">
                  <div className="flex items-center gap-1 sm:gap-1.5 truncate">
                    <span className="font-mono font-black text-[11px] sm:text-xs md:text-sm text-white tracking-tight truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                      {activePromo.headline}
                    </span>
                    <span className="font-mono font-black text-[11px] sm:text-xs md:text-sm text-amber-300 tracking-tight shrink-0 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]">
                      {activePromo.highlightText}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-slate-300/90 font-medium truncate max-w-xl hidden sm:block mt-0.5">
                    {activePromo.subtitle}
                  </p>
                </div>
              </div>

              {/* Right Column: Code & CTA Buttons */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Promo Code Chip (Desktop) */}
                {activePromo.code && (
                  <button
                    onClick={(e) => handleCopyCode(e, activePromo.code!)}
                    className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-950/80 border border-amber-500/30 hover:border-amber-400 text-amber-300 font-mono text-[10px] font-bold transition-all cursor-pointer shadow-inner active:scale-95"
                    title="Copy Promo Code"
                  >
                    <Tag className="h-3 w-3 text-amber-400" />
                    <span>{copiedCode === activePromo.code ? "COPIED!" : activePromo.code}</span>
                    {copiedCode === activePromo.code ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3 text-slate-400" />
                    )}
                  </button>
                )}

                {/* Primary Action Button */}
                <button
                  onClick={() => handleClaim(activePromo)}
                  className="group relative px-2.5 py-1.5 sm:px-4 sm:py-1.5 rounded-lg bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-mono text-[10px] sm:text-xs font-black tracking-wide shadow-[0_0_12px_rgba(245,158,11,0.4)] hover:shadow-[0_0_20px_rgba(245,158,11,0.7)] transition-all cursor-pointer flex items-center gap-1 shrink-0 active:scale-95"
                >
                  <span>{activePromo.ctaText}</span>
                  <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation Right Button (Desktop/Tablet) */}
        <button
          onClick={handleNext}
          className="hidden sm:flex p-1 sm:p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-amber-500/30 text-amber-400 hover:text-white transition-all cursor-pointer shrink-0 shadow-sm active:scale-95"
          title="Next Promotion"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Dismiss Button */}
        <button
          onClick={() => {
            casinoAudio.playClick();
            setIsDismissed(true);
          }}
          className="p-1 rounded-lg bg-slate-900/40 hover:bg-red-950/60 text-slate-400 hover:text-red-300 transition-all cursor-pointer active:scale-95 shrink-0 ml-1"
          title="Dismiss Promotional Banner"
        >
          <X className="h-3.5 w-3.5" />
        </button>

      </div>

      {/* Bottom subtle glow ambient line */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-amber-500/0 via-amber-500/30 to-amber-500/0" />
    </div>
  );
};
