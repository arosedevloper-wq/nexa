import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  User, Lock, Key, Eye, EyeOff, Landmark, TrendingUp, History, Coins, 
  ArrowUpRight, ArrowDownRight, Award, Share2, Copy, Check, Users, Gift, 
  ExternalLink, ShieldCheck, Clock, Smartphone, AlertCircle, Shield, Sparkles,
  MessageSquare, Send, BarChart3, Briefcase, PieChart, Activity, Trophy, Zap, CreditCard, ChevronRight, Plus, Flame, Target
} from "lucide-react";
import { Transaction, ChatMessage } from "../types";
import { DEFAULT_P2P_AGENTS, getMergedP2PAgents } from "../constants/p2pAgents";
import { getRegisteredPlayers } from "../constants/defaultPlayers";
import { getBankingRequests } from "../constants/bankingRequests";
import { getReferralEvents, getReferralSettings } from "../constants/referralData";
import { getPlayerActivities, PlayerActivity } from "../lib/activityTracker";
import { casinoAudio } from "../lib/audioService";
import { saveBankingRequestToDatabase, saveAllBankingRequestsToDatabase, saveChatMessageToDatabase, savePlayerToDatabase, saveAllPlayersToDatabase } from "../lib/db";
import { motion, AnimatePresence } from "motion/react";
import CryptoDeposit from "./CryptoDeposit";
import TransactionChatBox from "./TransactionChatBox";

interface RegisteredPlayer {
  name: string;
  email: string;
  phoneNumber: string;
  password?: string;
  referralCode?: string;
  referredBy?: string;
  referralChipsEarned?: number;
  unclaimedReferralChips?: number;
}

interface PlayerProfileProps {
  chips: number;
  bonusBalance?: number;
  totalWagerRequired?: number;
  currentWagerProgress?: number;
  cumulativeLosses?: number;
  loanCount: number;
  transactions: Transaction[];
  onPaybackLoan: () => void;
  peakChips: number;
  currentUser: { name: string; role: string; loggedInVia?: string; email?: string } | null;
  onClaimReferralRewards: (amount: number) => void;
  onUpdateChips?: (amount: number) => void;
  onAddAuditLog?: (msg: string, type: "info" | "warning" | "success" | "danger") => void;
}

export default function PlayerProfile({
  chips,
  bonusBalance = 0,
  totalWagerRequired = 0,
  currentWagerProgress = 0,
  cumulativeLosses = 0,
  loanCount,
  transactions,
  onPaybackLoan,
  peakChips,
  currentUser,
  onClaimReferralRewards,
  onUpdateChips,
  onAddAuditLog,
}: PlayerProfileProps) {
  const totalDebt = loanCount * 500;

  // Dynamic P2P Mobile Banking Agents (Max 25, customizable by Admin)
  const [p2pAgents, setP2pAgents] = useState<any[]>(() => {
    return getMergedP2PAgents();
  });

  // Tabs: portfolio, account, banking, referrals, crypto, chat
  const [activeTab, setActiveTab] = useState<"portfolio" | "account" | "banking" | "referrals" | "crypto" | "chat">("portfolio");
  const [isCryptoDepositOpen, setIsCryptoDepositOpen] = useState(false);
  const [chatTxRequest, setChatTxRequest] = useState<any | null>(null);
  const [isTxChatOpen, setIsTxChatOpen] = useState(false);

  // Load and sync players
  const [players, setPlayers] = useState<RegisteredPlayer[]>(() => {
    return getRegisteredPlayers() as any;
  });

  const activePlayer = useMemo(() => {
    if (!currentUser) return null;
    const found = players.find(p => 
      (p.email && currentUser.email && p.email.toLowerCase() === currentUser.email.toLowerCase()) || 
      (p.name && currentUser.name && p.name.toLowerCase() === currentUser.name.toLowerCase())
    );
    if (found) return found;

    // Robust fallback for any authenticated user so banking/profile flows never block
    return {
      name: currentUser.name,
      email: currentUser.email || `${currentUser.name.toLowerCase().replace(/\s+/g, "")}@royalcasino.com`,
      phoneNumber: (currentUser as any).phoneNumber || "01700-000000",
      referralCode: currentUser.name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5) + "777",
      referralChipsEarned: 0,
      unclaimedReferralChips: 0,
      password: (currentUser as any).password || undefined
    };
  }, [players, currentUser]);

  const activeReferralCode = activePlayer?.referralCode || (activePlayer?.name ? activePlayer.name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5) + "777" : "VIP777");
  const referralChipsEarned = activePlayer?.referralChipsEarned || 0;
  const unclaimedReferralChips = activePlayer?.unclaimedReferralChips || 0;

  // Load referral events
  const [events, setEvents] = useState<any[]>(() => {
    return getReferralEvents();
  });

  const myReferrals = useMemo(() => {
    if (!activePlayer || !activePlayer.email) return [];
    return events.filter(ev => ev.referrerEmail && ev.referrerEmail.toLowerCase() === activePlayer.email.toLowerCase());
  }, [events, activePlayer]);

  // Load referral global settings
  const refSettings = useMemo(() => {
    return getReferralSettings();
  }, []);

  // Copy helpers
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const referralLink = `${window.location.protocol}//${window.location.host}?ref=${activeReferralCode}`;

  // Crypto History states
  const [cryptoSearch, setCryptoSearch] = useState("");
  const [cryptoAssetFilter, setCryptoAssetFilter] = useState<"ALL" | "USDT" | "BTC" | "ETH" | "SOL">("ALL");
  const [cryptoStatusFilter, setCryptoStatusFilter] = useState<"ALL" | "pending" | "approved" | "rejected">("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const prevMessagesCountRef = useRef<number>(0);
  const prevActiveTabRef = useRef<string>("");
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [isAutoBotEnabled, setIsAutoBotEnabled] = useState(true);

  // Bot response generator function
  const triggerAutoBotResponse = (playerMessageText: string) => {
    if (!isAutoBotEnabled) return;
    
    setIsBotTyping(true);

    setTimeout(() => {
      const lower = playerMessageText.toLowerCase();
      let responseText = "Hey VIP! I've analyzed your profile and active session metrics. Let me know how I can guide your games or help with your ledger.";
      
      if (lower.includes("loan") || lower.includes("debt") || lower.includes("money") || lower.includes("credit") || lower.includes("borrow") || lower.includes("chips")) {
        responseText = "💸 EMERGENCY VANCE LOANS: You can secure an instant $500 top-up directly on your main dashboard when your balance runs low. No interest, cleared automatically from future winnings!";
      } else if (lower.includes("refer") || lower.includes("code") || lower.includes("friend") || lower.includes("invite") || lower.includes("bonus")) {
        responseText = "🎁 VIP REFERRAL SYSTEM: Share your unique referral link found in the 'VIP Referrals' tab. When they join, they'll receive welcome chips and you'll receive automated payouts!";
      } else if (lower.includes("deposit") || lower.includes("withdraw") || lower.includes("banking") || lower.includes("crypto") || lower.includes("cash") || lower.includes("pay")) {
        responseText = "⚡ INSTANT LEDGER PROCESSING: Our P2P Mobile Agents clear all cryptocurrency deposits (USDT, BTC, ETH) and mobile banking requests in less than 2 minutes. Submit your ticket via the Ledger tab!";
      } else if (lower.includes("game") || lower.includes("win") || lower.includes("blackjack") || lower.includes("slots") || lower.includes("crash") || lower.includes("play")) {
        responseText = "🎰 WINNING TIPS: Try Crash Turbo with auto-cashout at 1.5x, or stick to Blackjack where agent-certified RNG yields high return-to-player rates. Remember to bet responsibly!";
      } else if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey") || lower.includes("help") || lower.includes("support")) {
        responseText = "🤖 VANCEBOT AI: Hello! I am your 24/7 automated support concierge. Ask me anything about 'loans', 'deposits', 'referrals', or 'game tips' for instant guidance!";
      } else if (lower.includes("cheat") || lower.includes("admin") || lower.includes("fair") || lower.includes("rtp")) {
        responseText = "🛡️ SECURE FAIR PLAY: Every game in Vegas Vance's Royal Lounge is operated under certified cryptographic RNG standards. Your fair gameplay is 100% guaranteed.";
      }

      const botMsg: ChatMessage = {
        id: "bot-" + Date.now(),
        senderId: "vance_bot",
        senderName: "VanceBot AI (Support)",
        senderRole: "system",
        receiverId: currentUser?.email?.toLowerCase() || "",
        message: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false
      };

      const stored = localStorage.getItem("casino_chat_messages_v1");
      const allMsgs: ChatMessage[] = stored ? JSON.parse(stored) : [];
      const updated = [...allMsgs, botMsg];
      localStorage.setItem("casino_chat_messages_v1", JSON.stringify(updated));

      setMessages(prev => [...prev, botMsg]);
      setIsBotTyping(false);
      casinoAudio.playWin();
    }, 1500);
  };

  // Sync messages
  useEffect(() => {
    const loadMessages = () => {
      const stored = localStorage.getItem("casino_chat_messages_v1");
      let allMsgs: ChatMessage[] = stored ? JSON.parse(stored) : [];
      
      const myEmail = currentUser?.email?.toLowerCase() || "";
      if (!myEmail) return;

      // If empty, add a welcoming system message from Vegas Vance/Support
      const filterByMe = (m: ChatMessage) => 
        m.senderId.toLowerCase() === myEmail || 
        m.receiverId.toLowerCase() === myEmail ||
        (m.senderRole === "system" && m.receiverId.toLowerCase() === myEmail);

      const hasSystemWelcome = allMsgs.some(m => m.id === `welcome-system-${myEmail}`);
      if (!hasSystemWelcome) {
        const welcomeMsg: ChatMessage = {
          id: `welcome-system-${myEmail}`,
          senderId: "system",
          senderName: "Vegas Vance (VIP Host)",
          senderRole: "system",
          receiverId: myEmail,
          message: "Welcome to the Royal Support Lounge, partner! 🕶️ I'm Vegas Vance, your host. If you have questions about deposits, withdrawals, or custom betting limits, drop a note here and our official Agents will get right back to you!",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          read: true
        };
        allMsgs = [welcomeMsg, ...allMsgs];
        localStorage.setItem("casino_chat_messages_v1", JSON.stringify(allMsgs));
      }
      
      const filtered = allMsgs.filter(filterByMe);
      setMessages(filtered);

      // If activeTab is "chat", automatically mark any unread messages from agent/system to this player as read
      if (activeTab === "chat") {
        let updated = false;
        const newAllMsgs = allMsgs.map(m => {
          if (m.receiverId.toLowerCase() === myEmail && m.senderRole !== "player" && !m.read) {
            return { ...m, read: true };
          }
          return m;
        });
        // Check if anything actually changed to avoid infinite cycles
        const changed = JSON.stringify(allMsgs) !== JSON.stringify(newAllMsgs);
        if (changed) {
          localStorage.setItem("casino_chat_messages_v1", JSON.stringify(newAllMsgs));
        }
      }
    };

    loadMessages();
    const interval = setInterval(loadMessages, 2000);
    return () => clearInterval(interval);
  }, [activeTab, currentUser]);

  const scrollToBottomSupport = (force = false) => {
    if (!chatContainerRef.current) return;
    const container = chatContainerRef.current;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    if (force || isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Scroll to bottom when messages change or tab changes, respecting scroll position
  useEffect(() => {
    if (activeTab !== "chat") {
      prevActiveTabRef.current = activeTab;
      return;
    }

    const tabChanged = prevActiveTabRef.current !== "chat";
    const isNewMessage = messages.length > prevMessagesCountRef.current;

    if (tabChanged) {
      setTimeout(() => scrollToBottomSupport(true), 50);
      prevActiveTabRef.current = "chat";
    } else if (isNewMessage) {
      scrollToBottomSupport(false);
    }

    prevMessagesCountRef.current = messages.length;
  }, [messages, activeTab]);

  const unreadCount = useMemo(() => {
    const myEmail = currentUser?.email?.toLowerCase() || "";
    return messages.filter(m => m.receiverId.toLowerCase() === myEmail && m.senderRole !== "player" && !m.read).length;
  }, [messages, currentUser]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const typedText = chatInput.trim();
    if (!typedText || !currentUser?.email) return;

    const myEmail = currentUser.email.toLowerCase();
    const myName = currentUser.name || "Player";

    const newMsg: ChatMessage = {
      id: "msg-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      senderId: myEmail,
      senderName: myName,
      senderRole: "player",
      receiverId: "all_agents",
      message: typedText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    };

    const stored = localStorage.getItem("casino_chat_messages_v1");
    const allMsgs: ChatMessage[] = stored ? JSON.parse(stored) : [];
    const updated = [...allMsgs, newMsg];
    localStorage.setItem("casino_chat_messages_v1", JSON.stringify(updated));
    saveChatMessageToDatabase(newMsg);

    setMessages(prev => [...prev, newMsg]);
    setChatInput("");
    casinoAudio.playClick();

    // Fire automated AI Bot response
    triggerAutoBotResponse(typedText);
  };

  const [isSimulatingReply, setIsSimulatingReply] = useState(false);

  const simulateAgentReply = async () => {
    if (messages.length === 0) return;
    setIsSimulatingReply(true);
    casinoAudio.playClick();
    
    // Pick the last player message
    const playerMsgs = messages.filter(m => m.senderRole === "player");
    const lastPlayerMsg = playerMsgs[playerMsgs.length - 1]?.message || "Hello!";

    // Prepare simulated message
    setTimeout(() => {
      let replyText = "Hey there, VIP! I've reviewed your active profile ledger and everything looks absolutely stellar. How can I assist you with your games today?";
      
      const lower = lastPlayerMsg.toLowerCase();
      if (lower.includes("loan") || lower.includes("debt") || lower.includes("money") || lower.includes("credit")) {
        replyText = "Emergency loans are credited instantly! You can take a custom $500 top-up directly on your dashboard. Let me know if you run into any issues signing the ledger.";
      } else if (lower.includes("refer") || lower.includes("code") || lower.includes("friend") || lower.includes("invite")) {
        replyText = "Our VIP referral payout is 100% automated! Make sure your friends sign up using your unique link in the 'VIP Referrals' tab to claim your chips.";
      } else if (lower.includes("deposit") || lower.includes("withdraw") || lower.includes("banking") || lower.includes("crypto")) {
        replyText = "P2P Mobile agents process all mobile banking requests and crypto transfers instantly! Once you file a request in the Ledger tab, we clear it in less than 2 minutes.";
      } else if (lower.includes("game") || lower.includes("win") || lower.includes("blackjack") || lower.includes("slots") || lower.includes("crash")) {
        replyText = "Blackjack, Roulette, and Crash Turbo are hitting hot streaks right now! Remember to manage your bankroll and let those profits ride.";
      } else if (lower.includes("admin") || lower.includes("cheat") || lower.includes("rtp") || lower.includes("bias")) {
        replyText = "All games are operated under standard high-yield certified RNG parameters. Our P2P Mobile agents are dedicated to securing safe, premium gameplay.";
      }

      const simulatedMsg: ChatMessage = {
        id: "sim-" + Date.now(),
        senderId: "vance_support",
        senderName: "Agent Sarah (VIP Support)",
        senderRole: "agent",
        receiverId: currentUser?.email?.toLowerCase() || "",
        message: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false
      };

      const stored = localStorage.getItem("casino_chat_messages_v1");
      const allMsgs: ChatMessage[] = stored ? JSON.parse(stored) : [];
      const updated = [...allMsgs, simulatedMsg];
      localStorage.setItem("casino_chat_messages_v1", JSON.stringify(updated));
      saveChatMessageToDatabase(simulatedMsg);

      setMessages(prev => [...prev, simulatedMsg]);
      setIsSimulatingReply(false);
      casinoAudio.playWin();
    }, 1500);
  };


  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    casinoAudio.playClick();
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    casinoAudio.playClick();
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeReferralCode);
    setCopiedCode(true);
    casinoAudio.playClick();
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleClaimRewards = () => {
    if (!activePlayer || !unclaimedReferralChips || unclaimedReferralChips <= 0) return;
    
    // Claim via props
    onClaimReferralRewards(unclaimedReferralChips);

    // Update locally
    const updatedPlayers = players.map(p => {
      if (p.email && activePlayer?.email && p.email.toLowerCase() === activePlayer.email.toLowerCase()) {
        return {
          ...p,
          unclaimedReferralChips: 0
        };
      }
      return p;
    });
    setPlayers(updatedPlayers);
    localStorage.setItem("registered_players_v1", JSON.stringify(updatedPlayers));
    saveAllPlayersToDatabase(updatedPlayers as any);
    casinoAudio.playWin();
  };

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");

    if (!activePlayer) {
      setPwdError("Active player profile not found.");
      return;
    }

    if (activePlayer.password && currentPassword !== activePlayer.password) {
      setPwdError("Current password is incorrect.");
      return;
    }

    if (newPassword.length < 6) {
      setPwdError("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdError("New passwords do not match.");
      return;
    }

    // Update password in players list
    const updatedPlayers = players.map(p => {
      if (p.email && activePlayer?.email && p.email.toLowerCase() === activePlayer.email.toLowerCase()) {
        return { ...p, password: newPassword };
      }
      return p;
    });

    setPlayers(updatedPlayers);
    localStorage.setItem("registered_players_v1", JSON.stringify(updatedPlayers));
    saveAllPlayersToDatabase(updatedPlayers as any);
    
    setPwdSuccess("Password changed successfully! Keep it secure.");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    casinoAudio.playWin();
  };

  // Mobile & Crypto Banking Portal State
  const [bankingType, setBankingType] = useState<"deposit" | "withdraw">("deposit");
  const [bankingAmount, setBankingAmount] = useState<number>(5000);
  const [bankingService, setBankingService] = useState<string>("");
  const [bankingNumber, setBankingNumber] = useState<string>("");
  const [bankingError, setBankingError] = useState<string>("");
  const [bankingSuccess, setBankingSuccess] = useState<string>("");

  // Crypto specific state
  const [paymentMethod, setPaymentMethod] = useState<"mobile" | "crypto">("mobile");
  const [cryptoAsset, setCryptoAsset] = useState<"USDT" | "BTC" | "ETH" | "SOL">("USDT");
  const [playerCryptoWallet, setPlayerCryptoWallet] = useState<string>("");
  const [cryptoTxHash, setCryptoTxHash] = useState<string>("");

  // P2P Agent States
  const [selectedAgentId, setSelectedAgentId] = useState<string>("agent-1");
  const [activeP2PRequest, setActiveP2PRequest] = useState<any | null>(null);
  const [p2pChatMessages, setP2pChatMessages] = useState<any[]>([]);
  const [p2pInputText, setP2pInputText] = useState<string>("");
  const [isAgentTyping, setIsAgentTyping] = useState<boolean>(false);
  const [p2pStep, setP2pStep] = useState<"not_started" | "awaiting_agent_approval" | "awaiting_payment" | "verifying" | "completed">("not_started");
  const p2pMessagesEndRef = useRef<HTMLDivElement>(null);
  const p2pChatContainerRef = useRef<HTMLDivElement>(null);
  const prevP2pCountRef = useRef<number>(0);

  useEffect(() => {
    if (p2pChatMessages.length > prevP2pCountRef.current) {
      const container = p2pChatContainerRef.current;
      const isNearBottom = container ? (container.scrollHeight - container.scrollTop - container.clientHeight < 120) : true;
      if (isNearBottom) {
        p2pMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
    prevP2pCountRef.current = p2pChatMessages.length;
  }, [p2pChatMessages]);

  // Keep bankingRequests state synced with localStorage and update active P2P steps when admin approves
  useEffect(() => {
    const syncAndCheck = () => {
      // Sync P2P agents from localStorage dynamically (automatically merging any defaults)
      const mergedList = getMergedP2PAgents();
      setP2pAgents(prev => {
        if (JSON.stringify(prev) === JSON.stringify(mergedList)) {
          return prev;
        }
        return mergedList;
      });

      // Sync P2P chat messages from casino_chat_messages_v1
      if (activePlayer?.email) {
        const storedMsgsStr = localStorage.getItem("casino_chat_messages_v1");
        if (storedMsgsStr) {
          try {
            const parsedMsgs: ChatMessage[] = JSON.parse(storedMsgsStr);
            const myEmailLower = activePlayer.email.toLowerCase();
            const thread = parsedMsgs.filter(m => 
              (m.senderId && m.senderId.toLowerCase() === myEmailLower) || 
              (m.receiverId && m.receiverId.toLowerCase() === myEmailLower)
            );

            if (thread.length > 0) {
              const formattedThread = thread.map(m => {
                const isPlayer = m.senderRole === "player";
                const agentObj = p2pAgents.find(a => a.id === m.senderId || a.name === m.senderName) || p2pAgents[0];
                return {
                  sender: isPlayer ? "player" : "agent",
                  senderName: m.senderName,
                  avatar: isPlayer ? "👑" : (agentObj?.avatar || "👤"),
                  text: m.message,
                  time: m.timestamp
                };
              });

              setP2pChatMessages(formattedThread);
            }
          } catch (e) {}
        }
      }

      const stored = localStorage.getItem("casino_banking_requests_v1");
      if (!stored) return;
      try {
        const parsed = JSON.parse(stored);
        
        // Update banking requests state only if changed
        setBankingRequests(prev => {
          if (JSON.stringify(prev) === stored) {
            return prev;
          }
          return parsed;
        });
        
        // If there's an active P2P request, check for status updates from Admin Panel
        if (activeP2PRequest) {
          const freshRequest = parsed.find((r: any) => r.id === activeP2PRequest.id);
          if (freshRequest) {
            // Only update activeP2PRequest if status has actually changed to prevent infinite loop
            if (freshRequest.status !== activeP2PRequest.status) {
              setActiveP2PRequest(freshRequest);
            }

            const agent = p2pAgents.find(a => a.id === selectedAgentId) || p2pAgents[0];

            // 1. Admin approved the Deposit Ticket (ticket_approved)
            if (freshRequest.status === "ticket_approved" && p2pStep === "awaiting_agent_approval") {
              setIsAgentTyping(false);
              setP2pStep("awaiting_payment");
            }

            // 2. Admin/Agent released the playing chips (approved)
            if (freshRequest.status === "approved" && p2pStep !== "completed") {
              setIsAgentTyping(false);
              setP2pStep("completed");
            }

            // 3. Admin rejected the request (rejected)
            if (freshRequest.status === "rejected" && p2pStep !== "completed") {
              setIsAgentTyping(false);
              setP2pStep("not_started");
              setActiveP2PRequest(null);
              setBankingError(`Your P2P Transaction Order [${freshRequest.id}] was rejected by the operator. Please verify your payment details and submit a new request, or contact support.`);
              casinoAudio.playClick();
            }
          }
        }
      } catch (e) {
        console.error("Error parsing/syncing banking requests:", e);
      }
    };

    // Run immediately
    syncAndCheck();

    // Poll every 1.5s for seamless background updates from Admin Panel
    const interval = setInterval(syncAndCheck, 1500);

    // Also register storage event
    window.addEventListener("storage", syncAndCheck);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", syncAndCheck);
    };
  }, [activeP2PRequest, p2pStep, selectedAgentId, p2pAgents, activePlayer]);

  const handleSendP2PChat = (textToSend: string) => {
    if (!textToSend.trim() || !activeP2PRequest || !activePlayer) return;
    
    casinoAudio.playClick();
    const agent = p2pAgents.find(a => a.id === selectedAgentId) || p2pAgents[0];
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const playerMsg: ChatMessage = {
      id: "msg-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      senderId: activePlayer.email.toLowerCase(),
      senderName: activePlayer.name || "Player",
      senderRole: "player",
      receiverId: (agent.id || agent.email || "all_agents").toLowerCase(),
      message: textToSend.trim(),
      timestamp: timeStr,
      read: false
    };

    const storedStr = localStorage.getItem("casino_chat_messages_v1");
    const existingMsgs: ChatMessage[] = storedStr ? JSON.parse(storedStr) : [];
    const withPlayerMsg = [...existingMsgs, playerMsg];
    localStorage.setItem("casino_chat_messages_v1", JSON.stringify(withPlayerMsg));
    saveChatMessageToDatabase(playerMsg);
    window.dispatchEvent(new Event("storage"));
    
    setP2pInputText("");
    
    setIsAgentTyping(true);
    setTimeout(() => {
      setIsAgentTyping(false);
      
      let replyText = "";
      const playerText = textToSend.toLowerCase();
      
      if (playerText.includes("paid") || playerText.includes("sent") || playerText.includes("done") || playerText.includes("টাকা") || playerText.includes("সেন্ড") || playerText.includes("clm") || playerText.includes("claim")) {
        replyText = `Excellent! Please click the big gold "I HAVE SENT $${activeP2PRequest.amount.toLocaleString()}" button below, or paste your Transaction ID (TxID) so my automated terminal can verify the transaction on the ledger.`;
      } else if (playerText.includes("hello") || playerText.includes("hi") || playerText.includes("salam") || playerText.includes(" ভাই")) {
        replyText = `Hello! Yes, I am actively processing deposits. Please send $${activeP2PRequest.amount.toLocaleString()} to my phone number ${agent.phone} (${agent.service}) and I will approve it immediately.`;
      } else {
        replyText = `Thank you for the update! I am checking my ${agent.service} statement. Please make sure you have sent exactly $${activeP2PRequest.amount.toLocaleString()} to my number ${agent.phone} and clicked "I HAVE SENT".`;
      }
      
      const agentAutoReply: ChatMessage = {
        id: "msg-reply-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
        senderId: agent.id || "agent-1",
        senderName: agent.name,
        senderRole: "agent",
        receiverId: activePlayer.email.toLowerCase(),
        message: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false
      };

      const freshStored = localStorage.getItem("casino_chat_messages_v1");
      const latestMsgs: ChatMessage[] = freshStored ? JSON.parse(freshStored) : [];
      localStorage.setItem("casino_chat_messages_v1", JSON.stringify([...latestMsgs, agentAutoReply]));
      saveChatMessageToDatabase(agentAutoReply);
      window.dispatchEvent(new Event("storage"));
      casinoAudio.playChipClink();
    }, 1500);
  };

  const handleConfirmP2PPayment = () => {
    if (!activeP2PRequest || !activePlayer) return;
    
    casinoAudio.playClick();
    setP2pStep("verifying");
    
    const agent = p2pAgents.find(a => a.id === selectedAgentId) || p2pAgents[0];
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const playerConfirmMsg: ChatMessage = {
      id: "msg-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      senderId: activePlayer.email.toLowerCase(),
      senderName: activePlayer.name || "Player",
      senderRole: "player",
      receiverId: (agent.id || agent.email || "all_agents").toLowerCase(),
      message: `📢 I have sent exactly $${activeP2PRequest.amount.toLocaleString()} to the agent number! Please release my playing chips.`,
      timestamp: timeStr,
      read: false
    };

    const storedStr = localStorage.getItem("casino_chat_messages_v1");
    const existingMsgs: ChatMessage[] = storedStr ? JSON.parse(storedStr) : [];
    localStorage.setItem("casino_chat_messages_v1", JSON.stringify([...existingMsgs, playerConfirmMsg]));
    saveChatMessageToDatabase(playerConfirmMsg);

    // Update the transaction status in central localStorage to 'payment_submitted'
    const updatedRequests = bankingRequests.map(r => {
      if (r.id === activeP2PRequest.id) {
        return { ...r, status: "payment_submitted" as const };
      }
      return r;
    });
    setBankingRequests(updatedRequests);
    localStorage.setItem("casino_banking_requests_v1", JSON.stringify(updatedRequests));
    saveAllBankingRequestsToDatabase(updatedRequests);
    window.dispatchEvent(new Event("storage"));

    setIsAgentTyping(true);
    setTimeout(() => {
      setIsAgentTyping(false);
      
      const holdMsg: ChatMessage = {
        id: "msg-hold-" + Date.now(),
        senderId: agent.id || "agent-1",
        senderName: agent.name,
        senderRole: "agent",
        receiverId: activePlayer.email.toLowerCase(),
        message: `⏳ Verification in progress...\n\nI have received your payment claim of $${activeP2PRequest.amount.toLocaleString()}.\n\nI am actively checking the ${agent.service} merchant statement. Once verified, I will approve the payout in my operator console to release your chips instantly. Please hold on!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false
      };

      const freshStored = localStorage.getItem("casino_chat_messages_v1");
      const latestMsgs: ChatMessage[] = freshStored ? JSON.parse(freshStored) : [];
      localStorage.setItem("casino_chat_messages_v1", JSON.stringify([...latestMsgs, holdMsg]));
      saveChatMessageToDatabase(holdMsg);
      window.dispatchEvent(new Event("storage"));
      casinoAudio.playChipClink();
    }, 1500);
  };

  const CRYPTO_RATES = {
    USDT: 1,
    BTC: 60000,
    ETH: 3000,
    SOL: 150
  };

  const CRYPTO_ADDRESSES = {
    USDT: "0x777NexaSpinCryptoCasinoAddress999USDT",
    BTC: "bc1qnexaspincryptocasinohash777BTC",
    ETH: "0x777NexaSpinCryptoCasinoAddress999ETH",
    SOL: "SOL777NexaSpinCryptoCasinoAddressXyZ123SOL"
  };

  const [copiedAddress, setCopiedAddress] = useState(false);

  const handleCopyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddress(true);
    casinoAudio.playClick();
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const [bankingRequests, setBankingRequests] = useState<any[]>(() => {
    return getBankingRequests();
  });

  // Sync banking requests on local storage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem("casino_banking_requests_v1");
      if (stored) {
        setBankingRequests(JSON.parse(stored));
      }
    };
    window.addEventListener("storage", handleStorageChange);
    const interval = setInterval(handleStorageChange, 1500);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Crypto statistics
  const cryptoStats = useMemo(() => {
    if (!activePlayer) return { approvedDeposits: 0, approvedWithdrawals: 0, pendingCount: 0 };
    const playerRequests = bankingRequests.filter(r => r.playerEmail?.toLowerCase() === activePlayer.email?.toLowerCase() && r.isCrypto);
    
    const approvedDeposits = playerRequests
      .filter(r => r.type === "deposit" && r.status === "approved")
      .reduce((sum, r) => sum + r.amount, 0);

    const approvedWithdrawals = playerRequests
      .filter(r => r.type === "withdraw" && r.status === "approved")
      .reduce((sum, r) => sum + r.amount, 0);

    const pendingCount = playerRequests
      .filter(r => r.status === "pending")
      .length;

    return { approvedDeposits, approvedWithdrawals, pendingCount };
  }, [bankingRequests, activePlayer]);

  // Filtered crypto requests
  const filteredCryptoRequests = useMemo(() => {
    if (!activePlayer) return [];
    return bankingRequests.filter(r => {
      // Must be crypto and belong to active player
      const matchPlayer = r.playerEmail?.toLowerCase() === activePlayer.email?.toLowerCase();
      if (!matchPlayer || !r.isCrypto) return false;

      // Filter by Asset
      if (cryptoAssetFilter !== "ALL" && r.cryptoAsset !== cryptoAssetFilter) return false;

      // Filter by Status
      if (cryptoStatusFilter !== "ALL" && r.status !== cryptoStatusFilter) return false;

      // Filter by Search (txHash, walletAddress, id)
      if (cryptoSearch.trim()) {
        const query = cryptoSearch.toLowerCase();
        const matchesId = r.id?.toLowerCase().includes(query);
        const matchesHash = r.cryptoTxHash?.toLowerCase().includes(query);
        const matchesWallet = r.cryptoWalletAddress?.toLowerCase().includes(query);
        return matchesId || matchesHash || matchesWallet;
      }

      return true;
    });
  }, [bankingRequests, activePlayer, cryptoAssetFilter, cryptoStatusFilter, cryptoSearch]);

  const handleBankingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBankingError("");
    setBankingSuccess("");

    if (!activePlayer) {
      setBankingError("Please sign in or register to make a banking request.");
      return;
    }

    if (bankingAmount <= 0) {
      setBankingError("Please enter a valid amount greater than $0.");
      return;
    }

    if (paymentMethod === "crypto") {
      if (!playerCryptoWallet.trim()) {
        setBankingError("Please enter your cryptocurrency wallet address.");
        return;
      }
      if (playerCryptoWallet.trim().length < 12) {
        setBankingError("Please enter a valid cryptocurrency wallet address.");
        return;
      }
      if (bankingType === "deposit" && !cryptoTxHash.trim()) {
        setBankingError("Please enter the blockchain transaction hash (TxHash) for deposit verification.");
        return;
      }
      if (bankingType === "deposit" && cryptoTxHash.trim().length < 12) {
        setBankingError("Please enter a valid blockchain transaction hash (TxHash) of at least 12 characters.");
        return;
      }
    } else {
      if (!bankingService.trim()) {
        setBankingError("Please specify your mobile banking service name.");
        return;
      }
      const cleanPhone = bankingNumber.trim().replace(/[-\s]/g, "");
      const phoneRegex = /^\+?[0-9]{8,15}$/;
      if (!phoneRegex.test(cleanPhone)) {
        setBankingError("Please enter a valid mobile banking number (8 to 15 digits).");
        return;
      }
    }

    if (bankingType === "withdraw" && chips < bankingAmount) {
      setBankingError(`Insufficient Main Deposit Balance! You have $${chips.toLocaleString()} available in your Main Deposit Balance. Bonus balance cannot be withdrawn via P2P.`);
      return;
    }

    const selectedAgentObj = p2pAgents.find(a => a.id === selectedAgentId) || p2pAgents[0] || { id: "agent-1", name: "Alpha VIP Crypto Agent", phone: "T9xMasterCasinoWalletUSDT2026Crypto" };

    // Calculate 10% Crypto Deposit Bonus if depositing via crypto
    const isCryptoDeposit = paymentMethod === "crypto" && bankingType === "deposit";
    const baseAmountVal = bankingAmount;
    const cryptoBonusVal = isCryptoDeposit ? Math.floor(bankingAmount * 0.10) : 0;
    const finalCreditedAmount = bankingAmount + cryptoBonusVal;

    const reqTypeVal = bankingType === "withdraw" ? "withdrawal" : "deposit";
    const methodVal = paymentMethod === "crypto" ? (cryptoAsset || "crypto") : (bankingService.trim() || "mobile_banking");
    const agentIdVal = selectedAgentObj.id || selectedAgentId || "agent-1";
    const refNumVal = (paymentMethod === "crypto" && bankingType === "deposit")
      ? cryptoTxHash.trim()
      : (paymentMethod === "mobile" ? bankingNumber.trim() : `REF-${Date.now()}`);

    // Create request
    const newRequest = {
      id: `${bankingType === "deposit" ? "DEP" : "WTH"}-${Math.floor(100000 + Math.random() * 900000)}`,
      type: bankingType,
      playerEmail: activePlayer.email,
      playerName: activePlayer.name,
      mobileBankingNumber: paymentMethod === "crypto" ? playerCryptoWallet.trim() : bankingNumber.trim(),
      mobileBankingService: paymentMethod === "crypto" ? `Crypto - ${cryptoAsset}` : bankingService.trim(),
      baseAmount: baseAmountVal,
      cryptoBonus: cryptoBonusVal,
      amount: baseAmountVal, // Pure Cash Deposit Request Amount (e.g. $20)
      status: "pending" as const,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isCrypto: paymentMethod === "crypto",
      cryptoAsset: paymentMethod === "crypto" ? cryptoAsset : undefined,
      cryptoWalletAddress: paymentMethod === "crypto" ? playerCryptoWallet.trim() : undefined,
      cryptoTxHash: (paymentMethod === "crypto" && bankingType === "deposit") ? cryptoTxHash.trim() : undefined,
      agentId: agentIdVal,
      agentName: selectedAgentObj.name,
      agentPhone: selectedAgentObj.phone,
    };

    saveBankingRequestToDatabase(newRequest as any);
    setBankingRequests(getBankingRequests() as any);

    // Store initial P2P chat message in casino_chat_messages_v1 so agent sees it in AgentDashboard
    if (paymentMethod === "mobile" && activePlayer?.email) {
      const agent = selectedAgentObj || p2pAgents[0];
      const initChatMsg: ChatMessage = {
        id: "msg-p2p-init-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
        senderId: agent.id || "agent-1",
        senderName: agent.name,
        senderRole: "agent",
        receiverId: activePlayer.email.toLowerCase(),
        message: bankingType === "deposit"
          ? `Assalamu Alaikum! I am your designated P2P VIP agent, ${agent.name}. 🤝\n\nI have received your deposit order request [${newRequest.id}] of $${bankingAmount.toLocaleString()}.\n\nPlease wait a moment while I review and approve your deposit request ticket in my operator terminal. DO NOT send any money yet!`
          : `Assalamu Alaikum! I am your designated P2P VIP agent, ${agent.name}. 🤝\n\nI have received your withdrawal payout request [${newRequest.id}] of $${bankingAmount.toLocaleString()} to ${bankingService} (${bankingNumber}).\n\nI am processing your payout transfer now!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false
      };

      const storedChat = localStorage.getItem("casino_chat_messages_v1");
      const existingMsgs: ChatMessage[] = storedChat ? JSON.parse(storedChat) : [];
      localStorage.setItem("casino_chat_messages_v1", JSON.stringify([...existingMsgs, initChatMsg]));
      saveChatMessageToDatabase(initChatMsg);
    }

    // Deduct chips immediately for withdrawals
    if (bankingType === "withdraw" && onUpdateChips) {
      onUpdateChips(chips - bankingAmount);
    }

    if (paymentMethod === "crypto") {
      const coinQty = (bankingAmount / CRYPTO_RATES[cryptoAsset]).toFixed(6);
      if (bankingType === "deposit") {
        setBankingSuccess(`Crypto deposit request of $${bankingAmount.toLocaleString()} submitted! $${bankingAmount.toLocaleString()} Real Cash will be credited to your Main Balance, plus 🎁 Match Bonus added to your Locked Bonus Balance upon operator approval! Reference ID: [${newRequest.id}].`);
      } else {
        setBankingSuccess(`Crypto withdrawal request submitted successfully! Send exactly ${coinQty} ${cryptoAsset} to address. Reference ID: [${newRequest.id}]. Awaiting operator verification.`);
      }
      setPlayerCryptoWallet("");
      setCryptoTxHash("");
    } else {
      if (bankingType === "deposit") {
        const agent = p2pAgents.find(a => a.id === selectedAgentId) || p2pAgents[0];
        setActiveP2PRequest(newRequest);
        setP2pStep("awaiting_agent_approval");
        setIsAgentTyping(true);
        setP2pChatMessages([
          {
            sender: "agent",
            senderName: agent.name,
            avatar: agent.avatar,
            text: `Assalamu Alaikum! I am your designated P2P VIP agent, ${agent.name}. 🤝\n\nI have received your deposit order request of $${bankingAmount.toLocaleString()}.\n\nPlease wait a moment while I review and approve your deposit request ticket in my operator terminal. DO NOT send any money yet!`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setBankingSuccess(`P2P Transaction Order [${newRequest.id}] created! Ticket is awaiting approval by agent [${agent.name}].`);
      } else {
        setBankingSuccess(`Request submitted successfully! Reference ID: [${newRequest.id}]. Awaiting manual operator verification.`);
      }
      setBankingService("");
      setBankingNumber("");
    }

    setBankingAmount(5000);
    window.dispatchEvent(new Event("storage"));
    casinoAudio.playChipClink();
  };

  const handleCancelRequest = (requestId: string) => {
    const allReqs = getBankingRequests();
    const req = allReqs.find(r => r.id === requestId);
    if (!req || req.status !== "pending") return;

    const updatedRequests = allReqs.filter(r => r.id !== requestId);
    saveAllBankingRequestsToDatabase(updatedRequests);
    setBankingRequests(updatedRequests);

    // Refund chips for withdrawal
    if (req.type === "withdraw" && onUpdateChips) {
      onUpdateChips(chips + req.amount);
    }

    setBankingSuccess(`Pending request [${requestId}] has been canceled and funds have been restored.`);
    window.dispatchEvent(new Event("storage"));
    casinoAudio.playClick();
  };

  // Personal user stats
  const totalWins = useMemo(() => {
    return transactions
      .filter((t) => t.type === "win" || t.type === "reward")
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const totalLosses = useMemo(() => {
    return transactions
      .filter((t) => t.type === "lose")
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const netGain = totalWins - totalLosses;

  return (
    <div id="player-profile-container" className="flex flex-col gap-6 p-6 rounded-2xl border border-slate-800 bg-slate-950/60 relative overflow-hidden">
      {/* Absolute background accent */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500" />

      {/* Profile Main Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2 border-b border-slate-900">
        <div>
          <h3 className="font-mono text-xl font-bold text-white flex items-center gap-2">
            <User className="h-5 w-5 text-fuchsia-400" /> Player Profile Control Center
          </h3>
          <p className="text-xs text-slate-400 font-mono mt-0.5">Manage credentials, passwords, active balance, referrals, and banking settlements</p>
        </div>

        {/* Dynamic sub-tab selector inside profile */}
        <div className="flex flex-wrap md:flex-nowrap bg-slate-900/60 p-1 rounded-xl border border-slate-850 gap-1 w-full md:w-auto shrink-0">
          <button
            onClick={() => { casinoAudio.playClick(); setActiveTab("portfolio"); }}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg font-mono text-[10px] font-black tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "portfolio"
                ? "bg-slate-950 text-amber-400 border border-amber-500/50 shadow-md shadow-amber-950/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5 text-amber-400" /> VIP Portfolio
          </button>
          <button
            onClick={() => { casinoAudio.playClick(); setActiveTab("account"); }}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg font-mono text-[10px] font-black tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "account"
                ? "bg-slate-950 text-fuchsia-400 border border-slate-800/60 shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Shield className="h-3.5 w-3.5 text-fuchsia-400" /> Account Security
          </button>
          <button
            onClick={() => { casinoAudio.playClick(); setActiveTab("banking"); }}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg font-mono text-[10px] font-black tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "banking"
                ? "bg-slate-950 text-cyan-400 border border-slate-800/60 shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Landmark className="h-3.5 w-3.5 text-cyan-400" /> Wallet 
          </button>
          <button
            onClick={() => { casinoAudio.playClick(); setActiveTab("crypto"); }}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg font-mono text-[10px] font-black tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "crypto"
                ? "bg-slate-950 text-amber-500 border border-slate-800/60 shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Coins className="h-3.5 w-3.5 text-amber-500" /> Crypto Ledger
          </button>
          <button
            onClick={() => { casinoAudio.playClick(); setActiveTab("referrals"); }}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg font-mono text-[10px] font-black tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "referrals"
                ? "bg-slate-950 text-amber-400 border border-slate-800/60 shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Gift className="h-3.5 w-3.5 text-amber-400" /> VIP Referrals
          </button>
          <button
            onClick={() => { casinoAudio.playClick(); setActiveTab("chat"); }}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg font-mono text-[10px] font-black tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 relative ${
              activeTab === "chat"
                ? "bg-slate-950 text-fuchsia-400 border border-slate-800/60 shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5 text-fuchsia-400" /> Live Support Chat
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[8px] font-bold text-white bg-rose-600 rounded-full animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Wallet & Wagering Progress Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Real Cash Balance (Withdrawable) */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-amber-500/30 flex flex-col justify-between shadow-lg shadow-amber-950/10">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-extrabold flex items-center gap-1">
              <Coins className="h-3.5 w-3.5 text-amber-400 animate-pulse" /> Real Balance (Cash)
            </span>
            <span className="text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded">
              Withdrawable
            </span>
          </div>
          <div className="mt-2.5">
            <h4 className="text-2xl font-mono font-extrabold text-amber-300">${chips.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h4>
            <span className="text-[10px] font-mono text-slate-400 mt-1 block">
              Unlocked real cash for games, P2P deposits & immediate withdrawals.
            </span>
          </div>
        </div>

        {/* 2. Locked Bonus Balance */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-purple-500/30 flex flex-col justify-between shadow-lg shadow-purple-950/10">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-extrabold flex items-center gap-1">
              <Gift className="h-3.5 w-3.5 text-purple-400" /> Locked Bonus Balance
            </span>
            <span className="text-[9px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded flex items-center gap-1">
              🔒 30x Wager Rule
            </span>
          </div>
          <div className="mt-2.5">
            <h4 className="text-2xl font-mono font-extrabold text-purple-300">${bonusBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h4>
            <span className="text-[10px] font-mono text-slate-400 mt-1 block">
              Locked bonus funds. Plays first in games to unlock into Real Cash.
            </span>
          </div>
        </div>

        {/* 3. Wagering Requirement Progress Card */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-indigo-500/30 flex flex-col justify-between shadow-lg shadow-indigo-950/10">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-extrabold flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-indigo-400 animate-pulse" /> Wagering Progress
            </span>
            {totalWagerRequired > 0 && currentWagerProgress < totalWagerRequired ? (
              <span className="text-[9px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded">
                🔒 Locked
              </span>
            ) : totalWagerRequired > 0 && currentWagerProgress >= totalWagerRequired ? (
              <span className="text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                🎉 Ready to Unlock
              </span>
            ) : (
              <span className="text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                ✨ Cash
              </span>
            )}
          </div>
          <div className="mt-2">
            <div className="flex justify-between items-baseline mb-1">
              <h4 className="text-lg font-mono font-extrabold text-indigo-300">
                ${currentWagerProgress.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ${totalWagerRequired.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h4>
              <span className="text-[11px] font-mono font-black text-amber-400">
                {totalWagerRequired > 0
                  ? `${Math.min(100, (currentWagerProgress / totalWagerRequired) * 100).toFixed(1)}% Completed`
                  : "100% Completed"}
              </span>
            </div>
            {/* Visual Progress Bar */}
            <div className="w-full bg-slate-950 rounded-full h-2 border border-slate-800 overflow-hidden mb-1">
              <div 
                className="bg-gradient-to-r from-purple-500 via-fuchsia-500 to-emerald-400 h-full transition-all duration-300"
                style={{
                  width: `${totalWagerRequired > 0 ? Math.min(100, (currentWagerProgress / totalWagerRequired) * 100) : 100}%`
                }}
              />
            </div>
            <span className="text-[10px] font-mono text-slate-400 block truncate">
              {totalWagerRequired > 0
                ? `Wager $${Math.max(0, totalWagerRequired - currentWagerProgress).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} more to unlock bonus!`
                : "No active requirement. Complete wagering to convert bonus to Cash."}
            </span>
          </div>
        </div>

        {/* 4. 20% Loss Recovery Progress */}
        {(() => {
          const currentProgress = cumulativeLosses % 70;
          const progressPct = Math.min(100, (currentProgress / 70) * 100);
          const isHighProgress = progressPct >= 70;
          const isMidProgress = progressPct >= 40;

          return (
            <div className={`relative overflow-hidden p-4 rounded-xl transition-all duration-500 flex flex-col justify-between shadow-lg ${
              isHighProgress
                ? "bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/90 border-2 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.4)]"
                : isMidProgress
                ? "bg-slate-900/90 border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                : "bg-slate-900/80 border border-cyan-500/30 shadow-cyan-950/10"
            }`}>
              {/* Ambient background shimmer ray whenever progress builds anticipation */}
              {progressPct > 15 && (
                <div 
                  className="absolute -inset-full bg-gradient-to-r from-transparent via-cyan-400/15 to-transparent -skew-x-12 animate-[shimmer_3s_infinite] pointer-events-none"
                  style={{ animationDuration: isHighProgress ? "1.5s" : "3s" }}
                />
              )}

              {/* Outer Glow Pulse for High Progress */}
              {isHighProgress && (
                <div className="absolute inset-0 rounded-xl bg-cyan-400/5 animate-pulse pointer-events-none" />
              )}

              <div className="relative z-10 flex justify-between items-start">
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-extrabold flex items-center gap-1">
                  <TrendingUp className={`h-3.5 w-3.5 text-cyan-400 ${isHighProgress ? "animate-bounce" : ""}`} /> Loss Recovery
                </span>
                <div className="flex items-center gap-1.5">
                  {isHighProgress && (
                    <span className="text-[9px] font-mono font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded animate-pulse flex items-center gap-1">
                      <Zap className="h-2.5 w-2.5 text-amber-300" /> ALMOST THERE!
                    </span>
                  )}
                  <span className="text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.5 rounded">
                    20% Instant Cashback
                  </span>
                </div>
              </div>

              <div className="relative z-10 mt-2.5">
                <div className="flex justify-between items-baseline mb-1">
                  <h4 className={`text-xl font-mono font-extrabold transition-colors ${
                    isHighProgress ? "text-cyan-200 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]" : "text-cyan-300"
                  }`}>
                    ${currentProgress.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} / $70
                  </h4>
                  <span className="text-[10px] font-mono font-bold text-emerald-400">+$14 Cashback</span>
                </div>

                {/* Progress bar with animated shimmer */}
                <div className="relative w-full bg-slate-950 rounded-full h-2.5 border border-slate-800 overflow-hidden mb-1">
                  <div 
                    className={`h-full transition-all duration-500 rounded-full ${
                      isHighProgress
                        ? "bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300 shadow-[0_0_12px_rgba(52,211,153,0.8)]"
                        : "bg-gradient-to-r from-cyan-500 to-emerald-400"
                    }`}
                    style={{ width: `${progressPct}%` }}
                  />
                  {progressPct > 10 && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12 animate-[shimmer_2s_infinite] pointer-events-none" />
                  )}
                </div>

                <span className="text-[10px] font-mono text-slate-400 block">
                  Play & lose $70 minimum in gameplay to get 20% ($14) instant cashback added!
                </span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* High-visibility Live Chat Action Banner */}
      <div className="p-4 rounded-2xl border border-fuchsia-500/20 bg-gradient-to-r from-fuchsia-950/20 to-indigo-950/20 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-fuchsia-950/40 border border-fuchsia-500/30 flex items-center justify-center text-xl">
            💬
          </div>
          <div>
            <h4 className="font-mono text-sm font-bold text-white flex items-center gap-1.5">
              Royal Casino Live Support Chat 
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[8px] font-bold text-white bg-rose-600 rounded-full animate-pulse">
                  {unreadCount} NEW
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-400 font-sans">Have questions about deposits, withdrawals, or limits? Chat live with active Crypto VIP Sub-Admins.</p>
          </div>
        </div>
        <button
          onClick={() => { casinoAudio.playClick(); setActiveTab("chat"); }}
          className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:opacity-90 text-white rounded-xl text-xs font-mono font-bold shadow-md shadow-fuchsia-500/10 hover:shadow-fuchsia-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <MessageSquare className="h-4 w-4 text-white" /> Open Live Chat
        </button>
      </div>

      {/* Tab Contents */}
      <div className="min-h-[350px]">
        {activeTab === "portfolio" && (() => {
          const playerActivities = getPlayerActivities(activePlayer?.email);
          const netWorth = chips + unclaimedReferralChips;
          const betsList = transactions.filter(t => t.type === "lose");
          const winsList = transactions.filter(t => t.type === "win");
          const totalWageredVal = betsList.reduce((acc, t) => acc + t.amount, 0);
          const totalWonVal = winsList.reduce((acc, t) => acc + t.amount, 0);
          const totalBetsCount = betsList.length || 14;
          const totalWinsCount = winsList.length || 9;
          const winRate = Math.round((totalWinsCount / totalBetsCount) * 100);

          let vipRankTitle = "Bronze VIP Member";
          let vipBadgeColor = "text-amber-400 border-amber-500/40 bg-amber-950/20";
          let vipProgress = 20;

          if (peakChips >= 50000) {
            vipRankTitle = "Diamond High Roller";
            vipBadgeColor = "text-cyan-300 border-cyan-400/50 bg-cyan-950/40";
            vipProgress = 100;
          } else if (peakChips >= 15000) {
            vipRankTitle = "Platinum Boss";
            vipBadgeColor = "text-purple-300 border-purple-400/50 bg-purple-950/40";
            vipProgress = 80;
          } else if (peakChips >= 3000) {
            vipRankTitle = "Gold VIP Tier";
            vipBadgeColor = "text-amber-300 border-amber-400/50 bg-amber-950/40";
            vipProgress = 55;
          } else if (peakChips >= 1000) {
            vipRankTitle = "Silver Member";
            vipBadgeColor = "text-slate-300 border-slate-400/50 bg-slate-900/60";
            vipProgress = 35;
          }

          return (
            <div className="space-y-6 font-mono animate-fadeIn">
              {/* Portfolio Master Header Card */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-amber-500/40 shadow-2xl relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-emerald-400 p-0.5 shadow-xl shadow-amber-500/20">
                      <div className="h-full w-full bg-slate-950 rounded-[14px] flex items-center justify-center font-black text-white text-2xl">
                        {currentUser?.name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-black text-white">{currentUser?.name}</h2>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${vipBadgeColor}`}>
                          👑 {vipRankTitle}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-bold uppercase">
                          ✓ KYC Level 2 Verified
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Player Email: <strong className="text-slate-200">{currentUser?.email || activePlayer?.email}</strong> • Member ID: <strong className="text-amber-400">#VIP-{activeReferralCode}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full lg:w-auto">
                    <button
                      onClick={() => { casinoAudio.playClick(); setActiveTab("banking"); }}
                      className="flex-1 lg:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-amber-400 text-slate-950 font-black text-xs uppercase cursor-pointer hover:scale-105 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                    >
                      <Plus className="h-4 w-4 stroke-[3]" /> Instant Deposit
                    </button>
                    <button
                      onClick={() => { casinoAudio.playClick(); setActiveTab("crypto"); }}
                      className="flex-1 lg:flex-none px-5 py-2.5 rounded-xl bg-slate-900 border border-amber-500/40 text-amber-300 font-bold text-xs uppercase cursor-pointer hover:bg-slate-850 transition-all flex items-center justify-center gap-2"
                    >
                      <Coins className="h-4 w-4 text-amber-400" /> Crypto Wallet
                    </button>
                  </div>
                </div>

                {/* Portfolio Financial Summary Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-850">
                  <div className="p-3 bg-slate-900/80 border border-amber-500/30 rounded-2xl">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Total Net Portfolio</span>
                    <span className="text-lg font-black text-amber-300">${netWorth.toLocaleString()}</span>
                  </div>
                  <div className="p-3 bg-slate-900/80 border border-emerald-500/30 rounded-2xl">
                    <span className="text-[9px] text-emerald-400 font-bold uppercase block">Liquid Play Chips</span>
                    <span className="text-lg font-black text-emerald-300">${chips.toLocaleString()}</span>
                  </div>
                  <div className="p-3 bg-slate-900/80 border border-cyan-500/30 rounded-2xl">
                    <span className="text-[9px] text-cyan-400 font-bold uppercase block">Peak High Watermark</span>
                    <span className="text-lg font-black text-cyan-300">${peakChips.toLocaleString()}</span>
                  </div>
                  <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Lifetime Net Yield</span>
                    <span className={`text-lg font-black ${chips >= 1000 ? "text-emerald-400" : "text-rose-400"}`}>
                      {chips >= 1000 ? "+" : ""}${(chips - 1000).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-900/80 border border-rose-500/30 rounded-2xl">
                    <span className="text-[9px] text-rose-400 font-bold uppercase block">Vance Micro-Loan Debt</span>
                    <span className="text-lg font-black text-rose-300">${totalDebt.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* VIP Tier Progression & Badges */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 p-5 bg-slate-950 border border-slate-850 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-amber-400" /> VIP Loyalty Status & Tier Perks
                    </h3>
                    <span className="text-[10px] text-amber-400 font-bold">{vipProgress}% to Next Tier</span>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="w-full bg-slate-900 rounded-full h-3 border border-slate-800 p-0.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${vipProgress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-500">
                      <span>Bronze Member</span>
                      <span>Silver ($1k)</span>
                      <span>Gold ($3k)</span>
                      <span>Platinum ($15k)</span>
                      <span>Diamond ($50k)</span>
                    </div>
                  </div>

                  {/* Tier Perks Grid */}
                  <div className="grid grid-cols-3 gap-2.5 pt-2">
                    <div className="p-3 bg-slate-900/60 border border-slate-850 rounded-xl text-center">
                      <Zap className="h-4 w-4 text-amber-400 mx-auto mb-1" />
                      <span className="text-[10px] text-white font-bold block">15% Weekly Cashback</span>
                      <span className="text-[8px] text-slate-400 block">Automated Mondays</span>
                    </div>
                    <div className="p-3 bg-slate-900/60 border border-slate-850 rounded-xl text-center">
                      <Clock className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
                      <span className="text-[10px] text-white font-bold block">Instant P2P Payouts</span>
                      <span className="text-[8px] text-slate-400 block">&lt; 2 Minute Settlement</span>
                    </div>
                    <div className="p-3 bg-slate-900/60 border border-slate-850 rounded-xl text-center">
                      <ShieldCheck className="h-4 w-4 text-cyan-400 mx-auto mb-1" />
                      <span className="text-[10px] text-white font-bold block">Zero Fee Ledger</span>
                      <span className="text-[8px] text-slate-400 block">No Deposit Deductions</span>
                    </div>
                  </div>
                </div>

                {/* Achievements Badges */}
                <div className="lg:col-span-5 p-5 bg-slate-950 border border-slate-850 rounded-2xl space-y-3">
                  <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Award className="h-4 w-4 text-purple-400" /> Unlocked Portfolio Medals
                  </h3>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-slate-900/80 border border-amber-500/30 rounded-xl flex items-center gap-2">
                      <span className="text-xl">👑</span>
                      <div>
                        <strong className="text-amber-300 block text-[10px]">High Roller</strong>
                        <span className="text-[9px] text-slate-400">Peak Balance &gt; $3k</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-900/80 border border-cyan-500/30 rounded-xl flex items-center gap-2">
                      <span className="text-xl">💣</span>
                      <div>
                        <strong className="text-cyan-300 block text-[10px]">Cyber Mines</strong>
                        <span className="text-[9px] text-slate-400">Grid Tactical</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-900/80 border border-purple-500/30 rounded-xl flex items-center gap-2">
                      <span className="text-xl">🎰</span>
                      <div>
                        <strong className="text-purple-300 block text-[10px]">Slots Spinner</strong>
                        <span className="text-[9px] text-slate-400">Mega Reels Active</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-900/80 border border-emerald-500/30 rounded-xl flex items-center gap-2">
                      <span className="text-xl">🤝</span>
                      <div>
                        <strong className="text-emerald-300 block text-[10px]">Affiliate Boss</strong>
                        <span className="text-[9px] text-slate-400">Ref Code: {activeReferralCode}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Game Category Wager Breakdown & Performance Stats */}
              <div className="p-5 bg-slate-950 border border-slate-850 rounded-2xl space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <PieChart className="h-4 w-4 text-emerald-400" /> Game Portfolio Performance Breakdown
                  </h3>
                  <span className="text-xs text-emerald-400 font-black">Overall Win Rate: {winRate}%</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-slate-900/70 border border-slate-850 rounded-xl space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">🎰 Slots & Reels</span>
                    <span className="text-base font-black text-white">
                      ${transactions.filter(t => t.type === "lose" || t.type === "win").reduce((s, t) => s + t.amount, 0).toLocaleString()} Volume
                    </span>
                    <span className="text-[9px] text-emerald-400 block font-bold">RTP Yield: 96.5%</span>
                  </div>

                  <div className="p-3.5 bg-slate-900/70 border border-slate-850 rounded-xl space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">🔵 Plinko & Mines</span>
                    <span className="text-base font-black text-white">
                      {playerActivities.length || 12} Rounds
                    </span>
                    <span className="text-[9px] text-amber-400 block font-bold">Arcade Action</span>
                  </div>

                  <div className="p-3.5 bg-slate-900/70 border border-slate-850 rounded-xl space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">🃏 Table Games</span>
                    <span className="text-base font-black text-white">
                      {transactions.length || 24} Total Moves
                    </span>
                    <span className="text-[9px] text-purple-400 block font-bold">Blackjack & Roulette</span>
                  </div>

                  <div className="p-3.5 bg-slate-900/70 border border-slate-850 rounded-xl space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">🎥 Live Casino</span>
                    <span className="text-base font-black text-white">
                      Crazy Time & Shows
                    </span>
                    <span className="text-[9px] text-cyan-400 block font-bold">Host Concierge Active</span>
                  </div>
                </div>
              </div>

              {/* Linked Financial Accounts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 bg-slate-950 border border-slate-850 rounded-2xl space-y-3">
                  <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-cyan-400" /> Linked P2P Mobile Banking
                  </h3>
                  <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block font-bold">Primary Settlement Number</span>
                      <strong className="text-sm text-white">{activePlayer?.phoneNumber || "01700-000000"}</strong>
                      <span className="text-[9px] text-emerald-400 block">USDT • Binance Pay • Web3 Verified</span>
                    </div>
                    <button
                      onClick={() => { casinoAudio.playClick(); setActiveTab("banking"); }}
                      className="px-3 py-1.5 bg-cyan-950 border border-cyan-800 text-cyan-300 text-[10px] font-bold rounded-lg uppercase hover:bg-cyan-900 transition-all cursor-pointer"
                    >
                      Manage
                    </button>
                  </div>
                </div>

                <div className="p-5 bg-slate-950 border border-slate-850 rounded-2xl space-y-3">
                  <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Coins className="h-4 w-4 text-amber-400" /> Connected Crypto Deposit Address
                  </h3>
                  <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl flex justify-between items-center">
                    <div className="overflow-hidden pr-2">
                      <span className="text-[10px] text-slate-400 uppercase block font-bold">USDT (TRC-20) / BTC Wallet</span>
                      <strong className="text-xs text-amber-300 truncate block font-mono">T9zP2k...4X8vL019mQ</strong>
                      <span className="text-[9px] text-slate-500 block">Automated Cold Vault Settlement</span>
                    </div>
                    <button
                      onClick={() => { casinoAudio.playClick(); setActiveTab("crypto"); }}
                      className="px-3 py-1.5 bg-amber-950 border border-amber-800 text-amber-300 text-[10px] font-bold rounded-lg uppercase hover:bg-amber-900 transition-all cursor-pointer shrink-0"
                    >
                      Deposit
                    </button>
                  </div>
                </div>
              </div>

              {/* Real-Time Live Activity Feed */}
              <div className="p-5 bg-slate-950 border border-slate-850 rounded-2xl space-y-3">
                <div className="flex justify-between items-center border-b border-slate-850 pb-3">
                  <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Activity className="h-4 w-4 text-amber-400 animate-pulse" /> Live Player Activity & Transaction Telemetry
                  </h3>
                  <span className="text-[10px] text-slate-400">Showing last {playerActivities.length} activities</span>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                  {playerActivities.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs italic">
                      No activity recorded in this portfolio session yet.
                    </div>
                  ) : (
                    playerActivities.map((act) => (
                      <div key={act.id} className="p-3 bg-slate-900/80 border border-slate-850 rounded-xl flex items-center justify-between gap-3 text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 text-[10px]">[{new Date(act.timestamp).toLocaleTimeString()}]</span>
                            {act.gameName && <strong className="text-amber-400 font-bold text-[11px]">{act.gameName}</strong>}
                            <span className={`px-2 py-0.2 rounded text-[8px] font-bold uppercase ${
                              act.type === "gameplay" ? "bg-purple-950 text-purple-300 border border-purple-800" : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                            }`}>
                              {act.type}
                            </span>
                          </div>
                          <p className="text-slate-200 text-[11px]">{act.action}</p>
                        </div>

                        {act.amount !== undefined && (
                          <span className={`font-black text-xs px-2.5 py-1 rounded shrink-0 ${
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
          );
        })()}

        {activeTab === "account" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
            {/* Credentials Info block */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-fuchsia-400" /> Login Credentials
              </span>

              <div className="p-5 rounded-xl border border-slate-900 bg-slate-950/40 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-fuchsia-600 to-indigo-600 flex items-center justify-center font-bold text-white text-base shadow-md">
                    {currentUser?.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <strong className="text-sm font-sans text-white block">{currentUser?.name}</strong>
                    <span className="text-[10px] font-mono text-fuchsia-400 uppercase tracking-widest flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Security Level: Platinum Player
                    </span>
                  </div>
                </div>

                <div className="space-y-3.5 pt-2 border-t border-slate-900 font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Registered Email Address</span>
                    <span className="text-slate-200">{currentUser?.email || activePlayer?.email || "N/A"}</span>
                  </div>
                  
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">SMS Contact Number</span>
                    <span className="text-slate-200">{activePlayer?.phoneNumber || "N/A"}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Authorized Login Method</span>
                    <span className="text-emerald-400 flex items-center gap-1 font-bold">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {currentUser?.loggedInVia === "google" 
                        ? "Google OAuth Authorized Connection" 
                        : currentUser?.loggedInVia === "phone" 
                        ? "Verified SMS OTP Authentication" 
                        : "Email & Secure Password Login"}
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Lounge Session Token</span>
                    <span className="text-[9px] text-slate-600 select-all truncate block">
                      {`SES-TOK-${currentUser?.name.replace(/\s+/g, "").toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Change Password Panel */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Lock className="h-4 w-4 text-fuchsia-400" /> Change Secure Password
              </span>

              <div className="p-5 rounded-xl border border-slate-900 bg-slate-950/40 flex flex-col gap-4">
                {pwdError && (
                  <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/25 text-rose-400 font-mono text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{pwdError}</span>
                  </div>
                )}
                {pwdSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/25 text-emerald-400 font-mono text-xs flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span>{pwdSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4">
                  {/* Current Password - only show if player has a password set */}
                  {activePlayer?.password && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Current Password</label>
                      <div className="relative">
                        <input
                          type={showCurrentPass ? "text" : "password"}
                          required
                          value={currentPassword}
                          onChange={(e) => { setCurrentPassword(e.target.value); setPwdError(""); }}
                          placeholder="Enter your current password"
                          className="w-full bg-slate-950 border border-slate-900 focus:border-fuchsia-500/50 rounded-lg py-2 pl-3 pr-10 font-mono text-xs text-white focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPass(!showCurrentPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                          {showCurrentPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* New Password */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">New Password (Min 6 chars)</label>
                    <div className="relative">
                      <input
                        type={showNewPass ? "text" : "password"}
                        required
                        value={newPassword}
                        onChange={(e) => { setNewPassword(e.target.value); setPwdError(""); }}
                        placeholder="Enter 6+ character new password"
                        className="w-full bg-slate-950 border border-slate-900 focus:border-fuchsia-500/50 rounded-lg py-2 pl-3 pr-10 font-mono text-xs text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      >
                        {showNewPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPass ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setPwdError(""); }}
                        placeholder="Retype your new password"
                        className="w-full bg-slate-950 border border-slate-900 focus:border-fuchsia-500/50 rounded-lg py-2 pl-3 pr-10 font-mono text-xs text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      >
                        {showConfirmPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-mono text-xs font-black uppercase tracking-widest rounded-lg shadow-lg shadow-fuchsia-950/20 cursor-pointer transition-colors"
                  >
                    Confirm Security Update
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {activeTab === "banking" && (
          <div className="flex flex-col gap-4 animate-fadeIn">
            {/* VIP SETTLEMENT PORTAL BLOCK */}
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Landmark className="h-4 w-4 text-cyan-400" /> VIP Settlement Portal
              </span>
              <span className="text-[9px] font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-500/20 px-2 py-0.5 rounded-full">CRYPTO-ONLY DIRECT SETTLEMENTS</span>
            </span>

            {/* Direct Crypto Deposit & Withdrawal Action Banner */}
            <div className="p-5 rounded-3xl border border-amber-500/40 bg-gradient-to-r from-amber-950/60 via-slate-900 to-indigo-950/60 flex flex-col md:flex-row justify-between items-center gap-5 shadow-[0_0_30px_rgba(245,158,11,0.15)] font-mono">
              <div className="flex items-start gap-3.5">
                <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-2xl animate-pulse shrink-0 mt-1">
                  ⚡
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-mono text-sm sm:text-base font-black text-amber-300 uppercase tracking-wider flex flex-wrap items-center gap-2">
                    CRYPTO INSTANT DEPOSIT AND GET UP-TO 400% INSTANT DEPOSIT BONUS
                    <span className="px-2 py-0.5 text-[9px] font-black text-slate-950 bg-amber-400 rounded-md">UP-TO 400% BONUS</span>
                  </h4>
                  <p className="text-xs text-emerald-300 font-mono font-bold leading-relaxed">
                    CRYPTO INSTANT DEPOSIT AND GET UP-TO 400% INSTANT DEPOSIT BONUS, 200% MATCH ON 1ST DEPOSIT + 300% MATCH ON 2ND DEPOSIT + 400% MATCH ON 3RD DEPOSIT
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] font-mono">
                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-md font-extrabold">1st Deposit: 200% Match</span>
                    <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded-md font-extrabold">2nd Deposit: 300% Match</span>
                    <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-md font-extrabold">3rd Deposit: 400% Match</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  casinoAudio.playClick();
                  setIsCryptoDepositOpen(true);
                }}
                className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 hover:brightness-110 text-slate-950 rounded-2xl text-xs font-mono font-black uppercase tracking-wider shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border border-amber-400/20 shrink-0"
              >
                DEPOSIT & WITHDRAW
              </button>
            </div>

            <div className="p-5 rounded-2xl border border-slate-900 bg-slate-950/50 flex flex-col gap-4 font-mono">
              <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                <span className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                  <Coins className="h-4 w-4 text-amber-500" /> Direct Crypto Settlement Hub
                </span>
                <button
                  type="button"
                  onClick={() => {
                    casinoAudio.playClick();
                    setIsCryptoDepositOpen(true);
                  }}
                  className="px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1"
                >
                  DEPOSIT & WITHDRAW
                </button>
              </div>

              {/* Informational Policy Notice & Player Deposit Mini Tutorial */}
              <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-900/80 to-slate-950/80 border border-amber-500/30 space-y-3.5 font-sans shadow-lg">
                <div className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                  <ShieldCheck className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-300 leading-relaxed">
                    🔐 <strong className="text-amber-300">Crypto-Only Platform Policy:</strong> NEXASPIN operates exclusively on decentralized cryptocurrency rails. All deposits and withdrawals are processed via <strong>Option 1: Binance Pay (Pay ID / QR)</strong> or <strong>Option 2: Web3 Direct Wallet</strong> (USDT TRC20/BEP20, BTC, ETH, SOL). Enjoy instant sub-admin verifications, live chat clearance, zero banking delays, and up to 400% match bonuses!
                  </p>
                </div>

                {/* Mini Player Step-by-Step Deposit Tutorial */}
                <div className="pt-3 border-t border-slate-800/80 font-mono">
                  <div className="flex items-center justify-between mb-2.5">
                    <h5 className="text-[11px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      📖 How to Deposit in 4 Easy Steps
                    </h5>
                    <span className="text-[9px] font-extrabold text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      ⚡ Instant Auto-Credit
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                    <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/90 flex items-start gap-2.5 hover:border-amber-500/40 transition-colors">
                      <span className="h-5 w-5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">1</span>
                      <div>
                        <strong className="text-slate-200 block font-sans text-[11px] font-bold">Open Deposit Request</strong>
                        <span className="text-slate-400 font-sans text-[10px] leading-snug block mt-0.5">Click <strong>Deposit Request</strong> and select Binance Pay or Web3 Wallet (USDT/BTC/ETH/SOL).</span>
                      </div>
                    </div>
                    <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/90 flex items-start gap-2.5 hover:border-cyan-500/40 transition-colors">
                      <span className="h-5 w-5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">2</span>
                      <div>
                        <strong className="text-slate-200 block font-sans text-[11px] font-bold">Transfer Crypto</strong>
                        <span className="text-slate-400 font-sans text-[10px] leading-snug block mt-0.5">Copy the Binance Pay ID or Web3 deposit address (or scan QR code) in your wallet app.</span>
                      </div>
                    </div>
                    <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/90 flex items-start gap-2.5 hover:border-purple-500/40 transition-colors">
                      <span className="h-5 w-5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">3</span>
                      <div>
                        <strong className="text-slate-200 block font-sans text-[11px] font-bold">Submit Transaction Hash</strong>
                        <span className="text-slate-400 font-sans text-[10px] leading-snug block mt-0.5">Enter deposit USDT amount & paste your TXID / Binance Pay Order ID to lock match bonus.</span>
                      </div>
                    </div>
                    <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/90 flex items-start gap-2.5 hover:border-emerald-500/40 transition-colors">
                      <span className="h-5 w-5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">4</span>
                      <div>
                        <strong className="text-slate-200 block font-sans text-[11px] font-bold">Instant Credit & Play</strong>
                        <span className="text-slate-400 font-sans text-[10px] leading-snug block mt-0.5">Sub-admins approve via live chat verification. Your Cash + Match Bonus (200%-400%) credit instantly!</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {bankingError && (
                <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/25 text-rose-400 font-mono text-xs flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{bankingError}</span>
                </div>
              )}
              {bankingSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/25 text-emerald-400 font-mono text-xs flex items-start gap-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                  <span>{bankingSuccess}</span>
                </div>
              )}

              {/* History Ledger section */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-900">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-black">Your Settlement Requests Ledger</span>
                <div className="border border-slate-900 bg-slate-950/80 rounded-lg overflow-hidden overflow-y-auto max-h-[160px]">
                  {!activePlayer ? (
                    <p className="text-center text-slate-600 font-mono text-[10px] py-6 italic">No player profile authenticated.</p>
                  ) : bankingRequests.filter(r => r.playerEmail === activePlayer.email).length === 0 ? (
                    <p className="text-center text-slate-600 font-mono text-[10px] py-8 italic">No previous settlements registered yet.</p>
                  ) : (
                    <table className="w-full text-left font-mono text-[10px]">
                      <thead className="bg-slate-900 text-slate-500 uppercase tracking-wider text-[8px] sticky top-0">
                        <tr>
                          <th className="p-2 pl-3">ID / Time</th>
                          <th className="p-2">Type</th>
                          <th className="p-2">Amount</th>
                          <th className="p-2">Service Details</th>
                          <th className="p-2 text-right pr-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900">
                        {bankingRequests
                          .filter(r => r.playerEmail === activePlayer.email)
                          .map((req) => (
                            <tr key={req.id} className="hover:bg-slate-900/10">
                              <td className="p-2 pl-3 text-slate-500">
                                <div className="text-slate-300 font-bold">{req.id}</div>
                                <div className="text-[8px] text-slate-600">{req.date} {req.time}</div>
                              </td>
                              <td className="p-2 uppercase">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                  req.type === "deposit"
                                    ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/30"
                                    : "bg-rose-950/40 text-rose-400 border border-rose-900/30"
                                }`}>
                                  {req.type}
                                </span>
                              </td>
                              <td className={`p-2 font-black ${
                                req.type === "deposit" ? "text-emerald-400" : "text-rose-400"
                              }`}>
                                ${req.amount.toLocaleString()}
                              </td>
                              <td className="p-2 text-slate-300">
                                {req.isCrypto ? (
                                  <div className="flex flex-col gap-0.5 font-mono text-[9px]">
                                    <span className="text-amber-400 font-bold flex items-center gap-1 uppercase">
                                      <Coins className="h-2.5 w-2.5" /> {req.cryptoAsset}
                                    </span>
                                    <span className="text-slate-400 truncate max-w-[120px] inline-block" title={req.cryptoWalletAddress}>
                                      Addr: {req.cryptoWalletAddress}
                                    </span>
                                    {req.cryptoTxHash && (
                                      <span className="text-slate-500 truncate max-w-[120px] inline-block" title={req.cryptoTxHash}>
                                        Tx: {req.cryptoTxHash}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <>
                                    <div className="uppercase font-semibold text-slate-400 text-[9px] font-mono">{req.mobileBankingService}</div>
                                    <div className="text-slate-500 text-[9px] font-mono">{req.mobileBankingNumber}</div>
                                    {req.agentName && (
                                      <div className="mt-1 text-[8px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-1 py-0.5 rounded leading-tight flex flex-col">
                                        <span className="font-semibold">Agent: {req.agentName}</span>
                                        <span className="text-slate-450 font-mono text-[7px]">{req.agentPhone}</span>
                                      </div>
                                    )}
                                  </>
                                )}
                              </td>
                              <td className="p-2 text-right pr-3">
                                <div className="flex items-center gap-1.5 justify-end flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      casinoAudio.playClick();
                                      setChatTxRequest(req);
                                      setIsTxChatOpen(true);
                                    }}
                                    className="text-[8px] bg-amber-950/80 hover:bg-amber-900 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40 transition-all cursor-pointer font-mono font-bold flex items-center gap-1 shrink-0 shadow-sm"
                                  >
                                    <MessageSquare className="h-2.5 w-2.5 text-amber-400" /> Live Verification Chat
                                  </button>

                                  {req.status === "approved" ? (
                                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/15 px-1.5 py-0.5 rounded inline-flex items-center gap-1 justify-end">
                                      <ShieldCheck className="h-3 w-3 shrink-0" /> Approved
                                    </span>
                                  ) : req.status === "rejected" ? (
                                    <span className="text-[9px] font-bold text-rose-400 bg-rose-950/40 border border-rose-500/15 px-1.5 py-0.5 rounded inline-flex items-center gap-1 justify-end">
                                      <AlertCircle className="h-3 w-3 shrink-0" /> Rejected
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleCancelRequest(req.id)}
                                      className="text-[8px] bg-rose-950/40 hover:bg-rose-900/50 text-rose-400 px-1.5 py-0.5 rounded border border-rose-900/30 transition-all cursor-pointer font-mono font-bold"
                                      title="Cancel Settlement Request"
                                    >
                                      Cancel
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "crypto" && (
          <div className="flex flex-col gap-5 animate-fadeIn">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-900 pb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Coins className="h-4 w-4 text-amber-500 animate-pulse" /> Decentralized Crypto Ledger & Tracking
              </span>
              <span className="text-[9px] font-mono text-amber-500 bg-amber-950/30 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase tracking-widest font-black">
                Secured Node Settlements
              </span>
            </div>

            {/* Instruction Banner */}
            <div className="p-3.5 rounded-xl border border-slate-900 bg-slate-950/40 text-xs font-sans text-slate-400 leading-relaxed flex gap-2.5 items-start">
              <span className="text-base shrink-0 select-none">🔐</span>
              <div>
                <strong className="text-amber-400 block font-mono text-[10px] uppercase tracking-wider mb-0.5">Automated Ledger Multi-Sig Auditing</strong>
                All deposit and withdrawal transactions executed on this console are tracked dynamically. Once you submit a deposit hash, or specify a payout destination address, System Administrators verify and clear the request within 1–5 minutes.
              </div>
            </div>

            {/* Stats Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-900 flex flex-col justify-between">
                <div className="flex justify-between items-center text-slate-500 text-[10px] font-mono uppercase tracking-wider">
                  <span>Approved Deposits</span>
                  <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="mt-2">
                  <h5 className="text-xl font-mono font-black text-emerald-400">
                    ${cryptoStats.approvedDeposits.toLocaleString()}
                  </h5>
                  <span className="text-[9px] font-mono text-slate-500">Credited directly to wallet</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-900 flex flex-col justify-between">
                <div className="flex justify-between items-center text-slate-500 text-[10px] font-mono uppercase tracking-wider">
                  <span>Approved Payouts</span>
                  <ArrowDownRight className="h-4 w-4 text-rose-400" />
                </div>
                <div className="mt-2">
                  <h5 className="text-xl font-mono font-black text-rose-400">
                    ${cryptoStats.approvedWithdrawals.toLocaleString()}
                  </h5>
                  <span className="text-[9px] font-mono text-slate-500">Cleared to external address</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-900 flex flex-col justify-between">
                <div className="flex justify-between items-center text-slate-500 text-[10px] font-mono uppercase tracking-wider">
                  <span>Awaiting Audit</span>
                  <Clock className="h-4 w-4 text-amber-400" />
                </div>
                <div className="mt-2">
                  <h5 className="text-xl font-mono font-black text-amber-400">
                    {cryptoStats.pendingCount} {cryptoStats.pendingCount === 1 ? "Request" : "Requests"}
                  </h5>
                  <span className="text-[9px] font-mono text-slate-500">Locked in multi-sig queue</span>
                </div>
              </div>
            </div>

            {/* Filter and search controllers */}
            <div className="p-4 rounded-xl border border-slate-900 bg-slate-950/50 space-y-3.5">
              <div className="flex flex-col md:flex-row gap-3">
                {/* Search query */}
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search by TxHash, wallet address, or ID..."
                    value={cryptoSearch}
                    onChange={(e) => setCryptoSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-900 focus:border-amber-500/50 rounded-lg py-1.5 px-3 font-mono text-xs text-white placeholder-slate-700 focus:outline-none transition-colors"
                  />
                </div>

                {/* Coin filter */}
                <div className="flex gap-2">
                  <div className="flex bg-slate-950 border border-slate-900 p-0.5 rounded-lg">
                    {(["ALL", "USDT", "BTC", "ETH", "SOL"] as const).map((coin) => (
                      <button
                        key={coin}
                        onClick={() => { casinoAudio.playClick(); setCryptoAssetFilter(coin); }}
                        className={`px-2.5 py-1 rounded-md font-mono text-[9px] font-bold transition-all cursor-pointer ${
                          cryptoAssetFilter === coin
                            ? "bg-amber-950/40 text-amber-400"
                            : "text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        {coin}
                      </button>
                    ))}
                  </div>

                  {/* Status filter */}
                  <select
                    value={cryptoStatusFilter}
                    onChange={(e) => { casinoAudio.playClick(); setCryptoStatusFilter(e.target.value as any); }}
                    className="bg-slate-950 border border-slate-900 rounded-lg text-[10px] font-mono font-black text-slate-300 px-2.5 py-1 focus:outline-none focus:border-amber-500/50 cursor-pointer"
                  >
                    <option value="ALL">ALL STATUSES</option>
                    <option value="pending">PENDING</option>
                    <option value="approved">APPROVED</option>
                    <option value="rejected">REJECTED</option>
                  </select>
                </div>
              </div>

              {/* Reset filter helpers */}
              {(cryptoSearch || cryptoAssetFilter !== "ALL" || cryptoStatusFilter !== "ALL") && (
                <div className="flex justify-between items-center bg-slate-950/60 p-2 rounded-lg border border-slate-900 text-[10px] font-mono">
                  <span className="text-slate-500">
                    Showing <strong className="text-amber-400">{filteredCryptoRequests.length}</strong> matching crypto records
                  </span>
                  <button
                    onClick={() => {
                      casinoAudio.playClick();
                      setCryptoSearch("");
                      setCryptoAssetFilter("ALL");
                      setCryptoStatusFilter("ALL");
                    }}
                    className="text-amber-400 hover:text-white font-bold cursor-pointer underline transition-colors"
                  >
                    Clear Filter Parameters
                  </button>
                </div>
              )}
            </div>

            {/* List / Table of matching crypto requests */}
            <div className="border border-slate-900 bg-slate-950/80 rounded-xl overflow-hidden">
              {!activePlayer ? (
                <p className="text-center text-slate-650 font-mono text-xs py-12 italic">
                  No registered player authenticated.
                </p>
              ) : filteredCryptoRequests.length === 0 ? (
                <div className="text-center text-slate-500 font-mono text-xs py-14 italic flex flex-col items-center justify-center gap-2">
                  <span>No matching cryptocurrency records found.</span>
                  {cryptoStats.pendingCount === 0 && cryptoStats.approvedDeposits === 0 && cryptoStats.approvedWithdrawals === 0 && (
                    <span className="text-[10px] text-slate-600">
                      Submit a crypto deposit/withdrawal inside the Bank & Ledger tab.
                    </span>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead className="bg-slate-900/60 text-slate-500 uppercase tracking-wider text-[9px] border-b border-slate-900">
                      <tr>
                        <th className="p-3 pl-4">ID & Timestamp</th>
                        <th className="p-3">Asset</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">USD Value</th>
                        <th className="p-3">Crypto Quantity</th>
                        <th className="p-3">Addresses & Hash Info</th>
                        <th className="p-3 text-right pr-4">Ledger Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {filteredCryptoRequests.map((req) => {
                        const coinQty = (req.amount / CRYPTO_RATES[req.cryptoAsset as "USDT" | "BTC" | "ETH" | "SOL"]).toFixed(6);
                        
                        // Coin color themes
                        const coinTheme = {
                          BTC: "text-amber-500 bg-amber-950/20 border-amber-900/40",
                          ETH: "text-indigo-400 bg-indigo-950/20 border-indigo-900/40",
                          SOL: "text-cyan-400 bg-cyan-950/20 border-cyan-900/40",
                          USDT: "text-emerald-400 bg-emerald-950/20 border-emerald-900/40"
                        }[req.cryptoAsset as "BTC" | "ETH" | "SOL" | "USDT"] || "text-slate-400 bg-slate-950 border-slate-900";

                        return (
                          <tr key={req.id} className="hover:bg-slate-900/10 transition-colors">
                            <td className="p-3 pl-4">
                              <div className="text-slate-300 font-bold text-[11px]">{req.id}</div>
                              <div className="text-[9px] text-slate-650 mt-0.5">{req.date} @ {req.time}</div>
                            </td>
                            
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase ${coinTheme}`}>
                                {req.cryptoAsset}
                              </span>
                            </td>

                            <td className="p-3 uppercase">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                req.type === "deposit"
                                  ? "bg-emerald-950/50 text-emerald-400 border border-emerald-900/30"
                                  : "bg-rose-950/50 text-rose-400 border border-rose-900/30"
                              }`}>
                                {req.type}
                              </span>
                            </td>

                            <td className={`p-3 font-black text-sm ${
                              req.type === "deposit" ? "text-emerald-400" : "text-rose-400"
                            }`}>
                              {req.type === "deposit" ? "+" : "-"}${req.amount.toLocaleString()}
                            </td>

                            <td className="p-3 font-bold text-slate-300">
                              ≈ {coinQty} {req.cryptoAsset}
                            </td>

                            <td className="p-3 text-[10px]">
                              <div className="flex flex-col gap-1.5 max-w-[200px]">
                                {req.cryptoWalletAddress && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-slate-500 font-bold">Wallet:</span>
                                    <span className="text-slate-300 truncate font-mono select-all" title={req.cryptoWalletAddress}>
                                      {req.cryptoWalletAddress}
                                    </span>
                                    <button
                                      onClick={() => handleCopyText(req.cryptoWalletAddress, `${req.id}-wallet`)}
                                      className="p-1 rounded hover:bg-slate-900 text-slate-500 hover:text-amber-400 transition-colors cursor-pointer flex items-center justify-center shrink-0"
                                      title="Copy wallet address"
                                    >
                                      {copiedId === `${req.id}-wallet` ? (
                                        <Check className="h-3 w-3 text-emerald-400" />
                                      ) : (
                                        <Copy className="h-3 w-3" />
                                      )}
                                    </button>
                                  </div>
                                )}
                                {req.cryptoTxHash && (
                                  <div className="flex items-center gap-1 border-t border-slate-900/60 pt-1">
                                    <span className="text-slate-500 font-bold">TxID:</span>
                                    <span className="text-slate-400 truncate font-mono select-all" title={req.cryptoTxHash}>
                                      {req.cryptoTxHash}
                                    </span>
                                    <button
                                      onClick={() => handleCopyText(req.cryptoTxHash, `${req.id}-hash`)}
                                      className="p-1 rounded hover:bg-slate-900 text-slate-500 hover:text-amber-400 transition-colors cursor-pointer flex items-center justify-center shrink-0"
                                      title="Copy TxHash"
                                    >
                                      {copiedId === `${req.id}-hash` ? (
                                        <Check className="h-3 w-3 text-emerald-400" />
                                      ) : (
                                        <Copy className="h-3 w-3" />
                                      )}
                                    </button>
                                    <a
                                      href={`https://blockexplorer.one/${req.cryptoAsset.toLowerCase()}/mainnet/tx/${req.cryptoTxHash}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1 rounded hover:bg-slate-900 text-slate-500 hover:text-cyan-400 transition-colors"
                                      title="Verify on Chain Explorer"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </div>
                                )}
                              </div>
                            </td>

                            <td className="p-3 text-right pr-4">
                              {req.status === "approved" ? (
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/25 px-2 py-0.5 rounded inline-flex items-center gap-1 justify-end shadow-sm">
                                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> Cleared
                                </span>
                              ) : req.status === "pending" ? (
                                <div className="flex items-center gap-2 justify-end">
                                  <button
                                    onClick={() => handleCancelRequest(req.id)}
                                    className="text-[9px] bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 px-2 py-0.5 rounded border border-rose-900/30 transition-all cursor-pointer font-mono font-bold"
                                    title="Cancel Settlement Request"
                                  >
                                    Cancel
                                  </button>
                                  <span className="text-[10px] font-bold text-amber-400 bg-amber-950/40 border border-amber-500/25 px-2 py-0.5 rounded inline-flex items-center gap-1 shrink-0">
                                    <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0 animate-pulse" /> Pending
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[10px] font-bold text-red-400 bg-red-950/40 border border-red-500/25 px-2 py-0.5 rounded inline-flex items-center gap-1 justify-end">
                                  Rejected
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "referrals" && (
          <div className="flex flex-col gap-4 animate-fadeIn">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Gift className="h-4 w-4 text-amber-400" /> VIP Referral Network Status
              </span>
              {refSettings.isEnabled ? (
                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-full">ACTIVE</span>
              ) : (
                <span className="text-[9px] font-bold text-slate-500 bg-slate-900/60 border border-slate-800 px-2 py-0.5 rounded-full">DISABLED</span>
              )}
            </span>

            <div className="p-5 rounded-xl border border-slate-900 bg-slate-950/50 flex flex-col gap-5">
              {/* Promo promo details */}
              <div className="text-xs text-slate-400 leading-relaxed font-sans bg-slate-900/20 p-3 rounded-lg border border-slate-850 flex items-start gap-2.5">
                <span className="text-lg">📢</span>
                <div>
                  <strong className="text-white block font-mono text-xs uppercase tracking-wider">Referral Policy & Reward Settlement</strong>
                  Invite friends using your unique referral code or link. Referrer earns <strong className="text-amber-400">$2.50 USDT bonus</strong> per referral once the referee completes a deposit for gameplay! You can use this bonus to play all games anytime (usable on every loss). Referees do not receive extra referral bonus ($0).
                </div>
              </div>

              {/* Sharing controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Invite Link */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold">Your Invite Link</span>
                  <div className="flex items-center bg-slate-950 border border-slate-900 rounded-lg p-1">
                    <span className="text-[10px] font-mono text-slate-400 truncate pl-2 flex-1">{referralLink}</span>
                    <button
                      onClick={handleCopyLink}
                      disabled={!refSettings.isEnabled}
                      className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-md transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                      title="Copy Link to Clipboard"
                    >
                      {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Invite Code */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold">Your Invite Code</span>
                  <div className="flex items-center bg-slate-950 border border-slate-900 rounded-lg p-1">
                    <span className="text-[11px] font-mono text-fuchsia-400 font-black tracking-wider pl-2 flex-1">{activeReferralCode}</span>
                    <button
                      onClick={handleCopyCode}
                      disabled={!refSettings.isEnabled}
                      className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-md transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                      title="Copy Code to Clipboard"
                    >
                      {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Aggregated Rewards & Claims Block */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-900 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-indigo-950/60 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold shrink-0">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 block">REFERRED FRIENDS</span>
                    <strong className="text-sm font-mono text-white">{myReferrals.length} registered</strong>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-950/60 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold shrink-0">
                    <Coins className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 block">TOTAL BONUS EARNED</span>
                    <strong className="text-sm font-mono text-white">${Number(referralChipsEarned || 0).toFixed(2)} USDT</strong>
                  </div>
                </div>

                <div className="w-full sm:w-auto shrink-0 border-t sm:border-t-0 sm:border-l border-slate-900 pt-3 sm:pt-0 sm:pl-4 flex flex-col items-center sm:items-start">
                  <span className="text-[9px] font-mono text-slate-500 uppercase font-bold">UNCLAIMED REWARDS</span>
                  <span className="text-xs font-mono font-extrabold text-emerald-400 block">${Number(unclaimedReferralChips || 0).toFixed(2)} USDT</span>
                  <button
                    onClick={handleClaimRewards}
                    disabled={unclaimedReferralChips <= 0}
                    className={`mt-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      unclaimedReferralChips > 0
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-500/20 animate-pulse"
                        : "bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    {unclaimedReferralChips > 0 ? `Claim $${Number(unclaimedReferralChips).toFixed(2)} USDT` : "No Unclaimed Rewards"}
                  </button>
                </div>
              </div>

              {/* Earn Log Table */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-black">Referral Network Earn Log</span>
                <div className="border border-slate-900 bg-slate-950/80 rounded-lg overflow-hidden overflow-y-auto max-h-[140px]">
                  {myReferrals.length === 0 ? (
                    <p className="text-center text-slate-600 font-mono text-[10px] py-6 italic">No referred players registered yet. Share your code to get started!</p>
                  ) : (
                    <table className="w-full text-left font-mono text-[10px]">
                      <thead className="bg-slate-900 text-slate-500 uppercase tracking-wider text-[8px] sticky top-0">
                        <tr>
                          <th className="p-2 pl-3">Date</th>
                          <th className="p-2">Name</th>
                          <th className="p-2">Reward</th>
                          <th className="p-2 text-right pr-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900">
                        {myReferrals.map((ev) => (
                          <tr key={ev.id} className="hover:bg-slate-900/10">
                            <td className="p-2 pl-3 text-slate-500">{ev.date}</td>
                            <td className="p-2 text-slate-300 font-sans font-bold">{ev.refereeName}</td>
                            <td className="p-2 text-fuchsia-400 font-black">+${Number(ev.rewardAmount || 0).toFixed(2)} USDT</td>
                            <td className="p-2 text-right pr-3">
                              {ev.status === "approved" ? (
                                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/15 px-1.5 py-0.5 rounded inline-flex items-center gap-1 justify-end">
                                  <ShieldCheck className="h-3 w-3 shrink-0" /> Approved
                                </span>
                              ) : ev.status === "pending_deposit" ? (
                                <span className="text-[9px] font-bold text-amber-400 bg-amber-950/40 border border-amber-500/15 px-1.5 py-0.5 rounded inline-flex items-center gap-1 justify-end">
                                  <Clock className="h-3 w-3 shrink-0" /> Awaiting Deposit
                                </span>
                              ) : ev.status === "pending" ? (
                                <span className="text-[9px] font-bold text-amber-400 bg-amber-950/40 border border-amber-500/15 px-1.5 py-0.5 rounded inline-flex items-center gap-1 justify-end">
                                  <Clock className="h-3 w-3 shrink-0" /> Pending Audit
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold text-red-400 bg-red-950/40 border border-red-500/15 px-1.5 py-0.5 rounded inline-flex items-center gap-1 justify-end">
                                  Rejected
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "chat" && (
          <div className="p-5 rounded-3xl border border-slate-800 bg-slate-950/40 space-y-4 flex flex-col h-[520px]">
            {/* Chat header */}
            <div className="flex justify-between items-center border-b border-slate-900 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="h-2.5 w-2.5 bg-emerald-500 rounded-full animate-pulse absolute -right-0.5 -bottom-0.5 border border-slate-950" />
                  <div className="h-8 w-8 bg-gradient-to-br from-fuchsia-500 to-indigo-600 rounded-full flex items-center justify-center font-mono font-bold text-xs text-white">
                    AG
                  </div>
                </div>
                <div>
                  <h4 className="font-mono text-sm font-black text-white">Crypto VIP Settlement Desk</h4>
                  <p className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" /> Sub-Admin Crypto Support Online
                  </p>
                </div>
              </div>

              {/* Simulation and Bot Toggles */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAutoBotEnabled(!isAutoBotEnabled);
                    casinoAudio.playClick();
                  }}
                  className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-mono font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    isAutoBotEnabled 
                      ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/30" 
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                  title="When active, VanceBot replies automatically to questions."
                >
                  🤖 Bot: {isAutoBotEnabled ? "ON" : "OFF"}
                </button>

                {messages.filter(m => m.senderRole === "player").length > 0 && (
                  <button
                    type="button"
                    onClick={simulateAgentReply}
                    disabled={isSimulatingReply || messages[messages.length - 1]?.senderRole !== "player"}
                    className="px-2.5 py-1.5 rounded-lg border border-fuchsia-500/20 bg-fuchsia-950/20 hover:bg-fuchsia-900/30 text-[10px] font-mono font-bold text-fuchsia-400 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-1 cursor-pointer"
                  >
                    {isSimulatingReply ? (
                      <>
                        <span className="inline-block h-2 w-2 rounded-full border border-fuchsia-400 border-t-transparent animate-spin mr-1" />
                        Typing...
                      </>
                    ) : (
                      <>⚡ Agent Reply</>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Chat log body */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-slate-800">
              {messages.map((msg) => {
                const isMe = msg.senderRole === "player";
                const isSystem = msg.senderRole === "system";

                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center my-2">
                      <div className="max-w-[85%] px-4 py-3 rounded-2xl bg-slate-900/40 border border-slate-850 text-center space-y-1">
                        <span className="text-[10px] font-mono font-bold text-fuchsia-400 uppercase tracking-wide">
                          {msg.senderName}
                        </span>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">
                          {msg.message}
                        </p>
                        <span className="block text-[9px] font-mono text-slate-500 text-right">
                          {msg.timestamp}
                        </span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl p-3.5 ${
                      isMe 
                        ? "text-white shadow-lg" 
                        : "bg-slate-900 border border-slate-850 text-slate-100"
                    }`}
                    style={isMe ? { background: "linear-gradient(135deg, var(--theme-accent, #ec4899) 0%, #6366f1 100%)" } : undefined}
                    >
                      <div className="flex justify-between items-center gap-4 mb-1">
                        <span className="text-[10px] font-bold tracking-wide opacity-80 uppercase font-mono">
                          {msg.senderName}
                        </span>
                        <span className="text-[9px] font-mono opacity-50">
                          {msg.timestamp}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed break-words font-sans">
                        {msg.message}
                      </p>
                    </div>
                  </div>
                );
              })}

              {isBotTyping && (
                <div className="flex justify-start">
                  <div className="bg-slate-900/90 border border-slate-850 rounded-2xl p-3 px-3.5 max-w-[75%] flex items-center gap-2.5">
                    <div className="flex space-x-1">
                      <div className="h-1.5 w-1.5 bg-fuchsia-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <div className="h-1.5 w-1.5 bg-fuchsia-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <div className="h-1.5 w-1.5 bg-fuchsia-400 rounded-full animate-bounce" />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-fuchsia-400">VanceBot AI is typing...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggested quick answers */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                "Request a custom emergency Vance Loan 💸",
                "How fast are deposits processed? ⚡",
                "Are my VIP referred chips active? 🎁",
                "Can you review my crypto payout request? 🪙"
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    setChatInput(suggestion);
                    casinoAudio.playClick();
                  }}
                  className="px-2.5 py-1 text-[10px] font-mono rounded-full bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-fuchsia-300 transition-colors cursor-pointer"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {/* Message composer input */}
            <form onSubmit={handleSendMessage} className="flex gap-2.5 pt-2 border-t border-slate-900">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a secure message to active agents..."
                className="flex-1 min-w-0 px-4 py-2.5 bg-slate-900 hover:bg-slate-850/80 focus:bg-slate-950 border border-slate-800 focus:border-fuchsia-500 rounded-xl font-mono text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="px-4 py-2.5 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:opacity-90 text-white rounded-xl text-xs font-mono font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
              >
                <Send className="h-3.5 w-3.5" /> Send
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Direct P2P Crypto Deposit Modal */}
      <CryptoDeposit
        isOpen={isCryptoDepositOpen}
        onClose={() => setIsCryptoDepositOpen(false)}
        currentUser={currentUser}
        userChips={chips}
        onUpdateChips={onUpdateChips}
        onAddAuditLog={onAddAuditLog}
      />

      {/* Live Transaction Chat Modal for Player */}
      <TransactionChatBox
        isOpen={isTxChatOpen}
        onClose={() => setIsTxChatOpen(false)}
        request={chatTxRequest}
        currentUser={{
          name: currentUser?.name || activePlayer?.name || "Player",
          role: "player",
          email: currentUser?.email || activePlayer?.email
        }}
      />
    </div>
  );
}
