import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Coins, Copy, Check, X, ArrowRight, ShieldCheck, 
  ArrowUpRight, ArrowDownLeft, MessageSquare, Sparkles, RefreshCw, QrCode, Globe, Zap,
  AlertTriangle, Lock
} from "lucide-react";
import { casinoAudio } from "../lib/audioService";
import { getBankingRequests } from "../constants/bankingRequests";
import { saveBankingRequestToDatabase } from "../lib/db";
import { 
  getMasterCryptoWallets, 
  getCryptoBonusPercent, 
  getCryptoQrUrl, 
  MasterCryptoWallet 
} from "../lib/cryptoConfig";
import { hasPlayerCompletedDeposit } from "../lib/depositBonusHelper";
import TransactionChatBox from "./TransactionChatBox";
import P2PCashierModal from "./P2PCashierModal";
import { BankingRequest } from "../types";

interface CurrentUser {
  role: string;
  name: string;
  phoneNumber?: string;
  email?: string;
  loggedInVia?: string;
}

interface CryptoDepositProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: CurrentUser | null;
  userChips?: number;
  onUpdateChips?: (newAmount: number) => void;
  onAddAuditLog?: (msg: string, type: "info" | "warning" | "success" | "danger") => void;
}

export default function CryptoDeposit({
  isOpen,
  onClose,
  currentUser,
  userChips,
  onUpdateChips,
  onAddAuditLog,
}: CryptoDepositProps) {
  const [activeTab, setActiveTab] = useState<"p2p" | "deposit" | "withdraw" | "my_transactions">("p2p");
  const [selectedMethodCategory, setSelectedMethodCategory] = useState<"binance" | "web3">("binance");
  const [copied, setCopied] = useState(false);
  const [wallets, setWallets] = useState<MasterCryptoWallet[]>(() => getMasterCryptoWallets());
  const [selectedWalletId, setSelectedWalletId] = useState<string>("BINANCE_PAY");
  const [bonusPercent, setBonusPercent] = useState<number>(() => getCryptoBonusPercent());

  // Form states
  const [depositUsdt, setDepositUsdt] = useState<string>("");
  const [depositTxid, setDepositTxid] = useState<string>("");

  const [withdrawUsdt, setWithdrawUsdt] = useState<string>("");
  const [withdrawDestAddress, setWithdrawDestAddress] = useState<string>("");

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [exchangeRate] = useState<number>(1); // 1 USDT = 1 USDT Chip

  // Chat Modal State
  const [chatRequest, setChatRequest] = useState<BankingRequest | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Player's requests history
  const [playerRequests, setPlayerRequests] = useState<BankingRequest[]>([]);

  const hasCompletedDeposit = hasPlayerCompletedDeposit(currentUser?.email);

  // Reload wallets & config
  const refreshWallets = () => {
    const fresh = getMasterCryptoWallets();
    setWallets(fresh);
    setBonusPercent(getCryptoBonusPercent());

    // Auto-select initial wallet if selected is missing
    if (!fresh.find(w => w.id === selectedWalletId)) {
      const match = fresh.find(w => w.methodCategory === selectedMethodCategory && w.enabled);
      if (match) setSelectedWalletId(match.id);
    }
  };

  const loadPlayerRequests = () => {
    const allReqs = getBankingRequests();
    const userEmail = currentUser?.email || currentUser?.name || "";
    const filtered = allReqs.filter(r => 
      r.playerEmail?.toLowerCase() === userEmail.toLowerCase() ||
      r.playerName?.toLowerCase() === currentUser?.name?.toLowerCase()
    );
    setPlayerRequests(filtered);
  };

  useEffect(() => {
    refreshWallets();
    loadPlayerRequests();

    const handleStorage = () => {
      refreshWallets();
      loadPlayerRequests();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("crypto_config_updated", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("crypto_config_updated", handleStorage);
    };
  }, [currentUser]);

  // When changing category (Binance vs Web3), pick the first enabled wallet in that category
  const handleCategoryChange = (cat: "binance" | "web3") => {
    casinoAudio.playClick();
    setSelectedMethodCategory(cat);
    const available = wallets.filter(w => w.enabled && (w.methodCategory === cat || (cat === "binance" && w.id.includes("BINANCE"))));
    if (available.length > 0) {
      setSelectedWalletId(available[0].id);
    }
  };

  if (!isOpen) return null;

  const currentMasterWallet = wallets.find(w => w.id === selectedWalletId) || wallets[0];
  const masterAddress = currentMasterWallet?.address || "284910385";
  const qrUrl = getCryptoQrUrl(masterAddress);

  // Deposit calculations
  const approvedDepositsCount = playerRequests.filter(r => r.type === "deposit" && r.status === "approved").length;
  const activeBonusPercent = approvedDepositsCount === 0 ? 200 : approvedDepositsCount === 1 ? 300 : 400;
  const currentTierLabel = approvedDepositsCount === 0 ? "1st Deposit (200% Match)" : approvedDepositsCount === 1 ? "2nd Deposit (300% Match)" : "3rd Deposit (400% Match)";

  const baseUsdtNum = parseFloat(depositUsdt) || 0;
  const baseChips = Math.floor(baseUsdtNum * exchangeRate);
  const bonusChips = Math.floor(baseChips * (activeBonusPercent / 100));
  const totalChipsToReceive = baseChips + bonusChips;

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(masterAddress);
    setCopied(true);
    casinoAudio.playChipClink();
    setTimeout(() => setCopied(false), 2000);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Submit Deposit
  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (baseUsdtNum < 10) {
      casinoAudio.playLose();
      showToast(`❌ Minimum deposit limit is $10 USDT.`);
      return;
    }

    if (!depositTxid.trim()) {
      casinoAudio.playLose();
      showToast(selectedMethodCategory === "binance" ? "❌ Please enter Binance Pay Order ID / Ref." : "❌ Please enter the transaction Hash / TXID.");
      return;
    }

    const username = currentUser?.name || "Player";
    const playerEmail = currentUser?.email || `${username.toLowerCase().replace(/\s+/g, "")}@casino.com`;

    const depositId = "TX-CRYPTO-" + Math.random().toString(36).substring(2, 9).toUpperCase();

    const newRequest: BankingRequest = {
      id: depositId,
      type: "deposit",
      playerEmail,
      playerName: username,
      transactionId: depositTxid.trim(),
      amount: baseChips,
      status: "pending",
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isCrypto: true,
      paymentCategory: selectedMethodCategory,
      cryptoAsset: currentMasterWallet.symbol,
      cryptoWalletAddress: masterAddress,
      cryptoTxHash: depositTxid.trim(),
    };

    saveBankingRequestToDatabase(newRequest as any);

    if (onAddAuditLog) {
      onAddAuditLog(
        `CRYPTO DEPOSIT [${selectedMethodCategory.toUpperCase()}]: ${username} submitted ${baseUsdtNum} ${currentMasterWallet.symbol} (${currentMasterWallet.network}). Pure Deposit Request: $${baseChips.toLocaleString()} (Pending 🎁 ${activeBonusPercent}% Match Bonus: +$${bonusChips.toLocaleString()}). Ref/TXID: ${depositTxid.trim()}`,
        "info"
      );
    }

    casinoAudio.playWin();
    showToast(`✅ Deposit Submitted! Sub-Admin verification queue notified.`);

    setDepositUsdt("");
    setDepositTxid("");

    loadPlayerRequests();

    // Auto-open live chat for this request!
    setTimeout(() => {
      setChatRequest(newRequest);
      setIsChatOpen(true);
    }, 800);
  };

  // Submit Withdrawal
  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const hasCompletedDep = hasPlayerCompletedDeposit(currentUser?.email);
    if (!hasCompletedDep) {
      casinoAudio.playLose();
      showToast("🔒 Withdrawal feature is locked until you complete at least 1 successful deposit ($10+).");
      return;
    }

    const withdrawUsdtNum = parseFloat(withdrawUsdt) || 0;
    if (withdrawUsdtNum < 50) {
      casinoAudio.playLose();
      showToast(`❌ Minimum withdrawal limit is $50 USDT.`);
      return;
    }

    if (userChips !== undefined && userChips < 50) {
      casinoAudio.playLose();
      showToast(`❌ Low Balance Warning: Minimum Withdrawal Limit is $50.00. Current Balance: $${userChips.toFixed(2)}.`);
      return;
    }

    if (!withdrawDestAddress.trim()) {
      casinoAudio.playLose();
      showToast(selectedMethodCategory === "binance" ? "❌ Please enter your Binance Pay ID / Email." : "❌ Please enter your Web3 wallet address.");
      return;
    }

    const username = currentUser?.name || "Player";
    const playerEmail = currentUser?.email || `${username.toLowerCase().replace(/\s+/g, "")}@casino.com`;
    const withdrawChips = Math.floor(withdrawUsdtNum * exchangeRate);

    // Enforce Non-negative Balance Check
    if (userChips !== undefined && userChips < withdrawChips) {
      casinoAudio.playLose();
      showToast(`❌ Insufficient Balance! Available: $${userChips.toLocaleString()} Chips.`);
      return;
    }

    const withdrawId = "WD-CRYPTO-" + Math.random().toString(36).substring(2, 9).toUpperCase();

    const newRequest: BankingRequest = {
      id: withdrawId,
      type: "withdraw",
      playerEmail,
      playerName: username,
      transactionId: withdrawId,
      amount: withdrawChips,
      status: "pending_admin_approval",
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isCrypto: true,
      paymentCategory: selectedMethodCategory,
      cryptoAsset: currentMasterWallet.symbol,
      cryptoWalletAddress: withdrawDestAddress.trim(),
    };

    saveBankingRequestToDatabase(newRequest as any);

    // Deduct balance immediately from user view (escrow hold)
    if (userChips !== undefined && onUpdateChips) {
      onUpdateChips(Math.max(0, userChips - withdrawChips));
    }

    if (onAddAuditLog) {
      onAddAuditLog(
        `CRYPTO WITHDRAWAL [${selectedMethodCategory.toUpperCase()}]: ${username} requested withdrawal of ${withdrawUsdtNum} ${currentMasterWallet.symbol} ($${withdrawChips.toLocaleString()} Chips) to [${withdrawDestAddress.trim()}]. Status: pending_admin_approval. Funds escrowed.`,
        "info"
      );
    }

    casinoAudio.playWin();
    showToast(`✅ Withdrawal Request Submitted! $${withdrawChips.toLocaleString()} Chips escrowed awaiting Admin Approval.`);

    setWithdrawUsdt("");
    setWithdrawDestAddress("");

    loadPlayerRequests();

    // Auto-open live chat for this request!
    setTimeout(() => {
      setChatRequest(newRequest);
      setIsChatOpen(true);
    }, 800);
  };

  const categoryWallets = wallets.filter(w => w.enabled && (
    selectedMethodCategory === "binance" 
      ? w.methodCategory === "binance" || w.id.includes("BINANCE")
      : w.methodCategory === "web3" || !w.id.includes("BINANCE")
  ));

  return (
    <>
      <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
        {/* Toast Notification */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 bg-slate-900 border border-amber-500/50 rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.3)] text-center text-xs font-mono font-bold text-white max-w-sm"
            >
              {toastMessage}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ scale: 0.93, y: 25, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.93, y: 25, opacity: 0 }}
          className="relative w-full max-w-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 rounded-3xl border border-amber-500/40 shadow-[0_0_60px_rgba(245,158,11,0.2)] overflow-hidden"
        >
          {/* Top Gold Accent Bar */}
          <div className="h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 w-full" />

          {/* Modal Header */}
          <div className="p-5 sm:p-6 pb-3 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 font-mono shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                <Coins className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-mono text-base sm:text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                  Crypto & Web3 Payment Terminal
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[9px] text-emerald-400 font-bold">
                    VERIFIED
                  </span>
                </h3>
                <p className="text-[10px] font-mono text-amber-300/90 font-bold">
                  CRYPTO INSTANT DEPOSIT AND GET UP-TO 400% INSTANT DEPOSIT BONUS
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                casinoAudio.playClick();
                onClose();
              }}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Nav Tabs */}
          <div className="px-5 pt-3 flex gap-2 border-b border-white/5 bg-slate-950/60 overflow-x-auto">
            <button
              onClick={() => { casinoAudio.playClick(); setActiveTab("p2p"); }}
              className={`pb-3 px-4 text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 cursor-pointer border-b-2 whitespace-nowrap ${
                activeTab === "p2p"
                  ? "text-emerald-400 border-emerald-400 bg-emerald-500/10 rounded-t-xl"
                  : "text-slate-400 border-transparent hover:text-slate-200"
              }`}
            >
              <Zap className="h-4 w-4 text-emerald-400 animate-pulse" />
              <span>⚡ P2P Agent Network (Local / Crypto)</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px]">DEFAULT</span>
            </button>

            <button
              onClick={() => { casinoAudio.playClick(); setActiveTab("deposit"); }}
              className={`pb-3 px-4 text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 cursor-pointer border-b-2 whitespace-nowrap ${
                activeTab === "deposit"
                  ? "text-amber-400 border-amber-400 bg-amber-500/10 rounded-t-xl"
                  : "text-slate-400 border-transparent hover:text-slate-200"
              }`}
            >
              <Globe className="h-4 w-4 text-amber-400" />
              <span>🌐 Direct Crypto Gateway (Binance Pay / Wallet)</span>
            </button>

            <button
              onClick={() => { casinoAudio.playClick(); setActiveTab("withdraw"); }}
              className={`pb-3 px-4 text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 cursor-pointer border-b-2 whitespace-nowrap ${
                activeTab === "withdraw"
                  ? "text-rose-400 border-rose-400 bg-rose-500/10 rounded-t-xl"
                  : "text-slate-400 border-transparent hover:text-slate-200"
              }`}
            >
              <ArrowUpRight className="h-4 w-4" />
              <span>Crypto Withdraw {!hasCompletedDeposit && "🔒 (Locked)"}</span>
            </button>

            <button
              onClick={() => { casinoAudio.playClick(); setActiveTab("my_transactions"); }}
              className={`pb-3 px-4 text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 cursor-pointer border-b-2 whitespace-nowrap ${
                activeTab === "my_transactions"
                  ? "text-cyan-400 border-cyan-400 bg-cyan-500/10 rounded-t-xl"
                  : "text-slate-400 border-transparent hover:text-slate-200"
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span>Status & Live Chat ({playerRequests.length})</span>
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">

            {activeTab === "p2p" && (
              <P2PCashierModal
                currentUser={currentUser}
                onClose={onClose}
                onAddAuditLog={onAddAuditLog}
              />
            )}

            {/* UP-TO 400% INSTANT DEPOSIT BONUS PROMOTIONAL CARD */}
            {activeTab === "deposit" && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-indigo-950/80 border border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)] font-mono space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
                    CRYPTO INSTANT DEPOSIT AND GET UP-TO 400% INSTANT DEPOSIT BONUS
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                    {activeBonusPercent}% MATCH ACTIVE
                  </span>
                </div>
                <p className="text-[11px] font-bold text-emerald-300 leading-relaxed">
                  CRYPTO INSTANT DEPOSIT AND GET UP-TO 400% INSTANT DEPOSIT BONUS, 200% MATCH ON 1ST DEPOSIT + 300% MATCH ON 2ND DEPOSIT + 400% MATCH ON 3RD DEPOSIT
                </p>
                <div className="grid grid-cols-3 gap-2 pt-1 text-[10px]">
                  <div className={`p-2 rounded-xl border text-center font-bold transition-all ${approvedDepositsCount === 0 ? "bg-amber-500/30 border-amber-400 text-amber-200 ring-1 ring-amber-400" : "bg-slate-900/60 border-slate-800 text-slate-400"}`}>
                    <span className="block text-[8px] uppercase tracking-wider opacity-80">1st Deposit</span>
                    <span className="text-xs font-black">200% Match</span>
                  </div>
                  <div className={`p-2 rounded-xl border text-center font-bold transition-all ${approvedDepositsCount === 1 ? "bg-cyan-500/30 border-cyan-400 text-cyan-200 ring-1 ring-cyan-400" : "bg-slate-900/60 border-slate-800 text-slate-400"}`}>
                    <span className="block text-[8px] uppercase tracking-wider opacity-80">2nd Deposit</span>
                    <span className="text-xs font-black">300% Match</span>
                  </div>
                  <div className={`p-2 rounded-xl border text-center font-bold transition-all ${approvedDepositsCount >= 2 ? "bg-purple-500/30 border-purple-400 text-purple-200 ring-1 ring-purple-400" : "bg-slate-900/60 border-slate-800 text-slate-400"}`}>
                    <span className="block text-[8px] uppercase tracking-wider opacity-80">3rd Deposit</span>
                    <span className="text-xs font-black">400% Match</span>
                  </div>
                </div>
              </div>
            )}

            {/* 2 PRIMARY PAYMENT METHOD OPTIONS: BINANCE PAY vs WEB3 PAYMENT */}
            {(activeTab === "deposit" || activeTab === "withdraw") && (
              <div className="space-y-3">
                <label className="text-[11px] font-mono text-amber-300 uppercase tracking-wider block font-bold">
                  Select Payment Option:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* OPTION 1: BINANCE PAY */}
                  <button
                    type="button"
                    onClick={() => handleCategoryChange("binance")}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                      selectedMethodCategory === "binance"
                        ? "bg-amber-950/60 border-amber-400 shadow-[0_0_20px_rgba(240,185,11,0.3)] ring-1 ring-amber-400/50"
                        : "bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-80"
                    }`}
                  >
                    <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 text-xl font-bold shrink-0">
                      🟡
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-xs text-white uppercase tracking-wider">Option 1: Binance Pay</span>
                        <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-400 text-[8px] font-bold rounded uppercase">0% Fee</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">Instant transfer via Binance Pay ID & QR</p>
                    </div>
                  </button>

                  {/* OPTION 2: WEB3 PAYMENT */}
                  <button
                    type="button"
                    onClick={() => handleCategoryChange("web3")}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                      selectedMethodCategory === "web3"
                        ? "bg-cyan-950/60 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400/50"
                        : "bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-80"
                    }`}
                  >
                    <div className="h-10 w-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 text-xl font-bold shrink-0">
                      🌐
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-xs text-white uppercase tracking-wider">Option 2: Web3 Payment</span>
                        <span className="px-1.5 py-0.2 bg-cyan-500/20 text-cyan-400 text-[8px] font-bold rounded uppercase">On-Chain</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">TRC20, BEP20, BTC, ETH, SOL Direct Wallets</p>
                    </div>
                  </button>
                </div>

                {/* Network / Master Wallet Selector inside Category */}
                <div className="pt-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block mb-1.5">
                    Choose Network / Asset:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {categoryWallets.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => { casinoAudio.playClick(); setSelectedWalletId(w.id); }}
                        className={`p-2.5 rounded-2xl border text-left font-mono transition-all cursor-pointer flex flex-col justify-between ${
                          selectedWalletId === w.id
                            ? "bg-amber-950/40 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)] text-white"
                            : "bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black" style={{ color: w.color }}>
                            {w.icon} {w.symbol}
                          </span>
                          <span className="text-[8.5px] px-1.5 py-0.5 rounded bg-black/40 text-slate-300 font-bold">
                            {w.network.split("(")[1]?.replace(")", "") || w.network}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-300 font-semibold truncate mt-1">
                          {w.network}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 1: DEPOSIT FLOW */}
            {activeTab === "deposit" && (
              <form onSubmit={handleDepositSubmit} className="space-y-5">
                {/* Centralized Master Wallet Address & QR Box */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/30 via-slate-950 to-slate-900 border border-amber-500/40 space-y-3">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* QR Code */}
                    <div className="p-2 rounded-2xl bg-white border border-amber-400 shrink-0 shadow-[0_0_15px_rgba(255,215,0,0.3)]">
                      <img
                        src={qrUrl}
                        alt="Master Wallet QR Code"
                        className="w-28 h-28 sm:w-32 sm:h-32 object-contain"
                      />
                    </div>

                    {/* Master Receiving Address Details */}
                    <div className="flex-1 space-y-2 text-center sm:text-left w-full">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-widest flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                          {selectedMethodCategory === "binance" ? "Official Binance Pay Receiving ID" : "Platform Admin Confirmed Web3 Wallet"}
                        </span>
                        <span className="text-[9px] font-mono text-emerald-400 font-extrabold uppercase bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Confirmed & Active
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-amber-300 font-bold break-all flex items-center justify-between gap-2">
                        <span className="select-all">{masterAddress}</span>
                        <button
                          type="button"
                          onClick={handleCopyAddress}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-bold uppercase cursor-pointer shrink-0 flex items-center gap-1"
                        >
                          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          <span>{copied ? "Copied" : "Copy"}</span>
                        </button>
                      </div>

                      <p className="text-[10px] font-mono text-slate-400 leading-tight">
                        {selectedMethodCategory === "binance" ? (
                          <span>⚡ Open Binance App ➔ Pay ➔ Send to Pay ID <strong>{masterAddress}</strong>. Minimum: <strong className="text-amber-300">${currentMasterWallet.minDeposit} USDT</strong>.</span>
                        ) : (
                          <span>⚠️ Send only <strong className="text-white">{currentMasterWallet.network}</strong> to this address. Min Deposit: <strong className="text-amber-300">${currentMasterWallet.minDeposit} USDT</strong>.</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Amount Input & Live +20% Bonus Calculator */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-slate-300 uppercase tracking-wider block font-bold">
                      Deposit Amount ({currentMasterWallet.symbol}):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={depositUsdt}
                      onChange={(e) => setDepositUsdt(e.target.value)}
                      placeholder={`Min $${currentMasterWallet.minDeposit}`}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-600 focus:outline-none"
                    />
                  </div>

                  {/* Bonus Breakdown Preview Card */}
                  <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-1 font-mono text-xs">
                    <div className="flex justify-between text-slate-300 text-[10.5px]">
                      <span>Base Chips (1 USDT = 1 USDT Chip):</span>
                      <span className="font-bold">${baseChips.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-amber-300 text-[10.5px]">
                      <span>🎁 {activeBonusPercent}% Match Bonus ({currentTierLabel}):</span>
                      <span className="font-bold">+${bonusChips.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-emerald-400 text-xs font-black border-t border-amber-500/20 pt-1 mt-1">
                      <span>Total Credited Balance:</span>
                      <span>${totalChipsToReceive.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* TXID / Hash input */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-slate-300 uppercase tracking-wider block font-bold">
                    {selectedMethodCategory === "binance" ? "Binance Pay Order ID / Transaction Reference:" : "Web3 Transaction Hash / TXID (Required):"}
                  </label>
                  <input
                    type="text"
                    value={depositTxid}
                    onChange={(e) => setDepositTxid(e.target.value)}
                    placeholder={selectedMethodCategory === "binance" ? "Paste Binance Pay Order ID or Transaction Ref..." : "Paste your blockchain transaction hash / TXID here..."}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none"
                  />
                </div>

                {/* Submit Deposit Button */}
                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-mono font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-[0_0_25px_rgba(245,158,11,0.5)] active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Submit Deposit for Live Sub-Admin Verification</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}

            {/* TAB 2: WITHDRAWAL FLOW */}
            {activeTab === "withdraw" && (
              !hasCompletedDeposit ? (
                <div className="p-6 rounded-2xl bg-slate-950 border border-amber-500/40 text-center space-y-4 font-mono shadow-xl">
                  <div className="h-14 w-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-3xl">
                    🔒
                  </div>
                  <div className="space-y-1.5 max-w-md mx-auto">
                    <h4 className="text-sm font-black text-amber-300 uppercase tracking-wider">
                      Withdrawal Option Locked
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      To ensure platform compliance and account verification, the withdrawal portal is initially locked for new accounts until you complete at least <strong>1 successful deposit of $10 or more</strong>.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-[11px] text-amber-400 font-bold">
                    ⚡ Once your first deposit is confirmed, the withdrawal portal is permanently unlocked!
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      casinoAudio.playClick();
                      setActiveTab("deposit");
                    }}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 hover:brightness-110 text-slate-950 font-mono font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer"
                  >
                    Make a $10+ Deposit Now
                  </button>
                </div>
              ) : (
                <form onSubmit={handleWithdrawSubmit} className="space-y-5">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-rose-500/30 space-y-3">
                    <h4 className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ArrowUpRight className="h-4 w-4" />
                      {selectedMethodCategory === "binance" ? "Binance Pay Withdrawal to Your Binance Account" : "Direct Web3 Crypto Withdrawal to Your External Wallet"}
                    </h4>
                    <p className="text-[10.5px] font-mono text-slate-400">
                      Sub-Admins review and send withdrawals directly to your {selectedMethodCategory === "binance" ? "Binance Pay ID / Email" : "Web3 wallet address"}. Zero network fees charged by casino.
                    </p>
                  </div>

                  {/* Low Balance Warning Badge if Balance < $50 */}
                  {(userChips !== undefined && userChips < 50) && (
                    <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs font-mono flex items-start gap-2.5 shadow-md">
                      <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                      <div className="space-y-1">
                        <strong className="block font-bold text-amber-300">
                          ⚠️ Minimum Withdrawal Limit is $50.00. Current Balance: ${userChips.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                        <span className="block text-[11px] text-slate-300 font-sans">
                          You need a minimum real cash balance of <strong>$50.00</strong> to execute a withdrawal.
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-slate-300 uppercase tracking-wider block font-bold">
                      Withdrawal Amount in USDT (${currentMasterWallet.symbol}):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={withdrawUsdt}
                      onChange={(e) => setWithdrawUsdt(e.target.value)}
                      placeholder="Min $50.00 USDT"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-600 focus:outline-none"
                    />
                    <span className="text-[10px] font-mono text-slate-400">
                      Equivalent Casino Chips to deduct: <strong className="text-rose-400">${(parseFloat(withdrawUsdt || "0") * exchangeRate).toLocaleString()}</strong> (Min Limit: $50.00)
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-slate-300 uppercase tracking-wider block font-bold">
                      {selectedMethodCategory === "binance" ? "Your Binance Pay ID / Registered Binance Email:" : `Your ${currentMasterWallet.network} Destination Wallet Address:`}
                    </label>
                    <input
                      type="text"
                      value={withdrawDestAddress}
                      onChange={(e) => setWithdrawDestAddress(e.target.value)}
                      placeholder={selectedMethodCategory === "binance" ? "Enter your Binance Pay ID or Email..." : `Paste your ${currentMasterWallet.symbol} receiving wallet address...`}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={(userChips !== undefined && userChips < 50) || parseFloat(withdrawUsdt || "0") < 50}
                    className={`w-full py-3.5 font-mono font-black text-xs uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 ${
                      (userChips !== undefined && userChips < 50) || parseFloat(withdrawUsdt || "0") < 50
                        ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60"
                        : "bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white shadow-[0_0_25px_rgba(225,29,72,0.5)] active:scale-95 cursor-pointer"
                    }`}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    <span>Submit Crypto Withdrawal Request</span>
                  </button>
                </form>
              )
            )}

            {/* TAB 3: MY TRANSACTIONS & LIVE CHAT LIST */}
            {activeTab === "my_transactions" && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">
                    My Recent Crypto Transactions
                  </h4>
                  <button
                    onClick={loadPlayerRequests}
                    className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white text-xs font-mono flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Refresh</span>
                  </button>
                </div>

                {playerRequests.length === 0 ? (
                  <div className="p-8 text-center bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                    <p className="text-xs font-mono text-slate-400">
                      No crypto transactions found for your account yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {playerRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              req.type === "deposit" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                            }`}>
                              {req.type}
                            </span>
                            <span className="text-xs font-bold text-white">{req.id}</span>
                            <span className={`px-2 py-0.5 rounded text-[8.5px] font-bold uppercase ${
                              req.status === "approved"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : req.status === "rejected"
                                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse"
                            }`}>
                              {req.status}
                            </span>
                          </div>

                          <p className="text-[10.5px] text-slate-400">
                            Amount: <strong className="text-white">${req.amount?.toLocaleString()}</strong> • {req.cryptoAsset || "Crypto"} • {req.date} {req.time || ""}
                          </p>
                          {req.cryptoTxHash && (
                            <p className="text-[9.5px] text-amber-300/80 truncate max-w-sm">
                              Ref/TXID: {req.cryptoTxHash}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            casinoAudio.playClick();
                            setChatRequest(req);
                            setIsChatOpen(true);
                          }}
                          className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.3)] shrink-0"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>Open Live Verification Chat</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </motion.div>
      </div>

      {/* Transaction Live Chat Box */}
      {isChatOpen && chatRequest && (
        <TransactionChatBox
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          request={chatRequest}
          currentUser={{
            name: currentUser?.name || "Player",
            role: "player",
            email: currentUser?.email,
          }}
        />
      )}
    </>
  );
}
