import React, { useState, useEffect, useRef } from "react";
import {
  Coins,
  Tv,
  Gamepad2,
  Gift,
  Landmark,
  Volume2,
  VolumeX,
  Clock,
  Sparkles,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  TrendingUp,
  User,
  Radio,
  Scale,
  Shield,
} from "lucide-react";
import FloorRulesModal from "./components/FloorRulesModal";
import NexaSpinLogo from "./components/NexaSpinLogo";
import { LiveGamesSection } from "./components/LiveGamesSection";
import { GameType, CommentaryState, Transaction, HostMood, ChatMessage, SystemConfig } from "./types";
import VipHostPanel from "./components/VipHostPanel";
import SlotsGame from "./components/SlotsGame";
import BlackjackGame from "./components/BlackjackGame";
import RouletteGame from "./components/RouletteGame";
import DailySpin from "./components/DailySpin";
import PlayerProfile from "./components/PlayerProfile";
import CasinoFloor from "./components/CasinoFloor";
import PlayerTutorial from "./components/PlayerTutorial";
import GamesCatalog from "./components/GamesCatalog";
import VideoPokerGame from "./components/VideoPokerGame";
import NeonPlinko from "./components/NeonPlinko";
import CyberMines from "./components/CyberMines";
import LuxuryBaccarat from "./components/LuxuryBaccarat";
import InteractiveHighLow from "./components/InteractiveHighLow";
import AnimatedChipsCounter from "./components/AnimatedChipsCounter";
import QuestTracker, { Quest } from "./components/QuestTracker";
import AdminPanel from "./components/AdminPanel";
import { updateServerRtpConfig } from "./lib/serverGameClient";
import LoginScreen from "./components/LoginScreen";
import { getRegisteredPlayers } from "./constants/defaultPlayers";
import { 
  saveUserSessionWithPersistence, 
  getValidPersistedSession, 
  getRoleRedirectPath 
} from "./lib/supabase";
import { getMergedP2PAgents } from "./constants/p2pAgents";
import { getBankingRequests } from "./constants/bankingRequests";
import { getSubAdmins } from "./constants/subAdmins";
import { getReferralEvents } from "./constants/referralData";
import { initDatabaseDefaults, setupDatabaseListeners, savePlayerToDatabase, saveSystemConfigToDatabase } from "./lib/db";
import { setGlobalRtp } from "./data/gameData";
import AgentDashboard from "./components/AgentDashboard";
import { logPlayerActivity } from "./lib/activityTracker";
import { recordGameStats } from "./lib/portfolioManager";
import SubAdminDashboard from "./components/SubAdminDashboard";
import BigWinCelebration from "./components/BigWinCelebration";
import MegaWinVault from "./components/MegaWinVault";
import SuperWinnerTrendsChart from "./components/SuperWinnerTrendsChart";
import LiveWinnersFeed from "./components/LiveWinnersFeed";
import GlobalFloatingChat from "./components/GlobalFloatingChat";
import { MobileHeader } from "./components/MobileHeader";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { MobileAppDrawer } from "./components/MobileAppDrawer";
import { VegasHighRollerSuite } from "./components/VegasHighRollerSuite";
import GameLauncher from "./components/games/GameLauncher";
import { PromotionalBannerBar } from "./components/PromotionalBannerBar";
import { PromotionalHeroBanner } from "./components/PromotionalHeroBanner";
import PaymentPartnersBanner from "./components/PaymentPartnersBanner";
import DepositRequiredModal from "./components/DepositRequiredModal";
import { motion, AnimatePresence } from "motion/react";

interface AuditLog {
  id: string;
  timestamp: string;
  type: "info" | "warning" | "success" | "danger";
  message: string;
}
import { casinoAudio } from "./lib/audioService";

const INITIAL_COMMENTARY: CommentaryState = {
  commentary: "Welcome to the NexaSpin Crypto Casino floor! I'm Vegas Vance, your host. Grab your chips, pick your game, and let's see if Lady Luck is on your side tonight!",
  tips: "Always start small to warm up the slots, then double down when the reels start feeling hot!",
  hostMood: "suave",
  loading: false,
};

const INITIAL_QUESTS: Quest[] = [
  {
    id: "quest_slots",
    title: "Novice Spinner",
    description: "Spin the Cosmic Slots reels 5 times to master the paylines.",
    target: 5,
    current: 0,
    reward: 0.40,
    claimed: false,
    category: "slots"
  },
  {
    id: "quest_blackjack",
    title: "Vegas Dealer Challenge",
    description: "Play 3 full hands of Royal Blackjack against Vegas Vance.",
    target: 3,
    current: 0,
    reward: 0.40,
    claimed: false,
    category: "blackjack"
  },
  {
    id: "quest_roulette",
    title: "Wheel Predictor",
    description: "Place 4 bets on the luxury Neon Roulette Board.",
    target: 4,
    current: 0,
    reward: 0.40,
    claimed: false,
    category: "roulette"
  },
  {
    id: "quest_crash_survive",
    title: "Super Sonic Survival",
    description: "Reach a supersonic multiplier of 2.50x or more in Neon Crash Rocket.",
    target: 1,
    current: 0,
    reward: 0.40,
    claimed: false,
    category: "crash"
  },
  {
    id: "quest_videopoker",
    title: "High-Voltage Strategist",
    description: "Play 3 strategic hands of Jacks or Better Video Poker.",
    target: 3,
    current: 0,
    reward: 0.40,
    claimed: false,
    category: "videopoker"
  }
];

interface CurrentUser {
  role: "player" | "admin" | "agent" | "Sub-Admin" | "super_admin" | "sub_admin";
  name: string;
  phoneNumber?: string;
  email?: string;
  walletAddress?: string;
  loggedInVia: "phone" | "google" | "credentials" | "email_password" | "web3" | "telegram";
  agentId?: string;
  expiresAt?: number;
  createdAt?: number;
  sessionDurationDays?: number;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => {
    return getValidPersistedSession();
  });

  const [activeTab, setActiveTab] = useState<GameType>("lobby");
  const [chips, setChips] = useState<number>(0);
  const [bonusBalance, setBonusBalance] = useState<number>(200);
  const [totalWagerRequired, setTotalWagerRequired] = useState<number>(() => {
    const saved = localStorage.getItem("casino_total_wager_required");
    return saved ? Math.max(0, Number(saved) || 0) : 6000;
  });
  const [currentWagerProgress, setCurrentWagerProgress] = useState<number>(() => {
    const saved = localStorage.getItem("casino_current_wager_progress");
    return saved ? Math.max(0, Number(saved) || 0) : 0;
  });
  const [cumulativeLosses, setCumulativeLosses] = useState<number>(0);
  const [peakChips, setPeakChips] = useState<number>(0);
  const [loanCount, setLoanCount] = useState<number>(0);
  const [lossesStreak, setLossesStreak] = useState<number>(0);
  const [totalWonSession, setTotalWonSession] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [allMissionsBonusClaimed, setAllMissionsBonusClaimed] = useState<boolean>(() => {
    return localStorage.getItem("casino_all_missions_bonus_v2") === "true";
  });
  const [commentaryState, setCommentaryState] = useState<CommentaryState>(INITIAL_COMMENTARY);
  const [time, setTime] = useState<string>("");
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(false);
  const [isImmersiveMobile, setIsImmersiveMobile] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isVanceOpen, setIsVanceOpen] = useState<boolean>(false);
  const [hasNewVanceCommentary, setHasNewVanceCommentary] = useState<boolean>(false);
  const [activeCelebration, setActiveCelebration] = useState<{ id: string; amount: number } | null>(null);
  const [isSuperGamesExpanded, setIsSuperGamesExpanded] = useState<boolean>(true);
  const [progressiveJackpot, setProgressiveJackpot] = useState<number>(() => {
    const cached = localStorage.getItem("casino_progressive_jackpot");
    return cached ? Number(cached) : 3450281.80;
  });
  const [megaWinState, setMegaWinState] = useState<any>(null);
  const [loginTime, setLoginTime] = useState<number | null>(null);
  const [showLoginWelcomePopup, setShowLoginWelcomePopup] = useState<boolean>(false);
  const [showQuestCompletedPopup, setShowQuestCompletedPopup] = useState<Quest | null>(null);
  const [showDepositRequiredModal, setShowDepositRequiredModal] = useState<boolean>(false);
  const [customToast, setCustomToast] = useState<{ show: boolean; title: string; message: string; type: "info" | "success" } | null>(null);

  useEffect(() => {
    if (customToast?.show) {
      const timer = setTimeout(() => {
        setCustomToast(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [customToast]);
  const [selectedLiveGameInfo, setSelectedLiveGameInfo] = useState<{ id: string; name: string } | null>(null);
  const [activeLauncherGame, setActiveLauncherGame] = useState<{ id: string; name: string } | null>(null);
  const [isFloorRulesOpen, setIsFloorRulesOpen] = useState<boolean>(false);
  const [floorRulesTab, setFloorRulesTab] = useState<"house" | "cards" | "crash" | "slots" | "security">("house");
  
  const lastKnownPlayerChipsRef = useRef<number | null>(null);
  const lastKnownPlayerBonusRef = useRef<number | null>(null);
  const lastKnownPlayerWagerReqRef = useRef<number | null>(null);
  const lastKnownPlayerWagerProgRef = useRef<number | null>(null);
  const lastKnownPlayerLossesRef = useRef<number | null>(null);
  const isPoppingStateRef = useRef<boolean>(false);

  useEffect(() => {
    // Initialize database & listeners
    initDatabaseDefaults();
    setupDatabaseListeners();

    // Seed all local data stores on mount so new devices/tabs have complete data
    getRegisteredPlayers();
    getMergedP2PAgents();
    getBankingRequests();
    getSubAdmins();
    getReferralEvents();

    // Initial role-based URL path routing synchronization
    if (currentUser) {
      const roleNorm = (currentUser.role || "player").toLowerCase().replace(/[-_]/g, "");
      const path = window.location.pathname;
      if (roleNorm === "superadmin" || roleNorm === "admin") {
        if (path !== "/admin") {
          window.history.replaceState({ role: "super_admin", tab: "admin" }, "", "/admin");
        }
        setActiveTab("admin");
      } else if (roleNorm === "subadmin") {
        if (path !== "/sub-admin") {
          window.history.replaceState({ role: "sub_admin", tab: "sub-admin" }, "", "/sub-admin");
        }
        setActiveTab("admin");
      } else if (roleNorm === "agent") {
        if (path !== "/agent") {
          window.history.replaceState({ role: "agent", tab: "agent" }, "", "/agent");
        }
        setActiveTab("lobby");
      } else {
        if (path === "/admin" || path === "/sub-admin" || path === "/agent") {
          window.history.replaceState({ role: "player", tab: "lobby" }, "", "/lobby");
        }
      }
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgressiveJackpot((prev) => {
        const next = prev + (0.05 + Math.random() * 0.95);
        localStorage.setItem("casino_progressive_jackpot", next.toString());
        return next;
      });
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const superGames = ["slots", "blackjack", "roulette", "videopoker", "crash", "plinko", "mines", "baccarat", "highlow"];
    if (superGames.includes(activeTab)) {
      setIsSuperGamesExpanded(true);
    }
  }, [activeTab]);

  // Mobile Hardware / Browser Back Button & History Navigation Manager
  useEffect(() => {
    if (!window.history.state || window.history.state.isVegasLobby === undefined) {
      window.history.replaceState({ isVegasLobby: true, tab: "lobby" }, "", window.location.href);
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      isPoppingStateRef.current = true;

      // Priority 1: Close active popups / modals if open
      if (isFloorRulesOpen) {
        setIsFloorRulesOpen(false);
        setTimeout(() => { isPoppingStateRef.current = false; }, 150);
        return;
      }

      if (isVanceOpen) {
        setIsVanceOpen(false);
        setTimeout(() => { isPoppingStateRef.current = false; }, 150);
        return;
      }

      if (showQuestCompletedPopup) {
        setShowQuestCompletedPopup(null);
        setTimeout(() => { isPoppingStateRef.current = false; }, 150);
        return;
      }

      if (showLoginWelcomePopup) {
        setShowLoginWelcomePopup(false);
        setTimeout(() => { isPoppingStateRef.current = false; }, 150);
        return;
      }

      // Priority 2: Exit active launcher game, live stream, or sub-tab back to lobby
      if (activeLauncherGame !== null || selectedLiveGameInfo !== null || activeTab !== "lobby") {
        setActiveLauncherGame(null);
        setSelectedLiveGameInfo(null);
        setActiveTab("lobby");
        setIsSuperGamesExpanded(false);
      }

      setTimeout(() => {
        isPoppingStateRef.current = false;
      }, 150);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [
    activeTab,
    activeLauncherGame,
    selectedLiveGameInfo,
    isFloorRulesOpen,
    isVanceOpen,
    showQuestCompletedPopup,
    showLoginWelcomePopup,
  ]);

  // Keep window.history in sync with app navigation state
  useEffect(() => {
    if (isPoppingStateRef.current) return;

    const isSubPage =
      activeTab !== "lobby" ||
      activeLauncherGame !== null ||
      selectedLiveGameInfo !== null ||
      isFloorRulesOpen;

    if (isSubPage && window.history.state?.isVegasLobby) {
      window.history.pushState(
        {
          isVegasLobby: false,
          tab: activeTab,
          gameId: activeLauncherGame?.id || selectedLiveGameInfo?.id,
        },
        "",
        window.location.href
      );
    } else if (!isSubPage && window.history.state && !window.history.state.isVegasLobby) {
      window.history.replaceState({ isVegasLobby: true, tab: "lobby" }, "", window.location.href);
    }
  }, [activeTab, activeLauncherGame, selectedLiveGameInfo, isFloorRulesOpen]);

  // Enterprise Admin & System Config States
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(() => {
    const cached = localStorage.getItem("casino_system_config_v1");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    return {
      id: "main",
      globalRtp: 5.0,
      globalWinRatio: 5.0,
      houseWinRate: 0.95,
      housePool: 5000000,
      rtpBias: "custom",
      customWinRatio: 5,
      forceLoseMode: true,
      maxCrashMultiplier: 50,
      progressiveJackpot: 3450281.80,
    };
  });

  const [housePool, setHousePool] = useState<number>(() => {
    const cached = localStorage.getItem("casino_house_pool");
    return cached ? Number(cached) : 5000000;
  });
  const [rtpBias, setRtpBias] = useState<"standard" | "loose" | "tight" | "rigged" | "custom">(() => {
    const cached = localStorage.getItem("casino_rtp_bias");
    return (cached as any) || "custom";
  });
  const [customWinRatio, setCustomWinRatio] = useState<number>(() => {
    const cached = localStorage.getItem("casino_custom_win_ratio") || localStorage.getItem("casino_global_rtp");
    if (cached) {
      const val = Number(cached);
      if (!isNaN(val) && val >= 1 && val <= 100) return val;
    }
    return 5;
  });
  const [forceLoseMode, setForceLoseMode] = useState<boolean>(() => {
    const cached = localStorage.getItem("casino_force_lose_mode");
    return cached === null ? true : cached === "true";
  });
  const [maxCrashMultiplier, setMaxCrashMultiplier] = useState<number>(50);
  const [forcedOutcome, setForcedOutcome] = useState<"none" | "jackpot" | "lose">("none");
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    { id: "init-1", timestamp: new Date().toLocaleTimeString(), type: "success", message: "SYSTEM: Root Vegas Vance administrative session activated securely." },
    { id: "init-2", timestamp: new Date().toLocaleTimeString(), type: "info", message: "SYSTEM: Port 3000 online, proxy and rate-limiting rules active." },
  ]);

  // Sync System Config with LocalStorage & Database
  useEffect(() => {
    const syncSystemConfig = () => {
      const cached = localStorage.getItem("casino_system_config_v1");
      if (cached) {
        try {
          const parsed: SystemConfig = JSON.parse(cached);
          setSystemConfig(parsed);
          if (parsed.housePool !== undefined) setHousePool(parsed.housePool);
          if (parsed.rtpBias) setRtpBias(parsed.rtpBias);
          if (parsed.customWinRatio !== undefined && parsed.customWinRatio >= 1 && parsed.customWinRatio <= 100) {
            setCustomWinRatio(parsed.customWinRatio);
          }
          if (parsed.globalRtp !== undefined && parsed.globalRtp >= 1 && parsed.globalRtp <= 100) {
            setCustomWinRatio(parsed.globalRtp);
          }
          if (parsed.forceLoseMode !== undefined) {
            setForceLoseMode(parsed.forceLoseMode);
          }
        } catch (e) {}
      }
    };

    syncSystemConfig();
    window.addEventListener("system_config_updated", syncSystemConfig);
    window.addEventListener("storage", syncSystemConfig);
    return () => {
      window.removeEventListener("system_config_updated", syncSystemConfig);
      window.removeEventListener("storage", syncSystemConfig);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("casino_rtp_bias", rtpBias);
    localStorage.setItem("casino_custom_win_ratio", String(customWinRatio));
    localStorage.setItem("casino_global_rtp", String(customWinRatio));
    localStorage.setItem("casino_global_win_ratio", String(customWinRatio));
    localStorage.setItem("casino_force_lose_mode", String(forceLoseMode));
    setGlobalRtp(customWinRatio);
    const updated: SystemConfig = {
      ...systemConfig,
      globalRtp: customWinRatio,
      globalWinRatio: customWinRatio,
      rtpBias,
      housePool,
      customWinRatio,
      forceLoseMode,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem("casino_system_config_v1", JSON.stringify(updated));
    saveSystemConfigToDatabase(updated);

    // Sync in real-time with Server-Authoritative Game Engine
    updateServerRtpConfig({
      globalRtp: customWinRatio,
      rtpBias,
      customWinRatio,
      forceLoseMode,
    });
  }, [rtpBias, customWinRatio, forceLoseMode, housePool]);

  const addAuditLog = (msg: string, type: "info" | "warning" | "success" | "danger" = "info") => {
    setAuditLogs((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toLocaleTimeString(),
        type,
        message: msg,
      }
    ].slice(-150));
  };

  const initializeMegaWinStrategy = () => {
    let currentStrategy: any = null;
    try {
      const cachedStrategy = localStorage.getItem("casino_mega_win_strategy_v1");
      if (cachedStrategy) {
        currentStrategy = JSON.parse(cachedStrategy);
      }
    } catch (e) {
      console.error("Error parsing cached mega win strategy", e);
    }

    const now = Date.now();
    // If no strategy cached OR if current strategy has expired
    if (!currentStrategy || !currentStrategy.windowEnd || now > currentStrategy.windowEnd) {
      // Pick a random player from registered players list
      let playersList: any[] = [];
      try {
        const storedPlayersStr = localStorage.getItem("registered_players_v1");
        if (storedPlayersStr) {
          const parsed = JSON.parse(storedPlayersStr);
          if (Array.isArray(parsed)) {
            playersList = parsed;
          }
        }
      } catch (e) {
        console.error(e);
      }

      // If no players in list, use default players list
      if (!Array.isArray(playersList) || playersList.length === 0) {
        playersList = [
          { name: "Research Niam", email: "research.niam@gmail.com", phoneNumber: "01777-777777" },
          { name: "High Roller Jess", email: "jess.vip@gmail.com", phoneNumber: "01712-345678" },
          { name: "Lucky Dan", email: "dan.roulette@gmail.com", phoneNumber: "01798-765432" }
        ];
      }

      const randomPlayer = playersList[Math.floor(Math.random() * playersList.length)] || playersList[0];
      const newStrategy = {
        selectedWinnerEmail: randomPlayer.email,
        selectedWinnerName: randomPlayer.name,
        selectedWinnerPhone: randomPlayer.phoneNumber || "",
        windowStart: now,
        windowEnd: now + 3 * 24 * 60 * 60 * 1000, // 3 days
        isClaimed: false,
        amount: 10000,
        playedPlayers: []
      };

      try {
        localStorage.setItem("casino_mega_win_strategy_v1", JSON.stringify(newStrategy));
      } catch (e) {
        console.error(e);
      }
      setMegaWinState(newStrategy);
      addAuditLog(`MEGA WIN STRATEGY: Initialized VIP Vault pool. Reward pool set to $10,000 USDT.`, "success");
      return newStrategy;
    } else {
      if (!currentStrategy.playedPlayers) {
        currentStrategy.playedPlayers = [];
      }
      // Force amount to 10,000 USDT for the player
      currentStrategy.amount = 10000;
      try {
        localStorage.setItem("casino_mega_win_strategy_v1", JSON.stringify(currentStrategy));
      } catch (e) {
        console.error(e);
      }
      setMegaWinState(currentStrategy);
      return currentStrategy;
    }
  };

  const handleReRollMegaWinner = () => {
    let playersList: any[] = [];
    try {
      const stored = localStorage.getItem("registered_players_v1");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          playersList = parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    if (!Array.isArray(playersList) || playersList.length === 0) {
      playersList = [
        { name: "Research Niam", email: "research.niam@gmail.com", phoneNumber: "01777-777777" },
        { name: "High Roller Jess", email: "jess.vip@gmail.com", phoneNumber: "01712-345678" },
        { name: "Lucky Dan", email: "dan.roulette@gmail.com", phoneNumber: "01798-765432" }
      ];
    }
    
    const randomPlayer = playersList[Math.floor(Math.random() * playersList.length)] || playersList[0];
    const newState = {
      selectedWinnerEmail: randomPlayer.email,
      selectedWinnerName: randomPlayer.name,
      selectedWinnerPhone: randomPlayer.phoneNumber || "",
      windowStart: Date.now(),
      windowEnd: Date.now() + 3 * 24 * 60 * 60 * 1000,
      isClaimed: false,
      amount: 10000,
      playedPlayers: []
    };
    
    try {
      localStorage.setItem("casino_mega_win_strategy_v1", JSON.stringify(newState));
    } catch (e) {
      console.error(e);
    }
    setMegaWinState(newState);
    addAuditLog(`MEGA WIN STRATEGY: Auto-reset VIP Vault. Reward pool set to $10,000 USDT.`, "warning");
  };

  // Run initialization
  useEffect(() => {
    initializeMegaWinStrategy();
    const interval = setInterval(initializeMegaWinStrategy, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem("casino_house_pool", housePool.toString());
  }, [housePool]);

  // Scroll monitoring for the custom navigation bar on mobile
  const navScrollRef = React.useRef<HTMLDivElement>(null);
  const [showLeftNavIndicator, setShowLeftNavIndicator] = useState(false);
  const [showRightNavIndicator, setShowRightNavIndicator] = useState(false);
  const [navScrollProgress, setNavScrollProgress] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);

  // Sync unread chat count for the player badge
  useEffect(() => {
    if (!currentUser?.email) {
      setUnreadChatCount(0);
      return;
    }
    const checkUnread = () => {
      const stored = localStorage.getItem("casino_chat_messages_v1");
      if (stored) {
        try {
          const allMsgs: ChatMessage[] = JSON.parse(stored);
          const myEmail = (currentUser?.email || "").toLowerCase();
          const count = allMsgs.filter(m => 
            m.receiverId && m.receiverId.toLowerCase() === myEmail && 
            m.senderRole !== "player" && 
            !m.read
          ).length;
          setUnreadChatCount(count);
        } catch (e) {
          console.error("Error reading chat unread count", e);
        }
      } else {
        setUnreadChatCount(0);
      }
    };

    checkUnread();
    const interval = setInterval(checkUnread, 2000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const checkNavScrollStatus = React.useCallback(() => {
    const el = navScrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    
    setShowLeftNavIndicator(scrollLeft > 8);
    setShowRightNavIndicator(scrollLeft + clientWidth < scrollWidth - 8);
    
    if (scrollWidth > clientWidth) {
      setNavScrollProgress((scrollLeft / (scrollWidth - clientWidth)) * 100);
    } else {
      setNavScrollProgress(0);
    }
  }, []);

  useEffect(() => {
    const el = navScrollRef.current;
    if (!el) return;

    el.addEventListener("scroll", checkNavScrollStatus);
    checkNavScrollStatus();

    const resizeObserver = new ResizeObserver(() => {
      checkNavScrollStatus();
    });
    resizeObserver.observe(el);

    const timeout = setTimeout(checkNavScrollStatus, 300);

    return () => {
      el.removeEventListener("scroll", checkNavScrollStatus);
      resizeObserver.disconnect();
      clearTimeout(timeout);
    };
  }, [checkNavScrollStatus, activeTab]);

  const [isSfxMuted, setIsSfxMuted] = useState<boolean>(casinoAudio.isMuted());

  const toggleMusic = () => {
    casinoAudio.playClick();
    const nextState = casinoAudio.toggleMusic();
    setIsMusicPlaying(nextState);
  };

  const toggleSfx = () => {
    const muted = casinoAudio.toggleMute();
    setIsSfxMuted(muted);
    if (!muted) {
      casinoAudio.playChipClink();
    }
  };

  // Load state from local storage on mount
  useEffect(() => {
    let initialChips = 0;
    let initialPeak = 0;
    let initialLoans = 0;
    let initialTransactions: Transaction[] = [];

    const cachedUser = localStorage.getItem("casino_user");
    let loggedInUser: CurrentUser | null = null;
    if (cachedUser) {
      try {
        loggedInUser = JSON.parse(cachedUser);
      } catch (e) {
        console.error(e);
      }
    }

    if (loggedInUser && loggedInUser.role === "player") {
      const stored = localStorage.getItem("registered_players_v1");
      if (stored) {
        try {
          const playersList: any[] = JSON.parse(stored);
          const pEmail = loggedInUser.email?.toLowerCase();
          const pPhoneClean = loggedInUser.phoneNumber?.replace(/\D/g, "");
          const found = playersList.find(p => 
            (pEmail && p.email && p.email.toLowerCase() === pEmail) || 
            (pPhoneClean && p.phoneNumber && p.phoneNumber.replace(/\D/g, "") === pPhoneClean)
          );
          if (found) {
            initialChips = found.chips !== undefined ? Number(found.chips) : 0;
            initialPeak = found.peakChips !== undefined ? Number(found.peakChips) : initialChips;
            initialLoans = found.loanCount !== undefined ? Number(found.loanCount) : 0;
            initialTransactions = found.transactions || [];
            const initialBonus = found.bonusBalance !== undefined ? Number(found.bonusBalance) : 200;
            const initialWagerReq = found.totalWagerRequired !== undefined ? Number(found.totalWagerRequired) : (initialBonus > 0 ? initialBonus * 30 : 0);
            const initialWagerProg = found.currentWagerProgress !== undefined ? Number(found.currentWagerProgress) : 0;
            const initialLosses = found.cumulativeLosses !== undefined ? Number(found.cumulativeLosses) : 0;

            setBonusBalance(initialBonus);
            setTotalWagerRequired(initialWagerReq);
            setCurrentWagerProgress(initialWagerProg);
            setCumulativeLosses(initialLosses);

            lastKnownPlayerChipsRef.current = initialChips;
            lastKnownPlayerBonusRef.current = initialBonus;
            lastKnownPlayerWagerReqRef.current = initialWagerReq;
            lastKnownPlayerWagerProgRef.current = initialWagerProg;
            lastKnownPlayerLossesRef.current = initialLosses;
          }
        } catch (e) {
          console.error(e);
        }
      }
    } else {
      const savedChips = localStorage.getItem("casino_chips");
      const savedPeak = localStorage.getItem("casino_peak_chips");
      const savedLoans = localStorage.getItem("casino_loans");
      const savedTransactions = localStorage.getItem("casino_transactions");
      const savedBonus = localStorage.getItem("casino_bonus_balance");
      const savedLosses = localStorage.getItem("casino_cumulative_losses");
      const savedWagerReq = localStorage.getItem("casino_total_wager_required");
      const savedWagerProg = localStorage.getItem("casino_current_wager_progress");

      if (savedChips !== null) initialChips = Number(savedChips);
      if (savedPeak !== null) initialPeak = Number(savedPeak);
      if (savedLoans !== null) initialLoans = Number(savedLoans);
      
      const initialBonus = savedBonus !== null ? Number(savedBonus) : 200;
      setBonusBalance(initialBonus);
      if (savedLosses !== null) setCumulativeLosses(Number(savedLosses));
      if (savedWagerReq !== null) setTotalWagerRequired(Number(savedWagerReq));
      if (savedWagerProg !== null) setCurrentWagerProgress(Number(savedWagerProg));

      lastKnownPlayerChipsRef.current = initialChips;
      lastKnownPlayerBonusRef.current = initialBonus;
      lastKnownPlayerWagerReqRef.current = savedWagerReq !== null ? Number(savedWagerReq) : (initialBonus * 30);
      lastKnownPlayerWagerProgRef.current = savedWagerProg !== null ? Number(savedWagerProg) : 0;
      lastKnownPlayerLossesRef.current = savedLosses !== null ? Number(savedLosses) : 0;

      if (savedTransactions) {
        try {
          initialTransactions = JSON.parse(savedTransactions);
        } catch (e) {
          console.error("Failed to parse transactions", e);
        }
      }
    }

    setChips(initialChips);
    setPeakChips(initialPeak);
    setLoanCount(initialLoans);
    setTransactions(initialTransactions);

    const savedQuests = localStorage.getItem("casino_quests_v3");
    if (savedQuests) {
      try {
        const parsed: Quest[] = JSON.parse(savedQuests);
        const validQuests = parsed
          .filter((q) => q.id !== "quest_vance_loan")
          .map((q) => ({ ...q, reward: 0.40 }));
        setQuests(validQuests);
      } catch (e) {
        setQuests(INITIAL_QUESTS);
      }
    } else {
      setQuests(INITIAL_QUESTS);
    }

    // Tick-tock clock
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    };
    updateTime();
    const clockTimer = setInterval(updateTime, 1000);

    // Initial warm welcome from Vegas Vance
    triggerVanceCommentary("greet");

    return () => clearInterval(clockTimer);
  }, []);

  // Auto popup daily spin wheel after 30 seconds when player first logins, limited to once in 24 hours
  useEffect(() => {
    if (!currentUser) return;

    const lastPopupTime = localStorage.getItem("last_daily_spin_auto_popup");
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (lastPopupTime && (now - Number(lastPopupTime) < oneDayMs)) {
      // Within 24 hours cooldown, do not trigger auto popup
      return;
    }

    const popupTimer = setTimeout(() => {
      // Double check they are still logged in
      const currentSessionUser = localStorage.getItem("casino_user");
      if (currentSessionUser) {
        changeTab("dailyspin");
        if (window.innerWidth < 1024) {
          setIsImmersiveMobile(true);
        }
        localStorage.setItem("last_daily_spin_auto_popup", String(Date.now()));
        triggerVanceCommentary("greet");
      }
    }, 30000); // 30 seconds timer

    return () => clearTimeout(popupTimer);
  }, [currentUser]);

  // 10-second login welcome popup
  useEffect(() => {
    if (currentUser && currentUser.role === "player") {
      setLoginTime(Date.now());
      setShowLoginWelcomePopup(false);

      const timer = setTimeout(() => {
        const currentSessionUser = localStorage.getItem("casino_user");
        if (currentSessionUser) {
          setShowLoginWelcomePopup(true);
          casinoAudio.playWin();
        }
      }, 10000); // 10 seconds post-login

      return () => clearTimeout(timer);
    } else {
      setShowLoginWelcomePopup(false);
      setLoginTime(null);
    }
  }, [currentUser]);

  // Sync state to local storage when changed
  useEffect(() => {
    localStorage.setItem("casino_chips", String(chips));
    localStorage.setItem("casino_loans", String(loanCount));
    if (chips > peakChips) {
      setPeakChips(chips);
      localStorage.setItem("casino_peak_chips", String(chips));
    }
  }, [chips, loanCount, peakChips]);

  useEffect(() => {
    localStorage.setItem("casino_bonus_balance", String(bonusBalance));
  }, [bonusBalance]);

  useEffect(() => {
    localStorage.setItem("casino_total_wager_required", String(totalWagerRequired));
  }, [totalWagerRequired]);

  useEffect(() => {
    localStorage.setItem("casino_current_wager_progress", String(currentWagerProgress));
  }, [currentWagerProgress]);

  useEffect(() => {
    localStorage.setItem("casino_cumulative_losses", String(cumulativeLosses));
  }, [cumulativeLosses]);

  useEffect(() => {
    if (transactions.length > 0) {
      localStorage.setItem("casino_transactions", JSON.stringify(transactions));
    }
  }, [transactions]);

  useEffect(() => {
    if (quests.length > 0) {
      localStorage.setItem("casino_quests_v3", JSON.stringify(quests));
    }
  }, [quests]);

  // Listen for external P2P approvals or admin actions that change player chips in registered_players_v1
  useEffect(() => {
    if (!currentUser || currentUser.role !== "player") return;

    // Load initial player state on login/mount
    const stored = localStorage.getItem("registered_players_v1");
    if (stored) {
      try {
        const playersList: any[] = JSON.parse(stored);
        const pEmail = currentUser.email?.toLowerCase();
        const pPhoneClean = currentUser.phoneNumber?.replace(/\D/g, "");
        const found = playersList.find(p => 
          (pEmail && p.email && p.email.toLowerCase() === pEmail) || 
          (pPhoneClean && p.phoneNumber && p.phoneNumber.replace(/\D/g, "") === pPhoneClean)
        );
        if (found) {
          if (found.chips !== undefined) {
            setChips(found.chips);
            lastKnownPlayerChipsRef.current = found.chips;
          }
          if (found.bonusBalance !== undefined) {
            setBonusBalance(found.bonusBalance);
          }
          if (found.quests && Array.isArray(found.quests) && found.quests.length > 0) {
            setQuests(found.quests);
          } else if (pEmail) {
            const userSavedQuests = localStorage.getItem(`casino_quests_${pEmail}`);
            if (userSavedQuests) {
              try {
                setQuests(JSON.parse(userSavedQuests));
              } catch (e) {}
            }
          }
        }
      } catch (e) {
        console.error("Error loading player chips from registered_players_v1:", e);
      }
    }

    const checkExternalUpdates = () => {
      const storedReqs = localStorage.getItem("registered_players_v1");
      if (!storedReqs) return;

      try {
        const playersList: any[] = JSON.parse(storedReqs);
        const pEmail = currentUser.email?.toLowerCase()?.trim();
        const pPhoneClean = currentUser.phoneNumber?.replace(/\D/g, "");
        const pName = currentUser.name?.toLowerCase()?.trim();
        const found = playersList.find(p => 
          (pEmail && p.email && p.email.toLowerCase().trim() === pEmail) || 
          (pPhoneClean && p.phoneNumber && p.phoneNumber.replace(/\D/g, "") === pPhoneClean) ||
          (pName && p.name && p.name.toLowerCase().trim() === pName)
        );

        if (found) {
          if (found.chips !== undefined) {
            const externalChips = Number(found.chips);
            const currentRef = lastKnownPlayerChipsRef.current;

            // If externalChips differs from our lastKnownPlayerChipsRef, an Agent or Admin updated it!
            if (currentRef === null || externalChips !== currentRef) {
              const diff = currentRef !== null ? externalChips - currentRef : 0;
              lastKnownPlayerChipsRef.current = externalChips;
              setChips(externalChips);
              localStorage.setItem("casino_chips", String(externalChips));

              if (diff > 0) {
                casinoAudio.playWin();
                const newTx: Transaction = {
                  id: `TX-SYNC-${Date.now()}`,
                  type: "reward",
                  amount: diff,
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  description: `Deposit Approved (+${diff.toLocaleString()})`
                };
                setTransactions(prev => [newTx, ...prev]);

                setCustomToast({
                  show: true,
                  title: "🎁 Deposit & Bonus Approved!",
                  message: `+$${diff.toLocaleString()} Cash credited. Match Bonus & 30x Wagering Target synchronized!`,
                  type: "success"
                });
              }
            }
          }

          if (found.bonusBalance !== undefined) {
            const extBonus = Number(found.bonusBalance);
            const currentBonusRef = lastKnownPlayerBonusRef.current;
            if (currentBonusRef === null || extBonus !== currentBonusRef) {
              lastKnownPlayerBonusRef.current = extBonus;
              setBonusBalance(extBonus);
              localStorage.setItem("casino_bonus_balance", String(extBonus));
            }
          }

          if (found.totalWagerRequired !== undefined) {
            const extWager = Number(found.totalWagerRequired);
            const currentWagerRef = lastKnownPlayerWagerReqRef.current;
            if (currentWagerRef === null || extWager !== currentWagerRef) {
              lastKnownPlayerWagerReqRef.current = extWager;
              setTotalWagerRequired(extWager);
              localStorage.setItem("casino_total_wager_required", String(extWager));
            }
          }

          if (found.currentWagerProgress !== undefined) {
            const extProg = Number(found.currentWagerProgress);
            const currentProgRef = lastKnownPlayerWagerProgRef.current;
            if (currentProgRef === null || extProg !== currentProgRef) {
              lastKnownPlayerWagerProgRef.current = extProg;
              setCurrentWagerProgress(extProg);
              localStorage.setItem("casino_current_wager_progress", String(extProg));
            }
          }
        }
      } catch (e) {
        console.error("Error checking external player chip updates:", e);
      }
    };

    const interval = setInterval(checkExternalUpdates, 1000);
    window.addEventListener("storage", checkExternalUpdates);
    window.addEventListener("balance_updated", checkExternalUpdates);
    window.addEventListener("players_updated", checkExternalUpdates);
    window.addEventListener("p2p_state_updated", checkExternalUpdates);
    window.addEventListener("deposit_approved", checkExternalUpdates);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", checkExternalUpdates);
      window.removeEventListener("balance_updated", checkExternalUpdates);
      window.removeEventListener("players_updated", checkExternalUpdates);
      window.removeEventListener("p2p_state_updated", checkExternalUpdates);
      window.removeEventListener("deposit_approved", checkExternalUpdates);
    };
  }, [currentUser]);

  // Sync current logged in player's chips/peakChips/loanCount/transactions back to the master list in registered_players_v1
  useEffect(() => {
    if (currentUser && currentUser.role === "player") {
      const stored = localStorage.getItem("registered_players_v1");
      if (stored) {
        try {
          const playersList: any[] = JSON.parse(stored);
          const pEmail = currentUser.email?.toLowerCase()?.trim();
          const pPhoneClean = currentUser.phoneNumber?.replace(/\D/g, "");
          const pName = currentUser.name?.toLowerCase()?.trim();

          const found = playersList.find(p => 
            (pEmail && p.email && p.email.toLowerCase().trim() === pEmail) || 
            (pPhoneClean && p.phoneNumber && p.phoneNumber.replace(/\D/g, "") === pPhoneClean) ||
            (pName && p.name && p.name.toLowerCase().trim() === pName)
          );

          // If external balance in store was credited higher than our local chips, do NOT overwrite it!
          if (found && found.chips !== undefined && Number(found.chips) > chips) {
            setChips(Number(found.chips));
            lastKnownPlayerChipsRef.current = Number(found.chips);
            return;
          }

          // Keep lastKnownPlayerChipsRef aligned with local state changes
          lastKnownPlayerChipsRef.current = chips;
          
          let changed = false;
          const updatedPlayers = playersList.map(p => {
            const isMatch = (pEmail && p.email && p.email.toLowerCase().trim() === pEmail) || 
                            (pPhoneClean && p.phoneNumber && p.phoneNumber.replace(/\D/g, "") === pPhoneClean) ||
                            (pName && p.name && p.name.toLowerCase().trim() === pName);
            if (isMatch) {
              if (p.chips !== chips || 
                  p.bonusBalance !== bonusBalance ||
                  p.totalWagerRequired !== totalWagerRequired ||
                  p.currentWagerProgress !== currentWagerProgress ||
                  p.cumulativeLosses !== cumulativeLosses ||
                  p.peakChips !== peakChips || 
                  p.loanCount !== loanCount || 
                  JSON.stringify(p.transactions) !== JSON.stringify(transactions)) {
                changed = true;
                return {
                  ...p,
                  chips,
                  bonusBalance,
                  totalWagerRequired,
                  currentWagerProgress,
                  cumulativeLosses,
                  peakChips,
                  loanCount,
                  transactions
                };
              }
            }
            return p;
          });
          
          if (changed) {
            localStorage.setItem("registered_players_v1", JSON.stringify(updatedPlayers));
            const updatedMe = updatedPlayers.find(p => 
              (pEmail && p.email && p.email.toLowerCase().trim() === pEmail) || 
              (pPhoneClean && p.phoneNumber && p.phoneNumber.replace(/\D/g, "") === pPhoneClean) ||
              (pName && p.name && p.name.toLowerCase().trim() === pName)
            );
            if (updatedMe) {
              savePlayerToDatabase(updatedMe);
            }
          }
        } catch (e) {
          console.error("Error updating player in registered_players_v1 list:", e);
        }
      }
    }
  }, [currentUser, chips, bonusBalance, cumulativeLosses, peakChips, loanCount, transactions]);

  const updateQuestProgress = (category: Quest["category"], valToAdd: number = 1, isAbsolute: boolean = false) => {
    setQuests((prevQuests) => {
      const updated = prevQuests.map((quest) => {
        if (quest.claimed) return quest;
        if (quest.category === category) {
          const prevCompleted = quest.current >= quest.target;
          let nextVal = quest.current;
          
          if (category === "crash") {
            // valToAdd is the crash flight multiplier
            if (valToAdd >= 2.50) {
              nextVal = Math.min(quest.target, quest.current + 1);
            }
          } else {
            nextVal = Math.min(quest.target, isAbsolute ? valToAdd : quest.current + valToAdd);
          }
          
          const nextCompleted = nextVal >= quest.target;
          
          if (!prevCompleted && nextCompleted) {
            // Trigger mission completed popup!
            setTimeout(() => {
              setShowQuestCompletedPopup(quest);
              casinoAudio.playWin();
            }, 300);
          }
          
          return { ...quest, current: nextVal };
        }
        return quest;
      });

      // Save user-scoped quest progress for global persistence
      if (currentUser?.email) {
        localStorage.setItem(`casino_quests_${currentUser.email.toLowerCase()}`, JSON.stringify(updated));
      }
      localStorage.setItem("casino_quests_v3", JSON.stringify(updated));

      return updated;
    });
  };

  const recordGameQuestProgression = (historyMsg: string, extraVal?: number) => {
    const raw = `${activeTab} ${activeLauncherGame?.id || ""} ${activeLauncherGame?.name || ""} ${historyMsg}`.toLowerCase();
    
    if (raw.includes("blackjack") || raw.includes("21") || raw.includes("dealer")) {
      updateQuestProgress("blackjack", 1);
    } else if (raw.includes("roulette") || raw.includes("crazy time") || raw.includes("monopoly") || raw.includes("wheel")) {
      updateQuestProgress("roulette", 1);
    } else if (raw.includes("poker") || raw.includes("baccarat") || raw.includes("teen patti") || raw.includes("rummy") || raw.includes("callbreak") || raw.includes("dragon tiger") || raw.includes("sic bo") || raw.includes("hi-lo") || raw.includes("coin flip") || raw.includes("hilo") || raw.includes("coinflip") || raw.includes("ludo")) {
      updateQuestProgress("videopoker", 1);
    } else if (raw.includes("crash") || raw.includes("rocket") || raw.includes("chicken") || raw.includes("frog") || raw.includes("dash") || raw.includes("plinko") || raw.includes("mines")) {
      if (extraVal !== undefined) {
        updateQuestProgress("crash", extraVal);
      } else {
        const match = historyMsg.match(/(\d+(\.\d+)?)x/i);
        const mult = match ? parseFloat(match[1]) : 1;
        updateQuestProgress("crash", mult);
      }
    } else {
      // Default to slots for slot games, reels, spins, or general casino game play
      updateQuestProgress("slots", 1);
    }
  };

  const handleClaimQuestReward = (questId: string) => {
    setQuests((prevQuests) => {
      const q = prevQuests.find((x) => x.id === questId);
      if (!q || q.current < q.target || q.claimed) return prevQuests;

      setChips((prev) => prev + q.reward);
      casinoAudio.playWin();

      const newTx: Transaction = {
        id: Math.random().toString(36).substring(2, 9),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        amount: q.reward,
        description: `Claimed milestone: ${q.title}`,
        type: "reward",
      };
      setTransactions((prev) => [newTx, ...prev].slice(0, 50));

      return prevQuests.map((quest) => {
        if (quest.id === questId) {
          return { ...quest, claimed: true };
        }
        return quest;
      });
    });
  };

  const handleClaimAllMissionsBonus = () => {
    if (allMissionsBonusClaimed) return;
    setChips((prev) => prev + 2);
    setAllMissionsBonusClaimed(true);
    localStorage.setItem("casino_all_missions_bonus_v2", "true");
    casinoAudio.playWin();
    const newTx: Transaction = {
      id: Math.random().toString(36).substring(2, 9),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      amount: 2,
      description: "Claimed $2.00 USDT All-Missions Completion Bonus",
      type: "reward",
    };
    setTransactions((prev) => [newTx, ...prev].slice(0, 50));
    addAuditLog(`CLAIMED BONUS: All Daily Missions Completed ($2.00 USDT Bonus)`, "success");
  };

  const handleResetQuests = () => {
    setQuests(INITIAL_QUESTS);
    setAllMissionsBonusClaimed(false);
    localStorage.setItem("casino_quests_v2", JSON.stringify(INITIAL_QUESTS));
    localStorage.removeItem("casino_all_missions_bonus_v2");
  };

  const persistPlayerState = (updates: {
    chips?: number;
    bonusBalance?: number;
    totalWagerRequired?: number;
    currentWagerProgress?: number;
    cumulativeLosses?: number;
    peakChips?: number;
    loanCount?: number;
    transactions?: Transaction[];
  }) => {
    if (updates.chips !== undefined) {
      lastKnownPlayerChipsRef.current = updates.chips;
      localStorage.setItem("casino_chips", String(updates.chips));
    }
    if (updates.bonusBalance !== undefined) {
      lastKnownPlayerBonusRef.current = updates.bonusBalance;
      localStorage.setItem("casino_bonus_balance", String(updates.bonusBalance));
    }
    if (updates.totalWagerRequired !== undefined) {
      lastKnownPlayerWagerReqRef.current = updates.totalWagerRequired;
      localStorage.setItem("casino_total_wager_required", String(updates.totalWagerRequired));
    }
    if (updates.currentWagerProgress !== undefined) {
      lastKnownPlayerWagerProgRef.current = updates.currentWagerProgress;
      localStorage.setItem("casino_current_wager_progress", String(updates.currentWagerProgress));
    }
    if (updates.cumulativeLosses !== undefined) {
      lastKnownPlayerLossesRef.current = updates.cumulativeLosses;
      localStorage.setItem("casino_cumulative_losses", String(updates.cumulativeLosses));
    }

    if (currentUser && currentUser.role === "player") {
      const stored = localStorage.getItem("registered_players_v1");
      if (stored) {
        try {
          const playersList: any[] = JSON.parse(stored);
          const pEmail = currentUser.email?.toLowerCase();
          const pPhoneClean = currentUser.phoneNumber?.replace(/\D/g, "");
          const index = playersList.findIndex(p => 
            (pEmail && p.email && p.email.toLowerCase() === pEmail) || 
            (pPhoneClean && p.phoneNumber && p.phoneNumber.replace(/\D/g, "") === pPhoneClean)
          );
          if (index >= 0) {
            const updatedPlayer = {
              ...playersList[index],
              ...(updates.chips !== undefined ? { chips: updates.chips } : {}),
              ...(updates.bonusBalance !== undefined ? { bonusBalance: updates.bonusBalance } : {}),
              ...(updates.totalWagerRequired !== undefined ? { totalWagerRequired: updates.totalWagerRequired } : {}),
              ...(updates.currentWagerProgress !== undefined ? { currentWagerProgress: updates.currentWagerProgress } : {}),
              ...(updates.cumulativeLosses !== undefined ? { cumulativeLosses: updates.cumulativeLosses } : {}),
              ...(updates.peakChips !== undefined ? { peakChips: updates.peakChips } : {}),
              ...(updates.loanCount !== undefined ? { loanCount: updates.loanCount } : {}),
              ...(updates.transactions !== undefined ? { transactions: updates.transactions } : {}),
            };
            playersList[index] = updatedPlayer;
            localStorage.setItem("registered_players_v1", JSON.stringify(playersList));
            savePlayerToDatabase(updatedPlayer);
          }
        } catch (e) {
          console.error("Error updating player in registered_players_v1:", e);
        }
      }
    }
  };

  const awardBonusFunds = (bonusAmount: number, sourceName: string) => {
    if (bonusAmount <= 0) return;
    const addedWager = bonusAmount * 30;

    const nextBonus = bonusBalance + bonusAmount;
    const nextWager = totalWagerRequired + addedWager;

    setBonusBalance(nextBonus);
    setTotalWagerRequired(nextWager);

    addAuditLog(`🎁 BONUS AWARDED: ${bonusAmount.toFixed(2)} added to Locked Bonus Balance from [${sourceName}]. +${addedWager.toFixed(2)} (30x) added to Wagering Requirement.`, "success");

    const newTx: Transaction = {
      id: Math.random().toString(36).substring(2, 9),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      amount: bonusAmount,
      description: `Bonus Received (${sourceName}) - 30x Wager Required (${addedWager.toFixed(2)})`,
      type: "reward",
    };
    const updatedTxs = [newTx, ...transactions].slice(0, 50);
    setTransactions(updatedTxs);

    persistPlayerState({
      bonusBalance: nextBonus,
      totalWagerRequired: nextWager,
      transactions: updatedTxs
    });

    setCustomToast({
      show: true,
      title: "🎁 Bonus Funds Received (30x)",
      message: `${bonusAmount.toFixed(2)} Bonus added to Locked Balance! ${addedWager.toFixed(2)} (30x) added to Wagering Requirement.`,
      type: "info"
    });
    casinoAudio.playWin();
  };

  const handleAwardChips = (amount: number, description: string) => {
    const nextChips = chips + amount;
    setChips(nextChips);
    setTotalWonSession((prev) => prev + amount);
    addAuditLog(`CLAIMED BONUS: ${description} (${amount.toLocaleString()})`, "success");
    const newTx: Transaction = {
      id: Math.random().toString(36).substring(2, 9),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      amount,
      description,
      type: "reward",
    };
    const updatedTxs = [newTx, ...transactions].slice(0, 50);
    setTransactions(updatedTxs);

    persistPlayerState({
      chips: nextChips,
      peakChips: Math.max(peakChips, nextChips),
      transactions: updatedTxs
    });
  };

  // Request VIP Host commentary
  const triggerVanceCommentary = async (promptType: "greet" | "spin" | "win" | "lose" | "loan" | "bankrupt" | "strategy") => {
    setCommentaryState((prev) => ({ ...prev, loading: true }));

    const activeTabName = {
      lobby: "Casino Lobby",
      slots: "Cosmic Reels Slots",
      blackjack: "Vegas Blackjack Table",
      roulette: "Roulette Floor",
      dailyspin: "Vegas Daily Spin Wheel",
      stats: "Banking and Ledgers",
      videopoker: "Video Poker High-Voltage Station",
      crash: "Neon Crash & Turbo Rocket Station",
    }[activeTab];

    const currentGameState = {
      chips,
      activeGame: activeTabName,
      consecutiveLosses: lossesStreak,
      totalWon: totalWonSession,
      loanCount,
      history: transactions.map((t) => t.description),
    };

    try {
      const res = await fetch("/api/host/commentary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameState: currentGameState,
          promptType,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as any;
        setCommentaryState({
          commentary: data.commentary,
          tips: data.tips,
          hostMood: data.hostMood as HostMood,
          loading: false,
        });
        if (!isVanceOpen) {
          setHasNewVanceCommentary(true);
        }
        return;
      }
    } catch {
      // Static host fallback (e.g. Cloudflare Pages static SPA without Node backend)
    }

    // High-fidelity instant local host intelligence
    const offlineCommentaries: Record<string, { commentary: string; tips: string; hostMood: HostMood }> = {
      spin_win: {
        commentary: "Unbelievable timing! That payout just set the room on fire. Keep your head cool and watch the momentum.",
        tips: "Lock in a percentage of profits before stepping up your stake size.",
        hostMood: "enthusiastic",
      },
      spin_loss: {
        commentary: "Tough beat on that round, but variance is part of the long game. Reset your focus.",
        tips: "Consider a flat-bet strategy for the next 3 spins to stabilize your session.",
        hostMood: "encouraging",
      },
      high_roller: {
        commentary: "VIP stakes detected. High risk, maximum reward. Vance is keeping a close eye on this run.",
        tips: "Maintain strict stop-loss thresholds when riding volatility waves.",
        hostMood: "dramatic",
      },
      general: {
        commentary: "Welcome to the VIP high-limit floor. May luck favor your boldest bets today.",
        tips: "Review game statistics and RTP trends in the analytics panel.",
        hostMood: "suave",
      },
    };

    const fallback = offlineCommentaries[promptType] || offlineCommentaries.general;
    setCommentaryState({
      commentary: fallback.commentary,
      tips: fallback.tips,
      hostMood: fallback.hostMood,
      loading: false,
    });
    if (!isVanceOpen) {
      setHasNewVanceCommentary(true);
    }
  };

  const handleClaimMegaWin = (amount: number, isWin: boolean = true) => {
    // Deduct entry fee ($100)
    setChips((prev) => Math.max(0, prev - 100));

    // Register user to playedPlayers list
    const playerEmail = currentUser?.email?.toLowerCase() || "anonymous";
    const playerName = currentUser?.name || "VIP Player";

    setMegaWinState((prev: any) => {
      if (!prev) return prev;
      const updatedPlayedPlayers = [...(prev.playedPlayers || [])];
      if (!updatedPlayedPlayers.includes(playerEmail)) {
        updatedPlayedPlayers.push(playerEmail);
      }
      const updated = {
        ...prev,
        playedPlayers: updatedPlayedPlayers,
        ...(isWin ? { isClaimed: true } : {})
      };
      localStorage.setItem("casino_mega_win_strategy_v1", JSON.stringify(updated));
      return updated;
    });

    if (isWin) {
      casinoAudio.playWin();
      setChips((prev) => prev + amount);
      setTotalWonSession((prev) => prev + amount);
      setLossesStreak(0);

      setActiveCelebration({
        id: Math.random().toString(),
        amount
      });

      addAuditLog(`MEGA WIN STRATEGY: $10,000 Mega Win successfully cracked and claimed by player: ${playerName}`, "success");

      const newTx: Transaction = {
        id: Math.random().toString(36).substring(2, 9),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        amount,
        description: `Claimed $${amount.toLocaleString()} VIP Mega Win`,
        type: "win",
      };
      setTransactions((prev) => [newTx, ...prev].slice(0, 50));
      triggerVanceCommentary("win");
    } else {
      // Loss: Forfeit the 100 USDT and add to house pool
      setHousePool((prev) => prev + 100);
      addAuditLog(`MEGA WIN STRATEGY: Player ${playerName} paid $100 decryption attempt fee. DECRYPTION FAILED: Forfeited to house pool.`, "info");

      const newTx: Transaction = {
        id: Math.random().toString(36).substring(2, 9),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        amount: 100,
        description: `Decryption Fee Forfeited ($100)`,
        type: "lose",
      };
      setTransactions((prev) => [newTx, ...prev].slice(0, 50));
      triggerVanceCommentary("lose");
    }
  };

  const handleWin = (amount: number, historyMsg: string, extraVal?: number) => {
    let finalAmount = amount;
    
    // High-stakes win capping is disabled under play-anytime VIP guidelines
    finalAmount = amount;

    casinoAudio.playWin();
    const nextChips = chips + finalAmount;
    setChips(nextChips);
    setTotalWonSession((prev) => {
      const nextTotal = prev + finalAmount;
      localStorage.setItem("casino_session_net_wins", nextTotal.toString());
      return nextTotal;
    });
    setLossesStreak(0);

    if (finalAmount >= 100) {
      setActiveCelebration({
        id: Math.random().toString(),
        amount: finalAmount
      });
    }

    setHousePool((prev) => Math.max(0, prev - finalAmount));
    addAuditLog(`PLAYER: Win payout of ${finalAmount} credited on [${activeTab.toUpperCase()}] (${historyMsg})`, "warning");

    // Check if wagering requirement unlocked
    let nextBonusBal = bonusBalance;
    let nextWagerReq = totalWagerRequired;
    let nextWagerProg = currentWagerProgress;
    let finalRealChips = nextChips;

    if (totalWagerRequired > 0 && currentWagerProgress >= totalWagerRequired && bonusBalance > 0) {
      const bonusToConvert = bonusBalance;
      finalRealChips = nextChips + bonusToConvert;
      nextBonusBal = 0;
      nextWagerReq = 0;
      nextWagerProg = 0;

      setBonusBalance(0);
      setChips(finalRealChips);
      setTotalWagerRequired(0);
      setCurrentWagerProgress(0);

      setCustomToast({
        show: true,
        title: "🎉 Wagering Requirement Complete!",
        message: `Congratulations! Your 30x wagering requirement is complete. $${bonusToConvert.toFixed(2)} Bonus converted to Real Cash!`,
        type: "success"
      });
      addAuditLog(`🎉 WAGERING COMPLETED: $${bonusToConvert.toFixed(2)} Bonus converted to Real Cash!`, "success");
    }

    const newTx: Transaction = {
      id: Math.random().toString(36).substring(2, 9),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      amount: finalAmount,
      description: historyMsg,
      type: "win",
    };
    const updatedTxs = [newTx, ...transactions].slice(0, 50);
    setTransactions(updatedTxs);

    persistPlayerState({
      chips: finalRealChips,
      bonusBalance: nextBonusBal,
      totalWagerRequired: nextWagerReq,
      currentWagerProgress: nextWagerProg,
      peakChips: Math.max(peakChips, finalRealChips),
      transactions: updatedTxs
    });

    // Telemetry Activity Log & Game Stats
    logPlayerActivity({
      playerId: currentUser?.email || "Local Player",
      playerName: currentUser?.name || "Player",
      type: "gameplay",
      gameName: activeTab.toUpperCase(),
      gameId: activeTab,
      action: `Won ${finalAmount.toLocaleString()} (${historyMsg})`,
      amount: finalAmount,
      outcome: "win"
    });
    recordGameStats(activeTab, 0, finalAmount);

    // Quest Progression
    recordGameQuestProgression(historyMsg, extraVal);
  };

  const handleLose = (amount: number, historyMsg: string, extraVal?: number) => {
    casinoAudio.playLose();

    // 1. Deposit-First Model: Bets are deducted strictly from Main Real Balance (chips)
    // Bonus funds remain safely locked in the Bonus Vault and are wagered towards completion.
    const nextRealBal = Math.max(0, chips - amount);
    let nextBonusBal = bonusBalance;
    let nextWagerReq = totalWagerRequired;
    let nextWagerProg = currentWagerProgress + amount;

    setLossesStreak((prev) => prev + 1);
    setHousePool((prev) => prev + amount);
    addAuditLog(`PLAYER: Placed bet of ${amount} on [${activeTab.toUpperCase()}] (${historyMsg})`, "info");

    // 3. Auto-Unlock & Cash Conversion Check when 30x wagering target is achieved
    if (totalWagerRequired > 0 && nextWagerProg >= totalWagerRequired && nextBonusBal > 0) {
      const remainingBonusToConvert = nextBonusBal;
      const convertedRealBal = nextRealBal + remainingBonusToConvert;
      nextBonusBal = 0;
      nextWagerReq = 0;
      nextWagerProg = 0;

      setCustomToast({
        show: true,
        title: "🎉 Wagering Requirement Complete!",
        message: `Congratulations! Your 30x wagering requirement is complete. $${remainingBonusToConvert.toFixed(2)} Bonus converted to Real Cash!`,
        type: "success"
      });

      addAuditLog(`🎉 WAGERING COMPLETED: $${remainingBonusToConvert.toFixed(2)} Locked Bonus converted into Real Cash Balance!`, "success");
      casinoAudio.playWin();

      setBonusBalance(0);
      setChips(convertedRealBal);
      setTotalWagerRequired(0);
      setCurrentWagerProgress(0);

      // Track cumulative loss towards $70 minimum threshold
      const nextLoss = cumulativeLosses + amount;
      let finalLosses = nextLoss;
      if (nextLoss >= 70) {
        const milestones = Math.floor(nextLoss / 70);
        finalLosses = nextLoss % 70;
        const bonusReward = milestones * 14;
        setCumulativeLosses(finalLosses);
        awardBonusFunds(bonusReward, "20% Loss Recovery Instant Cashback");
      } else {
        setCumulativeLosses(nextLoss);
      }

      const newTx: Transaction = {
        id: Math.random().toString(36).substring(2, 9),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        amount,
        description: historyMsg,
        type: "lose",
      };
      const updatedTxs = [newTx, ...transactions].slice(0, 50);
      setTransactions(updatedTxs);

      persistPlayerState({
        chips: convertedRealBal,
        bonusBalance: 0,
        totalWagerRequired: 0,
        currentWagerProgress: 0,
        cumulativeLosses: finalLosses,
        transactions: updatedTxs
      });
      return;
    }

    setBonusBalance(nextBonusBal);
    setChips(nextRealBal);
    setTotalWagerRequired(nextWagerReq);
    setCurrentWagerProgress(nextWagerProg);

    // 4. Track cumulative loss towards $70 minimum threshold for 20% ($14) instant cashback
    const nextLoss = cumulativeLosses + amount;
    let finalLosses = nextLoss;
    if (nextLoss >= 70) {
      const milestones = Math.floor(nextLoss / 70);
      finalLosses = nextLoss % 70;
      const bonusReward = milestones * 14;

      setCumulativeLosses(finalLosses);
      awardBonusFunds(bonusReward, "20% Loss Recovery Instant Cashback");
    } else {
      setCumulativeLosses(nextLoss);
    }

    const newTx: Transaction = {
      id: Math.random().toString(36).substring(2, 9),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      amount,
      description: historyMsg,
      type: "lose",
    };
    const updatedTxs = [newTx, ...transactions].slice(0, 50);
    setTransactions(updatedTxs);

    persistPlayerState({
      chips: nextRealBal,
      bonusBalance: nextBonusBal,
      totalWagerRequired: nextWagerReq,
      currentWagerProgress: nextWagerProg,
      cumulativeLosses: finalLosses,
      transactions: updatedTxs
    });

    // Telemetry Activity Log & Game Stats
    logPlayerActivity({
      playerId: currentUser?.email || "Local Player",
      playerName: currentUser?.name || "Player",
      type: "gameplay",
      gameName: activeTab.toUpperCase(),
      gameId: activeTab,
      action: `Placed ${amount.toLocaleString()} bet / Lost (${historyMsg})`,
      amount,
      outcome: "lose"
    });
    recordGameStats(activeTab, amount, 0);

    // Check if player goes bankrupt
    if (nextRealBal + nextBonusBal <= 0) {
      triggerVanceCommentary("bankrupt");
    }

    // Quest Progression
    recordGameQuestProgression(historyMsg, extraVal);
  };

  const handleTakeLoan = () => {
    casinoAudio.playChipClink();
    const nextChips = chips + 500;
    const nextLoanCount = loanCount + 1;
    setChips(nextChips);
    setLoanCount(nextLoanCount);
    setLossesStreak(0);

    addAuditLog(`PLAYER: Signed a $500 emergency loan agreement with Host Vegas Vance`, "warning");

    const newTx: Transaction = {
      id: Math.random().toString(36).substring(2, 9),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      amount: 500,
      description: "Signed $500 Vegas Vance emergency chip ledger",
      type: "loan",
    };
    const updatedTxs = [newTx, ...transactions].slice(0, 50);
    setTransactions(updatedTxs);
    
    persistPlayerState({
      chips: nextChips,
      loanCount: nextLoanCount,
      transactions: updatedTxs
    });

    triggerVanceCommentary("loan");

    // Quest Progression
    updateQuestProgress("other", 1);
  };

  const handlePaybackLoan = () => {
    if (chips < 500 || loanCount === 0) return;
    casinoAudio.playChipClink();
    setChips((prev) => prev - 500);
    setLoanCount((prev) => prev - 1);

    addAuditLog(`PLAYER: Repaid $500 loan back to Vegas Vance bank ledger`, "success");

    const newTx: Transaction = {
      id: Math.random().toString(36).substring(2, 9),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      amount: 500,
      description: "Repaid $500 bank loan",
      type: "lose", // treated as outbound payout
    };
    setTransactions((prev) => [newTx, ...prev].slice(0, 50));
    triggerVanceCommentary("strategy");
  };

  const handleClaimReferralRewards = (amount: number) => {
    if (amount <= 0) return;
    awardBonusFunds(amount, "Referral Rewards");
    triggerVanceCommentary("win");
  };

  const handleLaunchGame = (gameId: string, category: string = "all", gameName: string = "Vegas Live Game") => {
    if (chips <= 0) {
      setShowDepositRequiredModal(true);
      casinoAudio.playClick();
      return;
    }
    setActiveLauncherGame({ id: gameId, name: gameName });
    changeTab("game_launcher");
  };

  const handlePlayInstantWin = (amount: number, isWin: boolean, msg: string) => {
    if (isWin) {
      handleWin(amount, msg);
    } else {
      handleLose(amount, msg);
    }
  };

  const handleLoginSuccess = (user: CurrentUser) => {
    // 1. Supabase & Local Session Persistence with role-based duration:
    // - 7 days for 'player' role
    // - 3 days for staff roles ('super_admin', 'sub_admin', 'agent')
    const sessionUser = saveUserSessionWithPersistence(user);
    setCurrentUser(sessionUser);

    if (user.role === "player") {
      // Find their profile in registered_players_v1
      const stored = localStorage.getItem("registered_players_v1");
      if (stored) {
        try {
          const playersList: any[] = JSON.parse(stored);
          const pEmail = user.email?.toLowerCase();
          const pPhoneClean = user.phoneNumber?.replace(/\D/g, "");
          
          const found = playersList.find(p => 
            (pEmail && p.email && p.email.toLowerCase() === pEmail) || 
            (pPhoneClean && p.phoneNumber && p.phoneNumber.replace(/\D/g, "") === pPhoneClean)
          );
          
          if (found) {
            // Found saved profile! Restore chips, peakChips, loanCount, transactions, wagering
            const restoredChips = found.chips !== undefined ? found.chips : 0;
            const restoredBonus = found.bonusBalance !== undefined ? found.bonusBalance : 200;
            const restoredPeak = found.peakChips !== undefined ? found.peakChips : restoredChips;
            const restoredLoans = found.loanCount !== undefined ? found.loanCount : 0;
            const restoredWagerReq = found.totalWagerRequired !== undefined ? found.totalWagerRequired : (restoredBonus * 30);
            const restoredWagerProg = found.currentWagerProgress !== undefined ? found.currentWagerProgress : 0;
            const restoredLosses = found.cumulativeLosses !== undefined ? found.cumulativeLosses : 0;
            
            setChips(restoredChips);
            setBonusBalance(restoredBonus);
            setPeakChips(restoredPeak);
            setLoanCount(restoredLoans);
            setTotalWagerRequired(restoredWagerReq);
            setCurrentWagerProgress(restoredWagerProg);
            setCumulativeLosses(restoredLosses);
            
            lastKnownPlayerChipsRef.current = restoredChips;
            lastKnownPlayerBonusRef.current = restoredBonus;
            lastKnownPlayerWagerReqRef.current = restoredWagerReq;
            lastKnownPlayerWagerProgRef.current = restoredWagerProg;
            lastKnownPlayerLossesRef.current = restoredLosses;

            localStorage.setItem("casino_chips", String(restoredChips));
            localStorage.setItem("casino_bonus_balance", String(restoredBonus));
            localStorage.setItem("casino_peak_chips", String(restoredPeak));
            localStorage.setItem("casino_loans", String(restoredLoans));
            localStorage.setItem("casino_total_wager_required", String(restoredWagerReq));
            localStorage.setItem("casino_current_wager_progress", String(restoredWagerProg));
            localStorage.setItem("casino_cumulative_losses", String(restoredLosses));
            
            if (found.transactions) {
              setTransactions(found.transactions);
              localStorage.setItem("casino_transactions", JSON.stringify(found.transactions));
            } else {
              setTransactions([]);
              localStorage.removeItem("casino_transactions");
            }
          } else {
            // Fallback for new player account
            setChips(0);
            setBonusBalance(200);
            setTotalWagerRequired(6000);
            setCurrentWagerProgress(0);
            setCumulativeLosses(0);
            setPeakChips(0);
            setLoanCount(0);
            setTransactions([]);
            
            lastKnownPlayerChipsRef.current = 0;
            lastKnownPlayerBonusRef.current = 200;
            lastKnownPlayerWagerReqRef.current = 6000;
            lastKnownPlayerWagerProgRef.current = 0;
            lastKnownPlayerLossesRef.current = 0;

            localStorage.setItem("casino_chips", "0");
            localStorage.setItem("casino_bonus_balance", "200");
            localStorage.setItem("casino_total_wager_required", "6000");
            localStorage.setItem("casino_current_wager_progress", "0");
            localStorage.setItem("casino_cumulative_losses", "0");
            localStorage.setItem("casino_peak_chips", "0");
            localStorage.setItem("casino_loans", "0");
            localStorage.removeItem("casino_transactions");
          }
        } catch (e) {
          console.error(e);
        }
      }
    }

    // 2. Role-based redirect routing after successful authentication:
    // - 'super_admin' -> '/admin'
    // - 'sub_admin' -> '/sub-admin'
    // - 'agent' -> '/agent'
    // - 'player' -> '/lobby'
    const roleNorm = (user.role || "player").toLowerCase().replace(/[-_]/g, "");
    if (roleNorm === "superadmin" || roleNorm === "admin") {
      window.history.pushState({ role: "super_admin", tab: "admin" }, "", "/admin");
      setActiveTab("admin");
    } else if (roleNorm === "subadmin") {
      window.history.pushState({ role: "sub_admin", tab: "sub-admin" }, "", "/sub-admin");
      setActiveTab("admin");
    } else if (roleNorm === "agent") {
      window.history.pushState({ role: "agent", tab: "agent" }, "", "/agent");
      setActiveTab("lobby");
    } else {
      window.history.pushState({ role: "player", tab: "lobby" }, "", "/lobby");
      setActiveTab("lobby");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("casino_user");
    localStorage.removeItem("supabase_auth_session_expiry");
    setCurrentUser(null);
    window.history.pushState(null, "", "/");
    setActiveTab("lobby");

    // Reset back to defaults for clean state on logout
    setChips(0);
    setBonusBalance(200);
    setPeakChips(0);
    setLoanCount(0);
    setTransactions([]);

    localStorage.setItem("casino_chips", "0");
    localStorage.setItem("casino_bonus_balance", "200");
    localStorage.setItem("casino_peak_chips", "0");
    localStorage.setItem("casino_loans", "0");
    localStorage.removeItem("casino_transactions");

    casinoAudio.playClick();
  };

  // When tab is changed, trigger smooth host greetings or game strategy
  const changeTab = (tab: GameType) => {
    casinoAudio.playClick();
    if (tab === "lobby") {
      setActiveLauncherGame(null);
      setSelectedLiveGameInfo(null);
      setIsFloorRulesOpen(false);
      setIsVanceOpen(false);
      if (window.history.state && !window.history.state.isVegasLobby) {
        window.history.replaceState({ isVegasLobby: true, tab: "lobby" }, "", window.location.href);
      }
    }
    setActiveTab(tab);
    
    const superGames = ["slots", "blackjack", "roulette", "videopoker", "crash", "plinko", "mines", "baccarat", "highlow"];
    if (superGames.includes(tab)) {
      setIsSuperGamesExpanded(true);
    } else {
      setIsSuperGamesExpanded(false);
    }

    if (tab === "lobby") {
      triggerVanceCommentary("greet");
    } else {
      triggerVanceCommentary("strategy");
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-fuchsia-500 selection:text-white relative">
        {/* Absolute Neon Ambient Background blur */}
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 h-96 w-96 rounded-full bg-fuchsia-500/10 blur-3xl pointer-events-none" />
        <div className="flex-1 flex items-center justify-center">
          <LoginScreen onLoginSuccess={handleLoginSuccess} onAddAuditLog={addAuditLog} />
        </div>
        {/* Global Floating Community Chat */}
        <GlobalFloatingChat currentUser={null} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-100 flex flex-col font-sans selection:bg-fuchsia-500 selection:text-white overflow-x-hidden w-full max-w-full relative bg-cyber-grid bg-radial-ambient">
      {/* High-Tech Cyber Ambient Neon Glow Orbs */}
      <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute top-1/3 right-1/4 h-[500px] w-[500px] rounded-full bg-fuchsia-600/10 blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 left-1/3 h-[400px] w-[400px] rounded-full bg-amber-500/10 blur-[100px] pointer-events-none" />

      {/* Immersive Mobile Mode top HUD */}
      {isImmersiveMobile && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 inset-x-0 z-40 bg-[#080B10]/95 border-b border-amber-500/30 backdrop-blur-md px-4 py-2 flex justify-between items-center shadow-lg scanline-effect"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-black uppercase text-amber-300 tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-spin" />
              {activeTab === "videopoker" ? "♠ Video Poker" : activeTab === "slots" ? "🎰 Slots" : activeTab === "blackjack" ? "🃏 Blackjack" : activeTab === "roulette" ? "🔴 Roulette" : activeTab === "crash" ? "🚀 Crash" : activeTab === "plinko" ? "🔵 Plinko" : activeTab === "mines" ? "💣 Mines" : activeTab === "baccarat" ? "👑 Baccarat" : activeTab === "highlow" ? "🃏 High-Low" : activeTab === "lobby" ? "Lobby" : activeTab === "dailyspin" ? "Daily Spin" : "Banker"}
            </span>
            <span className="text-[9px] bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1">
              <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-ping" />
              IMMERSIVE HUD
            </span>
          </div>
          
          <div className="flex items-center gap-2.5">
            {/* Mini chips counter */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0d131f] border border-amber-500/40 shadow-inner">
              <Coins className="h-3.5 w-3.5 text-amber-400 animate-bounce" />
              <AnimatedChipsCounter value={chips} className="font-mono text-xs font-black text-amber-300" />
            </div>
            
            {/* Restore Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsImmersiveMobile(false);
                casinoAudio.playClick();
              }}
              className="px-2.5 py-1 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-mono text-[10px] font-black rounded-lg shadow-md transition-all cursor-pointer active:scale-95 uppercase tracking-wider"
            >
              Show Tabs
            </button>
          </div>
        </motion.div>
      )}

      {/* Mobile Glassmorphic Status Header */}
      {!isImmersiveMobile && (
        <MobileHeader
          chips={chips}
          bonusBalance={bonusBalance}
          currentUser={currentUser}
          onOpenDeposit={() => changeTab("stats")}
          onLogout={handleLogout}
          isSfxMuted={isSfxMuted}
          onToggleSfx={toggleSfx}
          onOpenFloorRules={() => {
            setFloorRulesTab("house");
            setIsFloorRulesOpen(true);
          }}
          onOpenMenu={() => setIsMobileMenuOpen(true)}
          onOpenVanceAi={() => setIsVanceOpen(true)}
        />
      )}

      {/* Main Desktop Header */}
      {!isImmersiveMobile && (
        <header className="hidden lg:block border-b border-slate-800/80 bg-[#080B10]/90 backdrop-blur-xl sticky top-0 z-40 shadow-[0_4px_30px_rgba(0,0,0,0.8)] scanline-effect">
          <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-col sm:flex-row justify-between items-center gap-4">
            
            {/* Logo & Title Row with User Profile nested on mobile to save height */}
            <div className="flex items-center justify-between sm:justify-start gap-4 w-full sm:w-auto">
              <NexaSpinLogo size="md" />

              {/* High-Tech Provably Fair Status Chip (Desktop) */}
              <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-[10px] font-mono text-emerald-400 font-bold shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                <Shield className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                <span className="tracking-tight">100% PROVABLY FAIR</span>
                <span className="text-emerald-500/80">|</span>
                <span className="text-emerald-300 font-extrabold">⚡ 12ms</span>
              </div>
            </div>

            {/* Wallet Balance & Server Stats */}
            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto">
              
              {/* Master SFX Audio Toggle */}
              <button
                onClick={toggleSfx}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border font-mono text-xs font-bold transition-all cursor-pointer h-8 sm:h-auto shrink-0 ${
                  !isSfxMuted
                    ? "bg-amber-950/40 border-amber-500/50 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                    : "bg-slate-900/80 border-slate-800 text-slate-500 hover:text-slate-300"
                }`}
                title="Toggle Web Audio SFX Effects"
              >
                {!isSfxMuted ? (
                  <>
                    <Volume2 className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-[11px]">SFX: ON</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-[11px]">SFX: OFF</span>
                  </>
                )}
              </button>

              {/* Ambient Lounge Music Toggle */}
              <button
                onClick={toggleMusic}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border font-mono text-xs font-bold transition-all cursor-pointer h-8 sm:h-auto shrink-0 ${
                  isMusicPlaying
                    ? "bg-fuchsia-950/50 border-fuchsia-500/50 text-fuchsia-300 shadow-[0_0_12px_rgba(217,70,239,0.3)]"
                    : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
                title="Toggle Live Jazz Lounge Music"
              >
                {isMusicPlaying ? (
                  <>
                    <Volume2 className="h-3.5 w-3.5 text-fuchsia-400 animate-pulse" />
                    <span className="text-[11px]">MUSIC: ON</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-[11px]">MUSIC: OFF</span>
                  </>
                )}
              </button>

              {/* Floor Rules Button */}
              <button
                onClick={() => {
                  casinoAudio.playClick();
                  setFloorRulesTab("house");
                  setIsFloorRulesOpen(true);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-amber-500/40 bg-amber-950/30 hover:bg-amber-900/40 text-amber-300 font-mono text-xs font-bold transition-all cursor-pointer h-8 sm:h-auto shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                title="View Casino Floor & Game Rules"
              >
                <Scale className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-[11px]">RULES</span>
              </button>

              {/* Clock Widget */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 font-mono h-8 sm:h-auto shrink-0 shadow-inner">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                <span className="font-bold">{time || "LOBBY"}</span>
              </div>

              {/* Main Balance & Bonus Vault Display (Hide for Agent) */}
              {currentUser?.role !== "agent" && (
                <div className="flex items-center gap-2">
                  {/* Main Deposit Balance with 1-Click Deposit */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#0d131f] to-[#161f32] border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.25)] h-8 sm:h-auto justify-center" title="Main Real Cash Balance (Deposited Funds)">
                    <Coins className="h-4 w-4 text-amber-400 animate-bounce" />
                    <div className="font-mono text-xs flex items-center gap-1.5">
                      <span className="text-slate-400 font-bold text-[10px]">MAIN:</span>
                      <AnimatedChipsCounter value={chips} className="text-amber-300 font-black text-sm tracking-tight" />
                    </div>
                    <button
                      onClick={() => {
                        casinoAudio.playChipClink();
                        changeTab("stats");
                      }}
                      className="ml-1 px-2 py-0.5 rounded-lg bg-gradient-to-r from-[#00FF66] to-emerald-400 hover:from-[#00e65c] hover:to-emerald-500 text-slate-950 font-black text-[9px] font-mono uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-[0_0_8px_rgba(0,255,102,0.4)]"
                    >
                      + DEPOSIT
                    </button>
                  </div>

                  {/* Locked Bonus Vault Pill with Wager Target */}
                  {bonusBalance > 0 && (
                    <div 
                      onClick={() => {
                        casinoAudio.playClick();
                        changeTab("stats");
                      }}
                      className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-500/40 shadow-inner h-8 sm:h-auto cursor-pointer hover:border-amber-400 transition-all" 
                      title={`Locked Bonus Vault: $${bonusBalance.toFixed(2)} USDT. Wagering Progress: $${currentWagerProgress.toFixed(0)} / $${totalWagerRequired.toFixed(0)} (30x Requirement)`}
                    >
                      <span className="text-xs">🔒</span>
                      <div className="flex flex-col text-[10px] font-mono leading-tight">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 font-bold">BONUS:</span>
                          <span className="text-amber-300 font-black">${bonusBalance.toFixed(2)}</span>
                        </div>
                        {totalWagerRequired > 0 && (
                          <div className="text-[8px] text-amber-400/80 font-bold flex items-center gap-1">
                            <span>30x: {Math.min(100, Math.round((currentWagerProgress / totalWagerRequired) * 100))}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Desktop Only Logged In User Profile & Logout */}
              {currentUser && (
                <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/60 shadow-md">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-fuchsia-600 via-purple-600 to-indigo-600 flex items-center justify-center font-bold text-white text-[10px] shadow-sm">
                    {currentUser.role === "admin" ? "🛡️" : currentUser.role === "Sub-Admin" ? "👑" : currentUser.role === "agent" ? "💼" : currentUser.name.charAt(0)}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-mono text-[10px] text-white font-black max-w-[100px] truncate leading-none">{currentUser.name}</span>
                    <span className="text-[8px] text-amber-400 font-mono uppercase tracking-wider mt-0.5 font-bold">
                      {currentUser.role === "admin" ? "Admin" : currentUser.role === "Sub-Admin" ? "Sub-Admin" : currentUser.role === "agent" ? "P2P Agent" : currentUser.loggedInVia === "google" ? "Google Pay" : "VIP Player"}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="ml-1 px-2 py-0.5 rounded-lg bg-red-950/60 border border-red-500/40 hover:bg-red-900/60 hover:border-red-500/60 text-red-300 font-mono text-[9px] font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                    title="Sign Out of Casino Lounge"
                  >
                    LOGOUT
                  </button>
                </div>
              )}
            </div>

          </div>
        </header>
      )}

      {/* Main floor Layout (Conditional for Agent/Sub-Admin Portals) */}
      {currentUser.role === "agent" ? (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
          <AgentDashboard 
            currentUser={currentUser} 
            onLogout={handleLogout} 
            onAddAuditLog={addAuditLog}
          />
        </main>
      ) : currentUser.role === "Sub-Admin" ? (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
          <SubAdminDashboard 
            currentUser={currentUser} 
            onLogout={handleLogout} 
            onAddAuditLog={addAuditLog}
          />
        </main>
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 pt-4 pb-28 lg:pb-6 flex flex-col lg:flex-row gap-6">
        
        {/* Left Hand Menu / Column */}
        {!isImmersiveMobile && (
          <aside className="w-full lg:w-64 flex flex-col gap-5 shrink-0">
            
            {/* Navigation Tab selection list - Horizontal Scrolling Menu Bar on mobile, Vertical Column on Desktop */}
            <div className="relative group">
              {/* Left scroll indicator chevron overlay (Mobile Only) */}
              <AnimatePresence>
                {showLeftNavIndicator && (
                  <motion.div
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -5 }}
                    className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent z-10 flex items-center justify-start pl-1 pointer-events-none lg:hidden rounded-l-2xl"
                  >
                    <motion.div
                      animate={{ x: [0, -2, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                      className="w-5 h-5 rounded bg-slate-900 border border-slate-800 flex items-center justify-center text-fuchsia-400 shadow-md pointer-events-auto cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        navScrollRef.current?.scrollBy({ left: -120, behavior: "smooth" });
                      }}
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Right scroll indicator chevron overlay (Mobile Only) */}
              <AnimatePresence>
                {showRightNavIndicator && (
                  <motion.div
                    initial={{ opacity: 0, x: 5 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 5 }}
                    className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#080B10] via-[#080B10]/90 to-transparent z-20 flex items-center justify-end pr-1.5 pointer-events-none lg:hidden rounded-r-2xl"
                  >
                    <motion.button
                      animate={{ x: [0, 4, 0] }}
                      transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                      className="px-2 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 flex items-center gap-1 shadow-[0_0_15px_rgba(245,158,11,0.7)] pointer-events-auto cursor-pointer border border-amber-300 font-mono text-[9px] font-black uppercase tracking-tight"
                      onClick={(e) => {
                        e.stopPropagation();
                        navScrollRef.current?.scrollBy({ left: 140, behavior: "smooth" });
                      }}
                      title="Scroll for more tabs"
                    >
                      <span>MORE</span>
                      <ChevronRight className="h-3 w-3 stroke-[3]" />
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div
                ref={navScrollRef}
                className="rounded-2xl border border-slate-800 bg-slate-950/80 p-2 lg:p-3 flex flex-row lg:flex-col gap-2 overflow-x-auto scrollbar-none snap-x relative"
              >
                <button
                  onClick={() => changeTab("lobby")}
                  className={`px-4 py-2.5 rounded-xl font-mono text-xs font-semibold flex items-center justify-between shrink-0 transition-all snap-center whitespace-nowrap cursor-pointer ${
                    activeTab === "lobby"
                      ? "bg-slate-900 border border-slate-800 text-fuchsia-400"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/40"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Tv className="h-4 w-4" /> Casino Floor
                  </span>
                  <ChevronRight className={`hidden lg:block h-3.5 w-3.5 transition-transform ${activeTab === "lobby" ? "rotate-90" : ""}`} />
                </button>

                {/* Primary LIVE CASINO Menu Button */}
                <button
                  onClick={() => changeTab("live")}
                  className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold flex items-center justify-between shrink-0 transition-all snap-center whitespace-nowrap cursor-pointer ${
                    activeTab === "live"
                      ? "bg-rose-950/60 border border-rose-500/50 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/40"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Radio className="h-4 w-4 text-rose-500 animate-pulse" />
                    <span className="text-rose-400 font-extrabold uppercase">LIVE CASINO</span>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                    </span>
                  </span>
                  <ChevronRight className={`hidden lg:block h-3.5 w-3.5 transition-transform text-rose-400 ${activeTab === "live" ? "rotate-90" : ""}`} />
                </button>



                <button
                  onClick={() => changeTab("dailyspin")}
                  className={`px-4 py-3.5 rounded-xl font-mono text-xs font-black flex items-center justify-between shrink-0 transition-all snap-center whitespace-nowrap cursor-pointer border bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 animate-gold-pulse-glow ${
                    activeTab === "dailyspin"
                      ? "text-yellow-400"
                      : "text-amber-300 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Gift className="h-4.5 w-4.5 text-amber-400 animate-bounce" /> 
                    <span className="tracking-tight uppercase">Daily Spin Wheel</span>
                    <span className="px-1.5 py-0.5 rounded text-[8px] bg-amber-500/20 text-yellow-300 font-extrabold tracking-wider animate-pulse border border-amber-400/20">
                      FREE COINS
                    </span>
                  </span>
                  <ChevronRight className={`hidden lg:block h-3.5 w-3.5 transition-transform text-amber-400 ${activeTab === "dailyspin" ? "rotate-90" : ""}`} />
                </button>

                <button
                  onClick={() => changeTab("stats")}
                  className={`px-4 py-2.5 rounded-xl font-mono text-xs font-semibold flex items-center justify-between shrink-0 transition-all snap-center whitespace-nowrap cursor-pointer ${
                    activeTab === "stats"
                      ? "bg-slate-900 border border-slate-800 text-cyan-400"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/40"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <User className="h-4 w-4 text-fuchsia-400" /> Player Portfolio
                    {unreadChatCount > 0 && (
                      <span className="px-1.5 py-0.5 text-[8px] font-black text-white bg-rose-600 rounded-full animate-pulse flex items-center justify-center gap-0.5 shadow-md">
                        <span className="h-1 w-1 bg-white rounded-full animate-ping shrink-0" />
                        {unreadChatCount}
                      </span>
                    )}
                  </span>
                  <ChevronRight className={`hidden lg:block h-3.5 w-3.5 transition-transform ${activeTab === "stats" ? "rotate-90" : ""}`} />
                </button>

                {currentUser?.role === "admin" && (
                  <button
                    onClick={() => changeTab("admin")}
                    className={`px-4 py-2.5 rounded-xl font-mono text-xs font-semibold flex items-center justify-between shrink-0 transition-all snap-center whitespace-nowrap cursor-pointer ${
                      activeTab === "admin"
                        ? "bg-purple-950/40 border border-purple-500/40 text-purple-400"
                        : "text-slate-400 hover:text-white hover:bg-slate-900/40"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="text-sm">🛡️</span> Admin Console
                    </span>
                    <ChevronRight className={`hidden lg:block h-3.5 w-3.5 transition-transform ${activeTab === "admin" ? "rotate-90" : ""}`} />
                  </button>
                )}
              </div>

              {/* Horizontal micro-scroll progress tracker (Mobile Only) */}
              <div className="absolute bottom-1 left-2 right-2 h-[2px] bg-slate-900/40 rounded-full overflow-hidden pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 lg:hidden">
                <div
                  className="h-full bg-gradient-to-r from-fuchsia-600 to-indigo-600 rounded-full transition-all duration-150"
                  style={{ width: `${navScrollProgress}%` }}
                />
              </div>
            </div>



            {/* Quick Info Box / Floor Rules Directory */}
            <div className="hidden lg:block p-4 rounded-2xl border border-amber-500/30 bg-slate-950/60 font-mono text-[11px] text-slate-400 leading-relaxed space-y-2">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-1.5">
                <span className="text-amber-400 font-extrabold uppercase tracking-wide flex items-center gap-1.5">
                  <Scale className="h-3.5 w-3.5" /> Floor Rules
                </span>
                <button
                  onClick={() => {
                    casinoAudio.playClick();
                    setFloorRulesTab("house");
                    setIsFloorRulesOpen(true);
                  }}
                  className="text-[10px] text-amber-300 hover:text-white underline font-bold cursor-pointer"
                >
                  View All
                </button>
              </div>
              <ul className="list-disc pl-4 space-y-1 text-slate-300">
                <li>1:1 Chip Ratio (1 USDT = 1 USDT Chip)</li>
                <li>Instant Payouts & 0% Processing Fees</li>
                <li>Vegas Vance Interest-Free Emergency Loans</li>
                <li>PRNG Verified & Certified 96.5%-98.2% RTP</li>
              </ul>
              <button
                onClick={() => {
                  casinoAudio.playClick();
                  setFloorRulesTab("house");
                  setIsFloorRulesOpen(true);
                }}
                className="w-full mt-2 py-1.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95"
              >
                Open Rules Directory →
              </button>
            </div>

          </aside>
        )}

        {/* Central Stage and VIP Host Column */}
        <section className="flex-1 min-w-0 w-full flex flex-col gap-6 overflow-hidden">
          
          {/* Prominent Eye-Catching Hero Banner Carousel */}
          {!isImmersiveMobile && activeTab === "lobby" && (
            <div className="w-full flex flex-col gap-4">
              <PromotionalHeroBanner
                onSelectTab={(tab) => {
                  if (tab === "banking") {
                    changeTab("stats");
                  } else {
                    changeTab(tab as any);
                  }
                }}
                onOpenDepositModal={() => changeTab("stats")}
              />

              {/* Dynamic Promotional Banner Bar Below Banner Section */}
              <PromotionalBannerBar
                onSelectTab={(tab) => {
                  if (tab === "banking") {
                    changeTab("stats");
                  } else {
                    changeTab(tab as any);
                  }
                }}
                onOpenPromoCodeDrawer={() => {
                  changeTab("stats");
                }}
              />

              {/* Trusted Payment Partners & Security Trust Badge Banner */}
              <PaymentPartnersBanner onOpenDeposit={() => changeTab("stats")} />
            </div>
          )}

          {/* Vegas Golden High-Roller Suite Component */}
          {!isImmersiveMobile && activeTab === "lobby" && (
            <div className="w-full">
              <VegasHighRollerSuite
                onSelectGame={(gameId, category, gameName) => {
                  handleLaunchGame(gameId, category, gameName);
                  if (window.innerWidth < 1024) {
                    setIsImmersiveMobile(true);
                  }
                }}
              />
            </div>
          )}
          
          {/* Active game stage selector with responsive Mobile touch handler */}
          <div 
            onClickCapture={() => {
              if (window.innerWidth < 1024 && !isImmersiveMobile && activeTab !== "lobby") {
                setIsImmersiveMobile(true);
              }
            }}
            onTouchStartCapture={() => {
              if (window.innerWidth < 1024 && !isImmersiveMobile && activeTab !== "lobby") {
                setIsImmersiveMobile(true);
              }
            }}
            className="flex-1 min-w-0 w-full overflow-hidden"
          >
            <AnimatePresence mode="wait">
              {activeTab === "lobby" && (
                <motion.div
                  key="lobby"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <CasinoFloor
                    chips={chips}
                    bonusBalance={bonusBalance}
                    onLaunchGame={handleLaunchGame}
                    onPlayInstantWin={handlePlayInstantWin}
                    onAwardBonusFunds={awardBonusFunds}
                    currentUser={currentUser}
                    quests={quests}
                    onClaimQuestReward={handleClaimQuestReward}
                    onResetQuests={handleResetQuests}
                    allMissionsBonusClaimed={allMissionsBonusClaimed}
                    onClaimAllMissionsBonus={handleClaimAllMissionsBonus}
                    megaWinState={megaWinState}
                    onClaimMegaWin={handleClaimMegaWin}
                    onAddAuditLog={addAuditLog}
                    onReRollMegaWinner={handleReRollMegaWinner}
                    onNavigateTab={(tab) => changeTab(tab)}
                    onOpenDeposit={() => changeTab("stats")}
                    onOpenFloorRules={() => {
                      setFloorRulesTab("house");
                      setIsFloorRulesOpen(true);
                    }}
                  />
                </motion.div>
              )}

              {activeTab === "game_launcher" && activeLauncherGame && (
                <motion.div
                  key="game_launcher"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                >
                  <GameLauncher
                    gameId={activeLauncherGame.id}
                    gameName={activeLauncherGame.name}
                    chips={chips + bonusBalance}
                    onBack={() => {
                      setActiveLauncherGame(null);
                      changeTab("lobby");
                    }}
                    onWin={handleWin}
                    onLose={handleLose}
                    onCommentaryRequest={triggerVanceCommentary}
                    rtpBias={rtpBias}
                    forcedOutcome={forcedOutcome}
                    onClearForcedOutcome={() => setForcedOutcome("none")}
                  />
                </motion.div>
              )}

              {activeTab === "live" && (
                <motion.div
                  key="live"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                >
                  <LiveGamesSection
                    chips={chips + bonusBalance}
                    onWin={handleWin}
                    onLose={handleLose}
                    onLaunchGame={handleLaunchGame}
                    selectedGameInfo={selectedLiveGameInfo}
                  />
                </motion.div>
              )}

              {activeTab === "slots" && (
                <motion.div
                  key="slots"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                >
                  <SlotsGame
                    chips={chips + bonusBalance}
                    onWin={handleWin}
                    onLose={handleLose}
                    onCommentaryRequest={triggerVanceCommentary}
                    rtpBias={rtpBias}
                    forcedOutcome={forcedOutcome}
                    onClearForcedOutcome={() => setForcedOutcome("none")}
                  />
                </motion.div>
              )}

              {activeTab === "blackjack" && (
                <motion.div
                  key="blackjack"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                >
                  <BlackjackGame
                    chips={chips + bonusBalance}
                    onWin={handleWin}
                    onLose={handleLose}
                    onCommentaryRequest={triggerVanceCommentary}
                    rtpBias={rtpBias}
                    forcedOutcome={forcedOutcome}
                    onClearForcedOutcome={() => setForcedOutcome("none")}
                  />
                </motion.div>
              )}

              {activeTab === "roulette" && (
                <motion.div
                  key="roulette"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                >
                  <RouletteGame
                    chips={chips + bonusBalance}
                    onWin={handleWin}
                    onLose={handleLose}
                    onCommentaryRequest={triggerVanceCommentary}
                    rtpBias={rtpBias}
                    forcedOutcome={forcedOutcome}
                    onClearForcedOutcome={() => setForcedOutcome("none")}
                  />
                </motion.div>
              )}

              {activeTab === "videopoker" && (
                <motion.div
                  key="videopoker"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                >
                  <VideoPokerGame
                    chips={chips + bonusBalance}
                    onWin={handleWin}
                    onLose={handleLose}
                    onCommentaryRequest={triggerVanceCommentary}
                  />
                </motion.div>
              )}

              {activeTab === "plinko" && (
                <motion.div
                  key="plinko"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                >
                  <NeonPlinko
                    chips={chips + bonusBalance}
                    onWin={handleWin}
                    onLose={handleLose}
                    onCommentaryRequest={triggerVanceCommentary}
                  />
                </motion.div>
              )}

              {activeTab === "mines" && (
                <motion.div
                  key="mines"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                >
                  <CyberMines
                    chips={chips + bonusBalance}
                    onWin={handleWin}
                    onLose={handleLose}
                    onCommentaryRequest={triggerVanceCommentary}
                  />
                </motion.div>
              )}

              {activeTab === "baccarat" && (
                <motion.div
                  key="baccarat"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                >
                  <LuxuryBaccarat
                    chips={chips + bonusBalance}
                    onWin={handleWin}
                    onLose={handleLose}
                    onCommentaryRequest={triggerVanceCommentary}
                  />
                </motion.div>
              )}

              {activeTab === "highlow" && (
                <motion.div
                  key="highlow"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                >
                  <InteractiveHighLow
                    chips={chips + bonusBalance}
                    onWin={handleWin}
                    onLose={handleLose}
                    onCommentaryRequest={triggerVanceCommentary}
                  />
                </motion.div>
              )}

              {activeTab === "admin" && (
                <motion.div
                  key="admin"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                >
                  <AdminPanel
                    currentUser={currentUser}
                    userChips={chips}
                    onUpdateUserChips={setChips}
                    userLoan={loanCount * 500}
                    onUpdateUserLoan={(val) => setLoanCount(Math.max(0, Math.floor(val / 500)))}
                    activeTab={activeTab}
                    onChangeTab={changeTab}
                    housePool={housePool}
                    onUpdateHousePool={setHousePool}
                    rtpBias={rtpBias}
                    onChangeRtpBias={setRtpBias}
                    customWinRatio={customWinRatio}
                    onChangeCustomWinRatio={setCustomWinRatio}
                    forceLoseMode={forceLoseMode}
                    onChangeForceLoseMode={setForceLoseMode}
                    maxCrashMultiplier={maxCrashMultiplier}
                    onChangeMaxCrashMultiplier={setMaxCrashMultiplier}
                    forcedOutcome={forcedOutcome}
                    onChangeForcedOutcome={setForcedOutcome}
                    auditLogs={auditLogs}
                    onAddAuditLog={addAuditLog}
                    onClearAuditLogs={() => setAuditLogs([])}
                    megaWinState={megaWinState}
                    onReRollMegaWinner={handleReRollMegaWinner}
                  />
                </motion.div>
              )}

              {activeTab === "dailyspin" && (
                <motion.div
                  key="dailyspin"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                >
                  <DailySpin
                    onWin={(amt, msg) => awardBonusFunds(amt, msg || "Daily Wheel Spin")}
                    onCommentaryRequest={triggerVanceCommentary}
                  />
                </motion.div>
              )}

              {activeTab === "stats" && (
                <motion.div
                  key="stats"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                >
                  <PlayerProfile
                    chips={chips}
                    bonusBalance={bonusBalance}
                    totalWagerRequired={totalWagerRequired}
                    currentWagerProgress={currentWagerProgress}
                    cumulativeLosses={cumulativeLosses}
                    loanCount={loanCount}
                    transactions={transactions}
                    onPaybackLoan={handlePaybackLoan}
                    peakChips={peakChips}
                    currentUser={currentUser}
                    onClaimReferralRewards={handleClaimReferralRewards}
                    onUpdateChips={setChips}
                    onAddAuditLog={addAuditLog}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </section>

      </main>
      )}



      {/* Vegas Vance Floating Button & Popover Modal */}
      {currentUser?.role !== "agent" && (
        <>
          <div className="fixed bottom-[72px] left-3 sm:left-6 md:bottom-6 z-[60]">
            <button
              onClick={() => {
                casinoAudio.playClick();
                setIsVanceOpen(true);
                setHasNewVanceCommentary(false);
              }}
              className="relative flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 bg-gradient-to-r from-amber-500 via-[#00FF66] to-emerald-500 border border-yellow-200 text-slate-950 font-mono text-[9px] sm:text-xs font-black uppercase rounded-full shadow-[0_0_18px_rgba(0,255,102,0.6)] hover:shadow-[0_0_28px_rgba(255,215,0,0.8)] transition-all duration-300 group cursor-pointer active:scale-95"
            >
              {/* Outer Pulsing Glow Aura */}
              <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-amber-400 via-[#00FF66] to-emerald-400 opacity-70 blur-md animate-pulse pointer-events-none" />
              <span className="absolute -inset-0.5 rounded-full bg-[#00FF66]/40 animate-ping duration-1000 pointer-events-none" />

              {/* Icon & Mood */}
              <span className="text-xs sm:text-base select-none relative z-10 group-hover:scale-125 transition-transform duration-300 filter drop-shadow">
                {commentaryState.hostMood === "suave" ? "🕶️" : commentaryState.hostMood === "enthusiastic" ? "🔥" : commentaryState.hostMood === "encouraging" ? "🤝" : commentaryState.hostMood === "dramatic" ? "🎭" : "🎰"}
              </span>
              <span className="text-[9px] sm:text-[11px] font-black tracking-tight text-slate-950 relative z-10">
                Vance
              </span>

              {/* New message notification badge */}
              {hasNewVanceCommentary && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 sm:h-4 sm:w-4 z-20">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 sm:h-4 sm:w-4 bg-rose-600 text-[7px] sm:text-[8px] font-black text-white items-center justify-center border-2 border-slate-950 shadow-md">
                    !
                  </span>
                </span>
              )}
            </button>
          </div>

          {/* Pop-up dialog overlay */}
          <AnimatePresence>
            {isVanceOpen && (
              <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-[100]">
                <motion.div
                  initial={{ scale: 0.95, y: 30, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.95, y: 30, opacity: 0 }}
                  transition={{ type: "spring", duration: 0.4 }}
                  className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-slate-950 rounded-2xl sm:rounded-3xl border border-slate-800 shadow-2xl overflow-hidden"
                >
                  {/* Close Button */}
                  <button
                    onClick={() => {
                      casinoAudio.playClick();
                      setIsVanceOpen(false);
                    }}
                    className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 text-slate-400 hover:text-white font-mono text-[10px] sm:text-xs font-extrabold uppercase bg-slate-900/90 hover:bg-slate-900 border border-slate-800 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl transition-all cursor-pointer shadow-md"
                  >
                    Close ×
                  </button>
                  
                  <VipHostPanel
                    commentaryState={commentaryState}
                    onAskAdvice={() => triggerVanceCommentary("strategy")}
                    onTakeLoan={handleTakeLoan}
                    chips={chips}
                    loanCount={loanCount}
                  />
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Big Win Particle Explosion Celebration */}
          <AnimatePresence>
            {activeCelebration && (
              <BigWinCelebration
                key={activeCelebration.id}
                amount={activeCelebration.amount}
                onClose={() => setActiveCelebration(null)}
              />
            )}
          </AnimatePresence>

          {/* 10-Second Login Welcome Popup */}
          <AnimatePresence>
            {showLoginWelcomePopup && (
              <div id="login-welcome-popup" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
                <motion.div
                  initial={{ scale: 0.95, y: 20, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.95, y: 20, opacity: 0 }}
                  className="max-w-md w-full bg-slate-950 border-2 border-fuchsia-500/50 rounded-3xl p-6 text-center shadow-[0_0_50px_rgba(217,70,239,0.3)] relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-fuchsia-500/5 to-transparent pointer-events-none" />
                  
                  {/* Close Cross Sign Button at Top Right */}
                  <button
                    onClick={() => {
                      casinoAudio.playClick();
                      setShowLoginWelcomePopup(false);
                    }}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 h-8 w-8 rounded-full flex items-center justify-center transition-all cursor-pointer font-bold"
                    aria-label="Close popup"
                  >
                    ×
                  </button>

                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-fuchsia-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-fuchsia-500/30 mx-auto mb-4 text-2xl">
                    👑
                  </div>

                  <span className="text-[10px] uppercase tracking-widest text-fuchsia-400 font-extrabold block mb-1 font-mono">EXCLUSIVE VIP LOUNGE</span>
                  <h4 className="font-mono text-xl font-black text-white uppercase tracking-tight drop-shadow-[0_0_10px_rgba(217,70,239,0.5)]">
                    WELCOME BACK, PLAYER!
                  </h4>

                  <div className="mt-4 bg-slate-900/60 border border-slate-850 p-4 rounded-2xl text-left text-xs font-mono text-slate-300 space-y-3">
                    <p>
                      Greetings, <strong className="text-white">{currentUser.name}</strong>! Your exclusive high-roller VIP session has been successfully established and secured.
                    </p>
                    <p className="border-t border-white/[0.04] pt-2">
                      🔥 <strong className="text-fuchsia-400">UNLIMITED VIP JACKPOT:</strong> Today's VIP Mega Win Vault jackpot stands at a massive <strong className="text-amber-400">$10,000 USDT</strong>! 
                    </p>
                    <p>
                      Requires a minimum deposit/balance of <strong className="text-cyan-400">$100 USDT</strong> to attempt decryption. Play anytime when ready!
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      casinoAudio.playClick();
                      setShowLoginWelcomePopup(false);
                    }}
                    className="mt-6 w-full py-3 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-mono text-xs font-black tracking-widest rounded-xl cursor-pointer active:scale-95 transition-all shadow-[0_0_15px_rgba(217,70,239,0.3)]"
                  >
                    START PLAYING NOW
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Mission Completion Popup */}
          <AnimatePresence>
            {showQuestCompletedPopup && (
              <div id="quest-completed-popup" className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
                <motion.div
                  initial={{ scale: 0.95, y: 20, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.95, y: 20, opacity: 0 }}
                  className="max-w-md w-full bg-slate-950 border-2 border-emerald-500/50 rounded-3xl p-6 text-center shadow-[0_0_50px_rgba(16,185,129,0.3)] relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
                  
                  {/* Close Cross Sign Button at Top Right */}
                  <button
                    onClick={() => {
                      casinoAudio.playClick();
                      setShowQuestCompletedPopup(null);
                    }}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 h-8 w-8 rounded-full flex items-center justify-center transition-all cursor-pointer font-bold"
                    aria-label="Close popup"
                  >
                    ×
                  </button>

                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 mx-auto mb-4 text-2xl animate-bounce">
                    🏆
                  </div>

                  <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-extrabold block mb-1 font-mono">MILESTONE ACCOMPLISHED</span>
                  <h4 className="font-mono text-lg font-black text-white uppercase tracking-tight drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                    MISSION COMPLETE!
                  </h4>

                  <div className="mt-4 bg-slate-900/60 border border-slate-850 p-4 rounded-2xl text-left text-xs font-mono text-slate-300 space-y-3">
                    <p className="font-bold text-white text-center text-sm border-b border-white/[0.04] pb-2">
                      "{showQuestCompletedPopup.title}"
                    </p>
                    <p className="text-slate-400 text-center">
                      {showQuestCompletedPopup.description}
                    </p>
                    <div className="flex justify-between items-center bg-slate-950/80 p-3 rounded-xl border border-white/[0.02]">
                      <span className="text-slate-400">Reward Claimable:</span>
                      <span className="text-amber-400 font-extrabold text-sm flex items-center gap-1">
                        <Coins className="h-4 w-4 shrink-0" /> +${Number(showQuestCompletedPopup.reward).toFixed(2)} USDT
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      casinoAudio.playClick();
                      handleClaimQuestReward(showQuestCompletedPopup.id);
                      setShowQuestCompletedPopup(null);
                    }}
                    className="mt-6 w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono text-xs font-black tracking-widest rounded-xl cursor-pointer active:scale-95 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                  >
                    CLAIM REWARD CHIPS
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>



          {/* Custom Wagering & Bonus Toast Banner */}
          <AnimatePresence>
            {customToast?.show && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="fixed top-20 right-6 z-50 max-w-sm w-full p-4 rounded-2xl border border-amber-500/40 bg-slate-950/95 shadow-2xl shadow-amber-950/50 backdrop-blur-md flex items-start gap-3"
              >
                <Sparkles className="h-5 w-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                <div className="flex-1">
                  <h4 className="text-xs font-mono font-bold text-amber-300">{customToast.title}</h4>
                  <p className="text-[11px] font-mono text-slate-300 mt-1 leading-relaxed">{customToast.message}</p>
                </div>
                <button
                  onClick={() => setCustomToast(null)}
                  className="text-slate-500 hover:text-white text-xs font-mono cursor-pointer"
                >
                  ✕
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Global Floating Community Chat */}
          {currentUser && (
            <GlobalFloatingChat currentUser={currentUser} />
          )}

          {/* Mobile Sticky Navigation Bar */}
          {!isImmersiveMobile && (
            <MobileBottomNav
              activeTab={activeTab}
              onChangeTab={(tab) => changeTab(tab)}
              onOpenDeposit={() => changeTab("stats")}
              onOpenMenu={() => setIsMobileMenuOpen(true)}
              unreadChatCount={unreadChatCount}
              bonusAmount={bonusBalance}
            />
          )}

          {/* High-Tech Mobile Application Drawer Menu */}
          <MobileAppDrawer
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
            activeTab={activeTab}
            onChangeTab={(tab) => changeTab(tab)}
            currentUser={currentUser}
            chips={chips}
            bonusBalance={bonusBalance}
            onOpenDeposit={() => changeTab("stats")}
            onLogout={handleLogout}
            isSfxMuted={isSfxMuted}
            onToggleSfx={toggleSfx}
            onOpenFloorRules={() => {
              setFloorRulesTab("house");
              setIsFloorRulesOpen(true);
            }}
            onOpenVanceAi={() => setIsVanceOpen(true)}
            unreadChatCount={unreadChatCount}
          />

          {/* Official Royal Neon Floor Rules Directory Modal */}
          <FloorRulesModal
            isOpen={isFloorRulesOpen}
            onClose={() => setIsFloorRulesOpen(false)}
            initialTab={floorRulesTab}
          />

          {/* Deposit Required to Play Modal */}
          <DepositRequiredModal
            isOpen={showDepositRequiredModal}
            bonusBalance={bonusBalance}
            onClose={() => setShowDepositRequiredModal(false)}
            onDepositNow={() => {
              setShowDepositRequiredModal(false);
              changeTab("stats");
            }}
          />
        </>
      )}
    </div>
  );
}
