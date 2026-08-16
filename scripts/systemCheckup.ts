import { 
  executeAtomicGameTransaction, 
  executeAtomicWithdrawal, 
  getOrCreateWallet, 
  refundRejectedWithdrawal, 
  syncWalletBalance 
} from "../server/walletManager";
import { evaluateServerGameOutcome, setServerRtpConfig } from "../server/gameEngine";

async function runCheckup() {
  console.log("=================================================");
  console.log("   NEXASPIN FULL SYSTEM CHECKUP & VERIFICATION   ");
  console.log("=================================================\n");

  let totalTestsPassed = 0;
  let totalTestsFailed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      totalTestsPassed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} ${detail ? `(${detail})` : ""}`);
      totalTestsFailed++;
    }
  }

  // -------------------------------------------------------------
  // 1. DATABASE INTEGRITY CHECK
  // -------------------------------------------------------------
  console.log("▶ 1. DATABASE & WALLET INTEGRITY CHECK");
  const testUser = "checkup_user@nexaspin.com";
  getOrCreateWallet(testUser, testUser, 1000);

  // Test A: Non-negative balance constraint
  const invalidBetResult = await executeAtomicGameTransaction(testUser, testUser, 55000, 0, "slots");
  assert(
    !invalidBetResult.success && invalidBetResult.error?.includes("INSUFFICIENT_FUNDS"),
    "Non-Negative Balance Rule Enforced",
    "Prevented bet exceeding balance"
  );

  // Test B: High-concurrency Race Condition Test (100 simultaneous operations)
  console.log("   ...Simulating 100 concurrent wallet transactions (Mutex lock test)...");
  await syncWalletBalance(testUser, testUser, 10000);

  const concurrencyPromises: Promise<any>[] = [];
  for (let i = 0; i < 100; i++) {
    // 50 bets of 100, 50 wins of 150
    if (i % 2 === 0) {
      concurrencyPromises.push(executeAtomicGameTransaction(testUser, testUser, 100, 0, "slots"));
    } else {
      concurrencyPromises.push(executeAtomicGameTransaction(testUser, testUser, 50, 150, "roulette"));
    }
  }

  await Promise.all(concurrencyPromises);
  const walletAfterRace = getOrCreateWallet(testUser);
  
  // Expected calculation: Initial 10000 - (50 * 100) + (50 * (-50 + 150)) = 10000 - 5000 + 5000 = 10000
  assert(
    walletAfterRace.balance === 10000,
    "Atomic Row Locking & Race Condition Prevention",
    `Final balance exact match: ${walletAfterRace.balance} (expected 10000)`
  );

  // Test C: Withdrawal Escrow & Refund Integrity
  const wdRes = await executeAtomicWithdrawal(testUser, testUser, 2000, "USDT", "TRX_TEST_ADDRESS_123");
  assert(
    wdRes.success && wdRes.newBalance === 8000,
    "Withdrawal Escrow Deduction",
    `Deducted $2000 escrow immediately, new balance: ${wdRes.newBalance}`
  );

  const refundRes = await refundRejectedWithdrawal(testUser, 2000, wdRes.withdrawalId);
  assert(
    refundRes.success && refundRes.newBalance === 10000,
    "Withdrawal Rejection Refund Restoration",
    `Refunded $2000 back to wallet balance: ${refundRes.newBalance}`
  );

  console.log("");

  // -------------------------------------------------------------
  // 2. GAME LOGIC VALIDATION
  // -------------------------------------------------------------
  console.log("▶ 2. GAME ENGINE LOGIC VALIDATION");
  setServerRtpConfig({ rtpBias: "standard", forceLoseMode: false });

  // Test A: Slots Engine
  const slotRes = evaluateServerGameOutcome("slots", 100);
  assert(
    slotRes.gameId === "slots" && Array.isArray(slotRes.resultDetails.reels) && slotRes.resultDetails.reels.length === 3,
    "Slots Engine Evaluator",
    `Reels: ${slotRes.resultDetails.reels.join(" | ")} Multiplier: ${slotRes.multiplier}x`
  );

  // Test B: Roulette Engine
  const rouletteRes = evaluateServerGameOutcome("roulette", 50, { betType: "red" });
  assert(
    rouletteRes.gameId === "slots" || rouletteRes.resultDetails.winningNumber >= 0,
    "Roulette Engine Evaluator",
    `Winning Number: ${rouletteRes.resultDetails.winningNumber} (${rouletteRes.resultDetails.color})`
  );

  // Test C: Crash Rocket Engine
  const crashRes = evaluateServerGameOutcome("crash", 50, { autoCashout: 1.8 });
  assert(
    typeof crashRes.resultDetails.crashPoint === "number" && crashRes.resultDetails.crashPoint >= 1.0,
    "Crash/Rocket Engine Evaluator",
    `Crash Point: ${crashRes.resultDetails.crashPoint}x`
  );

  // Test D: Plinko Engine
  const plinkoRes = evaluateServerGameOutcome("plinko", 20, { rows: 10 });
  assert(
    Array.isArray(plinkoRes.resultDetails.path) && plinkoRes.resultDetails.path.length === 10,
    "Plinko Bounce Engine",
    `Path length: ${plinkoRes.resultDetails.path.length}`
  );

  // Test E: Blackjack Engine
  const bjRes = evaluateServerGameOutcome("blackjack", 100);
  assert(
    bjRes.resultDetails.playerTotal > 0 && bjRes.resultDetails.dealerTotal > 0,
    "Blackjack Hand Evaluator",
    `Player: ${bjRes.resultDetails.playerTotal} vs Dealer: ${bjRes.resultDetails.dealerTotal}`
  );

  // Test F: Dice / Limbo Engine
  const diceRes = evaluateServerGameOutcome("dice", 10, { targetNumber: 50, mode: "over" });
  assert(
    diceRes.resultDetails.roll >= 1 && diceRes.resultDetails.roll <= 100,
    "Dice / Limbo Evaluator",
    `Roll: ${diceRes.resultDetails.roll}`
  );

  // Test G: Mines Engine
  const minesRes = evaluateServerGameOutcome("mines", 50, { mineCount: 3, revealedTilesCount: 2 });
  assert(
    typeof minesRes.resultDetails.hitMine === "boolean",
    "Mines Engine Evaluator",
    `Hit Mine: ${minesRes.resultDetails.hitMine}`
  );

  // Test H: Invalid Bet Guard
  let caughtBetError = false;
  try {
    evaluateServerGameOutcome("slots", -50);
  } catch (err: any) {
    caughtBetError = true;
  }
  assert(caughtBetError, "Invalid/Negative Bet Input Guard", "Threw error for negative bet");

  // Test I: Force Lose Mode
  setServerRtpConfig({ forceLoseMode: true });
  const forceLoseRes = evaluateServerGameOutcome("slots", 100);
  assert(
    forceLoseRes.winAmount === 0 && !forceLoseRes.isWin,
    "Force Lose / Anti-Bot Override",
    "Resulted in guaranteed lose"
  );
  setServerRtpConfig({ forceLoseMode: false });

  // Test J: Admin Custom Win Ratio (e.g. 100% win testing)
  setServerRtpConfig({ rtpBias: "custom", customWinRatio: 100, forceLoseMode: false });
  const customWin100Res = evaluateServerGameOutcome("slots", 100);
  assert(
    customWin100Res.isWin && customWin100Res.winAmount > 0,
    "Admin Custom Win Ratio (100% Win setting)",
    `Slots outcome with 100% custom ratio: Win $${customWin100Res.winAmount}`
  );

  // Test K: Admin Custom Win Ratio (0% win / guaranteed lose setting)
  setServerRtpConfig({ rtpBias: "custom", customWinRatio: 0, forceLoseMode: false });
  const customWin0Res = evaluateServerGameOutcome("roulette", 100, { betType: "red" });
  assert(
    !customWin0Res.isWin && customWin0Res.winAmount === 0,
    "Admin Custom Win Ratio (0% Win setting)",
    `Roulette outcome with 0% custom ratio: $0 win`
  );

  // Restore standard RTP config
  setServerRtpConfig({ globalRtp: 95.0, rtpBias: "standard", customWinRatio: 50, forceLoseMode: false });

  console.log("");

  // -------------------------------------------------------------
  // 3. AUDIT LOG OPTIMIZATION
  // -------------------------------------------------------------
  console.log("▶ 3. AUDIT LOG OPTIMIZATION & MEMORY PRUNING");
  
  const logUser = "audit_user@nexaspin.com";
  getOrCreateWallet(logUser, logUser, 500000);

  // Generate 600 rapid transactions
  for (let i = 0; i < 600; i++) {
    await executeAtomicGameTransaction(logUser, logUser, 10, 20, "slots");
  }

  const logWallet = getOrCreateWallet(logUser);
  assert(
    logWallet.transactions.length === 500,
    "Audit Log Array Pruning",
    `Transaction history size capped at ${logWallet.transactions.length} items (max 500)`
  );

  console.log("");

  // -------------------------------------------------------------
  // 4. LOAD TESTING SIMULATION
  // -------------------------------------------------------------
  console.log("▶ 4. LOAD TESTING & THROUGHPUT SIMULATION");

  const startTime = Date.now();
  const loadUser = "load_test_user@nexaspin.com";
  await syncWalletBalance(loadUser, loadUser, 1000000);

  const loadOperationsCount = 500;
  const loadPromises: Promise<any>[] = [];

  for (let i = 0; i < loadOperationsCount; i++) {
    loadPromises.push(
      executeAtomicGameTransaction(loadUser, loadUser, 10, i % 3 === 0 ? 30 : 0, "slots")
    );
  }

  await Promise.all(loadPromises);
  const elapsedMs = Date.now() - startTime;
  const opsPerSec = Math.round((loadOperationsCount / elapsedMs) * 1000);

  assert(
    opsPerSec > 100,
    "Backend Transaction Throughput Performance",
    `Processed ${loadOperationsCount} atomic transactions in ${elapsedMs}ms (~${opsPerSec} ops/sec)`
  );

  console.log("\n=================================================");
  console.log(`CHECKUP SUMMARY: ${totalTestsPassed} PASSED | ${totalTestsFailed} FAILED`);
  console.log("=================================================\n");

  if (totalTestsFailed > 0) {
    process.exit(1);
  }
}

runCheckup().catch((err) => {
  console.error("Checkup failed with error:", err);
  process.exit(1);
});
