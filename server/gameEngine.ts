export interface GameOutcome {
  gameId: string;
  winAmount: number;
  multiplier: number;
  resultDetails: Record<string, any>;
  isWin: boolean;
}

// Global server configuration for RTP
let serverRtpConfig = {
  globalRtp: 5.0, // 5.0% default RTP (Win=5% / Lose=95%)
  rtpBias: "custom" as "standard" | "loose" | "tight" | "rigged" | "custom",
  customWinRatio: 5, // 5% default custom win ratio
  forceLoseMode: true,
};

export function setServerRtpConfig(config: Partial<typeof serverRtpConfig>) {
  serverRtpConfig = { ...serverRtpConfig, ...config };
}

export function getServerRtpConfig() {
  return { ...serverRtpConfig };
}

/**
 * Calculates effective win probability for any game based on Admin Global RTP,
 * RTP Bias ("standard" | "loose" | "tight" | "rigged" | "custom"), custom ratio, and force lose setting.
 */
export function getEffectiveWinProbability(baseProb: number, overrideConfig?: Partial<typeof serverRtpConfig>): number {
  const cfg = { ...serverRtpConfig, ...overrideConfig };

  if (cfg.forceLoseMode) return 0;

  if (cfg.rtpBias === "custom" && typeof cfg.customWinRatio === "number") {
    return Math.max(0, Math.min(0.98, cfg.customWinRatio / 100));
  }

  // Base scaling by globalRtp (baseline 95.0%)
  const rtpRatio = Math.max(0.1, (cfg.globalRtp || 95.0) / 95.0);
  let effectiveProb = baseProb * rtpRatio;

  // Apply RTP Bias mode
  if (cfg.rtpBias === "loose") {
    effectiveProb *= 1.25;
  } else if (cfg.rtpBias === "tight") {
    effectiveProb *= 0.75;
  } else if (cfg.rtpBias === "rigged") {
    effectiveProb *= 0.25;
  }

  return Math.max(0, Math.min(0.98, effectiveProb));
}

/**
 * Server-Authoritative Game Engine: Evaluates random outcomes, RTP, and payout multipliers.
 */
export function evaluateServerGameOutcome(
  gameId: string,
  betAmount: number,
  clientChoices: Record<string, any> = {}
): GameOutcome {
  if (betAmount <= 0) {
    throw new Error("INVALID_BET: Bet amount must be greater than 0.");
  }

  // Optional client override from admin context
  const adminOverride = clientChoices.adminRtpConfig;
  if (adminOverride) {
    setServerRtpConfig(adminOverride);
  }

  // Force lose check
  if (serverRtpConfig.forceLoseMode) {
    return {
      gameId,
      winAmount: 0,
      multiplier: 0,
      resultDetails: { note: "Round completed - Force Lose active", forceLose: true },
      isWin: false,
    };
  }

  const normalizedGameId = gameId.toLowerCase().trim();

  // Route to game-specific server evaluator
  if (normalizedGameId.includes("slot")) {
    return evaluateSlotSpin(betAmount);
  } else if (normalizedGameId.includes("roulette")) {
    return evaluateRouletteSpin(betAmount, clientChoices);
  } else if (normalizedGameId.includes("crash") || normalizedGameId.includes("rocket")) {
    return evaluateCrashRocket(betAmount, clientChoices);
  } else if (normalizedGameId.includes("plinko")) {
    return evaluatePlinkoDrop(betAmount, clientChoices);
  } else if (normalizedGameId.includes("blackjack")) {
    return evaluateBlackjackHand(betAmount, clientChoices);
  } else if (normalizedGameId.includes("dice") || normalizedGameId.includes("limbo")) {
    return evaluateDiceRoll(betAmount, clientChoices);
  } else if (normalizedGameId.includes("mines")) {
    return evaluateMinesReveal(betAmount, clientChoices);
  } else {
    // Default Arcade Engine (Server-authoritative RTP evaluation)
    return evaluateGenericArcadeGame(gameId, betAmount);
  }
}

/**
 * Server-side Slots Evaluator with Admin RTP
 */
function evaluateSlotSpin(betAmount: number): GameOutcome {
  const symbols = ["🍒", "🍋", "🍇", "🔔", "💎", "7️⃣"];
  
  // Calculate effective win probability using Admin RTP Config
  const effectiveWinProb = getEffectiveWinProbability(0.40);
  const isWin = Math.random() < effectiveWinProb;

  let reel1: string, reel2: string, reel3: string;
  let multiplier = 0;

  if (isWin) {
    // Determine win tier
    const roll = Math.random();
    if (roll < 0.05) {
      // Jackpot: Triple 7s (50x)
      reel1 = reel2 = reel3 = "7️⃣";
      multiplier = 50;
    } else if (roll < 0.20) {
      // Diamonds (20x)
      reel1 = reel2 = reel3 = "💎";
      multiplier = 20;
    } else if (roll < 0.50) {
      // Bells (8x)
      reel1 = reel2 = reel3 = "🔔";
      multiplier = 8;
    } else {
      // Any 3 matching fruits (3x)
      const matching = symbols[Math.floor(Math.random() * 3)];
      reel1 = reel2 = reel3 = matching;
      multiplier = 3;
    }
  } else {
    // Non-winning reel combination
    reel1 = symbols[Math.floor(Math.random() * symbols.length)];
    reel2 = symbols[Math.floor(Math.random() * symbols.length)];
    // Ensure 3rd reel does not complete match
    do {
      reel3 = symbols[Math.floor(Math.random() * symbols.length)];
    } while (reel1 === reel2 && reel2 === reel3);
    multiplier = 0;
  }

  const winAmount = Math.floor(betAmount * multiplier);

  return {
    gameId: "slots",
    winAmount,
    multiplier,
    resultDetails: {
      reels: [reel1, reel2, reel3],
      combination: `${reel1} ${reel2} ${reel3}`,
      rtpApplied: serverRtpConfig,
    },
    isWin: winAmount > 0,
  };
}

/**
 * Server-side Roulette Evaluator with Admin RTP
 */
function evaluateRouletteSpin(betAmount: number, choices: Record<string, any>): GameOutcome {
  const baseWinProb = 18 / 37; // Standard ~48.6% red/black odds
  const effectiveProb = getEffectiveWinProbability(baseWinProb);
  
  const isOutcomeWin = Math.random() < effectiveProb;

  const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  const blackNumbers = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

  const betType = choices.betType || "red"; // red, black, even, odd, number
  let winningNumber = 0;

  if (isOutcomeWin) {
    if (betType === "red") {
      winningNumber = redNumbers[Math.floor(Math.random() * redNumbers.length)];
    } else if (betType === "black") {
      winningNumber = blackNumbers[Math.floor(Math.random() * blackNumbers.length)];
    } else {
      winningNumber = Math.floor(Math.random() * 36) + 1;
    }
  } else {
    if (betType === "red") {
      winningNumber = blackNumbers[Math.floor(Math.random() * blackNumbers.length)];
    } else if (betType === "black") {
      winningNumber = redNumbers[Math.floor(Math.random() * redNumbers.length)];
    } else {
      winningNumber = 0; // House pocket
    }
  }

  const isRed = redNumbers.includes(winningNumber);
  const isBlack = blackNumbers.includes(winningNumber);
  const isEven = winningNumber !== 0 && winningNumber % 2 === 0;
  const isOdd = winningNumber !== 0 && winningNumber % 2 !== 0;

  let multiplier = 0;
  if (betType === "red" && isRed) multiplier = 2;
  else if (betType === "black" && isBlack) multiplier = 2;
  else if (betType === "even" && isEven) multiplier = 2;
  else if (betType === "odd" && isOdd) multiplier = 2;
  else if (betType === "number" && choices.selectedNumber === winningNumber) multiplier = 36;

  const winAmount = Math.floor(betAmount * multiplier);

  return {
    gameId: "roulette",
    winAmount,
    multiplier,
    resultDetails: {
      winningNumber,
      color: winningNumber === 0 ? "green" : isRed ? "red" : "black",
      isEven,
      isOdd,
      rtpApplied: serverRtpConfig,
    },
    isWin: winAmount > 0,
  };
}

/**
 * Server-side Crash Evaluator with Admin RTP
 */
function evaluateCrashRocket(betAmount: number, choices: Record<string, any>): GameOutcome {
  const targetCashout = choices.autoCashout || choices.targetMultiplier || 1.5;
  
  // Crash point scaled by RTP configuration
  const rtpScaling = getEffectiveWinProbability(0.50) / 0.50; // baseline 1.0
  const e = 100;
  const h = Math.floor(Math.random() * e);
  const rawCrash = Math.max(1.0, parseFloat((e / (e - h)).toFixed(2)));
  const crashPoint = parseFloat(Math.max(1.0, rawCrash * rtpScaling).toFixed(2));

  const isWin = targetCashout <= crashPoint;
  const multiplier = isWin ? targetCashout : 0;
  const winAmount = isWin ? Math.floor(betAmount * multiplier) : 0;

  return {
    gameId: "crash",
    winAmount,
    multiplier,
    resultDetails: {
      crashPoint,
      targetCashout,
      cashedOutAt: isWin ? targetCashout : null,
      rtpApplied: serverRtpConfig,
    },
    isWin,
  };
}

/**
 * Server-side Plinko Evaluator with Admin RTP
 */
function evaluatePlinkoDrop(betAmount: number, choices: Record<string, any>): GameOutcome {
  const pinRows = choices.rows || 10;
  const multipliersByBucket = [10, 3, 1.5, 0.5, 0.2, 0.5, 1.5, 3, 10];
  
  const rightBias = getEffectiveWinProbability(0.50);

  let bucketIndex = 0;
  const path: ("left" | "right")[] = [];

  for (let i = 0; i < pinRows; i++) {
    const isRight = Math.random() < rightBias;
    path.push(isRight ? "right" : "left");
    if (isRight) bucketIndex++;
  }

  const safeIndex = Math.min(bucketIndex, multipliersByBucket.length - 1);
  const multiplier = multipliersByBucket[safeIndex];
  const winAmount = Math.floor(betAmount * multiplier);

  return {
    gameId: "plinko",
    winAmount,
    multiplier,
    resultDetails: {
      path,
      bucketIndex: safeIndex,
      rtpApplied: serverRtpConfig,
    },
    isWin: winAmount > betAmount,
  };
}

/**
 * Server-side Blackjack Hand Evaluator with Admin RTP
 */
function evaluateBlackjackHand(betAmount: number, choices: Record<string, any>): GameOutcome {
  const effectiveWinProb = getEffectiveWinProbability(0.43);
  const isPlayerWinOutcome = Math.random() < effectiveWinProb;

  let playerTotal = 20;
  let dealerTotal = 18;

  if (isPlayerWinOutcome) {
    playerTotal = 20;
    dealerTotal = 18;
  } else {
    playerTotal = 17;
    dealerTotal = 19;
  }

  let multiplier = isPlayerWinOutcome ? 2 : 0;
  const winAmount = Math.floor(betAmount * multiplier);

  return {
    gameId: "blackjack",
    winAmount,
    multiplier,
    resultDetails: {
      playerTotal,
      dealerTotal,
      rtpApplied: serverRtpConfig,
    },
    isWin: winAmount > betAmount,
  };
}

/**
 * Server-side Dice / Limbo Evaluator with Admin RTP
 */
function evaluateDiceRoll(betAmount: number, choices: Record<string, any>): GameOutcome {
  const target = choices.targetNumber || 50;
  const isOver = choices.mode === "over";
  const rawWinProb = isOver ? (100 - target) / 100 : target / 100;

  const effectiveWinProb = getEffectiveWinProbability(rawWinProb);
  const isWin = Math.random() < effectiveWinProb;

  let roll = 50;
  if (isWin) {
    roll = isOver ? Math.floor(target + 1 + Math.random() * (100 - target)) : Math.floor(Math.random() * target);
  } else {
    roll = isOver ? Math.floor(Math.random() * target) : Math.floor(target + Math.random() * (100 - target));
  }

  const multiplier = isWin ? parseFloat(((0.98) / rawWinProb).toFixed(2)) : 0;
  const winAmount = Math.floor(betAmount * multiplier);

  return {
    gameId: "dice",
    winAmount,
    multiplier,
    resultDetails: {
      roll,
      target,
      mode: isOver ? "over" : "under",
      rtpApplied: serverRtpConfig,
    },
    isWin,
  };
}

/**
 * Server-side Mines Evaluator with Admin RTP
 */
function evaluateMinesReveal(betAmount: number, choices: Record<string, any>): GameOutcome {
  const mineCount = choices.mineCount || 3;
  const revealedTilesCount = choices.revealedTilesCount || 1;

  const baseHitMineProb = mineCount / 25;
  const safeProb = getEffectiveWinProbability(1 - baseHitMineProb);
  const hitMine = Math.random() >= safeProb;

  if (hitMine) {
    return {
      gameId: "mines",
      winAmount: 0,
      multiplier: 0,
      resultDetails: { hitMine: true, tileIndex: choices.tileIndex, rtpApplied: serverRtpConfig },
      isWin: false,
    };
  }

  const multiplier = parseFloat((1 + (revealedTilesCount * (mineCount * 0.15))).toFixed(2));
  const winAmount = Math.floor(betAmount * multiplier);

  return {
    gameId: "mines",
    winAmount,
    multiplier,
    resultDetails: { hitMine: false, tileIndex: choices.tileIndex, safeTiles: revealedTilesCount, rtpApplied: serverRtpConfig },
    isWin: true,
  };
}

/**
 * Generic Arcade Evaluator with Admin RTP curve
 */
function evaluateGenericArcadeGame(gameId: string, betAmount: number): GameOutcome {
  const effectiveProb = getEffectiveWinProbability(0.42);
  const isWin = Math.random() < effectiveProb;
  const multiplier = isWin ? 2.0 : 0;
  const winAmount = Math.floor(betAmount * multiplier);

  return {
    gameId,
    winAmount,
    multiplier,
    resultDetails: { isWin, rtpApplied: serverRtpConfig },
    isWin,
  };
}
