import React, { useState, useMemo, useRef } from "react";
import { Search, Sparkles, ArrowRight, Play, ChevronLeft, ChevronRight, X, ArrowUpDown, Flame, Trophy, Crown, Dices, Gamepad2, Ticket, Zap } from "lucide-react";
import { CASINO_GAMES_CATALOG, CasinoGame } from "../data/gamesList";
import { casinoAudio } from "../lib/audioService";
import { motion, AnimatePresence } from "motion/react";
import { evaluateLiveGameRound } from "../constants/liveGameConfig";

interface GamesCatalogProps {
  chips: number;
  onLaunchGame: (gameId: string, category: string, gameName: string) => void;
  onPlayInstantWin: (amount: number, isWin: boolean, msg: string) => void;
}

// Single Reusable Game Card Component with Live Neon Glowing Pulse & Active Indicators
function GameCard({ game, onPlayClick, idx }: { game: CasinoGame; onPlayClick: (game: CasinoGame) => void; idx: number; key?: React.Key }) {
  // Deterministic active live player calculation based on game name
  const activePlayers = useMemo(() => {
    let h = 0;
    for (let i = 0; i < game.name.length; i++) {
      h = (h * 33 + game.name.charCodeAt(i)) % 360;
    }
    return h + 42; // Range 42 - 402 active players
  }, [game.name]);

  // Determine neon pulse styling and color themes
  const badgeUpper = (game.badge || "").toUpperCase();
  const catUpper = (game.category || "").toUpperCase();
  
  let neonConfig = {
    pulseAnim: "animate-gold-pulse-glow",
    borderHover: "hover:border-amber-400/90",
    glowShadow: "hover:shadow-[0_0_26px_rgba(245,158,11,0.4)]",
    topBarGradient: "from-amber-500 via-yellow-300 to-amber-500",
    accentColor: "text-amber-300",
    buttonGrad: "from-amber-500 via-yellow-400 to-rose-500",
    playShadow: "shadow-[0_0_20px_rgba(245,158,11,0.85)]",
    emblemBorder: "border-amber-400/60 shadow-[0_0_12px_rgba(245,158,11,0.3)]",
  };

  if (badgeUpper === "ORIGINAL" || catUpper === "ORIGINALS" || game.id.includes("crash") || game.id.includes("plinko")) {
    neonConfig = {
      pulseAnim: "animate-neon-pulse",
      borderHover: "hover:border-[#00FF66]/90",
      glowShadow: "hover:shadow-[0_0_26px_rgba(0,255,102,0.4)]",
      topBarGradient: "from-emerald-500 via-[#00FF66] to-teal-400",
      accentColor: "text-[#00FF66]",
      buttonGrad: "from-[#00FF66] via-emerald-400 to-teal-500",
      playShadow: "shadow-[0_0_20px_rgba(0,255,102,0.85)]",
      emblemBorder: "border-[#00FF66]/60 shadow-[0_0_12px_rgba(0,255,102,0.3)]",
    };
  } else if (badgeUpper === "HOT" || badgeUpper === "JACKPOT" || badgeUpper === "NEW") {
    neonConfig = {
      pulseAnim: "animate-game-card-pulse",
      borderHover: "hover:border-rose-400/90",
      glowShadow: "hover:shadow-[0_0_26px_rgba(244,63,94,0.4)]",
      topBarGradient: "from-rose-500 via-amber-400 to-rose-500",
      accentColor: "text-rose-300",
      buttonGrad: "from-rose-500 via-amber-400 to-yellow-400",
      playShadow: "shadow-[0_0_20px_rgba(244,63,94,0.85)]",
      emblemBorder: "border-rose-400/60 shadow-[0_0_12px_rgba(244,63,94,0.3)]",
    };
  } else if (catUpper === "LIVE" || (game.status && game.status.toUpperCase().includes("LIVE")) || (game.status && game.status.toUpperCase().includes("STREAM"))) {
    neonConfig = {
      pulseAnim: "animate-neon-pulse-rose",
      borderHover: "hover:border-rose-400/90",
      glowShadow: "hover:shadow-[0_0_26px_rgba(244,63,94,0.4)]",
      topBarGradient: "from-rose-500 via-pink-400 to-rose-500",
      accentColor: "text-rose-300",
      buttonGrad: "from-rose-500 via-pink-400 to-amber-400",
      playShadow: "shadow-[0_0_20px_rgba(244,63,94,0.85)]",
      emblemBorder: "border-rose-400/60 shadow-[0_0_12px_rgba(244,63,94,0.3)]",
    };
  } else if (badgeUpper.includes("VIP") || catUpper === "VIP") {
    neonConfig = {
      pulseAnim: "animate-neon-pulse-purple",
      borderHover: "hover:border-purple-400/90",
      glowShadow: "hover:shadow-[0_0_26px_rgba(168,85,247,0.4)]",
      topBarGradient: "from-purple-500 via-fuchsia-400 to-purple-500",
      accentColor: "text-purple-300",
      buttonGrad: "from-purple-500 via-fuchsia-400 to-pink-500",
      playShadow: "shadow-[0_0_20px_rgba(168,85,247,0.85)]",
      emblemBorder: "border-purple-400/60 shadow-[0_0_12px_rgba(168,85,247,0.3)]",
    };
  } else if (catUpper === "INSTANT" || catUpper === "MINES" || catUpper === "TABLE") {
    neonConfig = {
      pulseAnim: "animate-neon-pulse-cyan",
      borderHover: "hover:border-cyan-400/90",
      glowShadow: "hover:shadow-[0_0_26px_rgba(6,182,212,0.4)]",
      topBarGradient: "from-cyan-500 via-sky-300 to-cyan-500",
      accentColor: "text-cyan-300",
      buttonGrad: "from-cyan-400 via-sky-300 to-blue-500",
      playShadow: "shadow-[0_0_20px_rgba(6,182,212,0.85)]",
      emblemBorder: "border-cyan-400/60 shadow-[0_0_12px_rgba(6,182,212,0.3)]",
    };
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: Math.min(idx * 0.015, 0.2) }}
      onClick={() => onPlayClick(game)}
      style={{ animationDelay: `${(idx % 8) * 0.35}s` }}
      className={`group relative rounded-xl border border-slate-800/80 bg-[#0d131e]/95 ${neonConfig.pulseAnim} ${neonConfig.borderHover} ${neonConfig.glowShadow} shadow-lg transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between h-full active:scale-[0.97] touch-manipulation`}
    >
      {/* Top Edge Neon Pulse Flare Bar */}
      <div className={`h-[2px] w-full bg-gradient-to-r ${neonConfig.topBarGradient} opacity-75 group-hover:opacity-100 transition-opacity`} />

      {/* Ambient Lighting Accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-black/50 pointer-events-none" />

      {/* Thumbnail Header Area with Holographic Sheen */}
      <div className="relative h-28 xs:h-32 sm:h-36 md:h-40 w-full overflow-hidden shrink-0 bg-slate-950 laser-sheen-effect">
        <img
          src={game.artworkUrl || "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80"}
          alt={game.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-500 filter contrast-105 brightness-95"
        />

        {/* Dark Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d131e] via-transparent to-black/40" />

        {/* BC.Game / Stake Signature Quick 'Play' Hover Overlay with Pulsing Ring */}
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-1.5 z-20">
          <div className="relative">
            <div className="absolute -inset-1.5 rounded-full bg-white/25 animate-ping opacity-60 pointer-events-none" />
            <div className={`h-9 w-9 sm:h-11 sm:w-11 rounded-full bg-gradient-to-r ${neonConfig.buttonGrad} flex items-center justify-center text-slate-950 ${neonConfig.playShadow} transform scale-75 group-hover:scale-100 transition-transform duration-300 relative z-10`}>
              <Play className="h-4 w-4 sm:h-5 sm:w-5 fill-slate-950 stroke-0 ml-0.5" />
            </div>
          </div>
          <span className={`text-[9px] sm:text-[10px] font-mono font-black ${neonConfig.accentColor} tracking-widest uppercase drop-shadow-[0_0_8px_currentColor]`}>
            PLAY NOW
          </span>
        </div>

        {/* Top-Left Character / Theme Tag */}
        <div className="absolute top-1.5 left-1.5 z-10">
          {game.characterTag ? (
            <span className="px-1.5 py-0.5 rounded-md bg-black/85 border border-amber-400/50 text-[7.5px] sm:text-[8.5px] font-mono font-bold uppercase text-amber-300 backdrop-blur-md shadow-sm flex items-center gap-1">
              <Sparkles className="h-2 w-2 text-amber-400 shrink-0 animate-pulse" />
              <span className="truncate max-w-[65px] sm:max-w-none">{game.characterTag}</span>
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded-md bg-black/75 border border-slate-700/80 text-[7.5px] sm:text-[8.5px] font-mono font-bold uppercase text-slate-300 backdrop-blur-md">
              {game.category}
            </span>
          )}
        </div>

        {/* Top-Right Badge / Status + Live Pulse Indicator */}
        <div className="absolute top-1.5 right-1.5 z-10 flex items-center gap-1">
          {game.badge ? (
            <span className={`px-1.5 py-0.5 rounded-md border text-[7.5px] sm:text-[8px] font-mono font-black uppercase text-white shadow-sm backdrop-blur-md ${
              game.badge === "ORIGINAL" ? "bg-amber-500/95 border-amber-300 text-slate-950 font-black shadow-[0_0_8px_rgba(245,158,11,0.5)]" :
              game.badge === "HOT" ? "bg-rose-600/95 border-rose-300 shadow-[0_0_8px_rgba(225,29,72,0.5)]" :
              game.badge === "JACKPOT" ? "bg-fuchsia-600/95 border-fuchsia-300 shadow-[0_0_8px_rgba(192,38,211,0.5)]" :
              game.badge.includes("VIP") ? "bg-purple-600/95 border-purple-300 shadow-[0_0_8px_rgba(147,51,234,0.5)]" :
              "bg-indigo-600/95 border-indigo-300 shadow-[0_0_8px_rgba(79,70,229,0.5)]"
            }`}>
              {game.badge}
            </span>
          ) : (
            <div className="flex items-center gap-1 bg-black/85 backdrop-blur-md px-1.5 py-0.5 rounded-md border border-emerald-500/50 shadow-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              <span className="text-[7.5px] sm:text-[8px] font-mono font-extrabold uppercase text-emerald-300">
                {game.status || "LIVE"}
              </span>
            </div>
          )}
        </div>

        {/* Floating Game Icon Emblem with Neon Glow */}
        <div className={`absolute bottom-1.5 left-1.5 z-10 h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-black/85 border ${neonConfig.emblemBorder} backdrop-blur-md flex items-center justify-center text-xs sm:text-sm shadow-md transition-all`}>
          <span>{game.icon}</span>
        </div>

        {/* Bottom-Right Live Player Count Badge */}
        <div className="absolute bottom-1.5 right-1.5 z-10 flex items-center gap-1 bg-black/85 backdrop-blur-md px-1.5 py-0.5 rounded-full border border-emerald-500/40 shadow-sm">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          <span className="text-[7px] sm:text-[8px] font-mono font-bold text-emerald-300 tracking-wider">
            {activePlayers} LIVE
          </span>
        </div>
      </div>

      {/* Compact Card Metadata */}
      <div className="p-2 sm:p-2.5 relative z-10 flex-1 flex flex-col justify-between">
        <div>
          <h4 className={`font-bold text-xs sm:text-sm text-slate-100 group-hover:${neonConfig.accentColor} transition-colors truncate tracking-tight`}>
            {game.name}
          </h4>
          <p className="text-[9px] sm:text-[10px] text-slate-400 font-mono truncate mt-0.5">
            {game.description}
          </p>
        </div>

        {/* Streamlined Stats Bar with Neon Glowing Multiplier */}
        <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-mono mt-2 pt-1.5 border-t border-slate-800/80">
          <div className="flex items-center gap-1">
            <span className="text-slate-500 uppercase text-[8px]">Min:</span>
            <span className="text-slate-200 font-extrabold">${game.minBet}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-500 uppercase text-[8px]">Max:</span>
            <span className={`font-extrabold ${neonConfig.accentColor} drop-shadow-[0_0_6px_currentColor]`}>
              {game.multiplier}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Curated Row / Carousel Component for Main Floor
function CarouselRow({
  title,
  emoji,
  subtitle,
  games,
  onViewAll,
  onPlayClick
}: {
  title: string;
  emoji: string;
  subtitle: string;
  games: CasinoGame[];
  onViewAll: () => void;
  onPlayClick: (game: CasinoGame) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    casinoAudio.playClick();
    if (scrollRef.current) {
      const amount = direction === "left" ? -360 : 360;
      scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  if (games.length === 0) return null;

  return (
    <div className="space-y-3 py-3 border-b border-slate-900/80 last:border-0">
      {/* Row Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <span className="text-xl sm:text-2xl">{emoji}</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm sm:text-base md:text-lg text-white tracking-tight uppercase font-mono">
                {title}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400 font-bold">
                {games.length}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono hidden sm:block">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 bg-slate-950/80 border border-slate-800/80 rounded-xl p-1">
            <button
              onClick={() => scroll("left")}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={onViewAll}
            className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:text-amber-200 text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95"
          >
            <span>View All</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Horizontal Carousel */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-none snap-x py-1.5 px-0.5"
      >
        {games.map((game, idx) => (
          <div
            key={game.id}
            className="w-[145px] xs:w-[165px] sm:w-[185px] md:w-[200px] shrink-0 snap-start"
          >
            <GameCard game={game} onPlayClick={onPlayClick} idx={idx} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GamesCatalog({ chips, onLaunchGame, onPlayInstantWin }: GamesCatalogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("popular");
  const [activePage, setActivePage] = useState(1);
  const gamesPerPage = 36;

  // Mini-game Overlay State (Instant Win games!)
  const [activeMiniGame, setActiveMiniGame] = useState<CasinoGame | null>(null);
  const [miniGameBet, setMiniGameBet] = useState(50);
  const [coinSide, setCoinSide] = useState<"Heads" | "Tails">("Heads");
  const [hiloPrediction, setHiloPrediction] = useState<"Higher" | "Lower">("Higher");
  const [hiloCurrentCard, setHiloCurrentCard] = useState<number>(7);
  const [miniGameResult, setMiniGameResult] = useState<string | null>(null);
  const [isMiniGameRolling, setIsMiniGameRolling] = useState(false);

  // Scroll monitoring for the custom category menu bar
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const [showLeftScrollIndicator, setShowLeftScrollIndicator] = useState(false);
  const [showRightScrollIndicator, setShowRightScrollIndicator] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const checkScrollStatus = React.useCallback(() => {
    const el = categoryScrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;

    setShowLeftScrollIndicator(scrollLeft > 8);
    setShowRightScrollIndicator(scrollLeft + clientWidth < scrollWidth - 8);

    if (scrollWidth > clientWidth) {
      setScrollProgress((scrollLeft / (scrollWidth - clientWidth)) * 100);
    } else {
      setScrollProgress(0);
    }
  }, []);

  React.useEffect(() => {
    const el = categoryScrollRef.current;
    if (!el) return;

    el.addEventListener("scroll", checkScrollStatus);
    checkScrollStatus();

    const resizeObserver = new ResizeObserver(() => {
      checkScrollStatus();
    });
    resizeObserver.observe(el);

    const timeout = setTimeout(checkScrollStatus, 300);

    return () => {
      el.removeEventListener("scroll", checkScrollStatus);
      resizeObserver.disconnect();
      clearTimeout(timeout);
    };
  }, [checkScrollStatus, activeCategory]);

  // Play audio on filter changes
  const handleCategoryChange = (category: string) => {
    casinoAudio.playClick();
    setActiveCategory(category);
    setActivePage(1);
  };

  // Curated lists for Main Floor ("all")
  const { nexaOriginals, hotGames, liveCasino, vipSuite, tableGames, instantArcade } = useMemo(() => {
    const originals: CasinoGame[] = [];
    const hot: CasinoGame[] = [];
    const live: CasinoGame[] = [];
    const vip: CasinoGame[] = [];
    const table: CasinoGame[] = [];
    const instant: CasinoGame[] = [];

    CASINO_GAMES_CATALOG.forEach((g) => {
      const nameLower = g.name.toLowerCase();
      const catLower = g.category.toLowerCase();

      // Nexa Originals
      if (
        g.badge === "ORIGINAL" ||
        catLower === "originals" ||
        nameLower.includes("nexa") ||
        ["crash", "mines", "plinko", "dice", "limbo", "towers", "hilo", "coin flip", "wheel"].some((k) => nameLower.includes(k))
      ) {
        if (originals.length < 18) originals.push(g);
      }

      // Hot Games
      if (g.badge === "HOT" || g.badge === "JACKPOT" || g.badge === "NEW" || g.minBet >= 100) {
        if (hot.length < 18) hot.push(g);
      }

      // Live Casino
      if (catLower === "live" || nameLower.includes("live") || nameLower.includes("dealer") || g.theme.toLowerCase().includes("live")) {
        if (live.length < 18) live.push(g);
      }

      // VIP Suite
      if (g.status === "VIP Locked" || g.badge?.includes("VIP") || catLower === "exotic" || g.minBet >= 50) {
        if (vip.length < 18) vip.push(g);
      }

      // Table Games
      if (catLower === "table" || ["blackjack", "roulette", "baccarat", "poker", "sic bo"].some((k) => nameLower.includes(k))) {
        if (table.length < 18) table.push(g);
      }

      // Instant & Arcade
      if (
        catLower === "instant" ||
        catLower === "arcade" ||
        catLower === "lottery" ||
        ["keno", "bingo", "scratch", "lottery"].some((k) => nameLower.includes(k))
      ) {
        if (instant.length < 18) instant.push(g);
      }
    });

    return {
      nexaOriginals: originals.slice(0, 16),
      hotGames: hot.slice(0, 16),
      liveCasino: live.slice(0, 16),
      vipSuite: vip.slice(0, 16),
      tableGames: table.slice(0, 16),
      instantArcade: instant.slice(0, 16)
    };
  }, []);

  // Filter & Search & Sort for Grid View
  const filteredGames = useMemo(() => {
    let result = CASINO_GAMES_CATALOG.filter((game) => {
      if (!game) return false;
      const term = (searchTerm || "").toLowerCase().trim();
      const matchesSearch =
        !term ||
        (game.name || "").toLowerCase().includes(term) ||
        (game.description || "").toLowerCase().includes(term) ||
        (game.theme || "").toLowerCase().includes(term);

      const nameLower = (game.name || "").toLowerCase();
      const catLower = (game.category || "").toLowerCase();

      const matchesCategory =
        activeCategory === "all" ||
        game.category === activeCategory ||
        (activeCategory === "originals" &&
          (game.badge === "ORIGINAL" || nameLower.includes("nexa") || game.category === "originals" || game.category === "exotic")) ||
        (activeCategory === "hot" && (game.badge === "HOT" || game.badge === "JACKPOT" || game.badge === "NEW")) ||
        (activeCategory === "slots" && (game.category === "slots" || game.category === "exotic")) ||
        (activeCategory === "table" && game.category === "table") ||
        (activeCategory === "instant" && (game.category === "instant" || game.category === "arcade")) ||
        (activeCategory === "live" && game.category === "live") ||
        (activeCategory === "vip" && (game.status === "VIP Locked" || game.badge?.includes("VIP") || game.minBet >= 50)) ||
        (activeCategory === "lottery" &&
          (game.category === "lottery" || nameLower.includes("keno") || nameLower.includes("bingo") || nameLower.includes("lottery")));

      return matchesSearch && matchesCategory;
    });

    // Apply Sorting
    if (sortBy === "rtp") {
      result = [...result].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    } else if (sortBy === "multiplier") {
      const parseMult = (m: string) => {
        const num = parseFloat(m.replace(/[^0-9.]/g, ""));
        return isNaN(num) ? 0 : num;
      };
      result = [...result].sort((a, b) => parseMult(b.multiplier) - parseMult(a.multiplier));
    } else if (sortBy === "name") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "minBet") {
      result = [...result].sort((a, b) => a.minBet - b.minBet);
    }

    return result;
  }, [searchTerm, activeCategory, sortBy]);

  // Paginated games for grid mode
  const paginatedGames = useMemo(() => {
    const startIndex = (activePage - 1) * gamesPerPage;
    return filteredGames.slice(startIndex, startIndex + gamesPerPage);
  }, [filteredGames, activePage, gamesPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredGames.length / gamesPerPage));

  const handlePageChange = (page: number) => {
    casinoAudio.playClick();
    setActivePage(page);
    const element = document.getElementById("catalog-nav-header");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Instant Play handler for specific mini-games
  const handlePlayClick = (game: CasinoGame) => {
    casinoAudio.playClick();
    if (game.status === "VIP Locked") {
      alert(`This game is locked! Level up your peak chips stack or VIP tier to unlock ${game.name}.`);
      return;
    }

    if (game.id.includes("coinflip") || game.id.includes("hilo")) {
      setActiveMiniGame(game);
      setMiniGameResult(null);
      setIsMiniGameRolling(false);
      setHiloCurrentCard(Math.floor(Math.random() * 11) + 2);
    } else {
      onLaunchGame(game.id, game.category, game.name);
    }
  };

  // Coin Flip resolve
  const playCoinFlip = () => {
    if (chips < miniGameBet) {
      alert("You don't have enough chips to place this bet!");
      return;
    }
    setIsMiniGameRolling(true);
    setMiniGameResult(null);
    casinoAudio.playWheelSpin(0.35);

    setTimeout(() => {
      const won = evaluateLiveGameRound();
      setIsMiniGameRolling(false);
      if (won) {
        casinoAudio.playWin();
        const payout = miniGameBet * 2;
        onPlayInstantWin(miniGameBet, true, `Instant Coin Flip Win: Guessed ${coinSide} correctly!`);
        setMiniGameResult(`WIN! The coin landed on ${coinSide}! You received $${payout} chips!`);
      } else {
        const losingSide = coinSide === "Heads" ? "Tails" : "Heads";
        casinoAudio.playLose();
        onPlayInstantWin(miniGameBet, false, `Instant Coin Flip Loss: Coin landed on ${losingSide}.`);
        setMiniGameResult(`LOSS! The coin landed on ${losingSide}. Better luck next flip!`);
      }
    }, 1200);
  };

  // Hi-Lo resolve
  const playHiLo = () => {
    if (chips < miniGameBet) {
      alert("You don't have enough chips to place this bet!");
      return;
    }
    setIsMiniGameRolling(true);
    setMiniGameResult(null);
    casinoAudio.playCardShuffle();

    setTimeout(() => {
      const won = evaluateLiveGameRound();
      let nextCard = Math.floor(Math.random() * 11) + 2;
      if (won) {
        if (hiloPrediction === "Higher") nextCard = Math.min(13, hiloCurrentCard + Math.floor(Math.random() * 3) + 1);
        else nextCard = Math.max(2, hiloCurrentCard - Math.floor(Math.random() * 3) - 1);
      } else {
        if (hiloPrediction === "Higher") nextCard = Math.max(2, hiloCurrentCard - Math.floor(Math.random() * 3) - 1);
        else nextCard = Math.min(13, hiloCurrentCard + Math.floor(Math.random() * 3) + 1);
      }

      setIsMiniGameRolling(false);
      const cardLabel = (val: number) => {
        if (val === 11) return "Jack";
        if (val === 12) return "Queen";
        if (val === 13) return "King";
        return val.toString();
      };

      const resultMsg = `Previous card was ${cardLabel(hiloCurrentCard)}, Next card was ${cardLabel(nextCard)}.`;
      setHiloCurrentCard(nextCard);

      if (won) {
        casinoAudio.playWin();
        const payout = Math.floor(miniGameBet * 1.8);
        onPlayInstantWin(miniGameBet, true, `Instant Hi-Lo Win: Correctly guessed ${hiloPrediction}!`);
        setMiniGameResult(`WIN! ${resultMsg} You won $${payout} chips!`);
      } else {
        casinoAudio.playLose();
        onPlayInstantWin(miniGameBet, false, `Instant Hi-Lo Loss: Incorrect guess.`);
        setMiniGameResult(`LOSS! ${resultMsg} Better luck next draw!`);
      }
    }, 1000);
  };

  const isLobbyDefault = activeCategory === "all" && !searchTerm.trim();

  return (
    <div id="catalog-nav-header" className="relative z-20">
      
      {/* Sticky Combined Navigation & Search Header Bar */}
      <div className="sticky top-[52px] lg:top-2 z-30 bg-[#080B10]/95 backdrop-blur-2xl p-2.5 sm:p-3.5 rounded-2xl border border-slate-800/90 shadow-[0_10px_30px_rgba(0,0,0,0.85)] space-y-2.5 sm:space-y-3 group">
        
        {/* Category Tabs Row */}
        <div className="relative">
          {/* Left scroll indicator chevron */}
          <AnimatePresence>
            {showLeftScrollIndicator && (
              <motion.div
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -5 }}
                className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent z-10 flex items-center justify-start pl-1 pointer-events-none rounded-l-xl"
              >
                <motion.div
                  animate={{ x: [0, -3, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  className="w-5 h-5 rounded-md bg-slate-900/90 border border-slate-800 flex items-center justify-center text-amber-400 shadow-md pointer-events-auto cursor-pointer"
                  onClick={() => {
                    categoryScrollRef.current?.scrollBy({ left: -180, behavior: "smooth" });
                  }}
                >
                  <ChevronLeft className="h-3 w-3" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Right scroll indicator chevron */}
          <AnimatePresence>
            {showRightScrollIndicator && (
              <motion.div
                initial={{ opacity: 0, x: 5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 5 }}
                className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-slate-950 via-slate-950/80 to-transparent z-10 flex items-center justify-end pr-1 pointer-events-none rounded-r-xl"
              >
                <motion.div
                  animate={{ x: [0, 3, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  className="w-5 h-5 rounded-md bg-slate-900/90 border border-slate-800 flex items-center justify-center text-amber-400 shadow-md pointer-events-auto cursor-pointer"
                  onClick={() => {
                    categoryScrollRef.current?.scrollBy({ left: 180, behavior: "smooth" });
                  }}
                >
                  <ChevronRight className="h-3 w-3" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scrollable Category Row */}
          <div
            ref={categoryScrollRef}
            className="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none snap-x items-center select-none py-0.5"
          >
            {[
              { id: "all", label: "Lobby Floor", emoji: "🎰" },
              { id: "originals", label: "Nexa Originals", emoji: "⚡" },
              { id: "hot", label: "Hot & Popular", emoji: "🔥" },
              { id: "slots", label: "Slots & Wheels", emoji: "🍒" },
              { id: "live", label: "Live Casino", emoji: "🪩" },
              { id: "vip", label: "VIP Suite", emoji: "👑" },
              { id: "table", label: "Table Games", emoji: "🎲" },
              { id: "instant", label: "Instant & Arcade", emoji: "🎟️" },
              { id: "lottery", label: "Lottery & Keno", emoji: "🎫" }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-mono text-xs font-bold transition-all duration-300 cursor-pointer flex items-center gap-1.5 shrink-0 snap-center active:scale-95 ${
                  activeCategory === cat.id
                    ? "bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-500/20 text-amber-300 border border-amber-500/60 shadow-[0_0_18px_rgba(245,158,11,0.35)]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent"
                }`}
              >
                <span className="text-sm scale-110">{cat.emoji}</span>
                <span className="tracking-tight whitespace-nowrap">{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Horizontal scroll progress bar */}
          <div className="absolute -bottom-1 left-2 right-2 h-[2px] bg-slate-900/40 rounded-full overflow-hidden pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all duration-150"
              style={{ width: `${scrollProgress}%` }}
            />
          </div>
        </div>

        {/* Search & Sort Toolbar */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center justify-between">
          {/* Search Input Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setActivePage(1);
              }}
              placeholder="Search across 1,002 casino games by name or theme..."
              className="w-full bg-slate-900/90 border border-slate-800/80 rounded-xl pl-10 pr-9 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setActivePage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Sort & Counter Controls */}
          <div className="flex items-center gap-2 justify-between sm:justify-end shrink-0">
            <span className="text-[11px] font-mono text-slate-400 font-bold whitespace-nowrap">
              {filteredGames.length} Games
            </span>

            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 py-1.5">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />
              <select
                value={sortBy}
                onChange={(e) => {
                  casinoAudio.playClick();
                  setSortBy(e.target.value);
                }}
                className="bg-transparent text-xs font-mono text-slate-300 font-bold focus:outline-none cursor-pointer"
              >
                <option value="popular" className="bg-slate-950 text-white">Sort: Popular</option>
                <option value="rtp" className="bg-slate-950 text-white">Sort: RTP % (High)</option>
                <option value="multiplier" className="bg-slate-950 text-white">Sort: Max Win</option>
                <option value="name" className="bg-slate-950 text-white">Sort: Name (A-Z)</option>
                <option value="minBet" className="bg-slate-950 text-white">Sort: Lowest Min Bet</option>
              </select>
            </div>
          </div>
        </div>

      </div>

      {/* CONDITIONAL FLOOR DISPLAY: SECTIONAL CAROUSEL LOBBY vs FULL PAGINATED GRID */}
      {isLobbyDefault ? (
        /* SECTIONAL LOBBY FLOOR LAYOUT */
        <div className="space-y-6">
          <CarouselRow
            title="Nexa Originals"
            emoji="⚡"
            subtitle="Provably fair & instant payouts"
            games={nexaOriginals}
            onViewAll={() => handleCategoryChange("originals")}
            onPlayClick={handlePlayClick}
          />

          <CarouselRow
            title="Hot & Popular Games"
            emoji="🔥"
            subtitle="Top trending high-payout slots"
            games={hotGames}
            onViewAll={() => handleCategoryChange("hot")}
            onPlayClick={handlePlayClick}
          />

          <CarouselRow
            title="Live Casino & Game Shows"
            emoji="🪩"
            subtitle="Real dealers & HD live interactive tables"
            games={liveCasino}
            onViewAll={() => handleCategoryChange("live")}
            onPlayClick={handlePlayClick}
          />

          <CarouselRow
            title="High-Roller VIP Suite"
            emoji="👑"
            subtitle="High-stakes feature buy machines"
            games={vipSuite}
            onViewAll={() => handleCategoryChange("vip")}
            onPlayClick={handlePlayClick}
          />

          <CarouselRow
            title="Table & Card Games"
            emoji="🎲"
            subtitle="Blackjack, Roulette, Baccarat & Poker"
            games={tableGames}
            onViewAll={() => handleCategoryChange("table")}
            onPlayClick={handlePlayClick}
          />

          <CarouselRow
            title="Instant & Arcade Games"
            emoji="🎟️"
            subtitle="Scratchcards, Keno, Speed Bingo & Mines"
            games={instantArcade}
            onViewAll={() => handleCategoryChange("instant")}
            onPlayClick={handlePlayClick}
          />
        </div>
      ) : (
        /* CATEGORY OR SEARCH PAGINATED GRID VIEW */
        <div className="space-y-6">
          {/* Active Category Header Bar */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCategoryChange("all")}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div>
                <h3 className="font-mono text-base sm:text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <span>
                    {activeCategory === "originals" ? "⚡ Nexa Originals" :
                     activeCategory === "hot" ? "🔥 Hot & Popular" :
                     activeCategory === "slots" ? "🍒 Slots & Wheels" :
                     activeCategory === "live" ? "🪩 Live Casino" :
                     activeCategory === "vip" ? "👑 High-Roller VIP Suite" :
                     activeCategory === "table" ? "🎲 Table Games" :
                     activeCategory === "instant" ? "🎟️ Instant & Arcade" :
                     activeCategory === "lottery" ? "🎫 Lottery & Keno" : "🎰 Search Results"}
                  </span>
                </h3>
                <p className="text-[11px] font-mono text-slate-400">
                  Displaying {filteredGames.length} titles matching your filter
                </p>
              </div>
            </div>

            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-amber-400 hover:text-amber-300 transition-colors"
              >
                Clear Search
              </button>
            )}
          </div>

          {/* Paginated Grid Layout */}
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
            {paginatedGames.map((game, idx) => (
              <GameCard key={game.id} game={game} onPlayClick={handlePlayClick} idx={idx} />
            ))}

            {filteredGames.length === 0 && (
              <div className="col-span-full py-16 text-center border border-dashed border-slate-900 rounded-3xl bg-slate-950/40">
                <span className="text-3xl select-none block mb-3">🔍</span>
                <p className="font-mono text-xs text-slate-400">
                  No games matched your parameters in the NexaSpin catalog.
                </p>
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setActiveCategory("all");
                  }}
                  className="mt-4 px-4 py-2 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold rounded-xl hover:bg-amber-500/30 transition-all cursor-pointer"
                >
                  Return to Main Lobby Floor
                </button>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 pt-6">
              <button
                onClick={() => handlePageChange(Math.max(1, activePage - 1))}
                disabled={activePage === 1}
                className="px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-950 font-mono text-xs text-slate-400 hover:text-white disabled:opacity-40 transition-all cursor-pointer"
              >
                Prev Page
              </button>

              <div className="flex items-center gap-1.5 px-3">
                <span className="font-mono text-xs text-slate-500">Page</span>
                <span className="font-mono text-xs font-black text-amber-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
                  {activePage}
                </span>
                <span className="font-mono text-xs text-slate-500">of {totalPages}</span>
              </div>

              <button
                onClick={() => handlePageChange(Math.min(totalPages, activePage + 1))}
                disabled={activePage === totalPages}
                className="px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-950 font-mono text-xs text-slate-400 hover:text-white disabled:opacity-40 transition-all cursor-pointer"
              >
                Next Page
              </button>
            </div>
          )}
        </div>
      )}

      {/* INSTANT WIN MINI-GAME MODAL OVERLAY */}
      <AnimatePresence>
        {activeMiniGame && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-950 border-2 border-amber-500/40 rounded-3xl p-6 max-w-sm w-full text-center relative overflow-hidden shadow-2xl"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-rose-500" />

              <h3 className="font-mono text-lg font-black text-white flex items-center gap-2 justify-center tracking-tight mb-1">
                {activeMiniGame.icon} {activeMiniGame.name}
              </h3>
              <p className="text-[11px] text-slate-500 font-mono mb-5">{activeMiniGame.description}</p>

              {/* Set Bet Controls */}
              <div className="mb-6 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] uppercase font-mono text-slate-500 block mb-2">BET CHIPS BUNDLE</span>
                <div className="flex justify-center gap-2">
                  {[10, 25, 50, 100, 250].map((b) => (
                    <button
                      key={b}
                      onClick={() => {
                        casinoAudio.playChipClink();
                        setMiniGameBet(b);
                      }}
                      className={`px-3 py-1.5 font-mono text-xs rounded-xl border transition-all ${
                        miniGameBet === b
                          ? "bg-amber-500 border-amber-400 text-slate-950 font-extrabold"
                          : "bg-slate-950 border-slate-800 text-slate-400"
                      }`}
                    >
                      ${b}
                    </button>
                  ))}
                </div>
              </div>

              {/* COIN FLIP INTERFACE */}
              {activeMiniGame.id.includes("coinflip") && (
                <div className="space-y-6">
                  <div className="flex justify-center gap-4">
                    <button
                      onClick={() => {
                        casinoAudio.playClick();
                        setCoinSide("Heads");
                      }}
                      className={`px-5 py-3 rounded-2xl border font-mono text-sm font-black transition-all cursor-pointer ${
                        coinSide === "Heads"
                          ? "bg-amber-500/20 border-amber-500 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]"
                          : "bg-slate-900 border-slate-800 text-slate-500"
                      }`}
                    >
                      🪙 HEADS
                    </button>
                    <button
                      onClick={() => {
                        casinoAudio.playClick();
                        setCoinSide("Tails");
                      }}
                      className={`px-5 py-3 rounded-2xl border font-mono text-sm font-black transition-all cursor-pointer ${
                        coinSide === "Tails"
                          ? "bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.25)]"
                          : "bg-slate-900 border-slate-800 text-slate-500"
                      }`}
                    >
                      🪙 TAILS
                    </button>
                  </div>

                  <button
                    onClick={playCoinFlip}
                    disabled={isMiniGameRolling}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 text-xs font-mono font-black tracking-widest uppercase rounded-2xl transition-all cursor-pointer active:scale-95 disabled:opacity-40"
                  >
                    {isMiniGameRolling ? "FLIPPING THE COIN..." : "FLIP COIN"}
                  </button>
                </div>
              )}

              {/* HI-LO INTERFACE */}
              {activeMiniGame.id.includes("hilo") && (
                <div className="space-y-6">
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] uppercase font-mono text-slate-500 block mb-1">CURRENT ACTIVE CARD</span>
                    <span className="text-3xl font-black font-mono text-amber-400">
                      {hiloCurrentCard === 11 ? "J" : hiloCurrentCard === 12 ? "Q" : hiloCurrentCard === 13 ? "K" : hiloCurrentCard}
                    </span>
                  </div>

                  <div className="flex justify-center gap-4">
                    <button
                      onClick={() => {
                        casinoAudio.playClick();
                        setHiloPrediction("Higher");
                      }}
                      className={`px-5 py-3 rounded-2xl border font-mono text-sm font-black transition-all cursor-pointer flex-1 ${
                        hiloPrediction === "Higher"
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                          : "bg-slate-900 border-slate-800 text-slate-500"
                      }`}
                    >
                      📈 HIGHER
                    </button>
                    <button
                      onClick={() => {
                        casinoAudio.playClick();
                        setHiloPrediction("Lower");
                      }}
                      className={`px-5 py-3 rounded-2xl border font-mono text-sm font-black transition-all cursor-pointer flex-1 ${
                        hiloPrediction === "Lower"
                          ? "bg-rose-500/20 border-rose-500 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.25)]"
                          : "bg-slate-900 border-slate-800 text-slate-500"
                      }`}
                    >
                      📉 LOWER
                    </button>
                  </div>

                  <button
                    onClick={playHiLo}
                    disabled={isMiniGameRolling}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 text-xs font-mono font-black tracking-widest uppercase rounded-2xl transition-all cursor-pointer active:scale-95 disabled:opacity-40"
                  >
                    {isMiniGameRolling ? "DRAWING CARD..." : "PLAY DRAW"}
                  </button>
                </div>
              )}

              {/* NON-PLAYABLE PLACEHOLDER RESOLVE */}
              {!activeMiniGame.id.includes("coinflip") && !activeMiniGame.id.includes("hilo") && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-900 text-left">
                    <span className="text-[10px] text-amber-400 font-mono font-bold block mb-1">VIP SEAT CONFIRMED</span>
                    <p className="text-xs text-slate-400 leading-relaxed font-mono">
                      Your high-roller chip line of ${miniGameBet} has been authorized on the game server tables. Press the trigger below to run a high-payout micro-simulation!
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      if (chips < miniGameBet) {
                        alert("Not enough chips!");
                        return;
                      }
                      setIsMiniGameRolling(true);
                      setMiniGameResult(null);
                      casinoAudio.playWheelSpin(0.4);

                      setTimeout(() => {
                        const winChance = evaluateLiveGameRound();
                        setIsMiniGameRolling(false);
                        if (winChance) {
                          casinoAudio.playWin();
                          const payoutMult = [1.5, 2.0, 3.0, 5.0][Math.floor(Math.random() * 4)];
                          const winAmount = Math.floor(miniGameBet * payoutMult);
                          onPlayInstantWin(winAmount, true, `Instant Play win on ${activeMiniGame.name}!`);
                          setMiniGameResult(`WIN! Your strategy paid off! You won $${winAmount} chips with a ${payoutMult}x payout!`);
                        } else {
                          casinoAudio.playLose();
                          onPlayInstantWin(miniGameBet, false, `Instant Play loss on ${activeMiniGame.name}.`);
                          setMiniGameResult(`LOSS! The house won the hand. Better luck next bet!`);
                        }
                      }, 1000);
                    }}
                    disabled={isMiniGameRolling}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 text-xs font-mono font-black tracking-widest uppercase rounded-2xl transition-all cursor-pointer active:scale-95 disabled:opacity-40"
                  >
                    {isMiniGameRolling ? "PROCESSING BET..." : "RUN CASINO HAND"}
                  </button>
                </div>
              )}

              {/* Display Results */}
              <AnimatePresence>
                {miniGameResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-5 p-4 rounded-2xl text-xs font-mono font-bold ${
                      miniGameResult.includes("WIN")
                        ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800"
                        : "bg-rose-950/80 text-rose-400 border border-rose-800"
                    }`}
                  >
                    {miniGameResult}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Dismiss Button */}
              <button
                onClick={() => {
                  casinoAudio.playClick();
                  setActiveMiniGame(null);
                }}
                className="mt-6 text-[10px] font-mono tracking-widest uppercase font-black text-slate-500 hover:text-slate-200 transition-colors cursor-pointer"
              >
                CLOSE GAME LOBBY
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
