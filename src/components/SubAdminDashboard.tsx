import React, { useState, useEffect, useMemo } from "react";
import { 
  Users, ShieldCheck, Coins, Search, RefreshCw, Check, X, 
  ArrowUpRight, ArrowDownLeft, AlertTriangle, MessageSquare, LogOut, 
  Sparkles, Shield, Eye, Filter, CheckCircle2, XCircle, FileText, Download,
  ExternalLink, Copy, Edit2, Plus, Minus, Lock, Unlock, Image as ImageIcon,
  Scale, Zap, UserPlus, Settings, Activity, DollarSign
} from "lucide-react";
import { casinoAudio } from "../lib/audioService";
import { BankingRequest } from "../types";
import { getBankingRequests, saveBankingRequests } from "../constants/bankingRequests";
import { getRegisteredPlayers } from "../constants/defaultPlayers";
import { saveBankingRequestToDatabase, savePlayerToDatabase } from "../lib/db";
import TransactionChatBox from "./TransactionChatBox";
import { addSystemTxChatMessage } from "../lib/transactionChat";
import { processDepositApprovalForPlayer } from "../lib/depositBonusHelper";
import { 
  getExtendedAgents, 
  saveExtendedAgents, 
  getExtendedSubAdmins, 
  saveExtendedSubAdmins, 
  injectFloatFromSubAdminToAgent, 
  recallFloatFromAgentToSubAdmin,
  resolveP2PDispute,
  addP2PAuditLog,
  ExtendedP2PAgent,
  ExtendedSubAdmin
} from "../lib/p2pSystem";

interface SubAdminDashboardProps {
  currentUser: {
    role: string;
    name: string;
    email?: string;
  };
  onLogout?: () => void;
  onAddAuditLog?: (msg: string, type: "info" | "warning" | "success" | "danger") => void;
  embedded?: boolean;
}

export default function SubAdminDashboard({ 
  currentUser, 
  onLogout, 
  onAddAuditLog,
  embedded = false 
}: SubAdminDashboardProps) {
  const [bankingRequests, setBankingRequests] = useState<BankingRequest[]>([]);
  const [players, setPlayers] = useState<any[]>([]);

  // Main View Navigation Switcher State
  const [activeMainTab, setActiveMainTab] = useState<"crypto_queue" | "p2p_terminal" | "dispute_center">("crypto_queue");

  // P2P Extended System States
  const [extendedAgents, setExtendedAgents] = useState<ExtendedP2PAgent[]>(() => getExtendedAgents());
  const [extendedSubAdmins, setExtendedSubAdmins] = useState<ExtendedSubAdmin[]>(() => getExtendedSubAdmins());

  // Toast feedback
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Filters & Search for Legacy Queue
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [typeFilter, setTypeFilter] = useState<"all" | "deposit" | "withdraw">("all");
  const [assetFilter, setAssetFilter] = useState<"all" | "crypto" | "mobile">("all");

  // Rejection modal / inline
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Amount Editing Modal
  const [editingRequest, setEditingRequest] = useState<BankingRequest | null>(null);
  const [editedAmount, setEditedAmount] = useState<string>("");

  // Proof Image Preview Modal
  const [previewingProofUrl, setPreviewingProofUrl] = useState<string | null>(null);

  // Balance Adjustment Modal State
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [selectedPlayerEmail, setSelectedPlayerEmail] = useState("");
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceAction, setBalanceAction] = useState<"add" | "subtract">("add");
  const [balanceReason, setBalanceReason] = useState("");

  // Live Chat Modal State
  const [chatRequest, setChatRequest] = useState<BankingRequest | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Inject Test Request Modal
  const [isInjectModalOpen, setIsInjectModalOpen] = useState(false);
  const [injectPlayerEmail, setInjectPlayerEmail] = useState("");
  const [injectPlayerName, setInjectPlayerName] = useState("");
  const [injectAmount, setInjectAmount] = useState("100");
  const [injectType, setInjectType] = useState<"deposit" | "withdraw">("deposit");
  const [injectAsset, setInjectAsset] = useState("USDT (TRC-20)");
  const [injectTxHash, setInjectTxHash] = useState("");

  // --- P2P AGENT NETWORK TERMINAL STATES ---
  const [isDeployAgentOpen, setIsDeployAgentOpen] = useState(false);
  const [deployName, setDeployName] = useState("");
  const [deployPhone, setDeployPhone] = useState("");
  const [deployPassword, setDeployPassword] = useState("Agent123!");
  const [deployDepositComm, setDeployDepositComm] = useState("1.5");
  const [deployWithdrawComm, setDeployWithdrawComm] = useState("2.0");
  const [deployMinLimit, setDeployMinLimit] = useState("10");
  const [deployMaxLimit, setDeployMaxLimit] = useState("10000");
  const [deployInitialFloat, setDeployInitialFloat] = useState("1000");
  const [deploySelectedGateways, setDeploySelectedGateways] = useState<string[]>([
    "USDT (TRC-20)", "USDT (BEP-20)", "Binance Pay", "BTC", "ETH", "SOL"
  ]);
  const [deployGatewayDetails, setDeployGatewayDetails] = useState<Record<string, string>>({
    "USDT (TRC-20)": "T9xMasterCasinoWalletUSDT2026Crypto",
    "USDT (BEP-20)": "0x71C7B5a713A29f27d5320d75a1348123A8429C91",
    "Binance Pay": "284910385",
    "BTC": "bc1qnexaspincryptocasinohash777BTC",
    "ETH": "0x777NexaSpinCryptoCasinoAddress999ETH",
    "SOL": "SOL777NexaSpinCryptoCasinoAddressXyZ123SOL"
  });

  // Modal State: Top Up / Recall Float
  const [selectedAgentForFloatModal, setSelectedAgentForFloatModal] = useState<ExtendedP2PAgent | null>(null);
  const [floatActionType, setFloatActionType] = useState<"topup" | "recall">("topup");
  const [floatAmountInput, setFloatAmountInput] = useState("1000");

  // Modal State: Edit Agent Config
  const [editingAgent, setEditingAgent] = useState<ExtendedP2PAgent | null>(null);
  const [editMinLimit, setEditMinLimit] = useState("");
  const [editMaxLimit, setEditMaxLimit] = useState("");

  // --- DISPUTE ARBITRATION DESK STATES ---
  const [disputeFilter, setDisputeFilter] = useState<"disputed" | "all_p2p">("disputed");
  const [selectedDisputeReq, setSelectedDisputeReq] = useState<BankingRequest | null>(null);

  // Sub-Admin Privileges
  const subAdminPrivileges = useMemo(() => {
    try {
      const stored = localStorage.getItem("casino_sub_admins_v1");
      if (stored) {
        const subAdminsList = JSON.parse(stored);
        const currentSub = subAdminsList.find(
          (sa: any) => sa.username?.toLowerCase() === currentUser.name?.toLowerCase() || sa.name?.toLowerCase() === currentUser.name?.toLowerCase()
        );
        if (currentSub && currentSub.actionsAllowed) {
          return {
            approveCrypto: currentSub.actionsAllowed.approveCrypto !== false,
            adjustBalances: currentSub.actionsAllowed.adjustBalances !== false,
            editAmount: true,
            fullControl: true
          };
        }
      }
    } catch (e) {}
    
    return {
      approveCrypto: true,
      adjustBalances: true,
      editAmount: true,
      fullControl: true
    };
  }, [currentUser.name]);

  // Current SubAdmin object
  const currentSubAdmin = useMemo(() => {
    const list = extendedSubAdmins;
    const found = list.find(
      s => s.username?.toLowerCase() === currentUser.name?.toLowerCase() || s.name?.toLowerCase() === currentUser.name?.toLowerCase()
    );
    if (found) return found;
    return {
      id: "sa-1",
      name: currentUser.name,
      username: currentUser.name,
      floatBalance: 500000,
      allocatedFloat: 1000000,
      maxActiveAgents: 10
    };
  }, [extendedSubAdmins, currentUser.name]);

  // Total Circulating Agent Float
  const circulatingAgentFloat = useMemo(() => {
    return extendedAgents.reduce((sum, a) => sum + (a.balance || 0), 0);
  }, [extendedAgents]);

  // Disputed requests list
  const disputedRequests = useMemo(() => {
    return bankingRequests.filter(r => 
      r.status === "disputed" || 
      (r.notes && r.notes.toLowerCase().includes("disputed")) ||
      (r.notes && r.notes.toLowerCase().includes("dispute"))
    );
  }, [bankingRequests]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Copy helper
  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    casinoAudio.playChipClink();
    showToast(`Copied ${label} to clipboard!`);
  };

  // Load live banking data
  const loadData = () => {
    try {
      const reqs = getBankingRequests();
      setBankingRequests(reqs);
      setPlayers(getRegisteredPlayers());
    } catch (e) {
      console.error("Error loading subadmin data:", e);
    }
  };

  // Load live P2P agent data
  const loadP2PData = () => {
    try {
      setExtendedAgents(getExtendedAgents());
      setExtendedSubAdmins(getExtendedSubAdmins());
    } catch (e) {
      console.error("Error loading P2P data:", e);
    }
  };

  useEffect(() => {
    loadData();
    loadP2PData();
    window.addEventListener("storage", loadData);
    window.addEventListener("banking_requests_updated", loadData);
    window.addEventListener("p2p_state_updated", loadP2PData);
    const interval = setInterval(() => {
      loadData();
      loadP2PData();
    }, 2500);
    return () => {
      window.removeEventListener("storage", loadData);
      window.removeEventListener("banking_requests_updated", loadData);
      window.removeEventListener("p2p_state_updated", loadP2PData);
      clearInterval(interval);
    };
  }, []);

  // Filtered Queue for Legacy Tab
  const filteredRequests = useMemo(() => {
    return bankingRequests.filter(req => {
      const matchesSearch = 
        req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.playerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (req.playerEmail && req.playerEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (req.cryptoTxHash && req.cryptoTxHash.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (req.transactionId && req.transactionId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (req.cryptoWalletAddress && req.cryptoWalletAddress.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (req.mobileBankingNumber && req.mobileBankingNumber.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === "all" || req.status === statusFilter;
      const matchesType = typeFilter === "all" || req.type === typeFilter;
      
      const isCryptoReq = req.isCrypto || req.cryptoAsset || req.paymentCategory;
      const matchesAsset = 
        assetFilter === "all" || 
        (assetFilter === "crypto" && isCryptoReq) || 
        (assetFilter === "mobile" && !isCryptoReq);

      return matchesSearch && matchesStatus && matchesType && matchesAsset;
    });
  }, [bankingRequests, searchQuery, statusFilter, typeFilter, assetFilter]);

  // Stats
  const pendingCount = useMemo(() => bankingRequests.filter(r => r.status === "pending").length, [bankingRequests]);
  const pendingDepositCount = useMemo(() => bankingRequests.filter(r => r.status === "pending" && r.type === "deposit").length, [bankingRequests]);
  const pendingWithdrawCount = useMemo(() => bankingRequests.filter(r => r.status === "pending" && (r.type === "withdraw" || (r.type as string) === "withdrawal")).length, [bankingRequests]);
  
  const approvedCount = useMemo(() => bankingRequests.filter(r => r.status === "approved").length, [bankingRequests]);
  const totalApprovedVolume = useMemo(() => {
    return bankingRequests
      .filter(r => r.status === "approved")
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [bankingRequests]);

  // Helper for Explorer URL
  const getExplorerUrl = (txHash?: string, asset?: string) => {
    if (!txHash) return "#";
    const cleanHash = txHash.trim();
    if (asset?.includes("TRC") || cleanHash.startsWith("T")) {
      return `https://tronscan.org/#/transaction/${cleanHash}`;
    }
    if (cleanHash.startsWith("0x")) {
      return `https://bscscan.com/tx/${cleanHash}`;
    }
    return `https://tronscan.org/#/transaction/${cleanHash}`;
  };

  // Approve Request Handler
  const handleApproveRequest = (req: BankingRequest, overrideAmount?: number) => {
    casinoAudio.playWin();

    const finalAmount = overrideAmount !== undefined ? overrideAmount : req.amount;

    const updatedReqs = bankingRequests.map(r => {
      if (r.id === req.id) {
        return {
          ...r,
          amount: finalAmount,
          status: "approved" as const,
          processedBy: currentUser.name,
          processedAt: new Date().toLocaleTimeString(),
        };
      }
      return r;
    });

    setBankingRequests(updatedReqs);
    saveBankingRequests(updatedReqs);
    saveBankingRequestToDatabase({
      ...req,
      amount: finalAmount,
      status: "approved",
      processedBy: currentUser.name
    } as any);

    const playerEmail = req.playerEmail || "";
    let depositRes = null;

    if (req.type === "deposit") {
      depositRes = processDepositApprovalForPlayer(playerEmail, finalAmount, req.id);
    }

    const bMsg = depositRes ? ` 🎁 +$${depositRes.bonusAmount.toLocaleString()} Match Bonus (${depositRes.bonusPercent}%) added to Locked Bonus Balance with 30x Wagering Target ($${depositRes.addedWagerRequired.toLocaleString()}).` : "";
    addSystemTxChatMessage(
      req.id,
      `✅ Request APPROVED by Sub-Admin Authority (${currentUser.name}). ${req.type === "deposit" ? `Credited $${finalAmount.toLocaleString()} Real Cash to player main balance.${bMsg}` : `Withdrawal of $${finalAmount.toLocaleString()} processed.`}`
    );

    if (onAddAuditLog) {
      onAddAuditLog(
        `SUB-ADMIN APPROVAL: ${currentUser.name} APPROVED ${req.type.toUpperCase()} request [${req.id}] of $${finalAmount.toLocaleString()} for ${req.playerName} (${req.playerEmail})`,
        "success"
      );
    }

    showToast(`✅ Approved ${req.type.toUpperCase()} request [${req.id}]!`);
    setEditingRequest(null);
    window.dispatchEvent(new Event("storage"));
  };

  // Reject Request Handler
  const handleRejectRequest = (req: BankingRequest) => {
    const reason = rejectReason.trim() || "Invalid transaction hash or unverified wallet transfer.";

    casinoAudio.playLose();

    const updatedReqs = bankingRequests.map(r => {
      if (r.id === req.id) {
        return {
          ...r,
          status: "rejected" as const,
          rejectionReason: reason,
          processedBy: currentUser.name,
          processedAt: new Date().toLocaleTimeString(),
        };
      }
      return r;
    });

    setBankingRequests(updatedReqs);
    saveBankingRequests(updatedReqs);
    saveBankingRequestToDatabase({
      ...req,
      status: "rejected",
      notes: reason,
      processedBy: currentUser.name
    } as any);

    if (req.type === "withdraw" || (req.type as string) === "withdrawal") {
      const playerEmail = req.playerEmail || "";
      const allPlayers = getRegisteredPlayers();
      const playerIndex = allPlayers.findIndex(p => p.email.toLowerCase() === playerEmail.toLowerCase());

      if (playerIndex >= 0) {
        const player = allPlayers[playerIndex];
        player.chips = (player.chips || 0) + req.amount;
        savePlayerToDatabase(player);
      }
    }

    addSystemTxChatMessage(
      req.id,
      `❌ Request REJECTED by Sub-Admin (${currentUser.name}). Reason: ${reason}`
    );

    if (onAddAuditLog) {
      onAddAuditLog(
        `SUB-ADMIN REJECTION: ${currentUser.name} REJECTED ${req.type.toUpperCase()} request [${req.id}] of $${req.amount.toLocaleString()} for ${req.playerName}. Reason: ${reason}`,
        "danger"
      );
    }

    showToast(`❌ Rejected request [${req.id}]`);
    setRejectingRequestId(null);
    setRejectReason("");
    window.dispatchEvent(new Event("storage"));
  };

  // Save Player Balance Adjustment
  const handleSavePlayerBalance = () => {
    if (!selectedPlayerEmail || !balanceAmount) return;

    const amountNum = parseFloat(balanceAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    const allPlayers = getRegisteredPlayers();
    const playerIndex = allPlayers.findIndex(p => p.email.toLowerCase() === selectedPlayerEmail.toLowerCase());

    if (playerIndex < 0) {
      alert("Player not found in registered accounts database.");
      return;
    }

    const player = allPlayers[playerIndex];
    const currentChips = player.chips !== undefined ? player.chips : 1000;
    const newChips = balanceAction === "add" ? currentChips + amountNum : Math.max(0, currentChips - amountNum);

    player.chips = newChips;
    player.peakChips = Math.max(player.peakChips || 0, newChips);
    savePlayerToDatabase(player);

    casinoAudio.playWin();

    if (onAddAuditLog) {
      onAddAuditLog(
        `SUB-ADMIN BALANCE CONTROL: ${currentUser.name} ${balanceAction === "add" ? "CREDITED" : "DEBITED"} $${amountNum.toLocaleString()} Chips for ${player.name} (${player.email}). Reason: ${balanceReason || "Manual Authority Override"}. New Balance: $${newChips.toLocaleString()}`,
        "warning"
      );
    }

    showToast(`Updated balance for ${player.name} -> $${newChips.toLocaleString()}`);
    setIsBalanceModalOpen(false);
    setSelectedPlayerEmail("");
    setBalanceAmount("");
    setBalanceReason("");
    loadData();
  };

  // Inject Test Request Handler
  const handleCreateTestRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!injectPlayerEmail.trim()) {
      alert("Player email is required.");
      return;
    }

    const amt = Math.max(1, parseFloat(injectAmount) || 100);
    const newReq: BankingRequest = {
      id: `CRYPTO-${Date.now().toString().slice(-6)}`,
      playerName: injectPlayerName.trim() || injectPlayerEmail.split("@")[0] || "VIP Player",
      playerEmail: injectPlayerEmail.trim().toLowerCase(),
      amount: amt,
      type: injectType,
      status: "pending",
      date: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isCrypto: true,
      paymentCategory: injectAsset.includes("Binance") ? "binance" : "web3",
      cryptoAsset: injectAsset,
      cryptoWalletAddress: "T9xMasterCasinoWalletUSDT2026Crypto",
      cryptoTxHash: injectTxHash.trim() || `0x${Math.random().toString(16).substring(2, 14)}${Math.random().toString(16).substring(2, 14)}`,
      transactionId: injectTxHash.trim() || `TX-${Date.now()}`
    };

    const updated = [newReq, ...bankingRequests];
    setBankingRequests(updated);
    saveBankingRequests(updated);
    saveBankingRequestToDatabase(newReq);

    casinoAudio.playChipClink();
    if (onAddAuditLog) {
      onAddAuditLog(`SUB-ADMIN: Created manual ${injectType.toUpperCase()} test request [${newReq.id}] for ${newReq.playerName}`, "info");
    }

    showToast(`Created manual ${injectType} request #${newReq.id}!`);
    setIsInjectModalOpen(false);
    setInjectPlayerEmail("");
    setInjectPlayerName("");
    setInjectTxHash("");
  };

  // --- HANDLERS FOR P2P AGENT NETWORK TERMINAL ---
  const handleDeployAgentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deployName.trim() || !deployPhone.trim()) {
      alert("Agent Name and Phone/Email are required.");
      return;
    }

    const initFloatAmt = parseFloat(deployInitialFloat) || 0;
    const subFloat = currentSubAdmin.floatBalance || 0;
    if (initFloatAmt > subFloat) {
      alert(`Insufficient Sub-Admin Float ($${subFloat.toLocaleString()}) for initial float allocation of $${initFloatAmt.toLocaleString()}.`);
      return;
    }

    const newAgent: ExtendedP2PAgent = {
      id: `p2p-ag-${Date.now().toString().slice(-6)}`,
      name: deployName.trim(),
      phone: deployPhone.trim(),
      phoneNumber: deployPhone.trim(),
      service: "P2P Agent",
      rating: "5.0",
      speed: "1-3 mins",
      avatar: "👨‍💼",
      isVerified: true,
      isHidden: false,
      showOnDeposit: true,
      showOnWithdrawal: true,
      email: deployPhone.includes("@") ? deployPhone.trim() : `${deployPhone.trim()}@p2p.com`,
      password: deployPassword || "Agent123!",
      balance: 0,
      status: "active",
      depositRequestsProcessed: 0,
      withdrawRequestsProcessed: 0,
      totalVolumeApproved: 0,
      shiftStatus: "online",
      isFrozen: false,
      subAdminOwner: currentUser.name,
      supportedMethods: deploySelectedGateways.length > 0 ? deploySelectedGateways : ["USDT (TRC-20)", "Binance Pay"],
      walletAddresses: deployGatewayDetails,
      minLimit: parseFloat(deployMinLimit) || 10,
      maxLimit: parseFloat(deployMaxLimit) || 10000
    };

    const updatedAgents = [...extendedAgents, newAgent];
    saveExtendedAgents(updatedAgents);

    if (initFloatAmt > 0) {
      injectFloatFromSubAdminToAgent(currentSubAdmin.username || currentUser.name, newAgent.id, initFloatAmt);
    }

    casinoAudio.playWin();
    if (onAddAuditLog) {
      onAddAuditLog(`SUB-ADMIN DEPLOYMENT: Deployed new agent '${newAgent.name}' (${newAgent.phone}) with initial float $${initFloatAmt.toLocaleString()}`, "success");
    }

    showToast(`🚀 Successfully deployed Agent ${newAgent.name}!`);
    setIsDeployAgentOpen(false);
    setDeployName("");
    setDeployPhone("");
    setDeployInitialFloat("1000");
    loadP2PData();
    loadData();
  };

  const handleTopUpOrRecallFloatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgentForFloatModal) return;

    const amt = parseFloat(floatAmountInput);
    if (isNaN(amt) || amt <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    if (floatActionType === "topup") {
      const res = injectFloatFromSubAdminToAgent(currentSubAdmin.username || currentUser.name, selectedAgentForFloatModal.id, amt);
      if (!res.success) {
        alert(res.error || "Failed to top up float.");
        return;
      }
      casinoAudio.playWin();
      showToast(`+ $${amt.toLocaleString()} Float allocated to ${selectedAgentForFloatModal.name}!`);
    } else {
      const res = recallFloatFromAgentToSubAdmin(currentSubAdmin.username || currentUser.name, selectedAgentForFloatModal.id, amt);
      if (!res.success) {
        alert(res.error || "Failed to recall float.");
        return;
      }
      casinoAudio.playChipClink();
      showToast(`Recalled $${amt.toLocaleString()} Float from ${selectedAgentForFloatModal.name}!`);
    }

    setSelectedAgentForFloatModal(null);
    setFloatAmountInput("1000");
    loadP2PData();
    loadData();
  };

  const handleToggleFreezeAgent = (agent: ExtendedP2PAgent) => {
    const updated = extendedAgents.map(a => {
      if (a.id === agent.id) {
        const nextFrozen = !a.isFrozen;
        return {
          ...a,
          isFrozen: nextFrozen,
          status: nextFrozen ? ("suspended" as const) : ("active" as const)
        };
      }
      return a;
    });

    saveExtendedAgents(updated);
    casinoAudio.playChipClink();
    const actionLabel = agent.isFrozen ? "UNFROZEN" : "FROZEN";
    showToast(`${actionLabel} Agent ${agent.name}'s Float Vault!`);
    if (onAddAuditLog) {
      onAddAuditLog(`SUB-ADMIN SECURITY: Agent '${agent.name}' vault was ${actionLabel}`, agent.isFrozen ? "info" : "danger");
    }
    loadP2PData();
  };

  const handleSaveEditAgentConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent) return;

    const updated = extendedAgents.map(a => {
      if (a.id === editingAgent.id) {
        return {
          ...a,
          minLimit: parseFloat(editMinLimit) || a.minLimit || 10,
          maxLimit: parseFloat(editMaxLimit) || a.maxLimit || 10000,
        };
      }
      return a;
    });

    saveExtendedAgents(updated);
    casinoAudio.playWin();
    showToast(`Updated config for Agent ${editingAgent.name}!`);
    setEditingAgent(null);
    loadP2PData();
  };

  // Dispute resolution handler
  const handleResolveDisputeAction = (requestId: string, outcome: "release_to_player" | "refund_to_agent") => {
    const confirmMsg = outcome === "release_to_player"
      ? "FORCE RELEASE TO PLAYER: Deduct Agent float and credit Player Real Cash Balance?"
      : "CANCEL & REFUND AGENT: Cancel player request and return locked funds?";

    if (!window.confirm(confirmMsg)) return;

    const res = resolveP2PDispute(requestId, outcome, "Sub-Admin", currentUser.name);
    if (!res.success) {
      alert(res.error || "Dispute resolution failed.");
      return;
    }

    if (outcome === "release_to_player") {
      casinoAudio.playWin();
      showToast(`⚖️ DISPUTE SETTLED: Released funds to Player!`);
    } else {
      casinoAudio.playLose();
      showToast(`⚖️ DISPUTE SETTLED: Order Cancelled & Agent Refunded!`);
    }

    loadData();
    loadP2PData();
    const reqs = getBankingRequests();
    const updatedReq = reqs.find(r => r.id === requestId);
    if (updatedReq) setSelectedDisputeReq(updatedReq);
  };

  return (
    <div className={`font-mono text-slate-100 space-y-6 ${embedded ? "" : "min-h-screen bg-slate-950 p-4 sm:p-6 lg:p-8"}`}>
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white font-bold font-mono text-xs px-4 py-2.5 rounded-xl shadow-2xl animate-bounce border border-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> {toastMsg}
        </div>
      )}

      {/* Top Command Bar Header */}
      {!embedded && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900 border border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center font-black shadow-[0_0_20px_rgba(245,158,11,0.4)]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                Sub-Admin Operations & Governance
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[9.5px] text-amber-300 font-bold">
                  PRO AUTHORITY
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Logged in as: <strong className="text-amber-400">{currentUser.name}</strong> • Sub-Admin Manager
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setIsBalanceModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white text-xs font-black uppercase flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-950/40 active:scale-95"
            >
              <Coins className="h-4 w-4" />
              <span>Adjust Player Balance</span>
            </button>

            <button
              onClick={() => setIsInjectModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold uppercase flex items-center gap-1.5 transition-all cursor-pointer border border-amber-500/30"
            >
              <Plus className="h-4 w-4" />
              <span>Manual Request</span>
            </button>

            <button
              onClick={() => { loadData(); loadP2PData(); }}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>

            {onLogout && (
              <button
                onClick={onLogout}
                className="px-4 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/50 text-xs font-bold uppercase flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Embedded Action Bar */}
      {embedded && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 font-mono">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-amber-400" />
            <div>
              <span className="text-xs font-black text-white uppercase tracking-wider block">
                Sub-Admin Authority Direct Console
              </span>
              <span className="text-[10px] text-slate-400">
                Officer: <strong className="text-amber-300">{currentUser.name}</strong> • Live Control Unlocked
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsBalanceModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase flex items-center gap-1 transition-all cursor-pointer shadow"
            >
              <Coins className="h-3.5 w-3.5" /> Direct Player Credit
            </button>

            <button
              onClick={() => setIsInjectModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold uppercase flex items-center gap-1 transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Inject Test Request
            </button>

            <button
              onClick={() => { loadData(); loadP2PData(); }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold uppercase flex items-center gap-1 transition-all cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Sync
            </button>
          </div>
        </div>
      )}

      {/* 1. SUB-ADMIN HEADER & NAVIGATION SWITCHER BAR */}
      <div className="flex items-center gap-2 p-2 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-x-auto">
        <button
          onClick={() => { casinoAudio.playClick(); setActiveMainTab("crypto_queue"); }}
          className={`px-4 py-3 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeMainTab === "crypto_queue"
              ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-950/40"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <Coins className="h-4 w-4" />
          <span>🪙 Direct Crypto Verification</span>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-slate-950/80 text-amber-300 text-[10px] font-mono">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => { casinoAudio.playClick(); setActiveMainTab("p2p_terminal"); }}
          className={`px-4 py-3 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeMainTab === "p2p_terminal"
              ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-950/40"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>👥 P2P Agent Network Terminal</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-950/80 text-emerald-300 text-[10px] font-mono">
            {extendedAgents.length} Agents
          </span>
        </button>

        <button
          onClick={() => { casinoAudio.playClick(); setActiveMainTab("dispute_center"); }}
          className={`px-4 py-3 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeMainTab === "dispute_center"
              ? "bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-md shadow-rose-950/40"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <Scale className="h-4 w-4" />
          <span>⚖️ Dispute Arbitration Center</span>
          {disputedRequests.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 text-[10px] font-mono animate-pulse border border-rose-500/50">
              {disputedRequests.length} Disputed
            </span>
          )}
        </button>
      </div>

      {/* --- TAB 1: DIRECT CRYPTO VERIFICATION QUEUE --- */}
      {activeMainTab === "crypto_queue" && (
        <div className="space-y-6">
          {/* Authority Overview Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-amber-500/30 shadow-lg space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase">
                <span>PENDING QUEUE</span>
                <AlertTriangle className="h-4 w-4 text-amber-400 animate-pulse" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-amber-400">
                {pendingCount} <span className="text-xs text-slate-400 font-normal">Total</span>
              </p>
              <div className="flex justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800">
                <span>Deposits: <strong className="text-emerald-400">{pendingDepositCount}</strong></span>
                <span>Withdrawals: <strong className="text-rose-400">{pendingWithdrawCount}</strong></span>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 shadow-lg space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase">
                <span>APPROVED VOLUME</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-emerald-400">
                ${totalApprovedVolume.toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-800">
                Total chips credited/settled successfully
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-cyan-500/30 shadow-lg space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase">
                <span>PROCESSED RECORDS</span>
                <Users className="h-4 w-4 text-cyan-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-cyan-400">
                {approvedCount} <span className="text-xs text-slate-400 font-normal font-sans">Completed</span>
              </p>
              <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-800">
                Sub-Admin approvals & audit trail
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-purple-500/30 shadow-lg space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase">
                <span>AUTHORITY STATUS</span>
                <Shield className="h-4 w-4 text-purple-400" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-purple-300">
                FULL CONTROL
              </p>
              <p className="text-[10px] text-emerald-400 font-bold pt-1 border-t border-slate-800 flex items-center gap-1">
                <Check className="h-3 w-3" /> All Approvals & Overrides Unlocked
              </p>
            </div>
          </div>

          {/* Main Queue Processing Center */}
          <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/95 border border-slate-800 shadow-2xl space-y-5">
            {/* Filters Header Bar */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Request ID, Player Name, Email, TXID Hash, or Wallet Address..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
                  {(["pending", "approved", "rejected", "all"] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-lg uppercase font-bold transition-all cursor-pointer ${
                        statusFilter === st
                          ? "bg-amber-500 text-slate-950 font-black shadow-md"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
                  {(["all", "deposit", "withdraw"] as const).map((tp) => (
                    <button
                      key={tp}
                      onClick={() => setTypeFilter(tp)}
                      className={`px-3 py-1.5 rounded-lg uppercase font-bold transition-all cursor-pointer ${
                        typeFilter === tp
                          ? "bg-cyan-500 text-slate-950 font-black shadow-md"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {tp}
                    </button>
                  ))}
                </div>

                <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
                  {(["all", "crypto", "mobile"] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setAssetFilter(cat)}
                      className={`px-3 py-1.5 rounded-lg uppercase font-bold transition-all cursor-pointer ${
                        assetFilter === cat
                          ? "bg-purple-600 text-white font-black shadow-md"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {cat === "all" ? "All Channels" : cat === "crypto" ? "🪙 Crypto" : "📱 Mobile"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Requests Queue Cards */}
            {filteredRequests.length === 0 ? (
              <div className="p-12 text-center space-y-3 bg-slate-950/80 rounded-2xl border border-slate-800">
                <ShieldCheck className="h-10 w-10 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">No requests matching current queue filter</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  When players submit crypto or mobile banking deposit/withdrawal requests, they will appear here in real time.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRequests.map((req) => {
                  const isPending = req.status === "pending";
                  const isDeposit = req.type === "deposit";

                  return (
                    <div
                      key={req.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-4 ${
                        isPending
                          ? "bg-slate-900/90 border-amber-500/40 shadow-lg shadow-amber-950/20"
                          : req.status === "approved"
                          ? "bg-slate-900/60 border-emerald-500/30"
                          : "bg-slate-900/40 border-rose-500/30 opacity-80"
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-white ${
                              isDeposit
                                ? "bg-emerald-600/30 border border-emerald-500/50 text-emerald-400"
                                : "bg-rose-600/30 border border-rose-500/50 text-rose-400"
                            }`}
                          >
                            {isDeposit ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-sm text-white">#{req.id}</span>
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${
                                  isDeposit
                                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                                    : "bg-rose-500/20 border-rose-500/40 text-rose-300"
                                }`}
                              >
                                {isDeposit ? "DEPOSIT" : "WITHDRAWAL"}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${
                                  req.status === "pending"
                                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse"
                                    : req.status === "approved"
                                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                                    : "bg-rose-500/20 border-rose-500/40 text-rose-400"
                                }`}
                              >
                                {req.status}
                              </span>
                            </div>

                            <p className="text-xs text-slate-300 font-bold mt-0.5">
                              Player: <strong className="text-amber-300">{req.playerName}</strong> ({req.playerEmail || "Guest"})
                            </p>
                          </div>
                        </div>

                        <div className="text-right flex lg:flex-col items-center lg:items-end justify-between gap-1">
                          <div className="text-xl font-black text-amber-400 font-mono">
                            ${req.amount.toLocaleString()} <span className="text-xs text-slate-400 font-normal">USDT</span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {req.date} • {req.time || "Just now"}
                          </div>
                        </div>
                      </div>

                      {/* Technical Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-bold block">Asset / Gateway</span>
                          <span className="font-bold text-slate-200">
                            {req.cryptoAsset || (req.isCrypto ? "USDT (TRC-20)" : "Mobile Gateway")}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-bold block">Wallet / Account</span>
                          <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-300">
                            <span className="truncate max-w-[180px]">
                              {req.cryptoWalletAddress || req.mobileBankingNumber || "N/A"}
                            </span>
                            {(req.cryptoWalletAddress || req.mobileBankingNumber) && (
                              <button
                                onClick={() => handleCopyText(req.cryptoWalletAddress || req.mobileBankingNumber || "", "Wallet")}
                                className="text-slate-500 hover:text-amber-400 transition-colors"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-bold block">TXID Hash / Proof</span>
                          <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-300">
                            <span className="truncate max-w-[150px]">
                              {req.cryptoTxHash || req.transactionId || "No TXID provided"}
                            </span>
                            {req.cryptoTxHash && (
                              <a
                                href={getExplorerUrl(req.cryptoTxHash, req.cryptoAsset)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-cyan-400 hover:underline flex items-center gap-0.5 text-[10px]"
                              >
                                Scan <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <div className="flex items-center gap-2">
                          {req.proofImageUrl && (
                            <button
                              onClick={() => setPreviewingProofUrl(req.proofImageUrl || null)}
                              className="px-3 py-1.5 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/50 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <ImageIcon className="h-3.5 w-3.5" /> View Proof
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setChatRequest(req);
                              setIsChatOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer border border-slate-700"
                          >
                            <MessageSquare className="h-3.5 w-3.5 text-amber-400" /> Live Chat
                          </button>
                        </div>

                        {/* Approval / Rejection Controls */}
                        {isPending && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingRequest(req);
                                setEditedAmount(req.amount.toString());
                              }}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer border border-amber-500/30"
                            >
                              <Edit2 className="h-3.5 w-3.5" /> Edit Amount
                            </button>

                            <button
                              onClick={() => setRejectingRequestId(req.id)}
                              className="px-4 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-xs font-black uppercase flex items-center gap-1 transition-all cursor-pointer shadow"
                            >
                              <X className="h-3.5 w-3.5" /> Reject
                            </button>

                            <button
                              onClick={() => handleApproveRequest(req)}
                              className="px-5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-slate-950 text-xs font-black uppercase flex items-center gap-1 transition-all cursor-pointer shadow-lg shadow-emerald-950/50 active:scale-95"
                            >
                              <Check className="h-4 w-4" /> APPROVE & CREDIT
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Inline Rejection Reason Box */}
                      {rejectingRequestId === req.id && (
                        <div className="p-3.5 rounded-xl bg-rose-950/90 border border-rose-500/50 space-y-2 mt-2">
                          <label className="text-[10px] text-rose-300 font-bold uppercase block">
                            Specify Rejection Reason to Player:
                          </label>
                          <input
                            type="text"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="e.g. TXID hash not found on blockchain explorer, or wrong deposit address used."
                            className="w-full bg-slate-950 border border-rose-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-rose-400"
                          />
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              onClick={() => setRejectingRequestId(null)}
                              className="px-3 py-1 rounded-lg bg-slate-800 text-slate-400 text-[11px] font-bold"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleRejectRequest(req)}
                              className="px-4 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-black uppercase shadow"
                            >
                              Confirm Rejection
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 2: P2P AGENT NETWORK TERMINAL --- */}
      {activeMainTab === "p2p_terminal" && (
        <div className="space-y-6">
          {/* A. Sub-Admin Operational Float Header Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/60 border border-emerald-500/40 shadow-2xl space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-emerald-950/50">
                  <Zap className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                    Sub-Admin P2P Float Vault & Governance
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                      LIVE TERMINAL
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Manager: <strong className="text-amber-400">{currentSubAdmin.name}</strong> • Direct Float Allocation & Agent Control
                  </p>
                </div>
              </div>

              <button
                onClick={() => { casinoAudio.playClick(); setIsDeployAgentOpen(true); }}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-slate-950 text-xs font-black uppercase flex items-center gap-2 transition-all cursor-pointer shadow-xl shadow-emerald-950/60 active:scale-95"
              >
                <UserPlus className="h-4 w-4" />
                <span>[+ Deploy New Agent]</span>
              </button>
            </div>

            {/* Float & Stats Counters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-emerald-500/30 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Sub-Admin Float Vault Balance</span>
                <p className="text-2xl font-black text-emerald-400">
                  ${(currentSubAdmin.floatBalance || 0).toLocaleString()} <span className="text-xs text-slate-400 font-normal">CHIPS</span>
                </p>
                <p className="text-[10px] text-slate-500">Available to allocate to Deployed Agents</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-cyan-500/30 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Circulating Agent Float</span>
                <p className="text-2xl font-black text-cyan-400">
                  ${circulatingAgentFloat.toLocaleString()} <span className="text-xs text-slate-400 font-normal">CHIPS</span>
                </p>
                <p className="text-[10px] text-slate-500">Total chips pre-funded across active agent vaults</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-purple-500/30 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Active Agents Governed</span>
                <p className="text-2xl font-black text-purple-300">
                  {extendedAgents.filter(a => !a.isFrozen && a.status !== "suspended").length} / {extendedAgents.length} <span className="text-xs text-slate-400 font-normal">Online</span>
                </p>
                <p className="text-[10px] text-slate-500">1-Click Freeze & Limit Configuration Active</p>
              </div>
            </div>
          </div>

          {/* C. Deployed Agents Table & Action Row */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/95 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-400" /> Deployed Agent Network ({extendedAgents.length})
              </h3>
              <span className="text-xs text-slate-400">Real-time Float & Security Governance</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="p-3">Agent & Contact</th>
                    <th className="p-3">Status & Shift</th>
                    <th className="p-3">Float Vault Balance</th>
                    <th className="p-3">Supported Gateways</th>
                    <th className="p-3">Limits & Rates</th>
                    <th className="p-3 text-right">Governance Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {extendedAgents.map((ag) => {
                    const isFrozen = ag.isFrozen || ag.status === "suspended";
                    const isOnline = ag.shiftStatus === "online" && !isFrozen;

                    return (
                      <tr key={ag.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl">{ag.avatar || "👨‍💼"}</span>
                            <div>
                              <strong className="text-white text-xs block">{ag.name}</strong>
                              <span className="text-[10px] text-slate-400">{ag.phone || ag.service}</span>
                            </div>
                          </div>
                        </td>

                        <td className="p-3">
                          <div className="space-y-1">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-block ${
                                isOnline
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                  : isFrozen
                                  ? "bg-rose-950 text-rose-300 border border-rose-600/50"
                                  : "bg-slate-800 text-slate-400"
                              }`}
                            >
                              {isFrozen ? "❄️ FROZEN" : `⚡ ${ag.shiftStatus?.toUpperCase() || "ONLINE"}`}
                            </span>
                            <div className="text-[9.5px] text-slate-500">⭐ {ag.rating || 4.9} Rating</div>
                          </div>
                        </td>

                        <td className="p-3">
                          <div className="text-sm font-black text-amber-400">
                            ${ag.balance.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">USDT</span>
                          </div>
                        </td>

                        <td className="p-3">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {(ag.supportedMethods || ["USDT (TRC-20)", "Binance Pay"]).slice(0, 4).map((m) => (
                              <span key={m} className="px-1.5 py-0.5 rounded bg-slate-800 text-[9.5px] text-slate-300 border border-slate-700">
                                {m}
                              </span>
                            ))}
                            {(ag.supportedMethods?.length || 0) > 4 && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[9.5px] text-slate-400">
                                +{(ag.supportedMethods?.length || 0) - 4}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-3">
                          <div className="text-[10.5px] space-y-0.5 text-slate-300">
                            <div>Limit: ${ag.minLimit || 10} - ${ag.maxLimit?.toLocaleString() || "10,000"}</div>
                            <div className="text-[9.5px] text-slate-400">Dep: 1.5% • Wth: 2.0%</div>
                          </div>
                        </td>

                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <button
                              onClick={() => {
                                setSelectedAgentForFloatModal(ag);
                                setFloatActionType("topup");
                                setFloatAmountInput("1000");
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold uppercase transition-all cursor-pointer shadow"
                            >
                              + Top Up
                            </button>

                            <button
                              onClick={() => {
                                setSelectedAgentForFloatModal(ag);
                                setFloatActionType("recall");
                                setFloatAmountInput(Math.min(1000, ag.balance).toString());
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 text-[10px] font-bold uppercase transition-all cursor-pointer shadow"
                            >
                              - Recall
                            </button>

                            <button
                              onClick={() => handleToggleFreezeAgent(ag)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer border ${
                                isFrozen
                                  ? "bg-teal-950 text-teal-300 border-teal-600 hover:bg-teal-900"
                                  : "bg-rose-950 text-rose-300 border-rose-800 hover:bg-rose-900"
                              }`}
                            >
                              {isFrozen ? "⚡ Unfreeze" : "❄️ Freeze"}
                            </button>

                            <button
                              onClick={() => {
                                setEditingAgent(ag);
                                setEditMinLimit((ag.minLimit || 10).toString());
                                setEditMaxLimit((ag.maxLimit || 10000).toString());
                              }}
                              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold cursor-pointer border border-slate-700"
                            >
                              ⚙️ Edit
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
        </div>
      )}

      {/* --- TAB 3: DISPUTE ARBITRATION DESK --- */}
      {activeMainTab === "dispute_center" && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-rose-950/40 to-slate-900 border border-rose-500/40 shadow-2xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-red-600 text-white flex items-center justify-center font-black shadow-lg shadow-rose-950/60">
                  <Scale className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                    Dispute Arbitration & Force Settlement Desk
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/40">
                      SUB-ADMIN OVERRIDE
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Join 3-way live order chat, inspect uploaded receipts and TXIDs, and execute atomic escrow settlements.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs font-mono">
                <button
                  onClick={() => setDisputeFilter("disputed")}
                  className={`px-3 py-1.5 rounded-lg font-bold uppercase transition-all cursor-pointer ${
                    disputeFilter === "disputed"
                      ? "bg-rose-600 text-white font-black"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Disputed ({disputedRequests.length})
                </button>
                <button
                  onClick={() => setDisputeFilter("all_p2p")}
                  className={`px-3 py-1.5 rounded-lg font-bold uppercase transition-all cursor-pointer ${
                    disputeFilter === "all_p2p"
                      ? "bg-slate-800 text-amber-300 font-black"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  All P2P Orders ({bankingRequests.length})
                </button>
              </div>
            </div>
          </div>

          {/* Orders Grid and 3-Way Chat Drawer */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Orders List Column */}
            <div className="lg:col-span-5 space-y-3 font-mono">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Select Order for Arbitration</span>
                <span className="text-[10px] text-rose-400 font-normal">Realtime Sync</span>
              </h3>

              {(disputeFilter === "disputed" ? disputedRequests : bankingRequests).length === 0 ? (
                <div className="p-8 text-center bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2">
                  <ShieldCheck className="h-8 w-8 text-emerald-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-300 uppercase">No Active Disputes Pending</p>
                  <p className="text-[10px] text-slate-500">All P2P player & agent transactions are operating normally without conflicts.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
                  {(disputeFilter === "disputed" ? disputedRequests : bankingRequests).map((r) => {
                    const isSelected = selectedDisputeReq?.id === r.id;
                    const isDisputed = r.status === "disputed" || (r.notes && r.notes.toLowerCase().includes("disputed"));

                    return (
                      <div
                        key={r.id}
                        onClick={() => setSelectedDisputeReq(r)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                          isSelected
                            ? "bg-slate-900 border-rose-500 shadow-xl ring-1 ring-rose-500/50"
                            : isDisputed
                            ? "bg-rose-950/40 border-rose-500/50 hover:bg-rose-900/30"
                            : "bg-slate-900/60 border-slate-800 hover:bg-slate-800/60"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-white">#{r.id}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[9.5px] font-black uppercase border ${
                              isDisputed
                                ? "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse"
                                : r.status === "approved"
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                                : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                            }`}
                          >
                            {isDisputed ? "DISPUTED" : r.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <div>
                            <span className="text-slate-400 text-[10px] block">PLAYER / AGENT</span>
                            <span className="font-bold text-amber-300">{r.playerName}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-400 text-[10px] block">AMOUNT</span>
                            <span className="font-black text-emerald-400">${r.amount.toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-500 flex justify-between pt-1 border-t border-slate-800">
                          <span>Channel: {r.cryptoAsset || "P2P Agent"}</span>
                          <span>{r.date}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3-Way Chat & Settlement Workspace */}
            <div className="lg:col-span-7 font-mono">
              {!selectedDisputeReq ? (
                <div className="p-12 text-center bg-slate-900/80 rounded-3xl border border-slate-800 space-y-3">
                  <Scale className="h-12 w-12 text-rose-500/50 mx-auto" />
                  <p className="text-xs font-bold text-slate-300 uppercase">Select an order on the left to open the Dispute Workspace</p>
                  <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                    Sub-Admins can inspect live messages, review transaction hash proofs, and execute atomic Force Release or Refund overrides.
                  </p>
                </div>
              ) : (
                <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-rose-500/50 shadow-2xl space-y-5">
                  {/* Selected Dispute Header */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white">Order #{selectedDisputeReq.id}</span>
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/40">
                          ARBITRATION WORKSPACE
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Player: <strong className="text-amber-300">{selectedDisputeReq.playerName}</strong> ({selectedDisputeReq.playerEmail})
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-black text-emerald-400 block">${selectedDisputeReq.amount.toLocaleString()} USDT</span>
                      <span className="text-[10px] text-slate-500">{selectedDisputeReq.type.toUpperCase()}</span>
                    </div>
                  </div>

                  {/* Proof & TXID Inspector */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Verification Proofs</span>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-mono text-[11px]">
                        <span className="text-slate-500">TXID Hash: </span>
                        <span className="text-amber-300">{selectedDisputeReq.cryptoTxHash || selectedDisputeReq.transactionId || "N/A"}</span>
                      </div>

                      {selectedDisputeReq.proofImageUrl && (
                        <button
                          onClick={() => setPreviewingProofUrl(selectedDisputeReq.proofImageUrl || null)}
                          className="px-3 py-1 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/50 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <ImageIcon className="h-3 w-3" /> Inspect Slip
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 3-Way Live Chat Room */}
                  <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950">
                    <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-300 flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5" /> 3-Way Live Order Chat Thread
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold">Sub-Admin Moderated</span>
                    </div>
                    
                    <div className="p-2">
                      <TransactionChatBox
                        isOpen={true}
                        onClose={() => {}}
                        request={selectedDisputeReq}
                        currentUser={{
                          name: `${currentUser.name} (Sub-Admin Arbitrator)`,
                          role: "admin",
                          email: currentUser.email
                        }}
                      />
                    </div>
                  </div>

                  {/* SETTLEMENT OVERRIDES ACTION BAR */}
                  <div className="p-4 rounded-2xl bg-rose-950/50 border border-rose-500/50 space-y-2">
                    <span className="text-[10px] text-rose-300 font-black uppercase tracking-wider block">
                      ⚖️ SUB-ADMIN ATOMIC ESCROW SETTLEMENT OVERRIDES
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <button
                        onClick={() => handleResolveDisputeAction(selectedDisputeReq.id, "release_to_player")}
                        className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-black text-xs uppercase cursor-pointer shadow-lg shadow-emerald-950/60 active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <Check className="h-4 w-4" /> [FORCE RELEASE TO PLAYER]
                      </button>

                      <button
                        onClick={() => handleResolveDisputeAction(selectedDisputeReq.id, "refund_to_agent")}
                        className="py-3 px-4 rounded-xl bg-rose-800 hover:bg-rose-700 text-white font-black text-xs uppercase cursor-pointer shadow-lg shadow-rose-950/60 active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <X className="h-4 w-4" /> [CANCEL & REFUND AGENT]
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- MODALS --- */}

      {/* MODAL B: DEPLOY NEW AGENT MODAL */}
      {isDeployAgentOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleDeployAgentSubmit}
            className="bg-slate-900 border border-emerald-500/50 rounded-3xl p-6 max-w-xl w-full font-mono space-y-4 shadow-2xl animate-fadeIn max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white uppercase flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-emerald-400" /> Deploy New P2P Cashier Agent
              </h3>
              <button
                type="button"
                onClick={() => setIsDeployAgentOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 uppercase font-bold text-[10px] block mb-1">Agent Full Name</label>
                  <input
                    type="text"
                    required
                    value={deployName}
                    onChange={(e) => setDeployName(e.target.value)}
                    placeholder="e.g. VIP Royal Agent Alpha"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-bold outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 uppercase font-bold text-[10px] block mb-1">Login Email / Phone ID</label>
                  <input
                    type="text"
                    required
                    value={deployPhone}
                    onChange={(e) => setDeployPhone(e.target.value)}
                    placeholder="e.g. agent.alpha@vegas.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-bold outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 uppercase font-bold text-[10px] block mb-1">Password</label>
                  <input
                    type="text"
                    required
                    value={deployPassword}
                    onChange={(e) => setDeployPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-amber-300 font-bold outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 uppercase font-bold text-[10px] block mb-1">Deposit Comm %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={deployDepositComm}
                    onChange={(e) => setDeployDepositComm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-emerald-400 font-bold outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 uppercase font-bold text-[10px] block mb-1">Withdraw Comm %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={deployWithdrawComm}
                    onChange={(e) => setDeployWithdrawComm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-emerald-400 font-bold outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 uppercase font-bold text-[10px] block mb-1">Single Tx Limits ($)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={deployMinLimit}
                      onChange={(e) => setDeployMinLimit(e.target.value)}
                      placeholder="Min $10"
                      className="w-1/2 bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-bold text-center"
                    />
                    <input
                      type="number"
                      value={deployMaxLimit}
                      onChange={(e) => setDeployMaxLimit(e.target.value)}
                      placeholder="Max $10000"
                      className="w-1/2 bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-bold text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 uppercase font-bold text-[10px] block mb-1">Initial Float Allocation ($)</label>
                  <input
                    type="number"
                    value={deployInitialFloat}
                    onChange={(e) => setDeployInitialFloat(e.target.value)}
                    placeholder="Amount from SubAdmin Float"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-amber-300 font-bold outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="text-slate-400 uppercase font-bold text-[10px] block mb-1">Supported Payment Gateways</label>
                <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  {["USDT (TRC-20)", "USDT (BEP-20)", "Binance Pay", "BTC", "ETH", "SOL"].map((gw) => (
                    <label key={gw} className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={deploySelectedGateways.includes(gw)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setDeploySelectedGateways([...deploySelectedGateways, gw]);
                          } else {
                            setDeploySelectedGateways(deploySelectedGateways.filter(g => g !== gw));
                          }
                        }}
                        className="accent-emerald-500"
                      />
                      <span>{gw}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeployAgentOpen(false)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold uppercase text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 rounded-xl font-black uppercase text-xs cursor-pointer shadow-lg shadow-emerald-950/60"
                >
                  Deploy Agent Vault
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* FLOAT TOP UP / RECALL MODAL */}
      {selectedAgentForFloatModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleTopUpOrRecallFloatSubmit}
            className="bg-slate-900 border border-emerald-500/50 rounded-3xl p-6 max-w-md w-full font-mono space-y-4 shadow-2xl animate-fadeIn"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white uppercase flex items-center gap-2">
                <Coins className="h-5 w-5 text-emerald-400" /> Float Governance for {selectedAgentForFloatModal.name}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedAgentForFloatModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Sub-Admin Available Float:</span>
                  <strong className="text-emerald-400">${(currentSubAdmin.floatBalance || 0).toLocaleString()}</strong>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Agent Current Vault:</span>
                  <strong className="text-amber-300">${selectedAgentForFloatModal.balance.toLocaleString()}</strong>
                </div>
              </div>

              <div>
                <label className="text-slate-400 uppercase font-bold text-[10px] block mb-1">Action Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFloatActionType("topup")}
                    className={`py-2 rounded-xl font-black uppercase text-xs cursor-pointer ${
                      floatActionType === "topup" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    + Top Up Float
                  </button>
                  <button
                    type="button"
                    onClick={() => setFloatActionType("recall")}
                    className={`py-2 rounded-xl font-black uppercase text-xs cursor-pointer ${
                      floatActionType === "recall" ? "bg-amber-600 text-slate-950" : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    - Recall Float
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-400 uppercase font-bold text-[10px] block mb-1">Transfer Amount ($ Chips)</label>
                <input
                  type="number"
                  required
                  value={floatAmountInput}
                  onChange={(e) => setFloatAmountInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-amber-300 font-bold text-lg outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedAgentForFloatModal(null)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-bold uppercase text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-black uppercase text-xs shadow cursor-pointer"
                >
                  Execute Transfer
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* EDIT AGENT CONFIG MODAL */}
      {editingAgent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEditAgentConfig}
            className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full font-mono space-y-4 shadow-2xl animate-fadeIn"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white uppercase flex items-center gap-2">
                <Settings className="h-5 w-5 text-amber-400" /> Edit Limits for {editingAgent.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingAgent(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 uppercase font-bold text-[10px] block mb-1">Single Order Min Limit ($)</label>
                <input
                  type="number"
                  value={editMinLimit}
                  onChange={(e) => setEditMinLimit(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                />
              </div>

              <div>
                <label className="text-slate-400 uppercase font-bold text-[10px] block mb-1">Single Order Max Limit ($)</label>
                <input
                  type="number"
                  value={editMaxLimit}
                  onChange={(e) => setEditMaxLimit(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingAgent(null)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-bold uppercase text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black uppercase text-xs shadow cursor-pointer"
                >
                  Save Config
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* BALANCE ADJUSTMENT MODAL */}
      {isBalanceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/50 rounded-3xl p-6 max-w-md w-full font-mono space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white uppercase flex items-center gap-2">
                <Coins className="h-5 w-5 text-emerald-400" /> Direct Player Chips Adjustment
              </h3>
              <button
                onClick={() => setIsBalanceModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 uppercase font-bold text-[10px] block mb-1">Target Player Email</label>
                <select
                  value={selectedPlayerEmail}
                  onChange={(e) => setSelectedPlayerEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold outline-none focus:border-amber-500"
                >
                  <option value="">-- Select Registered Player --</option>
                  {players.map((p) => (
                    <option key={p.email} value={p.email}>
                      {p.name} ({p.email}) - Current: ${(p.chips || 0).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 uppercase font-bold text-[10px] block mb-1">Action</label>
                  <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setBalanceAction("add")}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                        balanceAction === "add" ? "bg-emerald-600 text-white" : "text-slate-400"
                      }`}
                    >
                      + Credit
                    </button>
                    <button
                      type="button"
                      onClick={() => setBalanceAction("subtract")}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                        balanceAction === "subtract" ? "bg-rose-600 text-white" : "text-slate-400"
                      }`}
                    >
                      - Debit
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 uppercase font-bold text-[10px] block mb-1">Amount ($ Chips)</label>
                  <input
                    type="number"
                    value={balanceAmount}
                    onChange={(e) => setBalanceAmount(e.target.value)}
                    placeholder="100"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-amber-300 font-bold outline-none focus:border-amber-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 uppercase font-bold text-[10px] block mb-1">Reason / Notes</label>
                <input
                  type="text"
                  value={balanceReason}
                  onChange={(e) => setBalanceReason(e.target.value)}
                  placeholder="e.g. VIP loyalty bonus, cash refund, or dispute adjustment"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white outline-none focus:border-amber-500 text-xs"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  onClick={() => setIsBalanceModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold uppercase text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePlayerBalance}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-black uppercase text-xs cursor-pointer shadow-md"
                >
                  Apply Adjustment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT AMOUNT MODAL */}
      {editingRequest && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/50 rounded-3xl p-6 max-w-sm w-full font-mono space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white uppercase flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-amber-400" /> Edit Request Amount
              </h3>
              <button
                onClick={() => setEditingRequest(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-400">
                Editing amount for Request <strong className="text-white">#{editingRequest.id}</strong> ({editingRequest.playerName})
              </p>

              <div>
                <label className="text-slate-400 uppercase font-bold text-[10px] block mb-1">New Approved Amount ($)</label>
                <input
                  type="number"
                  value={editedAmount}
                  onChange={(e) => setEditedAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-amber-300 font-bold text-lg outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  onClick={() => setEditingRequest(null)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold uppercase text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const amt = parseFloat(editedAmount);
                    if (isNaN(amt) || amt <= 0) {
                      alert("Please enter a valid amount.");
                      return;
                    }
                    handleApproveRequest(editingRequest, amt);
                  }}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black uppercase text-xs cursor-pointer shadow-md"
                >
                  Approve New Amount
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL TEST INJECT MODAL */}
      {isInjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateTestRequest}
            className="bg-slate-900 border border-amber-500/50 rounded-3xl p-6 max-w-md w-full font-mono space-y-4 shadow-2xl animate-fadeIn"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white uppercase flex items-center gap-2">
                <Plus className="h-5 w-5 text-amber-400" /> Manual Crypto Request Injector
              </h3>
              <button
                type="button"
                onClick={() => setIsInjectModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 uppercase font-bold text-[10px] block mb-1">Player Email</label>
                <input
                  type="email"
                  required
                  value={injectPlayerEmail}
                  onChange={(e) => setInjectPlayerEmail(e.target.value)}
                  placeholder="e.g. player@gmail.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-bold outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 uppercase font-bold text-[10px] block mb-1">Request Type</label>
                  <select
                    value={injectType}
                    onChange={(e) => setInjectType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-bold"
                  >
                    <option value="deposit">Deposit</option>
                    <option value="withdraw">Withdrawal</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 uppercase font-bold text-[10px] block mb-1">USDT Value ($)</label>
                  <input
                    type="number"
                    required
                    value={injectAmount}
                    onChange={(e) => setInjectAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-amber-300 font-bold outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 uppercase font-bold text-[10px] block mb-1">Crypto Asset / Channel</label>
                <select
                  value={injectAsset}
                  onChange={(e) => setInjectAsset(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-bold"
                >
                  <option value="USDT (TRC-20)">USDT (TRC-20 Web3)</option>
                  <option value="Binance Pay USDT">Binance Pay USDT</option>
                  <option value="BTC (Bitcoin)">BTC (Bitcoin)</option>
                  <option value="ETH (ERC-20)">ETH (ERC-20)</option>
                  <option value="SOL (Solana)">SOL (Solana)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 uppercase font-bold text-[10px] block mb-1">Simulated TXID Hash</label>
                <input
                  type="text"
                  value={injectTxHash}
                  onChange={(e) => setInjectTxHash(e.target.value)}
                  placeholder="e.g. 0x8f7a9d2c1e4b3a6f..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-mono text-[11px] outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsInjectModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold uppercase text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black uppercase text-xs cursor-pointer shadow-md"
                >
                  Inject Test Request
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* PROOF SCREENSHOT PREVIEW MODAL */}
      {previewingProofUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/50 rounded-2xl p-5 max-w-xl w-full font-mono space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white uppercase flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-indigo-400" /> Inspected Payment Receipt Slip
              </h3>
              <button
                onClick={() => setPreviewingProofUrl(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800 max-h-[400px] flex items-center justify-center p-2">
              <img
                src={previewingProofUrl}
                alt="Payment Receipt Slip"
                className="max-h-[380px] w-auto object-contain rounded"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPreviewingProofUrl(null)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-xs rounded-xl cursor-pointer shadow"
              >
                Close Proof Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Transaction Chat Box */}
      {isChatOpen && chatRequest && (
        <TransactionChatBox
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          request={chatRequest}
          currentUser={{
            name: currentUser.name || "Sub-Admin",
            role: "subadmin",
            email: currentUser.email,
          }}
        />
      )}
    </div>
  );
}
