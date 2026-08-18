import { getBankingRequests, BankingRequest } from "../constants/bankingRequests";
import { getRegisteredPlayers, RegisteredPlayer } from "../constants/defaultPlayers";
import { savePlayerToDatabase } from "../lib/db";

/**
 * Calculates the dynamic bonus percentage, bonus amount, and 30x wagering target
 * based on the number of prior approved deposits.
 * 
 * Rules:
 * - 1st Deposit: 200% match bonus
 * - 2nd Deposit: 300% match bonus
 * - 3rd Deposit (and subsequent): 400% match bonus
 * - Wagering Target = Total Locked Bonus Amount * 30
 */
export function calculateDepositBonus(depositAmount: number, priorApprovedDepositCount: number) {
  let bonusPercent = 200; // 1st deposit: 200% match
  if (priorApprovedDepositCount === 1) {
    bonusPercent = 300; // 2nd deposit: 300% match
  } else if (priorApprovedDepositCount >= 2) {
    bonusPercent = 400; // 3rd+ deposit: 400% match
  }

  const bonusAmount = Math.floor((depositAmount * bonusPercent) / 100);
  const addedWagerRequired = bonusAmount * 30; // Wagering Target = Total Locked Bonus Amount * 30

  return {
    bonusPercent,
    bonusAmount,
    addedWagerRequired
  };
}

/**
 * Counts prior approved deposits for a given player email (excluding current request ID if provided).
 */
export function getApprovedDepositCountForPlayer(playerEmail: string, currentRequestId?: string): number {
  if (!playerEmail) return 0;
  const list = getBankingRequests();
  return list.filter(r => 
    r.type === "deposit" && 
    r.status === "approved" && 
    r.playerEmail?.toLowerCase() === playerEmail.toLowerCase() &&
    (!currentRequestId || r.id !== currentRequestId)
  ).length;
}

/**
 * Executes full deposit approval processing for a player:
 * - Calculates 200%/300%/400% match bonus based on prior deposit history
 * - Credits Real Cash (`chips`), Locked Bonus Balance (`bonusBalance`), and Wagering Target (`totalWagerRequired`)
 * - Updates `registered_players_v1` in localStorage and DB
 * - Dispatches storage event for instant UI reaction
 */
export function processDepositApprovalForPlayer(playerEmail: string, depositAmount: number, currentRequestId?: string) {
  if (!playerEmail || depositAmount <= 0) return null;

  const priorCount = getApprovedDepositCountForPlayer(playerEmail, currentRequestId);
  const { bonusPercent, bonusAmount, addedWagerRequired } = calculateDepositBonus(depositAmount, priorCount);

  const emailClean = playerEmail.toLowerCase().trim();
  const phoneClean = playerEmail.replace(/\D/g, "");

  // Load registered players
  const players = getRegisteredPlayers();
  let idx = players.findIndex(p => 
    (p.email && p.email.toLowerCase().trim() === emailClean) ||
    (phoneClean && p.phoneNumber && p.phoneNumber.replace(/\D/g, "") === phoneClean) ||
    (p.name && p.name.toLowerCase().trim() === emailClean)
  );

  let updatedPlayer: RegisteredPlayer | null = null;

  if (idx !== -1) {
    const p = players[idx];
    const currentChips = p.chips !== undefined ? Number(p.chips) : 0;
    const currentBonus = p.bonusBalance !== undefined ? Number(p.bonusBalance) : 200;
    const currentTarget = p.totalWagerRequired !== undefined ? Number(p.totalWagerRequired) : (currentBonus * 30);
    const currentProgress = p.currentWagerProgress !== undefined ? Number(p.currentWagerProgress) : 0;

    p.chips = currentChips + depositAmount;
    p.bonusBalance = currentBonus + bonusAmount;
    p.totalWagerRequired = currentTarget + addedWagerRequired;
    p.currentWagerProgress = currentProgress;
    p.peakChips = Math.max(p.peakChips || 0, p.chips);
    p.hasDeposited = true;

    updatedPlayer = p;
    localStorage.setItem("registered_players_v1", JSON.stringify(players));
    savePlayerToDatabase(p);
  } else {
    // If player record doesn't exist yet, auto-create global player record
    const newPlayer: RegisteredPlayer = {
      name: playerEmail.split("@")[0] || "Global Player",
      email: playerEmail.includes("@") ? emailClean : `${playerEmail.replace(/\s+/g, "_")}@global.player`,
      phoneNumber: phoneClean || "01700-000000",
      password: "password123",
      referralCode: "VIP" + Math.floor(1000 + Math.random() * 9000),
      chips: depositAmount,
      bonusBalance: 200 + bonusAmount,
      totalWagerRequired: (200 * 30) + addedWagerRequired,
      currentWagerProgress: 0,
      peakChips: depositAmount,
      hasDeposited: true,
      status: "active"
    };
    players.push(newPlayer);
    updatedPlayer = newPlayer;
    localStorage.setItem("registered_players_v1", JSON.stringify(players));
    savePlayerToDatabase(newPlayer);
  }

  // Check if current logged in user matches this email/phone and update local storage keys directly
  try {
    const userStr = localStorage.getItem("casino_user");
    if (userStr) {
      const user = JSON.parse(userStr);
      const userEmail = user?.email?.toLowerCase()?.trim();
      const userPhone = user?.phoneNumber?.replace(/\D/g, "");
      const userName = user?.name?.toLowerCase()?.trim();

      const isMe = (userEmail && userEmail === emailClean) ||
                   (userPhone && phoneClean && userPhone === phoneClean) ||
                   (userName && userName === emailClean);

      if (isMe) {
        const curChips = Number(localStorage.getItem("casino_chips") || 0);
        const curBonus = Number(localStorage.getItem("casino_bonus_balance") || 200);
        const curWager = Number(localStorage.getItem("casino_total_wager_required") || (curBonus * 30));

        localStorage.setItem("casino_chips", String(curChips + depositAmount));
        localStorage.setItem("casino_bonus_balance", String(curBonus + bonusAmount));
        localStorage.setItem("casino_total_wager_required", String(curWager + addedWagerRequired));
        localStorage.setItem("casino_has_deposited", "true");
      }
    }
  } catch (e) {
    console.error("Error updating local user storage in processDepositApprovalForPlayer:", e);
  }

  // Notify listeners / active components
  window.dispatchEvent(new Event("storage"));
  window.dispatchEvent(new Event("balance_updated"));
  window.dispatchEvent(new Event("players_updated"));
  window.dispatchEvent(new Event("p2p_state_updated"));
  window.dispatchEvent(new CustomEvent("deposit_approved", { 
    detail: { 
      playerEmail, 
      depositAmount, 
      bonusAmount, 
      addedWagerRequired,
      newBalance: updatedPlayer?.chips 
    } 
  }));

  return {
    bonusPercent,
    bonusAmount,
    addedWagerRequired,
    priorCount,
    updatedPlayer
  };
}

/**
 * Checks whether a player has completed at least one successful deposit ($10+).
 */
export function hasPlayerCompletedDeposit(playerEmail?: string): boolean {
  if (localStorage.getItem("casino_has_deposited") === "true") {
    return true;
  }

  let targetEmail = playerEmail;
  if (!targetEmail) {
    try {
      const userStr = localStorage.getItem("casino_user");
      if (userStr) {
        const user = JSON.parse(userStr);
        targetEmail = user?.email;
      }
    } catch (e) {}
  }

  if (!targetEmail) return false;

  const emailLower = targetEmail.toLowerCase();

  // Check registered players
  const players = getRegisteredPlayers();
  const player = players.find(p => p.email && p.email.toLowerCase() === emailLower);
  if (player && (player as any).hasDeposited) {
    return true;
  }

  // Check approved deposit count
  const count = getApprovedDepositCountForPlayer(emailLower);
  if (count > 0) {
    return true;
  }

  return false;
}
