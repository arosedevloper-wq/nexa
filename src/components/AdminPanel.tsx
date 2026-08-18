import React, { useState, useEffect, useRef } from "react";
import { 
  Users, ShieldAlert, Coins, TrendingUp, History, ShieldCheck, 
  Layers, Lock, Unlock, Server, Activity, AlertTriangle, RefreshCw, 
  HelpCircle, UserCheck, UserX, ToggleLeft, ToggleRight, DollarSign,
  Plus, Minus, Terminal, CheckCircle2, Sliders, Play, Trash2,
  Gift, Check, X, Edit2, Settings, Clock, ArrowRight, Search, Landmark, Trophy, ArrowDownLeft, ArrowUpRight, UserPlus,
  BarChart3, PieChart, Gamepad2, FileText, Download, Filter, Eye, Cpu, Zap
} from "lucide-react";
import StressTestModule from "./StressTestModule";
import { GameType } from "../types";
import { DEFAULT_P2P_AGENTS, getMergedP2PAgents, deleteP2PAgent } from "../constants/p2pAgents";
import { getRegisteredPlayers } from "../constants/defaultPlayers";
import { getBankingRequests } from "../constants/bankingRequests";
import { getSubAdmins } from "../constants/subAdmins";
import { getReferralEvents, getReferralSettings, processRefereeDepositReferral } from "../constants/referralData";
import { casinoAudio } from "../lib/audioService";
import { 
  savePlayerToDatabase, 
  deletePlayerFromDatabase,
  saveBankingRequestToDatabase, 
  saveP2PAgentToDatabase, 
  saveAllP2PAgentsToDatabase, 
  saveAllPlayersToDatabase, 
  saveAllBankingRequestsToDatabase, 
  saveSystemConfigToDatabase, 
  fetchCloudPlayersFromD1,
  saveAllSubAdminsToDatabase,
  fetchCloudSubAdminsFromD1,
  saveReferralDataToDatabase
} from "../lib/db";
import { 
  getMasterCryptoWallets, 
  saveMasterCryptoWallets, 
  confirmMasterWalletAddress, 
  addMasterCryptoWallet, 
  getCryptoBonusPercent, 
  saveCryptoBonusPercent, 
  MasterCryptoWallet 
} from "../lib/cryptoConfig";
import { processDepositApprovalForPlayer } from "../lib/depositBonusHelper";
import SubAdminDashboard from "./SubAdminDashboard";
import AgentControlHub from "./AgentControlHub";
import { PlayerActivity, getPlayerActivities, logPlayerActivity, clearPlayerActivities } from "../lib/activityTracker";
import { getMergedGameCatalog, savePortfolioOverride, recordGameStats } from "../lib/portfolioManager";
import { setGlobalRtp } from "../data/gameData";
import { 
  broadcastFinancialStateUpdates, 
  updateHouseVaultReserves, 
  setHouseVaultReserves 
} from "../lib/p2pSystem";

interface Player {
  id: string;
  name: string;
  chips: number;
  activeLoan: number;
  status: "Active" | "Flagged" | "Suspended";
  deviceIp: string;
  riskScore: number;
  favoriteGame: string;
}

interface AuditLog {
  id: string;
  timestamp: string;
  type: "info" | "warning" | "success" | "danger";
  message: string;
}

interface RegisteredPlayer {
  name: string;
  email: string;
  phoneNumber: string;
  password?: string;
  referralCode?: string;
  referredBy?: string;
  referralChipsEarned?: number;
  unclaimedReferralChips?: number;
  chips?: number;
  bonusBalance?: number;
  peakChips?: number;
  loanCount?: number;
  status?: "active" | "flagged" | "suspended" | "blocked" | string;
  vipLevel?: string;
  created_at?: string;
  transactions?: any[];
  totalWagerRequired?: number;
  totalWagered?: number;
}

interface AdminPanelProps {
  currentUser?: {
    role: "player" | "admin" | "agent" | "Sub-Admin" | "super_admin" | "sub_admin" | string;
    name: string;
    phoneNumber?: string;
    email?: string;
    loggedInVia?: "phone" | "google" | "credentials" | "email_password" | "web3" | "telegram" | string;
    agentId?: string;
  } | null;
  // Current user states we want to allow editing directly
  userChips: number;
  onUpdateUserChips: (amount: number) => void;
  userLoan: number;
  onUpdateUserLoan: (amount: number) => void;
  activeTab: GameType;
  onChangeTab: (tab: GameType) => void;
  
  // House controls
  housePool: number;
  onUpdateHousePool: (amount: number) => void;
  
  // Game operational biases
  rtpBias: "standard" | "loose" | "tight" | "rigged" | "custom";
  onChangeRtpBias: (bias: "standard" | "loose" | "tight" | "rigged" | "custom") => void;
  
  customWinRatio?: number;
  onChangeCustomWinRatio?: (val: number) => void;
  
  forceLoseMode?: boolean;
  onChangeForceLoseMode?: (val: boolean) => void;
  
  maxCrashMultiplier: number;
  onChangeMaxCrashMultiplier: (val: number) => void;
  
  forcedOutcome: "none" | "jackpot" | "lose";
  onChangeForcedOutcome: (outcome: "none" | "jackpot" | "lose") => void;
  
  // Audit list
  auditLogs: AuditLog[];
  onAddAuditLog: (msg: string, type: "info" | "warning" | "success" | "danger") => void;
  onClearAuditLogs: () => void;

  // Mega Win Strategy states
  megaWinState?: {
    selectedWinnerEmail: string;
    selectedWinnerName: string;
    selectedWinnerPhone: string;
    windowStart: number;
    windowEnd: number;
    isClaimed: boolean;
    amount: number;
  } | null;
  onReRollMegaWinner?: () => void;
}

const INITIAL_SIMULATED_PLAYERS: Player[] = [
  { id: "p1", name: "HighRollerJess", chips: 85200, activeLoan: 5000, status: "Active", deviceIp: "192.168.4.11", riskScore: 12, favoriteGame: "Slots" },
  { id: "p2", name: "LuckyDan", chips: 12400, activeLoan: 0, status: "Active", deviceIp: "172.56.21.90", riskScore: 4, favoriteGame: "Roulette" },
  { id: "p3", name: "SparklesSam", chips: 450, activeLoan: 1000, status: "Flagged", deviceIp: "45.112.89.201", riskScore: 78, favoriteGame: "Crash Rocket" },
  { id: "p4", name: "VipGamer99", chips: 340500, activeLoan: 0, status: "Active", deviceIp: "8.8.8.8", riskScore: 2, favoriteGame: "Blackjack" },
  { id: "p5", name: "HackerPete", chips: 1545000, activeLoan: 500, status: "Suspended", deviceIp: "203.0.113.195", riskScore: 99, favoriteGame: "Video Poker" },
];

export default function AdminPanel({
  currentUser,
  userChips,
  onUpdateUserChips,
  userLoan,
  onUpdateUserLoan,
  activeTab,
  onChangeTab,
  housePool,
  onUpdateHousePool,
  rtpBias,
  onChangeRtpBias,
  customWinRatio = 5,
  onChangeCustomWinRatio,
  forceLoseMode = true,
  onChangeForceLoseMode,
  maxCrashMultiplier,
  onChangeMaxCrashMultiplier,
  forcedOutcome,
  onChangeForcedOutcome,
  auditLogs,
  onAddAuditLog,
  onClearAuditLogs,
  megaWinState,
  onReRollMegaWinner,
}: AdminPanelProps) {
  const isAdmin = currentUser?.role === "admin" || (currentUser?.role !== "Sub-Admin" && currentUser?.role !== "agent" && currentUser?.role !== "player");

  const [pendingWinRatio, setPendingWinRatio] = useState<number>(() => {
    return Math.max(1, Math.min(100, customWinRatio !== undefined ? customWinRatio : 5));
  });
  const [winRatioConfirmed, setWinRatioConfirmed] = useState<boolean>(false);

  const [pendingForceLose, setPendingForceLose] = useState<boolean>(() => {
    return forceLoseMode !== undefined ? forceLoseMode : true;
  });
  const [forceLoseConfirmed, setForceLoseConfirmed] = useState<boolean>(false);

  useEffect(() => {
    if (customWinRatio !== undefined) {
      setPendingWinRatio(Math.max(1, Math.min(100, customWinRatio)));
    }
  }, [customWinRatio]);

  useEffect(() => {
    if (forceLoseMode !== undefined) {
      setPendingForceLose(forceLoseMode);
    }
  }, [forceLoseMode]);

  const [adminTab, setAdminTab] = useState<string>(() => {
    return currentUser?.role === "Sub-Admin" ? "agents" : "players";
  });

  // Player Activity Telemetry State
  const [playerActivitiesList, setPlayerActivitiesList] = useState<PlayerActivity[]>(() => getPlayerActivities());
  const [activityModalPlayer, setActivityModalPlayer] = useState<any | null>(null);
  const [activityGlobalSearch, setActivityGlobalSearch] = useState<string>("");
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>("all");

  // Player Data Dashboard Filters & Selection State
  const [selectedDashboardPlayerEmail, setSelectedDashboardPlayerEmail] = useState<string>("");
  const [dashboardGameFilter, setDashboardGameFilter] = useState<string>("all");
  const [dashboardTypeFilter, setDashboardTypeFilter] = useState<string>("all");
  const [dashboardSearchQuery, setDashboardSearchQuery] = useState<string>("");

  // Game Portfolio Manager State
  const [gameCatalog, setGameCatalog] = useState(() => getMergedGameCatalog());
  const [portfolioSearch, setPortfolioSearch] = useState<string>("");
  const [portfolioCategoryFilter, setPortfolioCategoryFilter] = useState<string>("all");
  const [portfolioStatusFilter, setPortfolioStatusFilter] = useState<string>("all");
  const [portfolioPage, setPortfolioPage] = useState<number>(1);
  const [editingGame, setEditingGame] = useState<any | null>(null);

  // Global Player Revocation Modal State
  const [playerToRevoke, setPlayerToRevoke] = useState<RegisteredPlayer | null>(null);
  const [isRevoking, setIsRevoking] = useState<boolean>(false);

  const handleExecuteRevokePlayer = async (rp: RegisteredPlayer) => {
    if (!rp || !rp.email || isRevoking) return;
    setIsRevoking(true);
    casinoAudio.playLose();
    const targetEmail = rp.email.toLowerCase().trim();
    
    try {
      // 1. Delete globally from persistent storage, server memory, and revoked registry
      await deletePlayerFromDatabase(targetEmail);

      // 2. Update local state immediately
      const updated = registeredPlayers.filter(p => p.email && p.email.toLowerCase().trim() !== targetEmail);
      setRegisteredPlayers(updated);
      
      // 3. Security Audit Log
      onAddAuditLog(`SECURITY: Revoked and permanently deleted player account: ${rp.name} (${rp.email})`, "danger");
      
      // 4. Dispatch storage events for instant live sync across open tabs
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("players_updated"));
    } catch (e) {
      console.error("Error during player revocation:", e);
    } finally {
      setIsRevoking(false);
      setPlayerToRevoke(null);
    }
  };

  // Sync event listeners for live activity streaming, portfolio updates, and Cloudflare D1 real-time sync
  useEffect(() => {
    // 1. Fetch fresh Cloudflare D1 state immediately on Admin mount
    const fetchFreshD1State = async () => {
      try {
        const [configRes, agentsRes, reqsRes] = await Promise.all([
          fetch("/api/admin/config").catch(() => null),
          fetch("/api/admin/agents").catch(() => null),
          fetch("/api/admin/banking-requests").catch(() => null),
        ]);

        if (configRes && configRes.ok) {
          const cData = await configRes.json();
          if (cData.success && cData.rtpConfig) {
            if (typeof cData.rtpConfig.customWinRatio === "number" && onChangeCustomWinRatio) {
              onChangeCustomWinRatio(cData.rtpConfig.customWinRatio);
              setPendingWinRatio(cData.rtpConfig.customWinRatio);
            }
            if (typeof cData.rtpConfig.forceLoseMode === "boolean" && onChangeForceLoseMode) {
              onChangeForceLoseMode(cData.rtpConfig.forceLoseMode);
              setPendingForceLose(cData.rtpConfig.forceLoseMode);
            }
            if (cData.rtpConfig.rtpBias && onChangeRtpBias) {
              onChangeRtpBias(cData.rtpConfig.rtpBias);
            }
            if (typeof cData.housePool === "number") {
              onUpdateHousePool(cData.housePool);
            }
            if (Array.isArray(cData.cryptoWallets) && cData.cryptoWallets.length > 0) {
              setAdminWallets(cData.cryptoWallets);
            }
          }
        }

        if (agentsRes && agentsRes.ok) {
          const aData = await agentsRes.json();
          if (aData.success && Array.isArray(aData.agents) && aData.agents.length > 0) {
            setAgents(aData.agents);
            setP2pAgents(aData.agents);
          }
        }

        if (reqsRes && reqsRes.ok) {
          const rData = await reqsRes.json();
          if (rData.success && Array.isArray(rData.requests) && rData.requests.length > 0) {
            setBankingRequests(rData.requests);
          }
        }
      } catch (e) {
        console.warn("Cloudflare D1 initial admin sync notice:", e);
      }
    };

    fetchFreshD1State();

    const handleActivityLogged = () => {
      setPlayerActivitiesList(getPlayerActivities());
    };
    const handlePortfolioUpdated = () => {
      setGameCatalog(getMergedGameCatalog());
    };
    window.addEventListener("player_activity_logged", handleActivityLogged);
    window.addEventListener("portfolio_updated", handlePortfolioUpdated);
    window.addEventListener("storage", handleActivityLogged);
    return () => {
      window.removeEventListener("player_activity_logged", handleActivityLogged);
      window.removeEventListener("portfolio_updated", handlePortfolioUpdated);
      window.removeEventListener("storage", handleActivityLogged);
    };
  }, []);

  const filteredPortfolioGames = gameCatalog.filter((game) => {
    if (portfolioCategoryFilter !== "all" && game.category !== portfolioCategoryFilter) {
      return false;
    }
    if (portfolioStatusFilter !== "all" && game.status !== portfolioStatusFilter) {
      return false;
    }
    if (portfolioSearch.trim()) {
      const q = portfolioSearch.toLowerCase();
      return (
        game.name.toLowerCase().includes(q) ||
        game.category.toLowerCase().includes(q) ||
        (game.badge && game.badge.toLowerCase().includes(q)) ||
        game.id.toLowerCase().includes(q)
      );
    }
    return true;
  });
  const [simulatedPlayers, setSimulatedPlayers] = useState<Player[]>(INITIAL_SIMULATED_PLAYERS);
  const [registeredPlayers, setRegisteredPlayers] = useState<RegisteredPlayer[]>(() => {
    return getRegisteredPlayers();
  });
  const [agents, setAgents] = useState<any[]>(() => {
    return getMergedP2PAgents();
  });
  const [agentAdjustAmounts, setAgentAdjustAmounts] = useState<Record<string, string>>({});

  // Master Crypto & Binance Pay Wallets state
  const [adminWallets, setAdminWallets] = useState<MasterCryptoWallet[]>(() => getMasterCryptoWallets());
  const [adminCryptoBonus, setAdminCryptoBonus] = useState<number>(() => getCryptoBonusPercent());
  const [editingWalletId, setEditingWalletId] = useState<string | null>(null);
  const [editWalletAddrValue, setEditWalletAddrValue] = useState<string>("");

  // New Wallet form modal state
  const [showAddWalletModal, setShowAddWalletModal] = useState<boolean>(false);
  const [newCategory, setNewCategory] = useState<"binance" | "web3">("binance");
  const [newSymbol, setNewSymbol] = useState<string>("USDT");
  const [newNetwork, setNewNetwork] = useState<string>("Binance Pay ID");
  const [newName, setNewName] = useState<string>("Binance Pay Direct");
  const [newAddress, setNewAddress] = useState<string>("");
  const [newIcon, setNewIcon] = useState<string>("🟡");
  const [newMinDep, setNewMinDep] = useState<number>(5);
  const [newMinWith, setNewMinWith] = useState<number>(10);

  const handleConfirmMasterWallet = (id: string, currentAddr: string) => {
    casinoAudio.playWin();
    const updated = confirmMasterWalletAddress(id, currentAddr, currentUser?.name || "Admin");
    setAdminWallets(updated);
    const wallet = updated.find(w => w.id === id);
    if (wallet && wallet.symbol) {
      setCryptoAddresses(prev => ({ ...prev, [wallet.symbol]: wallet.address }));
    }
    onAddAuditLog(`${currentUser?.name || "Admin"}: Confirmed and locked Crypto Wallet [${id}] address -> ${currentAddr}`, "success");
  };

  const handleToggleWalletEnabled = (id: string) => {
    casinoAudio.playClick();
    const updated = adminWallets.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w);
    saveMasterCryptoWallets(updated);
    setAdminWallets(updated);
    onAddAuditLog(`${currentUser?.name || "Admin"}: Toggled wallet status for [${id}]`, "info");
  };

  const handleDeleteWallet = (id: string) => {
    casinoAudio.playClick();
    if (!window.confirm("Are you sure you want to remove this crypto wallet?")) return;
    const updated = adminWallets.filter(w => w.id !== id);
    saveMasterCryptoWallets(updated);
    setAdminWallets(updated);
    onAddAuditLog(`${currentUser?.name || "Admin"}: Removed Crypto Wallet [${id}]`, "danger");
  };

  const handleSaveAddWallet = (e: React.FormEvent) => {
    e.preventDefault();
    casinoAudio.playWin();
    if (!newAddress.trim()) return;

    const newWallet: MasterCryptoWallet = {
      id: `${newCategory.toUpperCase()}_${Date.now()}`,
      symbol: newSymbol.trim().toUpperCase(),
      methodCategory: newCategory,
      network: newNetwork.trim() || (newCategory === "binance" ? "Binance Pay ID" : "Web3 Address"),
      name: newName.trim() || (newCategory === "binance" ? `Binance Pay (${newSymbol})` : `Web3 (${newSymbol})`),
      address: newAddress.trim(),
      icon: newIcon.trim() || (newCategory === "binance" ? "🟡" : "🌐"),
      color: newCategory === "binance" ? "#F0B90B" : "#26A17B",
      enabled: true,
      isConfirmed: true,
      confirmedAt: new Date().toISOString(),
      confirmedBy: currentUser?.name || "Admin",
      minDeposit: newMinDep,
      minWithdrawal: newMinWith
    };

    const updated = addMasterCryptoWallet(newWallet);
    setAdminWallets(updated);
    setShowAddWalletModal(false);
    setNewAddress("");
    onAddAuditLog(`${currentUser?.name || "Admin"}: Created & Confirmed new ${newCategory.toUpperCase()} wallet: ${newWallet.address}`, "success");
  };

  // P2P Mobile Banking Agents state (Max 25)
  const [p2pAgents, setP2pAgents] = useState<any[]>(() => {
    return getMergedP2PAgents();
  });

  const saveAgentsUnified = (newList: any[]) => {
    // Force lowercase/uppercase consistency or field duplicates
    const normalizedList = newList.map((a, i) => {
      const num = i + 1;
      const padNum = String(num).padStart(2, "0");
      return {
        ...a,
        phone: a.phone || a.phoneNumber || `017100000${padNum}`,
        phoneNumber: a.phoneNumber || a.phone || `017100000${padNum}`,
        email: a.email || `agent${num}@casino.com`,
        password: a.password || `agent${num}pwd`,
        balance: typeof a.balance === "number" ? a.balance : 250000,
        status: a.status || "active",
      };
    });
    setAgents(normalizedList);
    setP2pAgents(normalizedList);
    localStorage.setItem("casino_agents_v1", JSON.stringify(normalizedList));
    localStorage.setItem("casino_p2p_agents_v1", JSON.stringify(normalizedList));
    saveAllP2PAgentsToDatabase(normalizedList as any);
  };

  // State for creating new P2P Agent
  const [showAddAgentForm, setShowAddAgentForm] = useState(false);
  const [newP2pName, setNewP2pName] = useState("");
  const [newP2pPhone, setNewP2pPhone] = useState("");
  const [newP2pService, setNewP2pService] = useState("bKash");
  const [newP2pRating, setNewP2pRating] = useState("4.9");
  const [newP2pSpeed, setNewP2pSpeed] = useState("1-3 mins");
  const [newP2pAvatar, setNewP2pAvatar] = useState("👨‍💼");
  const [newP2pIsVerified, setNewP2pIsVerified] = useState(true);
  const [newP2pShowOnDeposit, setNewP2pShowOnDeposit] = useState(true);
  const [newP2pShowOnWithdrawal, setNewP2pShowOnWithdrawal] = useState(true);
  const [newP2pError, setNewP2pError] = useState("");
  const [newP2pSuccess, setNewP2pSuccess] = useState("");

  // State for editing P2P Agent
  const [editingP2pId, setEditingP2pId] = useState<string | null>(null);
  const [editP2pName, setEditP2pName] = useState("");
  const [editP2pPhone, setEditP2pPhone] = useState("");
  const [editP2pService, setEditP2pService] = useState("bKash");
  const [editP2pRating, setEditP2pRating] = useState("");
  const [editP2pSpeed, setEditP2pSpeed] = useState("");
  const [editP2pAvatar, setEditP2pAvatar] = useState("");
  const [editP2pShowOnDeposit, setEditP2pShowOnDeposit] = useState(true);
  const [editP2pShowOnWithdrawal, setEditP2pShowOnWithdrawal] = useState(true);

  // Handlers for P2P Agents management
  const handleToggleP2pVerified = (id: string) => {
    casinoAudio.playClick();
    const updated = p2pAgents.map(a => a.id === id ? { ...a, isVerified: !a.isVerified } : a);
    saveAgentsUnified(updated);
    onAddAuditLog(`${currentUser?.name || "Sub-Admin"}: Toggled Verified status for P2P Agent [${id}]`, "info");
  };

  const handleToggleP2pHidden = (id: string) => {
    casinoAudio.playClick();
    const updated = p2pAgents.map(a => a.id === id ? { ...a, isHidden: !a.isHidden } : a);
    saveAgentsUnified(updated);
    onAddAuditLog(`${currentUser?.name || "Sub-Admin"}: Toggled Visibility (isHidden) status for P2P Agent [${id}]`, "info");
  };

  const handleToggleP2pShowOnDeposit = (id: string) => {
    casinoAudio.playClick();
    const updated = p2pAgents.map(a => {
      if (a.id === id) {
        const currentVal = a.showOnDeposit !== false;
        return { ...a, showOnDeposit: !currentVal };
      }
      return a;
    });
    saveAgentsUnified(updated);
    onAddAuditLog(`${currentUser?.name || "Sub-Admin"}: Toggled Show-on-Deposit status for P2P Agent [${id}]`, "info");
  };

  const handleToggleP2pShowOnWithdrawal = (id: string) => {
    casinoAudio.playClick();
    const updated = p2pAgents.map(a => {
      if (a.id === id) {
        const currentVal = a.showOnWithdrawal !== false;
        return { ...a, showOnWithdrawal: !currentVal };
      }
      return a;
    });
    saveAgentsUnified(updated);
    onAddAuditLog(`${currentUser?.name || "Sub-Admin"}: Toggled Show-on-Withdrawal status for P2P Agent [${id}]`, "info");
  };

  const handleDeleteP2pAgent = async (id: string) => {
    casinoAudio.playClick();
    if (!window.confirm("Are you sure you want to delete this P2P mobile banking agent?")) return;
    setEditingP2pId(null);
    const updated = p2pAgents.filter(a => a.id !== id);
    saveAgentsUnified(updated);
    onAddAuditLog(`${currentUser?.name || "Sub-Admin"}: Deleted P2P Agent [${id}]`, "danger");
  };

  const handleCreateP2pAgent = (e: React.FormEvent) => {
    e.preventDefault();
    casinoAudio.playClick();
    setNewP2pError("");
    setNewP2pSuccess("");

    if (p2pAgents.length >= 25) {
      setNewP2pError("Maximum limit of 25 P2P agents reached! Remove or hide an existing agent first.");
      return;
    }

    if (!newP2pName.trim() || !newP2pPhone.trim()) {
      setNewP2pError("Name and Phone fields are required.");
      return;
    }

    const nextId = `p2p-agent-${Date.now()}`;
    const newAgent = {
      id: nextId,
      name: newP2pName.trim(),
      phone: newP2pPhone.trim(),
      phoneNumber: newP2pPhone.trim(),
      service: newP2pService,
      rating: newP2pRating.trim() || "4.9",
      speed: newP2pSpeed.trim() || "1-3 mins",
      avatar: newP2pAvatar.trim() || "👨‍💼",
      isVerified: newP2pIsVerified,
      isHidden: false,
      showOnDeposit: newP2pShowOnDeposit,
      showOnWithdrawal: newP2pShowOnWithdrawal,
      email: `agent-${nextId}@casino.com`,
      password: `agent${p2pAgents.length + 1}pwd`,
      balance: 250000,
      status: "active",
      depositRequestsProcessed: 0,
      withdrawRequestsProcessed: 0,
      totalVolumeApproved: 0
    };

    const updated = [...p2pAgents, newAgent];
    saveAgentsUnified(updated);

    onAddAuditLog(`${currentUser?.name || "Sub-Admin"}: Created new P2P Agent [${newAgent.name}] for service [${newAgent.service}]`, "success");
    setNewP2pSuccess(`P2P Agent "${newAgent.name}" registered successfully!`);

    // Reset inputs
    setNewP2pName("");
    setNewP2pPhone("");
    setNewP2pRating("4.9");
    setNewP2pSpeed("1-3 mins");
    setNewP2pAvatar("👨‍💼");
    setNewP2pIsVerified(true);
    setNewP2pShowOnDeposit(true);
    setNewP2pShowOnWithdrawal(true);
  };

  const handleStartEditP2p = (agent: any) => {
    casinoAudio.playClick();
    setEditingP2pId(agent.id);
    setEditP2pName(agent.name || "");
    setEditP2pPhone(agent.phone || agent.phoneNumber || "");
    setEditP2pService(agent.service || "bKash");
    setEditP2pRating(agent.rating || "");
    setEditP2pSpeed(agent.speed || "");
    setEditP2pAvatar(agent.avatar || "👨‍💼");
    setEditP2pShowOnDeposit(agent.showOnDeposit !== false);
    setEditP2pShowOnWithdrawal(agent.showOnWithdrawal !== false);
  };

  const handleSaveEditP2p = (e: React.FormEvent) => {
    e.preventDefault();
    casinoAudio.playClick();
    if (!editingP2pId) return;

    const updated = p2pAgents.map(a => {
      if (a.id === editingP2pId) {
        return {
          ...a,
          name: editP2pName.trim(),
          phone: editP2pPhone.trim(),
          phoneNumber: editP2pPhone.trim(),
          service: editP2pService,
          rating: editP2pRating.trim(),
          speed: editP2pSpeed.trim(),
          avatar: editP2pAvatar.trim(),
          showOnDeposit: editP2pShowOnDeposit,
          showOnWithdrawal: editP2pShowOnWithdrawal,
        };
      }
      return a;
    });

    saveAgentsUnified(updated);
    onAddAuditLog(`${currentUser?.name || "Sub-Admin"}: Updated details for P2P Agent [${editingP2pId}]`, "info");
    setEditingP2pId(null);
  };

  const handleResetP2pDefaults = () => {
    casinoAudio.playClick();
    if (!window.confirm("This will restore the 12 default system VIP P2P agents. Proceed?")) return;
    saveAgentsUnified(DEFAULT_P2P_AGENTS);
    onAddAuditLog(`${currentUser?.name || "Sub-Admin"}: Reset P2P Mobile Banking Agents to factory defaults.`, "warning");
  };

  // Sub-Admins management states
  const [subAdmins, setSubAdmins] = useState<any[]>(() => {
    return getSubAdmins();
  });

  const [newSubAdminName, setNewSubAdminName] = useState("");
  const [newSubAdminUsername, setNewSubAdminUsername] = useState("");
  const [newSubAdminEmail, setNewSubAdminEmail] = useState("");
  const [newSubAdminPhone, setNewSubAdminPhone] = useState("");
  const [newSubAdminKey, setNewSubAdminKey] = useState("");
  const [newSubAdminFormError, setNewSubAdminFormError] = useState("");
  const [newSubAdminFormSuccess, setNewSubAdminFormSuccess] = useState("");

  const [editingSubAdmin, setEditingSubAdmin] = useState<any | null>(null);

  // New Agent Registration Form states
  const [newAgentCustomId, setNewAgentCustomId] = useState("");
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentEmail, setNewAgentEmail] = useState("");
  const [newAgentPhone, setNewAgentPhone] = useState("");
  const [newAgentPassword, setNewAgentPassword] = useState("");
  const [newAgentService, setNewAgentService] = useState("bKash");
  const [newAgentFormError, setNewAgentFormError] = useState("");
  const [newAgentFormSuccess, setNewAgentFormSuccess] = useState("");

  // Edit existing agent modal state
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [editAgentData, setEditAgentData] = useState<{
    id: string;
    name: string;
    email: string;
    phone: string;
    password: string;
    service: string;
    showOnDeposit: boolean;
    showOnWithdrawal: boolean;
  } | null>(null);

  // Harbinger Administrative Audit Monitor logs state
  const [harbingerLogs, setHarbingerLogs] = useState<any[]>(() => {
    const stored = localStorage.getItem("harbinger_audit_trail_v1");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const addHarbingerLog = (actionType: string, details: string) => {
    const newLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString(),
      actionType,
      details,
      actorName: currentUser?.name || "System Operator",
      actorRole: currentUser?.role || "admin",
    };
    setHarbingerLogs((prev) => {
      const next = [newLog, ...prev].slice(0, 100);
      localStorage.setItem("harbinger_audit_trail_v1", JSON.stringify(next));
      return next;
    });
  };

  // Harbinger Master Authentication Gate state
  const [isHarbingerUnlocked, setIsHarbingerUnlocked] = useState<boolean>(false);
  const [isHarbingerModalOpen, setIsHarbingerModalOpen] = useState<boolean>(false);
  const [harbingerPasswordInput, setHarbingerPasswordInput] = useState<string>("");
  const [harbingerAuthError, setHarbingerAuthError] = useState<string>("");
  const [pendingHarbingerAction, setPendingHarbingerAction] = useState<"INJECT" | "EJECT" | "REMOVE" | "UNLOCK_ONLY" | null>(null);

  const handleRegisterAgentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNewAgentFormError("");
    setNewAgentFormSuccess("");

    if (!newAgentName.trim() || !newAgentEmail.trim() || !newAgentPhone.trim() || !newAgentPassword.trim()) {
      setNewAgentFormError("Full Name, Email, Phone, and Password are required.");
      return;
    }

    let finalId = newAgentCustomId.trim();
    if (!finalId) {
      const nextNum = agents.length + 1;
      const padNum = String(nextNum).padStart(2, "0");
      finalId = `AGENT-${padNum}`;
    }

    // Verify if Agent ID already exists
    const idExists = agents.some(a => a.id.toLowerCase() === finalId.toLowerCase());
    if (idExists) {
      setNewAgentFormError(`An agent with ID "${finalId}" already exists. Please enter a unique Agent ID.`);
      return;
    }

    // Verify if email already exists in agents
    const emailExists = agents.some(a => a.email.toLowerCase() === newAgentEmail.toLowerCase());
    if (emailExists) {
      setNewAgentFormError(`An agent with email "${newAgentEmail}" already exists.`);
      return;
    }

    const newAgent = {
      id: finalId,
      name: newAgentName.trim(),
      email: newAgentEmail.trim(),
      password: newAgentPassword.trim(),
      phone: newAgentPhone.trim(),
      phoneNumber: newAgentPhone.trim(),
      service: newAgentService,
      rating: "5.0",
      speed: "1-3 mins",
      avatar: "👨‍💼",
      isVerified: true,
      isHidden: false,
      showOnDeposit: true,
      showOnWithdrawal: true,
      balance: 250000,
      status: "active",
      depositRequestsProcessed: 0,
      withdrawRequestsProcessed: 0,
      totalVolumeApproved: 0
    };

    const updatedAgents = [newAgent, ...agents];
    saveAgentsUnified(updatedAgents);

    // Reset fields
    setNewAgentCustomId("");
    setNewAgentName("");
    setNewAgentEmail("");
    setNewAgentPhone("");
    setNewAgentPassword("");
    setNewAgentFormSuccess(`Agent [${finalId}] registered successfully with custom credentials!`);

    // Save audit log
    onAddAuditLog(`ADMIN: Registered new P2P Mobile Agent [${newAgent.name}] (ID: ${finalId}) with custom password and assigned route [${newAgentService}].`, "success");
    addHarbingerLog("REGISTER_AGENT", `Created P2P Mobile Agent ${newAgent.name} (${finalId}) with initial float $250,000`);
  };

  const handleSaveEditAgent = (originalId: string) => {
    if (!editAgentData) return;
    if (!editAgentData.id.trim() || !editAgentData.name.trim() || !editAgentData.email.trim() || !editAgentData.password.trim()) {
      alert("Agent ID, Name, Email, and Password cannot be empty.");
      return;
    }

    // Check ID conflict
    if (editAgentData.id.trim().toLowerCase() !== originalId.toLowerCase()) {
      const conflict = agents.some(a => a.id.toLowerCase() === editAgentData.id.trim().toLowerCase());
      if (conflict) {
        alert(`An agent with ID "${editAgentData.id}" already exists.`);
        return;
      }
    }

    const updatedAgents = agents.map(a => {
      if (a.id === originalId) {
        return {
          ...a,
          id: editAgentData.id.trim(),
          name: editAgentData.name.trim(),
          email: editAgentData.email.trim(),
          phone: editAgentData.phone.trim(),
          phoneNumber: editAgentData.phone.trim(),
          password: editAgentData.password.trim(),
          service: editAgentData.service,
          showOnDeposit: editAgentData.showOnDeposit,
          showOnWithdrawal: editAgentData.showOnWithdrawal
        };
      }
      return a;
    });

    saveAgentsUnified(updatedAgents);
    setEditingAgentId(null);
    setEditAgentData(null);
    casinoAudio.playChipClink();
    onAddAuditLog(`ADMIN: Updated credentials and route controls for Agent [${originalId}] -> [${editAgentData.id}]`, "warning");
    addHarbingerLog("EDIT_AGENT", `Updated Agent [${originalId}] credentials and routes`);
  };

  const handleDeleteAgent = async (agentId: string) => {
    setEditingAgentId(null);
    setEditAgentData(null);
    const updated = deleteP2PAgent(agentId);
    setAgents(updated);
    setP2pAgents(updated);
    casinoAudio.playClick();
    onAddAuditLog(`ADMIN: Deleted Agent [${agentId}] from system`, "danger");
    addHarbingerLog("DELETE_AGENT", `Removed Agent [${agentId}]`);
    broadcastFinancialStateUpdates();
  };

  const handleRegisterSubAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNewSubAdminFormError("");
    setNewSubAdminFormSuccess("");

    if (!newSubAdminName.trim() || !newSubAdminUsername.trim() || !newSubAdminEmail.trim() || !newSubAdminPhone.trim() || !newSubAdminKey.trim()) {
      setNewSubAdminFormError("All fields are required.");
      return;
    }

    const usernameExists = subAdmins.some(
      (sa) => sa.username.toLowerCase() === newSubAdminUsername.trim().toLowerCase()
    );
    if (usernameExists) {
      setNewSubAdminFormError(`A Sub-Admin with username "${newSubAdminUsername}" already exists.`);
      return;
    }

    const newSubAdmin = {
      username: newSubAdminUsername.trim(),
      name: newSubAdminName.trim(),
      email: newSubAdminEmail.trim(),
      phoneNumber: newSubAdminPhone.trim(),
      securityKey: newSubAdminKey.trim(),
      status: "active",
      created_at: new Date().toLocaleDateString(),
      actionsAllowed: {
        manageAgents: true,
        approveCrypto: true,
        adjustBalances: true
      }
    };

    const updated = [newSubAdmin, ...subAdmins];
    setSubAdmins(updated);
    saveAllSubAdminsToDatabase(updated);

    setNewSubAdminName("");
    setNewSubAdminUsername("");
    setNewSubAdminEmail("");
    setNewSubAdminPhone("");
    setNewSubAdminKey("");
    setNewSubAdminFormSuccess(`Sub-Admin "${newSubAdmin.username}" registered successfully!`);
    
    onAddAuditLog(`SECURITY: Super Admin registered new Sub-Admin node: ${newSubAdmin.name} (${newSubAdmin.username})`, "success");
    addHarbingerLog("SUB_ADMIN_CREATED", `Registered new Sub-Admin node: ${newSubAdmin.name} (${newSubAdmin.username})`);
  };

  const handleUpdateSubAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubAdmin) return;

    const updated = subAdmins.map((sa) => {
      if (sa.username === editingSubAdmin.username) {
        return editingSubAdmin;
      }
      return sa;
    });

    setSubAdmins(updated);
    saveAllSubAdminsToDatabase(updated);
    setEditingSubAdmin(null);

    onAddAuditLog(`SECURITY: Super Admin updated Sub-Admin credentials/details for: ${editingSubAdmin.name} (${editingSubAdmin.username})`, "warning");
    addHarbingerLog("SUB_ADMIN_UPDATED", `Updated Sub-Admin details/credentials for node: ${editingSubAdmin.name}`);
  };

  const handleToggleSubAdminStatus = (username: string) => {
    casinoAudio.playClick();
    const updated = subAdmins.map((sa) => {
      if (sa.username === username) {
        const nextStatus = sa.status === "active" ? "suspended" : "active";
        onAddAuditLog(`SECURITY: Super Admin toggled block status for Sub-Admin ${sa.name} to: [${nextStatus.toUpperCase()}]`, nextStatus === "suspended" ? "danger" : "success");
        addHarbingerLog("SUB_ADMIN_STATUS_TOGGLE", `Toggled Sub-Admin status for ${sa.name} to: [${nextStatus.toUpperCase()}]`);
        return { ...sa, status: nextStatus };
      }
      return sa;
    });
    setSubAdmins(updated);
    saveAllSubAdminsToDatabase(updated);
  };

  const handleDeleteSubAdmin = (username: string) => {
    casinoAudio.playClick();
    if (username === "subadmin") {
      onAddAuditLog(`SECURITY: Attempt to delete Core Sub-Admin node rejected. Core node is immutable.`, "danger");
      return;
    }
    const filtered = subAdmins.filter((sa) => sa.username !== username);
    setSubAdmins(filtered);
    saveAllSubAdminsToDatabase(filtered);
    onAddAuditLog(`SECURITY: Super Admin deleted Sub-Admin node: ${username}`, "danger");
    addHarbingerLog("SUB_ADMIN_DELETED", `Deleted Sub-Admin node: ${username}`);
  };

  const handleToggleSubAdminPermission = (username: string, permissionKey: "manageAgents" | "approveCrypto" | "adjustBalances") => {
    casinoAudio.playClick();
    const updated = subAdmins.map((sa) => {
      if (sa.username === username) {
        const currentAllowed = sa.actionsAllowed ? sa.actionsAllowed[permissionKey] : true;
        const updatedPermissions = {
          ...(sa.actionsAllowed || { manageAgents: true, approveCrypto: true, adjustBalances: true }),
          [permissionKey]: !currentAllowed
        };
        onAddAuditLog(`SECURITY: Altered permission [${permissionKey}] for Sub-Admin ${sa.name} to: [${(!currentAllowed).toString().toUpperCase()}]`, "warning");
        addHarbingerLog("SUB_ADMIN_PERMISSION_CHANGED", `Altered permission [${permissionKey}] for ${sa.name} to: [${(!currentAllowed).toString().toUpperCase()}]`);
        return { ...sa, actionsAllowed: updatedPermissions };
      }
      return sa;
    });
    setSubAdmins(updated);
    saveAllSubAdminsToDatabase(updated);
  };

  const [pnlStats, setPnlStats] = useState({
    slotsRev: 45200,
    blackjackRev: 18450,
    rouletteRev: -12300,
    pokerRev: 9400,
    crashRev: 29500,
  });

  const [refSettings, setRefSettings] = useState(() => {
    return getReferralSettings();
  });

  const [refEvents, setRefEvents] = useState<any[]>(() => {
    return getReferralEvents();
  });

  const [bankingRequests, setBankingRequests] = useState<any[]>(() => {
    return getBankingRequests();
  });

  const [overridePlayerEmail, setOverridePlayerEmail] = useState("");
  const [overrideNewCode, setOverrideNewCode] = useState("");

  // Enterprise Crypto states
  const [cryptoHalted, setCryptoHalted] = useState(() => {
    return localStorage.getItem("crypto_operations_halted") === "true";
  });
  const [cryptoAddresses, setCryptoAddresses] = useState(() => ({
    USDT: localStorage.getItem("crypto_wallet_address_USDT") || "TGKMq1X5fFK4HTKVYnaVyUnuzMomEpbgCK",
    BTC: localStorage.getItem("crypto_wallet_address_BTC") || "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    ETH: localStorage.getItem("crypto_wallet_address_ETH") || "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    SOL: localStorage.getItem("crypto_wallet_address_SOL") || "HN7cABmqZsJe6SDoCg9CoN3oZ37R59eG2W4y4m5fS2Xv"
  }));
  const [cryptoRates, setCryptoRates] = useState(() => ({
    USDT: Number(localStorage.getItem("crypto_exchange_rate_USDT") || "125"),
    BTC: Number(localStorage.getItem("crypto_exchange_rate_BTC") || "8250000"),
    ETH: Number(localStorage.getItem("crypto_exchange_rate_ETH") || "425000"),
    SOL: Number(localStorage.getItem("crypto_exchange_rate_SOL") || "22500")
  }));
  const [cryptoVaults, setCryptoVaults] = useState(() => ({
    USDT: Number(localStorage.getItem("crypto_vault_USDT") || "15820.50"),
    BTC: Number(localStorage.getItem("crypto_vault_BTC") || "0.458"),
    ETH: Number(localStorage.getItem("crypto_vault_ETH") || "8.924"),
    SOL: Number(localStorage.getItem("crypto_vault_SOL") || "142.35")
  }));
  const [validationThreshold, setValidationThreshold] = useState(() => {
    return Number(localStorage.getItem("crypto_validation_threshold") || "10000");
  });

  // State to hold mock verification feedback
  const [verifyingTxId, setVerifyingTxId] = useState<string | null>(null);
  const [verificationFeedback, setVerificationFeedback] = useState<Record<string, "verified" | "error" | "none">>({});

  const handleToggleCryptoHalt = () => {
    casinoAudio.playClick();
    const nextHalt = !cryptoHalted;
    setCryptoHalted(nextHalt);
    localStorage.setItem("crypto_operations_halted", String(nextHalt));
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("crypto_config_updated"));
    onAddAuditLog(`CRYPTO CONTROL: Administrative transaction halt set to [${nextHalt ? "ENABLED - OPERATIONS FROZEN" : "DISABLED - OPERATIONS LIVE"}]`, nextHalt ? "danger" : "success");
  };

  const handleUpdateCryptoAddress = (coin: "USDT" | "BTC" | "ETH" | "SOL", address: string) => {
    setCryptoAddresses(prev => {
      const next = { ...prev, [coin]: address };
      localStorage.setItem(`crypto_wallet_address_${coin}`, address);
      return next;
    });
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("crypto_config_updated"));
    onAddAuditLog(`CRYPTO CONTROL: Updated receiving address for ${coin} to [${address}]`, "info");
  };

  const handleUpdateCryptoRate = (coin: "USDT" | "BTC" | "ETH" | "SOL", rate: number) => {
    if (rate <= 0) return;
    setCryptoRates(prev => {
      const next = { ...prev, [coin]: rate };
      localStorage.setItem(`crypto_exchange_rate_${coin}`, String(rate));
      return next;
    });
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("crypto_config_updated"));
    onAddAuditLog(`CRYPTO CONTROL: Updated conversion exchange rate for ${coin} to [$${rate.toLocaleString()}] chips`, "info");
  };

  const handleUpdateCryptoVault = (coin: "USDT" | "BTC" | "ETH" | "SOL", amount: number) => {
    setCryptoVaults(prev => {
      const next = { ...prev, [coin]: amount };
      localStorage.setItem(`crypto_vault_${coin}`, String(amount));
      return next;
    });
    onAddAuditLog(`CRYPTO CONTROL: Manually adjusted ${coin} hot-vault reserve balance to [${amount}]`, "info");
  };

  const handleUpdateThreshold = (val: number) => {
    setValidationThreshold(val);
    localStorage.setItem("crypto_validation_threshold", String(val));
    onAddAuditLog(`CRYPTO CONTROL: Set multi-sig security audit warning threshold to [$${val.toLocaleString()}] USDT`, "info");
  };

  // Mock txhash verification
  const handleVerifyTxHash = (requestId: string) => {
    casinoAudio.playClick();
    setVerifyingTxId(requestId);
    setTimeout(() => {
      setVerifyingTxId(null);
      setVerificationFeedback(prev => ({ ...prev, [requestId]: "verified" }));
      casinoAudio.playWin();
      onAddAuditLog(`CRYPTO SECURITY: Mocked blockchain validator queried. Transaction ID [${requestId}] is confirmed on-chain. Amount matches ledger state.`, "success");
    }, 1500);
  };

  // Emergency Cold Vault Sweep
  const handleSweepVault = () => {
    casinoAudio.playWin();
    const sweptUSDT = cryptoVaults.USDT;
    const sweptBTC = cryptoVaults.BTC;
    const sweptETH = cryptoVaults.ETH;
    const sweptSOL = cryptoVaults.SOL;

    setCryptoVaults({
      USDT: 0,
      BTC: 0,
      ETH: 0,
      SOL: 0
    });
    localStorage.setItem("crypto_vault_USDT", "0");
    localStorage.setItem("crypto_vault_BTC", "0");
    localStorage.setItem("crypto_vault_ETH", "0");
    localStorage.setItem("crypto_vault_SOL", "0");

    onAddAuditLog(`CRYPTO SECURITY SWEEP: Triggered manual enterprise sweep. Transferred ${sweptUSDT} USDT, ${sweptBTC} BTC, ${sweptETH} ETH, and ${sweptSOL} SOL into cold-storage hardware keys. Hot-vaults set to 0.`, "success");
    alert(`🚀 Enterprise Sweep Completed Successfully!\n\nAll hot wallet funds have been securely swept and processed into Cold Storage Hardware Wallets.\n- USDT: ${sweptUSDT}\n- BTC: ${sweptBTC}\n- ETH: ${sweptETH}\n- SOL: ${sweptSOL}`);
  };

  // Custom Mock Injection of Crypto Deposit
  const handleInjectMockCryptoDeposit = () => {
    casinoAudio.playChipClink();
    const randomAmount = Math.floor(Math.random() * 500) + 50; // $50 - $550
    const randomCoin = (["USDT", "BTC", "ETH", "SOL"] as const)[Math.floor(Math.random() * 4)];
    const USDTAmount = Math.floor(randomAmount * cryptoRates[randomCoin]);
    const txId = "TX-MOCK-" + Math.random().toString(36).substring(2, 9).toUpperCase();
    
    const newReq = {
      id: txId,
      type: "deposit",
      playerEmail: "test.highroller@gmail.com",
      playerName: "VegasVance_Tester",
      mobileBankingNumber: "MOCK-HOT-WALLET",
      mobileBankingService: `CRYPTO (${randomCoin})`,
      amount: USDTAmount,
      status: "pending",
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isCrypto: true,
      cryptoAsset: randomCoin,
      cryptoWalletAddress: cryptoAddresses[randomCoin],
      cryptoTxHash: "0x" + Math.random().toString(16).substring(2, 18) + "mockhash...",
    };

    const nextReqs = [newReq, ...bankingRequests];
    setBankingRequests(nextReqs);
    localStorage.setItem("casino_banking_requests_v1", JSON.stringify(nextReqs));
    saveBankingRequestToDatabase(newReq as any);
    onAddAuditLog(`CRYPTO LEDGER: Mock Crypto deposit injected. Player "VegasVance_Tester" requested ${randomAmount} ${randomCoin} ($${USDTAmount.toLocaleString()} chips) via hash [${newReq.cryptoTxHash}].`, "info");
  };

  const handleP2pApproveTicket = (requestId: string) => {
    casinoAudio.playClick();
    const updatedRequests = bankingRequests.map(req => {
      if (req.id === requestId) {
        onAddAuditLog(`BANKING: Admin approved P2P Deposit Ticket [${requestId}] for ${req.playerName}. Escrow channel active.`, "info");
        return { ...req, status: "ticket_approved" as const };
      }
      return req;
    });
    setBankingRequests(updatedRequests);
    localStorage.setItem("casino_banking_requests_v1", JSON.stringify(updatedRequests));
    saveAllBankingRequestsToDatabase(updatedRequests);
  };

  const handleApproveBanking = (requestId: string) => {
    casinoAudio.playChipClink();
    let targetReq: any = null;

    const updatedRequests = bankingRequests.map(req => {
      if (req.id === requestId && (req.status === "pending" || req.status === "ticket_approved" || req.status === "payment_submitted")) {
        targetReq = req;
        return { ...req, status: "approved" as const };
      }
      return req;
    });

    if (targetReq) {
      // Load all registered players
      const storedPlayersStr = localStorage.getItem("registered_players_v1");
      let updatedPlayers = [...registeredPlayers];
      if (storedPlayersStr) {
        try {
          updatedPlayers = JSON.parse(storedPlayersStr);
        } catch (e) {}
      }

      const playerIdx = updatedPlayers.findIndex(p => p && p.email && targetReq.playerEmail && p.email.toLowerCase() === targetReq.playerEmail.toLowerCase());
      const activeUserJSON = localStorage.getItem("casino_user");
      let isActivePlayerLoggedIn = false;
      if (activeUserJSON) {
        try {
          const parsed = JSON.parse(activeUserJSON);
          isActivePlayerLoggedIn = !!(parsed?.email && targetReq.playerEmail && parsed.email.toLowerCase() === targetReq.playerEmail.toLowerCase());
        } catch (e) {}
      }

      if (targetReq.type === "deposit") {
        // Approve Deposit: Process dynamic deposit bonus (200%/300%/400%) & 30x wagering requirement target
        const depositRes = processDepositApprovalForPlayer(targetReq.playerEmail, targetReq.amount, targetReq.id);
        
        // Direct Admin Deposit Approval -> House Vault Reserves +targetReq.amount
        const nextPool = housePool + targetReq.amount;
        onUpdateHousePool(nextPool);
        updateHouseVaultReserves(+targetReq.amount);

        if (isActivePlayerLoggedIn) {
          const newBalance = userChips + targetReq.amount;
          onUpdateUserChips(newBalance);
          localStorage.setItem("casino_chips", String(newBalance));
        }

        // Trigger referral reward settlement
        const refRes = processRefereeDepositReferral(targetReq.playerEmail, targetReq.amount);
        if (refRes.success) {
          onAddAuditLog(`REFERRAL SETTLEMENT: Approved $${refRes.rewardAmount.toFixed(2)} USDT referral bonus for referrer ${refRes.referrerName} (${refRes.referrerEmail}) following referee ${targetReq.playerName}'s deposit for gameplay!`, "success");
          setRefEvents(getReferralEvents());
        }

        const bInfo = depositRes ? `🎁 +$${depositRes.bonusAmount.toLocaleString()} Bonus (${depositRes.bonusPercent}% Match) added to Locked Balance with +$${depositRes.addedWagerRequired.toLocaleString()} (30x) Wagering Target` : "";
        onAddAuditLog(`BANKING: Admin approved ${targetReq.isCrypto ? `Crypto (${targetReq.cryptoAsset})` : "Mobile"} deposit of $${targetReq.amount.toLocaleString()} chips for player ${targetReq.playerName}. House Vault Reserves credited +$${targetReq.amount.toLocaleString()}. ${bInfo}`, "success");
        if (targetReq.isCrypto) {
          addHarbingerLog("APPROVE_CRYPTO", `Approved Crypto deposit request ${targetReq.id} of $${targetReq.amount.toLocaleString()} for player ${targetReq.playerName}`);
        }
      } else {
        // Approve Withdrawal: Payout processed (chips were already deducted on request creation) -> House Vault Reserves -targetReq.amount
        const nextPool = Math.max(0, housePool - targetReq.amount);
        onUpdateHousePool(nextPool);
        updateHouseVaultReserves(-targetReq.amount);

        onAddAuditLog(`BANKING: Admin approved ${targetReq.isCrypto ? `Crypto (${targetReq.cryptoAsset})` : "Mobile"} withdrawal of $${targetReq.amount.toLocaleString()} chips for player ${targetReq.playerName} (${targetReq.playerEmail}). House Vault Reserves debited -$${targetReq.amount.toLocaleString()}.`, "success");
        if (targetReq.isCrypto) {
          addHarbingerLog("APPROVE_CRYPTO", `Approved Crypto withdrawal request ${targetReq.id} of $${targetReq.amount.toLocaleString()} for player ${targetReq.playerName}`);
        }
      }

      // Update simulated crypto vaults on approval
      if (targetReq.isCrypto && targetReq.cryptoAsset) {
        const coin = targetReq.cryptoAsset as "USDT" | "BTC" | "ETH" | "SOL";
        const rate = cryptoRates[coin] || 125;
        const cryptoEquiv = targetReq.amount / rate;
        const multiplier = targetReq.type === "deposit" ? 1 : -1;
        const nextVaultVal = Number((cryptoVaults[coin] + (cryptoEquiv * multiplier)).toFixed(6));
        const safeNextVaultVal = Math.max(0, nextVaultVal);
        setCryptoVaults(prev => {
          const next = { ...prev, [coin]: safeNextVaultVal };
          localStorage.setItem(`crypto_vault_${coin}`, String(safeNextVaultVal));
          return next;
        });
      }

      setRegisteredPlayers(updatedPlayers);
      localStorage.setItem("registered_players_v1", JSON.stringify(updatedPlayers));
      saveAllPlayersToDatabase(updatedPlayers as any);
      if (targetReq) {
        saveBankingRequestToDatabase(targetReq);
      }
    }

    setBankingRequests(updatedRequests);
    localStorage.setItem("casino_banking_requests_v1", JSON.stringify(updatedRequests));
    if (targetReq) {
      saveBankingRequestToDatabase(targetReq);
    }
    broadcastFinancialStateUpdates();
  };

  const handleRejectBanking = (requestId: string) => {
    casinoAudio.playClick();
    let targetReq: any = null;

    const updatedRequests = bankingRequests.map(req => {
      if (req.id === requestId && (req.status === "pending" || req.status === "ticket_approved" || req.status === "payment_submitted")) {
        targetReq = req;
        return { ...req, status: "rejected" as const };
      }
      return req;
    });

    if (targetReq) {
      // Load all registered players
      const storedPlayersStr = localStorage.getItem("registered_players_v1");
      let updatedPlayers = [...registeredPlayers];
      if (storedPlayersStr) {
        try {
          updatedPlayers = JSON.parse(storedPlayersStr);
        } catch (e) {}
      }

      const playerIdx = updatedPlayers.findIndex(p => p && p.email && targetReq.playerEmail && p.email.toLowerCase() === targetReq.playerEmail.toLowerCase());
      const activeUserJSON = localStorage.getItem("casino_user");
      let isActivePlayerLoggedIn = false;
      if (activeUserJSON) {
        try {
          const parsed = JSON.parse(activeUserJSON);
          isActivePlayerLoggedIn = !!(parsed?.email && targetReq.playerEmail && parsed.email.toLowerCase() === targetReq.playerEmail.toLowerCase());
        } catch (e) {}
      }

      if (targetReq.type === "withdraw") {
        // Reject Withdrawal: Return escrowed chips back to the player
        if (playerIdx !== -1) {
          updatedPlayers[playerIdx].chips = (updatedPlayers[playerIdx].chips || 0) + targetReq.amount;
        }
        if (isActivePlayerLoggedIn) {
          const newBalance = userChips + targetReq.amount;
          onUpdateUserChips(newBalance);
          localStorage.setItem("casino_chips", String(newBalance));
        }
        onAddAuditLog(`BANKING: Admin rejected ${targetReq.isCrypto ? `Crypto (${targetReq.cryptoAsset})` : "Mobile"} withdrawal of $${targetReq.amount.toLocaleString()} chips for player ${targetReq.playerName} (${targetReq.playerEmail}). Escrow refunded.`, "danger");
        if (targetReq.isCrypto) {
          addHarbingerLog("REJECT_CRYPTO", `Rejected Crypto withdrawal request ${targetReq.id} of $${targetReq.amount.toLocaleString()} for player ${targetReq.playerName}`);
        }
      } else {
        // Reject Deposit: No chips modified
        onAddAuditLog(`BANKING: Admin rejected ${targetReq.isCrypto ? `Crypto (${targetReq.cryptoAsset})` : "Mobile"} deposit of $${targetReq.amount.toLocaleString()} chips for player ${targetReq.playerName} (${targetReq.playerEmail}).`, "danger");
        if (targetReq.isCrypto) {
          addHarbingerLog("REJECT_CRYPTO", `Rejected Crypto deposit request ${targetReq.id} of $${targetReq.amount.toLocaleString()} for player ${targetReq.playerName}`);
        }
      }

      setRegisteredPlayers(updatedPlayers);
      localStorage.setItem("registered_players_v1", JSON.stringify(updatedPlayers));
      saveAllPlayersToDatabase(updatedPlayers as any);
      if (targetReq) {
        saveBankingRequestToDatabase(targetReq);
      }
    }

    setBankingRequests(updatedRequests);
    localStorage.setItem("casino_banking_requests_v1", JSON.stringify(updatedRequests));
    if (targetReq) {
      saveBankingRequestToDatabase(targetReq);
    }
    broadcastFinancialStateUpdates();
  };

  const saveReferralSettings = (updated: typeof refSettings) => {
    setRefSettings(updated);
    localStorage.setItem("referral_settings_v1", JSON.stringify(updated));
    onAddAuditLog(`ADMIN: Configured Referral Network policy parameters: Rewards (${updated.referrerBonus}/${updated.refereeBonus}), Status: ${updated.isEnabled ? "ACTIVE" : "INACTIVE"}`, "success");
  };

  const handleApproveReferral = (eventId: string) => {
    casinoAudio.playChipClink();
    const updatedEvents = refEvents.map(ev => {
      if (ev.id === eventId && (ev.status === "pending" || ev.status === "pending_deposit")) {
        // Find referrer and award them
        const updatedPlayers = registeredPlayers.map(p => {
          if (p.email.toLowerCase() === ev.referrerEmail.toLowerCase()) {
            const currentUnclaimed = p.unclaimedReferralChips || 0;
            const currentBonus = p.bonusBalance || 0;
            const rewardAmt = ev.rewardAmount || 2.5;
            const addedWager = rewardAmt * 30;
            return {
              ...p,
              unclaimedReferralChips: refSettings.autoPayout ? currentUnclaimed : currentUnclaimed + rewardAmt,
              bonusBalance: refSettings.autoPayout ? currentBonus + rewardAmt : currentBonus,
              totalWagerRequired: refSettings.autoPayout ? (p.totalWagerRequired || 0) + addedWager : (p.totalWagerRequired || 0),
            };
          }
          return p;
        });
        localStorage.setItem("registered_players_v1", JSON.stringify(updatedPlayers));
        setRegisteredPlayers(updatedPlayers);
        saveAllPlayersToDatabase(updatedPlayers as any);

        onAddAuditLog(`REFERRAL: Admin manually approved referral [${ev.id}]. Credited referrer [${ev.referrerName}] with $${Number(ev.rewardAmount || 2.5).toFixed(2)} USDT bonus.`, "success");
        return { ...ev, status: "approved" as const };
      }
      return ev;
    });

    setRefEvents(updatedEvents);
    localStorage.setItem("referral_events_v1", JSON.stringify(updatedEvents));
  };

  const handleRejectReferral = (eventId: string) => {
    casinoAudio.playClick();
    const updatedEvents = refEvents.map(ev => {
      if (ev.id === eventId && (ev.status === "pending" || ev.status === "pending_deposit")) {
        onAddAuditLog(`REFERRAL: Admin manually rejected referral [${ev.id}] initiated by [${ev.refereeName}].`, "danger");
        return { ...ev, status: "rejected" as const };
      }
      return ev;
    });

    setRefEvents(updatedEvents);
    localStorage.setItem("referral_events_v1", JSON.stringify(updatedEvents));
  };

  const handleOverrideReferralCode = (playerEmail: string, newCode: string) => {
    if (!newCode.trim()) return;
    const cleanCode = newCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    
    // Check if code already exists
    const codeExists = registeredPlayers.some(p => p.referralCode?.toUpperCase() === cleanCode);
    if (codeExists) {
      onAddAuditLog(`ADMIN ERROR: Failed to reassign code [${cleanCode}]. Code already claimed.`, "danger");
      return;
    }

    const updatedPlayers = registeredPlayers.map(p => {
      if (p.email.toLowerCase() === playerEmail.toLowerCase()) {
        const oldCode = p.referralCode || "NONE";
        onAddAuditLog(`ADMIN: Overrode player [${p.name}] invite code from [${oldCode}] to [${cleanCode}].`, "success");
        return { ...p, referralCode: cleanCode };
      }
      return p;
    });

    setRegisteredPlayers(updatedPlayers);
    localStorage.setItem("registered_players_v1", JSON.stringify(updatedPlayers));
    saveAllPlayersToDatabase(updatedPlayers as any);
    setOverridePlayerEmail("");
    setOverrideNewCode("");
  };

  // Sync registered players and admin state
  useEffect(() => {
    const syncAllAdminData = () => {
      setRegisteredPlayers(getRegisteredPlayers());
      setRefEvents(getReferralEvents());
      setSubAdmins(getSubAdmins());
      setBankingRequests(getBankingRequests());
      setAgents(getMergedP2PAgents());
      setP2pAgents(getMergedP2PAgents());
    };

    syncAllAdminData();
    fetchCloudPlayersFromD1().then((cloudP) => {
      if (Array.isArray(cloudP) && cloudP.length > 0) {
        setRegisteredPlayers(cloudP);
      }
    }).catch(() => {});

    fetchCloudSubAdminsFromD1().then((cloudSA) => {
      if (Array.isArray(cloudSA) && cloudSA.length > 0) {
        setSubAdmins(cloudSA);
      }
    }).catch(() => {});

    window.addEventListener("storage", syncAllAdminData);
    const interval = setInterval(syncAllAdminData, 2000);

    return () => {
      window.removeEventListener("storage", syncAllAdminData);
      clearInterval(interval);
    };
  }, []);
  
  // Custom IP Blocklist inputs
  const [ipBlocklist, setIpBlocklist] = useState<string[]>(["203.0.113.195", "198.51.100.42"]);
  const [newIpInput, setNewIpInput] = useState("");
  
  // Manual Balance adjustments state
  const [chipAdjTarget, setChipAdjTarget] = useState<string>("user");
  const [chipAdjAmount, setChipAdjAmount] = useState<number>(500);

  // Player management search & modal states
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [newPlayerForm, setNewPlayerForm] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    password: "",
    chips: 0,
    vipLevel: "VIP Bronze"
  });

  const [editingPlayerEmail, setEditingPlayerEmail] = useState<string | null>(null);
  const [editPlayerForm, setEditPlayerForm] = useState<{
    name: string;
    email: string;
    phoneNumber: string;
    password: string;
    chips: number;
    loanCount: number;
    status: "active" | "flagged" | "suspended";
    vipLevel: string;
  }>({
    name: "",
    email: "",
    phoneNumber: "",
    password: "",
    chips: 1000,
    loanCount: 0,
    status: "active",
    vipLevel: "VIP Bronze"
  });

  // Auto scroll terminals
  const auditBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (auditBottomRef.current) {
      auditBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [auditLogs, adminTab]);

  const handleAdjustChips = (mode: "add" | "sub") => {
    casinoAudio.playClick();
    const factor = mode === "add" ? 1 : -1;
    const finalChange = chipAdjAmount * factor;

    if (chipAdjTarget === "user") {
      const nextVal = Math.max(0, userChips + finalChange);
      onUpdateUserChips(nextVal);
      localStorage.setItem("casino_chips", String(nextVal));
      onAddAuditLog(`ADMIN: Adjusted User balance by $${finalChange > 0 ? "+" : ""}${finalChange.toLocaleString()} virtual chips (New Balance: $${nextVal.toLocaleString()})`, "success");
      addHarbingerLog("ADJUST_USER_CHIPS", `Adjusted User balance by $${finalChange > 0 ? "+" : ""}${finalChange} virtual chips.`);

      const activeUserStr = localStorage.getItem("casino_user");
      if (activeUserStr) {
        try {
          const userObj = JSON.parse(activeUserStr);
          if (userObj?.email) {
            const updated = registeredPlayers.map(p => 
              p.email.toLowerCase() === userObj.email.toLowerCase() 
                ? { ...p, chips: nextVal, peakChips: Math.max(p.peakChips || 0, nextVal) }
                : p
            );
            setRegisteredPlayers(updated);
            localStorage.setItem("registered_players_v1", JSON.stringify(updated));
            saveAllPlayersToDatabase(updated as any);
          }
        } catch (e) {}
      }
      window.dispatchEvent(new Event("storage"));
    } else if (chipAdjTarget.startsWith("rp_")) {
      const targetEmail = chipAdjTarget.replace("rp_", "").toLowerCase();
      let updatedPlayerName = "";
      let newBalance = 0;

      const updated = registeredPlayers.map(p => {
        if (p.email.toLowerCase() === targetEmail) {
          updatedPlayerName = p.name;
          const currentChips = p.chips !== undefined ? p.chips : 1000;
          newBalance = Math.max(0, currentChips + finalChange);
          return {
            ...p,
            chips: newBalance,
            peakChips: Math.max(p.peakChips || 0, newBalance)
          };
        }
        return p;
      });

      setRegisteredPlayers(updated);
      localStorage.setItem("registered_players_v1", JSON.stringify(updated));
      saveAllPlayersToDatabase(updated as any);

      const activeUserStr = localStorage.getItem("casino_user");
      if (activeUserStr) {
        try {
          const userObj = JSON.parse(activeUserStr);
          if (userObj?.email && userObj.email.toLowerCase() === targetEmail) {
            onUpdateUserChips(newBalance);
            localStorage.setItem("casino_chips", String(newBalance));
          }
        } catch (e) {}
      }

      onAddAuditLog(`ADMIN: Adjusted ${updatedPlayerName || targetEmail}'s balance by $${finalChange > 0 ? "+" : ""}${finalChange.toLocaleString()} chips (New Balance: $${newBalance.toLocaleString()})`, "success");
      addHarbingerLog("ADJUST_USER_CHIPS", `Adjusted Player ${updatedPlayerName || targetEmail}'s balance by $${finalChange > 0 ? "+" : ""}${finalChange} chips.`);
      window.dispatchEvent(new Event("storage"));
    } else {
      setSimulatedPlayers((prev) =>
        prev.map((p) => {
          if (p.id === chipAdjTarget) {
            const nextVal = Math.max(0, p.chips + finalChange);
            onAddAuditLog(`ADMIN: Adjusted ${p.name}'s balance by $${finalChange > 0 ? "+" : ""}${finalChange.toLocaleString()} virtual chips (New Balance: $${nextVal.toLocaleString()})`, "info");
            addHarbingerLog("ADJUST_USER_CHIPS", `Adjusted Player ${p.name}'s balance by $${finalChange > 0 ? "+" : ""}${finalChange} virtual chips.`);
            return { ...p, chips: nextVal };
          }
          return p;
        })
      );
    }
  };

  const handleQuickAdjustPlayerChips = (email: string, delta: number) => {
    casinoAudio.playClick();
    let playerName = "";
    let updatedBalance = 0;

    const updated = registeredPlayers.map((p) => {
      if (p.email.toLowerCase() === email.toLowerCase()) {
        playerName = p.name;
        const current = p.chips !== undefined ? p.chips : 1000;
        updatedBalance = Math.max(0, current + delta);
        return {
          ...p,
          chips: updatedBalance,
          peakChips: Math.max(p.peakChips || 0, updatedBalance)
        };
      }
      return p;
    });

    setRegisteredPlayers(updated);
    localStorage.setItem("registered_players_v1", JSON.stringify(updated));
    saveAllPlayersToDatabase(updated as any);

    const activeUserStr = localStorage.getItem("casino_user");
    if (activeUserStr) {
      try {
        const userObj = JSON.parse(activeUserStr);
        if (userObj?.email && userObj.email.toLowerCase() === email.toLowerCase()) {
          onUpdateUserChips(updatedBalance);
          localStorage.setItem("casino_chips", String(updatedBalance));
        }
      } catch (e) {}
    }

    onAddAuditLog(`ADMIN: Quick-adjusted ${playerName || email}'s balance by $${delta > 0 ? "+" : ""}${delta.toLocaleString()} chips (New Balance: $${updatedBalance.toLocaleString()})`, "warning");
    window.dispatchEvent(new Event("storage"));
  };

  const handleSetPlayerStatus = (email: string, status: "active" | "flagged" | "suspended") => {
    casinoAudio.playClick();
    let playerName = "";
    const updated = registeredPlayers.map((p) => {
      if (p.email.toLowerCase() === email.toLowerCase()) {
        playerName = p.name;
        return { ...p, status };
      }
      return p;
    });

    setRegisteredPlayers(updated);
    localStorage.setItem("registered_players_v1", JSON.stringify(updated));
    saveAllPlayersToDatabase(updated as any);
    onAddAuditLog(`ADMIN: Updated player ${playerName || email} risk/account status to [${status.toUpperCase()}]`, status === "suspended" ? "danger" : "warning");
    addHarbingerLog("MODIFY_USER_STATUS", `Set player ${playerName || email} status to ${status}`);
    window.dispatchEvent(new Event("storage"));
  };

  const handleResetPlayerLoan = (email: string) => {
    casinoAudio.playClick();
    let playerName = "";
    const updated = registeredPlayers.map((p) => {
      if (p.email.toLowerCase() === email.toLowerCase()) {
        playerName = p.name;
        return { ...p, loanCount: 0 };
      }
      return p;
    });

    setRegisteredPlayers(updated);
    localStorage.setItem("registered_players_v1", JSON.stringify(updated));
    saveAllPlayersToDatabase(updated as any);

    const activeUserStr = localStorage.getItem("casino_user");
    if (activeUserStr) {
      try {
        const userObj = JSON.parse(activeUserStr);
        if (userObj?.email && userObj.email.toLowerCase() === email.toLowerCase()) {
          onUpdateUserLoan(0);
          localStorage.setItem("casino_loan", "0");
        }
      } catch (e) {}
    }

    onAddAuditLog(`ADMIN: Forgave active loans for player ${playerName || email}`, "success");
    window.dispatchEvent(new Event("storage"));
  };

  const handleOpenEditPlayer = (rp: RegisteredPlayer) => {
    casinoAudio.playClick();
    setEditingPlayerEmail(rp.email);
    setEditPlayerForm({
      name: rp.name,
      email: rp.email,
      phoneNumber: rp.phoneNumber || "",
      password: rp.password || "password123",
      chips: rp.chips !== undefined ? rp.chips : 1000,
      loanCount: rp.loanCount || 0,
      status: (rp.status as any) || "active",
      vipLevel: rp.vipLevel || "VIP Bronze"
    });
  };

  const handleSaveEditedPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayerEmail) return;
    casinoAudio.playClick();

    let oldPlayerName = "";
    const updated = registeredPlayers.map((p) => {
      if (p.email.toLowerCase() === editingPlayerEmail.toLowerCase()) {
        oldPlayerName = p.name;
        return {
          ...p,
          name: editPlayerForm.name.trim() || p.name,
          email: editPlayerForm.email.trim().toLowerCase() || p.email,
          phoneNumber: editPlayerForm.phoneNumber.trim(),
          password: editPlayerForm.password.trim() || p.password,
          chips: Math.max(0, Number(editPlayerForm.chips) || 0),
          loanCount: Math.max(0, Number(editPlayerForm.loanCount) || 0),
          status: editPlayerForm.status,
          vipLevel: editPlayerForm.vipLevel
        };
      }
      return p;
    });

    setRegisteredPlayers(updated);
    localStorage.setItem("registered_players_v1", JSON.stringify(updated));
    saveAllPlayersToDatabase(updated as any);

    const activeUserStr = localStorage.getItem("casino_user");
    if (activeUserStr) {
      try {
        const userObj = JSON.parse(activeUserStr);
        if (userObj?.email && userObj.email.toLowerCase() === editingPlayerEmail.toLowerCase()) {
          onUpdateUserChips(editPlayerForm.chips);
          localStorage.setItem("casino_chips", String(editPlayerForm.chips));
          if (editPlayerForm.loanCount === 0) {
            onUpdateUserLoan(0);
            localStorage.setItem("casino_loan", "0");
          }
        }
      } catch (e) {}
    }

    onAddAuditLog(`ADMIN: Saved full profile updates for player ${editPlayerForm.name || oldPlayerName}`, "warning");
    addHarbingerLog("MODIFY_USER_CREDENTIALS", `Updated player ${editPlayerForm.name} (${editPlayerForm.email})`);
    setEditingPlayerEmail(null);
    window.dispatchEvent(new Event("storage"));
  };

  const handleCreateNewPlayerAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerForm.email.trim() || !newPlayerForm.name.trim()) return;
    casinoAudio.playClick();

    const cleanEmail = newPlayerForm.email.trim().toLowerCase();
    const exists = registeredPlayers.some(p => p.email.toLowerCase() === cleanEmail);
    if (exists) {
      onAddAuditLog(`ADMIN ERROR: Cannot create account. Email ${cleanEmail} is already registered.`, "danger");
      return;
    }

    const startingChipsVal = Number(newPlayerForm.chips) || 0;
    const newAccount: RegisteredPlayer = {
      name: newPlayerForm.name.trim(),
      email: cleanEmail,
      phoneNumber: newPlayerForm.phoneNumber.trim() || "01700000000",
      password: newPlayerForm.password.trim() || "password123",
      referralCode: newPlayerForm.name.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) + Math.floor(Math.random() * 900 + 100),
      chips: startingChipsVal,
      bonusBalance: 200,
      peakChips: startingChipsVal,
      loanCount: 0,
      status: "active",
      vipLevel: newPlayerForm.vipLevel || "VIP Bronze",
      created_at: new Date().toISOString()
    };

    const updated = [newAccount, ...registeredPlayers];
    setRegisteredPlayers(updated);
    localStorage.setItem("registered_players_v1", JSON.stringify(updated));
    saveAllPlayersToDatabase(updated as any);

    onAddAuditLog(`ADMIN: Account creation successful for player [${newAccount.name}] (${newAccount.email}) with $${newAccount.chips?.toLocaleString()} chips`, "success");
    addHarbingerLog("CREATE_USER_ACCOUNT", `Admin created account ${newAccount.name} (${newAccount.email})`);

    setNewPlayerForm({
      name: "",
      email: "",
      phoneNumber: "",
      password: "",
      chips: 0,
      vipLevel: "VIP Bronze"
    });
    setShowAddPlayerModal(false);
    window.dispatchEvent(new Event("storage"));
  };

  const togglePlayerStatus = (playerId: string) => {
    casinoAudio.playClick();
    setSimulatedPlayers((prev) =>
      prev.map((p) => {
        if (p.id === playerId) {
          let nextStatus: Player["status"] = "Active";
          if (p.status === "Active") nextStatus = "Flagged";
          else if (p.status === "Flagged") nextStatus = "Suspended";
          
          onAddAuditLog(`ADMIN: Altered player ${p.name}'s risk status from ${p.status} to ${nextStatus}`, "warning");
          addHarbingerLog("MODIFY_USER_STATUS", `Altered player ${p.name}'s risk status from ${p.status} to ${nextStatus}`);
          return { ...p, status: nextStatus, riskScore: nextStatus === "Suspended" ? 99 : nextStatus === "Flagged" ? 75 : 15 };
        }
        return p;
      })
    );
  };

  const handleToggleBlockAgent = (agentId: string) => {
    casinoAudio.playClick();
    const updated = agents.map(a => {
      if (a.id === agentId) {
        const nextStatus = a.status === "blocked" ? "active" : "blocked";
        onAddAuditLog(`ADMIN: Agent ${agentId} status set to ${nextStatus.toUpperCase()}`, nextStatus === "blocked" ? "danger" : "success");
        addHarbingerLog("MODIFY_AGENT_STATUS", `Altered Agent ${agentId} status set to ${nextStatus.toUpperCase()}`);
        return { ...a, status: nextStatus };
      }
      return a;
    });
    saveAgentsUnified(updated);
  };

  const handleToggleRedMarkAgent = (agentId: string) => {
    casinoAudio.playClick();
    const updated = agents.map(a => {
      if (a.id === agentId) {
        const nextStatus = a.status === "red_marked" ? "active" : "red_marked";
        onAddAuditLog(`ADMIN: Agent ${agentId} status set to ${nextStatus.toUpperCase()}`, nextStatus === "red_marked" ? "danger" : "success");
        addHarbingerLog("MODIFY_AGENT_STATUS", `Altered Agent ${agentId} status set to ${nextStatus.toUpperCase()}`);
        return { ...a, status: nextStatus };
      }
      return a;
    });
    saveAgentsUnified(updated);
  };

  const handleModifyAgentBalance = (agentId: string, amount: number, operation: "add" | "cut") => {
    if (amount <= 0) return;
    casinoAudio.playChipClink();
    const updated = agents.map(a => {
      if (a.id === agentId) {
        let nextBalance = a.balance;
        if (operation === "add") {
          nextBalance += amount;
          // Offset House Vault Reserves by -amount
          onUpdateHousePool(Math.max(0, housePool - amount));
          updateHouseVaultReserves(-amount);
          onAddAuditLog(`ADMIN: Credited Agent ${agentId} with $${amount.toLocaleString()} float chips. House Vault Reserves offset -$${amount.toLocaleString()}. New Agent Float: $${nextBalance.toLocaleString()}`, "success");
          addHarbingerLog("ADD_LIQUIDITY", `Credited Agent ${agentId} with $${amount.toLocaleString()} float chips. New: $${nextBalance.toLocaleString()}`);
        } else {
          nextBalance = Math.max(0, nextBalance - amount);
          // Offset House Vault Reserves by +amount
          onUpdateHousePool(housePool + amount);
          updateHouseVaultReserves(+amount);
          onAddAuditLog(`ADMIN: Debited Agent ${agentId} with $${amount.toLocaleString()} float chips. House Vault Reserves offset +$${amount.toLocaleString()}. New Agent Float: $${nextBalance.toLocaleString()}`, "danger");
          addHarbingerLog("CUT_LIQUIDITY", `Debited Agent ${agentId} with $${amount.toLocaleString()} float chips. New: $${nextBalance.toLocaleString()}`);
        }
        return { ...a, balance: nextBalance };
      }
      return a;
    });
    saveAgentsUnified(updated);
    setAgentAdjustAmounts(prev => ({ ...prev, [agentId]: "" }));
    broadcastFinancialStateUpdates();
  };

  const handleAddBlockedIp = () => {
    if (!newIpInput) return;
    casinoAudio.playClick();
    if (ipBlocklist.includes(newIpInput)) {
      alert("IP already blocked");
      return;
    }
    setIpBlocklist((prev) => [...prev, newIpInput]);
    onAddAuditLog(`RISK: Blocked suspicious IP Address: ${newIpInput}`, "danger");
    setNewIpInput("");
  };

  const handleRemoveBlockedIp = (ip: string) => {
    casinoAudio.playClick();
    setIpBlocklist((prev) => prev.filter((i) => i !== ip));
    onAddAuditLog(`RISK: Unblocked IP Address: ${ip}`, "info");
  };

  const EMERGENCY_RESERVE_STEP = 100000;
  const [pendingHarbingerAmount, setPendingHarbingerAmount] = useState<number>(EMERGENCY_RESERVE_STEP);

  const executeEmergencyOperation = (action: "INJECT" | "EJECT" | "REMOVE", amount: number = EMERGENCY_RESERVE_STEP) => {
    if (action === "INJECT") {
      const injection = amount;
      const nextPool = housePool + injection;
      onUpdateHousePool(nextPool);
      setHouseVaultReserves(nextPool);
      onAddAuditLog(`FINANCE: Injected $${injection.toLocaleString()} virtual chips Emergency liquidity into House Pool Reserve.`, "success");
      addHarbingerLog("EMERGENCY_INJECT", `Injected $${injection.toLocaleString()} Emergency Backing into House Vault Reserve.`);
      casinoAudio.playWin();
    } else if (action === "EJECT") {
      const ejection = amount;
      const nextPool = Math.max(0, housePool - ejection);
      onUpdateHousePool(nextPool);
      setHouseVaultReserves(nextPool);
      onAddAuditLog(`FINANCE: Ejected $${ejection.toLocaleString()} virtual chips Emergency reserve from House Pool Reserve.`, "warning");
      addHarbingerLog("EMERGENCY_EJECT", `Ejected $${ejection.toLocaleString()} Emergency Reserve from House Vault Reserve.`);
      casinoAudio.playWin();
    } else if (action === "REMOVE") {
      onAddAuditLog(`FINANCE: Removed & cleared Emergency Liquidation rules and baseline thresholds.`, "info");
      addHarbingerLog("REMOVE_LIQUIDATION_RULES", "Cleared/Reset Emergency Liquidation parameters and thresholds.");
      casinoAudio.playClick();
    }
    broadcastFinancialStateUpdates();
  };

  const handleTriggerEmergencyAction = (action: "INJECT" | "EJECT" | "REMOVE", amount: number = EMERGENCY_RESERVE_STEP) => {
    setPendingHarbingerAmount(amount);
    if (!isHarbingerUnlocked) {
      setPendingHarbingerAction(action);
      setHarbingerPasswordInput("");
      setHarbingerAuthError("");
      setIsHarbingerModalOpen(true);
    } else {
      executeEmergencyOperation(action, amount);
    }
  };

  const handleLiquidation = (action: "INJECT" | "EJECT" | "REMOVE", amount: number = EMERGENCY_RESERVE_STEP) => {
    handleTriggerEmergencyAction(action, amount);
  };

  const handleHarbingerAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (harbingerPasswordInput.trim() === "HARBINGER123") {
      setIsHarbingerUnlocked(true);
      setHarbingerAuthError("");
      setIsHarbingerModalOpen(false);
      setHarbingerPasswordInput("");
      addHarbingerLog("HARBINGER_AUTH", "Harbinger System authenticated and unlocked successfully via Master Password.");
      onAddAuditLog("HARBINGER: Master Password verified. System financial controls unlocked.", "success");
      casinoAudio.playWin();

      if (pendingHarbingerAction && pendingHarbingerAction !== "UNLOCK_ONLY") {
        executeEmergencyOperation(pendingHarbingerAction, pendingHarbingerAmount);
      }
      setPendingHarbingerAction(null);
    } else {
      casinoAudio.playLose();
      setHarbingerAuthError("Invalid Harbinger Master Password. Access Denied.");
      addHarbingerLog("HARBINGER_AUTH_FAILED", "Failed Harbinger authentication attempt (Invalid Password).");
    }
  };

  const handleInjectHouseFunds = () => {
    handleTriggerEmergencyAction("INJECT");
  };

  const handleSetBias = (bias: "standard" | "loose" | "tight" | "rigged" | "custom") => {
    casinoAudio.playClick();
    onChangeRtpBias(bias);
    onAddAuditLog(`RISK: Altered global casino math model bias to [${bias.toUpperCase()}]. Win rates updated.`, bias === "rigged" ? "danger" : bias === "tight" ? "warning" : "success");
  };

  const handleSetForcedOutcome = (outcome: "none" | "jackpot" | "lose") => {
    casinoAudio.playClick();
    onChangeForcedOutcome(outcome);
    if (outcome !== "none") {
      onAddAuditLog(`ANTI-FRAUD: Scheduled FORCED next spin/hand outcome: [${outcome.toUpperCase()}]. Operations primed.`, "warning");
    } else {
      onAddAuditLog(`ANTI-FRAUD: Cleared forced outcome schedules. Returning to standard operational parameters.`, "info");
    }
  };

  return (
    <div className="bg-slate-950 rounded-3xl border border-slate-900 overflow-hidden shadow-2xl relative w-full max-w-full" id="enterprise-admin-control-suite">
      
      {/* Visual Header / Premium Control Grid */}
      <div className="p-4 sm:p-6 border-b border-slate-900 bg-gradient-to-r from-slate-950 via-purple-950/20 to-slate-950 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 sm:gap-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded bg-purple-500/20 border border-purple-500/30 text-purple-400 text-[10px] font-mono uppercase font-black tracking-widest flex items-center gap-1 animate-pulse">
              <Activity className="h-2.5 w-2.5" /> Live Control Active
            </span>
            <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-mono uppercase font-bold">
              Root Authority
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-mono font-black text-white mt-1.5 uppercase tracking-wide flex items-center gap-2.5 flex-wrap">
            🛡️ Vegas Vance Admin Command Console
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Configure real-time game RTP biases, manage player wallets, enforce anti-fraud risk ceilings, audit internal ledger trails, and override active machine pipelines instantly.
          </p>
        </div>

        {/* Dynamic House Pool Cash register readout */}
        <div className="flex items-center gap-4 bg-slate-900/80 border border-slate-800 p-3.5 sm:p-4 rounded-2xl w-full xl:w-auto font-mono shrink-0">
          <Coins className="h-8 w-8 text-amber-400 animate-pulse shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">House Vault Reserves</span>
            <span className="text-base sm:text-lg text-emerald-400 font-black tracking-tight block truncate">
              ${housePool.toLocaleString()} <span className="text-xs text-slate-400 font-normal">USD</span>
            </span>
          </div>
        </div>
      </div>

      {/* Bento Stats Ribbons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-slate-900 bg-slate-950/45 text-center font-mono select-none">
        <div className="p-3 sm:p-4 border-r border-b lg:border-b-0 border-slate-900 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-black block">Global RTP Bias</span>
          <span className={`text-sm sm:text-base font-black uppercase tracking-wider ${
            rtpBias === "rigged" ? "text-rose-500 animate-pulse" : rtpBias === "tight" ? "text-amber-500" : rtpBias === "loose" ? "text-emerald-400" : rtpBias === "custom" ? "text-fuchsia-400 font-extrabold animate-pulse" : "text-white"
          }`}>
            {rtpBias}
          </span>
        </div>
        <div className="p-3 sm:p-4 border-b lg:border-b-0 lg:border-r border-slate-900 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-black block">Win / Loss Ratio</span>
          <span className="text-sm sm:text-base text-cyan-400 font-black">
            {rtpBias === "loose" ? "42% / 58%" : rtpBias === "tight" ? "58% / 42%" : rtpBias === "rigged" ? "88% / 12%" : rtpBias === "custom" ? `${customWinRatio}% / ${100 - customWinRatio}%` : "52% / 48%"}
          </span>
        </div>
        <div className="p-3 sm:p-4 border-r border-slate-900 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-black block">Active Users Monitored</span>
          <span className="text-sm sm:text-base text-purple-400 font-black">
            {simulatedPlayers.length + 1}
          </span>
        </div>
        <div className="p-3 sm:p-4 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-black block">Security Incidents</span>
          <span className={`text-sm sm:text-base font-black ${ipBlocklist.length > 1 ? "text-rose-500" : "text-slate-400"}`}>
            {ipBlocklist.length} Blocked
          </span>
        </div>
      </div>

      {/* Left Navigation / Tab Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">
        
        {/* Sidebar Selector buttons */}
        <div className="lg:col-span-3 border-b lg:border-b-0 lg:border-r border-slate-900 p-3 sm:p-4 bg-slate-950/20">
          <span className="text-[10px] font-mono font-black uppercase tracking-widest text-slate-600 block px-2 mb-2">
            Modules Control
          </span>
          
          {/* Responsive scrollable tab bar on mobile/tablet, vertical stacked on lg desktop */}
          <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible gap-2 pb-2 lg:pb-0 scrollbar-none snap-x">
            {currentUser?.role !== "Sub-Admin" && (
              <>
                <button
                  onClick={() => { casinoAudio.playClick(); setAdminTab("players"); }}
                  className={`shrink-0 lg:w-full text-left px-3.5 py-2.5 sm:py-3 rounded-xl font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2.5 transition-all cursor-pointer snap-start ${
                    adminTab === "players"
                      ? "bg-slate-900 text-white border border-slate-800 shadow-md"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/40"
                  }`}
                >
                  <Users className="h-4 w-4 text-purple-400 shrink-0" />
                  <span className="whitespace-nowrap">Player Accounts</span>
                </button>

                <button
                  onClick={() => { casinoAudio.playClick(); setAdminTab("playerdata"); }}
                  className={`shrink-0 lg:w-full text-left px-3.5 py-2.5 sm:py-3 rounded-xl font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2.5 transition-all cursor-pointer snap-start ${
                    adminTab === "playerdata"
                      ? "bg-slate-900 text-white border border-slate-800 shadow-md"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/40"
                  }`}
                >
                  <BarChart3 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="whitespace-nowrap">Player Data Dashboard</span>
                </button>

                <button
                  onClick={() => { casinoAudio.playClick(); setAdminTab("risk"); }}
                  className={`shrink-0 lg:w-full text-left px-3.5 py-2.5 sm:py-3 rounded-xl font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2.5 transition-all cursor-pointer snap-start ${
                    adminTab === "risk"
                      ? "bg-slate-900 text-white border border-slate-800 shadow-md"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/40"
                  }`}
                >
                  <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0" />
                  <span className="whitespace-nowrap">Risk & Anti-Fraud</span>
                </button>

                <button
                  onClick={() => { casinoAudio.playClick(); setAdminTab("finance"); }}
                  className={`shrink-0 lg:w-full text-left px-3.5 py-2.5 sm:py-3 rounded-xl font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2.5 transition-all cursor-pointer snap-start ${
                    adminTab === "finance"
                      ? "bg-slate-900 text-white border border-slate-800 shadow-md"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/40"
                  }`}
                >
                  <Coins className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="whitespace-nowrap">Financial Settlement</span>
                </button>

                <button
                  onClick={() => { casinoAudio.playClick(); setAdminTab("portfolio"); }}
                  className={`shrink-0 lg:w-full text-left px-3.5 py-2.5 sm:py-3 rounded-xl font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2.5 transition-all cursor-pointer snap-start ${
                    adminTab === "portfolio"
                      ? "bg-slate-900 text-white border border-slate-800 shadow-md"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/40"
                  }`}
                >
                  <Layers className="h-4 w-4 text-cyan-400 shrink-0" />
                  <span className="whitespace-nowrap">Game Portfolio</span>
                </button>

                <button
                  onClick={() => { casinoAudio.playClick(); setAdminTab("referrals"); }}
                  className={`shrink-0 lg:w-full text-left px-3.5 py-2.5 sm:py-3 rounded-xl font-mono text-xs font-black uppercase tracking-wider flex items-center justify-between gap-3 transition-all cursor-pointer snap-start ${
                    adminTab === "referrals"
                      ? "bg-slate-900 text-white border border-slate-800 shadow-md"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/40"
                  }`}
                >
                  <span className="flex items-center gap-2.5 whitespace-nowrap">
                    <Gift className="h-4 w-4 text-fuchsia-400 shrink-0" /> Referral System
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full bg-slate-850 border border-slate-800 text-[9px] font-bold text-fuchsia-400 shrink-0">
                    {refEvents.filter(e => e.status === "pending").length}
                  </span>
                </button>

                <button
                  onClick={() => { casinoAudio.playClick(); setAdminTab("banking"); }}
                  className={`shrink-0 lg:w-full text-left px-3.5 py-2.5 sm:py-3 rounded-xl font-mono text-xs font-black uppercase tracking-wider flex items-center justify-between gap-3 transition-all cursor-pointer snap-start ${
                    adminTab === "banking"
                      ? "bg-slate-900 text-white border border-slate-800 shadow-md"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/40"
                  }`}
                >
                  <span className="flex items-center gap-2.5 whitespace-nowrap">
                    <Landmark className="h-4 w-4 text-cyan-400 shrink-0" /> Mobile Banking
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full bg-slate-850 border border-slate-800 text-[9px] font-bold text-cyan-400 shrink-0">
                    {bankingRequests.filter(r => !r.isCrypto && r.status === "pending").length}
                  </span>
                </button>
              </>
            )}

            <button
              onClick={() => { casinoAudio.playClick(); setAdminTab("crypto"); }}
              className={`shrink-0 lg:w-full text-left px-3.5 py-2.5 sm:py-3 rounded-xl font-mono text-xs font-black uppercase tracking-wider flex items-center justify-between gap-3 transition-all cursor-pointer snap-start ${
                adminTab === "crypto"
                  ? "bg-slate-900 text-white border border-slate-800 shadow-md"
                  : "text-slate-400 hover:text-white hover:bg-slate-900/40"
              }`}
            >
              <span className="flex items-center gap-2.5 whitespace-nowrap">
                <Coins className="h-4 w-4 text-amber-500 shrink-0 animate-pulse" /> Crypto Overview
              </span>
              <span className="px-1.5 py-0.5 rounded-full bg-slate-850 border border-slate-800 text-[9px] font-bold text-amber-500 shrink-0">
                {bankingRequests.filter(r => (r.isCrypto || r.type) && r.status === "pending").length}
              </span>
            </button>

            {currentUser?.role !== "Sub-Admin" && (
              <>
                <button
                  onClick={() => { casinoAudio.playClick(); setAdminTab("megawin"); }}
                  className={`shrink-0 lg:w-full text-left px-3.5 py-2.5 sm:py-3 rounded-xl font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2.5 transition-all cursor-pointer snap-start ${
                    adminTab === "megawin"
                      ? "bg-slate-900 text-white border border-slate-800 shadow-md"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/40"
                  }`}
                >
                  <Trophy className="h-4 w-4 text-fuchsia-400 shrink-0" />
                  <span className="whitespace-nowrap">Mega Win Strategy</span>
                </button>

                <button
                  onClick={() => { casinoAudio.playClick(); setAdminTab("subadmins"); }}
                  className={`shrink-0 lg:w-full text-left px-3.5 py-2.5 sm:py-3 rounded-xl font-mono text-xs font-black uppercase tracking-wider flex items-center justify-between gap-3 transition-all cursor-pointer snap-start ${
                    adminTab === "subadmins"
                      ? "bg-slate-900 text-white border border-slate-800 shadow-md"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/40"
                  }`}
                >
                  <span className="flex items-center gap-2.5 whitespace-nowrap">
                    <Settings className="h-4 w-4 text-rose-500 shrink-0" /> Sub-Admins Control
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full bg-slate-850 border border-slate-800 text-[9px] font-bold text-rose-500 shrink-0">
                    {subAdmins.length}
                  </span>
                </button>

                <button
                  onClick={() => { casinoAudio.playClick(); setAdminTab("agent_hub"); }}
                  className={`shrink-0 lg:w-full text-left px-3.5 py-2.5 sm:py-3 rounded-xl font-mono text-xs font-black uppercase tracking-wider flex items-center justify-between gap-3 transition-all cursor-pointer snap-start ${
                    adminTab === "agent_hub"
                      ? "bg-slate-900 text-cyan-300 border border-cyan-500/60 shadow-lg ring-1 ring-cyan-500/40"
                      : "text-cyan-400/90 hover:text-white hover:bg-slate-900/40"
                  }`}
                >
                  <span className="flex items-center gap-2.5 whitespace-nowrap font-extrabold">
                    <ShieldCheck className="h-4 w-4 text-cyan-400 shrink-0 animate-pulse" /> 👥 AGENT & ESCROW HUB
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800 text-[9px] font-bold text-cyan-300 shrink-0">
                    {p2pAgents.length}
                  </span>
                </button>

                <button
                  onClick={() => { casinoAudio.playClick(); setAdminTab("audit"); }}
                  className={`shrink-0 lg:w-full text-left px-3.5 py-2.5 sm:py-3 rounded-xl font-mono text-xs font-black uppercase tracking-wider flex items-center justify-between gap-3 transition-all cursor-pointer snap-start ${
                    adminTab === "audit"
                      ? "bg-slate-900 text-white border border-slate-800 shadow-md"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/40"
                  }`}
                >
                  <span className="flex items-center gap-2.5 whitespace-nowrap">
                    <Terminal className="h-4 w-4 text-indigo-400 shrink-0" /> System Audit Logs
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full bg-slate-850 border border-slate-800 text-[9px] font-bold text-slate-300 shrink-0">
                    {auditLogs.length}
                  </span>
                </button>

                <button
                  onClick={() => { casinoAudio.playClick(); setAdminTab("stresstest"); }}
                  className={`shrink-0 lg:w-full text-left px-3.5 py-2.5 sm:py-3 rounded-xl font-mono text-xs font-black uppercase tracking-wider flex items-center justify-between gap-3 transition-all cursor-pointer snap-start ${
                    adminTab === "stresstest"
                      ? "bg-slate-900 text-white border border-slate-800 shadow-md"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/40"
                  }`}
                >
                  <span className="flex items-center gap-2.5 whitespace-nowrap">
                    <Cpu className="h-4 w-4 text-emerald-400 shrink-0" /> Stress Testing
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800 text-[9px] font-bold text-emerald-400 shrink-0">
                    50 Load
                  </span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right Sandbox content panels */}
        <div className="lg:col-span-9 p-3 sm:p-5 md:p-6 bg-slate-950/15 min-w-0">
          
          {/* TAB: AGENT & ESCROW CONTROL HUB */}
          {adminTab === "agent_hub" && (
            <AgentControlHub currentUser={currentUser} onAddAuditLog={onAddAuditLog} />
          )}

          {/* TAB 1: PLAYER ACCOUNT MANAGEMENT */}
          {adminTab === "players" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-900 pb-4">
                <div>
                  <h3 className="font-mono text-base font-black text-white uppercase tracking-wide flex items-center gap-2">
                    👥 Player Accounts & Wallets Control Center
                  </h3>
                  <p className="text-xs font-mono text-slate-400 mt-1">
                    Full administrative control over player accounts, virtual wallets, security status, and login keys.
                  </p>
                </div>
                <button
                  onClick={() => {
                    casinoAudio.playClick();
                    setShowAddPlayerModal(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono text-xs font-black uppercase flex items-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer active:scale-95 transition-all"
                >
                  <UserPlus className="h-4 w-4" /> Add New Player Account
                </button>
              </div>

              {/* Instant Manual Adjustments module */}
              <div className="p-4 bg-slate-900/60 border border-slate-850 rounded-2xl space-y-3 font-mono">
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <Coins className="h-4 w-4 text-amber-400" /> Instant Chip Adjustment Console
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-5 space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold block">Target Account</label>
                    <select
                      value={chipAdjTarget}
                      onChange={(e) => setChipAdjTarget(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-amber-500/50"
                    >
                      <option value="user">User (Current Active Session) - ${userChips.toLocaleString()}</option>
                      <optgroup label="Registered Players Database">
                        {registeredPlayers.map((rp) => (
                          <option key={rp.email} value={`rp_${rp.email}`}>
                            {rp.name} ({rp.email}) - ${(rp.chips !== undefined ? rp.chips : 1000).toLocaleString()}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Simulated Players">
                        {simulatedPlayers.map((p) => (
                          <option key={p.id} value={p.id}>
                            Bot: {p.name} - ${p.chips.toLocaleString()}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  <div className="md:col-span-3 space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold block">Amount ($ Chips)</label>
                    <input
                      type="number"
                      value={chipAdjAmount}
                      onChange={(e) => setChipAdjAmount(Math.max(1, Number(e.target.value) || 100))}
                      className="w-full bg-slate-950 border border-slate-800 text-white font-mono text-xs rounded-xl px-3 py-2 outline-none focus:border-amber-500/50"
                    />
                  </div>

                  <div className="md:col-span-4 flex gap-2">
                    <button
                      onClick={() => handleAdjustChips("add")}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-mono text-xs font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-md shadow-emerald-950/30"
                    >
                      <Plus className="h-3.5 w-3.5" /> Credit Chips
                    </button>
                    <button
                      onClick={() => handleAdjustChips("sub")}
                      className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-mono text-xs font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-md shadow-rose-950/30"
                    >
                      <Minus className="h-3.5 w-3.5" /> Debit Chips
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Quick Amount:</span>
                  {[1000, 5000, 10000, 50000, 100000, 500000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setChipAdjAmount(amt)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                        chipAdjAmount === amt
                          ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      ${amt >= 1000 ? `${amt / 1000}k` : amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Player Database Table Controls */}
              <div className="space-y-4 pt-2 font-mono">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search player name, email, phone..."
                      value={playerSearchQuery}
                      onChange={(e) => setPlayerSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl focus:outline-none focus:border-amber-500/50"
                    />
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400 font-bold">
                    <span>Registered Accounts: <strong className="text-white">{registeredPlayers.length}</strong></span>
                    <button
                      onClick={async () => {
                        casinoAudio.playClick();
                        const cloudPlayers = await fetchCloudPlayersFromD1();
                        if (cloudPlayers && cloudPlayers.length > 0) {
                          setRegisteredPlayers(cloudPlayers);
                          onAddAuditLog("SYSTEM: Refreshed & synced registered player accounts with Cloudflare D1.", "success");
                        } else {
                          const stored = localStorage.getItem("registered_players_v1");
                          if (stored) {
                            setRegisteredPlayers(JSON.parse(stored));
                            onAddAuditLog("SYSTEM: Refreshed registered player accounts from cache.", "info");
                          }
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white transition-all flex items-center gap-1 text-[10px] uppercase cursor-pointer"
                    >
                      <RefreshCw className="h-3 w-3 animate-spin-slow" /> Refresh
                    </button>
                  </div>
                </div>

                {/* Registered Players Table */}
                <div className="overflow-x-auto rounded-2xl border border-slate-850 bg-slate-950/60 font-mono">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900/80 border-b border-slate-850 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="p-3.5">Player Profile</th>
                        <th className="p-3.5">Credentials / Phone</th>
                        <th className="p-3.5 text-center">Chips Balance</th>
                        <th className="p-3.5 text-center">Loans</th>
                        <th className="p-3.5 text-center">Status / Risk</th>
                        <th className="p-3.5 text-right">Admin Controls</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {/* Current Active Session User */}
                      <tr className="bg-amber-950/10 hover:bg-amber-950/20 transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-2 font-black text-white">
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                            <span>User (You - Current Session)</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
                              ROOT HOST
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Active Session User • IP: 127.0.0.1
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-400">
                          <div className="font-semibold text-slate-300">{currentUser?.email || "Local Player"}</div>
                          <div className="text-[10px] text-slate-500">{currentUser?.phoneNumber || "127.0.0.1"}</div>
                        </td>
                        <td className="p-3.5 text-center font-black text-emerald-400 text-sm">
                          ${userChips.toLocaleString()}
                        </td>
                        <td className="p-3.5 text-center text-slate-300">
                          ${userLoan.toLocaleString()}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                            Active
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <span className="text-slate-500 text-[10px] font-bold">Root Account</span>
                        </td>
                      </tr>

                      {/* Filtered Registered Players */}
                      {registeredPlayers
                        .filter(rp => {
                          if (!playerSearchQuery.trim()) return true;
                          const q = playerSearchQuery.toLowerCase();
                          return (
                            rp.name.toLowerCase().includes(q) ||
                            rp.email.toLowerCase().includes(q) ||
                            (rp.phoneNumber && rp.phoneNumber.includes(q)) ||
                            (rp.referralCode && rp.referralCode.toLowerCase().includes(q))
                          );
                        })
                        .map((rp) => {
                          const chipsVal = rp.chips !== undefined ? rp.chips : 1000;
                          const statusVal = rp.status || "active";
                          const isSuspended = statusVal === "suspended" || statusVal === "blocked" || statusVal === "Suspended";
                          const isFlagged = statusVal === "flagged" || statusVal === "Flagged";

                          return (
                            <tr key={rp.email} className={`hover:bg-slate-900/40 transition-colors ${isSuspended ? "bg-rose-950/10" : ""}`}>
                              <td className="p-3.5 font-bold text-white">
                                <div className="flex items-center gap-2">
                                  <span className={`h-2 w-2 rounded-full shrink-0 ${
                                    isSuspended ? "bg-rose-500" : isFlagged ? "bg-amber-400" : "bg-emerald-400"
                                  }`} />
                                  <span className="font-extrabold text-slate-100">{rp.name}</span>
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-950 border border-indigo-800 text-indigo-300 font-bold">
                                    {rp.vipLevel || "VIP Bronze"}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                                  Ref Code: <span className="text-amber-400 font-mono font-bold">{rp.referralCode || "NONE"}</span>
                                </div>
                              </td>

                              <td className="p-3.5">
                                <div className="font-semibold text-slate-200">{rp.email}</div>
                                <div className="text-[10px] text-indigo-400 font-mono">{rp.phoneNumber || "No phone linked"}</div>
                                <div className="text-[10px] text-fuchsia-400 font-mono font-bold mt-0.5">
                                  Pass: {rp.password || "Google Auth"}
                                </div>
                              </td>

                              <td className="p-3.5 text-center">
                                <div className="font-extrabold text-amber-400 text-sm">
                                  ${chipsVal.toLocaleString()}
                                </div>
                                <div className="flex items-center justify-center gap-1 mt-1">
                                  <button
                                    onClick={() => handleQuickAdjustPlayerChips(rp.email, 10000)}
                                    className="px-1.5 py-0.5 rounded bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-[9px] font-bold cursor-pointer"
                                    title="Add 10,000 chips"
                                  >
                                    +10k
                                  </button>
                                  <button
                                    onClick={() => handleQuickAdjustPlayerChips(rp.email, 1000)}
                                    className="px-1.5 py-0.5 rounded bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-[9px] font-bold cursor-pointer"
                                    title="Add 1,000 chips"
                                  >
                                    +1k
                                  </button>
                                  <button
                                    onClick={() => handleQuickAdjustPlayerChips(rp.email, -1000)}
                                    className="px-1.5 py-0.5 rounded bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 text-[9px] font-bold cursor-pointer"
                                    title="Deduct 1,000 chips"
                                  >
                                    -1k
                                  </button>
                                </div>
                              </td>

                              <td className="p-3.5 text-center">
                                <div className="font-bold text-slate-300">
                                  {rp.loanCount || 0} loans
                                </div>
                                {rp.loanCount && rp.loanCount > 0 ? (
                                  <button
                                    onClick={() => handleResetPlayerLoan(rp.email)}
                                    className="mt-1 px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-400 text-[9px] font-bold cursor-pointer"
                                  >
                                    Clear Loan
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-500">Clean</span>
                                )}
                              </td>

                              <td className="p-3.5 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                                  isSuspended
                                    ? "bg-rose-500/20 border-rose-500/40 text-rose-400 animate-pulse"
                                    : isFlagged
                                    ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                                    : "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                                }`}>
                                  {isSuspended ? "BANNED" : isFlagged ? "FLAGGED" : "ACTIVE"}
                                </span>

                                <div className="flex items-center justify-center gap-1 mt-1.5">
                                  {isSuspended ? (
                                    <button
                                      onClick={() => handleSetPlayerStatus(rp.email, "active")}
                                      className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 text-[9px] font-bold cursor-pointer hover:bg-emerald-900"
                                    >
                                      Unban Player
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => handleSetPlayerStatus(rp.email, "suspended")}
                                        className="px-1.5 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-300 text-[9px] font-bold cursor-pointer hover:bg-rose-900"
                                        title="Ban/Suspend Player"
                                      >
                                        Ban
                                      </button>
                                      <button
                                        onClick={() => handleSetPlayerStatus(rp.email, isFlagged ? "active" : "flagged")}
                                        className="px-1.5 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300 text-[9px] font-bold cursor-pointer hover:bg-amber-900"
                                        title="Toggle Flagged Status"
                                      >
                                        {isFlagged ? "Unflag" : "Flag"}
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>

                              <td className="p-3.5 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => {
                                      casinoAudio.playClick();
                                      setSelectedDashboardPlayerEmail(rp.email);
                                      setAdminTab("playerdata");
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg border border-emerald-500/40 hover:border-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 text-[10px] transition-all cursor-pointer inline-flex items-center gap-1 font-bold shadow-sm"
                                    title="Open Full Player Data & Game History Dashboard"
                                  >
                                    <BarChart3 className="h-3 w-3 text-emerald-400" /> Game History
                                  </button>

                                  <button
                                    onClick={() => {
                                      casinoAudio.playClick();
                                      setActivityModalPlayer(rp);
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg border border-amber-500/30 hover:border-amber-400 bg-amber-950/30 hover:bg-amber-950/70 text-amber-300 text-[10px] transition-all cursor-pointer inline-flex items-center gap-1 font-bold"
                                    title="View Real-Time Player Activity Log"
                                  >
                                    <Activity className="h-3 w-3 text-amber-400" /> Activity
                                  </button>

                                  <button
                                    onClick={() => handleOpenEditPlayer(rp)}
                                    className="px-2.5 py-1.5 rounded-lg border border-purple-950/50 hover:border-purple-500 bg-purple-950/20 hover:bg-purple-950/60 text-purple-300 text-[10px] transition-all cursor-pointer inline-flex items-center gap-1 font-bold"
                                  >
                                    <Edit2 className="h-3 w-3" /> Edit Profile
                                  </button>

                                  <button
                                    onClick={() => {
                                      casinoAudio.playClick();
                                      setPlayerToRevoke(rp);
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg border border-rose-950/50 hover:border-rose-500 bg-rose-950/20 hover:bg-rose-950/60 text-rose-400 text-[10px] transition-all cursor-pointer inline-flex items-center gap-1 font-bold"
                                    title="Revoke and Permanently Delete Player Account Globally"
                                  >
                                    <Trash2 className="h-3 w-3" /> Revoke
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* MODAL: CONFIRM REVOKE PLAYER ACCOUNT GLOBALLY */}
              {playerToRevoke && (
                <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
                  <div className="bg-slate-900 border border-rose-500/50 rounded-2xl p-6 max-w-md w-full font-mono space-y-4 shadow-[0_0_40px_rgba(244,63,94,0.3)] animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between border-b border-rose-500/30 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/60 text-rose-400">
                          <AlertTriangle className="h-6 w-6 text-rose-400 animate-pulse" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-white uppercase tracking-wider">Revoke Player Account</h4>
                          <p className="text-[10px] text-rose-400 font-bold uppercase tracking-wide">Global Permanent Revocation</p>
                        </div>
                      </div>
                      <button
                        onClick={() => !isRevoking && setPlayerToRevoke(null)}
                        disabled={isRevoking}
                        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-all"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
                      <div className="flex justify-between items-center text-slate-300">
                        <span className="text-slate-500 font-bold">Player Name:</span>
                        <span className="text-white font-bold">{playerToRevoke.name}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-300">
                        <span className="text-slate-500 font-bold">Email:</span>
                        <span className="text-amber-400 font-mono font-bold">{playerToRevoke.email}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-300">
                        <span className="text-slate-500 font-bold">Main Balance:</span>
                        <span className="text-emerald-400 font-mono font-bold">${(playerToRevoke.chips || 0).toLocaleString()} USDT</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-300">
                        <span className="text-slate-500 font-bold">Locked Bonus:</span>
                        <span className="text-amber-300 font-mono font-bold">${(playerToRevoke.bonusBalance || 0).toLocaleString()} USDT</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-300">
                        <span className="text-slate-500 font-bold">Status:</span>
                        <span className="text-rose-400 uppercase font-bold text-[10px] bg-rose-950/50 px-2 py-0.5 rounded border border-rose-500/30">Targeted For Revoke</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Are you sure you want to permanently revoke and delete this player account? The account keys will be erased from server memory and database, active sessions will be terminated, and login will be blocked globally.
                    </p>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        disabled={isRevoking}
                        onClick={() => setPlayerToRevoke(null)}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isRevoking}
                        onClick={() => handleExecuteRevokePlayer(playerToRevoke)}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-rose-500 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs transition-all shadow-[0_0_20px_rgba(244,63,94,0.4)] cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {isRevoking ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Revoking...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4" /> Yes, Revoke Globally
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL: ADD NEW PLAYER ACCOUNT */}
              {showAddPlayerModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 max-w-md w-full font-mono space-y-4 shadow-2xl">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                      <h4 className="text-sm font-black text-white uppercase flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-emerald-400" /> Register New Player Account
                      </h4>
                      <button
                        onClick={() => setShowAddPlayerModal(false)}
                        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <form onSubmit={handleCreateNewPlayerAccount} className="space-y-3 text-xs">
                      <div className="space-y-1">
                        <label className="text-slate-400 uppercase font-bold text-[10px]">Player Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Rahat VIP"
                          value={newPlayerForm.name}
                          onChange={(e) => setNewPlayerForm({ ...newPlayerForm, name: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-400 uppercase font-bold text-[10px]">Email Address *</label>
                        <input
                          type="email"
                          required
                          placeholder="rahat.vip@gmail.com"
                          value={newPlayerForm.email}
                          onChange={(e) => setNewPlayerForm({ ...newPlayerForm, email: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-slate-400 uppercase font-bold text-[10px]">Phone Number</label>
                          <input
                            type="text"
                            placeholder="01700-000000"
                            value={newPlayerForm.phoneNumber}
                            onChange={(e) => setNewPlayerForm({ ...newPlayerForm, phoneNumber: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-slate-400 uppercase font-bold text-[10px]">Password</label>
                          <input
                            type="text"
                            placeholder="password123"
                            value={newPlayerForm.password}
                            onChange={(e) => setNewPlayerForm({ ...newPlayerForm, password: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-slate-400 uppercase font-bold text-[10px]">Starting Chips ($)</label>
                          <input
                            type="number"
                            value={newPlayerForm.chips}
                            onChange={(e) => setNewPlayerForm({ ...newPlayerForm, chips: Math.max(0, Number(e.target.value) || 0) })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-amber-400 font-bold outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-slate-400 uppercase font-bold text-[10px]">VIP Tier</label>
                          <select
                            value={newPlayerForm.vipLevel}
                            onChange={(e) => setNewPlayerForm({ ...newPlayerForm, vipLevel: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-indigo-300 font-bold outline-none focus:border-emerald-500"
                          >
                            <option value="VIP Bronze">VIP Bronze</option>
                            <option value="VIP Silver">VIP Silver</option>
                            <option value="VIP Gold">VIP Gold</option>
                            <option value="VIP Platinum">VIP Platinum</option>
                            <option value="VIP Diamond">VIP Diamond</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-3">
                        <button
                          type="button"
                          onClick={() => setShowAddPlayerModal(false)}
                          className="flex-1 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold uppercase cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase shadow-lg shadow-emerald-950/40 cursor-pointer"
                        >
                          Create Player
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* MODAL: EDIT PLAYER PROFILE */}
              {editingPlayerEmail && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-slate-900 border border-purple-500/40 rounded-2xl p-6 max-w-md w-full font-mono space-y-4 shadow-2xl">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                      <h4 className="text-sm font-black text-white uppercase flex items-center gap-2">
                        <Edit2 className="h-4 w-4 text-purple-400" /> Edit Player Account & Credentials
                      </h4>
                      <button
                        onClick={() => setEditingPlayerEmail(null)}
                        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveEditedPlayer} className="space-y-3 text-xs">
                      <div className="space-y-1">
                        <label className="text-slate-400 uppercase font-bold text-[10px]">Player Name</label>
                        <input
                          type="text"
                          value={editPlayerForm.name}
                          onChange={(e) => setEditPlayerForm({ ...editPlayerForm, name: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-purple-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-slate-400 uppercase font-bold text-[10px]">Email Address</label>
                          <input
                            type="email"
                            value={editPlayerForm.email}
                            onChange={(e) => setEditPlayerForm({ ...editPlayerForm, email: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-purple-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-slate-400 uppercase font-bold text-[10px]">Phone Number</label>
                          <input
                            type="text"
                            value={editPlayerForm.phoneNumber}
                            onChange={(e) => setEditPlayerForm({ ...editPlayerForm, phoneNumber: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-indigo-300 outline-none focus:border-purple-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-slate-400 uppercase font-bold text-[10px]">Password</label>
                          <input
                            type="text"
                            value={editPlayerForm.password}
                            onChange={(e) => setEditPlayerForm({ ...editPlayerForm, password: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-fuchsia-400 font-bold outline-none focus:border-purple-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-slate-400 uppercase font-bold text-[10px]">Chips Balance ($)</label>
                          <input
                            type="number"
                            value={editPlayerForm.chips}
                            onChange={(e) => setEditPlayerForm({ ...editPlayerForm, chips: Math.max(0, Number(e.target.value) || 0) })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-amber-400 font-bold outline-none focus:border-purple-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <label className="text-slate-400 uppercase font-bold text-[10px]">Active Loans</label>
                          <input
                            type="number"
                            value={editPlayerForm.loanCount}
                            onChange={(e) => setEditPlayerForm({ ...editPlayerForm, loanCount: Math.max(0, Number(e.target.value) || 0) })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-purple-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-slate-400 uppercase font-bold text-[10px]">Risk Status</label>
                          <select
                            value={editPlayerForm.status}
                            onChange={(e) => setEditPlayerForm({ ...editPlayerForm, status: e.target.value as any })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-slate-200 text-xs outline-none focus:border-purple-500"
                          >
                            <option value="active">Active</option>
                            <option value="flagged">Flagged</option>
                            <option value="suspended">Suspended / Banned</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-slate-400 uppercase font-bold text-[10px]">VIP Level</label>
                          <select
                            value={editPlayerForm.vipLevel}
                            onChange={(e) => setEditPlayerForm({ ...editPlayerForm, vipLevel: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-indigo-300 text-xs font-bold outline-none focus:border-purple-500"
                          >
                            <option value="VIP Bronze">Bronze</option>
                            <option value="VIP Silver">Silver</option>
                            <option value="VIP Gold">Gold</option>
                            <option value="VIP Platinum">Platinum</option>
                            <option value="VIP Diamond">Diamond</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-3">
                        <button
                          type="button"
                          onClick={() => setEditingPlayerEmail(null)}
                          className="flex-1 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold uppercase cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold uppercase shadow-lg shadow-purple-950/40 cursor-pointer"
                        >
                          Save Changes
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB: PLAYER DATA DASHBOARD & TELEMETRY HISTORY */}
          {adminTab === "playerdata" && (
            <div className="space-y-6 font-mono animate-fadeIn">
              {/* Admin Confidential Banner & Title */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-950 p-5 rounded-2xl border border-emerald-500/40 shadow-xl relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-mono text-base font-black text-white uppercase tracking-wide flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-emerald-400" /> Admin Player Data & Game History Dashboard
                    </h3>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 text-[9px] font-black uppercase flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" /> Admin Confidential
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Real-time player tracking telemetry, complete bet history ledgers, risk analytics, and cross-game player session metrics. Only visible to Casino Administrators.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      casinoAudio.playClick();
                      setPlayerActivitiesList(getPlayerActivities());
                      onAddAuditLog("ADMIN: Refreshed player telemetry data logs.", "info");
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-black uppercase flex items-center gap-1.5 hover:bg-slate-850 cursor-pointer transition-all"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-emerald-400 animate-spin-slow" /> Refresh Telemetry
                  </button>

                  <button
                    onClick={() => {
                      casinoAudio.playClick();
                      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(playerActivitiesList, null, 2));
                      const downloadAnchor = document.createElement("a");
                      downloadAnchor.setAttribute("href", dataStr);
                      downloadAnchor.setAttribute("download", `player_telemetry_export_${Date.now()}.json`);
                      document.body.appendChild(downloadAnchor);
                      downloadAnchor.click();
                      downloadAnchor.remove();
                      onAddAuditLog("ADMIN: Exported player tracking telemetry dataset.", "success");
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs font-black uppercase flex items-center gap-1.5 hover:bg-emerald-900 cursor-pointer transition-all shadow-md shadow-emerald-950/40"
                  >
                    <Download className="h-3.5 w-3.5" /> Export Data (JSON)
                  </button>
                </div>
              </div>

              {/* Telemetry High Level Metric Cards */}
              {(() => {
                const allActivities = playerActivitiesList;
                const gameplayActs = allActivities.filter(a => a.type === "gameplay");
                const totalWageredVolume = gameplayActs.reduce((acc, a) => acc + (a.amount || 0), 0);
                const totalWinsCount = gameplayActs.filter(a => a.outcome === "win").length;
                const totalLossesCount = gameplayActs.filter(a => a.outcome === "lose").length;
                const trackedEmailsCount = new Set(allActivities.map(a => a.playerEmail).filter(Boolean)).size || registeredPlayers.length;

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block flex items-center gap-1">
                        <Activity className="h-3.5 w-3.5 text-amber-400" /> Total Logs Tracked
                      </span>
                      <span className="text-xl font-black text-amber-300 mt-1 block">
                        {allActivities.length.toLocaleString()}
                      </span>
                      <span className="text-[9px] text-slate-500 block">Real-time Telemetry Events</span>
                    </div>

                    <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl">
                      <span className="text-[10px] text-purple-400 font-bold uppercase block flex items-center gap-1">
                        <Gamepad2 className="h-3.5 w-3.5 text-purple-400" /> Gameplay Rounds
                      </span>
                      <span className="text-xl font-black text-purple-300 mt-1 block">
                        {gameplayActs.length.toLocaleString()}
                      </span>
                      <span className="text-[9px] text-purple-400/80 block">{totalWinsCount} Wins • {totalLossesCount} Losses</span>
                    </div>

                    <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl">
                      <span className="text-[10px] text-emerald-400 font-bold uppercase block flex items-center gap-1">
                        <Coins className="h-3.5 w-3.5 text-emerald-400" /> Total Wager Volume
                      </span>
                      <span className="text-xl font-black text-emerald-300 mt-1 block">
                        ${totalWageredVolume.toLocaleString()}
                      </span>
                      <span className="text-[9px] text-emerald-500 block">Cumulative Turnovers</span>
                    </div>

                    <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl">
                      <span className="text-[10px] text-cyan-400 font-bold uppercase block flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-cyan-400" /> Tracked Accounts
                      </span>
                      <span className="text-xl font-black text-cyan-300 mt-1 block">
                        {trackedEmailsCount} Players
                      </span>
                      <span className="text-[9px] text-slate-500 block">Monitored Profiles</span>
                    </div>

                    <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl">
                      <span className="text-[10px] text-rose-400 font-bold uppercase block flex items-center gap-1">
                        <ShieldAlert className="h-3.5 w-3.5 text-rose-400" /> High-Risk Flags
                      </span>
                      <span className="text-xl font-black text-rose-400 mt-1 block">
                        {allActivities.filter(a => a.type === "risk" || a.outcome === "loan").length} Alerts
                      </span>
                      <span className="text-[9px] text-rose-500 block">Security Telemetry</span>
                    </div>
                  </div>
                );
              })()}

              {/* Player Selection & Filter Bar */}
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-4">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 border-b border-slate-850 pb-3">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Filter className="h-4 w-4 text-emerald-400" /> Player Telemetry & Game History Controls
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    Filter records by specific player account, game type, event category, or win/loss outcome.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
                  {/* Player Selector Dropdown */}
                  <div className="lg:col-span-4 space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold block">Target Player Account</label>
                    <select
                      value={selectedDashboardPlayerEmail}
                      onChange={(e) => setSelectedDashboardPlayerEmail(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-500/50 font-bold"
                    >
                      <option value="">-- All Player Accounts ({registeredPlayers.length}) --</option>
                      <option value="user">User (Current Session Root Host)</option>
                      {registeredPlayers.map((p) => (
                        <option key={p.email} value={p.email}>
                          {p.name} ({p.email}) - {p.vipLevel || "VIP"}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Game Filter Dropdown */}
                  <div className="lg:col-span-3 space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold block">Game Filter</label>
                    <select
                      value={dashboardGameFilter}
                      onChange={(e) => setDashboardGameFilter(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-500/50"
                    >
                      <option value="all">All Games & Casino Modules</option>
                      <option value="Slots">🎰 Slots Megaways</option>
                      <option value="Blackjack">🃏 Blackjack VIP</option>
                      <option value="Roulette">🎡 European Roulette</option>
                      <option value="Baccarat">👑 Luxury Baccarat</option>
                      <option value="Plinko">🔴 Neon Plinko</option>
                      <option value="Mines">💣 Cyber Mines</option>
                      <option value="HighLow">📈 Interactive HighLow</option>
                      <option value="Video Poker">♠️ Video Poker</option>
                    </select>
                  </div>

                  {/* Activity Category Filter */}
                  <div className="lg:col-span-2 space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold block">Event Type</label>
                    <select
                      value={dashboardTypeFilter}
                      onChange={(e) => setDashboardTypeFilter(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-500/50"
                    >
                      <option value="all">All Event Types</option>
                      <option value="gameplay">🎮 Gameplay Bets/Wins</option>
                      <option value="banking">🏦 Banking & Loans</option>
                      <option value="auth">🔑 Login / Security</option>
                      <option value="bonus">🎁 Bonuses / Referrals</option>
                      <option value="risk">🛡️ Risk Telemetry</option>
                    </select>
                  </div>

                  {/* Search Input */}
                  <div className="lg:col-span-3 space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold block">Keyword Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search action, IP, amount..."
                        value={dashboardSearchQuery}
                        onChange={(e) => setDashboardSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 text-xs text-white rounded-xl outline-none focus:border-emerald-500/50"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Selected Single Player Inspector Profile (if player is picked) */}
              {selectedDashboardPlayerEmail && (() => {
                const isRootUser = selectedDashboardPlayerEmail === "user";
                const matchedPlayer = registeredPlayers.find(p => p.email.toLowerCase() === selectedDashboardPlayerEmail.toLowerCase());
                const pName = isRootUser ? "Current Session User" : matchedPlayer?.name || "Player Profile";
                const pEmail = isRootUser ? (currentUser?.email || "Local Host") : matchedPlayer?.email || selectedDashboardPlayerEmail;
                const pPhone = isRootUser ? (currentUser?.phoneNumber || "127.0.0.1") : matchedPlayer?.phoneNumber || "N/A";
                const pChips = isRootUser ? userChips : (matchedPlayer?.chips !== undefined ? matchedPlayer.chips : 1000);
                const pLoans = isRootUser ? userLoan : (matchedPlayer?.loanCount || 0);
                const pVip = matchedPlayer?.vipLevel || "VIP Member";

                const pActs = getPlayerActivities(pEmail);
                const pWagers = pActs.filter(a => a.type === "gameplay");
                const pTotalWagered = pWagers.reduce((acc, a) => acc + (a.amount || 0), 0);
                const pWins = pWagers.filter(a => a.outcome === "win");
                const pLosses = pWagers.filter(a => a.outcome === "lose");
                const pWinRate = pWagers.length > 0 ? Math.round((pWins.length / pWagers.length) * 100) : 0;

                return (
                  <div className="p-5 bg-slate-950 border border-amber-500/40 rounded-2xl space-y-4 shadow-xl relative overflow-hidden">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-850 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-amber-500 to-emerald-400 p-0.5 shadow-lg">
                          <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center font-black text-amber-400 text-lg">
                            {pName.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-white">{pName}</h4>
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-black uppercase">
                              {pVip}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-bold uppercase">
                              KYC Verified
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Email: <strong className="text-slate-200">{pEmail}</strong> • Phone: <strong className="text-cyan-400">{pPhone}</strong>
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedDashboardPlayerEmail("")}
                        className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold uppercase cursor-pointer transition-all"
                      >
                        Clear Selected Player
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Current Balance</span>
                        <span className="text-base font-black text-amber-300">${pChips.toLocaleString()}</span>
                      </div>
                      <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
                        <span className="text-[9px] text-purple-400 font-bold uppercase block">Total Turnover Wagered</span>
                        <span className="text-base font-black text-purple-300">${pTotalWagered.toLocaleString()}</span>
                      </div>
                      <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
                        <span className="text-[9px] text-emerald-400 font-bold uppercase block">Win Rate</span>
                        <span className="text-base font-black text-emerald-300">{pWinRate}% ({pWins.length}W / {pLosses.length}L)</span>
                      </div>
                      <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
                        <span className="text-[9px] text-rose-400 font-bold uppercase block">Active Loans</span>
                        <span className="text-base font-black text-rose-300">{pLoans} Loans</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Master Telemetry & Game History Data Table */}
              <div className="p-5 bg-slate-950 border border-slate-850 rounded-2xl space-y-4">
                <div className="flex justify-between items-center border-b border-slate-850 pb-3">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <History className="h-4 w-4 text-amber-400" /> Complete Game Bet & Player Tracking History Ledger
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    Admin Audit Stream • Real-time database sync
                  </span>
                </div>

                {(() => {
                  let filteredActs = playerActivitiesList;

                  if (selectedDashboardPlayerEmail) {
                    if (selectedDashboardPlayerEmail === "user") {
                      const userEm = currentUser?.email || "";
                      filteredActs = filteredActs.filter(a => !a.playerEmail || a.playerEmail.toLowerCase() === userEm.toLowerCase() || a.playerEmail === "user");
                    } else {
                      filteredActs = filteredActs.filter(a => a.playerEmail && a.playerEmail.toLowerCase() === selectedDashboardPlayerEmail.toLowerCase());
                    }
                  }

                  if (dashboardGameFilter !== "all") {
                    filteredActs = filteredActs.filter(a => a.gameName && a.gameName.toLowerCase().includes(dashboardGameFilter.toLowerCase()));
                  }

                  if (dashboardTypeFilter !== "all") {
                    filteredActs = filteredActs.filter(a => a.type === dashboardTypeFilter);
                  }

                  if (dashboardSearchQuery.trim()) {
                    const q = dashboardSearchQuery.toLowerCase();
                    filteredActs = filteredActs.filter(a =>
                      a.action.toLowerCase().includes(q) ||
                      (a.gameName && a.gameName.toLowerCase().includes(q)) ||
                      (a.playerEmail && a.playerEmail.toLowerCase().includes(q)) ||
                      (a.ipAddress && a.ipAddress.includes(q))
                    );
                  }

                  if (filteredActs.length === 0) {
                    return (
                      <div className="text-center py-16 text-slate-500 space-y-2">
                        <Activity className="h-8 w-8 text-slate-700 mx-auto" />
                        <p className="text-xs font-bold uppercase">No player telemetry history matching current filters.</p>
                        <p className="text-[10px]">Try clearing search filters or launching a game session to record activity.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="overflow-x-auto rounded-xl border border-slate-850 bg-slate-900/60">
                      <table className="w-full text-left border-collapse text-xs font-mono">
                        <thead>
                          <tr className="bg-slate-950 border-b border-slate-850 text-slate-400 font-bold uppercase text-[10px]">
                            <th className="p-3">Timestamp / Date</th>
                            <th className="p-3">Player Email</th>
                            <th className="p-3">Game / Module</th>
                            <th className="p-3">Action Details</th>
                            <th className="p-3 text-center">Amount / Outcome</th>
                            <th className="p-3 text-right">IP Address</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850">
                          {filteredActs.map((act) => {
                            const isWin = act.outcome === "win";
                            const isLoss = act.outcome === "lose";

                            return (
                              <tr key={act.id} className="hover:bg-slate-900/80 transition-colors">
                                <td className="p-3 text-slate-400 text-[11px] whitespace-nowrap">
                                  <div className="font-bold text-slate-300">{new Date(act.timestamp).toLocaleTimeString()}</div>
                                  <div className="text-[9px] text-slate-500">{new Date(act.timestamp).toLocaleDateString()}</div>
                                </td>

                                <td className="p-3">
                                  <strong className="text-amber-300 block text-[11px]">{act.playerEmail || "User Session"}</strong>
                                  <span className="text-[9px] text-slate-500 block">ID: #{act.id.slice(0, 8)}</span>
                                </td>

                                <td className="p-3">
                                  {act.gameName ? (
                                    <span className="px-2 py-0.5 rounded bg-purple-950 border border-purple-800 text-purple-300 font-bold text-[10px]">
                                      {act.gameName}
                                    </span>
                                  ) : (
                                    <span className="text-slate-500 text-[10px] uppercase font-bold">System / Banking</span>
                                  )}
                                </td>

                                <td className="p-3 text-slate-200">
                                  <p className="text-[11px] font-semibold">{act.action}</p>
                                  {act.details && <p className="text-[9px] text-slate-400 mt-0.5">{act.details}</p>}
                                </td>

                                <td className="p-3 text-center">
                                  {act.amount !== undefined ? (
                                    <span className={`px-2.5 py-1 rounded text-[10px] font-black ${
                                      isWin
                                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                        : isLoss
                                        ? "bg-rose-950 text-rose-400 border border-rose-800"
                                        : "bg-amber-950 text-amber-300 border border-amber-800"
                                    }`}>
                                      {isWin ? "+" : isLoss ? "-" : ""}${act.amount.toLocaleString()}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-500 font-bold uppercase">{act.type}</span>
                                  )}
                                </td>

                                <td className="p-3 text-right text-[10px] text-slate-400 font-mono">
                                  {act.ipAddress || "127.0.0.1"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* TAB 2: ADVANCED RISK ENGINE & ANTI-FRAUD */}
          {adminTab === "risk" && (
            <div className="space-y-6">
              <h3 className="font-mono text-base font-black text-white uppercase tracking-wide flex items-center gap-2">
                🛡️ Advance Risk Management & Anti-Fraud Engines
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Real-time House Margin & Player Win Ratio Control */}
                <div id="enterprise-admin-control-suite-margin" className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-5 shadow-xl font-mono col-span-1 md:col-span-2">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800/80 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-wider">
                          Admin Exclusive Control
                        </span>
                        {!isAdmin && (
                          <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold">
                            Read Only (Admin Authority Required)
                          </span>
                        )}
                      </div>
                      <h4 className="font-mono text-sm font-black text-white uppercase tracking-wide flex items-center gap-2 mt-1">
                        ⚡ House Margin & Player Winning Ratio
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Set the global player win ratio (1% – 20%). Default ratio is 5%. Only admin can alter and confirm these parameters.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* PARAMETER 1: Player Winning Ratio / Global RTP (1% to 100%) */}
                    <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-300 font-black uppercase tracking-wide flex items-center gap-2">
                          🎯 Master Casino RTP / Win Ratio (1% - 100%)
                        </span>
                        <span className="text-emerald-400 font-extrabold text-sm px-2.5 py-1 rounded bg-emerald-950/40 border border-emerald-500/30">
                          {pendingWinRatio}% RTP / {(100 - pendingWinRatio).toFixed(1)}% House Edge
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <input
                          type="range"
                          min="1"
                          max="100"
                          step="0.5"
                          disabled={!isAdmin}
                          value={pendingWinRatio}
                          onChange={(e) => {
                            const val = Math.max(1, Math.min(100, Number(e.target.value) || 5.0));
                            casinoAudio.playClick();
                            setPendingWinRatio(val);
                            setWinRatioConfirmed(false);
                          }}
                          className="w-full accent-emerald-500 cursor-pointer disabled:opacity-50 h-2 bg-slate-800 rounded-lg appearance-none"
                        />
                        <div className="flex justify-between text-[10px] text-slate-500 font-bold px-0.5">
                          <span>1% (Strict 99% Edge)</span>
                          <span className="text-amber-400 font-extrabold">Casino Master Default: 5.0% (Win 5% / Lose 95%)</span>
                          <span>100% (Zero Edge)</span>
                        </div>
                      </div>

                      {/* Quick Presets for RTP */}
                      <div className="flex gap-1.5 pt-1">
                        {[5.0, 10.0, 20.0, 50.0, 75.0, 90.0, 95.0].map((presetVal) => (
                          <button
                            key={presetVal}
                            type="button"
                            disabled={!isAdmin}
                            onClick={() => {
                              casinoAudio.playClick();
                              setPendingWinRatio(presetVal);
                              setWinRatioConfirmed(false);
                            }}
                            className={`flex-1 py-1 rounded text-[10px] font-mono font-bold border transition-all ${
                              pendingWinRatio === presetVal
                                ? "bg-amber-500/20 border-amber-500 text-amber-300"
                                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                            }`}
                          >
                            {presetVal}%
                          </button>
                        ))}
                      </div>

                      {/* CONFIRM BUTTON FOR WINNING RATIO */}
                      <div className="pt-2">
                        <button
                          type="button"
                          disabled={!isAdmin}
                          onClick={() => {
                            if (!isAdmin) return;
                            casinoAudio.playClick();
                            if (onChangeCustomWinRatio) onChangeCustomWinRatio(pendingWinRatio);
                            localStorage.setItem("casino_custom_win_ratio", String(pendingWinRatio));
                            localStorage.setItem("casino_global_rtp", String(pendingWinRatio));
                            setGlobalRtp(pendingWinRatio);
                            saveSystemConfigToDatabase({
                              id: "main",
                              globalRtp: pendingWinRatio,
                              customWinRatio: pendingWinRatio,
                              forceLoseMode: pendingForceLose,
                              updatedAt: new Date().toISOString()
                            } as any);
                            window.dispatchEvent(new Event("system_config_updated"));
                            setWinRatioConfirmed(true);
                            onAddAuditLog(`ADMIN (${currentUser?.name || "Admin"}): Confirmed & Activated Master Casino Win Ratio at ${pendingWinRatio}% (House Edge: ${(100 - pendingWinRatio).toFixed(1)}%)`, "success");
                            setTimeout(() => setWinRatioConfirmed(false), 3000);
                          }}
                          className={`w-full py-2.5 px-4 rounded-xl font-bold uppercase text-xs tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                            winRatioConfirmed
                              ? "bg-emerald-600 text-white shadow-emerald-900/50"
                              : isAdmin
                              ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/40 active:scale-[0.98]"
                              : "bg-slate-800 text-slate-500 cursor-not-allowed"
                          }`}
                        >
                          {winRatioConfirmed ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 text-white animate-bounce" /> Win Ratio / RTP Activated ({pendingWinRatio}%)
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4" /> Confirm & Activate Master Win Ratio ({pendingWinRatio}%)
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* PARAMETER 2: Force Lose Mode Option */}
                    <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-rose-400 font-black uppercase tracking-wide flex items-center gap-1.5">
                              🚨 Force Lose Mode
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              pendingForceLose ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "bg-slate-800 text-slate-400"
                            }`}>
                              {pendingForceLose ? "Active (ON)" : "Disabled (OFF)"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                            If a player wins <strong className="text-amber-400 font-bold">1,000 USDT</strong> by playing games, Force Lose Mode immediately triggers and forces 100% loss on all subsequent game rounds. Set ON by default.
                          </p>
                        </div>

                        {/* TOGGLE SWITCH */}
                        <button
                          type="button"
                          disabled={!isAdmin}
                          onClick={() => {
                            if (!isAdmin) return;
                            casinoAudio.playClick();
                            setPendingForceLose(!pendingForceLose);
                            setForceLoseConfirmed(false);
                          }}
                          className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                            pendingForceLose ? "bg-rose-600" : "bg-slate-800"
                          } ${!isAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              pendingForceLose ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      {/* CONFIRM BUTTON FOR FORCE LOSE MODE */}
                      <div className="pt-2">
                        <button
                          type="button"
                          disabled={!isAdmin}
                          onClick={() => {
                            if (!isAdmin) return;
                            casinoAudio.playClick();
                            if (onChangeForceLoseMode) onChangeForceLoseMode(pendingForceLose);
                            localStorage.setItem("casino_force_lose_mode", String(pendingForceLose));
                            saveSystemConfigToDatabase({
                              id: "main",
                              customWinRatio: pendingWinRatio,
                              forceLoseMode: pendingForceLose,
                              updatedAt: new Date().toISOString()
                            } as any);
                            window.dispatchEvent(new Event("system_config_updated"));
                            setForceLoseConfirmed(true);
                            onAddAuditLog(`ADMIN (${currentUser?.name || "Admin"}): Confirmed Force Lose Mode [${pendingForceLose ? "ON (1000 USDT threshold)" : "OFF"}]`, pendingForceLose ? "warning" : "info");
                            setTimeout(() => setForceLoseConfirmed(false), 3000);
                          }}
                          className={`w-full py-2.5 px-4 rounded-xl font-bold uppercase text-xs tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                            forceLoseConfirmed
                              ? "bg-rose-600 text-white shadow-rose-900/50"
                              : isAdmin
                              ? "bg-gradient-to-r from-rose-700 to-red-600 hover:from-rose-600 hover:to-red-500 text-white shadow-rose-950/40 active:scale-[0.98]"
                              : "bg-slate-800 text-slate-500 cursor-not-allowed"
                          }`}
                        >
                          {forceLoseConfirmed ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 text-white animate-bounce" /> Force Lose Mode Saved ({pendingForceLose ? "ON" : "OFF"})
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="h-4 w-4" /> Save & Apply Force Lose Mode
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Forced outcome Scheduler and Rocket control */}
                <div className="p-5 bg-slate-900/50 border border-slate-900 rounded-2xl space-y-4">
                  <div>
                    <h4 className="font-mono text-xs font-black text-white uppercase tracking-wide">
                      🎯 Pipeline Forcing & Machine Override
                    </h4>
                    <p className="text-[11px] font-mono text-slate-500 mt-1">
                      Manually queue up outcomes for the next slots play or blackjack dealing round to audit hardware lines or handle VIP support.
                    </p>
                  </div>

                  <div className="space-y-2.5 font-mono text-xs text-slate-300">
                    <button
                      onClick={() => handleSetForcedOutcome("jackpot")}
                      className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        forcedOutcome === "jackpot"
                          ? "bg-purple-950/20 border-purple-500/40 text-purple-400 font-bold"
                          : "bg-slate-950 border-slate-900 hover:border-slate-800"
                      }`}
                    >
                      <span>🎰 Force Next Round Jackpot/Win</span>
                      <span>Status: Queue win</span>
                    </button>

                    <button
                      onClick={() => handleSetForcedOutcome("lose")}
                      className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        forcedOutcome === "lose"
                          ? "bg-rose-950/20 border-rose-500/40 text-rose-400 font-bold"
                          : "bg-slate-950 border-slate-900 hover:border-slate-800"
                      }`}
                    >
                      <span>💥 Force Next Round Loss</span>
                      <span>Status: Queue bust</span>
                    </button>

                    <button
                      onClick={() => handleSetForcedOutcome("none")}
                      className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        forcedOutcome === "none"
                          ? "bg-slate-900/40 border-slate-800 text-slate-400"
                          : "bg-slate-950 border-slate-900 hover:border-slate-800"
                      }`}
                    >
                      <span>🔄 standard Auto-Pilot</span>
                      <span>No overrides</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* IP Blocklist manager */}
              <div className="p-5 bg-slate-900/30 border border-slate-900 rounded-2xl space-y-4">
                <div>
                  <h4 className="font-mono text-xs font-black text-white uppercase tracking-wide">
                    🛡️ Firewall IP Blocklist & Anti-Bot Shield
                  </h4>
                  <p className="text-[11px] font-mono text-slate-500 mt-1">
                    Simulate active firewall block lists. Suspended players attempting network connections will trigger localized anti-fraud flags.
                  </p>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. 192.168.1.110"
                    value={newIpInput}
                    onChange={(e) => setNewIpInput(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 text-white font-mono text-xs rounded-xl px-4 py-2.5 outline-none focus:border-rose-500/40"
                  />
                  <button
                    onClick={handleAddBlockedIp}
                    className="px-5 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-black uppercase rounded-xl cursor-pointer"
                  >
                    Add Firewall Ban
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {ipBlocklist.map((ip) => (
                    <span
                      key={ip}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 flex items-center gap-2"
                    >
                      🚫 {ip}
                      <button
                        onClick={() => handleRemoveBlockedIp(ip)}
                        className="text-rose-500 hover:text-white font-bold ml-1 hover:bg-slate-950 px-1 rounded"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FINANCIAL SETTLEMENT VAULT */}
          {adminTab === "finance" && (
            <div className="space-y-6 font-mono text-xs">
              <h3 className="text-base font-black text-white uppercase tracking-wide flex items-center gap-2">
                🪙 Financial Settlement & Wallet Control Center
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-900/40 border border-slate-900 rounded-2xl">
                  <span className="text-[10px] text-slate-500 uppercase font-black block">Slots Cumulative Profit</span>
                  <span className="text-base text-emerald-400 font-bold block mt-1">${pnlStats.slotsRev.toLocaleString()}</span>
                </div>
                <div className="p-4 bg-slate-900/40 border border-slate-900 rounded-2xl">
                  <span className="text-[10px] text-slate-500 uppercase font-black block">Card Deck Profits</span>
                  <span className="text-base text-emerald-400 font-bold block mt-1">${pnlStats.blackjackRev.toLocaleString()}</span>
                </div>
                <div className="p-4 bg-slate-900/40 border border-slate-900 rounded-2xl">
                  <span className="text-[10px] text-slate-500 uppercase font-black block">Neon Crash Profits</span>
                  <span className="text-base text-emerald-400 font-bold block mt-1">${pnlStats.crashRev.toLocaleString()}</span>
                </div>
              </div>

              {/* Settlement adjustments / reserve injections & emergency controls */}
              <div className="p-5 bg-slate-900/60 border border-slate-900 rounded-3xl space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-black text-white uppercase tracking-wide">Emergency Reserves Liquidation</h4>
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                        isHarbingerUnlocked
                          ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/40"
                          : "bg-amber-950/80 text-amber-400 border border-amber-500/40"
                      }`}>
                        {isHarbingerUnlocked ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                        {isHarbingerUnlocked ? "AUTH UNLOCKED" : "LOCKED (HARBINGER PASS REQUIRED)"}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 max-w-xl leading-relaxed">
                      If player payouts deplete the House Vault Reserve below baseline levels, trigger liquidity backing injections, reserve ejections, or clear liquidation parameters under Harbinger Master authorization.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleLiquidation("INJECT", 100000)}
                    className="px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-mono font-black text-xs uppercase tracking-wide shadow-lg cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    {!isHarbingerUnlocked && <Lock className="h-3.5 w-3.5 text-emerald-200" />}
                    <span>INJECT $100,000 EMERGENCY BACKING</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLiquidation("EJECT", 100000)}
                    className="px-4 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white font-mono font-black text-xs uppercase tracking-wide shadow-lg cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    {!isHarbingerUnlocked && <Lock className="h-3.5 w-3.5 text-amber-200" />}
                    <span>EJECT $100,000 EMERGENCY RESERVE</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLiquidation("REMOVE", 100000)}
                    className="px-4 py-3 rounded-xl bg-gradient-to-r from-rose-700 to-red-600 hover:from-rose-600 hover:to-red-500 text-white font-mono font-black text-xs uppercase tracking-wide shadow-lg cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    {!isHarbingerUnlocked && <Lock className="h-3.5 w-3.5 text-rose-200" />}
                    <span>REMOVE / CLEAR LIQUIDATION RULES</span>
                  </button>
                </div>
              </div>

              {/* Dynamic House Settlement records info */}
              <div className="p-4 bg-slate-900/20 border border-slate-900 rounded-2xl space-y-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Real-time Accounting Parameters</span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Every loss incurred by the user or bots is automatically credited to the house pool reserves. Every win paid is debited directly from the active vault. Operational reserves will update dynamically in real-time as gameplay proceeds.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: GAME PORTFOLIO MANAGER */}
          {adminTab === "portfolio" && (
            <div className="space-y-6 font-mono">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-900 pb-4">
                <div>
                  <h3 className="font-mono text-base font-black text-white uppercase tracking-wide flex items-center gap-2">
                    🎮 200-Game Portfolio Control Center
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Manage the complete 200-game catalog, set RTP %, configure bet limits, and toggle real-time station status.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      casinoAudio.playClick();
                      const updated = getMergedGameCatalog();
                      setGameCatalog(updated);
                      onAddAuditLog("PORTFOLIO: Refreshed 200-game catalog & status overrides.", "info");
                    }}
                    className="px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-xs uppercase cursor-pointer hover:bg-slate-850"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Refresh Catalog
                  </button>
                </div>
              </div>

              {/* Portfolio Key Analytics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-900/60 border border-slate-850 rounded-2xl">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Catalog Games</span>
                  <span className="text-xl font-black text-white">{gameCatalog.length}</span>
                </div>
                <div className="p-3.5 bg-emerald-950/20 border border-emerald-900/40 rounded-2xl">
                  <span className="text-[10px] text-emerald-400 uppercase font-bold block">Online & Playable</span>
                  <span className="text-xl font-black text-emerald-300">
                    {gameCatalog.filter((g) => g.status === "Playable").length}
                  </span>
                </div>
                <div className="p-3.5 bg-amber-950/20 border border-amber-900/40 rounded-2xl">
                  <span className="text-[10px] text-amber-400 uppercase font-bold block">VIP Locked</span>
                  <span className="text-xl font-black text-amber-300">
                    {gameCatalog.filter((g) => g.status === "VIP Locked").length}
                  </span>
                </div>
                <div className="p-3.5 bg-rose-950/20 border border-rose-900/40 rounded-2xl">
                  <span className="text-[10px] text-rose-400 uppercase font-bold block">Under Maintenance</span>
                  <span className="text-xl font-black text-rose-300">
                    {gameCatalog.filter((g) => g.status === "Under Maintenance").length}
                  </span>
                </div>
              </div>

              {/* Filters & Search Toolbar */}
              <div className="p-4 bg-slate-900/50 border border-slate-850 rounded-2xl space-y-3">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search game title, category, badge..."
                      value={portfolioSearch}
                      onChange={(e) => setPortfolioSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl focus:outline-none focus:border-amber-500/50"
                    />
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <label className="text-slate-400 text-[10px] font-bold uppercase">Status Filter:</label>
                    <select
                      value={portfolioStatusFilter}
                      onChange={(e) => setPortfolioStatusFilter(e.target.value)}
                      className="bg-slate-950 border border-slate-800 text-slate-200 px-3 py-1.5 rounded-xl text-xs outline-none"
                    >
                      <option value="all">All Statuses</option>
                      <option value="Playable">Playable Only</option>
                      <option value="VIP Locked">VIP Locked Only</option>
                      <option value="Under Maintenance">Under Maintenance Only</option>
                    </select>
                  </div>
                </div>

                {/* Category Pills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { id: "all", label: "All Games", count: gameCatalog.length },
                    { id: "slots", label: "🎰 Slots", count: gameCatalog.filter((g) => g.category === "slots").length },
                    { id: "table", label: "🃏 Table", count: gameCatalog.filter((g) => g.category === "table").length },
                    { id: "instant", label: "⚡ Instant / Crash", count: gameCatalog.filter((g) => g.category === "instant").length },
                    { id: "live", label: "🎥 Live Dealers", count: gameCatalog.filter((g) => g.category === "live").length },
                    { id: "exotic", label: "🔮 Exotic", count: gameCatalog.filter((g) => g.category === "exotic").length },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        casinoAudio.playClick();
                        setPortfolioCategoryFilter(cat.id);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        portfolioCategoryFilter === cat.id
                          ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-950/40"
                          : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {cat.label} ({cat.count})
                    </button>
                  ))}
                </div>
              </div>

              {/* Game Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredPortfolioGames.slice((portfolioPage - 1) * 60, portfolioPage * 60).map((game) => {
                  const isMaintenance = game.status === "Under Maintenance";
                  const isVip = game.status === "VIP Locked";

                  return (
                    <div
                      key={game.id}
                      className={`p-3.5 bg-slate-950 border rounded-2xl flex flex-col justify-between transition-all space-y-3 ${
                        isMaintenance
                          ? "border-rose-900/50 bg-rose-950/10"
                          : isVip
                          ? "border-amber-900/50 bg-amber-950/10"
                          : "border-slate-850 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl p-2 bg-slate-900 rounded-xl border border-slate-800 shrink-0">
                            {game.icon || "🎰"}
                          </span>
                          <div>
                            <h4 className="text-xs font-black text-white line-clamp-1">{game.name}</h4>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                              <span className="uppercase font-bold text-amber-400">{game.category}</span>
                              <span>•</span>
                              <span>RTP {game.rtpPercent}%</span>
                            </div>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-black uppercase shrink-0 border ${
                            isMaintenance
                              ? "bg-rose-500/20 border-rose-500/40 text-rose-400"
                              : isVip
                              ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                              : "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                          }`}
                        >
                          {game.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] p-2 bg-slate-900/80 rounded-xl border border-slate-850 text-slate-300">
                        <div>
                          <span className="text-slate-500 block">Min/Max Bet</span>
                          <span className="font-bold text-white">
                            ${typeof game.minBet === "number" ? (game.minBet < 1 ? game.minBet.toFixed(2) : game.minBet) : game.minBet} - ${game.maxBet ? Number(game.maxBet).toLocaleString() : 1000}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Turnover Volume</span>
                          <span className="font-bold text-emerald-400">${game.totalVolumeChips.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          onClick={() => {
                            casinoAudio.playClick();
                            const newStatus = isMaintenance ? "Playable" : "Under Maintenance";
                            savePortfolioOverride(game.id, { status: newStatus });
                            setGameCatalog(getMergedGameCatalog());
                            onAddAuditLog(`PORTFOLIO: Toggled status for [${game.name}] -> ${newStatus}`, "warning");
                          }}
                          className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center justify-center gap-1 ${
                            isMaintenance
                              ? "bg-emerald-950 border border-emerald-800 text-emerald-300 hover:bg-emerald-900"
                              : "bg-rose-950 border border-rose-800 text-rose-300 hover:bg-rose-900"
                          }`}
                        >
                          {isMaintenance ? "Bring Online" : "Maintenance"}
                        </button>

                        <button
                          onClick={() => {
                            casinoAudio.playClick();
                            const newStatus = isVip ? "Playable" : "VIP Locked";
                            savePortfolioOverride(game.id, { status: newStatus });
                            setGameCatalog(getMergedGameCatalog());
                            onAddAuditLog(`PORTFOLIO: Toggled VIP Lock for [${game.name}] -> ${newStatus}`, "info");
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-[10px] font-bold uppercase cursor-pointer hover:bg-amber-900/50"
                          title="Toggle VIP Lock"
                        >
                          👑 VIP
                        </button>

                        <button
                          onClick={() => {
                            casinoAudio.playClick();
                            setEditingGame(game);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-bold uppercase cursor-pointer flex items-center gap-1"
                        >
                          <Edit2 className="h-3 w-3" /> Config
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Portfolio Pagination Controls */}
              {Math.ceil(filteredPortfolioGames.length / 60) > 1 && (
                <div className="flex justify-center items-center gap-2 pt-4">
                  <button
                    onClick={() => {
                      casinoAudio.playClick();
                      setPortfolioPage(Math.max(1, portfolioPage - 1));
                    }}
                    disabled={portfolioPage === 1}
                    className="px-3 py-1.5 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold disabled:opacity-40"
                  >
                    Prev Page
                  </button>
                  <span className="text-xs text-slate-400 font-mono">
                    Page <span className="font-bold text-amber-400">{portfolioPage}</span> of {Math.ceil(filteredPortfolioGames.length / 60)} ({filteredPortfolioGames.length} games)
                  </span>
                  <button
                    onClick={() => {
                      casinoAudio.playClick();
                      setPortfolioPage(Math.min(Math.ceil(filteredPortfolioGames.length / 60), portfolioPage + 1));
                    }}
                    disabled={portfolioPage >= Math.ceil(filteredPortfolioGames.length / 60)}
                    className="px-3 py-1.5 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold disabled:opacity-40"
                  >
                    Next Page
                  </button>
                </div>
              )}

              {/* MODAL: EDIT GAME CONFIGURATION */}
              {editingGame && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 max-w-md w-full font-mono space-y-4 shadow-2xl">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                      <h4 className="text-sm font-black text-white uppercase flex items-center gap-2">
                        <Sliders className="h-4 w-4 text-amber-400" /> Edit Station: {editingGame.name}
                      </h4>
                      <button
                        onClick={() => setEditingGame(null)}
                        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-slate-400 uppercase font-bold text-[10px]">Min Bet ($)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={editingGame.minBet}
                            onChange={(e) => {
                              const val = e.target.value;
                              const parsed = parseFloat(val);
                              setEditingGame({ ...editingGame, minBet: isNaN(parsed) ? val : parsed });
                            }}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-slate-400 uppercase font-bold text-[10px]">Max Bet ($)</label>
                          <input
                            type="number"
                            step="1"
                            min="1"
                            value={editingGame.maxBet}
                            onChange={(e) => {
                              const val = e.target.value;
                              const parsed = parseFloat(val);
                              setEditingGame({ ...editingGame, maxBet: isNaN(parsed) ? val : parsed });
                            }}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-400 uppercase font-bold text-[10px]">Target RTP % ({editingGame.rtpPercent}%)</label>
                        <input
                          type="range"
                          min="80"
                          max="99"
                          step="0.1"
                          value={editingGame.rtpPercent}
                          onChange={(e) => {
                            const parsed = parseFloat(e.target.value);
                            setEditingGame({ ...editingGame, rtpPercent: isNaN(parsed) ? 96.5 : parsed });
                          }}
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-400 uppercase font-bold text-[10px]">Station Status</label>
                        <select
                          value={editingGame.status}
                          onChange={(e) => setEditingGame({ ...editingGame, status: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500"
                        >
                          <option value="Playable">Playable (Online)</option>
                          <option value="VIP Locked">VIP Locked</option>
                          <option value="Under Maintenance">Under Maintenance</option>
                        </select>
                      </div>

                      <div className="pt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingGame(null)}
                          className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            casinoAudio.playWin();
                            const parsedMin = parseFloat(String(editingGame.minBet));
                            const parsedMax = parseFloat(String(editingGame.maxBet));
                            const parsedRtp = parseFloat(String(editingGame.rtpPercent));

                            const finalMin = !isNaN(parsedMin) && parsedMin >= 0 ? parsedMin : 0.10;
                            const finalMax = !isNaN(parsedMax) && parsedMax > 0 ? parsedMax : 1000;
                            const finalRtp = !isNaN(parsedRtp) ? parsedRtp : 96.5;

                            savePortfolioOverride(editingGame.id, {
                              minBet: finalMin,
                              maxBet: finalMax,
                              rtpPercent: finalRtp,
                              status: editingGame.status
                            });
                            setGameCatalog(getMergedGameCatalog());
                            onAddAuditLog(`PORTFOLIO: Saved custom station parameters for [${editingGame.name}]`, "success");
                            setEditingGame(null);
                          }}
                          className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black uppercase cursor-pointer"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: REFERRALS POLICY AND EVENT RESOLUTION */}
          {adminTab === "referrals" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-mono text-base font-black text-white uppercase tracking-wide flex items-center gap-2">
                  <Gift className="h-5 w-5 text-fuchsia-400" /> Referral Policy & Reward Settlement
                </h3>
              </div>

              {/* Policy Settings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 bg-slate-900/60 border border-slate-850 rounded-2xl">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-500">System Enable</label>
                  <button
                    onClick={() => saveReferralSettings({ ...refSettings, isEnabled: !refSettings.isEnabled })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-mono font-bold transition-all ${
                      refSettings.isEnabled 
                        ? "bg-emerald-950/40 border-emerald-500/20 text-emerald-400"
                        : "bg-slate-950 border-slate-800 text-slate-500"
                    }`}
                  >
                    {refSettings.isEnabled ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                    {refSettings.isEnabled ? "SYSTEM ONLINE" : "SYSTEM SILENT"}
                  </button>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-500">Auto Payout Mode</label>
                  <button
                    onClick={() => saveReferralSettings({ ...refSettings, autoPayout: !refSettings.autoPayout })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-mono font-bold transition-all ${
                      refSettings.autoPayout 
                        ? "bg-purple-950/40 border-purple-500/20 text-purple-400"
                        : "bg-slate-950 border-slate-800 text-slate-500"
                    }`}
                  >
                    {refSettings.autoPayout ? <ShieldCheck className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                    {refSettings.autoPayout ? "AUTO-APPROVE" : "MANUAL AUDIT"}
                  </button>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-500">Referrer Bonus ($ USDT)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={refSettings.referrerBonus}
                    onChange={(e) => saveReferralSettings({ ...refSettings, referrerBonus: Math.max(0, Number(e.target.value) || 0) })}
                    className="bg-slate-950 border border-slate-800 text-amber-400 font-mono text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-500">Referee Bonus ($ USDT)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={refSettings.refereeBonus}
                    onChange={(e) => saveReferralSettings({ ...refSettings, refereeBonus: Math.max(0, Number(e.target.value) || 0) })}
                    className="bg-slate-950 border border-slate-800 text-slate-400 font-mono text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-slate-500"
                  />
                </div>
              </div>

              {/* Referral Event logs queue (Manual approval lists) */}
              <div className="space-y-3">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-amber-400" /> Pending Deposit & Audit Queue
                </span>
                <div className="rounded-2xl border border-slate-900 bg-slate-950/40 overflow-hidden overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900/60 text-slate-500 font-bold uppercase tracking-wider text-[9px] border-b border-slate-900">
                        <th className="p-3 pl-4">ID</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Referrer (Earns 2.5 USDT)</th>
                        <th className="p-3">Referee (Depositor)</th>
                        <th className="p-3">Reward Value</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right pr-4">Manual Resolution</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {refEvents.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center text-slate-600 font-mono text-xs py-12 italic">
                            No referral tracking logs reported yet.
                          </td>
                        </tr>
                      ) : (
                        refEvents.map(ev => (
                          <tr key={ev.id} className="hover:bg-slate-900/15">
                            <td className="p-3 pl-4 text-slate-600 font-bold text-[10px]">#{ev.id}</td>
                            <td className="p-3 text-slate-500 text-[10px]">{ev.date}</td>
                            <td className="p-3 font-sans">
                              <span className="text-white block font-bold text-xs">{ev.referrerName}</span>
                              <span className="text-[10px] font-mono text-slate-500">{ev.referrerEmail}</span>
                            </td>
                            <td className="p-3 font-sans">
                              <span className="text-white block font-bold text-xs">{ev.refereeName}</span>
                              <span className="text-[10px] font-mono text-slate-500">{ev.refereeEmail}</span>
                            </td>
                            <td className="p-3 font-bold text-amber-400">${Number(ev.rewardAmount || 0).toFixed(2)} USDT</td>
                            <td className="p-3">
                              {ev.status === "approved" ? (
                                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-500/10 px-2 py-0.5 rounded">APPROVED</span>
                              ) : ev.status === "pending_deposit" ? (
                                <span className="text-[9px] font-bold text-amber-400 bg-amber-950/30 border border-amber-500/10 px-2 py-0.5 rounded">AWAITING DEPOSIT</span>
                              ) : ev.status === "pending" ? (
                                <span className="text-[9px] font-bold text-amber-400 bg-amber-950/30 border border-amber-500/10 px-2 py-0.5 rounded">PENDING AUDIT</span>
                              ) : (
                                <span className="text-[9px] font-bold text-red-400 bg-red-950/30 border border-red-500/10 px-2 py-0.5 rounded">REJECTED</span>
                              )}
                            </td>
                            <td className="p-3 text-right pr-4">
                              {ev.status === "pending" || ev.status === "pending_deposit" ? (
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    onClick={() => handleApproveReferral(ev.id)}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                                  >
                                    <Check className="h-3 w-3" /> Approve
                                  </button>
                                  <button
                                    onClick={() => handleRejectReferral(ev.id)}
                                    className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                                  >
                                    <X className="h-3 w-3" /> Fraud Reject
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-600 text-[10px] italic">No actions</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Player Referral Codes database list & Custom Overrides */}
              <div className="space-y-4">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-purple-400" /> Player Network Roster
                  </span>
                </span>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left list (col-span-2) */}
                  <div className="md:col-span-2 rounded-2xl border border-slate-900 bg-slate-950/40 overflow-x-auto max-h-[300px] overflow-y-auto">
                    <table className="w-full text-left font-mono text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-900/60 text-slate-500 font-bold uppercase tracking-wider text-[9px] border-b border-slate-900 sticky top-0">
                          <th className="p-3 pl-4">Player</th>
                          <th className="p-3">Invite Code</th>
                          <th className="p-3">Referred By</th>
                          <th className="p-3">Referral Earnings</th>
                          <th className="p-3 text-right pr-4">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900">
                        {registeredPlayers.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-4 text-center text-slate-600 italic">No registered users found.</td>
                          </tr>
                        ) : (
                          registeredPlayers.map(p => (
                            <tr key={p.email} className="hover:bg-slate-900/10">
                              <td className="p-3 pl-4">
                                <span className="text-white block font-sans font-bold text-xs">{p.name}</span>
                                <span className="text-[10px] text-slate-500">{p.email}</span>
                              </td>
                              <td className="p-3 text-fuchsia-400 font-black tracking-wider text-xs">{p.referralCode || "NONE"}</td>
                              <td className="p-3 text-slate-400 text-[10px]">{p.referredBy || "-"}</td>
                              <td className="p-3 font-semibold text-emerald-400">${p.referralChipsEarned?.toLocaleString() || 0}</td>
                              <td className="p-3 text-right pr-4">
                                <button
                                  onClick={() => {
                                    setOverridePlayerEmail(p.email);
                                    setOverrideNewCode(p.referralCode || "");
                                    casinoAudio.playClick();
                                  }}
                                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-all cursor-pointer"
                                  title="Edit invite code"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Right Override form */}
                  <div className="p-4 bg-slate-900/40 border border-slate-850 rounded-2xl flex flex-col gap-4 justify-between h-fit">
                    <div className="space-y-3">
                      <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-bold block">Code Override Station</span>
                      {overridePlayerEmail ? (
                        <div className="space-y-3 font-mono">
                          <p className="text-[11px] text-slate-400">
                            Overriding invite code for player:<br />
                            <strong className="text-white font-sans">{registeredPlayers.find(p => p.email === overridePlayerEmail)?.name}</strong>
                          </p>

                          <div>
                            <label className="block text-[9px] uppercase text-slate-500 mb-1">New Invite Code</label>
                            <input
                              type="text"
                              value={overrideNewCode}
                              onChange={(e) => setOverrideNewCode(e.target.value.toUpperCase())}
                              className="w-full bg-slate-950 border border-slate-800 text-fuchsia-400 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-fuchsia-500"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-slate-600 font-mono text-[10px] italic">
                          Click the edit icon on any player handle in the database to override their referral invite code.
                        </div>
                      )}
                    </div>

                    {overridePlayerEmail && (
                      <div className="flex gap-2 font-mono mt-4">
                        <button
                          onClick={() => { setOverridePlayerEmail(""); setOverrideNewCode(""); casinoAudio.playClick(); }}
                          className="flex-1 py-1.5 bg-slate-950 hover:bg-slate-900 text-slate-400 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleOverrideReferralCode(overridePlayerEmail, overrideNewCode)}
                          className="flex-1 py-1.5 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white rounded-lg text-[10px] font-bold uppercase transition-all shadow-md cursor-pointer"
                        >
                          Save Override
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4.5: MOBILE BANKING REQUESTS MANAGEMENT */}
          {adminTab === "banking" && (() => {
            const nonCryptoRequests = bankingRequests.filter(r => !r.isCrypto);
            return (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="font-mono text-base font-black text-white uppercase tracking-wide flex items-center gap-2">
                      <Landmark className="h-5 w-5 text-cyan-400" /> Mobile Banking Vault Queue
                    </h3>
                    <p className="text-[11px] font-mono text-slate-500 uppercase mt-0.5">
                      Process player-submitted mobile banking deposit and withdrawal requests
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl font-mono text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1.5">
                      Deposits Pending: {nonCryptoRequests.filter(r => r.type === "deposit" && r.status === "pending").length}
                    </div>
                    <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl font-mono text-[10px] text-rose-400 font-bold uppercase flex items-center gap-1.5">
                      Withdrawals Pending: {nonCryptoRequests.filter(r => r.type === "withdraw" && r.status === "pending").length}
                    </div>
                  </div>
                </div>

                {/* Banking Requests Ledger */}
                <div className="bg-slate-950/60 rounded-2xl border border-slate-900 overflow-hidden">
                  <div className="p-4 border-b border-slate-900 bg-slate-900/20 flex justify-between items-center">
                    <span className="font-mono text-xs font-black uppercase text-white tracking-wider">
                      Recent Banking Transactions ({nonCryptoRequests.length})
                    </span>
                    <button
                      onClick={() => {
                        if (confirm("Are you sure you want to clear all approved and rejected banking logs?")) {
                          casinoAudio.playClick();
                          const pendingOnly = bankingRequests.filter(r => r.status === "pending" || r.isCrypto);
                          setBankingRequests(pendingOnly);
                          localStorage.setItem("casino_banking_requests_v1", JSON.stringify(pendingOnly));
                          onAddAuditLog("BANKING: Admin purged all resolved non-crypto transaction records.", "warning");
                        }
                      }}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white font-mono text-[9px] uppercase font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" /> Clear History
                    </button>
                  </div>

                  {nonCryptoRequests.length === 0 ? (
                    <div className="p-8 text-center">
                      <Landmark className="h-10 w-10 text-slate-700 mx-auto mb-3 stroke-[1.5]" />
                      <p className="font-mono text-xs text-slate-500 uppercase tracking-wider">No banking requests found</p>
                      <p className="text-[10px] text-slate-600 mt-1 max-w-xs mx-auto">
                        When players request deposits or withdrawals from their dashboard, they will appear in this audit queue.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-900 max-h-[380px] overflow-y-auto scrollbar-thin">
                      {nonCryptoRequests.map((req) => (
                      <div key={req.id} className="p-4 hover:bg-slate-900/10 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-slate-300">[{req.id}]</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                              req.type === "deposit"
                                ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/50"
                                : "bg-rose-950/40 text-rose-400 border border-rose-900/50"
                            }`}>
                              {req.type}
                            </span>
                            <span className="font-mono text-[10px] text-slate-500">
                              {req.date} {req.time}
                            </span>
                          </div>

                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-semibold text-white">{req.playerName}</span>
                            <span className="font-mono text-[10px] text-slate-400">{req.playerEmail}</span>
                          </div>

                          {req.isCrypto ? (
                            <div className="p-2 bg-slate-900/40 rounded-xl border border-slate-900/85 flex flex-col sm:flex-row sm:items-center gap-4 w-full max-w-md">
                              <div className="space-y-0.5 shrink-0">
                                <div className="text-[9px] uppercase font-mono tracking-wider text-amber-500 font-bold flex items-center gap-1">
                                  <Coins className="h-2.5 w-2.5" /> Crypto Asset
                                </div>
                                <div className="text-xs font-bold text-amber-400 font-mono uppercase bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-900/30">
                                  {req.cryptoAsset}
                                </div>
                              </div>
                              <div className="space-y-0.5 min-w-0 flex-1">
                                <div className="text-[9px] uppercase font-mono tracking-wider text-slate-500">Wallet Address</div>
                                <div className="text-xs font-semibold text-slate-300 font-mono truncate select-all" title={req.cryptoWalletAddress}>
                                  {req.cryptoWalletAddress}
                                </div>
                              </div>
                              {req.cryptoTxHash && (
                                <div className="space-y-0.5 min-w-0 flex-1">
                                  <div className="text-[9px] uppercase font-mono tracking-wider text-slate-500">Tx Hash / ID</div>
                                  <div className="text-xs font-bold text-emerald-400 font-mono truncate select-all" title={req.cryptoTxHash}>
                                    {req.cryptoTxHash}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="p-2 bg-slate-900/40 rounded-xl border border-slate-900/85 flex flex-col sm:flex-row sm:items-center gap-4 w-full max-w-lg">
                              <div className="space-y-0.5">
                                <div className="text-[9px] uppercase font-mono tracking-wider text-slate-500">Service Name</div>
                                <div className="text-xs font-semibold text-slate-300 font-mono uppercase bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">{req.mobileBankingService}</div>
                              </div>
                              <div className="space-y-0.5">
                                <div className="text-[9px] uppercase font-mono tracking-wider text-slate-500">Target Number</div>
                                <div className="text-xs font-bold text-cyan-400 font-mono tracking-wide">{req.mobileBankingNumber}</div>
                              </div>
                              <div className="space-y-0.5">
                                <div className="text-[9px] uppercase font-mono tracking-wider text-slate-500">Agent ID</div>
                                <div className="text-xs font-bold text-amber-400 font-mono tracking-wide bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-900/30">
                                  {req.agentId || req.approvedBy || "agent-1"}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-3 w-full md:w-auto self-stretch justify-between">
                          <div className="text-right space-y-0.5">
                            <div className="text-[10px] font-mono uppercase text-slate-500">Request Sum</div>
                            <div className={`text-lg font-black font-mono ${
                              req.type === "deposit" ? "text-emerald-400" : "text-rose-400"
                            }`}>
                              {req.type === "deposit" ? "+" : "-"}${req.amount.toLocaleString()}
                            </div>
                          </div>

                          {req.status === "pending" || req.status === "ticket_approved" || req.status === "payment_submitted" ? (
                            <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                              {/* Descriptive Sub-text for P2P stages */}
                              {!req.isCrypto && req.type === "deposit" && (
                                <div className="text-[10px] font-mono font-bold uppercase text-right pr-1">
                                  {req.status === "pending" && (
                                    <span className="text-amber-500 animate-pulse">🎫 New Deposit Request - Approve Ticket First</span>
                                  )}
                                  {req.status === "ticket_approved" && (
                                    <span className="text-blue-400">⏳ Escrow Channel Active - Awaiting Player Payment</span>
                                  )}
                                  {req.status === "payment_submitted" && (
                                    <span className="text-emerald-400 animate-bounce">💰 Payment Submitted - VERIFY & RELEASE CHIPS!</span>
                                  )}
                                </div>
                              )}

                              <div className="flex gap-2 w-full md:w-auto justify-end">
                                <button
                                  onClick={() => handleRejectBanking(req.id)}
                                  className="px-3 py-1.5 bg-slate-900 hover:bg-rose-950/30 border border-slate-800 hover:border-rose-900/40 text-slate-400 hover:text-rose-400 rounded-lg font-mono text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <X className="h-3.5 w-3.5" /> Reject
                                </button>

                                {/* Action button based on request state */}
                                {!req.isCrypto && req.type === "deposit" ? (
                                  <>
                                    {req.status === "pending" && (
                                      <button
                                        onClick={() => handleP2pApproveTicket(req.id)}
                                        className="px-4 py-1.5 bg-gradient-to-r from-amber-600 to-yellow-600 text-slate-950 hover:text-black font-mono text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1 rounded-lg shadow-md cursor-pointer"
                                      >
                                        <Check className="h-3.5 w-3.5" /> Approve Ticket
                                      </button>
                                    )}
                                    {req.status === "ticket_approved" && (
                                      <button
                                        onClick={() => handleApproveBanking(req.id)}
                                        className="px-4 py-1.5 bg-slate-900 hover:bg-emerald-950/40 border border-slate-800 hover:border-emerald-500/20 text-slate-400 hover:text-emerald-400 rounded-lg font-mono text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1 cursor-pointer"
                                      >
                                        <Check className="h-3.5 w-3.5" /> Force Approve
                                      </button>
                                    )}
                                    {req.status === "payment_submitted" && (
                                      <button
                                        onClick={() => handleApproveBanking(req.id)}
                                        className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-mono text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1 rounded-lg shadow-md cursor-pointer animate-pulse"
                                      >
                                        <Check className="h-3.5 w-3.5" /> Release Chips
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <button
                                    onClick={() => handleApproveBanking(req.id)}
                                    className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg font-mono text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1 shadow-md shadow-emerald-950/20 cursor-pointer"
                                  >
                                    <Check className="h-3.5 w-3.5" /> Approve
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className={`px-3 py-1 rounded-lg border font-mono text-[10px] font-black uppercase tracking-wider ${
                              req.status === "approved"
                                ? "bg-emerald-950/20 text-emerald-400 border-emerald-900/30"
                                : req.status === "ticket_approved"
                                ? "bg-amber-950/20 text-amber-400 border-amber-900/30"
                                : req.status === "payment_submitted"
                                ? "bg-blue-950/20 text-blue-400 border-blue-900/30"
                                : "bg-rose-950/20 text-rose-400 border-rose-900/30"
                            }`}>
                              {req.status}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

          {/* TAB: ENTERPRISE CRYPTO COMMAND CENTER */}
          {adminTab === "crypto" && (() => {
            const cryptoRequests = bankingRequests.filter(r => r.isCrypto);
            const pendingCrypto = cryptoRequests.filter(r => r.status === "pending");
            const resolvedCrypto = cryptoRequests.filter(r => r.status !== "pending");

            // Calculate historical sums
            const approvedDeposits = resolvedCrypto.filter(r => r.type === "deposit" && r.status === "approved");
            const approvedWithdrawals = resolvedCrypto.filter(r => r.type === "withdraw" && r.status === "approved");

            const totalDepositedChips = approvedDeposits.reduce((sum, r) => sum + r.amount, 0);
            const totalWithdrawnChips = approvedWithdrawals.reduce((sum, r) => sum + r.amount, 0);

            return (
              <div className="space-y-6 animate-fadeIn font-mono text-xs">
                
                {/* Header Banner */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-slate-900 pb-4">
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-wide flex items-center gap-2">
                      <Coins className="h-5 w-5 text-amber-500 animate-spin" style={{ animationDuration: "12s" }} /> Enterprise Direct Crypto Overview
                    </h3>
                    <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                      Centralized Master Receiving Wallet, Sub-Admin Deposit & Withdrawal Processing Queue, Live Transaction Verification Chat, and Hot-Wallet Reserves.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleInjectMockCryptoDeposit}
                      className="px-3.5 py-2 bg-indigo-950/40 hover:bg-indigo-900/40 border border-indigo-500/30 hover:border-indigo-500/60 text-indigo-300 font-black uppercase rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5 animate-bounce" /> crypto inject
                    </button>

                    <button
                      onClick={handleSweepVault}
                      className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black uppercase rounded-xl transition-all shadow-md shadow-amber-950/20 cursor-pointer flex items-center gap-1.5"
                    >
                      <Layers className="h-3.5 w-3.5" /> Sweep Hot-Wallets
                    </button>
                  </div>
                </div>

                {/* 1. MASTER CRYPTO & BINANCE WALLET CONFIGURATION AND CONFIRMATION HUB */}
                <div className="p-5 rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-950/30 via-slate-950 to-slate-950 space-y-5">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-amber-500/20 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 font-mono font-bold text-xl shadow-inner">
                        💎
                      </div>
                      <div>
                        <h4 className="font-mono font-black text-white text-base uppercase tracking-wider flex items-center gap-2">
                          Master Crypto & Binance Wallet Management Hub
                        </h4>
                        <p className="text-[11px] text-slate-400 font-mono">
                          Admin authority to add, update, verify, and lock centralized receiving wallet addresses & Binance Pay IDs.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="bg-slate-900/90 p-1.5 px-3 rounded-xl border border-slate-800 flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Crypto Bonus:</span>
                        <input 
                          type="number" 
                          value={adminCryptoBonus} 
                          onChange={(e) => {
                            const val = Math.max(0, Number(e.target.value));
                            setAdminCryptoBonus(val);
                            saveCryptoBonusPercent(val);
                          }}
                          className="w-12 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-center font-bold text-emerald-400 text-xs font-mono outline-none"
                        />
                        <span className="text-xs font-black text-emerald-400">%</span>
                      </div>

                      <button
                        onClick={() => { casinoAudio.playClick(); setShowAddWalletModal(prev => !prev); }}
                        className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black uppercase rounded-xl transition-all shadow-md shadow-amber-950/20 cursor-pointer flex items-center gap-1.5 text-xs"
                      >
                        <Plus className="h-4 w-4" /> Add Master Wallet
                      </button>
                    </div>
                  </div>

                  {/* Add Wallet Form Drawer */}
                  {showAddWalletModal && (
                    <form onSubmit={handleSaveAddWallet} className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 space-y-4 animate-fadeIn font-mono">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Coins className="h-4 w-4" /> Register New Master Crypto Receiving Option
                        </span>
                        <button 
                          type="button" 
                          onClick={() => setShowAddWalletModal(false)}
                          className="text-slate-400 hover:text-white text-sm"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        {/* Option 1: Category */}
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Payment Option Type</label>
                          <select 
                            value={newCategory} 
                            onChange={(e) => {
                              const cat = e.target.value as "binance" | "web3";
                              setNewCategory(cat);
                              if (cat === "binance") {
                                setNewNetwork("Binance Pay ID");
                                setNewName("Binance Pay Direct");
                                setNewIcon("🟡");
                              } else {
                                setNewNetwork("TRON (TRC-20)");
                                setNewName("USDT TRC20 Wallet");
                                setNewIcon("🌐");
                              }
                            }}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-bold"
                          >
                            <option value="binance">Option 1: Binance Pay</option>
                            <option value="web3">Option 2: Web3 Payment Wallet</option>
                          </select>
                        </div>

                        {/* Symbol */}
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Asset Symbol</label>
                          <input 
                            type="text" 
                            required 
                            placeholder="e.g. USDT, BTC, ETH, SOL" 
                            value={newSymbol} 
                            onChange={(e) => setNewSymbol(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-amber-300 font-bold uppercase"
                          />
                        </div>

                        {/* Network */}
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Network / Service</label>
                          <input 
                            type="text" 
                            required 
                            placeholder="e.g. TRC20, BEP20, Binance Pay ID" 
                            value={newNetwork} 
                            onChange={(e) => setNewNetwork(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-bold"
                          />
                        </div>

                        {/* Address / Pay ID */}
                        <div className="md:col-span-2">
                          <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                            {newCategory === "binance" ? "Master Binance Pay ID / Merchant Email" : "Master Web3 Receiving Address"}
                          </label>
                          <input 
                            type="text" 
                            required 
                            placeholder={newCategory === "binance" ? "e.g. 883920194 or merchant@binance.com" : "e.g. TX9a8B7c6D5e4F3g2H1i0J9k8L7m6N5o4P3q2R1s0T"} 
                            value={newAddress} 
                            onChange={(e) => setNewAddress(e.target.value)}
                            className="w-full bg-slate-950 border border-amber-500/40 rounded-xl p-2 text-emerald-300 font-bold font-mono text-xs"
                          />
                        </div>

                        {/* Limits */}
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Min Deposit ($)</label>
                            <input 
                              type="number" 
                              value={newMinDep} 
                              onChange={(e) => setNewMinDep(Number(e.target.value))}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-bold"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Min Withdraw ($)</label>
                            <input 
                              type="number" 
                              value={newMinWith} 
                              onChange={(e) => setNewMinWith(Number(e.target.value))}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-bold"
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase rounded-xl text-xs tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Confirm & Activate Master Wallet Address
                      </button>
                    </form>
                  )}

                  {/* Wallets Grid List */}
                  <div className="space-y-4 font-mono">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {adminWallets.map((wallet) => {
                        const isEditingThis = editingWalletId === wallet.id;

                        return (
                          <div 
                            key={wallet.id}
                            className={`p-4 rounded-2xl border transition-all ${
                              wallet.isConfirmed 
                                ? "bg-slate-900/90 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.05)]" 
                                : "bg-slate-900/60 border-amber-500/40"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
                              <div className="flex items-center gap-2.5">
                                <span className="text-2xl">{wallet.icon || "🪙"}</span>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h5 className="font-black text-white text-sm uppercase tracking-wide">
                                      {wallet.name}
                                    </h5>
                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${
                                      wallet.methodCategory === "binance"
                                        ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                                        : "bg-cyan-500/20 text-cyan-400 border-cyan-500/40"
                                    }`}>
                                      {wallet.methodCategory === "binance" ? "Option 1: Binance Pay" : "Option 2: Web3"}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-slate-400 block font-sans">
                                    Network: <strong className="text-slate-200">{wallet.network}</strong> ({wallet.symbol})
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleToggleWalletEnabled(wallet.id)}
                                  className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition-colors cursor-pointer ${
                                    wallet.enabled 
                                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                                      : "bg-slate-800 text-slate-500"
                                  }`}
                                >
                                  {wallet.enabled ? "Active" : "Disabled"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteWallet(wallet.id)}
                                  className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                                  title="Delete Wallet"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Wallet Address & Confirmation Details */}
                            <div className="mt-3 space-y-2.5">
                              <div>
                                <span className="text-[9px] text-slate-400 font-bold uppercase block mb-1">
                                  {wallet.methodCategory === "binance" ? "Binance Pay ID / Merchant Address:" : "Master Crypto Receiving Address:"}
                                </span>

                                {isEditingThis ? (
                                  <div className="flex gap-2">
                                    <input 
                                      type="text" 
                                      value={editWalletAddrValue}
                                      onChange={(e) => setEditWalletAddrValue(e.target.value)}
                                      className="flex-1 bg-slate-950 border border-amber-500 rounded-xl p-2 text-amber-300 font-mono text-xs outline-none"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (editWalletAddrValue.trim()) {
                                          handleConfirmMasterWallet(wallet.id, editWalletAddrValue.trim());
                                        }
                                        setEditingWalletId(null);
                                      }}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl cursor-pointer"
                                    >
                                      Save & Lock
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 text-emerald-400 font-mono text-xs select-all break-all">
                                    <span className="font-bold">{wallet.address}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingWalletId(wallet.id);
                                        setEditWalletAddrValue(wallet.address);
                                      }}
                                      className="p-1 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer shrink-0"
                                      title="Edit Address"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Confirmation Status Badge & Action */}
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
                                <div>
                                  {wallet.isConfirmed ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold">
                                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                      CONFIRMED BY {wallet.confirmedBy || "ADMIN"}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-400 text-[10px] font-bold">
                                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                                      UNCONFIRMED ADDRESS
                                    </span>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleConfirmMasterWallet(wallet.id, wallet.address)}
                                  className="w-full sm:w-auto px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl cursor-pointer shadow flex items-center justify-center gap-1.5"
                                >
                                  <Check className="h-3.5 w-3.5" /> Confirm & Confirm Wallet Address
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 2. SUB-ADMIN AUTHORITY DEPOSIT & WITHDRAWAL QUEUE WITH LIVE TRANSACTION CHAT */}
                <div className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" /> Sub-Admin Authority Processing Hub & Live Verification Queue
                  </span>
                  <SubAdminDashboard 
                    currentUser={currentUser ? { ...currentUser, role: "Sub-Admin" } : { name: "System Admin", role: "Sub-Admin" }} 
                    onLogout={() => {}} 
                    onAddAuditLog={onAddAuditLog}
                    embedded={true}
                  />
                </div>

                {/* Emergency Halt Banner & Main Switch */}
                <div className={`p-4.5 rounded-2xl border transition-all duration-300 flex flex-col md:flex-row items-center justify-between gap-4 ${
                  cryptoHalted 
                    ? "bg-red-950/30 border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.1)] animate-pulse" 
                    : "bg-emerald-950/15 border-emerald-500/20"
                }`}>
                  <div className="flex items-center gap-3.5">
                    <div className={`h-11 w-11 rounded-full flex items-center justify-center border shrink-0 ${
                      cryptoHalted ? "bg-red-950/60 border-red-500/50" : "bg-emerald-950 border-emerald-500/30"
                    }`}>
                      {cryptoHalted ? <Lock className="h-5 w-5 text-red-400" /> : <Unlock className="h-5 w-5 text-emerald-400" />}
                    </div>
                    <div>
                      <h4 className={`text-sm font-black uppercase tracking-wider ${cryptoHalted ? "text-red-400" : "text-emerald-400"}`}>
                        Crypto Operations Status: {cryptoHalted ? "HALTED & FROZEN" : "LIVE & OPERATIONAL"}
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-relaxed font-sans max-w-xl mt-0.5">
                        {cryptoHalted 
                          ? "All player-side crypto deposit portals and withdrawal submissions are frozen. Submit buttons are fully disabled on front-facing clients." 
                          : "Players can submit USDT deposits and request instant crypto withdrawals. Real-time rates and designated wallet keys are active."
                        }
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleToggleCryptoHalt}
                    className={`px-4.5 py-2.5 rounded-xl font-bold uppercase transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-md ${
                      cryptoHalted 
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/30" 
                        : "bg-red-600 hover:bg-red-500 text-white shadow-red-950/30"
                    }`}
                  >
                    {cryptoHalted ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    {cryptoHalted ? "Resume Operations" : "Activate Emergency Halt"}
                  </button>
                </div>

                {/* Crypto Configurations and Vault Reserves Grid */}
                <div className="space-y-3">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Sliders className="h-4 w-4 text-amber-500" /> Dynamic Asset Parameters & Reserve Hot-Vaults
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {(["USDT", "BTC", "ETH", "SOL"] as const).map((coin) => {
                      const addr = cryptoAddresses[coin];
                      const rate = cryptoRates[coin];
                      const vault = cryptoVaults[coin];
                      const approxValueUSDT = Math.floor(vault * rate);

                      return (
                        <div key={coin} className="p-4 rounded-2xl border border-slate-900 bg-slate-950/60 flex flex-col justify-between gap-4.5">
                          
                          {/* Coin Header */}
                          <div className="flex justify-between items-center border-b border-white/[0.03] pb-2">
                            <span className="text-sm font-black text-white tracking-widest uppercase flex items-center gap-1.5">
                              {coin === "USDT" && <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />}
                              {coin} Ledger
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase font-sans">
                              {coin === "USDT" ? "Stablecoin" : "Crypto Asset"}
                            </span>
                          </div>

                          {/* Vault Reserves */}
                          <div className="space-y-1 bg-slate-900/30 p-2.5 rounded-xl border border-slate-900/60">
                            <div className="text-[9px] text-slate-500 uppercase font-bold">Hot-Vault Reserve</div>
                            <div className="flex items-baseline justify-between">
                              <span className="text-sm font-black text-white">{vault.toLocaleString()}</span>
                              <span className="text-[10px] font-bold text-cyan-400">${approxValueUSDT.toLocaleString()}</span>
                            </div>
                            
                            {/* Vault adjustment controls */}
                            <div className="flex items-center gap-1 mt-2 border-t border-white/[0.02] pt-2">
                              <button
                                onClick={() => {
                                  const amt = prompt(`Enter value to ADD to ${coin} Hot Vault:`, "10");
                                  if (amt && !isNaN(Number(amt))) {
                                    handleUpdateCryptoVault(coin, Number((vault + Math.abs(Number(amt))).toFixed(6)));
                                  }
                                }}
                                className="flex-1 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-emerald-400 rounded-lg text-[9px] font-bold uppercase transition-colors cursor-pointer"
                              >
                                + Adjust
                              </button>
                              <button
                                onClick={() => {
                                  const amt = prompt(`Enter value to CUT from ${coin} Hot Vault:`, "10");
                                  if (amt && !isNaN(Number(amt))) {
                                    handleUpdateCryptoVault(coin, Number(Math.max(0, vault - Math.abs(Number(amt))).toFixed(6)));
                                  }
                                }}
                                className="flex-1 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-rose-400 rounded-lg text-[9px] font-bold uppercase transition-colors cursor-pointer"
                              >
                                - Adjust
                              </button>
                            </div>
                          </div>

                          {/* Exchange Rate Parameter */}
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-500 uppercase font-bold block">1 {coin} Value ($ Chips)</label>
                            <input
                              type="number"
                              defaultValue={rate}
                              onBlur={(e) => {
                                const val = Number(e.target.value);
                                if (val > 0 && val !== rate) {
                                  handleUpdateCryptoRate(coin, val);
                                }
                              }}
                              className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2.5 py-1.5 font-bold text-amber-400 font-mono text-xs outline-none focus:border-amber-500/50"
                            />
                          </div>

                          {/* Destination Wallet Key */}
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-500 uppercase font-bold block">Deposit Destination Address</label>
                            <input
                              type="text"
                              defaultValue={addr}
                              onBlur={(e) => {
                                const val = e.target.value.trim();
                                if (val && val !== addr) {
                                  handleUpdateCryptoAddress(coin, val);
                                }
                              }}
                              className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2.5 py-1.5 text-slate-300 font-mono text-[9px] outline-none truncate focus:border-cyan-500/50"
                            />
                          </div>

                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* On-Chain Metrics, Risk Audit Threshold & Historic Ledger Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Reconciliation Summary */}
                  <div className="bg-slate-950/60 rounded-2xl border border-slate-900 p-4.5 space-y-3.5">
                    <div className="text-xs font-black uppercase text-amber-500 flex items-center gap-1.5 font-bold">
                      <Activity className="h-4 w-4" /> RECONCILIATION SUMMARY
                    </div>
                    
                    <div className="space-y-2 text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Gross Crypto Deposited:</span>
                        <span className="font-bold text-emerald-400">${totalDepositedChips.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Gross Crypto Withdrawn:</span>
                        <span className="font-bold text-rose-400">${totalWithdrawnChips.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t border-white/[0.03] pt-2 mt-2">
                        <span className="text-slate-400 font-bold">Net On-Chain Cash Flow:</span>
                        <span className={`font-black ${totalDepositedChips - totalWithdrawnChips >= 0 ? "text-emerald-400" : "text-rose-500"}`}>
                          ${(totalDepositedChips - totalWithdrawnChips).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Enterprise Risk Threshold Slider */}
                  <div className="bg-slate-950/60 rounded-2xl border border-slate-900 p-4.5 space-y-3">
                    <div className="text-xs font-black uppercase text-rose-400 flex items-center gap-1.5">
                      <ShieldAlert className="h-4 w-4" /> RISK AUDIT THRESHOLD
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
                      Any on-chain transaction requesting credits exceeding this value is automatically flagged as HIGH RISK and undergoes secondary multi-sig approval.
                    </p>
                    
                    <div className="space-y-1 mt-2.5">
                      <div className="flex justify-between font-bold">
                        <span className="text-slate-500 uppercase">Warning Trigger:</span>
                        <span className="text-amber-400">${validationThreshold.toLocaleString()} chips</span>
                      </div>
                      <input
                        type="range"
                        min="1000"
                        max="50000"
                        step="1000"
                        value={validationThreshold}
                        onChange={(e) => handleUpdateThreshold(Number(e.target.value))}
                        className="w-full accent-amber-500 bg-slate-900 rounded-lg appearance-none h-1.5 cursor-pointer"
                      />
                    </div>
                  </div>

                    {/* Historic Resolved ledger */}
                    <div className="bg-slate-950/60 rounded-2xl border border-slate-900 p-4.5 space-y-3 flex-1">
                      <div className="text-xs font-black uppercase text-slate-300 flex items-center gap-1.5 justify-between">
                        <span className="flex items-center gap-1.5 font-bold">
                          <History className="h-4 w-4 text-slate-400" /> HISTORIC CRYPTO LEDGER
                        </span>
                        <span className="text-[9px] font-bold text-slate-500">({resolvedCrypto.length} Resolved)</span>
                      </div>

                      <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                        {resolvedCrypto.length === 0 ? (
                          <p className="text-slate-600 text-center py-6 italic text-[11px]">No resolved cryptocurrency events in this session.</p>
                        ) : (
                          resolvedCrypto.map((hist) => (
                            <div key={hist.id} className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-900 flex justify-between items-center text-[10px]">
                              <div>
                                <span className="text-slate-500 block">#{hist.id}</span>
                                <span className="text-white block font-sans font-bold">{hist.playerName}</span>
                                <span className="text-[8px] font-bold uppercase text-slate-400">{hist.cryptoAsset || "USDT"} {hist.type}</span>
                              </div>
                              <div className="text-right">
                                <span className={`block font-bold ${hist.status === "approved" ? "text-emerald-400" : "text-rose-500"}`}>
                                  {hist.status.toUpperCase()}
                                </span>
                                <span className="text-slate-500 font-bold">${hist.amount.toLocaleString()}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                </div>

              </div>
            );
          })()}

          {/* TAB: AGENT MANAGEMENT */}
          {adminTab === "agents" && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-900 pb-4">
                <div>
                  <h3 className="font-mono text-base font-black text-white uppercase tracking-wide flex items-center gap-2">
                    🛡️ Agents Oversight & Liquidity Terminal
                  </h3>
                  <p className="text-xs text-slate-400 font-sans mt-0.5">Control operational statuses, flag high-risk liquidity providers, and settle agent floats.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      casinoAudio.playClick();
                      setShowAddAgentForm(!showAddAgentForm);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/30 text-[11px] font-mono font-bold text-emerald-300 flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                  >
                    <UserPlus className="h-3.5 w-3.5 text-emerald-400" />
                    <span>{showAddAgentForm ? "Hide Register Form" : "+ Register Agent"}</span>
                  </button>
                  <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono font-bold text-slate-300">
                    Total Active Network Liquidity: <span className="text-emerald-400 font-black">${agents.reduce((sum, a) => sum + (a.balance || 0), 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* ✨ Register New P2P Mobile Agent Form */}
              {showAddAgentForm && (
                <div className="p-5 bg-slate-950/90 border border-emerald-500/30 rounded-2xl space-y-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <h4 className="font-mono text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                      <span>✨ Register New P2P Mobile Agent (Admin Control)</span>
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400">Set custom ID, route, and password</span>
                  </div>
                  <form onSubmit={handleRegisterAgentSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                    <div>
                      <label className="block text-[9px] uppercase font-mono tracking-widest text-slate-400 mb-1 font-bold">
                        Custom Agent ID <span className="text-slate-500 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Leave blank for auto ID"
                        value={newAgentCustomId}
                        onChange={(e) => setNewAgentCustomId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-white focus:outline-none focus:border-emerald-500 transition-all outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase font-mono tracking-widest text-slate-400 mb-1 font-bold">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Agent Full Name"
                        value={newAgentName}
                        onChange={(e) => setNewAgentName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-white focus:outline-none focus:border-emerald-500 transition-all outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase font-mono tracking-widest text-slate-400 mb-1 font-bold">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="agent@casino.com"
                        value={newAgentEmail}
                        onChange={(e) => setNewAgentEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-white focus:outline-none focus:border-emerald-500 transition-all outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase font-mono tracking-widest text-slate-400 mb-1 font-bold">
                        Phone Number *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="01710-XXXXXX"
                        value={newAgentPhone}
                        onChange={(e) => setNewAgentPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-white focus:outline-none focus:border-emerald-500 transition-all outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase font-mono tracking-widest text-slate-400 mb-1 font-bold">
                        Service Route / Provider
                      </label>
                      <select
                        value={newAgentService}
                        onChange={(e) => setNewAgentService(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-emerald-400 focus:outline-none focus:border-emerald-500 transition-all outline-none cursor-pointer"
                      >
                        <option value="bKash">bKash Merchant</option>
                        <option value="Nagad">Nagad Merchant</option>
                        <option value="Rocket">Rocket P2P</option>
                        <option value="M-Pesa">M-Pesa / Upay</option>
                        <option value="Crypto">Crypto USDT / Wallet</option>
                        <option value="All Services">All Routes / Universal</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase font-mono tracking-widest text-slate-400 mb-1 font-bold">
                        Admin Password Set *
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          placeholder="Set agent password"
                          value={newAgentPassword}
                          onChange={(e) => setNewAgentPassword(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-white focus:outline-none focus:border-emerald-500 transition-all outline-none font-bold"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all h-[38px] flex items-center justify-center cursor-pointer shrink-0"
                        >
                          + Add Agent
                        </button>
                      </div>
                    </div>
                  </form>
                  {newAgentFormError && (
                    <div className="text-[11px] text-red-400 font-mono bg-red-950/20 p-2 rounded-lg border border-red-900/30">
                      ⚠️ {newAgentFormError}
                    </div>
                  )}
                  {newAgentFormSuccess && (
                    <div className="text-[11px] text-emerald-400 font-mono bg-emerald-950/20 p-2 rounded-lg border border-emerald-900/30">
                      ✅ {newAgentFormSuccess}
                    </div>
                  )}
                </div>
              )}

              {/* Agents grid */}
              <div className="space-y-4">
                {agents.map((agent) => {
                  const inputVal = agentAdjustAmounts[agent.id] || "";
                  const isEditingThis = editingAgentId === agent.id;

                  return (
                    <div 
                      key={agent.id} 
                      className={`p-5 rounded-2xl border bg-slate-950/40 hover:bg-slate-950/60 transition-all flex flex-col gap-4 ${
                        agent.status === "blocked" 
                          ? "border-red-950 bg-red-950/5" 
                          : agent.status === "red_marked" 
                          ? "border-amber-950 bg-amber-950/5" 
                          : "border-slate-900"
                      }`}
                    >
                      {isEditingThis && editAgentData ? (
                        /* Inline Admin Agent Details & Route Editor */
                        <div className="p-4 bg-slate-900/90 border border-indigo-500/40 rounded-xl space-y-3 font-mono">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                              🛠️ Edit Agent Details & Route Permissions for [{agent.id}]
                            </span>
                            <button
                              onClick={() => {
                                setEditingAgentId(null);
                                setEditAgentData(null);
                              }}
                              className="text-[10px] text-slate-400 hover:text-white"
                            >
                              Cancel
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                            <div>
                              <label className="block text-[9px] uppercase text-slate-400 mb-1">Agent ID</label>
                              <input
                                type="text"
                                value={editAgentData.id}
                                onChange={(e) => setEditAgentData({ ...editAgentData, id: e.target.value })}
                                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] uppercase text-slate-400 mb-1">Full Name</label>
                              <input
                                type="text"
                                value={editAgentData.name}
                                onChange={(e) => setEditAgentData({ ...editAgentData, name: e.target.value })}
                                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] uppercase text-slate-400 mb-1">Email</label>
                              <input
                                type="email"
                                value={editAgentData.email}
                                onChange={(e) => setEditAgentData({ ...editAgentData, email: e.target.value })}
                                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] uppercase text-slate-400 mb-1">Phone Number</label>
                              <input
                                type="text"
                                value={editAgentData.phone}
                                onChange={(e) => setEditAgentData({ ...editAgentData, phone: e.target.value })}
                                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] uppercase text-slate-400 mb-1">Password</label>
                              <input
                                type="text"
                                value={editAgentData.password}
                                onChange={(e) => setEditAgentData({ ...editAgentData, password: e.target.value })}
                                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-emerald-400 font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] uppercase text-slate-400 mb-1">Service Route</label>
                              <select
                                value={editAgentData.service}
                                onChange={(e) => setEditAgentData({ ...editAgentData, service: e.target.value })}
                                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-indigo-300"
                              >
                                <option value="bKash">bKash Merchant</option>
                                <option value="Nagad">Nagad Merchant</option>
                                <option value="Rocket">Rocket P2P</option>
                                <option value="M-Pesa">M-Pesa / Upay</option>
                                <option value="Crypto">Crypto USDT / Wallet</option>
                                <option value="All Services">All Routes / Universal</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 pt-1 text-xs">
                            <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editAgentData.showOnDeposit}
                                onChange={(e) => setEditAgentData({ ...editAgentData, showOnDeposit: e.target.checked })}
                                className="rounded bg-slate-950 border-slate-800"
                              />
                              <span>Show on Deposit Gateway</span>
                            </label>
                            <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editAgentData.showOnWithdrawal}
                                onChange={(e) => setEditAgentData({ ...editAgentData, showOnWithdrawal: e.target.checked })}
                                className="rounded bg-slate-950 border-slate-800"
                              />
                              <span>Show on Withdrawal Gateway</span>
                            </label>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                            <button
                              type="button"
                              onClick={() => handleDeleteAgent(agent.id)}
                              className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/40 text-rose-300 rounded-lg text-[10px] font-bold cursor-pointer"
                            >
                              🗑️ Delete Agent
                            </button>
                            <button
                              onClick={() => handleSaveEditAgent(agent.id)}
                              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold"
                            >
                              💾 Save Agent Changes
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Standard Agent View Row */
                        <div className="flex flex-col xl:flex-row gap-5 items-start xl:items-center justify-between w-full">
                          {/* Identity & Status */}
                          <div className="space-y-2 shrink-0 max-w-sm">
                            <div className="flex items-center gap-2.5">
                              <span className="font-mono text-xs font-black text-emerald-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">{agent.id}</span>
                              <h4 className="font-mono font-bold text-sm text-white flex items-center gap-2">
                                {agent.name}
                                {agent.service && (
                                  <span className="px-2 py-0.5 bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 rounded text-[9px] font-mono">
                                    {agent.service}
                                  </span>
                                )}
                                {agent.status === "red_marked" && (
                                  <span className="px-2 py-0.5 bg-red-950 text-red-500 border border-red-500/30 rounded text-[9px] font-black animate-pulse">
                                    ⚠️ RED-MARKED
                                  </span>
                                )}
                                {agent.status === "blocked" && (
                                  <span className="px-2 py-0.5 bg-slate-900 text-slate-500 border border-slate-800 rounded text-[9px] font-black">
                                    BLOCKED
                                  </span>
                                )}
                              </h4>
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 space-y-0.5">
                              <div>Email: <span className="text-slate-300">{agent.email}</span></div>
                              <div>Phone: <span className="text-slate-300">{agent.phoneNumber || agent.phone}</span></div>
                              <div>Password: <span className="text-emerald-300 font-bold">••••••••</span> <span className="text-[9px] text-slate-500">(Admin control)</span></div>
                            </div>
                            <div className="flex flex-wrap gap-1.5 pt-1.5">
                              <button
                                onClick={() => handleToggleBlockAgent(agent.id)}
                                className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-black uppercase transition-all cursor-pointer ${
                                  agent.status === "blocked"
                                    ? "bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-400 border border-emerald-900/35"
                                    : "bg-slate-900 hover:bg-red-950/20 text-slate-400 hover:text-red-400 border border-slate-800"
                                }`}
                              >
                                {agent.status === "blocked" ? "🟢 Unblock" : "🛑 Block"}
                              </button>
                              <button
                                onClick={() => handleToggleRedMarkAgent(agent.id)}
                                className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-black uppercase transition-all cursor-pointer ${
                                  agent.status === "red_marked"
                                    ? "bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800"
                                    : "bg-slate-900 hover:bg-amber-950/20 text-slate-400 hover:text-amber-500 border border-slate-800"
                                }`}
                              >
                                {agent.status === "red_marked" ? "🟢 Unflag" : "🚨 Red Mark"}
                              </button>
                              <button
                                onClick={() => {
                                  casinoAudio.playClick();
                                  setEditingAgentId(agent.id);
                                  setEditAgentData({
                                    id: agent.id,
                                    name: agent.name,
                                    email: agent.email || "",
                                    phone: agent.phoneNumber || agent.phone || "",
                                    password: agent.password || "",
                                    service: agent.service || "bKash",
                                    showOnDeposit: agent.showOnDeposit ?? true,
                                    showOnWithdrawal: agent.showOnWithdrawal ?? true
                                  });
                                }}
                                className="px-2.5 py-1 rounded-lg font-mono text-[10px] font-black uppercase transition-all cursor-pointer bg-slate-900 hover:bg-slate-800 text-indigo-400 border border-indigo-500/30 flex items-center gap-1"
                              >
                                <span>✏️</span> Edit Details & Routes
                              </button>
                            </div>
                          </div>

                      {/* Performance Indicators */}
                      <div className="grid grid-cols-3 gap-4 bg-slate-900/30 p-3.5 rounded-xl border border-slate-900 font-mono text-xs max-w-md w-full xl:w-auto">
                        <div className="text-center">
                          <span className="text-[9px] text-slate-500 block uppercase font-bold">DEPOSITS CLEARED</span>
                          <strong className="text-white text-sm block mt-0.5">{agent.depositRequestsProcessed || 0}</strong>
                        </div>
                        <div className="text-center border-x border-slate-850 px-3">
                          <span className="text-[9px] text-slate-500 block uppercase font-bold">WITHDRAWALS</span>
                          <strong className="text-white text-sm block mt-0.5">{agent.withdrawRequestsProcessed || 0}</strong>
                        </div>
                        <div className="text-center">
                          <span className="text-[9px] text-slate-500 block uppercase font-bold">VOL APPROVED</span>
                          <strong className="text-emerald-400 text-xs block font-black mt-1">${(agent.totalVolumeApproved || 0).toLocaleString()}</strong>
                        </div>
                      </div>

                      {/* Liquidity adjustments */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
                        <div className="text-left sm:text-right shrink-0">
                          <span className="text-[9px] font-mono text-slate-500 block uppercase font-bold">LIQUIDITY FLOAT</span>
                          <strong className="text-lg font-mono text-cyan-400 font-black">${(agent.balance || 0).toLocaleString()}</strong>
                        </div>

                        {/* Adjust float fields */}
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            placeholder="Amount"
                            value={inputVal}
                            onChange={(e) => {
                              const v = e.target.value;
                              setAgentAdjustAmounts(prev => ({ ...prev, [agent.id]: v }));
                            }}
                            className="w-24 bg-slate-950 border border-slate-850 rounded-xl px-2.5 py-2 font-mono text-xs text-white outline-none focus:border-cyan-500/50"
                          />
                          <button
                            onClick={() => handleModifyAgentBalance(agent.id, Number(inputVal), "add")}
                            className="px-2.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-mono text-[10px] font-black uppercase transition-colors flex items-center justify-center gap-0.5 cursor-pointer"
                          >
                            <Plus className="h-3 w-3" /> Add
                          </button>
                          <button
                            onClick={() => handleModifyAgentBalance(agent.id, Number(inputVal), "cut")}
                            className="px-2.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-mono text-[10px] font-black uppercase transition-colors flex items-center justify-center gap-0.5 cursor-pointer"
                          >
                            <Minus className="h-3 w-3" /> Cut
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                  );
                })}
              </div>

              {/* End of Sub-Admin Crypto Queue */}
            </div>
          )}

          {/* TAB: SUB-ADMINS SUPERVISOR HUB */}
          {adminTab === "subadmins" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="font-mono text-base font-black text-white uppercase tracking-wide flex items-center gap-2">
                    <Settings className="h-5 w-5 text-rose-500 animate-pulse" /> Sub-Admins Supervisory Control Suite
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-1">
                    Manage operational privileges, alter security keys, audit active sessions, or freeze credentials of your delegated sub-administrators.
                  </p>
                </div>
              </div>

              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Total Nodes</span>
                  <span className="text-xl text-rose-400 font-black">{subAdmins.length}</span>
                </div>
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Active Sessions</span>
                  <span className="text-xl text-emerald-400 font-black">
                    {subAdmins.filter(sa => sa.status === "active").length} Nodes
                  </span>
                </div>
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Root Delegation</span>
                  <span className="text-xl text-amber-500 font-black">Active</span>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* Registration / Editing form */}
                <div className="xl:col-span-1 space-y-6">
                  {editingSubAdmin ? (
                    <form onSubmit={handleUpdateSubAdmin} className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2.5xl space-y-4 font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Edit2 className="h-3.5 w-3.5" /> Edit Sub-Admin Credentials
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingSubAdmin(null)}
                          className="text-[10px] text-slate-500 hover:text-slate-300 uppercase underline"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-[9px] text-slate-400 uppercase font-bold block mb-1">Full Name</label>
                          <input
                            type="text"
                            value={editingSubAdmin.name || ""}
                            onChange={e => setEditingSubAdmin({ ...editingSubAdmin, name: e.target.value })}
                            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] text-slate-400 uppercase font-bold block mb-1">Username (Immutable)</label>
                          <input
                            type="text"
                            disabled
                            value={editingSubAdmin.username || ""}
                            className="w-full bg-slate-950/40 border border-slate-900 rounded-xl px-3 py-2 text-xs text-slate-500 cursor-not-allowed focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] text-slate-400 uppercase font-bold block mb-1">Email Address</label>
                          <input
                            type="email"
                            value={editingSubAdmin.email || ""}
                            onChange={e => setEditingSubAdmin({ ...editingSubAdmin, email: e.target.value })}
                            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] text-slate-400 uppercase font-bold block mb-1">Phone Number</label>
                          <input
                            type="text"
                            value={editingSubAdmin.phoneNumber || ""}
                            onChange={e => setEditingSubAdmin({ ...editingSubAdmin, phoneNumber: e.target.value })}
                            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] text-slate-400 uppercase font-bold block mb-1">Security Key (Password)</label>
                          <input
                            type="text"
                            value={editingSubAdmin.securityKey || ""}
                            onChange={e => setEditingSubAdmin({ ...editingSubAdmin, securityKey: e.target.value })}
                            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-500/50"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer shadow-lg shadow-amber-500/10"
                      >
                        Apply Override Mutations
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleRegisterSubAdminSubmit} className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2.5xl space-y-4 font-mono">
                      <span className="text-xs font-black text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Plus className="h-3.5 w-3.5 animate-pulse" /> Register New Sub-Admin Node
                      </span>

                      {newSubAdminFormError && (
                        <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-[10px]">
                          ⚠️ {newSubAdminFormError}
                        </div>
                      )}

                      {newSubAdminFormSuccess && (
                        <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-[10px]">
                          ✅ {newSubAdminFormSuccess}
                        </div>
                      )}

                      <div className="space-y-3">
                        <div>
                          <label className="text-[9px] text-slate-400 uppercase font-bold block mb-1">Full Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Deputy Chief Operations"
                            value={newSubAdminName}
                            onChange={e => setNewSubAdminName(e.target.value)}
                            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500/50"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] text-slate-400 uppercase font-bold block mb-1">Username (For Login)</label>
                          <input
                            type="text"
                            placeholder="e.g. subadmin2"
                            value={newSubAdminUsername}
                            onChange={e => setNewSubAdminUsername(e.target.value)}
                            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500/50"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] text-slate-400 uppercase font-bold block mb-1">Email Address</label>
                          <input
                            type="email"
                            placeholder="deputy@casino.com"
                            value={newSubAdminEmail}
                            onChange={e => setNewSubAdminEmail(e.target.value)}
                            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500/50"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] text-slate-400 uppercase font-bold block mb-1">Phone Number</label>
                          <input
                            type="text"
                            placeholder="01799221100"
                            value={newSubAdminPhone}
                            onChange={e => setNewSubAdminPhone(e.target.value)}
                            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500/50"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] text-slate-400 uppercase font-bold block mb-1">Security Key (Password)</label>
                          <input
                            type="text"
                            placeholder="Set secure security password"
                            value={newSubAdminKey}
                            onChange={e => setNewSubAdminKey(e.target.value)}
                            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-rose-300 placeholder-slate-600 focus:outline-none focus:border-rose-500/50"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer shadow-lg shadow-rose-500/10"
                      >
                        Deploy Sub-Admin Node
                      </button>
                    </form>
                  )}
                </div>

                {/* Sub-Admins list */}
                <div className="xl:col-span-2 space-y-4">
                  <div className="bg-slate-900/20 border border-slate-900 rounded-2.5xl p-4 space-y-3">
                    <span className="text-xs font-mono font-black uppercase tracking-wider text-slate-400 block">
                      Deployed Sub-Admin Nodes & Privileges Matrix
                    </span>

                    <div className="space-y-3.5">
                      {subAdmins.map((sa) => {
                        const isCore = sa.username === "subadmin";
                        const actions = sa.actionsAllowed || { manageAgents: true, approveCrypto: true, adjustBalances: true };

                        return (
                          <div
                            key={sa.username}
                            className={`p-4 rounded-2xl border transition-all ${
                              sa.status !== "active"
                                ? "bg-slate-950/40 border-slate-900/60 opacity-60"
                                : "bg-slate-900/60 border-slate-800/80 hover:border-rose-500/30"
                            }`}
                          >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-black text-white">{sa.name}</span>
                                  <span className="text-[10px] text-slate-500 uppercase">(@{sa.username})</span>
                                  
                                  {isCore && (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[8px] font-black uppercase tracking-wide">
                                      Core Node
                                    </span>
                                  )}

                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wide ${
                                    sa.status === "active"
                                      ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
                                      : "bg-rose-500/20 border border-rose-500/30 text-rose-400"
                                  }`}>
                                    {sa.status}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] text-slate-400">
                                  <div>📧 Email: <span className="text-slate-300">{sa.email}</span></div>
                                  <div>📞 Phone: <span className="text-slate-300">{sa.phoneNumber}</span></div>
                                  <div className="text-rose-400 font-bold">🔑 Key: <span className="text-rose-300 bg-rose-950/50 px-1 py-0.2 rounded border border-rose-500/10 font-mono text-[9px]">{sa.securityKey}</span></div>
                                  <div className="text-slate-500">📅 Created: <span className="text-slate-400">{sa.created_at || "System Default"}</span></div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                                <button
                                  type="button"
                                  onClick={() => { casinoAudio.playClick(); setEditingSubAdmin(sa); }}
                                  className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
                                  title="Edit Credentials"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleToggleSubAdminStatus(sa.username)}
                                  className={`px-2.5 py-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                    sa.status === "active"
                                      ? "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/25"
                                      : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
                                  }`}
                                >
                                  {sa.status === "active" ? "Freeze" : "Activate"}
                                </button>

                                <button
                                  type="button"
                                  disabled={isCore}
                                  onClick={() => handleDeleteSubAdmin(sa.username)}
                                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                    isCore
                                      ? "bg-slate-950 border-slate-900/50 text-slate-700 cursor-not-allowed"
                                      : "bg-slate-950 border-slate-800 text-slate-500 hover:text-rose-400 hover:border-rose-500/30"
                                  }`}
                                  title="Revoke Node"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Fine-grained supervision / permission controls */}
                            <div className="mt-3 pt-3 border-t border-slate-800/40 flex flex-wrap items-center gap-4 text-[10px] font-mono">
                              <span className="text-slate-500 uppercase font-bold tracking-wider">Supervised Rights:</span>
                              
                              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                                <input
                                  type="checkbox"
                                  checked={actions.manageAgents !== false}
                                  onChange={() => handleToggleSubAdminPermission(sa.username, "manageAgents")}
                                  className="rounded bg-slate-950 border-slate-800 text-rose-500 focus:ring-0 focus:ring-offset-0 h-3.5 w-3.5"
                                />
                                <span>Manage P2P Mobile Agents</span>
                              </label>

                              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                                <input
                                  type="checkbox"
                                  checked={actions.approveCrypto !== false}
                                  onChange={() => handleToggleSubAdminPermission(sa.username, "approveCrypto")}
                                  className="rounded bg-slate-950 border-slate-800 text-rose-500 focus:ring-0 focus:ring-offset-0 h-3.5 w-3.5"
                                />
                                <span>Approve Crypto Ledger</span>
                              </label>

                              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                                <input
                                  type="checkbox"
                                  checked={actions.adjustBalances !== false}
                                  onChange={() => handleToggleSubAdminPermission(sa.username, "adjustBalances")}
                                  className="rounded bg-slate-950 border-slate-800 text-rose-500 focus:ring-0 focus:ring-offset-0 h-3.5 w-3.5"
                                />
                                <span>Adjust Wallets</span>
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sub-Admin telemetry ledger filter */}
                  <div className="bg-slate-950 rounded-2xl border border-slate-900 p-4 font-mono text-[10px] space-y-2">
                    <span className="text-[9px] text-slate-500 uppercase font-black block tracking-wider">Telemetry: Sub-Admin Action Trail</span>
                    <div className="max-h-[160px] overflow-y-auto space-y-1.5 text-slate-400 leading-relaxed scrollbar-thin">
                      {harbingerLogs.filter(l => l.actorRole === "Sub-Admin" || l.actionType.startsWith("SUB_ADMIN")).length === 0 ? (
                        <p className="text-slate-600 italic">No sub-admin or administrative ledger transactions recorded yet. Telemetry listening...</p>
                      ) : (
                        harbingerLogs
                          .filter(l => l.actorRole === "Sub-Admin" || l.actionType.startsWith("SUB_ADMIN"))
                          .map((log) => (
                            <div key={log.id} className="flex items-start gap-1.5 border-b border-white/[0.01] pb-1">
                              <span className="text-slate-600">[{log.timestamp}]</span>
                              <span className="text-rose-400 font-bold">[{log.actionType}]</span>
                              <span>By {log.actorName}: <span className="text-slate-200">{log.details}</span></span>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 5: SYSTEM AUDIT TERMINAL */}
          {adminTab === "audit" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-mono text-base font-black text-white uppercase tracking-wide flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-indigo-400 animate-pulse" /> System Security & Audit Trail
                </h3>

                <button
                  onClick={() => { casinoAudio.playClick(); onClearAuditLogs(); }}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-rose-400 hover:text-rose-300 font-mono text-[10px] uppercase font-bold border border-slate-800 rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Wipe Log File
                </button>
              </div>

              {/* Scrolling digital display */}
              <div className="bg-black/90 rounded-2xl border border-slate-900 p-4 font-mono text-[11px] leading-relaxed max-h-[360px] overflow-y-auto space-y-2 text-slate-300 scrollbar-thin">
                {auditLogs.length === 0 ? (
                  <p className="text-slate-600 italic">No system audit events recorded in this session yet.</p>
                ) : (
                  auditLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-2 border-b border-white/[0.02] pb-1.5">
                      <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
                      <span className={`font-semibold shrink-0 ${
                        log.type === "success"
                          ? "text-emerald-400"
                          : log.type === "danger"
                          ? "text-rose-500"
                          : log.type === "warning"
                          ? "text-amber-500"
                          : "text-indigo-400"
                      }`}>
                        [{log.type.toUpperCase()}]
                      </span>
                      <span className="text-slate-200">{log.message}</span>
                    </div>
                  ))
                )}
                <div ref={auditBottomRef} />
              </div>

              <div className="p-3 bg-slate-900/30 rounded-xl border border-slate-900/60 font-mono text-[10px] text-slate-500 leading-relaxed">
                This audit log logs all root-level overrides, RTP modifications, player additions, blocked IP firewalls, and suspicious high-stakes payouts immediately for compliance purposes.
              </div>

              {/* REAL-TIME PLAYER ACTIVITY MONITOR */}
              <div className="pt-6 border-t border-slate-900 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <h4 className="font-mono text-sm font-black text-amber-400 uppercase tracking-wide flex items-center gap-2">
                    <Activity className="h-4 w-4 text-amber-400 animate-pulse" /> Live Player Activity Stream
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        casinoAudio.playClick();
                        clearPlayerActivities();
                        setPlayerActivitiesList([]);
                        onAddAuditLog("SECURITY: Cleared player activity logs.", "warning");
                      }}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-rose-950 border border-slate-800 text-slate-400 hover:text-rose-300 text-[10px] font-bold rounded-lg cursor-pointer transition-all"
                    >
                      Clear Activity Log
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-slate-900/50 border border-slate-850 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search activity, player email..."
                      value={activityGlobalSearch}
                      onChange={(e) => setActivityGlobalSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl focus:outline-none focus:border-amber-500/50"
                    />
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <label className="text-slate-400 text-[10px] font-bold uppercase">Type:</label>
                    <select
                      value={activityTypeFilter}
                      onChange={(e) => setActivityTypeFilter(e.target.value)}
                      className="bg-slate-950 border border-slate-800 text-slate-200 px-3 py-1 rounded-xl text-xs outline-none"
                    >
                      <option value="all">All Types</option>
                      <option value="gameplay">Gameplay Only</option>
                      <option value="financial">Financial Only</option>
                      <option value="auth">Auth / Security Only</option>
                    </select>
                  </div>
                </div>

                <div className="bg-black/90 rounded-2xl border border-slate-900 p-4 font-mono text-[11px] leading-relaxed max-h-[320px] overflow-y-auto space-y-2 text-slate-300 scrollbar-thin">
                  {playerActivitiesList
                    .filter((a) => {
                      if (activityTypeFilter !== "all" && a.type !== activityTypeFilter) return false;
                      if (activityGlobalSearch.trim()) {
                        const q = activityGlobalSearch.toLowerCase();
                        return (
                          a.playerName.toLowerCase().includes(q) ||
                          a.playerId.toLowerCase().includes(q) ||
                          a.action.toLowerCase().includes(q) ||
                          (a.gameName && a.gameName.toLowerCase().includes(q))
                        );
                      }
                      return true;
                    })
                    .length === 0 ? (
                    <p className="text-slate-600 italic text-center py-6">No player activities matched your filter parameters.</p>
                  ) : (
                    playerActivitiesList
                      .filter((a) => {
                        if (activityTypeFilter !== "all" && a.type !== activityTypeFilter) return false;
                        if (activityGlobalSearch.trim()) {
                          const q = activityGlobalSearch.toLowerCase();
                          return (
                            a.playerName.toLowerCase().includes(q) ||
                            a.playerId.toLowerCase().includes(q) ||
                            a.action.toLowerCase().includes(q) ||
                            (a.gameName && a.gameName.toLowerCase().includes(q))
                          );
                        }
                        return true;
                      })
                      .map((act) => (
                        <div key={act.id} className="p-2.5 bg-slate-950/80 border border-slate-900 rounded-xl flex items-center justify-between gap-3 text-xs">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500 text-[10px]">[{new Date(act.timestamp).toLocaleTimeString()}]</span>
                              <strong className="text-amber-300">{act.playerName}</strong>
                              <span className="text-[10px] text-slate-500">({act.playerId})</span>
                            </div>
                            <p className="text-slate-300 text-[11px]">{act.action}</p>
                          </div>

                          {act.amount !== undefined && (
                            <span className={`font-black text-xs px-2 py-0.5 rounded ${
                              act.outcome === "win"
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                : act.outcome === "lose"
                                ? "bg-rose-950 text-rose-400 border border-rose-800"
                                : "bg-amber-950 text-amber-400 border border-amber-800"
                            }`}>
                              {act.outcome === "win" ? "+" : act.outcome === "lose" ? "-" : ""}${act.amount.toLocaleString()}
                            </span>
                          )}
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: STRESS TESTING MODULE */}
          {adminTab === "stresstest" && (
            <StressTestModule onAddAuditLog={onAddAuditLog} />
          )}

          {adminTab === "megawin" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-900 pb-4">
                <div>
                  <h4 className="text-sm font-black text-white uppercase flex items-center gap-2">
                    <Trophy className="h-4.5 w-4.5 text-fuchsia-400" /> Mega Win Strategy Configuration
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Restrict big-win mechanics dynamically. System automatically ensures only one designated player can win a $10,000 Mega Win in a 3-day window.
                  </p>
                </div>
              </div>

              {/* Mega Win Info Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-5 space-y-4">
                  <div className="text-xs font-black uppercase text-fuchsia-400 border-b border-white/[0.04] pb-2 flex items-center gap-1.5">
                    <Server className="h-4 w-4" /> ACTIVE STRATEGY METRICS
                  </div>
                  
                  {megaWinState ? (
                    <div className="space-y-3 text-xs text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Selected Winner:</span>
                        <span className="font-bold text-white">{megaWinState.selectedWinnerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Winner Email:</span>
                        <span className="font-bold text-white text-right break-all">{megaWinState.selectedWinnerEmail}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Winner Phone:</span>
                        <span className="font-bold text-white">{megaWinState.selectedWinnerPhone || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Claim Amount:</span>
                        <span className="font-bold text-amber-400">${megaWinState.amount.toLocaleString()} USDT</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Claim Status:</span>
                        {megaWinState.isClaimed ? (
                          <span className="font-bold text-emerald-400">CLAIMED (CLOSED)</span>
                        ) : (
                          <span className="font-bold text-amber-500 animate-pulse">UNCLAIMED (OPEN)</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-xs">No active strategy found in cache.</p>
                  )}
                </div>

                <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-5 space-y-4">
                  <div className="text-xs font-black uppercase text-indigo-400 border-b border-white/[0.04] pb-2 flex items-center gap-1.5">
                    <Clock className="h-4 w-4" /> TIMING & DEPLOYMENT WINDOWS
                  </div>
                  
                  {megaWinState ? (
                    <div className="space-y-3 text-xs text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Window Start:</span>
                        <span className="font-bold text-white">{new Date(megaWinState.windowStart).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Window End:</span>
                        <span className="font-bold text-white">{new Date(megaWinState.windowEnd).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Duration Limit:</span>
                        <span className="font-bold text-white">3 Days (72 Hours)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Time to Drawing:</span>
                        <span className="font-bold text-fuchsia-400 animate-pulse">
                          {Math.max(0, Math.ceil((megaWinState.windowEnd - Date.now()) / (3600 * 1000)))} Hours Left
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-xs">No active strategy found in cache.</p>
                  )}
                </div>
              </div>

              {/* Actions & Overrides */}
              <div className="bg-slate-950/40 border border-slate-900 rounded-2xl p-5 space-y-4">
                <div className="text-xs font-black uppercase text-amber-500 flex items-center gap-2">
                  <Sliders className="h-4.5 w-4.5" /> ADMINISTRATIVE OVERRIDES
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  For testing and validation of the "Mega Win Strategy", you can manually trigger a random re-roll of the designated winner. This will select a random profile from the registered player database, reset the 3-day claim status to unclaimed, and establish a fresh 3-day countdown window.
                </p>

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      if (onReRollMegaWinner) {
                        onReRollMegaWinner();
                      }
                    }}
                    className="px-5 py-3 bg-fuchsia-600 hover:bg-fuchsia-500 font-mono text-xs font-black tracking-widest text-white rounded-xl cursor-pointer active:scale-95 transition-all shadow-[0_0_15px_rgba(217,70,239,0.3)] flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4 animate-spin-slow" /> TRIGGER RANDOM RE-ROLL NOW
                  </button>
                  
                  <button
                    onClick={() => {
                      casinoAudio.playClick();
                      const stored = localStorage.getItem("casino_mega_win_strategy_v1");
                      if (stored) {
                        try {
                          const parsed = JSON.parse(stored);
                          parsed.isClaimed = false;
                          localStorage.setItem("casino_mega_win_strategy_v1", JSON.stringify(parsed));
                          window.location.reload();
                        } catch (e) {
                          console.error(e);
                        }
                      }
                    }}
                    className="px-5 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-mono text-xs font-black tracking-widest rounded-xl cursor-pointer active:scale-95 transition-all"
                  >
                    RESET CLAIM STATUS (UNCLAIM)
                  </button>
                </div>
              </div>

              {/* Security Audit Rules Statement */}
              <div className="bg-slate-950/20 border border-slate-900 rounded-2xl p-5 border-l-4 border-l-fuchsia-500 text-xs text-slate-400 leading-relaxed space-y-2">
                <h5 className="font-bold text-white uppercase flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-fuchsia-500" /> ACTIVE SECURITY RULES STATEMENT
                </h5>
                <p>
                  1. **Frequency Control**: Only 1 Mega Win of exactly $10,000 can be awarded within any 3-day cycle.
                </p>
                <p>
                  2. **Authorized Recipient Rule**: Only the randomly pre-selected player is allowed to hit or claim the $10,000 vault. All other players are strictly locked out.
                </p>
                <p>
                  3. **State Protection**: Any standard win payouts above $5,000 in standard games (slots, blackjack, etc.) are automatically capped below the threshold if initiated by a non-designated winner or if a mega win has already occurred in the 3-day window.
                </p>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* 🛡️ HARBINGER ADMINISTRATIVE AUDIT MONITOR */}
      {currentUser?.role === "admin" && (
        <div className="border-t border-slate-900 p-6 bg-slate-950/50 space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h4 className="font-mono text-xs font-black text-rose-500 uppercase tracking-widest flex items-center gap-2">
                <span className="animate-pulse">🛡️</span> HARBINGER ADMINISTRATIVE AUDIT MONITOR
              </h4>
              <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5 ${
                isHarbingerUnlocked
                  ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/40"
                  : "bg-rose-950/80 text-rose-400 border border-rose-500/40 animate-pulse"
              }`}>
                {isHarbingerUnlocked ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                {isHarbingerUnlocked ? "SYSTEM UNLOCKED" : "SYSTEM LOCKED (PASSWORD REQUIRED)"}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {!isHarbingerUnlocked ? (
                <button
                  type="button"
                  onClick={() => {
                    casinoAudio.playClick();
                    setPendingHarbingerAction("UNLOCK_ONLY");
                    setHarbingerPasswordInput("");
                    setHarbingerAuthError("");
                    setIsHarbingerModalOpen(true);
                  }}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-mono text-[10px] font-bold rounded-lg transition-all cursor-pointer shadow-md flex items-center gap-1"
                >
                  <Lock className="h-3 w-3" /> UNLOCK FINANCIAL CONTROLS
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    casinoAudio.playClick();
                    setIsHarbingerUnlocked(false);
                    addHarbingerLog("HARBINGER_LOCK", "Harbinger Administrative System locked manually.");
                    onAddAuditLog("HARBINGER: System locked manually.", "info");
                  }}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
                >
                  <Lock className="h-3 w-3" /> LOCK SYSTEM
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  casinoAudio.playClick();
                  localStorage.removeItem("harbinger_audit_trail_v1");
                  setHarbingerLogs([]);
                }}
                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-[10px] font-mono text-slate-400 hover:text-slate-200 border border-slate-800 rounded-lg cursor-pointer transition-all"
              >
                Clear Tracker Logs
              </button>
            </div>
          </div>
          <p className="text-[10px] font-mono text-slate-500 leading-relaxed">
            This specialized telemetry matrix monitors and logs all administrative adjustments, sub-admin credentials mutations, emergency reserve operations, and agent ledger transactions. Logs are persisted immutably in local session stores.
          </p>
          <div className="bg-black/80 border border-slate-900 rounded-xl p-4 font-mono text-[10px] text-emerald-400 space-y-2 max-h-[220px] overflow-y-auto scrollbar-thin">
            {harbingerLogs.length === 0 ? (
              <span className="text-slate-600 italic">No sub-admin or administrative ledger transactions recorded yet. Telemetry listening...</span>
            ) : (
              harbingerLogs.map((log: any) => (
                <div key={log.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/[0.02] pb-1.5 gap-2">
                  <div className="flex items-start gap-2">
                    <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                    <span className="text-rose-500 font-bold shrink-0">[{log.actionType.toUpperCase()}]</span>
                    <span className="text-slate-300">{log.details}</span>
                  </div>
                  <div className="text-[9px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 shrink-0">
                    Actor: <span className="text-white font-bold">{log.actorName}</span> ({log.actorRole})
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 🔐 MODAL: HARBINGER SYSTEM PASSWORD AUTHENTICATION */}
      {isHarbingerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl p-6 max-w-md w-full font-mono space-y-5 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-rose-500 animate-pulse" />
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">HARBINGER AUTH GATE</h3>
                  <p className="text-[10px] text-slate-400">Master Financial Emergency Controls</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsHarbingerModalOpen(false);
                  setPendingHarbingerAction(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-rose-950/30 border border-rose-500/20 p-3 rounded-xl">
              ⚠️ <strong className="text-rose-400">Authorization Required:</strong> Entering Harbinger Master Password is required to execute emergency reserve actions or modify vault rules.
            </p>

            <form onSubmit={handleHarbingerAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">
                  Harbinger Admin Master Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    autoFocus
                    placeholder="Enter HARBINGER123"
                    value={harbingerPasswordInput}
                    onChange={(e) => {
                      setHarbingerPasswordInput(e.target.value);
                      setHarbingerAuthError("");
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-rose-500 font-mono tracking-widest"
                  />
                  <Lock className="absolute right-3.5 top-3 h-4 w-4 text-slate-500" />
                </div>
                <p className="text-[9px] text-slate-500 mt-1">Default Master Key: <code className="text-rose-400 font-bold">HARBINGER123</code></p>
              </div>

              {harbingerAuthError && (
                <div className="p-2.5 bg-red-950/60 border border-red-500/40 rounded-xl text-xs text-red-300 font-bold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                  <span>{harbingerAuthError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsHarbingerModalOpen(false);
                    setPendingHarbingerAction(null);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-black uppercase rounded-xl shadow-lg cursor-pointer flex items-center gap-1.5"
                >
                  <Unlock className="h-3.5 w-3.5" />
                  Authenticate & Authorize
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PLAYER ACTIVITY TELEMETRY INSPECTOR */}
      {activityModalPlayer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 max-w-3xl w-full max-h-[85vh] flex flex-col font-mono space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-black text-white uppercase flex items-center gap-2">
                  <Activity className="h-4 w-4 text-amber-400 animate-pulse" /> Player Activity Telemetry Inspector
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Audit trail for player: <strong className="text-amber-300">{activityModalPlayer.name} ({activityModalPlayer.email})</strong>
                </p>
              </div>
              <button
                onClick={() => setActivityModalPlayer(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Summary Bar */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl">
                <span className="text-[10px] text-slate-500 uppercase block font-bold">Total Activity Entries</span>
                <span className="text-base font-black text-white">
                  {getPlayerActivities(activityModalPlayer.email).length}
                </span>
              </div>
              <div className="p-3 bg-emerald-950/20 border border-emerald-900/40 rounded-xl">
                <span className="text-[10px] text-emerald-400 uppercase block font-bold">Gameplay Wins</span>
                <span className="text-base font-black text-emerald-300">
                  {getPlayerActivities(activityModalPlayer.email).filter((a) => a.outcome === "win").length}
                </span>
              </div>
              <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-xl">
                <span className="text-[10px] text-rose-400 uppercase block font-bold">Gameplay Losses</span>
                <span className="text-base font-black text-rose-300">
                  {getPlayerActivities(activityModalPlayer.email).filter((a) => a.outcome === "lose").length}
                </span>
              </div>
            </div>

            {/* Activity Stream Feed */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {getPlayerActivities(activityModalPlayer.email).length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs italic">
                  No activity logs recorded for this player yet.
                </div>
              ) : (
                getPlayerActivities(activityModalPlayer.email).map((act) => (
                  <div
                    key={act.id}
                    className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                            act.type === "gameplay"
                              ? "bg-purple-950 border-purple-800 text-purple-300"
                              : act.type === "financial"
                              ? "bg-emerald-950 border-emerald-800 text-emerald-300"
                              : "bg-cyan-950 border-cyan-800 text-cyan-300"
                          }`}
                        >
                          {act.type}
                        </span>
                        {act.gameName && (
                          <span className="text-amber-400 font-bold text-[11px]">{act.gameName}</span>
                        )}
                        <span className="text-slate-500 text-[10px]">
                          {new Date(act.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-200 font-medium">{act.action}</p>
                      {act.ipAddress && (
                        <span className="text-[10px] text-slate-500 block">IP: {act.ipAddress}</span>
                      )}
                    </div>

                    {act.amount !== undefined && (
                      <div className="text-right shrink-0">
                        <span
                          className={`font-black text-sm block ${
                            act.outcome === "win"
                              ? "text-emerald-400"
                              : act.outcome === "lose"
                              ? "text-rose-400"
                              : "text-amber-400"
                          }`}
                        >
                          {act.outcome === "win" ? "+" : act.outcome === "lose" ? "-" : ""}${act.amount.toLocaleString()}
                        </span>
                        {act.multiplier && (
                          <span className="text-[10px] text-purple-400 font-bold block">{act.multiplier}x Peak</span>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
