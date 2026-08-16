import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  User, Lock, Landmark, Coins, Check, X, ShieldCheck, Clock, Smartphone, 
  AlertCircle, Shield, Sparkles, Key, Eye, EyeOff, LogOut, TrendingUp, ArrowUpRight, ArrowDownRight,
  MessageSquare, Send
} from "lucide-react";
import { casinoAudio } from "../lib/audioService";
import { ChatMessage } from "../types";
import { getMergedP2PAgents } from "../constants/p2pAgents";
import { getRegisteredPlayers } from "../constants/defaultPlayers";
import { getBankingRequests } from "../constants/bankingRequests";
import { processDepositApprovalForPlayer } from "../lib/depositBonusHelper";
import { 
  savePlayerToDatabase, 
  saveBankingRequestToDatabase, 
  saveAllBankingRequestsToDatabase,
  saveP2PAgentToDatabase, 
  saveAllP2PAgentsToDatabase,
  saveChatMessageToDatabase, 
  saveAllPlayersToDatabase,
  getPlayerDocId
} from "../lib/db";
import { p2pSystem, broadcastFinancialStateUpdates } from "../lib/p2pSystem";
import { motion } from "motion/react";
import TransactionChatBox from "./TransactionChatBox";
import { 
  TransactionChatMessage, 
  getTransactionChatMessages, 
  sendTransactionChatMessage, 
  markChatMessagesAsRead, 
  getUnreadCountForRequest, 
  getAllP2PChatMessages 
} from "../lib/transactionChat";

interface Agent {
  id: string;
  name: string;
  email: string;
  password?: string;
  phoneNumber: string;
  balance: number;
  status: "active" | "blocked" | "red_marked";
  depositRequestsProcessed: number;
  withdrawRequestsProcessed: number;
  totalVolumeApproved: number;
  phone?: string;
  isVerified?: boolean;
  isHidden?: boolean;
  showOnDeposit?: boolean;
  showOnWithdrawal?: boolean;
  service?: string;
  rating?: string;
  speed?: string;
  avatar?: string;
}

interface BankingRequest {
  id: string;
  type: "deposit" | "withdraw";
  playerEmail: string;
  playerName: string;
  mobileBankingNumber: string;
  mobileBankingService: string;
  amount: number;
  status: "pending" | "ticket_approved" | "payment_submitted" | "approved" | "rejected";
  date: string;
  time: string;
  approvedBy?: string;
  agentId?: string;
  agentName?: string;
  agentPhone?: string;
  isCrypto?: boolean;
  cryptoAsset?: string;
  cryptoWalletAddress?: string;
  cryptoTxHash?: string;
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
  chips?: number; // Player's current chip balance stored in registration
}

interface AgentDashboardProps {
  currentUser: { name: string; role: string; loggedInVia?: string; email?: string; agentId?: string } | null;
  onLogout: () => void;
  onAddAuditLog?: (msg: string, type: "info" | "warning" | "success" | "danger") => void;
}

export default function AgentDashboard({
  currentUser,
  onLogout,
  onAddAuditLog,
}: AgentDashboardProps) {
  // Sync loaded agents
  const [agents, setAgents] = useState<Agent[]>(() => {
    return getMergedP2PAgents() as any;
  });

  // Identify active agent
  const activeAgent = useMemo(() => {
    if (!currentUser || !currentUser.agentId) return null;
    return agents.find(a => a.id === currentUser.agentId) || null;
  }, [agents, currentUser]);

  // Load and sync players (to apply balance changes)
  const [players, setPlayers] = useState<RegisteredPlayer[]>(() => {
    return getRegisteredPlayers() as any;
  });

  // Load banking requests
  const [bankingRequests, setBankingRequests] = useState<BankingRequest[]>(() => {
    return getBankingRequests() as any;
  });

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");

  // Portal statuses/notifications
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  useEffect(() => {
    const syncData = () => {
      try {
        setBankingRequests(getBankingRequests() as any);
        setAgents(getMergedP2PAgents() as any);
        setPlayers(getRegisteredPlayers() as any);
      } catch (e) {
        console.error("Error syncing stored data:", e);
      }
    };

    syncData();
    window.addEventListener("storage", syncData);
    const interval = setInterval(syncData, 1500);

    return () => {
      window.removeEventListener("storage", syncData);
      clearInterval(interval);
    };
  }, []);

  // Chat center states
  const [dashboardTab, setDashboardTab] = useState<"requests" | "chat">("requests");
  const [allChatMessages, setAllChatMessages] = useState<ChatMessage[]>([]);
  const [selectedPlayerEmail, setSelectedPlayerEmail] = useState<string>("");
  const [agentChatInput, setAgentChatInput] = useState<string>("");
  const [chatRequestModal, setChatRequestModal] = useState<BankingRequest | null>(null);
  const [chatUpdateCounter, setChatUpdateCounter] = useState<number>(0);
  const agentMessagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const prevThreadCountRef = useRef<number>(0);
  const prevPlayerEmailRef = useRef<string>("");

  const scrollToBottomAgentChat = (force = false) => {
    if (!chatContainerRef.current) return;
    const container = chatContainerRef.current;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    if (force || isNearBottom) {
      agentMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Sync messages & listen for live P2P chat events
  useEffect(() => {
    const syncMessages = () => {
      const stored = localStorage.getItem("casino_chat_messages_v1");
      if (stored) {
        try {
          const parsed: ChatMessage[] = JSON.parse(stored);
          setAllChatMessages(parsed);
        } catch (e) {}
      }
      setChatUpdateCounter((prev) => prev + 1);
    };

    syncMessages();

    const handleChatUpdate = () => {
      syncMessages();
    };

    window.addEventListener("p2p_chat_updated", handleChatUpdate);
    window.addEventListener("casino_tx_chat_updated", handleChatUpdate as EventListener);
    window.addEventListener("storage", handleChatUpdate);

    const interval = setInterval(syncMessages, 1500);

    return () => {
      clearInterval(interval);
      window.removeEventListener("p2p_chat_updated", handleChatUpdate);
      window.removeEventListener("casino_tx_chat_updated", handleChatUpdate as EventListener);
      window.removeEventListener("storage", handleChatUpdate);
    };
  }, []);

  // Filter messages for selected player
  const activePlayerThread = useMemo(() => {
    if (!selectedPlayerEmail) return [];
    return allChatMessages.filter(m => 
      m.senderId.toLowerCase() === selectedPlayerEmail.toLowerCase() || 
      m.receiverId.toLowerCase() === selectedPlayerEmail.toLowerCase() ||
      (m.senderRole === "system" && m.receiverId.toLowerCase() === selectedPlayerEmail.toLowerCase())
    );
  }, [allChatMessages, selectedPlayerEmail]);

  // Aggregate chats to list players
  const playerChatsList = useMemo(() => {
    const map = new Map<string, { email: string; name: string; latestMsg: string; timestamp: string; unreadCount: number }>();
    
    // Sort all messages oldest to newest
    const sorted = [...allChatMessages].sort((a, b) => a.id.localeCompare(b.id));

    sorted.forEach(m => {
      let pEmail = "";
      let pName = "";
      if (m.senderRole === "player") {
        pEmail = m.senderId;
        pName = m.senderName;
      } else if (m.receiverId !== "all_agents" && m.senderRole !== "system") {
        pEmail = m.receiverId;
        pName = "Player"; // Fallback name
      } else {
        // System message or general broadcast
        pEmail = m.receiverId;
        pName = "Player";
      }

      if (!pEmail || pEmail === "all_agents") return;

      const current = map.get(pEmail);
      const isUnread = m.senderRole === "player" && !m.read;

      map.set(pEmail, {
        email: pEmail,
        name: m.senderRole === "player" ? m.senderName : (current?.name || pName),
        latestMsg: m.message,
        timestamp: m.timestamp,
        unreadCount: (current?.unreadCount || 0) + (isUnread ? 1 : 0)
      });
    });

    return Array.from(map.values());
  }, [allChatMessages]);

  useEffect(() => {
    if (!selectedPlayerEmail && playerChatsList.length > 0) {
      setSelectedPlayerEmail(playerChatsList[0].email);
    }
  }, [playerChatsList, selectedPlayerEmail]);

  // Handle send message from agent
  const handleAgentSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentChatInput.trim() || !selectedPlayerEmail || !currentUser) return;

    const agentName = currentUser.name || "VIP P2P Mobile Agent";
    const agentId = currentUser.agentId || currentUser.email || "agent_lounge";
    const text = agentChatInput.trim();

    // 1. Send via transactionChat system so it reaches the player's live transaction chat window
    sendTransactionChatMessage({
      requestId: selectedPlayerEmail.toLowerCase(),
      senderId: agentId,
      senderName: agentName,
      senderRole: "agent",
      message: text,
    });

    // Also send to any specific pending deposit/withdrawal ID for this player
    const matchingReq = bankingRequests.find(r => r.playerEmail.toLowerCase() === selectedPlayerEmail.toLowerCase());
    if (matchingReq && matchingReq.id !== selectedPlayerEmail.toLowerCase()) {
      sendTransactionChatMessage({
        requestId: matchingReq.id,
        senderId: agentId,
        senderName: agentName,
        senderRole: "agent",
        message: text,
      });
    }

    const newMsg: ChatMessage = {
      id: "msg-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      senderId: agentId,
      senderName: agentName,
      senderRole: "agent",
      receiverId: selectedPlayerEmail.toLowerCase(),
      message: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    };

    const stored = localStorage.getItem("casino_chat_messages_v1");
    const allMsgs: ChatMessage[] = stored ? JSON.parse(stored) : [];
    const updated = [...allMsgs, newMsg];
    localStorage.setItem("casino_chat_messages_v1", JSON.stringify(updated));
    saveChatMessageToDatabase(newMsg);

    setAllChatMessages(updated);
    setAgentChatInput("");
    casinoAudio.playClick();
  };

  // Auto-mark selected player messages as read when Agent is viewing thread
  useEffect(() => {
    if (selectedPlayerEmail && dashboardTab === "chat") {
      const stored = localStorage.getItem("casino_chat_messages_v1");
      if (stored) {
        const allMsgs: ChatMessage[] = JSON.parse(stored);
        let updated = false;
        const newAllMsgs = allMsgs.map(m => {
          if (m.senderId.toLowerCase() === selectedPlayerEmail.toLowerCase() && m.senderRole === "player" && !m.read) {
            return { ...m, read: true };
          }
          return m;
        });

        const changed = JSON.stringify(allMsgs) !== JSON.stringify(newAllMsgs);
        if (changed) {
          localStorage.setItem("casino_chat_messages_v1", JSON.stringify(newAllMsgs));
          setAllChatMessages(newAllMsgs);
        }
      }
    }
  }, [selectedPlayerEmail, dashboardTab, allChatMessages]);

  // Scroll to bottom of agent thread, respecting scroll position
  useEffect(() => {
    if (dashboardTab !== "chat") {
      return;
    }

    const playerChanged = prevPlayerEmailRef.current !== selectedPlayerEmail;
    const isNewMessage = activePlayerThread.length > prevThreadCountRef.current;

    if (playerChanged) {
      setTimeout(() => scrollToBottomAgentChat(true), 50);
      prevPlayerEmailRef.current = selectedPlayerEmail;
    } else if (isNewMessage) {
      scrollToBottomAgentChat(false);
    }

    prevThreadCountRef.current = activePlayerThread.length;
  }, [activePlayerThread, dashboardTab, selectedPlayerEmail]);

  // Total agent unread chat badge
  const totalAgentUnread = useMemo(() => {
    return playerChatsList.reduce((acc, curr) => acc + curr.unreadCount, 0);
  }, [playerChatsList]);

  // Simulate a player reply helper so agents can test client chat inside AgentDashboard
  const [isSimulatingPlayer, setIsSimulatingPlayer] = useState(false);

  const simulatePlayerReply = () => {
    if (!selectedPlayerEmail) return;
    setIsSimulatingPlayer(true);
    casinoAudio.playClick();

    setTimeout(() => {
      const playerReplies = [
        "Thanks for the prompt reply! I'm going back to the Roulette table now.",
        "Could you check my crypto ledger? I deposited 100 USDT about 5 minutes ago.",
        "Just got a massive slots payout! Vance's advice actually worked, haha!",
        "Is there any active high-roller loyalty bonus I can claim today?",
        "Awesome customer service, you guys are the best!"
      ];
      const randomReply = playerReplies[Math.floor(Math.random() * playerReplies.length)];

      const lastMsgInThread = activePlayerThread[activePlayerThread.length - 1];
      const playerName = lastMsgInThread?.senderRole === "player" ? lastMsgInThread.senderName : "Player Test";

      const simulatedMsg: ChatMessage = {
        id: "sim-player-" + Date.now(),
        senderId: selectedPlayerEmail.toLowerCase(),
        senderName: playerName,
        senderRole: "player",
        receiverId: "all_agents",
        message: randomReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false
      };

      const stored = localStorage.getItem("casino_chat_messages_v1");
      const allMsgs: ChatMessage[] = stored ? JSON.parse(stored) : [];
      const updated = [...allMsgs, simulatedMsg];
      localStorage.setItem("casino_chat_messages_v1", JSON.stringify(updated));
      saveChatMessageToDatabase(simulatedMsg);

      setAllChatMessages(updated);
      setIsSimulatingPlayer(false);
      casinoAudio.playWin();
    }, 1500);
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");

    if (!activeAgent) return;

    if (currentPassword !== activeAgent.password) {
      setPwdError("Incorrect current password.");
      casinoAudio.playClick();
      return;
    }

    if (newPassword.length < 6) {
      setPwdError("New password must be at least 6 characters.");
      casinoAudio.playClick();
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdError("Passwords do not match.");
      casinoAudio.playClick();
      return;
    }

    // Update locally and in storage
    const updatedAgents = agents.map(a => {
      if (a.id === activeAgent.id) {
        return { ...a, password: newPassword };
      }
      return a;
    });

    setAgents(updatedAgents);
    localStorage.setItem("casino_agents_v1", JSON.stringify(updatedAgents));
    localStorage.setItem("casino_p2p_agents_v1", JSON.stringify(updatedAgents));
    setPwdSuccess("Security password changed successfully!");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    casinoAudio.playWin();

    if (onAddAuditLog) {
      onAddAuditLog(`SECURITY: Agent [${activeAgent.id}] successfully updated security login password.`, "warning");
    }
  };

  const handleProcessRequest = async (reqId: string, action: "approve" | "reject" | "approve_ticket") => {
    setActionError("");
    setActionSuccess("");

    if (!activeAgent) {
      setActionError("Operator authentication error.");
      return;
    }

    if (activeAgent.status === "blocked") {
      setActionError("This agent account is blocked and cannot process any financial operations.");
      return;
    }

    const req = bankingRequests.find(r => r.id === reqId);
    if (!req || (req.status !== "pending" && req.status !== "ticket_approved" && req.status !== "payment_submitted")) {
      setActionError("Request is either missing or already finalized.");
      return;
    }

    if (req.type === "withdraw" && (req as any).isCrypto) {
      setActionError("Security Protocol Error: Cryptocurrency withdrawals can ONLY be processed by System Administrators.");
      return;
    }

    // Handle "approve_ticket" action (stage 1 approval for P2P deposit tickets)
    if (action === "approve_ticket") {
      const updatedRequests = bankingRequests.map(r => {
        if (r.id === reqId) {
          return { ...r, status: "ticket_approved" as const, approvedBy: activeAgent.id };
        }
        return r;
      });

      setBankingRequests(updatedRequests);
      localStorage.setItem("casino_banking_requests_v1", JSON.stringify(updatedRequests));
      saveAllBankingRequestsToDatabase(updatedRequests);

      // Push chat message to player's chat thread
      if (req.playerEmail) {
        const ticketMsg: ChatMessage = {
          id: "msg-ticket-" + Date.now(),
          senderId: activeAgent.id || "agent-1",
          senderName: activeAgent.name,
          senderRole: "agent",
          receiverId: req.playerEmail.toLowerCase(),
          message: `✅ DEPOSIT TICKET APPROVED!\n\nYour deposit ticket of $${req.amount.toLocaleString()} has been approved by Agent ${activeAgent.name}. The secure escrow channel is now active.\n\nPlease CASH OUT or SEND MONEY exactly $${req.amount.toLocaleString()} to my mobile banking number:\n\n📱 Agent Number: ${activeAgent.phone || req.mobileBankingNumber}\n🏦 Service: ${activeAgent.service || req.mobileBankingService}\n\nOnce sent, click the gold "I HAVE SENT" button! I will verify and release your chips immediately.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          read: false
        };

        const storedChat = localStorage.getItem("casino_chat_messages_v1");
        const existingMsgs: ChatMessage[] = storedChat ? JSON.parse(storedChat) : [];
        localStorage.setItem("casino_chat_messages_v1", JSON.stringify([...existingMsgs, ticketMsg]));
        saveChatMessageToDatabase(ticketMsg);
      }

      setActionSuccess(`Deposit Ticket [${reqId}] APPROVED! Escrow channel is now active for player ${req.playerName}.`);
      casinoAudio.playWin();

      if (onAddAuditLog) {
        onAddAuditLog(`BANKING: Agent [${activeAgent.id}] approved P2P deposit ticket [${reqId}] for player [${req.playerName}].`, "info");
      }

      window.dispatchEvent(new Event("storage"));
      return;
    }

    // Process Approval or Rejection
    try {
      if (action === "approve") {
        if (req.type === "deposit") {
          // APPROVE DEPOSIT: Check & Deduct exact amount from agent's balance
          const currentBal = activeAgent.balance || 0;
          if (currentBal < req.amount) {
            const warnMsg = `Insufficient Agent Liquidity! Your balance ($${currentBal.toLocaleString()}) is lower than the deposit amount ($${req.amount.toLocaleString()}). Please recharge your agent float to approve this transaction.`;
            setActionError(warnMsg);
            try { casinoAudio.playClick(); } catch (e) {}
            return;
          }

          const newAgentBal = currentBal - req.amount;
          const updatedAgent = {
            ...activeAgent,
            balance: newAgentBal,
            depositRequestsProcessed: (activeAgent.depositRequestsProcessed || 0) + 1,
            totalVolumeApproved: (activeAgent.totalVolumeApproved || 0) + req.amount,
          };

          // Save agent updates
          saveP2PAgentToDatabase(updatedAgent as any);

          // Update p2pSystem and dispatch sync events
          try {
            const allAgents = p2pSystem.agents;
            const idx = allAgents.findIndex(a => a.id === updatedAgent.id);
            if (idx >= 0) {
              allAgents[idx] = { ...allAgents[idx], ...updatedAgent } as any;
              p2pSystem.agents = allAgents;
            }
            setAgents(getMergedP2PAgents() as any);
            window.dispatchEvent(new Event("storage"));
            window.dispatchEvent(new CustomEvent("p2p_state_updated"));
          } catch (e) {
            console.error("Error syncing agent state:", e);
          }

          // Update player balance and calculate dynamic deposit bonus & wagering requirement
          processDepositApprovalForPlayer(req.playerEmail || "", req.amount, req.id);

          // Update request status
          req.status = "approved";
          req.approvedBy = activeAgent.id;
          saveBankingRequestToDatabase(req);

          setActionSuccess(`Successfully approved deposit request [${reqId}]. ${req.amount.toLocaleString()} transferred from Agent float to player ${req.playerName}.`);
          casinoAudio.playWin();

          if (onAddAuditLog) {
            onAddAuditLog(`FINANCE: Agent [${activeAgent.id}] approved player [${req.playerName}] deposit of ${req.amount.toLocaleString()}. Balance transferred from Agent.`, "success");
          }
        } else {
          // APPROVE WITHDRAWAL: Add to agent's balance
          const newAgentBal = (activeAgent.balance || 0) + req.amount;
          const updatedAgent = {
            ...activeAgent,
            balance: newAgentBal,
            withdrawRequestsProcessed: (activeAgent.withdrawRequestsProcessed || 0) + 1,
            totalVolumeApproved: (activeAgent.totalVolumeApproved || 0) + req.amount,
          };
          saveP2PAgentToDatabase(updatedAgent as any);

          // Update request status
          req.status = "approved";
          req.approvedBy = activeAgent.id;
          saveBankingRequestToDatabase(req);

          setActionSuccess(`Successfully approved withdrawal request [${reqId}]. $${req.amount.toLocaleString()} added to Agent float.`);
          casinoAudio.playWin();

          if (onAddAuditLog) {
            onAddAuditLog(`FINANCE: Agent [${activeAgent.id}] approved player [${req.playerName}] withdrawal of $${req.amount.toLocaleString()}. Funds cleared to Agent.`, "success");
          }
        }
      } else {
        // REJECT REQUEST
        if (req.type === "withdraw") {
          const registeredPlayers = getRegisteredPlayers();
          const targetPlayer = registeredPlayers.find(p => p.email.toLowerCase() === (req.playerEmail || "").toLowerCase());
          if (targetPlayer) {
            targetPlayer.chips = (targetPlayer.chips || 0) + req.amount;
            savePlayerToDatabase(targetPlayer);
          }
        }

        req.status = "rejected";
        req.approvedBy = activeAgent.id;
        saveBankingRequestToDatabase(req);

        if (req.type === "withdraw") {
          setActionSuccess(`Withdrawal request [${reqId}] REJECTED. $${req.amount.toLocaleString()} refunded back to player.`);
        } else {
          setActionSuccess(`Deposit request [${reqId}] rejected. No balances modified.`);
        }
        casinoAudio.playClick();

        if (onAddAuditLog) {
          onAddAuditLog(`FINANCE: Agent [${activeAgent.id}] REJECTED player [${req.playerName}] ${req.type} request of $${req.amount.toLocaleString()}.`, "danger");
        }
      }
    } catch (err: any) {
      console.error("Error processing transaction in AgentDashboard:", err);
      setActionError(err.message || "Failed to process transaction.");
      return;
    }

    // Sync local state for immediate UI feedback
    const updatedRequests = bankingRequests.map(r => {
      if (r.id === reqId) {
        return { ...r, status: action === "approve" ? ("approved" as const) : ("rejected" as const), approvedBy: activeAgent.id };
      }
      return r;
    });

    setBankingRequests(updatedRequests);
    localStorage.setItem("casino_banking_requests_v1", JSON.stringify(updatedRequests));

    // Send chat message notification
    if (req.playerEmail) {
      const finalChatMsg: ChatMessage = {
        id: "msg-final-" + Date.now(),
        senderId: activeAgent.id || "agent-1",
        senderName: activeAgent.name,
        senderRole: "agent",
        receiverId: req.playerEmail.toLowerCase(),
        message: action === "approve"
          ? (req.type === "deposit" 
              ? `🎉 PAYMENT VERIFIED & CHIPS RELEASED SUCCESSFULLY!\n\nAgent ${activeAgent.name} has verified your $${req.amount.toLocaleString()} mobile banking transfer and released your chips to your wallet. Good luck on the tables! ✨`
              : `🎉 WITHDRAWAL PAYOUT APPROVED!\n\nAgent ${activeAgent.name} has sent $${req.amount.toLocaleString()} to your ${req.mobileBankingService} number (${req.mobileBankingNumber}). Check your mobile statement!`)
          : `❌ TRANSACTION REJECTED\n\nAgent ${activeAgent.name} has rejected request [${reqId}]. ${req.type === "withdraw" ? "Your chips have been restored to your wallet." : "Please verify payment details or contact support."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false
      };

      const storedChat = localStorage.getItem("casino_chat_messages_v1");
      const existingMsgs: ChatMessage[] = storedChat ? JSON.parse(storedChat) : [];
      localStorage.setItem("casino_chat_messages_v1", JSON.stringify([...existingMsgs, finalChatMsg]));
      saveChatMessageToDatabase(finalChatMsg);
    }

    // Dispatch global storage event so App.tsx and player interfaces update
    broadcastFinancialStateUpdates();
  };

  // Helper to check if a request belongs specifically to the active logged-in agent
  const isAgentMatch = (r: BankingRequest) => {
    if (!activeAgent) return true;
    
    // Global Universal hub agent can view all requests if needed
    if (activeAgent.id === "p2p-agent-global" || activeAgent.id === "agent-global-universal") return true;

    const reqAgentId = (r.agentId || "").toLowerCase().trim();
    const reqAgentName = (r.agentName || "").toLowerCase().trim();
    const myAgentId = (activeAgent.id || "").toLowerCase().trim();
    const myAgentName = (activeAgent.name || "").toLowerCase().trim();

    // If request has no specific agent assigned (legacy/fallback), match by default
    if (!reqAgentId && !reqAgentName) return true;

    // Check exact match by agent ID or agent Name
    const idMatch = Boolean(reqAgentId && myAgentId && reqAgentId === myAgentId);
    const nameMatch = Boolean(reqAgentName && myAgentName && (reqAgentName.includes(myAgentName) || myAgentName.includes(reqAgentName)));

    return idMatch || nameMatch;
  };

  // Summary Metrics filtered specifically for active agent
  const pendingDeposits = useMemo(() => {
    return bankingRequests.filter(r => 
      r.type === "deposit" && 
      (r.status === "pending" || r.status === "ticket_approved" || r.status === "payment_submitted") &&
      isAgentMatch(r)
    );
  }, [bankingRequests, activeAgent]);

  const pendingWithdrawals = useMemo(() => {
    return bankingRequests.filter(r => 
      r.type === "withdraw" && 
      (r.status === "pending" || r.status === "ticket_approved" || r.status === "payment_submitted") &&
      isAgentMatch(r)
    );
  }, [bankingRequests, activeAgent]);

  const recentProcessedByMe = useMemo(() => {
    if (!activeAgent) return [];
    return bankingRequests.filter(r => r.approvedBy === activeAgent.id && r.status !== "pending");
  }, [bankingRequests, activeAgent]);

  return (
    <div id="agent-terminal" className="max-w-6xl mx-auto space-y-6">
      {/* Top Welcome Card */}
      <div className="p-6 rounded-3xl border border-slate-800 bg-slate-950/70 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-cyan-500" />
        
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/25 text-[10px] font-mono font-bold text-cyan-400 flex items-center gap-1 uppercase tracking-widest">
              <Shield className="h-3 w-3" /> OFFICIAL P2P MOBILE AGENT
            </span>
            {activeAgent?.status === "red_marked" && (
              <span className="px-2 py-0.5 bg-red-950 text-red-400 border border-red-500/35 rounded-full text-[9px] font-mono font-bold">
                ⚠️ RED-MARKED WARNING
              </span>
            )}
          </div>
          <h2 className="text-2xl font-mono font-black text-white">{activeAgent?.name || "P2P Mobile Agent"}</h2>
          <p className="text-xs text-slate-400 font-sans">Authorized liquidity operator. Settle client deposits and withdrawals securely.</p>
        </div>

        <div className="flex gap-3 shrink-0 w-full md:w-auto">
          <div className="px-5 py-3 rounded-2xl bg-slate-900/60 border border-slate-850 flex-1 md:flex-initial text-center md:text-left">
            <span className="text-[9px] font-mono text-slate-500 block uppercase tracking-wider">Agent Liquidity Account</span>
            <strong className="text-xl font-mono text-cyan-400 font-black">${activeAgent?.balance?.toLocaleString() || "0"}</strong>
          </div>
          <button
            onClick={() => { casinoAudio.playClick(); onLogout(); }}
            className="px-4 py-3 bg-rose-950/40 hover:bg-rose-900/50 text-rose-400 border border-rose-900/30 rounded-2xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <LogOut className="h-4 w-4" /> Exit Portal
          </button>
        </div>
      </div>

      {/* Dashboard Sub-Tab Navigation */}
      <div className="flex bg-slate-950/60 p-1.5 rounded-2xl border border-slate-900 gap-2 w-full max-w-md my-4">
        <button
          onClick={() => { casinoAudio.playClick(); setDashboardTab("requests"); }}
          className={`flex-1 py-2 rounded-xl font-mono text-[10px] font-black tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            dashboardTab === "requests"
              ? "bg-slate-900 text-cyan-400 border border-slate-800 shadow-md"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Landmark className="h-3.5 w-3.5 text-cyan-400" /> Banking Requests
        </button>
        <button
          onClick={() => { casinoAudio.playClick(); setDashboardTab("chat"); }}
          className={`flex-1 py-2 rounded-xl font-mono text-[10px] font-black tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 relative ${
            dashboardTab === "chat"
              ? "bg-slate-900 text-fuchsia-400 border border-slate-800 shadow-md"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5 text-fuchsia-400" /> Live Support Chat
          {totalAgentUnread > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[8px] font-bold text-white bg-rose-600 rounded-full animate-bounce">
              {totalAgentUnread}
            </span>
          )}
        </button>
      </div>

      {dashboardTab === "requests" ? (
        <>
          {/* Main Grid: left requests list, right statistics/password */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Settlement Requests Terminal */}
        <div className="lg:col-span-8 space-y-6">
          {/* Status notices */}
          {actionError && (
            <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/25 text-rose-400 font-mono text-xs flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5 animate-bounce" />
              <span>{actionError}</span>
            </div>
          )}
          {actionSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/25 text-emerald-400 font-mono text-xs flex items-start gap-2.5">
              <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {/* Pending Deposits List */}
          <div className="p-5 rounded-3xl border border-slate-800 bg-slate-950/40 space-y-4">
            <h3 className="font-mono text-sm font-black text-white flex items-center justify-between border-b border-slate-900 pb-3">
              <span className="flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-emerald-400" /> Client Deposits Assigned To You ({pendingDeposits.length})
              </span>
              <span className="text-[9px] text-emerald-400 font-mono lowercase tracking-normal">Directly routed to your terminal</span>
            </h3>

            {pendingDeposits.length === 0 ? (
              <p className="text-center text-slate-500 font-mono text-xs py-10 italic">No player deposits assigned to your agent account currently pending.</p>
            ) : (
              <div className="space-y-3.5">
                {pendingDeposits.map((req) => {
                  const unreadCount = getUnreadCountForRequest(req.id, "player");
                  return (
                    <div 
                      key={req.id} 
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                        unreadCount > 0 
                          ? "border-amber-500/80 bg-amber-950/30 shadow-[0_0_20px_rgba(245,158,11,0.2)] animate-pulse" 
                          : "border-slate-900 bg-slate-950/80 hover:border-slate-800"
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] font-black text-slate-500">{req.id}</span>
                          <span className="font-mono text-xs font-bold text-white">{req.playerName}</span>
                          {req.status === "pending" && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/30 text-amber-400 font-mono text-[9px] font-bold">AWAITING TICKET APPROVAL</span>
                          )}
                          {req.status === "ticket_approved" && (
                            <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 font-mono text-[9px] font-bold">TICKET APPROVED - AWAITING PAYMENT</span>
                          )}
                          {req.status === "payment_submitted" && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-mono text-[9px] font-bold animate-pulse">CLIENT PAID - ACTION REQUIRED</span>
                          )}
                          {(activeAgent?.balance || 0) < req.amount && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-950/90 border border-rose-500/50 text-rose-300 font-mono text-[9px] font-bold">
                              ⚠️ INSUFFICIENT FLOAT (${(activeAgent?.balance || 0).toLocaleString()} &lt; ${req.amount.toLocaleString()})
                            </span>
                          )}
                          {unreadCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-mono text-[9px] font-black animate-bounce flex items-center gap-1 shadow-md">
                              <MessageSquare className="h-3 w-3 text-white" />
                              <span>{unreadCount} NEW MESSAGES</span>
                            </span>
                          )}
                        </div>
                        <div className="space-y-0.5 text-xs">
                          {req.isCrypto ? (
                            <>
                              <div className="text-slate-400 flex items-center gap-1 font-mono">
                                <Coins className="h-3.5 w-3.5 text-amber-500 animate-pulse" /> Asset: <strong className="text-amber-400 uppercase">{req.cryptoAsset}</strong>
                              </div>
                              <div className="text-slate-400 flex items-center gap-1 font-mono">
                                <ShieldCheck className="h-3.5 w-3.5 text-slate-500" /> Wallet: <strong className="text-slate-300 font-mono text-[10px] break-all max-w-[180px] inline-block">{req.cryptoWalletAddress}</strong>
                              </div>
                              {req.cryptoTxHash && (
                                <div className="text-slate-500 flex items-center gap-1 font-mono text-[10px]">
                                  <span>TxHash:</span> <span className="text-slate-400 font-semibold truncate max-w-[150px]" title={req.cryptoTxHash}>{req.cryptoTxHash}</span>
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <div className="text-slate-400 flex items-center gap-1 font-mono">
                                <Smartphone className="h-3.5 w-3.5 text-slate-500" /> SMS No: <strong className="text-slate-300">{req.mobileBankingNumber}</strong>
                              </div>
                              <div className="text-slate-400 flex items-center gap-1 font-mono">
                                <Landmark className="h-3.5 w-3.5 text-slate-500" /> Wallet: <strong className="text-cyan-400 uppercase">{req.mobileBankingService}</strong>
                              </div>
                            </>
                          )}
                        </div>
                        <span className="text-[9px] font-mono text-slate-600 block">{req.date} @ {req.time}</span>
                      </div>

                      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end shrink-0 pt-3 sm:pt-0 border-t sm:border-0 border-slate-900 flex-wrap">
                        <div className="text-right">
                          <span className="text-[9px] font-mono text-slate-500 block">DESIRED CREDIT</span>
                          <strong className="text-lg font-mono text-emerald-400 font-black">${req.amount.toLocaleString()}</strong>
                        </div>
                        <div className="flex gap-2 items-center flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              casinoAudio.playClick();
                              markChatMessagesAsRead(req.id, "player");
                              setChatRequestModal(req);
                            }}
                            className={`px-3 py-2 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                              unreadCount > 0 
                                ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-lg shadow-amber-950/40 animate-pulse" 
                                : "bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white shadow-md"
                            }`}
                            title="Open Live Transaction Verification Chat"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>Live Chat</span>
                            {unreadCount > 0 && (
                              <span className="px-1.5 py-0.5 text-[9px] font-black text-white bg-rose-600 rounded-full animate-bounce">
                                {unreadCount} NEW
                              </span>
                            )}
                          </button>

                          <button
                            onClick={() => handleProcessRequest(req.id, "reject")}
                            className="p-2 bg-slate-900 hover:bg-rose-950/20 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-900/30 rounded-xl transition-all cursor-pointer"
                            title="Reject request"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          {req.status === "pending" && (
                            <button
                              onClick={() => handleProcessRequest(req.id, "approve_ticket")}
                              className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-mono text-xs font-bold cursor-pointer transition-colors shadow-lg shadow-cyan-950/20 flex items-center gap-1"
                              title="Approve ticket for client transfer"
                            >
                              <Check className="h-3.5 w-3.5" /> Approve Ticket
                            </button>
                          )}
                          <button
                            onClick={() => handleProcessRequest(req.id, "approve")}
                            className={`px-4 py-2 ${req.status === "payment_submitted" ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black" : "bg-emerald-600 hover:bg-emerald-500 text-white font-bold"} rounded-xl font-mono text-xs cursor-pointer transition-colors shadow-lg shadow-emerald-950/20 flex items-center gap-1`}
                          >
                            <Check className="h-3.5 w-3.5" /> {req.status === "payment_submitted" ? "Verify & Release Chips" : "Direct Release"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pending Withdrawals List */}
          <div className="p-5 rounded-3xl border border-slate-800 bg-slate-950/40 space-y-4">
            <h3 className="font-mono text-sm font-black text-white flex items-center justify-between border-b border-slate-900 pb-3">
              <span className="flex items-center gap-2">
                <ArrowDownRight className="h-4 w-4 text-rose-400" /> Client Withdrawals Assigned To You ({pendingWithdrawals.length})
              </span>
              <span className="text-[9px] text-rose-400 font-mono lowercase tracking-normal">Directly routed to your terminal</span>
            </h3>

            {pendingWithdrawals.length === 0 ? (
              <p className="text-center text-slate-500 font-mono text-xs py-10 italic">No player withdrawals assigned to your agent account currently pending.</p>
            ) : (
              <div className="space-y-3.5">
                {pendingWithdrawals.map((req) => {
                  const unreadCount = getUnreadCountForRequest(req.id, "player");
                  return (
                    <div 
                      key={req.id} 
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                        unreadCount > 0 
                          ? "border-amber-500/80 bg-amber-950/30 shadow-[0_0_20px_rgba(245,158,11,0.2)] animate-pulse" 
                          : "border-slate-900 bg-slate-950/80 hover:border-slate-800"
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] font-black text-slate-500">{req.id}</span>
                          <span className="font-mono text-xs font-bold text-white">{req.playerName}</span>
                          {unreadCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-mono text-[9px] font-black animate-bounce flex items-center gap-1 shadow-md">
                              <MessageSquare className="h-3 w-3 text-white" />
                              <span>{unreadCount} NEW MESSAGES</span>
                            </span>
                          )}
                        </div>
                        <div className="space-y-0.5 text-xs">
                          {req.isCrypto ? (
                            <>
                              <div className="text-slate-400 flex items-center gap-1 font-mono">
                                <Coins className="h-3.5 w-3.5 text-amber-500 animate-pulse" /> Asset: <strong className="text-amber-400 uppercase">{req.cryptoAsset}</strong>
                              </div>
                              <div className="text-slate-400 flex items-center gap-1 font-mono">
                                <ShieldCheck className="h-3.5 w-3.5 text-slate-500" /> Wallet: <strong className="text-slate-300 font-mono text-[10px] break-all max-w-[180px] inline-block">{req.cryptoWalletAddress}</strong>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-slate-400 flex items-center gap-1 font-mono">
                                <Smartphone className="h-3.5 w-3.5 text-slate-500" /> Phone: <strong className="text-slate-300">{req.mobileBankingNumber}</strong>
                              </div>
                              <div className="text-slate-400 flex items-center gap-1 font-mono">
                                <Landmark className="h-3.5 w-3.5 text-slate-500" /> Service: <strong className="text-cyan-400 uppercase">{req.mobileBankingService}</strong>
                              </div>
                            </>
                          )}
                        </div>
                        <span className="text-[9px] font-mono text-slate-600 block">{req.date} @ {req.time}</span>
                      </div>

                      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end shrink-0 pt-3 sm:pt-0 border-t sm:border-0 border-slate-900 flex-wrap">
                        <div className="text-right">
                          <span className="text-[9px] font-mono text-slate-500 block">DESIRED OUTFLOW</span>
                          <strong className="text-lg font-mono text-rose-400 font-black">${req.amount.toLocaleString()}</strong>
                        </div>
                        
                        <div className="flex gap-2 items-center flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              casinoAudio.playClick();
                              markChatMessagesAsRead(req.id, "player");
                              setChatRequestModal(req);
                            }}
                            className={`px-3 py-2 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                              unreadCount > 0 
                                ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-lg shadow-amber-950/40 animate-pulse" 
                                : "bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white shadow-md"
                            }`}
                            title="Open Live Transaction Verification Chat"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>Live Chat</span>
                            {unreadCount > 0 && (
                              <span className="px-1.5 py-0.5 text-[9px] font-black text-white bg-rose-600 rounded-full animate-bounce">
                                {unreadCount} NEW
                              </span>
                            )}
                          </button>

                          {req.isCrypto ? (
                            <div className="flex flex-col items-end gap-1 shrink-0 bg-amber-950/20 border border-amber-500/15 p-2 rounded-xl">
                              <span className="text-[9px] font-black text-amber-500 flex items-center gap-1 font-mono uppercase tracking-wider">
                                <Shield className="h-3.5 w-3.5 text-amber-500 animate-pulse" /> Admin Approval Required
                              </span>
                              <span className="text-[8px] text-slate-500 font-mono">Locked for safety protocol</span>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => handleProcessRequest(req.id, "reject")}
                                className="p-2 bg-slate-900 hover:bg-rose-950/20 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-900/30 rounded-xl transition-all cursor-pointer"
                                title="Reject & refund player"
                              >
                                <X className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleProcessRequest(req.id, "approve")}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-mono text-xs font-bold cursor-pointer transition-colors shadow-lg shadow-rose-950/20 flex items-center gap-1"
                              >
                                <Check className="h-3.5 w-3.5" /> Clear Payout
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Panel: Profile credentials, security and log */}
        <div className="lg:col-span-4 space-y-6">
          {/* Agent Stats Summary */}
          <div className="p-5 rounded-3xl border border-slate-800 bg-slate-950/40 space-y-4">
            <h3 className="font-mono text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-cyan-400" /> Operational Metrics
            </h3>
            
            <div className="space-y-3 font-mono text-xs pt-1">
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900/40 border border-slate-900">
                <span className="text-slate-500">Deposits Cleared</span>
                <span className="font-bold text-white">{activeAgent?.depositRequestsProcessed || 0}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900/40 border border-slate-900">
                <span className="text-slate-500">Withdrawals Cleared</span>
                <span className="font-bold text-white">{activeAgent?.withdrawRequestsProcessed || 0}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900/40 border border-slate-900">
                <span className="text-slate-500">Total volume cleared</span>
                <span className="font-black text-cyan-400">${activeAgent?.totalVolumeApproved?.toLocaleString() || "0"}</span>
              </div>
            </div>
          </div>

          {/* Login details */}
          <div className="p-5 rounded-3xl border border-slate-800 bg-slate-950/40 space-y-4">
            <h3 className="font-mono text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <User className="h-4 w-4 text-cyan-400" /> Agent Credentials
            </h3>

            <div className="space-y-3 pt-1 text-xs">
              <div>
                <span className="text-[10px] font-mono text-slate-500 block uppercase font-bold">Agent Assigned ID</span>
                <span className="font-mono font-bold text-white">{activeAgent?.id}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-500 block uppercase font-bold">Operator Name</span>
                <span className="font-sans text-slate-200">{activeAgent?.name}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-500 block uppercase font-bold">Email Username</span>
                <span className="font-mono text-slate-300">{activeAgent?.email}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-500 block uppercase font-bold">Phone Connection</span>
                <span className="font-mono text-slate-300">{activeAgent?.phoneNumber}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-900/60 mt-3">
              <button
                type="button"
                onClick={() => {
                  casinoAudio.playClick();
                  setDashboardTab("chat");
                }}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:opacity-95 text-white rounded-xl text-xs font-mono font-bold shadow-md hover:scale-[1.02] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageSquare className="h-4 w-4 text-white" /> Open Live Chat Desk
                {totalAgentUnread > 0 && (
                  <span className="px-1.5 py-0.5 text-[8px] font-bold text-white bg-rose-600 rounded-full animate-pulse">
                    {totalAgentUnread} NEW
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Change password */}
          <div className="p-5 rounded-3xl border border-slate-800 bg-slate-950/40 space-y-4">
            <h3 className="font-mono text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-cyan-400" /> Change Security Password
            </h3>

            {pwdError && (
              <div className="p-2 rounded-xl bg-rose-950/20 border border-red-500/15 text-red-400 font-mono text-[11px] flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                <span>{pwdError}</span>
              </div>
            )}

            {pwdSuccess && (
              <div className="p-2 rounded-xl bg-emerald-950/20 border border-emerald-500/15 text-emerald-400 font-mono text-[11px] flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                <span>{pwdSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-mono uppercase text-slate-500 font-black">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? "text" : "password"}
                    required
                    value={currentPassword}
                    onChange={(e) => { setCurrentPassword(e.target.value); setPwdError(""); }}
                    placeholder="Enter current password"
                    className="w-full bg-slate-950 border border-slate-900 focus:border-cyan-500/55 rounded-lg py-1.5 pl-2.5 pr-8 font-mono text-xs text-white focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showCurrentPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-mono uppercase text-slate-500 font-black">New Password (6+ chars)</label>
                <div className="relative">
                  <input
                    type={showNewPass ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setPwdError(""); }}
                    placeholder="Enter new password"
                    className="w-full bg-slate-950 border border-slate-900 focus:border-cyan-500/55 rounded-lg py-1.5 pl-2.5 pr-8 font-mono text-xs text-white focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showNewPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-mono uppercase text-slate-500 font-black">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setPwdError(""); }}
                    placeholder="Retype new password"
                    className="w-full bg-slate-950 border border-slate-900 focus:border-cyan-500/55 rounded-lg py-1.5 pl-2.5 pr-8 font-mono text-xs text-white focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showConfirmPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white font-mono text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
              >
                Change Code
              </button>
            </form>
          </div>
        </div>
      </div>
        </>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[580px]">
          {/* Active Chats List Column */}
          <div className="lg:col-span-4 p-5 rounded-3xl border border-slate-800 bg-slate-950/40 flex flex-col h-full overflow-hidden">
            <h3 className="font-mono text-sm font-black text-white border-b border-slate-900 pb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-fuchsia-400" /> Active Player Chats ({playerChatsList.length})
              </span>
            </h3>

            <div className="flex-1 overflow-y-auto space-y-2 mt-3 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
              {playerChatsList.length === 0 ? (
                <div className="py-12 text-center text-slate-500 font-mono text-xs">
                  No active support conversations yet.
                </div>
              ) : (
                playerChatsList.map((chat) => {
                  const isSelected = !!(chat.email && selectedPlayerEmail && selectedPlayerEmail.toLowerCase() === chat.email.toLowerCase());
                  return (
                    <button
                      key={chat.email}
                      onClick={() => {
                        setSelectedPlayerEmail(chat.email);
                        casinoAudio.playClick();
                      }}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                        isSelected
                          ? "bg-slate-900/80 border-fuchsia-500/40 shadow-md"
                          : "bg-slate-950/20 border-slate-900 hover:bg-slate-900/30 hover:border-slate-850"
                      }`}
                    >
                      <div className="flex justify-between items-start w-full">
                        <span className="font-sans font-bold text-xs text-white truncate max-w-[150px]">
                          {chat.name}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500 shrink-0">
                          {chat.timestamp}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center w-full">
                        <p className="text-[10px] text-slate-400 truncate max-w-[170px] font-mono">
                          {chat.latestMsg}
                        </p>
                        {chat.unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 text-[8px] font-bold text-white bg-rose-600 rounded-full animate-bounce">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-mono text-slate-500 truncate block">
                        {chat.email}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat Messages Log Column */}
          <div className="lg:col-span-8 p-5 rounded-3xl border border-slate-800 bg-slate-950/40 flex flex-col h-full overflow-hidden">
            {selectedPlayerEmail ? (
              <div className="flex flex-col h-full">
                {/* Header info */}
                <div className="flex justify-between items-center border-b border-slate-900 pb-3 mb-4">
                  <div>
                    <h4 className="font-mono text-sm font-black text-white">
                      Conversation with {playerChatsList.find(c => c.email && selectedPlayerEmail && c.email.toLowerCase() === selectedPlayerEmail.toLowerCase())?.name || "Player"}
                    </h4>
                    <p className="text-[9px] font-mono text-slate-500 uppercase">
                      {selectedPlayerEmail}
                    </p>
                  </div>

                  {/* Simulator Helper for Agent Testing */}
                  <button
                    type="button"
                    onClick={simulatePlayerReply}
                    disabled={isSimulatingPlayer || activePlayerThread[activePlayerThread.length - 1]?.senderRole === "player"}
                    className="px-3 py-1.5 rounded-lg border border-cyan-500/20 bg-cyan-950/20 hover:bg-cyan-900/30 text-[10px] font-mono font-bold text-cyan-400 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-1 cursor-pointer"
                  >
                    {isSimulatingPlayer ? (
                      <>
                        <span className="inline-block h-2 w-2 rounded-full border border-cyan-400 border-t-transparent animate-spin mr-1" />
                        Player typing...
                      </>
                    ) : (
                      <>⚡ Simulate Player Reply</>
                    )}
                  </button>
                </div>

                {/* Messages list */}
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto pr-2 space-y-3 mb-4 scrollbar-thin scrollbar-thumb-slate-800">
                  {activePlayerThread.map((msg) => {
                    const isAgent = msg.senderRole === "agent";
                    const isSystem = msg.senderRole === "system";

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-center my-2">
                          <div className="max-w-[85%] px-4 py-2 bg-slate-900/25 border border-slate-900 text-center rounded-xl">
                            <p className="text-xs text-slate-400 font-mono italic">
                              {msg.senderName}: {msg.message}
                            </p>
                            <span className="block text-[8px] font-mono text-slate-600 text-right mt-1">
                              {msg.timestamp}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={msg.id} className={`flex ${isAgent ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl p-3.5 ${
                          isAgent 
                            ? "bg-gradient-to-br from-fuchsia-600 to-indigo-600 text-white shadow-lg" 
                            : "bg-slate-900 border border-slate-850 text-slate-100"
                        }`}>
                          <div className="flex justify-between items-center gap-4 mb-1">
                            <span className="text-[10px] font-bold tracking-wide opacity-80 uppercase font-mono">
                              {msg.senderName}
                            </span>
                            <span className="text-[9px] font-mono opacity-50">
                              {msg.timestamp}
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed break-words font-sans font-medium">
                            {msg.message}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={agentMessagesEndRef} />
                </div>

                {/* Input form */}
                <form onSubmit={handleAgentSendMessage} className="flex gap-2.5 pt-2 border-t border-slate-900">
                  <input
                    type="text"
                    value={agentChatInput}
                    onChange={(e) => setAgentChatInput(e.target.value)}
                    placeholder={`Type response to player...`}
                    className="flex-1 min-w-0 px-4 py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-900 focus:border-cyan-500 rounded-xl font-mono text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!agentChatInput.trim()}
                    className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:opacity-90 text-white rounded-xl text-xs font-mono font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <Send className="h-3.5 w-3.5" /> Reply
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-3">
                <MessageSquare className="h-10 w-10 text-slate-700 animate-pulse" />
                <p className="font-mono text-xs uppercase tracking-wide">
                  Select a player conversation from the list to begin supporting.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Live Transaction Verification Chat Modal */}
      {chatRequestModal && (
        <TransactionChatBox
          isOpen={!!chatRequestModal}
          onClose={() => {
            if (chatRequestModal) {
              markChatMessagesAsRead(chatRequestModal.id, "player");
            }
            setChatRequestModal(null);
          }}
          request={chatRequestModal}
          currentUser={{
            name: activeAgent?.name || "P2P Cashier Agent",
            role: "agent",
            email: activeAgent?.phoneNumber || activeAgent?.id,
          }}
        />
      )}
    </div>
  );
}
