import { P2PAgent, getMergedP2PAgents, deleteP2PAgent } from "../constants/p2pAgents";
import { BankingRequest, getBankingRequests } from "../constants/bankingRequests";
import { getSubAdmins, SubAdmin } from "../constants/subAdmins";
import { getRegisteredPlayers, RegisteredPlayer } from "../constants/defaultPlayers";
import { processDepositApprovalForPlayer } from "./depositBonusHelper";
import { 
  sendTransactionChatMessage, 
  addSystemTxChatMessage, 
  getTransactionChatMessages, 
  getAllP2PChatMessages, 
  markChatMessagesAsRead, 
  getUnreadCountForRequest,
  safeSetLocalStorage
} from "./transactionChat";

export { 
  sendTransactionChatMessage, 
  addSystemTxChatMessage, 
  getTransactionChatMessages, 
  getAllP2PChatMessages, 
  markChatMessagesAsRead, 
  getUnreadCountForRequest 
};

export interface ExtendedP2PAgent extends P2PAgent {
  subAdminOwner?: string;
  shiftStatus?: "online" | "offline" | "break";
  isFrozen?: boolean;
  supportedMethods?: string[];
  walletAddresses?: Record<string, string>;
  minLimit?: number;
  maxLimit?: number;
}

export interface ExtendedSubAdmin extends SubAdmin {
  floatBalance?: number;
  allocatedFloat?: number;
  maxActiveAgents?: number;
  maxAgentsAllowed?: number;
}

/**
 * Global Financial State Event Broadcaster
 * Dispatches all custom storage & financial reactivity events for cross-tab & live UI sync
 */
export function broadcastFinancialStateUpdates(): void {
  try {
    window.dispatchEvent(new Event("casino_balance_updated"));
    window.dispatchEvent(new Event("p2p_requests_updated"));
    window.dispatchEvent(new Event("p2p_state_updated"));
    window.dispatchEvent(new Event("banking_requests_updated"));
    window.dispatchEvent(new Event("casino_admin_audit_updated"));
    window.dispatchEvent(new Event("storage"));
  } catch (e) {
    console.error("Error broadcasting financial state updates:", e);
  }
}

/**
 * House Vault Reserve Management (Double-Entry Ledger Anchor)
 */
export function getHouseVaultReserves(): number {
  try {
    const pool = localStorage.getItem("casino_house_pool") || localStorage.getItem("casino_house_reserves");
    if (pool) {
      const val = parseFloat(pool);
      if (!isNaN(val)) return val;
    }
  } catch (e) {}
  return 5000000;
}

export function setHouseVaultReserves(amount: number): number {
  const safeAmount = Math.max(0, Math.round(amount * 100) / 100);
  try {
    safeSetLocalStorage("casino_house_pool", String(safeAmount));
    safeSetLocalStorage("casino_house_reserves", String(safeAmount));
    broadcastFinancialStateUpdates();
  } catch (e) {
    console.error("Error setting house vault reserves:", e);
  }
  return safeAmount;
}

export function updateHouseVaultReserves(delta: number): number {
  const current = getHouseVaultReserves();
  return setHouseVaultReserves(current + delta);
}

/**
 * Admin Audit Logger (Writes to harbinger_audit_trail_v1, casino_admin_audit_logs, and p2p_audit_logs_v1)
 */
export function addAdminAuditLog(
  message: string,
  type: "info" | "warning" | "success" | "danger" = "info",
  actionType: string = "FINANCE_LEDGER"
): void {
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString();

  const auditEntry = {
    id: "LOG-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
    timestamp: timeStr,
    date: dateStr,
    message,
    type,
    actionType,
    details: message,
    actorName: "System Operator",
    actorRole: "admin"
  };

  try {
    // 1. Harbinger Audit Trail
    const harbingerRaw = localStorage.getItem("harbinger_audit_trail_v1");
    const harbingerList = harbingerRaw ? JSON.parse(harbingerRaw) : [];
    harbingerList.unshift(auditEntry);
    safeSetLocalStorage("harbinger_audit_trail_v1", JSON.stringify(harbingerList.slice(0, 100)));

    // 2. Admin Audit Logs
    const adminLogsRaw = localStorage.getItem("casino_admin_audit_logs");
    const adminLogs = adminLogsRaw ? JSON.parse(adminLogsRaw) : [];
    adminLogs.unshift(auditEntry);
    safeSetLocalStorage("casino_admin_audit_logs", JSON.stringify(adminLogs.slice(0, 100)));

    // 3. P2P Audit Logs
    addP2PAuditLog(message, type);

    broadcastFinancialStateUpdates();
  } catch (e) {
    console.error("Error logging admin audit:", e);
  }
}

// Global P2P Killswitch check
export function isP2PGlobalKillSwitchActive(): boolean {
  try {
    const val = localStorage.getItem("p2p_global_killswitch");
    return val === "true";
  } catch (e) {
    return false;
  }
}

export function setP2PGlobalKillSwitch(active: boolean): void {
  try {
    localStorage.setItem("p2p_global_killswitch", active ? "true" : "false");
    broadcastFinancialStateUpdates();
  } catch (e) {
    console.error("Error setting P2P killswitch:", e);
  }
}

// Get and Sync Extended Agents
export function getExtendedAgents(): ExtendedP2PAgent[] {
  const baseAgents = getMergedP2PAgents() as ExtendedP2PAgent[];
  return baseAgents.map((a) => ({
    ...a,
    shiftStatus: a.shiftStatus || (a.status === "active" ? "online" : a.status === "offline" ? "offline" : "online"),
    isFrozen: a.isFrozen || a.status === "suspended" || false,
    subAdminOwner: a.subAdminOwner || "subadmin",
    supportedMethods: a.supportedMethods || [
      "USDT (TRC-20)",
      "USDT (BEP-20)",
      "Binance Pay",
      "bKash",
      "Nagad",
      "Rocket",
      "BTC",
      "ETH",
      "SOL"
    ],
    walletAddresses: a.walletAddresses || {
      "USDT (TRC-20)": "T9xMasterCasinoWalletUSDT2026Crypto",
      "USDT (BEP-20)": "0x71C7B5a713A29f27d5320d75a1348123A8429C91",
      "Binance Pay": "284910385",
      "bKash": a.phone || "01788-990011",
      "Nagad": a.phone || "01911-223344",
      "Rocket": a.phone || "01622-334455",
      "BTC": "bc1qnexaspincryptocasinohash777BTC",
      "ETH": "0x777NexaSpinCryptoCasinoAddress999ETH",
      "SOL": "SOL777NexaSpinCryptoCasinoAddressXyZ123SOL"
    },
    minLimit: a.minLimit || 10,
    maxLimit: a.maxLimit || 100000
  }));
}

export function saveExtendedAgents(agents: ExtendedP2PAgent[]): void {
  try {
    safeSetLocalStorage("casino_p2p_agents_v1", JSON.stringify(agents));
    safeSetLocalStorage("casino_agents_v1", JSON.stringify(agents));
    safeSetLocalStorage("p2p_agents", JSON.stringify(agents));
    broadcastFinancialStateUpdates();
  } catch (e) {
    console.error("Error saving agents:", e);
  }
}

export function deleteExtendedP2PAgent(agentId: string): ExtendedP2PAgent[] {
  deleteP2PAgent(agentId);
  broadcastFinancialStateUpdates();
  return getExtendedAgents();
}

// Global p2pSystem reactive state wrapper
export const p2pSystem = {
  get agents(): ExtendedP2PAgent[] {
    return getExtendedAgents();
  },
  set agents(updated: ExtendedP2PAgent[]) {
    saveExtendedAgents(updated);
  },
  get subAdmins(): ExtendedSubAdmin[] {
    return getExtendedSubAdmins();
  },
  set subAdmins(updated: ExtendedSubAdmin[]) {
    saveExtendedSubAdmins(updated);
  }
};

// Get and Sync Extended SubAdmins
export function getExtendedSubAdmins(): ExtendedSubAdmin[] {
  const base = getSubAdmins() as ExtendedSubAdmin[];
  return base.map((sa) => ({
    ...sa,
    floatBalance: typeof sa.floatBalance === "number" ? sa.floatBalance : 1000000,
    allocatedFloat: typeof sa.allocatedFloat === "number" ? sa.allocatedFloat : 5000000,
    maxActiveAgents: typeof sa.maxActiveAgents === "number" ? sa.maxActiveAgents : 10,
    maxAgentsAllowed: typeof sa.maxAgentsAllowed === "number" ? sa.maxAgentsAllowed : (sa.maxActiveAgents || 10)
  }));
}

export function saveExtendedSubAdmins(subAdmins: ExtendedSubAdmin[]): void {
  try {
    safeSetLocalStorage("casino_sub_admins_v1", JSON.stringify(subAdmins));
    broadcastFinancialStateUpdates();
  } catch (e) {
    console.error("Error saving sub-admins:", e);
  }
}

// Get All Banking Requests
export function getAllP2PRequests(): BankingRequest[] {
  return getBankingRequests();
}

export function saveAllP2PRequests(reqs: BankingRequest[]): void {
  try {
    safeSetLocalStorage("casino_banking_requests_v1", JSON.stringify(reqs));
    localStorage.removeItem("casino_banking_requests_v2");
    broadcastFinancialStateUpdates();
  } catch (e) {
    console.error("Error saving banking requests:", e);
  }
}

// Audit Logs
export function addP2PAuditLog(message: string, type: "info" | "warning" | "success" | "danger" = "info"): void {
  try {
    const raw = localStorage.getItem("p2p_audit_logs_v1");
    const logs = raw ? JSON.parse(raw) : [];
    logs.unshift({
      id: "LOG-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      date: new Date().toLocaleDateString(),
      message,
      type
    });
    // Keep last 80 logs
    safeSetLocalStorage("p2p_audit_logs_v1", JSON.stringify(logs.slice(0, 80)));
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("p2p_state_updated"));
  } catch (e) {
    console.error("Error adding audit log:", e);
  }
}

export function getP2PAuditLogs(): Array<{ id: string; timestamp: string; date: string; message: string; type: string }> {
  try {
    const raw = localStorage.getItem("p2p_audit_logs_v1");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Atomic Deposit Request Creation
 */
export function createP2PDepositOrder(params: {
  playerEmail: string;
  playerName: string;
  amount: number;
  agentId: string;
  paymentMethod: string;
}): { success: boolean; request?: BankingRequest; error?: string } {
  if (isP2PGlobalKillSwitchActive()) {
    return { success: false, error: "P2P Cashier service is currently disabled by Main Administration." };
  }

  const agents = getExtendedAgents();
  const agent = agents.find((a) => a.id === params.agentId);
  if (!agent) {
    return { success: false, error: "Selected Agent does not exist." };
  }

  if (agent.isFrozen || agent.status === "suspended") {
    return { success: false, error: "This Agent's vault is currently frozen by Sub-Admin governance." };
  }

  if (agent.shiftStatus === "offline" || agent.shiftStatus === "break") {
    return { success: false, error: "Agent is currently offline or on a shift break." };
  }

  if (params.amount < (agent.minLimit || 10)) {
    return { success: false, error: `Minimum order limit for this agent is $${agent.minLimit || 10}.` };
  }

  if (params.amount > agent.balance) {
    return { success: false, error: `Agent's current Float Vault ($${agent.balance.toLocaleString()}) cannot cover this deposit.` };
  }

  const reqId = "p2p-dep-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString();

  const newReq: BankingRequest = {
    id: reqId,
    type: "deposit",
    playerEmail: params.playerEmail,
    playerName: params.playerName,
    amount: params.amount,
    status: "pending", // pending_payment
    date: dateStr,
    time: timeStr,
    isCrypto: true,
    paymentCategory: "p2p_agent",
    cryptoAsset: params.paymentMethod,
    cryptoWalletAddress: agent.walletAddresses?.[params.paymentMethod] || agent.phone || "Agent Wallet",
    agentId: agent.id,
    agentName: agent.name,
    agentPhone: agent.phone || agent.phoneNumber,
    notes: `P2P Deposit via ${agent.name} (${params.paymentMethod})`,
  };

  const reqs = getAllP2PRequests();
  reqs.unshift(newReq);
  saveAllP2PRequests(reqs);

  addSystemTxChatMessage(reqId, `🟢 P2P Deposit Order initialized for $${params.amount.toLocaleString()} via Agent ${agent.name}. Please transfer payment off-chain and submit proof.`);
  addP2PAuditLog(`P2P DEPOSIT INIT: ${params.playerName} ($${params.amount}) -> Agent ${agent.name} [ID: ${reqId}]`, "info");

  return { success: true, request: newReq };
}

/**
 * Submit Payment Proof for Deposit
 */
export function submitDepositPaymentProof(
  requestId: string,
  txidOrReference: string,
  proofImageUrl?: string
): { success: boolean; error?: string } {
  const reqs = getAllP2PRequests();
  const index = reqs.findIndex((r) => r.id === requestId);
  if (index === -1) return { success: false, error: "Order not found." };

  const req = reqs[index];
  req.status = "payment_submitted" as any;
  req.cryptoTxHash = txidOrReference;
  req.transactionId = txidOrReference;
  if (proofImageUrl) req.proofImageUrl = proofImageUrl;

  reqs[index] = req;
  saveAllP2PRequests(reqs);

  addSystemTxChatMessage(
    requestId,
    `📸 Payment proof submitted by player! Ref/TXID: ${txidOrReference}. Waiting for Agent ${req.agentName || ""} verification.`
  );
  addP2PAuditLog(`P2P PROOF SUBMITTED: Order ${requestId} proof uploaded (${txidOrReference})`, "info");

  return { success: true };
}

/**
 * Atomic Deposit Approval by Agent
 * Rule 1: Agent Float -Amount, Player Balance +Amount, House Vault Reserves Unchanged.
 */
export function approveP2PDepositByAgent(requestId: string, agentId: string): { success: boolean; error?: string } {
  const reqs = getAllP2PRequests();
  const reqIndex = reqs.findIndex((r) => r.id === requestId);
  if (reqIndex === -1) return { success: false, error: "Order not found." };

  const req = reqs[reqIndex];
  if (req.status === "approved" || req.status === "completed") {
    return { success: false, error: "Order is already completed." };
  }

  const agents = getExtendedAgents();
  const agentIndex = agents.findIndex((a) => a.id === (req.agentId || agentId));
  if (agentIndex === -1) return { success: false, error: "Assigned Agent not found." };

  const agent = agents[agentIndex];
  if (agent.balance < req.amount) {
    return { success: false, error: `Insufficient Agent Liquidity! Your balance ($${agent.balance.toLocaleString()}) is lower than the deposit amount ($${req.amount.toLocaleString()}). Please recharge your agent float to approve this transaction.` };
  }

  // 1. Deduct Float Balance from Agent
  agent.balance -= req.amount;
  agent.depositRequestsProcessed = (agent.depositRequestsProcessed || 0) + 1;
  agent.totalVolumeApproved = (agent.totalVolumeApproved || 0) + req.amount;
  agents[agentIndex] = agent;
  saveExtendedAgents(agents);

  // 2. Credit Player's Real Cash Balance ($20 pure cash) + Calculate match bonus into Locked Bonus Balance
  let bonusRes = null;
  if (req.playerEmail) {
    bonusRes = processDepositApprovalForPlayer(req.playerEmail, req.amount, req.id);
  }

  // 3. House Vault Reserves: Unchanged (since liabilities shifted directly from Agent Float to Player Balance)

  // 4. Mark Request as Approved / Completed
  req.status = "approved";
  reqs[reqIndex] = req;
  saveAllP2PRequests(reqs);

  const bonusMsg = bonusRes ? ` 🎁 +$${bonusRes.bonusAmount.toLocaleString()} Match Bonus added to Locked Bonus Balance with 30x Wager ($${bonusRes.addedWagerRequired.toLocaleString()}).` : "";
  addSystemTxChatMessage(requestId, `✅ P2P DEPOSIT APPROVED! $${req.amount.toLocaleString()} Real Cash credited to Player Main Balance.${bonusMsg}`);
  addP2PAuditLog(`P2P DEPOSIT APPROVED: Agent ${agent.name} approved $${req.amount} for ${req.playerName}. Agent float remaining: $${agent.balance.toLocaleString()}`, "success");

  broadcastFinancialStateUpdates();
  return { success: true };
}

/**
 * Direct Admin Deposit Approval
 * Rule 1: Player Balance +Amount, House Vault Reserves +Amount
 */
export function approveDepositByAdmin(requestId: string): { success: boolean; error?: string } {
  const reqs = getAllP2PRequests();
  const reqIndex = reqs.findIndex(r => r.id === requestId);
  if (reqIndex === -1) return { success: false, error: "Request not found." };

  const req = reqs[reqIndex];
  if (req.status === "approved" || req.status === "completed") {
    return { success: false, error: "Request is already approved." };
  }

  // 1. Credit Player Balance + Match Bonus
  if (req.playerEmail) {
    processDepositApprovalForPlayer(req.playerEmail, req.amount, req.id);
  }

  // 2. Direct Admin Deposit Approval -> House Vault Reserves +req.amount (House backing deposit)
  updateHouseVaultReserves(+req.amount);

  // 3. Mark approved
  req.status = "approved";
  reqs[reqIndex] = req;
  saveAllP2PRequests(reqs);

  addAdminAuditLog(
    `DIRECT DEPOSIT APPROVED: Admin approved deposit of $${req.amount.toLocaleString()} for player ${req.playerName}. House Vault Reserves credited +$${req.amount.toLocaleString()}`,
    "success",
    "DIRECT_DEPOSIT_APPROVED"
  );

  broadcastFinancialStateUpdates();
  return { success: true };
}

/**
 * Direct Admin Withdrawal Approval
 * Rule 2: Player Balance -Amount (deducted upon request creation), House Vault Reserves -Amount (payout)
 */
export function approveWithdrawalByAdmin(requestId: string): { success: boolean; error?: string } {
  const reqs = getAllP2PRequests();
  const reqIndex = reqs.findIndex(r => r.id === requestId);
  if (reqIndex === -1) return { success: false, error: "Request not found." };

  const req = reqs[reqIndex];
  if (req.status === "approved" || req.status === "completed") {
    return { success: false, error: "Request is already approved." };
  }

  // Direct Admin Withdrawal Approval -> House Vault Reserves -req.amount (payout)
  updateHouseVaultReserves(-req.amount);

  req.status = "approved";
  reqs[reqIndex] = req;
  saveAllP2PRequests(reqs);

  addAdminAuditLog(
    `DIRECT WITHDRAWAL APPROVED: Admin approved payout of $${req.amount.toLocaleString()} for player ${req.playerName}. House Vault Reserves debited -$${req.amount.toLocaleString()}`,
    "success",
    "DIRECT_WITHDRAWAL_APPROVED"
  );

  broadcastFinancialStateUpdates();
  return { success: true };
}

/**
 * Atomic Withdrawal Request Creation (Locks Player Chips Immediately)
 * Rule 2: Player Balance -Amount (locked in escrow), Agent Float & House Vault Reserves Unchanged.
 */
export function createP2PWithdrawalOrder(params: {
  playerEmail: string;
  playerName: string;
  amount: number;
  agentId: string;
  paymentMethod: string;
  playerWalletOrPhone: string;
}): { success: boolean; request?: BankingRequest; error?: string } {
  if (isP2PGlobalKillSwitchActive()) {
    return { success: false, error: "P2P Cashier service is currently disabled by Main Administration." };
  }

  const agents = getExtendedAgents();
  const agent = agents.find((a) => a.id === params.agentId);
  if (!agent) {
    return { success: false, error: "Selected Agent does not exist." };
  }

  if (agent.isFrozen || agent.status === "suspended") {
    return { success: false, error: "This Agent's vault is currently frozen by Sub-Admin governance." };
  }

  if (agent.shiftStatus === "offline" || agent.shiftStatus === "break") {
    return { success: false, error: "Agent is currently offline or on a shift break." };
  }

  // Check & Lock Player's Chips immediately
  const players = getRegisteredPlayers();
  const playerIndex = players.findIndex((p) => p.email.toLowerCase() === params.playerEmail.toLowerCase());
  if (playerIndex === -1) return { success: false, error: "Player account not found." };

  const player = players[playerIndex];
  const currentChips = typeof player.chips === "number" ? player.chips : 0;
  if (currentChips < params.amount) {
    return { success: false, error: `Insufficient Real Cash Balance ($${currentChips.toLocaleString()}) for withdrawal.` };
  }

  // Deduct/Lock player chips immediately into escrow
  player.chips = currentChips - params.amount;
  players[playerIndex] = player;

  // Persist updated player chips in registered_players_v1 AND active user session
  try {
    localStorage.setItem("registered_players_v1", JSON.stringify(players));
    const activePlayerRaw = localStorage.getItem("casino_user");
    if (activePlayerRaw) {
      const activeP = JSON.parse(activePlayerRaw);
      if (activeP && activeP.email?.toLowerCase() === params.playerEmail.toLowerCase()) {
        activeP.chips = player.chips;
        localStorage.setItem("casino_user", JSON.stringify(activeP));
        localStorage.setItem("casino_chips", String(player.chips));
      }
    }
  } catch (e) {
    console.error("Error updating player chips for withdrawal escrow:", e);
  }

  const reqId = "p2p-wth-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString();

  const newReq: BankingRequest = {
    id: reqId,
    type: "withdraw",
    playerEmail: params.playerEmail,
    playerName: params.playerName,
    amount: params.amount,
    status: "pending",
    date: dateStr,
    time: timeStr,
    isCrypto: true,
    paymentCategory: "p2p_agent",
    cryptoAsset: params.paymentMethod,
    cryptoWalletAddress: params.playerWalletOrPhone,
    agentId: agent.id,
    agentName: agent.name,
    agentPhone: agent.phone || agent.phoneNumber,
    notes: `P2P Withdrawal via ${agent.name} (${params.paymentMethod}) to ${params.playerWalletOrPhone}`,
  };

  const reqs = getAllP2PRequests();
  reqs.unshift(newReq);
  saveAllP2PRequests(reqs);

  addSystemTxChatMessage(reqId, `🔒 P2P Withdrawal initialized: $${params.amount.toLocaleString()} chips locked in Escrow. Agent ${agent.name} notified to send off-chain payout.`);
  addP2PAuditLog(`P2P WITHDRAWAL INIT: ${params.playerName} ($${params.amount}) locked in Escrow -> Agent ${agent.name} [ID: ${reqId}]`, "info");

  broadcastFinancialStateUpdates();
  return { success: true, request: newReq };
}

/**
 * Agent Marks Withdrawal Transferred Off-Chain
 */
export function markP2PWithdrawalTransferredByAgent(
  requestId: string,
  txidOrRef: string,
  proofImageUrl?: string
): { success: boolean; error?: string } {
  const reqs = getAllP2PRequests();
  const index = reqs.findIndex((r) => r.id === requestId);
  if (index === -1) return { success: false, error: "Order not found." };

  const req = reqs[index];
  req.status = "ticket_approved" as any;
  req.cryptoTxHash = txidOrRef;
  req.transactionId = txidOrRef;
  if (proofImageUrl) req.proofImageUrl = proofImageUrl;

  reqs[index] = req;
  saveAllP2PRequests(reqs);

  addSystemTxChatMessage(requestId, `💸 Agent ${req.agentName || ""} uploaded withdrawal payout proof! Ref/TXID: ${txidOrRef}. Awaiting player confirmation.`);
  addP2PAuditLog(`P2P WITHDRAWAL TRANSFERRED: Agent ${req.agentName} sent payout for order ${requestId} (${txidOrRef})`, "info");

  broadcastFinancialStateUpdates();
  return { success: true };
}

/**
 * Confirm Withdrawal Received & Complete Escrow Settlement (Agent Receives Float)
 * Rule 2: Agent Float +Amount, Player Balance already deducted, House Vault Reserves Unchanged.
 */
export function confirmP2PWithdrawalSettlement(requestId: string): { success: boolean; error?: string } {
  const reqs = getAllP2PRequests();
  const reqIndex = reqs.findIndex((r) => r.id === requestId);
  if (reqIndex === -1) return { success: false, error: "Order not found." };

  const req = reqs[reqIndex];
  if (req.status === "approved" || req.status === "completed") {
    return { success: false, error: "Order already completed." };
  }

  // Credit Float Balance to Agent (in exchange for off-chain payout to player)
  const agents = getExtendedAgents();
  const agentIndex = agents.findIndex((a) => a.id === req.agentId);
  if (agentIndex !== -1) {
    const agent = agents[agentIndex];
    agent.balance += req.amount;
    agent.withdrawRequestsProcessed = (agent.withdrawRequestsProcessed || 0) + 1;
    agent.totalVolumeApproved = (agent.totalVolumeApproved || 0) + req.amount;
    agents[agentIndex] = agent;
    saveExtendedAgents(agents);
  }

  req.status = "approved";
  reqs[reqIndex] = req;
  saveAllP2PRequests(reqs);

  addSystemTxChatMessage(requestId, `🎉 P2P WITHDRAWAL COMPLETED! Player confirmed receipt of $${req.amount.toLocaleString()}. Agent float updated (+ $${req.amount.toLocaleString()}).`);
  addP2PAuditLog(`P2P WITHDRAWAL COMPLETED: Order ${requestId} finalized. Agent float increased by $${req.amount}.`, "success");

  broadcastFinancialStateUpdates();
  return { success: true };
}

/**
 * Dispute Resolution: Force Release to Player or Cancel & Refund
 */
export function resolveP2PDispute(
  requestId: string,
  outcome: "release_to_player" | "refund_to_agent",
  resolvedByRole: string,
  resolvedByName: string
): { success: boolean; error?: string } {
  const reqs = getAllP2PRequests();
  const reqIndex = reqs.findIndex((r) => r.id === requestId);
  if (reqIndex === -1) return { success: false, error: "Order not found." };

  const req = reqs[reqIndex];

  if (req.type === "deposit") {
    if (outcome === "release_to_player") {
      // Force approve deposit: deduct Agent float, credit Player
      const agents = getExtendedAgents();
      const agentIndex = agents.findIndex((a) => a.id === req.agentId);
      if (agentIndex !== -1) {
        agents[agentIndex].balance -= req.amount;
        saveExtendedAgents(agents);
      }
      if (req.playerEmail) {
        processDepositApprovalForPlayer(req.playerEmail, req.amount, req.id);
      }
      req.status = "approved";
      reqs[reqIndex] = req;
      saveAllP2PRequests(reqs);

      addSystemTxChatMessage(requestId, `⚖️ DISPUTE RESOLVED by ${resolvedByRole} (${resolvedByName}): FORCE RELEASED $${req.amount.toLocaleString()} to Player Real Cash Balance.`);
      addP2PAuditLog(`P2P DISPUTE RESOLVED: Force approved deposit ${requestId} to player ${req.playerName}`, "warning");
    } else {
      // Cancel deposit: order rejected
      req.status = "rejected";
      reqs[reqIndex] = req;
      saveAllP2PRequests(reqs);

      addSystemTxChatMessage(requestId, `⚖️ DISPUTE RESOLVED by ${resolvedByRole} (${resolvedByName}): ORDER CANCELLED. No funds deducted from Agent.`);
      addP2PAuditLog(`P2P DISPUTE RESOLVED: Cancelled deposit ${requestId}`, "warning");
    }
  } else {
    // Withdrawal dispute
    if (outcome === "release_to_player") {
      // Complete withdrawal: credit Agent float (payout confirmed)
      const agents = getExtendedAgents();
      const agentIndex = agents.findIndex((a) => a.id === req.agentId);
      if (agentIndex !== -1) {
        agents[agentIndex].balance += req.amount;
        saveExtendedAgents(agents);
      }
      req.status = "approved";
      reqs[reqIndex] = req;
      saveAllP2PRequests(reqs);

      addSystemTxChatMessage(requestId, `⚖️ DISPUTE RESOLVED by ${resolvedByRole} (${resolvedByName}): Payout confirmed! Agent float credited +$${req.amount.toLocaleString()}.`);
      addP2PAuditLog(`P2P DISPUTE RESOLVED: Completed withdrawal ${requestId}`, "warning");
    } else {
      // Cancel & Refund withdrawal: unlock chips back to player
      const players = getRegisteredPlayers();
      const pIndex = players.findIndex((p) => p.email.toLowerCase() === req.playerEmail?.toLowerCase());
      if (pIndex !== -1) {
        players[pIndex].chips = (players[pIndex].chips || 0) + req.amount;
        localStorage.setItem("registered_players_v1", JSON.stringify(players));
        const activeUserRaw = localStorage.getItem("casino_user");
        if (activeUserRaw) {
          const u = JSON.parse(activeUserRaw);
          if (u && u.email?.toLowerCase() === req.playerEmail?.toLowerCase()) {
            u.chips = players[pIndex].chips;
            localStorage.setItem("casino_user", JSON.stringify(u));
            localStorage.setItem("casino_chips", String(players[pIndex].chips));
          }
        }
      }
      req.status = "rejected";
      reqs[reqIndex] = req;
      saveAllP2PRequests(reqs);

      addSystemTxChatMessage(requestId, `⚖️ DISPUTE RESOLVED by ${resolvedByRole} (${resolvedByName}): Order CANCELLED. $${req.amount.toLocaleString()} chips refunded back to Player Main Balance.`);
      addP2PAuditLog(`P2P DISPUTE RESOLVED: Cancelled withdrawal ${requestId} and refunded player chips.`, "warning");
    }
  }

  broadcastFinancialStateUpdates();
  return { success: true };
}

/**
 * Raise Dispute
 */
export function raiseP2PDispute(requestId: string, openedByRole: string, reason: string): { success: boolean; error?: string } {
  const reqs = getAllP2PRequests();
  const index = reqs.findIndex((r) => r.id === requestId);
  if (index === -1) return { success: false, error: "Order not found." };

  const req = reqs[index];
  req.status = "rejected" as any;
  req.notes = `DISPUTED BY ${openedByRole.toUpperCase()}: ${reason}`;
  
  addSystemTxChatMessage(requestId, `🚨 DISPUTE RAISED by ${openedByRole.toUpperCase()}: "${reason}". Sub-Admin Arbitrator notified to inspect receipt/TXID proof!`);
  addP2PAuditLog(`P2P DISPUTE RAISED: Order ${requestId} raised to DISPUTED status by ${openedByRole} (${reason})`, "danger");

  reqs[index] = req;
  saveAllP2PRequests(reqs);

  broadcastFinancialStateUpdates();
  return { success: true };
}

/**
 * Sub-Admin Float Allocation to Agent (Sub-Admin -> Agent)
 * Rule 3: Sub-Admin Float -Amount, Agent Float +Amount, House Vault Reserves Unchanged.
 */
export function injectFloatFromSubAdminToAgent(
  subAdminUsername: string,
  agentId: string,
  amount: number
): { success: boolean; error?: string } {
  if (amount <= 0) return { success: false, error: "Amount must be positive." };

  const subAdmins = getExtendedSubAdmins();
  const saIndex = subAdmins.findIndex((sa) => sa.username === subAdminUsername);
  if (saIndex === -1) return { success: false, error: "Sub-Admin account not found." };

  const sa = subAdmins[saIndex];
  const saFloat = sa.floatBalance || 0;
  if (saFloat < amount) {
    return { success: false, error: `Insufficient Sub-Admin Float Balance ($${saFloat.toLocaleString()}) to allocate $${amount.toLocaleString()} to Agent.` };
  }

  const agents = getExtendedAgents();
  const agentIndex = agents.findIndex((a) => a.id === agentId);
  if (agentIndex === -1) return { success: false, error: "Agent not found." };

  sa.floatBalance = saFloat - amount;
  subAdmins[saIndex] = sa;
  saveExtendedSubAdmins(subAdmins);

  const agent = agents[agentIndex];
  agent.balance += amount;
  agents[agentIndex] = agent;
  saveExtendedAgents(agents);

  addP2PAuditLog(`FLOAT ALLOCATION: Sub-Admin ${sa.name} allocated $${amount.toLocaleString()} float to Agent ${agent.name}. Agent float now: $${agent.balance.toLocaleString()}`, "success");

  broadcastFinancialStateUpdates();
  return { success: true };
}

/**
 * Recall Float from Agent back to Sub-Admin (Agent -> Sub-Admin)
 * Rule 3: Agent Float -Amount, Sub-Admin Float +Amount, House Vault Reserves Unchanged.
 */
export function recallFloatFromAgentToSubAdmin(
  subAdminUsername: string,
  agentId: string,
  amount: number
): { success: boolean; error?: string } {
  if (amount <= 0) return { success: false, error: "Amount must be positive." };

  const agents = getExtendedAgents();
  const agentIndex = agents.findIndex((a) => a.id === agentId);
  if (agentIndex === -1) return { success: false, error: "Agent not found." };

  const agent = agents[agentIndex];
  if (agent.balance < amount) {
    return { success: false, error: `Agent balance ($${agent.balance.toLocaleString()}) is less than recall amount ($${amount.toLocaleString()}).` };
  }

  const subAdmins = getExtendedSubAdmins();
  const saIndex = subAdmins.findIndex((sa) => sa.username === subAdminUsername || sa.name === subAdminUsername);
  
  if (saIndex !== -1) {
    const sa = subAdmins[saIndex];
    sa.floatBalance = (sa.floatBalance || 0) + amount;
    subAdmins[saIndex] = sa;
    saveExtendedSubAdmins(subAdmins);
  }

  agent.balance -= amount;
  agents[agentIndex] = agent;
  saveExtendedAgents(agents);

  addP2PAuditLog(`FLOAT RECALL: Recalled $${amount.toLocaleString()} float from Agent ${agent.name}. Agent float now: $${agent.balance.toLocaleString()}`, "info");

  broadcastFinancialStateUpdates();
  return { success: true };
}

/**
 * Main Admin Float Allocation to Sub-Admin (Main Admin -> Sub-Admin)
 * Rule 3: Sub-Admin Float +Amount, House Vault Reserves -Amount
 */
export function allocateFloatFromMainAdminToSubAdmin(
  subAdminUsername: string,
  amount: number
): { success: boolean; error?: string } {
  if (amount <= 0) return { success: false, error: "Amount must be positive." };

  const subAdmins = getExtendedSubAdmins();
  const saIndex = subAdmins.findIndex((sa) => sa.username === subAdminUsername);
  if (saIndex === -1) return { success: false, error: "Sub-Admin account not found." };

  const sa = subAdmins[saIndex];
  sa.floatBalance = (sa.floatBalance || 0) + amount;
  sa.allocatedFloat = (sa.allocatedFloat || 0) + amount;
  subAdmins[saIndex] = sa;
  saveExtendedSubAdmins(subAdmins);

  // Offset House Vault Reserves by -amount
  updateHouseVaultReserves(-amount);

  addAdminAuditLog(`MAIN ADMIN FLOAT: Allocated $${amount.toLocaleString()} global operational credit to Sub-Admin ${sa.name}. House Vault Reserves offset -$${amount.toLocaleString()}`, "success", "SUBADMIN_FLOAT");

  broadcastFinancialStateUpdates();
  return { success: true };
}

/**
 * Main Admin Direct Float Injection to Agent (Main Admin -> Agent)
 * Rule 3: Agent Float +Amount, House Vault Reserves -Amount
 */
export function injectFloatToAgent(
  agentId: string,
  amount: number
): { success: boolean; error?: string } {
  if (amount <= 0) return { success: false, error: "Amount must be positive." };

  const agents = getExtendedAgents();
  const agentIndex = agents.findIndex((a) => a.id === agentId);
  if (agentIndex === -1) return { success: false, error: "Agent not found." };

  const agent = agents[agentIndex];
  agent.balance += amount;
  agents[agentIndex] = agent;
  saveExtendedAgents(agents);

  // Offset House Vault Reserves by -amount
  updateHouseVaultReserves(-amount);

  addAdminAuditLog(
    `FLOAT INJECTION: Allocated $${amount.toLocaleString()} float to Agent ${agent.name}. Agent float now: $${agent.balance.toLocaleString()}. House Vault Reserves offset -$${amount.toLocaleString()}`,
    "success",
    "FLOAT_INJECTION"
  );

  broadcastFinancialStateUpdates();
  return { success: true };
}

/**
 * Main Admin Direct Float Recall from Agent (Main Admin <- Agent)
 * Rule 3: Agent Float -Amount, House Vault Reserves +Amount
 */
export function recallFloatFromAgent(
  agentId: string,
  amount: number
): { success: boolean; error?: string } {
  if (amount <= 0) return { success: false, error: "Amount must be positive." };

  const agents = getExtendedAgents();
  const agentIndex = agents.findIndex((a) => a.id === agentId);
  if (agentIndex === -1) return { success: false, error: "Agent not found." };

  const agent = agents[agentIndex];
  if (agent.balance < amount) {
    return { success: false, error: `Agent balance ($${agent.balance.toLocaleString()}) is less than recall amount ($${amount.toLocaleString()}).` };
  }

  agent.balance -= amount;
  agents[agentIndex] = agent;
  saveExtendedAgents(agents);

  // Offset House Vault Reserves by +amount
  updateHouseVaultReserves(+amount);

  addAdminAuditLog(
    `FLOAT RECALL: Recalled $${amount.toLocaleString()} float from Agent ${agent.name}. Agent float now: $${agent.balance.toLocaleString()}. House Vault Reserves offset +$${amount.toLocaleString()}`,
    "info",
    "FLOAT_RECALL"
  );

  broadcastFinancialStateUpdates();
  return { success: true };
}
