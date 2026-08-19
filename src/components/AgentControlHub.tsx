import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  ShieldCheck,
  Coins,
  Search,
  RefreshCw,
  Check,
  X,
  AlertTriangle,
  Lock,
  Unlock,
  Edit2,
  Plus,
  Minus,
  Trash2,
  Key,
  Shield,
  Activity,
  DollarSign,
  Zap,
  Phone,
  Mail,
  Eye,
  EyeOff,
  Copy,
  FileText,
  MessageSquare,
  Clock,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Filter,
  Layers,
  Sparkles,
  UserCheck,
  Power
} from "lucide-react";
import { casinoAudio } from "../lib/audioService";
import {
  ExtendedP2PAgent,
  ExtendedSubAdmin,
  getExtendedAgents,
  saveExtendedAgents,
  deleteExtendedP2PAgent,
  getExtendedSubAdmins,
  saveExtendedSubAdmins,
  isP2PGlobalKillSwitchActive,
  setP2PGlobalKillSwitch,
  getAllP2PRequests,
  saveAllP2PRequests,
  resolveP2PDispute,
  getP2PAuditLogs,
  addP2PAuditLog,
  broadcastFinancialStateUpdates,
  injectFloatToAgent,
  recallFloatFromAgent,
  allocateFloatFromMainAdminToSubAdmin
} from "../lib/p2pSystem";
import { BankingRequest } from "../constants/bankingRequests";
import TransactionChatBox from "./TransactionChatBox";

const SUPPORTED_GATEWAYS = [
  "USDT (TRC-20)",
  "USDT (BEP-20)",
  "Binance Pay",
  "BTC",
  "ETH",
  "SOL"
];

interface AgentControlHubProps {
  currentUser?: any;
  onAddAuditLog?: (msg: string, type: "info" | "warning" | "success" | "danger") => void;
}

export default function AgentControlHub({ currentUser, onAddAuditLog }: AgentControlHubProps = {}) {
  const [hubTab, setHubTab] = useState<"fleet" | "escrow" | "subadmins" | "audit">("fleet");
  const [agents, setAgents] = useState<ExtendedP2PAgent[]>([]);
  const [subAdmins, setSubAdmins] = useState<ExtendedSubAdmin[]>([]);
  const [p2pRequests, setP2pRequests] = useState<BankingRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isKillSwitchActive, setIsKillSwitchActive] = useState<boolean>(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "online" | "break" | "offline" | "frozen">("all");
  const [filterGateway, setFilterGateway] = useState<string>("all");
  const [filterEscrowType, setFilterEscrowType] = useState<"all" | "deposit" | "withdraw">("all");
  const [filterEscrowStatus, setFilterEscrowStatus] = useState<string>("all");

  // UI helpers
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastNotification, setToastNotification] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Modals
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<ExtendedP2PAgent | null>(null);
  const [resetPinAgent, setResetPinAgent] = useState<ExtendedP2PAgent | null>(null);
  const [quickFloatAgent, setQuickFloatAgent] = useState<ExtendedP2PAgent | null>(null);
  const [quickFloatAmount, setQuickFloatAmount] = useState<string>("5000");
  const [quickFloatMode, setQuickFloatMode] = useState<"inject" | "recall">("inject");
  const [overrideSubAdmin, setOverrideSubAdmin] = useState<ExtendedSubAdmin | null>(null);
  const [chatRequest, setChatRequest] = useState<BankingRequest | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);

  // In-App Action Confirmation Modal
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    description: string;
    confirmText: string;
    danger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  // New Agent Form State
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentPhone, setNewAgentPhone] = useState("");
  const [newAgentEmail, setNewAgentEmail] = useState("");
  const [newAgentPassword, setNewAgentPassword] = useState("agentpass123");
  const [newAgentFloat, setNewAgentFloat] = useState("250000");
  const [newAgentSubAdmin, setNewAgentSubAdmin] = useState("subadmin");
  const [newAgentGateways, setNewAgentGateways] = useState<string[]>([...SUPPORTED_GATEWAYS]);
  const [newAgentMinLimit, setNewAgentMinLimit] = useState("10");
  const [newAgentMaxLimit, setNewAgentMaxLimit] = useState("100000");
  const [newAgentCustomId, setNewAgentCustomId] = useState("");

  // Edit Agent Form State
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editFloat, setEditFloat] = useState(0);
  const [editSubAdmin, setEditSubAdmin] = useState("subadmin");
  const [editShiftStatus, setEditShiftStatus] = useState<"online" | "break" | "offline">("online");
  const [editIsFrozen, setEditIsFrozen] = useState(false);
  const [editShowDeposit, setEditShowDeposit] = useState(true);
  const [editShowWithdrawal, setEditShowWithdrawal] = useState(true);
  const [editMinLimit, setEditMinLimit] = useState(10);
  const [editMaxLimit, setEditMaxLimit] = useState(100000);
  const [editMethods, setEditMethods] = useState<string[]>([]);
  const [editWalletAddresses, setEditWalletAddresses] = useState<Record<string, string>>({});

  // Reset PIN State
  const [newPinInput, setNewPinInput] = useState("");

  // Sub-Admin Override State
  const [subAdminFloatInput, setSubAdminFloatInput] = useState("1000000");
  const [subAdminMaxAgentsInput, setSubAdminMaxAgentsInput] = useState("10");

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToastNotification({ message, type });
    setTimeout(() => {
      setToastNotification((prev) => (prev?.message === message ? null : prev));
    }, 3500);
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    casinoAudio.playClick();
    showToast(`Copied ${label} to clipboard!`, "info");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Sync state from storage
  const reloadData = () => {
    const freshAgents = getExtendedAgents();
    const freshSubAdmins = getExtendedSubAdmins();
    const freshRequests = getAllP2PRequests();
    const freshLogs = getP2PAuditLogs();
    const freshKillSwitch = isP2PGlobalKillSwitchActive();

    setAgents(freshAgents);
    setSubAdmins(freshSubAdmins);
    setP2pRequests(freshRequests);
    setAuditLogs(freshLogs);
    setIsKillSwitchActive(freshKillSwitch);
  };

  useEffect(() => {
    reloadData();

    const handleSync = () => reloadData();
    window.addEventListener("p2p_state_updated", handleSync);
    window.addEventListener("storage", handleSync);
    window.addEventListener("casino_balance_updated", handleSync);
    window.addEventListener("p2p_requests_updated", handleSync);

    const interval = setInterval(reloadData, 3000);

    return () => {
      window.removeEventListener("p2p_state_updated", handleSync);
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("casino_balance_updated", handleSync);
      window.removeEventListener("p2p_requests_updated", handleSync);
      clearInterval(interval);
    };
  }, []);

  // Fleet Statistics
  const stats = useMemo(() => {
    const totalAgents = agents.length;
    const onlineAgents = agents.filter((a) => a.shiftStatus === "online" && !a.isFrozen).length;
    const frozenAgents = agents.filter((a) => a.isFrozen || a.status === "suspended").length;
    const totalFloat = agents.reduce((sum, a) => sum + (a.balance || 0), 0);
    const totalVolume = agents.reduce((sum, a) => sum + (a.totalVolumeApproved || 0), 0);
    const pendingEscrow = p2pRequests.filter((r) => r.status === "pending" || r.status === ("payment_submitted" as any)).length;

    return {
      totalAgents,
      onlineAgents,
      frozenAgents,
      totalFloat,
      totalVolume,
      pendingEscrow
    };
  }, [agents, p2pRequests]);

  // Filtered Agents
  const filteredAgents = useMemo(() => {
    return agents.filter((a) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        a.name?.toLowerCase().includes(q) ||
        a.id?.toLowerCase().includes(q) ||
        a.email?.toLowerCase().includes(q) ||
        a.phone?.toLowerCase().includes(q) ||
        a.subAdminOwner?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (filterStatus === "online") {
        if (a.isFrozen || a.shiftStatus !== "online") return false;
      } else if (filterStatus === "break") {
        if (a.isFrozen || a.shiftStatus !== "break") return false;
      } else if (filterStatus === "offline") {
        if (a.isFrozen || a.shiftStatus !== "offline") return false;
      } else if (filterStatus === "frozen") {
        if (!a.isFrozen && a.status !== "suspended") return false;
      }

      if (filterGateway !== "all") {
        if (!a.supportedMethods?.includes(filterGateway)) return false;
      }

      return true;
    });
  }, [agents, searchQuery, filterStatus, filterGateway]);

  // Filtered Escrow Orders
  const filteredEscrowOrders = useMemo(() => {
    return p2pRequests.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.id?.toLowerCase().includes(q) ||
        r.playerName?.toLowerCase().includes(q) ||
        r.playerEmail?.toLowerCase().includes(q) ||
        r.agentName?.toLowerCase().includes(q) ||
        r.agentId?.toLowerCase().includes(q) ||
        r.cryptoTxHash?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (filterEscrowType !== "all" && r.type !== filterEscrowType) return false;
      if (filterEscrowStatus !== "all" && r.status !== filterEscrowStatus) return false;

      return true;
    });
  }, [p2pRequests, searchQuery, filterEscrowType, filterEscrowStatus]);

  // --- ACTIONS ---

  // Kill Switch
  const toggleKillSwitch = () => {
    const next = !isKillSwitchActive;
    setP2PGlobalKillSwitch(next);
    setIsKillSwitchActive(next);
    casinoAudio.playClick();
    addP2PAuditLog(
      next
        ? "⚠️ EMERGENCY: Global P2P Cashier Network HALTED by Main Admin."
        : "🟢 SYSTEM: Global P2P Cashier Network RESUMED by Main Admin.",
      next ? "danger" : "success"
    );
    showToast(next ? "P2P Network Killed (Offline)" : "P2P Network Resumed (Online)", next ? "error" : "success");
    broadcastFinancialStateUpdates();
  };

  // 1-Click Freeze / Unfreeze Single Agent
  const handleToggleFreezeAgent = (agent: ExtendedP2PAgent) => {
    const nextFrozen = !agent.isFrozen;
    const updated = agents.map((a) => (a.id === agent.id ? { ...a, isFrozen: nextFrozen } : a));
    setAgents(updated);
    saveExtendedAgents(updated);
    casinoAudio.playClick();
    addP2PAuditLog(
      `AGENT SECURITY: ${agent.name} [${agent.id}] ${nextFrozen ? "FROZEN" : "UNFROZEN"} by Admin.`,
      nextFrozen ? "warning" : "success"
    );
    showToast(`${agent.name} is now ${nextFrozen ? "FROZEN" : "ACTIVE"}`, nextFrozen ? "error" : "success");
  };

  // 1-Click Gateway Visibility Toggle
  const handleToggleGatewayVisibility = (agent: ExtendedP2PAgent, type: "deposit" | "withdrawal") => {
    const updated = agents.map((a) => {
      if (a.id === agent.id) {
        return {
          ...a,
          showOnDeposit: type === "deposit" ? !a.showOnDeposit : a.showOnDeposit,
          showOnWithdrawal: type === "withdrawal" ? !a.showOnWithdrawal : a.showOnWithdrawal
        };
      }
      return a;
    });
    setAgents(updated);
    saveExtendedAgents(updated);
    casinoAudio.playClick();
    showToast(`Updated gateway route for ${agent.name}`, "info");
  };

  // Delete Agent (Opens in-app confirmation modal, no window.confirm!)
  const promptDeleteAgent = (agent: ExtendedP2PAgent) => {
    setConfirmDialog({
      title: `Delete Agent: ${agent.name}`,
      description: `Are you sure you want to PERMANENTLY remove Agent [${agent.name} - ${agent.id}] from the network? All credentials, assigned gateway bindings, and routing will be deleted.`,
      confirmText: "Delete Agent Permanently",
      danger: true,
      onConfirm: () => {
        const remaining = deleteExtendedP2PAgent(agent.id);
        setAgents(remaining);
        casinoAudio.playClick();
        addP2PAuditLog(`AGENT REMOVAL: Agent ${agent.name} [${agent.id}] deleted from system.`, "danger");
        showToast(`Agent ${agent.name} removed successfully!`, "success");
        setConfirmDialog(null);
      }
    });
  };

  // Emergency Freeze All
  const promptEmergencyFreezeAll = () => {
    setConfirmDialog({
      title: "Freeze ALL P2P Agents?",
      description: "This will instantly lock and freeze every active P2P Agent vault across all Sub-Admin networks. Players will be unable to initialize new orders with any agent until unfrozen.",
      confirmText: "Freeze All Agents",
      danger: true,
      onConfirm: () => {
        const updated = agents.map((a) => ({ ...a, isFrozen: true }));
        setAgents(updated);
        saveExtendedAgents(updated);
        casinoAudio.playClick();
        addP2PAuditLog("⚠️ EMERGENCY: Master Freeze executed across ALL active Agent vaults.", "danger");
        showToast("All agent vaults have been FROZEN.", "error");
        setConfirmDialog(null);
      }
    });
  };

  // Emergency Unfreeze All
  const promptEmergencyUnfreezeAll = () => {
    setConfirmDialog({
      title: "Unfreeze ALL Agent Vaults?",
      description: "This will unlock all agent vaults, restoring normal deposit and withdrawal operations for all agents.",
      confirmText: "Unfreeze All Agents",
      danger: false,
      onConfirm: () => {
        const updated = agents.map((a) => ({ ...a, isFrozen: false }));
        setAgents(updated);
        saveExtendedAgents(updated);
        casinoAudio.playClick();
        addP2PAuditLog("🟢 SYSTEM: Master Unfreeze executed across ALL Agent vaults.", "success");
        showToast("All agent vaults are now ACTIVE and unfrozen.", "success");
        setConfirmDialog(null);
      }
    });
  };

  // Emergency Recall All Float
  const promptRecallAllFloat = () => {
    setConfirmDialog({
      title: "Recall ALL Agent Float to Treasury?",
      description: "This will drain all current float balances from every agent and restore the funds into the House Vault Reserves. Agent balances will be reset to $0.",
      confirmText: "Recall All Float",
      danger: true,
      onConfirm: () => {
        let totalRecalled = 0;
        const updated = agents.map((a) => {
          totalRecalled += a.balance || 0;
          return { ...a, balance: 0 };
        });
        setAgents(updated);
        saveExtendedAgents(updated);
        casinoAudio.playClick();
        addP2PAuditLog(
          `TREASURY EMERGENCY: Recalled $${totalRecalled.toLocaleString()} float from ALL Agents back to House Treasury.`,
          "warning"
        );
        showToast(`Recalled $${totalRecalled.toLocaleString()} float back to House Vault.`, "success");
        setConfirmDialog(null);
      }
    });
  };

  // Quick Float Injection / Recall on a single agent
  const openQuickFloatModal = (agent: ExtendedP2PAgent, mode: "inject" | "recall" = "inject") => {
    setQuickFloatAgent(agent);
    setQuickFloatMode(mode);
    setQuickFloatAmount("5000");
  };

  const handleExecuteQuickFloat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickFloatAgent) return;
    const amt = parseFloat(quickFloatAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast("Please enter a valid positive float amount.", "error");
      return;
    }

    if (quickFloatMode === "inject") {
      const res = injectFloatToAgent(quickFloatAgent.id, amt);
      if (res.success) {
        showToast(`Injected +$${amt.toLocaleString()} float into ${quickFloatAgent.name}`, "success");
      } else {
        showToast(res.error || "Failed to inject float.", "error");
      }
    } else {
      const res = recallFloatFromAgent(quickFloatAgent.id, amt);
      if (res.success) {
        showToast(`Recalled -$${amt.toLocaleString()} float from ${quickFloatAgent.name}`, "success");
      } else {
        showToast(res.error || "Failed to recall float.", "error");
      }
    }

    reloadData();
    setQuickFloatAgent(null);
  };

  // Deploy New Agent Submit
  const handleDeployAgentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName.trim()) {
      showToast("Agent name is required.", "error");
      return;
    }

    const floatNum = parseFloat(newAgentFloat) || 0;
    const minLim = parseFloat(newAgentMinLimit) || 10;
    const maxLim = parseFloat(newAgentMaxLimit) || 100000;
    const id = newAgentCustomId.trim() || `agent-${Date.now().toString().slice(-4)}`;

    const newAgent: ExtendedP2PAgent = {
      id,
      name: newAgentName.trim(),
      phone: newAgentPhone.trim() || "01710000000",
      phoneNumber: newAgentPhone.trim() || "01710000000",
      email: newAgentEmail.trim() || `${id}@casino.com`,
      password: newAgentPassword.trim() || "agentpass123",
      balance: floatNum,
      service: newAgentGateways[0] || "USDT (TRC-20)",
      rating: "5.0 (New)",
      speed: "1-3 mins",
      avatar: "👨‍💼",
      isVerified: true,
      isHidden: false,
      showOnDeposit: true,
      showOnWithdrawal: true,
      status: "active",
      shiftStatus: "online",
      isFrozen: false,
      subAdminOwner: newAgentSubAdmin,
      supportedMethods: newAgentGateways,
      minLimit: minLim,
      maxLimit: maxLim,
      depositRequestsProcessed: 0,
      withdrawRequestsProcessed: 0,
      totalVolumeApproved: 0,
      walletAddresses: {
        "USDT (TRC-20)": "T9xMasterCasinoWalletUSDT2026Crypto",
        "USDT (BEP-20)": "0x71C7B5a713A29f27d5320d75a1348123A8429C91",
        "Binance Pay": "284910385",
        BTC: "bc1qnexaspincryptocasinohash777BTC",
        ETH: "0x777NexaSpinCryptoCasinoAddress999ETH",
        SOL: "SOL777NexaSpinCryptoCasinoAddressXyZ123SOL"
      }
    };

    const updated = [newAgent, ...agents];
    setAgents(updated);
    saveExtendedAgents(updated);
    casinoAudio.playClick();
    addP2PAuditLog(`AGENT DEPLOYED: New Agent ${newAgent.name} [${newAgent.id}] added by Admin.`, "success");
    showToast(`Agent ${newAgent.name} deployed successfully!`, "success");

    // Reset Form
    setNewAgentName("");
    setNewAgentPhone("");
    setNewAgentEmail("");
    setNewAgentPassword("agentpass123");
    setNewAgentFloat("250000");
    setNewAgentCustomId("");
    setIsDeployModalOpen(false);
  };

  // Open Edit Modal
  const openEditModal = (agent: ExtendedP2PAgent) => {
    setEditingAgent(agent);
    setEditName(agent.name || "");
    setEditPhone(agent.phone || agent.phoneNumber || "");
    setEditEmail(agent.email || "");
    setEditPassword(agent.password || "");
    setEditFloat(agent.balance || 0);
    setEditSubAdmin(agent.subAdminOwner || "subadmin");
    setEditShiftStatus(agent.shiftStatus || "online");
    setEditIsFrozen(agent.isFrozen || false);
    setEditShowDeposit(agent.showOnDeposit !== false);
    setEditShowWithdrawal(agent.showOnWithdrawal !== false);
    setEditMinLimit(agent.minLimit || 10);
    setEditMaxLimit(agent.maxLimit || 100000);
    setEditMethods(agent.supportedMethods || [...SUPPORTED_GATEWAYS]);
    setEditWalletAddresses(agent.walletAddresses || {});
  };

  // Edit Agent Submit
  const handleEditAgentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent) return;

    const updated = agents.map((a) => {
      if (a.id === editingAgent.id) {
        return {
          ...a,
          name: editName.trim() || a.name,
          phone: editPhone.trim() || a.phone,
          phoneNumber: editPhone.trim() || a.phoneNumber,
          email: editEmail.trim() || a.email,
          password: editPassword.trim() || a.password,
          balance: Number(editFloat) || 0,
          subAdminOwner: editSubAdmin,
          shiftStatus: editShiftStatus,
          isFrozen: editIsFrozen,
          showOnDeposit: editShowDeposit,
          showOnWithdrawal: editShowWithdrawal,
          minLimit: Number(editMinLimit) || 10,
          maxLimit: Number(editMaxLimit) || 100000,
          supportedMethods: editMethods,
          walletAddresses: editWalletAddresses
        };
      }
      return a;
    });

    setAgents(updated);
    saveExtendedAgents(updated);
    casinoAudio.playClick();
    addP2PAuditLog(`AGENT UPDATED: Admin configured credentials & routes for ${editingAgent.name}.`, "info");
    showToast(`Agent ${editingAgent.name} settings saved!`, "success");
    setEditingAgent(null);
  };

  // Reset PIN Submit
  const openResetPinModal = (agent: ExtendedP2PAgent) => {
    setResetPinAgent(agent);
    setNewPinInput("");
  };

  const handleResetPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPinAgent || !newPinInput.trim()) return;

    const updated = agents.map((a) => {
      if (a.id === resetPinAgent.id) {
        return { ...a, password: newPinInput.trim() };
      }
      return a;
    });

    setAgents(updated);
    saveExtendedAgents(updated);
    casinoAudio.playClick();
    addP2PAuditLog(`SECURITY: Password/PIN updated for Agent ${resetPinAgent.name} [${resetPinAgent.id}].`, "warning");
    showToast(`Password/PIN reset for ${resetPinAgent.name}!`, "success");
    setResetPinAgent(null);
  };

  // Sub-Admin Override
  const openSubAdminOverrideModal = (sa: ExtendedSubAdmin) => {
    setOverrideSubAdmin(sa);
    setSubAdminFloatInput((sa.floatBalance || 0).toString());
    setSubAdminMaxAgentsInput((sa.maxAgentsAllowed || 10).toString());
  };

  const handleSaveSubAdminOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideSubAdmin) return;

    const newFloat = parseFloat(subAdminFloatInput) || 0;
    const newMaxAgents = parseInt(subAdminMaxAgentsInput, 10) || 10;

    const updated = subAdmins.map((sa) => {
      if (sa.id === overrideSubAdmin.id || sa.username === overrideSubAdmin.username) {
        return {
          ...sa,
          floatBalance: newFloat,
          maxAgentsAllowed: newMaxAgents
        };
      }
      return sa;
    });

    setSubAdmins(updated);
    saveExtendedSubAdmins(updated);
    casinoAudio.playClick();
    addP2PAuditLog(
      `SUB-ADMIN OVERRIDE: Admin updated ${overrideSubAdmin.name} Float to $${newFloat.toLocaleString()} and Max Agents to ${newMaxAgents}.`,
      "warning"
    );
    showToast(`Sub-Admin ${overrideSubAdmin.name} settings updated!`, "success");
    setOverrideSubAdmin(null);
  };

  // Escrow Dispute Resolution
  const handleResolveEscrow = (requestId: string, outcome: "release_to_player" | "refund_to_agent") => {
    const res = resolveP2PDispute(requestId, outcome, "Main Administrator", "Casino Master Operations");
    if (res.success) {
      showToast(
        outcome === "release_to_player"
          ? "Dispute Resolved: Force Released $ to Player!"
          : "Dispute Resolved: Cancelled & Refunded to Agent!",
        "success"
      );
      reloadData();
    } else {
      showToast(res.error || "Failed to resolve dispute.", "error");
    }
  };

  return (
    <div id="p2p-agent-escrow-hub" className="space-y-6 text-slate-100 font-mono">
      {/* Toast Notification Banner */}
      {toastNotification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-bold border transition-all animate-bounce ${
            toastNotification.type === "success"
              ? "bg-emerald-950/90 text-emerald-300 border-emerald-500/50"
              : toastNotification.type === "error"
              ? "bg-rose-950/90 text-rose-300 border-rose-500/50"
              : "bg-cyan-950/90 text-cyan-300 border-cyan-500/50"
          }`}
        >
          {toastNotification.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          ) : toastNotification.type === "error" ? (
            <AlertTriangle className="h-5 w-5 text-rose-400" />
          ) : (
            <Sparkles className="h-5 w-5 text-cyan-400" />
          )}
          <span>{toastNotification.message}</span>
        </div>
      )}

      {/* Header Banner & Stats Overview */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black uppercase text-white tracking-wider">
                    Agent Fleet & Escrow Command
                  </h2>
                  <span className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 text-[10px] px-2 py-0.5 rounded-full font-black uppercase">
                    P2P Hub v3.0
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Full control over active agent vaults, gateway credentials, Sub-Admin float quotas, and escrow disputes.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions / Master Killswitch */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={toggleKillSwitch}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer ${
                isKillSwitchActive
                  ? "bg-rose-600 hover:bg-rose-500 text-white animate-pulse"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              }`}
            >
              <Power className="h-4 w-4" />
              {isKillSwitchActive ? "P2P Network Killed (Offline)" : "P2P Active"}
            </button>

            <button
              onClick={() => setIsDeployModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-950/50 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Deploy Agent
            </button>

            <button
              onClick={reloadData}
              title="Refresh Data"
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Total Fleet</div>
            <div className="text-lg font-black text-white mt-1">{stats.totalAgents} Agents</div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-emerald-400">Active Online</div>
            <div className="text-lg font-black text-emerald-400 mt-1">{stats.onlineAgents} Online</div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-rose-400">Frozen Vaults</div>
            <div className="text-lg font-black text-rose-400 mt-1">{stats.frozenAgents} Frozen</div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-cyan-400">Total Float Vault</div>
            <div className="text-lg font-black text-cyan-400 mt-1">${stats.totalFloat.toLocaleString()}</div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-amber-400">Processed Volume</div>
            <div className="text-lg font-black text-amber-400 mt-1">${stats.totalVolume.toLocaleString()}</div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-purple-400">Pending Escrow</div>
            <div className="text-lg font-black text-purple-400 mt-1">{stats.pendingEscrow} Orders</div>
          </div>
        </div>
      </div>

      {/* Main Hub Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setHubTab("fleet")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
              hubTab === "fleet"
                ? "bg-cyan-600 text-white shadow-lg shadow-cyan-950/40"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <Users className="h-4 w-4" /> Agent Fleet ({filteredAgents.length})
          </button>

          <button
            onClick={() => setHubTab("escrow")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all cursor-pointer relative ${
              hubTab === "escrow"
                ? "bg-cyan-600 text-white shadow-lg shadow-cyan-950/40"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <ShieldCheck className="h-4 w-4" /> Escrow Orders & Disputes ({p2pRequests.length})
            {stats.pendingEscrow > 0 && (
              <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-black animate-pulse">
                {stats.pendingEscrow}
              </span>
            )}
          </button>

          <button
            onClick={() => setHubTab("subadmins")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
              hubTab === "subadmins"
                ? "bg-cyan-600 text-white shadow-lg shadow-cyan-950/40"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <Shield className="h-4 w-4" /> Sub-Admin Treasury ({subAdmins.length})
          </button>

          <button
            onClick={() => setHubTab("audit")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
              hubTab === "audit"
                ? "bg-cyan-600 text-white shadow-lg shadow-cyan-950/40"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <Activity className="h-4 w-4" /> Security Audit Log ({auditLogs.length})
          </button>
        </div>

        {/* Emergency Batch Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={promptEmergencyFreezeAll}
            className="px-3 py-1.5 bg-rose-950/50 hover:bg-rose-900 text-rose-300 border border-rose-800/60 rounded-xl text-[11px] font-bold uppercase transition-all cursor-pointer"
          >
            <Lock className="h-3.5 w-3.5 inline mr-1" /> Freeze All
          </button>

          <button
            onClick={promptEmergencyUnfreezeAll}
            className="px-3 py-1.5 bg-emerald-950/50 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 rounded-xl text-[11px] font-bold uppercase transition-all cursor-pointer"
          >
            <Unlock className="h-3.5 w-3.5 inline mr-1" /> Unfreeze All
          </button>

          <button
            onClick={promptRecallAllFloat}
            className="px-3 py-1.5 bg-amber-950/50 hover:bg-amber-900 text-amber-300 border border-amber-800/60 rounded-xl text-[11px] font-bold uppercase transition-all cursor-pointer"
          >
            <Coins className="h-3.5 w-3.5 inline mr-1" /> Recall All Float
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: AGENT FLEET & VAULTS */}
      {/* ========================================================================= */}
      {hubTab === "fleet" && (
        <div className="space-y-6">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search agent name, ID, phone, email, or sub-admin..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-slate-400 ml-1 hidden sm:block" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-cyan-500"
              >
                <option value="all">All Statuses</option>
                <option value="online">🟢 Online Active</option>
                <option value="break">🟡 Shift Break</option>
                <option value="offline">⚪ Offline</option>
                <option value="frozen">🔴 Frozen Vault</option>
              </select>

              {/* Gateway Filter */}
              <select
                value={filterGateway}
                onChange={(e) => setFilterGateway(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-cyan-500"
              >
                <option value="all">All Gateways</option>
                {SUPPORTED_GATEWAYS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Agent Cards Grid */}
          {filteredAgents.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <Users className="h-10 w-10 text-slate-600 mx-auto" />
              <div className="text-slate-300 font-bold text-sm">No P2P Agents Found</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No active agents match your search or filters. Click "Deploy Agent" above to add a new cashier agent.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredAgents.map((agent) => {
                const isFrozen = agent.isFrozen || agent.status === "suspended";
                const isOnline = agent.shiftStatus === "online" && !isFrozen;
                const isBreak = agent.shiftStatus === "break" && !isFrozen;
                const isOffline = agent.shiftStatus === "offline" || isFrozen;
                const isPassRevealed = revealedPasswords[agent.id] || false;

                return (
                  <div
                    key={agent.id}
                    className={`bg-slate-900/90 border rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 shadow-xl relative overflow-hidden ${
                      isFrozen
                        ? "border-rose-500/50 shadow-rose-950/20"
                        : isOnline
                        ? "border-slate-800 hover:border-cyan-500/50 hover:shadow-cyan-950/20"
                        : "border-slate-800"
                    }`}
                  >
                    {/* Top Identity Row */}
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-xl shadow-inner relative">
                            {agent.avatar || "👨‍💼"}
                            {agent.isVerified && (
                              <span
                                title="Verified Super Agent"
                                className="absolute -bottom-1 -right-1 bg-cyan-500 text-slate-950 rounded-full p-0.5"
                              >
                                <Check className="h-2.5 w-2.5 stroke-[3]" />
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-black text-white tracking-wide">{agent.name}</h3>
                              <span className="text-[10px] text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                                #{agent.id}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                              <span className="text-cyan-400 font-bold">@{agent.subAdminOwner || "subadmin"}</span>
                              <span>•</span>
                              <span>{agent.speed || "2-5 mins"}</span>
                              <span>•</span>
                              <span>⭐ {agent.rating || "4.9"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Shift Status Pill */}
                        <div>
                          {isFrozen ? (
                            <span className="flex items-center gap-1 bg-rose-950 text-rose-400 border border-rose-800/80 px-2 py-0.5 rounded-full text-[10px] font-black uppercase animate-pulse">
                              <Lock className="h-3 w-3" /> Frozen
                            </span>
                          ) : isOnline ? (
                            <span className="flex items-center gap-1 bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Online
                            </span>
                          ) : isBreak ? (
                            <span className="flex items-center gap-1 bg-amber-950 text-amber-400 border border-amber-800/80 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                              <Clock className="h-3 w-3" /> Shift Break
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                              Offline
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Float Vault Banner with Quick Adjust */}
                      <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                            <DollarSign className="h-3.5 w-3.5 text-cyan-400" />
                            Float Vault Balance
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => openQuickFloatModal(agent, "inject")}
                              className="px-2 py-0.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/70 rounded text-[10px] font-black uppercase cursor-pointer"
                            >
                              + Float
                            </button>
                            <button
                              onClick={() => openQuickFloatModal(agent, "recall")}
                              className="px-2 py-0.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/70 rounded text-[10px] font-black uppercase cursor-pointer"
                            >
                              - Cut
                            </button>
                          </div>
                        </div>

                        <div className="text-xl font-black text-emerald-400 tracking-tight">
                          ${(agent.balance || 0).toLocaleString()} <span className="text-xs text-slate-400 font-normal">USDT</span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-900">
                          <div>
                            Limits: ${agent.minLimit || 10} - ${agent.maxLimit?.toLocaleString() || "100k"}
                          </div>
                          <div>
                            Vol: <span className="text-amber-400 font-bold">${(agent.totalVolumeApproved || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Gateway Visibility Badges */}
                      <div className="flex items-center justify-between text-[10px] bg-slate-950/50 p-2 rounded-xl border border-slate-800/60">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-bold uppercase">Visibility:</span>
                          <button
                            onClick={() => handleToggleGatewayVisibility(agent, "deposit")}
                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase cursor-pointer ${
                              agent.showOnDeposit !== false
                                ? "bg-cyan-950 text-cyan-300 border border-cyan-800"
                                : "bg-slate-800 text-slate-500"
                            }`}
                          >
                            Deposit {agent.showOnDeposit !== false ? "✓" : "✕"}
                          </button>
                          <button
                            onClick={() => handleToggleGatewayVisibility(agent, "withdrawal")}
                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase cursor-pointer ${
                              agent.showOnWithdrawal !== false
                                ? "bg-purple-950 text-purple-300 border border-purple-800"
                                : "bg-slate-800 text-slate-500"
                            }`}
                          >
                            Withdraw {agent.showOnWithdrawal !== false ? "✓" : "✕"}
                          </button>
                        </div>

                        <div className="text-[10px] text-slate-400">
                          Dep: <span className="text-white font-bold">{agent.depositRequestsProcessed || 0}</span> | Wdr:{" "}
                          <span className="text-white font-bold">{agent.withdrawRequestsProcessed || 0}</span>
                        </div>
                      </div>

                      {/* Supported Gateways Badges */}
                      <div className="space-y-1">
                        <div className="text-[9px] uppercase font-bold text-slate-500">Connected Gateways</div>
                        <div className="flex flex-wrap gap-1 max-h-12 overflow-y-auto">
                          {(agent.supportedMethods || [agent.service || "USDT (TRC-20)"]).map((method) => (
                            <span
                              key={method}
                              className="bg-slate-950 text-slate-300 border border-slate-800 text-[9px] px-2 py-0.5 rounded font-bold"
                            >
                              {method}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Credentials Row */}
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[10px] space-y-1.5">
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-cyan-400" /> {agent.email || "agent@casino.com"}
                          </span>
                          <button
                            onClick={() => copyToClipboard(agent.email || "", "Email")}
                            className="text-slate-500 hover:text-white"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between text-slate-400">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-emerald-400" /> {agent.phone || agent.phoneNumber || "01710000000"}
                          </span>
                          <button
                            onClick={() => copyToClipboard(agent.phone || agent.phoneNumber || "", "Phone")}
                            className="text-slate-500 hover:text-white"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between text-slate-400">
                          <span className="flex items-center gap-1">
                            <Key className="h-3 w-3 text-amber-400" />
                            Pass: {isPassRevealed ? agent.password || "agentpass123" : "••••••••"}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() =>
                                setRevealedPasswords((prev) => ({
                                  ...prev,
                                  [agent.id]: !prev[agent.id]
                                }))
                              }
                              className="text-slate-500 hover:text-white"
                            >
                              {isPassRevealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </button>
                            <button
                              onClick={() => copyToClipboard(agent.password || "", "Password")}
                              className="text-slate-500 hover:text-white"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons Bar */}
                    <div className="grid grid-cols-4 gap-1.5 pt-4 mt-4 border-t border-slate-800">
                      <button
                        onClick={() => openEditModal(agent)}
                        title="Edit Agent & Gateways"
                        className="flex flex-col items-center justify-center gap-1 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-[10px] font-bold text-cyan-300 transition-all cursor-pointer"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-cyan-400" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => openResetPinModal(agent)}
                        title="Reset Password / Security PIN"
                        className="flex flex-col items-center justify-center gap-1 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-[10px] font-bold text-amber-300 transition-all cursor-pointer"
                      >
                        <Key className="h-3.5 w-3.5 text-amber-400" />
                        <span>PIN</span>
                      </button>

                      <button
                        onClick={() => handleToggleFreezeAgent(agent)}
                        title={isFrozen ? "Unfreeze Agent" : "Freeze Agent"}
                        className={`flex flex-col items-center justify-center gap-1 py-2 border rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                          isFrozen
                            ? "bg-rose-950 hover:bg-rose-900 border-rose-800 text-rose-300"
                            : "bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300"
                        }`}
                      >
                        {isFrozen ? (
                          <>
                            <Unlock className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Unlock</span>
                          </>
                        ) : (
                          <>
                            <Lock className="h-3.5 w-3.5 text-rose-400" />
                            <span>Freeze</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => promptDeleteAgent(agent)}
                        title="Delete Agent Permanently"
                        className="flex flex-col items-center justify-center gap-1 py-2 bg-rose-950/40 hover:bg-rose-900/90 border border-rose-900/60 rounded-xl text-[10px] font-bold text-rose-400 hover:text-white transition-all cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ESCROW ORDERS & DISPUTES TERMINAL */}
      {/* ========================================================================= */}
      {hubTab === "escrow" && (
        <div className="space-y-6">
          {/* Escrow Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search order ID, player name, agent, or TXID..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={filterEscrowType}
                onChange={(e) => setFilterEscrowType(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none"
              >
                <option value="all">All Types</option>
                <option value="deposit">Deposit Orders</option>
                <option value="withdraw">Withdrawal Orders</option>
              </select>

              <select
                value={filterEscrowStatus}
                onChange={(e) => setFilterEscrowStatus(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="payment_submitted">Proof Submitted</option>
                <option value="approved">Approved / Cleared</option>
                <option value="rejected">Rejected / Cancelled</option>
              </select>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 uppercase text-[10px] font-black border-b border-slate-800 tracking-wider">
                    <th className="py-3 px-4">Order ID & Date</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Player</th>
                    <th className="py-3 px-4">Assigned Agent</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Method & Proof</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Escrow Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredEscrowOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        No P2P escrow orders found.
                      </td>
                    </tr>
                  ) : (
                    filteredEscrowOrders.map((order) => {
                      const isDeposit = order.type === "deposit";
                      const isPendingProof = (order.status as any) === "payment_submitted";
                      const isPending = order.status === "pending";
                      const isApproved = order.status === "approved";
                      const isRejected = order.status === "rejected";

                      return (
                        <tr key={order.id} className="hover:bg-slate-950/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-white">{order.id}</div>
                            <div className="text-[10px] text-slate-500">
                              {order.date} {order.time}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {isDeposit ? (
                              <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                                Deposit
                              </span>
                            ) : (
                              <span className="bg-purple-950 text-purple-400 border border-purple-800 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                                Withdraw
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-200">{order.playerName}</div>
                            <div className="text-[10px] text-slate-400">{order.playerEmail}</div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-cyan-300">{order.agentName || "Agent"}</div>
                            <div className="text-[10px] text-slate-500">ID: {order.agentId}</div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-black text-emerald-400 text-sm">
                              ${order.amount.toLocaleString()} <span className="text-[10px] text-slate-400">USDT</span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="text-slate-300 font-bold">{order.cryptoAsset || order.paymentCategory}</div>
                            {order.proofImageUrl ? (
                              <button
                                onClick={() => setProofPreviewUrl(order.proofImageUrl || null)}
                                className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 mt-0.5"
                              >
                                <Eye className="h-3 w-3" /> View Proof Image
                              </button>
                            ) : order.cryptoTxHash ? (
                              <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                                TXID: {order.cryptoTxHash}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-600">No proof submitted</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            {isApproved ? (
                              <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                                ✓ Cleared
                              </span>
                            ) : isRejected ? (
                              <span className="bg-rose-950 text-rose-400 border border-rose-800 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                                ✕ Rejected
                              </span>
                            ) : isPendingProof ? (
                              <span className="bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded text-[10px] font-black uppercase animate-pulse">
                                Proof Uploaded
                              </span>
                            ) : (
                              <span className="bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                                Pending
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Open Chat Box */}
                              <button
                                onClick={() => setChatRequest(order)}
                                title="Open Order Chat & Logs"
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 cursor-pointer"
                              >
                                <MessageSquare className="h-3.5 w-3.5 text-cyan-400" />
                              </button>

                              {/* Force Release Dispute Outcome */}
                              {(isPending || isPendingProof) && (
                                <>
                                  <button
                                    onClick={() => handleResolveEscrow(order.id, "release_to_player")}
                                    title="Admin Force Release Funds to Player"
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase cursor-pointer"
                                  >
                                    Release
                                  </button>
                                  <button
                                    onClick={() => handleResolveEscrow(order.id, "refund_to_agent")}
                                    title="Admin Cancel & Refund Order"
                                    className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-black uppercase cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SUB-ADMIN TREASURY & ALLOCATIONS */}
      {/* ========================================================================= */}
      {hubTab === "subadmins" && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white uppercase flex items-center gap-2">
                  <Shield className="h-5 w-5 text-cyan-400" /> Sub-Admin Treasury Governance
                </h3>
                <p className="text-xs text-slate-400">
                  Sub-Admins act as territorial escrow bankers who manage agent fleets and disburse float.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-2">
              {subAdmins.map((sa) => {
                const assignedAgents = agents.filter(
                  (a) => a.subAdminOwner === sa.username || a.subAdminOwner === sa.name
                );
                const assignedFloat = assignedAgents.reduce((s, a) => s + (a.balance || 0), 0);

                return (
                  <div key={sa.id || sa.username} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-cyan-950/60 border border-cyan-800 flex items-center justify-center text-cyan-400 font-black">
                          {sa.name?.[0] || "S"}
                        </div>
                        <div>
                          <div className="text-sm font-black text-white">{sa.name}</div>
                          <div className="text-[10px] text-slate-500">@{sa.username}</div>
                        </div>
                      </div>

                      <button
                        onClick={() => openSubAdminOverrideModal(sa)}
                        className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 rounded-lg text-[10px] font-black uppercase cursor-pointer"
                      >
                        Override
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-900 text-[11px]">
                      <div className="bg-slate-900/60 p-2 rounded-lg">
                        <div className="text-[9px] uppercase text-slate-500 font-bold">Treasury Float</div>
                        <div className="font-black text-emerald-400 text-sm mt-0.5">
                          ${(sa.floatBalance || 0).toLocaleString()}
                        </div>
                      </div>

                      <div className="bg-slate-900/60 p-2 rounded-lg">
                        <div className="text-[9px] uppercase text-slate-500 font-bold">Fleet Count</div>
                        <div className="font-black text-cyan-300 text-sm mt-0.5">
                          {assignedAgents.length} / {sa.maxAgentsAllowed || 10}
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 flex justify-between">
                      <span>Assigned Agent Float:</span>
                      <span className="text-slate-200 font-bold">${assignedFloat.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SECURITY AUDIT LOG */}
      {/* ========================================================================= */}
      {hubTab === "audit" && (
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white uppercase flex items-center gap-2">
                  <Activity className="h-5 w-5 text-cyan-400" /> P2P Security & Financial Audit Stream
                </h3>
                <p className="text-xs text-slate-400">
                  Immutable record of float transfers, credential modifications, order releases, and security events.
                </p>
              </div>
            </div>

            <div className="bg-slate-950 rounded-xl border border-slate-800 max-h-[500px] overflow-y-auto divide-y divide-slate-900 font-mono text-xs">
              {auditLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-600">No security audit logs recorded yet.</div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-3 flex items-start gap-3 hover:bg-slate-900/30">
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider ${
                        log.type === "danger"
                          ? "bg-rose-950 text-rose-400 border border-rose-800"
                          : log.type === "warning"
                          ? "bg-amber-950 text-amber-400 border border-amber-800"
                          : log.type === "success"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          : "bg-cyan-950 text-cyan-400 border border-cyan-800"
                      }`}
                    >
                      {log.type}
                    </span>
                    <div className="flex-1">
                      <div className="text-slate-200">{log.message}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {log.date} {log.timestamp}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: DEPLOY AGENT */}
      {/* ========================================================================= */}
      {isDeployModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white uppercase flex items-center gap-2">
                <Plus className="h-5 w-5 text-cyan-400" /> Deploy New P2P Agent
              </h3>
              <button onClick={() => setIsDeployModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleDeployAgentSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Agent Name *</label>
                  <input
                    type="text"
                    required
                    value={newAgentName}
                    onChange={(e) => setNewAgentName(e.target.value)}
                    placeholder="e.g. CryptoExpress #1"
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Custom Agent ID</label>
                  <input
                    type="text"
                    value={newAgentCustomId}
                    onChange={(e) => setNewAgentCustomId(e.target.value)}
                    placeholder="e.g. agent-express-01"
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Agent Phone Number</label>
                  <input
                    type="text"
                    value={newAgentPhone}
                    onChange={(e) => setNewAgentPhone(e.target.value)}
                    placeholder="e.g. 01710000000"
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Agent Email Address</label>
                  <input
                    type="email"
                    value={newAgentEmail}
                    onChange={(e) => setNewAgentEmail(e.target.value)}
                    placeholder="e.g. agent@casino.com"
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Login Password / PIN</label>
                  <input
                    type="text"
                    required
                    value={newAgentPassword}
                    onChange={(e) => setNewAgentPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Assign Sub-Admin Owner</label>
                  <select
                    value={newAgentSubAdmin}
                    onChange={(e) => setNewAgentSubAdmin(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 outline-none"
                  >
                    {subAdmins.map((sa) => (
                      <option key={sa.username} value={sa.username}>
                        {sa.name} (@{sa.username})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Initial Float ($)</label>
                  <input
                    type="number"
                    value={newAgentFloat}
                    onChange={(e) => setNewAgentFloat(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-emerald-400 font-bold rounded-xl px-3 py-2 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Min Order Limit ($)</label>
                  <input
                    type="number"
                    value={newAgentMinLimit}
                    onChange={(e) => setNewAgentMinLimit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Max Order Limit ($)</label>
                  <input
                    type="number"
                    value={newAgentMaxLimit}
                    onChange={(e) => setNewAgentMaxLimit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 outline-none"
                  />
                </div>
              </div>

              {/* Supported Gateways */}
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1.5">
                  Supported Payment Gateways
                </label>
                <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  {SUPPORTED_GATEWAYS.map((gw) => {
                    const isChecked = newAgentGateways.includes(gw);
                    return (
                      <label key={gw} className="flex items-center gap-1.5 cursor-pointer text-[10px]">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewAgentGateways([...newAgentGateways, gw]);
                            } else {
                              setNewAgentGateways(newAgentGateways.filter((g) => g !== gw));
                            }
                          }}
                          className="accent-cyan-500"
                        />
                        <span className={isChecked ? "text-cyan-300 font-bold" : "text-slate-400"}>{gw}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDeployModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase rounded-xl shadow-lg cursor-pointer"
                >
                  Deploy Agent Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT AGENT & GATEWAYS */}
      {/* ========================================================================= */}
      {editingAgent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white uppercase flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-cyan-400" /> Edit Agent: {editingAgent.name}
              </h3>
              <button onClick={() => setEditingAgent(null)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditAgentSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Agent Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Password</label>
                  <input
                    type="text"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Float Balance ($)</label>
                  <input
                    type="number"
                    value={editFloat}
                    onChange={(e) => setEditFloat(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 text-emerald-400 font-bold rounded-xl px-3 py-2 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Shift Status</label>
                  <select
                    value={editShiftStatus}
                    onChange={(e) => setEditShiftStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 outline-none"
                  >
                    <option value="online">🟢 Online</option>
                    <option value="break">🟡 Shift Break</option>
                    <option value="offline">⚪ Offline</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Freeze Status</label>
                  <button
                    type="button"
                    onClick={() => setEditIsFrozen(!editIsFrozen)}
                    className={`w-full py-2 rounded-xl font-bold uppercase text-[10px] cursor-pointer ${
                      editIsFrozen ? "bg-rose-600 text-white" : "bg-slate-950 border border-slate-800 text-slate-300"
                    }`}
                  >
                    {editIsFrozen ? "Frozen" : "Active"}
                  </button>
                </div>
              </div>

              {/* Supported Gateways */}
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Supported Gateways</label>
                <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  {SUPPORTED_GATEWAYS.map((gw) => {
                    const isChecked = editMethods.includes(gw);
                    return (
                      <label key={gw} className="flex items-center gap-1.5 cursor-pointer text-[10px]">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditMethods([...editMethods, gw]);
                            } else {
                              setEditMethods(editMethods.filter((m) => m !== gw));
                            }
                          }}
                          className="accent-cyan-500"
                        />
                        <span className={isChecked ? "text-cyan-300 font-bold" : "text-slate-400"}>{gw}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Wallet Addresses / Pay IDs */}
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                  Custom Wallet Addresses & Gateway IDs
                </label>
                <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800 max-h-36 overflow-y-auto">
                  {editMethods.map((m) => (
                    <div key={m} className="flex items-center gap-2">
                      <span className="w-28 text-[10px] text-cyan-300 font-bold truncate">{m}:</span>
                      <input
                        type="text"
                        value={editWalletAddresses[m] || ""}
                        onChange={(e) =>
                          setEditWalletAddresses({
                            ...editWalletAddresses,
                            [m]: e.target.value
                          })
                        }
                        placeholder={`Enter ${m} Wallet or Phone`}
                        className="flex-1 bg-slate-900 border border-slate-800 text-white rounded-lg px-2 py-1 text-[11px] outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingAgent(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase rounded-xl shadow-lg cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: RESET PASSWORD / PIN */}
      {/* ========================================================================= */}
      {resetPinAgent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 max-w-md w-full font-mono space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white uppercase flex items-center gap-2">
                <Key className="h-4 w-4 text-amber-400" /> Reset Password: {resetPinAgent.name}
              </h3>
              <button onClick={() => setResetPinAgent(null)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleResetPinSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                  New Password / Security PIN *
                </label>
                <input
                  type="text"
                  required
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value)}
                  placeholder="Enter new strong password"
                  className="w-full bg-slate-950 border border-slate-800 text-white font-bold rounded-xl px-3 py-2 outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setNewPinInput(`pwd-${Math.floor(100000 + Math.random() * 900000)}`)}
                  className="text-[10px] text-amber-400 hover:underline font-bold"
                >
                  Generate Random PIN
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setResetPinAgent(null)}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase rounded-xl cursor-pointer"
                  >
                    Update PIN
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: QUICK FLOAT INJECTION / RECALL */}
      {/* ========================================================================= */}
      {quickFloatAgent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl p-6 max-w-md w-full font-mono space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white uppercase flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-cyan-400" />
                {quickFloatMode === "inject" ? "Inject Float into" : "Recall Float from"} {quickFloatAgent.name}
              </h3>
              <button onClick={() => setQuickFloatAgent(null)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteQuickFloat} className="space-y-4 text-xs">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">
                  Current Float Vault:{" "}
                  <span className="text-emerald-400 font-black">${(quickFloatAgent.balance || 0).toLocaleString()}</span>
                </div>
                <input
                  type="number"
                  required
                  min="1"
                  value={quickFloatAmount}
                  onChange={(e) => setQuickFloatAmount(e.target.value)}
                  placeholder="Enter float amount ($)"
                  className="w-full bg-slate-950 border border-slate-800 text-white font-black text-base rounded-xl px-3 py-2.5 outline-none focus:border-cyan-500"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-2">
                {["1000", "5000", "25000", "50000", "100000"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setQuickFloatAmount(preset)}
                    className="flex-1 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-cyan-400 text-[10px] font-bold rounded-lg cursor-pointer"
                  >
                    +${(parseInt(preset) / 1000).toFixed(0)}k
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickFloatAgent(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 font-black uppercase rounded-xl shadow-lg cursor-pointer ${
                    quickFloatMode === "inject"
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                      : "bg-rose-600 hover:bg-rose-500 text-white"
                  }`}
                >
                  {quickFloatMode === "inject" ? "Inject Float" : "Recall Float"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: SUB-ADMIN OVERRIDE */}
      {/* ========================================================================= */}
      {overrideSubAdmin && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl p-6 max-w-md w-full font-mono space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white uppercase flex items-center gap-2">
                <Shield className="h-4 w-4 text-cyan-400" /> Override Sub-Admin: {overrideSubAdmin.name}
              </h3>
              <button onClick={() => setOverrideSubAdmin(null)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSubAdminOverride} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                  Treasury Float Balance ($ USDT)
                </label>
                <input
                  type="number"
                  value={subAdminFloatInput}
                  onChange={(e) => setSubAdminFloatInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-emerald-400 font-black rounded-xl px-3 py-2 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                  Max Active Agent Quota
                </label>
                <input
                  type="number"
                  value={subAdminMaxAgentsInput}
                  onChange={(e) => setSubAdminMaxAgentsInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white font-bold rounded-xl px-3 py-2 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOverrideSubAdmin(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase rounded-xl shadow-lg cursor-pointer"
                >
                  Save Overrides
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: IN-APP CUSTOM CONFIRMATION DIALOG (No window.confirm!) */}
      {/* ========================================================================= */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`bg-slate-900 border rounded-2xl p-6 max-w-md w-full font-mono space-y-4 shadow-2xl ${
              confirmDialog.danger ? "border-rose-500/50" : "border-cyan-500/50"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl border ${
                  confirmDialog.danger
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                    : "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                }`}
              >
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="text-base font-black text-white uppercase">{confirmDialog.title}</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{confirmDialog.description}</p>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className={`px-5 py-2 rounded-xl text-xs font-black uppercase shadow-lg cursor-pointer ${
                  confirmDialog.danger
                    ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/50"
                    : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-950/50"
                }`}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: PAYMENT PROOF IMAGE PREVIEW */}
      {/* ========================================================================= */}
      {proofPreviewUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 max-w-2xl w-full space-y-3 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-black uppercase text-white">Payment Proof Screenshot</span>
              <button onClick={() => setProofPreviewUrl(null)} className="text-slate-400 hover:text-white p-1">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex justify-center p-2 bg-slate-950 rounded-xl max-h-[70vh] overflow-auto">
              <img
                src={proofPreviewUrl}
                alt="Payment Proof"
                className="max-h-[65vh] object-contain rounded-lg shadow-lg"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 8: TRANSACTION CHAT BOX */}
      {/* ========================================================================= */}
      {chatRequest && (
        <TransactionChatBox
          isOpen={true}
          onClose={() => setChatRequest(null)}
          request={chatRequest as any}
          currentUser={{
            name: "Main Administrator",
            role: "admin",
            email: "admin@casino.com"
          }}
        />
      )}
    </div>
  );
}
