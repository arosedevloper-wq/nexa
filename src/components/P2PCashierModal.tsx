import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, ShieldCheck, Clock, Zap, MessageSquare, Send, Upload, AlertTriangle, 
  CheckCircle2, XCircle, RefreshCw, Lock, DollarSign, Filter, ArrowRight, ShieldAlert,
  ChevronRight, Phone, Copy, Check, FileText, Image as ImageIcon, X
} from "lucide-react";
import { casinoAudio } from "../lib/audioService";
import { 
  getExtendedAgents, 
  ExtendedP2PAgent, 
  createP2PDepositOrder, 
  createP2PWithdrawalOrder, 
  submitDepositPaymentProof, 
  confirmP2PWithdrawalSettlement,
  raiseP2PDispute,
  getAllP2PRequests,
  isP2PGlobalKillSwitchActive
} from "../lib/p2pSystem";
import { BankingRequest } from "../types";
import { getTransactionChatMessages, sendTransactionChatMessage, TransactionChatMessage, compressImageBase64 } from "../lib/transactionChat";

interface P2PCashierModalProps {
  currentUser: { name: string; email?: string; role?: string } | null;
  onClose?: () => void;
  onAddAuditLog?: (msg: string, type: "info" | "warning" | "success" | "danger") => void;
  defaultMode?: "deposit" | "withdraw";
}

export default function P2PCashierModal({
  currentUser,
  onClose,
  onAddAuditLog,
  defaultMode = "deposit"
}: P2PCashierModalProps) {
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw" | "orders">(defaultMode);
  const [agents, setAgents] = useState<ExtendedP2PAgent[]>(() => getExtendedAgents());
  const [methodFilter, setMethodFilter] = useState<string>("All");
  const [selectedAgent, setSelectedAgent] = useState<ExtendedP2PAgent | null>(null);

  // Form states
  const [orderAmount, setOrderAmount] = useState<string>("");
  const [selectedMethod, setSelectedMethod] = useState<string>("USDT (TRC-20)");
  const [playerDestinationWallet, setPlayerDestinationWallet] = useState<string>("");
  const [orderError, setOrderError] = useState<string>("");
  const [orderSuccess, setOrderSuccess] = useState<string>("");

  // Active Order & Chat
  const [activeOrder, setActiveOrder] = useState<BankingRequest | null>(null);
  const [txProofInput, setTxProofInput] = useState<string>("");
  const [proofImageBase64, setProofImageBase64] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<TransactionChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>("");
  const [chatSelectedImage, setChatSelectedImage] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Dispute state
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const prevChatCountRef = useRef<number>(0);
  const prevOrderIdRef = useRef<string | null>(null);

  const scrollToBottomChat = (force = false) => {
    if (!chatContainerRef.current) return;
    const container = chatContainerRef.current;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    if (force || isNearBottom) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const isKillSwitchActive = isP2PGlobalKillSwitchActive();

  const playerEmail = currentUser?.email || `${currentUser?.name?.toLowerCase().replace(/\s+/g, "")}@player.com`;
  const playerName = currentUser?.name || "VIP Player";

  // Load and refresh data
  const refreshData = () => {
    const freshAgents = getExtendedAgents();
    setAgents(freshAgents);

    // Auto-select first active agent if none selected (preserving user selection via functional update)
    setSelectedAgent((prev) => {
      if (prev) {
        const match = freshAgents.find(a => a.id === prev.id);
        return match || prev;
      }
      const activeFirst = freshAgents.find(a => !a.isFrozen && a.status === "active") || freshAgents[0];
      if (activeFirst && activeFirst.supportedMethods?.length) {
        setSelectedMethod(activeFirst.supportedMethods[0]);
      }
      return activeFirst || null;
    });

    const allReqs = getAllP2PRequests();
    const myReqs = allReqs.filter(r => r.playerEmail?.toLowerCase() === playerEmail.toLowerCase() || r.playerName === playerName);
    setActiveOrder((prevActive) => {
      if (prevActive) {
        const updatedActive = allReqs.find(r => r.id === prevActive.id);
        return updatedActive || prevActive;
      }
      if (myReqs.length > 0) {
        const ongoing = myReqs.find(r => r.status !== "approved" && r.status !== "rejected");
        return ongoing || null;
      }
      return null;
    });
  };

  useEffect(() => {
    refreshData();
    window.addEventListener("storage", refreshData);
    window.addEventListener("p2p_state_updated", refreshData);
    const interval = setInterval(refreshData, 2000);

    return () => {
      window.removeEventListener("storage", refreshData);
      window.removeEventListener("p2p_state_updated", refreshData);
      clearInterval(interval);
    };
  }, [playerEmail, playerName]);

  // Load order chat messages when activeOrder changes
  useEffect(() => {
    if (!activeOrder) return;
    const loadMsgs = () => {
      setChatMessages(getTransactionChatMessages(activeOrder.id));
    };
    loadMsgs();

    const handleChatUpdate = (e: any) => {
      if (!e.detail || e.detail?.requestId === activeOrder.id) {
        loadMsgs();
      }
    };
    window.addEventListener("casino_tx_chat_updated" as any, handleChatUpdate);
    window.addEventListener("p2p_chat_updated" as any, handleChatUpdate);
    window.addEventListener("storage", loadMsgs);
    return () => {
      window.removeEventListener("casino_tx_chat_updated" as any, handleChatUpdate);
      window.removeEventListener("p2p_chat_updated" as any, handleChatUpdate);
      window.removeEventListener("storage", loadMsgs);
    };
  }, [activeOrder]);

  useEffect(() => {
    if (!activeOrder) return;

    const orderChanged = prevOrderIdRef.current !== activeOrder.id;
    const isNewMessage = chatMessages.length > prevChatCountRef.current;

    if (orderChanged) {
      setTimeout(() => scrollToBottomChat(true), 50);
      prevOrderIdRef.current = activeOrder.id;
    } else if (isNewMessage) {
      scrollToBottomChat(false);
    }

    prevChatCountRef.current = chatMessages.length;
  }, [chatMessages, activeOrder]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    casinoAudio.playClick();
    setTimeout(() => setCopiedText(null), 2000);
  };

  const availableMethods = [
    "All",
    "USDT (TRC-20)",
    "USDT (BEP-20)",
    "Binance Pay",
    "bKash",
    "Nagad",
    "Rocket",
    "BTC",
    "ETH",
    "SOL"
  ];

  const filteredAgents = agents.filter(a => {
    if (a.isFrozen || a.status === "suspended") return false;
    if (methodFilter === "All") return true;
    return a.supportedMethods?.includes(methodFilter);
  });

  const handleCreateOrder = () => {
    setOrderError("");
    setOrderSuccess("");
    if (!selectedAgent) {
      setOrderError("Please select a verified Agent to proceed.");
      return;
    }

    const amt = parseFloat(orderAmount);
    if (isNaN(amt) || amt <= 0) {
      setOrderError("Please enter a valid numeric amount.");
      return;
    }

    if (activeTab === "deposit") {
      const res = createP2PDepositOrder({
        playerEmail,
        playerName,
        amount: amt,
        agentId: selectedAgent.id,
        paymentMethod: selectedMethod
      });
      if (!res.success) {
        setOrderError(res.error || "Failed to create deposit order.");
        casinoAudio.playLose();
      } else {
        casinoAudio.playWin();
        setOrderError("");
        if (res.request) {
          setActiveOrder(res.request);
        }
        setOrderSuccess(`P2P Deposit order #${res.request?.id} created! Connected to Agent ${selectedAgent.name}.`);
        setOrderAmount("");
        setActiveTab("orders");
      }
    } else {
      if (!playerDestinationWallet.trim()) {
        setOrderError("Please enter your receiving wallet address / payment account number.");
        return;
      }
      const res = createP2PWithdrawalOrder({
        playerEmail,
        playerName,
        amount: amt,
        agentId: selectedAgent.id,
        paymentMethod: selectedMethod,
        playerWalletOrPhone: playerDestinationWallet.trim()
      });
      if (!res.success) {
        setOrderError(res.error || "Failed to create withdrawal order.");
        casinoAudio.playLose();
      } else {
        casinoAudio.playWin();
        setOrderError("");
        if (res.request) {
          setActiveOrder(res.request);
        }
        setOrderSuccess(`P2P Withdrawal order #${res.request?.id} created! $${amt.toLocaleString()} chips locked in Escrow.`);
        setOrderAmount("");
        setPlayerDestinationWallet("");
        setActiveTab("orders");
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("Image size exceeds 10MB limit.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const rawUrl = reader.result as string;
      if (rawUrl) {
        const compressed = await compressImageBase64(rawUrl, 800, 800, 0.65);
        setProofImageBase64(compressed);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitProof = () => {
    if (!activeOrder) return;
    if (!txProofInput.trim() && !proofImageBase64) {
      alert("Please enter a reference/TXID or attach a screenshot image proof.");
      return;
    }

    const res = submitDepositPaymentProof(activeOrder.id, txProofInput.trim() || "ATTACHED_PROOF_IMAGE", proofImageBase64);
    if (res.success) {
      casinoAudio.playWin();
      setTxProofInput("");
      setProofImageBase64("");
      refreshData();
    } else {
      alert(res.error || "Failed to submit proof.");
    }
  };

  const handleConfirmWithdrawalReceipt = () => {
    if (!activeOrder) return;
    const res = confirmP2PWithdrawalSettlement(activeOrder.id);
    if (res.success) {
      casinoAudio.playWin();
      refreshData();
    } else {
      alert(res.error || "Failed to confirm receipt.");
    }
  };

  const handleChatImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Image size exceeds 2MB limit. Please select a smaller screenshot.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const rawUrl = reader.result as string;
      if (rawUrl) {
        const compressed = await compressImageBase64(rawUrl, 800, 800, 0.65);
        setChatSelectedImage(compressed);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder || (!chatInput.trim() && !chatSelectedImage)) return;

    sendTransactionChatMessage({
      requestId: activeOrder.id,
      senderId: playerEmail,
      senderName: playerName,
      senderRole: "player",
      message: chatInput.trim(),
      attachmentUrl: chatSelectedImage || undefined,
      imageBase64: chatSelectedImage || undefined,
      image: chatSelectedImage || undefined,
    });

    setChatInput("");
    setChatSelectedImage(null);
    casinoAudio.playClick();
    setChatMessages(getTransactionChatMessages(activeOrder.id));
    setTimeout(() => scrollToBottomChat(true), 50);
  };

  const handleRaiseDisputeSubmit = () => {
    if (!activeOrder || !disputeReason.trim()) return;
    const res = raiseP2PDispute(activeOrder.id, "player", disputeReason.trim());
    if (res.success) {
      casinoAudio.playLose();
      setShowDisputeModal(false);
      setDisputeReason("");
      refreshData();
    } else {
      alert(res.error || "Failed to raise dispute.");
    }
  };

  const myOrders = getAllP2PRequests().filter(r => r.playerEmail?.toLowerCase() === playerEmail.toLowerCase() || r.playerName === playerName);

  return (
    <div className="w-full bg-slate-900/90 rounded-2xl border border-cyan-500/20 p-4 sm:p-6 text-slate-100 shadow-2xl relative">
      {/* Global Killswitch Alert */}
      {isKillSwitchActive && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 animate-bounce" />
          <span><strong>Global Notice:</strong> P2P Agent Cashier service is currently offline for system maintenance.</span>
        </div>
      )}

      {/* Header Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
              P2P Agent Settlement Network
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                ⚡ Instant Escrow
              </span>
            </h3>
            <p className="text-xs text-slate-400">Pure Cash Deposits & P2P Direct Off-Chain Withdrawals</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => { casinoAudio.playClick(); setActiveTab("deposit"); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "deposit"
                ? "bg-cyan-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <DollarSign className="h-3.5 w-3.5" /> Deposit
          </button>
          <button
            onClick={() => { casinoAudio.playClick(); setActiveTab("withdraw"); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "withdraw"
                ? "bg-amber-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Lock className="h-3.5 w-3.5" /> Withdraw
          </button>
          <button
            onClick={() => { casinoAudio.playClick(); setActiveTab("orders"); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "orders"
                ? "bg-purple-500 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FileText className="h-3.5 w-3.5" /> Orders ({myOrders.length})
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {(activeTab === "deposit" || activeTab === "withdraw") && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Filter & Agent List */}
          <div className="lg:col-span-7 space-y-4">
            {/* Method Filter Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0 font-medium">
                <Filter className="h-3.5 w-3.5 text-cyan-400" /> Gateway:
              </span>
              {availableMethods.map((m) => (
                <button
                  key={m}
                  onClick={() => { casinoAudio.playClick(); setMethodFilter(m); }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all border ${
                    methodFilter === m
                      ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Agent Cards */}
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {filteredAgents.length === 0 ? (
                <div className="text-center py-8 bg-slate-950/40 rounded-xl border border-slate-800">
                  <Users className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No active P2P agents online for selected gateway filter.</p>
                </div>
              ) : (
                filteredAgents.map((ag) => {
                  const isSelected = selectedAgent?.id === ag.id;
                  const isOnline = ag.shiftStatus === "online" || ag.status === "active";
                  return (
                    <div
                      key={ag.id}
                      onClick={() => {
                        casinoAudio.playClick();
                        setSelectedAgent(ag);
                        if (ag.supportedMethods?.length) {
                          setSelectedMethod(ag.supportedMethods[0]);
                        }
                      }}
                      className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer relative ${
                        isSelected
                          ? "bg-slate-900/90 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] ring-2 ring-emerald-400/50"
                          : "bg-slate-950/50 hover:bg-slate-900/80 border-slate-800/80 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl p-2 rounded-xl bg-slate-800/80 border border-slate-700 shrink-0">
                            {ag.avatar || "👨‍💼"}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-xs sm:text-sm text-white">{ag.name}</h4>
                              <span className="text-[10px] text-amber-400 font-medium">⭐ {ag.rating || "4.9"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              <span className="flex items-center gap-1 text-emerald-400">
                                <Zap className="h-3 w-3" /> {ag.speed || "1-3 mins"}
                              </span>
                              <span>•</span>
                              <span>Float Vault: <strong className="text-slate-200">${ag.balance.toLocaleString()}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                            isOnline 
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                          }`}>
                            {isOnline ? "⚡ Online" : "Shift Break"}
                          </span>
                          <div className="text-[10px] text-slate-400 mt-1">
                            Limits: ${ag.minLimit || 10} - ${ag.maxLimit || 100000}
                          </div>
                        </div>
                      </div>

                      {/* Supported Gateways tags & Prominent Select Button */}
                      <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-1">
                          {ag.supportedMethods?.map((sm) => (
                            <span key={sm} className="text-[9px] bg-slate-900 border border-slate-800 text-cyan-300/80 px-1.5 py-0.5 rounded font-mono">
                              {sm}
                            </span>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            casinoAudio.playClick();
                            setSelectedAgent(ag);
                            if (ag.supportedMethods?.length) {
                              setSelectedMethod(ag.supportedMethods[0]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
                            isSelected
                              ? "bg-emerald-500 text-slate-950 ring-1 ring-emerald-400"
                              : "bg-cyan-500 hover:bg-cyan-400 text-slate-950"
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <Check className="h-3.5 w-3.5" /> Selected Agent
                            </>
                          ) : (
                            <>
                              <Zap className="h-3.5 w-3.5" />
                              {activeTab === "deposit" ? "Select Agent & Deposit" : "Select Agent & Withdraw"}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Order Setup Panel */}
          <div className="lg:col-span-5 bg-slate-950/80 rounded-xl border border-slate-800 p-4 flex flex-col justify-between">
            <div className="space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" />
                {activeTab === "deposit" ? "Configure Deposit Request" : "Configure Withdrawal Request"}
              </h4>

              {/* Selected Agent Display */}
              {selectedAgent ? (
                <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{selectedAgent.avatar || "👨‍💼"}</span>
                    <div>
                      <div className="text-xs font-bold text-white">{selectedAgent.name}</div>
                      <div className="text-[10px] text-cyan-300">Selected Escrow Agent</div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded font-mono">
                    Verified
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                  👈 Click an Agent from the list on the left to handle your transaction.
                </div>
              )}

              {/* Payment Method Selector */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-medium">Select Gateway / Method:</label>
                <select
                  value={selectedMethod}
                  onChange={(e) => setSelectedMethod(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  {(selectedAgent?.supportedMethods || availableMethods.filter(m => m !== "All")).map((sm) => (
                    <option key={sm} value={sm}>{sm}</option>
                  ))}
                </select>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-medium">
                  {activeTab === "deposit" ? "Deposit Amount (USD / Cash Chips):" : "Withdrawal Amount (USD / Cash Chips):"}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">$</span>
                  <input
                    type="number"
                    value={orderAmount}
                    onChange={(e) => setOrderAmount(e.target.value)}
                    placeholder={activeTab === "deposit" ? "e.g. 50.00" : "e.g. 100.00"}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-7 pr-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-cyan-500"
                  />
                </div>
                {activeTab === "deposit" && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    💡 Pure Cash Guarantee: Exactly $<strong>{parseFloat(orderAmount) || 0}</strong> Real Cash credited to Main Balance. Plus, 200% match bonus allocated to Locked Bonus Balance upon approval!
                  </p>
                )}
              </div>

              {/* Destination wallet/phone for Withdrawal */}
              {activeTab === "withdraw" && (
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 font-medium">
                    Your {selectedMethod} Wallet Address / Account Phone:
                  </label>
                  <input
                    type="text"
                    value={playerDestinationWallet}
                    onChange={(e) => setPlayerDestinationWallet(e.target.value)}
                    placeholder="Enter wallet address or e-wallet account phone"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              {/* Notifications */}
              {orderError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{orderError}</span>
                </div>
              )}
              {orderSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{orderSuccess}</span>
                </div>
              )}
            </div>

            {/* Action Button */}
            <div className="mt-6 pt-4 border-t border-slate-800">
              <button
                disabled={isKillSwitchActive || !selectedAgent}
                onClick={handleCreateOrder}
                className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg ${
                  isKillSwitchActive || !selectedAgent
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                    : activeTab === "deposit"
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-slate-950 font-black cursor-pointer"
                    : "bg-gradient-to-r from-amber-500 to-orange-600 hover:brightness-110 text-slate-950 font-black cursor-pointer"
                }`}
              >
                {activeTab === "deposit" ? (
                  <>
                    <Zap className="h-4 w-4" /> Initialize P2P Deposit Order
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" /> Lock Escrow & Request Payout
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orders & Live Chat Tab */}
      {activeTab === "orders" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* My Orders List */}
          <div className="lg:col-span-5 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-cyan-400" /> Active P2P Order Workspace
            </h4>

            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {myOrders.length === 0 ? (
                <div className="text-center py-10 bg-slate-950/40 rounded-xl border border-slate-800">
                  <FileText className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No active P2P requests found.</p>
                </div>
              ) : (
                myOrders.map((ord) => {
                  const isSelected = activeOrder?.id === ord.id;
                  const isPending = ord.status === "pending" || ord.status === "payment_submitted" || ord.status === "ticket_approved";
                  return (
                    <div
                      key={ord.id}
                      onClick={() => { casinoAudio.playClick(); setActiveOrder(ord); }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-slate-900 border-cyan-400/80 ring-1 ring-cyan-500/30"
                          : "bg-slate-950/50 hover:bg-slate-950 border-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-cyan-300">#{ord.id}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase border ${
                          ord.status === "approved"
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                            : ord.status === "rejected"
                            ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                            : "bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse"
                        }`}>
                          {ord.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <div>
                          <div className="text-xs font-bold text-white uppercase">{ord.type} • ${ord.amount.toLocaleString()}</div>
                          <div className="text-[10px] text-slate-400">Agent: {ord.agentName} ({ord.cryptoAsset})</div>
                        </div>
                        <div className="text-[10px] text-slate-500">{ord.time || ord.date}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Active Order Details & 1-on-1 Chat Drawer */}
          <div className="lg:col-span-7 bg-slate-950/90 rounded-xl border border-slate-800 p-4 flex flex-col h-[520px]">
            {activeOrder ? (
              <div className="flex flex-col h-full">
                {/* Active Order Banner & Instructions */}
                <div className="pb-3 mb-3 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-white flex items-center gap-2">
                      <span>Order #{activeOrder.id}</span>
                      <span className="text-[10px] text-cyan-400 bg-cyan-950 border border-cyan-800 px-2 py-0.5 rounded font-mono">
                        {activeOrder.type.toUpperCase()} ${activeOrder.amount.toLocaleString()}
                      </span>
                    </h4>
                    <p className="text-[10px] text-slate-400">Agent: {activeOrder.agentName} • {activeOrder.cryptoAsset}</p>
                  </div>

                  {/* Raise Dispute Button */}
                  {(activeOrder.status === "payment_submitted" || activeOrder.status === "ticket_approved" || activeOrder.status === "pending") && (
                    <button
                      onClick={() => setShowDisputeModal(true)}
                      className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <ShieldAlert className="h-3 w-3" /> Raise Dispute
                    </button>
                  )}
                </div>

                {/* Receiver Info / Proof Submission Box if Deposit and pending payment */}
                {activeOrder.type === "deposit" && activeOrder.status === "pending" && (
                  <div className="mb-3 p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30 space-y-2">
                    <div className="flex items-center justify-between text-xs text-cyan-200 font-bold">
                      <span>Transfer ${activeOrder.amount.toLocaleString()} to Agent's Receiver Address:</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-700 flex items-center justify-between text-xs font-mono">
                      <span className="truncate mr-2 text-amber-300 font-bold">{activeOrder.cryptoWalletAddress}</span>
                      <button
                        onClick={() => handleCopy(activeOrder.cryptoWalletAddress || "")}
                        className="p-1 text-cyan-400 hover:text-white"
                      >
                        {copiedText === activeOrder.cryptoWalletAddress ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={txProofInput}
                        onChange={(e) => setTxProofInput(e.target.value)}
                        placeholder="Enter Ref / TXID"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white font-mono"
                      />
                      <label className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer border border-slate-600">
                        <Upload className="h-3.5 w-3.5" />
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </label>
                      <button
                        onClick={handleSubmitProof}
                        className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded cursor-pointer"
                      >
                        Submit Proof
                      </button>
                    </div>
                  </div>
                )}

                {/* Withdrawal Confirmation Box if Agent transferred payout */}
                {activeOrder.type === "withdraw" && activeOrder.status === "ticket_approved" && (
                  <div className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
                    <div className="text-amber-300 font-bold">
                      Agent marked off-chain transfer complete! Ref/TXID: <span className="font-mono text-white">{activeOrder.cryptoTxHash}</span>
                    </div>
                    <button
                      onClick={handleConfirmWithdrawalReceipt}
                      className="w-full py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded cursor-pointer"
                    >
                      ✅ Confirm Payout Received & Release Settlement
                    </button>
                  </div>
                )}

                {/* Realtime 1-on-1 Chat Area */}
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-2 p-2 bg-slate-900/60 rounded-xl border border-slate-800/80 mb-3 text-xs">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-[11px]">
                      No chat messages yet. Send a note to Agent {activeOrder.agentName}.
                    </div>
                  ) : (
                    chatMessages.map((m) => {
                      const isSystem = m.senderRole === "system";
                      const isMe = m.senderId === playerEmail;
                      if (isSystem) {
                        return (
                          <div key={m.id} className="text-center my-1.5 text-[10px] text-cyan-300 bg-cyan-950/40 border border-cyan-800/40 p-1.5 rounded-lg font-mono">
                            {m.message}
                          </div>
                        );
                      }
                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                        >
                          <div className="text-[9px] text-slate-500 mb-0.5">{m.senderName} • {m.timestamp}</div>
                          <div className={`p-2.5 rounded-xl max-w-[85%] text-xs font-sans ${
                            isMe
                              ? "bg-cyan-600 text-white rounded-br-none shadow"
                              : "bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700"
                          }`}>
                            {m.message && <div className="whitespace-pre-wrap">{m.message}</div>}
                            {(m.attachmentUrl || m.imageBase64 || m.image) && (
                              <div className="mt-1.5 rounded-lg overflow-hidden border border-black/30 bg-black/40">
                                <a href={m.attachmentUrl || m.imageBase64 || m.image} target="_blank" rel="noreferrer">
                                  <img
                                    src={m.attachmentUrl || m.imageBase64 || m.image}
                                    alt="Payment Proof Screenshot"
                                    className="max-h-48 w-full object-contain hover:scale-105 transition-transform cursor-pointer"
                                  />
                                </a>
                                <span className="text-[9px] block p-1 text-center opacity-80 underline">
                                  Click to view full image
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Selected Image Attachment Preview Banner */}
                {chatSelectedImage && (
                  <div className="mb-2 p-2 bg-slate-900 border border-cyan-500/30 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src={chatSelectedImage} alt="Attachment Preview" className="h-9 w-9 object-cover rounded-lg border border-cyan-400" />
                      <span className="text-[11px] font-mono text-cyan-300">Screenshot Attached</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setChatSelectedImage(null)}
                      className="p-1 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/40 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* Chat Input Form */}
                <form onSubmit={handleSendChatMessage} className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={chatFileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleChatImageUpload}
                  />
                  <button
                    type="button"
                    onClick={() => chatFileInputRef.current?.click()}
                    title="Attach Payment Proof Screenshot"
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 hover:border-cyan-500/50 transition-all cursor-pointer flex items-center justify-center shrink-0"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </button>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type message to agent..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() && !chatSelectedImage}
                    className="p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            ) : (
              <div className="m-auto text-center text-slate-500 text-xs">
                Select an order from the list on the left to view details and chat.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      <AnimatePresence>
        {showDisputeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <div className="bg-slate-900 border border-rose-500/40 rounded-2xl p-5 max-w-md w-full text-white space-y-4">
              <h3 className="font-bold text-sm text-rose-400 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5" /> Raise P2P Order Dispute
              </h3>
              <p className="text-xs text-slate-300">
                This will escalate order #{activeOrder?.id} to Sub-Admin Arbitrators to inspect payment proof and resolve the transaction.
              </p>
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="State reason for dispute (e.g. Agent not responding, TXID verified on-chain, etc.)..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white h-24 focus:outline-none focus:border-rose-500"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowDisputeModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRaiseDisputeSubmit}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold cursor-pointer"
                >
                  Escalate Dispute
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
