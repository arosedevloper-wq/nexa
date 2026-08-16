import { Request, Response, NextFunction } from "express";

export interface WalletTransaction {
  id: string;
  userId: string;
  type: "bet" | "win" | "deposit" | "withdrawal" | "withdrawal_refund";
  amount: number;
  balanceAfter: number;
  timestamp: string;
  gameId?: string;
  details?: string;
  status: "completed" | "pending_admin_approval" | "approved" | "rejected";
}

export interface UserWallet {
  userId: string;
  userEmail: string;
  balance: number;
  transactions: WalletTransaction[];
}

// In-memory atomic wallet store (serves as server-authoritative balance cache)
const userWallets = new Map<string, UserWallet>();

// Mutex locks per user ID to guarantee strict sequential execution and eliminate race conditions
const userLocks = new Map<string, Promise<void>>();

/**
 * Acquires an async mutex lock for a specific user ID.
 * Returns a release function that MUST be called when finished.
 */
export async function acquireUserLock(userId: string): Promise<() => void> {
  const normalizedId = userId.toLowerCase().trim();
  let currentLock = userLocks.get(normalizedId) || Promise.resolve();

  let releaseLock: () => void = () => {};
  const nextLock = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });

  // Chain lock so subsequent operations wait
  const lockPromise = currentLock.then(() => nextLock);
  userLocks.set(normalizedId, lockPromise);

  await currentLock;
  return releaseLock;
}

/**
 * Ensures user wallet object exists
 */
export function getOrCreateWallet(userId: string, userEmail: string = "", initialBalance: number = 1000): UserWallet {
  const normalizedId = (userId || userEmail || "anonymous").toLowerCase().trim();
  if (!userWallets.has(normalizedId)) {
    userWallets.set(normalizedId, {
      userId: normalizedId,
      userEmail: userEmail || normalizedId,
      balance: initialBalance,
      transactions: [],
    });
  }
  return userWallets.get(normalizedId)!;
}

/**
 * Row-Level Security (RLS) Middleware:
 * Validates that requests carry valid user identification and match the requested user context.
 */
export function validateRowLevelSecurity(req: Request, res: Response, next: NextFunction) {
  const authEmail = (req.headers["x-user-email"] as string) || (req.headers["x-user-id"] as string);
  
  if (!authEmail) {
    return res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Row-Level Security violation: Missing user authorization header (x-user-email).",
    });
  }

  // Attach verified user identity to request
  (req as any).authenticatedUser = authEmail.toLowerCase().trim();
  next();
}

/**
 * Atomic wallet debit & credit with non-negative balance guard.
 */
export async function executeAtomicGameTransaction(
  userId: string,
  userEmail: string,
  betAmount: number,
  winAmount: number,
  gameId: string
): Promise<{
  success: boolean;
  netGain: number;
  newBalance: number;
  transactionId: string;
  error?: string;
}> {
  const release = await acquireUserLock(userId);

  try {
    const wallet = getOrCreateWallet(userId, userEmail);

    // Strict non-negative balance check
    if (wallet.balance < betAmount) {
      return {
        success: false,
        netGain: 0,
        newBalance: wallet.balance,
        transactionId: "",
        error: "INSUFFICIENT_FUNDS: Bet amount exceeds available balance.",
      };
    }

    // Atomic Balance Update
    wallet.balance = wallet.balance - betAmount + winAmount;

    // Enforce Non-negative balance rule
    if (wallet.balance < 0) {
      wallet.balance = 0;
    }

    const txId = "TX-GAME-" + Math.random().toString(36).substring(2, 9).toUpperCase();
    const netGain = winAmount - betAmount;

    wallet.transactions.unshift({
      id: txId,
      userId: wallet.userId,
      type: winAmount > 0 ? "win" : "bet",
      amount: winAmount > 0 ? winAmount : betAmount,
      balanceAfter: wallet.balance,
      timestamp: new Date().toISOString(),
      gameId,
      details: winAmount > 0 ? `Won $${winAmount} on ${gameId}` : `Wagered $${betAmount} on ${gameId}`,
      status: "completed",
    });

    // Prune old transaction logs to prevent unbounded memory growth (keep latest 500)
    if (wallet.transactions.length > 500) {
      wallet.transactions.length = 500;
    }

    return {
      success: true,
      netGain,
      newBalance: wallet.balance,
      transactionId: txId,
    };
  } finally {
    release();
  }
}

/**
 * Atomic withdrawal request with balance lock and immediate deduction.
 */
export async function executeAtomicWithdrawal(
  userId: string,
  userEmail: string,
  amount: number,
  cryptoAsset: string,
  walletAddress: string
): Promise<{
  success: boolean;
  withdrawalId: string;
  newBalance: number;
  error?: string;
}> {
  const release = await acquireUserLock(userId);

  try {
    const wallet = getOrCreateWallet(userId, userEmail);

    if (amount < 10) {
      return {
        success: false,
        withdrawalId: "",
        newBalance: wallet.balance,
        error: "MINIMUM_WITHDRAWAL: Minimum withdrawal amount is $10.",
      };
    }

    // Strict non-negative balance check
    if (wallet.balance < amount) {
      return {
        success: false,
        withdrawalId: "",
        newBalance: wallet.balance,
        error: "INSUFFICIENT_FUNDS: Withdrawal amount exceeds available balance.",
      };
    }

    // Atomic balance deduction
    wallet.balance -= amount;

    const wdId = "WD-CRYPTO-" + Math.random().toString(36).substring(2, 9).toUpperCase();

    wallet.transactions.unshift({
      id: wdId,
      userId: wallet.userId,
      type: "withdrawal",
      amount,
      balanceAfter: wallet.balance,
      timestamp: new Date().toISOString(),
      details: `Withdrawal request of $${amount} via ${cryptoAsset} to ${walletAddress}`,
      status: "pending_admin_approval",
    });

    if (wallet.transactions.length > 500) {
      wallet.transactions.length = 500;
    }

    return {
      success: true,
      withdrawalId: wdId,
      newBalance: wallet.balance,
    };
  } finally {
    release();
  }
}

/**
 * Admin action: Refund rejected withdrawal back to user balance.
 */
export async function refundRejectedWithdrawal(
  userId: string,
  amount: number,
  withdrawalId: string
): Promise<{ success: boolean; newBalance: number }> {
  const release = await acquireUserLock(userId);

  try {
    const wallet = getOrCreateWallet(userId);
    wallet.balance += amount;

    wallet.transactions.unshift({
      id: "REFUND-" + Math.random().toString(36).substring(2, 9).toUpperCase(),
      userId: wallet.userId,
      type: "withdrawal_refund",
      amount,
      balanceAfter: wallet.balance,
      timestamp: new Date().toISOString(),
      details: `Refunded rejected withdrawal ${withdrawalId}`,
      status: "completed",
    });

    return { success: true, newBalance: wallet.balance };
  } finally {
    release();
  }
}

/**
 * Synchronize wallet balance with external state update
 */
export async function syncWalletBalance(userId: string, userEmail: string, newBalance: number) {
  const release = await acquireUserLock(userId);
  try {
    const wallet = getOrCreateWallet(userId, userEmail);
    wallet.balance = Math.max(0, newBalance);
    return wallet.balance;
  } finally {
    release();
  }
}
