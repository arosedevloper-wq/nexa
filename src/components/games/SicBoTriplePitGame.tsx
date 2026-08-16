import React, { useState } from "react";
import { Coins, Dices, RotateCcw, Volume2, ShieldCheck, Play, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../../lib/audioService";
import { evaluateLiveGameRound } from "../../constants/liveGameConfig";

interface SicBoTriplePitGameProps {
  chips: number;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest?: (type: "greet" | "win" | "lose") => void;
  rtpBias?: string;
}

interface BetOption {
  id: string;
  label: string;
  payoutText: string;
  payoutMultiplier: number; // base payout multiplier
}

const SUM_PAYOUTS: Record<number, number> = {
  4: 60,
  5: 30,
  6: 18,
  7: 12,
  8: 8,
  9: 6,
  10: 6,
  11: 6,
  12: 6,
  13: 8,
  14: 12,
  15: 18,
  16: 30,
  17: 60,
};

export const SicBoTriplePitGame: React.FC<SicBoTriplePitGameProps> = ({
  chips,
  onWin,
  onLose,
  onCommentaryRequest,
  rtpBias,
}) => {
  const [selectedChip, setSelectedChip] = useState<number>(25);
  const [bets, setBets] = useState<Record<string, number>>({});
  const [dice, setDice] = useState<[number, number, number]>([1, 2, 3]);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [lastWinAmount, setLastWinAmount] = useState<number | null>(null);
  const [winningBets, setWinningBets] = useState<string[]>([]);

  const chipValues = [10, 25, 50, 100, 250, 500];

  const placeBet = (betId: string) => {
    if (isShaking) return;
    const currentBetOnTile = bets[betId] || 0;
    const newTotalChipsNeeded = selectedChip;

    if (chips < newTotalChipsNeeded) {
      casinoAudio.playLose();
      return;
    }

    casinoAudio.playChipClink();
    setBets((prev) => ({
      ...prev,
      [betId]: (prev[betId] || 0) + selectedChip,
    }));
  };

  const clearBets = () => {
    if (isShaking) return;
    casinoAudio.playChipClink();
    setBets({});
    setLastWinAmount(null);
    setWinningBets([]);
  };

  const totalBetAmount: number = (Object.values(bets) as number[]).reduce((a: number, b: number) => a + b, 0);

  const rollDice = async () => {
    if (totalBetAmount <= 0 || isShaking) return;
    if (chips < totalBetAmount) {
      casinoAudio.playLose();
      return;
    }

    casinoAudio.playChipClink();
    onLose(totalBetAmount, `Sic Bo Total Wager ($${totalBetAmount})`);

    setIsShaking(true);
    setLastWinAmount(null);
    setWinningBets([]);

    // Shake animation sound & motion
    casinoAudio.playWheelSpin(0.08);

    for (let i = 0; i < 15; i++) {
      setDice([
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
      ]);
      await new Promise((r) => setTimeout(r, 80));
    }

    // Final dice result
    const isWinAllowed = evaluateLiveGameRound(undefined, rtpBias);
    let finalDice: [number, number, number];
    if (!isWinAllowed) {
      let bestRoll: [number, number, number] = [1, 2, 3];
      for (let attempt = 0; attempt < 50; attempt++) {
        const test1 = Math.floor(Math.random() * 6) + 1;
        const test2 = Math.floor(Math.random() * 6) + 1;
        const test3 = Math.floor(Math.random() * 6) + 1;
        const testSum = test1 + test2 + test3;
        const testTriple = test1 === test2 && test2 === test3;
        let testPayout = 0;
        if (!testTriple) {
          if (testSum >= 4 && testSum <= 10 && bets["small"]) testPayout += bets["small"] * 2;
          if (testSum >= 11 && testSum <= 17 && bets["big"]) testPayout += bets["big"] * 2;
        }
        if (testTriple && bets["any_triple"]) testPayout += bets["any_triple"] * 31;
        if (bets[`sum_${testSum}`]) testPayout += bets[`sum_${testSum}`] * ((SUM_PAYOUTS[testSum] || 6) + 1);
        if (testPayout === 0) {
          bestRoll = [test1, test2, test3];
          break;
        }
      }
      finalDice = bestRoll;
    } else {
      finalDice = [
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
      ];
    }
    const [d1, d2, d3] = finalDice;
    setDice(finalDice);

    const sum = d1 + d2 + d3;
    const isTriple = d1 === d2 && d2 === d3;

    // Evaluate winning bets
    const winners: string[] = [];
    let totalWinPayout = 0;

    // Small / Big (Triples lose Small/Big)
    if (!isTriple) {
      if (sum >= 4 && sum <= 10 && bets["small"]) {
        winners.push("small");
        totalWinPayout += bets["small"] * 2; // 1:1 + bet back
      }
      if (sum >= 11 && sum <= 17 && bets["big"]) {
        winners.push("big");
        totalWinPayout += bets["big"] * 2;
      }
    }

    // Any Triple
    if (isTriple && bets["any_triple"]) {
      winners.push("any_triple");
      totalWinPayout += bets["any_triple"] * 31; // 30:1 + bet
    }

    // Specific Triple
    if (isTriple) {
      const specTripleId = `triple_${d1}`;
      if (bets[specTripleId]) {
        winners.push(specTripleId);
        totalWinPayout += bets[specTripleId] * 181; // 180:1 + bet
      }
    }

    // Specific Double
    const diceCounts: Record<number, number> = {};
    finalDice.forEach((val) => {
      diceCounts[val] = (diceCounts[val] || 0) + 1;
    });

    Object.entries(diceCounts).forEach(([numStr, cnt]) => {
      const num = Number(numStr);
      if (cnt >= 2) {
        const doubleId = `double_${num}`;
        if (bets[doubleId]) {
          winners.push(doubleId);
          totalWinPayout += bets[doubleId] * 11; // 10:1 + bet
        }
      }
    });

    // Sum Bet
    const sumBetId = `sum_${sum}`;
    if (bets[sumBetId]) {
      winners.push(sumBetId);
      const mult = SUM_PAYOUTS[sum] || 6;
      totalWinPayout += bets[sumBetId] * (mult + 1);
    }

    // Single Dice Bet (1-6)
    [1, 2, 3, 4, 5, 6].forEach((num) => {
      const cnt = diceCounts[num] || 0;
      const singleId = `single_${num}`;
      if (cnt > 0 && bets[singleId]) {
        winners.push(singleId);
        totalWinPayout += bets[singleId] * (cnt + 1); // 1:1 for 1, 2:1 for 2, 3:1 for 3
      }
    });

    setWinningBets(winners);
    setIsShaking(false);

    if (totalWinPayout > 0) {
      casinoAudio.playJackpot();
      setLastWinAmount(totalWinPayout);
      onWin(totalWinPayout, `Sic Bo Win (Dice: ${d1}-${d2}-${d3}, Sum ${sum}) -> $${totalWinPayout}`);
    } else {
      casinoAudio.playLose();
    }
  };

  const renderDiceFace = (val: number) => {
    const dotsMap: Record<number, string[]> = {
      1: ["col-start-2 row-start-2"],
      2: ["col-start-1 row-start-1", "col-start-3 row-start-3"],
      3: ["col-start-1 row-start-1", "col-start-2 row-start-2", "col-start-3 row-start-3"],
      4: ["col-start-1 row-start-1", "col-start-3 row-start-1", "col-start-1 row-start-3", "col-start-3 row-start-3"],
      5: [
        "col-start-1 row-start-1",
        "col-start-3 row-start-1",
        "col-start-2 row-start-2",
        "col-start-1 row-start-3",
        "col-start-3 row-start-3",
      ],
      6: [
        "col-start-1 row-start-1",
        "col-start-3 row-start-1",
        "col-start-1 row-start-2",
        "col-start-3 row-start-2",
        "col-start-1 row-start-3",
        "col-start-3 row-start-3",
      ],
    };

    return (
      <div className="w-14 h-14 bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-400 rounded-xl p-2 grid grid-cols-3 grid-rows-3 gap-0.5 shadow-lg shadow-red-950/40">
        {(dotsMap[val] || []).map((posClass, idx) => (
          <div key={idx} className={`${posClass} w-2.5 h-2.5 rounded-full bg-red-700 mx-auto my-auto shadow-inner`} />
        ))}
      </div>
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-slate-950 border border-amber-500/30 rounded-2xl p-4 sm:p-6 text-white shadow-2xl relative overflow-hidden backdrop-blur-xl">
      {/* Background Atmosphere */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-gradient-to-b from-red-600/15 via-amber-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800/80 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-amber-600 flex items-center justify-center shadow-lg shadow-red-500/20">
            <Dices className="w-6 h-6 text-white stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-wide bg-gradient-to-r from-red-400 via-amber-300 to-yellow-200 bg-clip-text text-transparent">
                SIC BO TRIPLE PIT
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-red-500/20 border border-red-500/40 text-red-300 rounded-full uppercase tracking-wider">
                MACAU DICE CASINO
              </span>
            </div>
            <p className="text-xs text-slate-400">Place bets on 3-Dice combinations, Triples, Sums & Small/Big</p>
          </div>
        </div>

        {/* Balance Display */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-amber-500/30 px-4 py-2 rounded-xl shadow-inner">
          <Coins className="w-5 h-5 text-amber-400" />
          <span className="text-xs text-slate-400 font-medium">Balance:</span>
          <span className="text-base font-bold text-amber-300">${chips.toLocaleString()}</span>
        </div>
      </div>

      {/* 3D Dice Dome Shaker */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-red-500/30 p-6 rounded-2xl flex flex-col items-center justify-center mb-6 relative shadow-inner">
        <div className="text-xs font-black text-amber-400 mb-3 uppercase tracking-widest flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> 3D MACAU DICE DOME
        </div>

        <motion.div
          animate={isShaking ? { rotate: [-5, 5, -5, 5, 0], y: [-4, 4, -4, 4, 0] } : {}}
          transition={{ repeat: isShaking ? Infinity : 0, duration: 0.15 }}
          className="flex items-center gap-6 bg-red-950/80 border-2 border-red-500/50 p-4 rounded-2xl shadow-2xl shadow-red-900/30"
        >
          {renderDiceFace(dice[0])}
          {renderDiceFace(dice[1])}
          {renderDiceFace(dice[2])}
        </motion.div>

        <div className="mt-3 flex items-center gap-4 text-xs font-bold">
          <span className="text-slate-400">
            TOTAL SUM: <span className="text-amber-300 font-extrabold text-base">{dice[0] + dice[1] + dice[2]}</span>
          </span>
          <span className="text-slate-400">
            RESULT:{" "}
            <span className="text-red-400 font-extrabold">
              {dice[0] === dice[1] && dice[1] === dice[2]
                ? `TRIPLE ${dice[0]}!`
                : dice[0] + dice[1] + dice[2] <= 10
                ? "SMALL (4-10)"
                : "BIG (11-17)"}
            </span>
          </span>
        </div>

        {lastWinAmount !== null && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mt-2 text-emerald-400 text-sm font-black bg-emerald-950/80 border border-emerald-500/40 px-4 py-1 rounded-full shadow-lg"
          >
            WIN +${lastWinAmount.toLocaleString()}!
          </motion.div>
        )}
      </div>

      {/* Felt Table Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-6 bg-emerald-950/40 border-2 border-emerald-700/60 p-4 rounded-2xl relative shadow-2xl">
        {/* SMALL (1:1) */}
        <button
          onClick={() => placeBet("small")}
          className={`md:col-span-6 p-4 rounded-xl border flex flex-col items-center justify-center transition-all ${
            winningBets.includes("small")
              ? "bg-amber-500/30 border-amber-400 shadow-lg shadow-amber-500/50 ring-2 ring-amber-400"
              : bets["small"]
              ? "bg-emerald-900/80 border-amber-400"
              : "bg-emerald-950/60 border-emerald-700/80 hover:border-emerald-500"
          }`}
        >
          <span className="text-xl font-black text-amber-300">SMALL (4 - 10)</span>
          <span className="text-xs text-slate-300 font-semibold">PAYS 1:1 (Loses on Triples)</span>
          {bets["small"] && (
            <span className="mt-2 bg-amber-400 text-slate-950 font-black px-3 py-0.5 rounded-full text-xs">
              ${bets["small"]}
            </span>
          )}
        </button>

        {/* BIG (1:1) */}
        <button
          onClick={() => placeBet("big")}
          className={`md:col-span-6 p-4 rounded-xl border flex flex-col items-center justify-center transition-all ${
            winningBets.includes("big")
              ? "bg-amber-500/30 border-amber-400 shadow-lg shadow-amber-500/50 ring-2 ring-amber-400"
              : bets["big"]
              ? "bg-emerald-900/80 border-amber-400"
              : "bg-emerald-950/60 border-emerald-700/80 hover:border-emerald-500"
          }`}
        >
          <span className="text-xl font-black text-amber-300">BIG (11 - 17)</span>
          <span className="text-xs text-slate-300 font-semibold">PAYS 1:1 (Loses on Triples)</span>
          {bets["big"] && (
            <span className="mt-2 bg-amber-400 text-slate-950 font-black px-3 py-0.5 rounded-full text-xs">
              ${bets["big"]}
            </span>
          )}
        </button>

        {/* ANY TRIPLE (30:1) */}
        <button
          onClick={() => placeBet("any_triple")}
          className={`md:col-span-12 p-3 rounded-xl border flex items-center justify-between px-6 transition-all ${
            winningBets.includes("any_triple")
              ? "bg-amber-500/30 border-amber-400 shadow-lg shadow-amber-500/50 ring-2 ring-amber-400"
              : bets["any_triple"]
              ? "bg-emerald-900/80 border-amber-400"
              : "bg-emerald-950/60 border-emerald-700/80 hover:border-emerald-500"
          }`}
        >
          <div className="text-left">
            <span className="text-sm font-black text-amber-300">ANY TRIPLE (111 to 666)</span>
            <span className="text-xs text-slate-300 block">PAYS 30:1</span>
          </div>
          {bets["any_triple"] && (
            <span className="bg-amber-400 text-slate-950 font-black px-3 py-0.5 rounded-full text-xs">
              ${bets["any_triple"]}
            </span>
          )}
        </button>

        {/* SPECIFIC TRIPLES (180:1) */}
        <div className="md:col-span-12 grid grid-cols-6 gap-2">
          {[1, 2, 3, 4, 5, 6].map((num) => {
            const betId = `triple_${num}`;
            return (
              <button
                key={betId}
                onClick={() => placeBet(betId)}
                className={`p-2 rounded-lg border flex flex-col items-center transition-all ${
                  winningBets.includes(betId)
                    ? "bg-amber-500/30 border-amber-400 ring-2 ring-amber-400"
                    : bets[betId]
                    ? "bg-emerald-900/80 border-amber-400"
                    : "bg-emerald-950/60 border-emerald-700/60 hover:border-emerald-500"
                }`}
              >
                <span className="text-xs font-black text-amber-300">{num}{num}{num}</span>
                <span className="text-[10px] text-slate-400">180:1</span>
                {bets[betId] && (
                  <span className="mt-1 bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded-full text-[10px]">
                    ${bets[betId]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Controls & Chip Selector */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 mr-1">CHIP VALUE:</span>
          {chipValues.map((val) => (
            <button
              key={val}
              onClick={() => setSelectedChip(val)}
              className={`w-9 h-9 rounded-full text-xs font-black border flex items-center justify-center transition-all ${
                selectedChip === val
                  ? "bg-amber-400 border-amber-300 text-slate-950 scale-110 shadow-md shadow-amber-500/40"
                  : "bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500"
              }`}
            >
              ${val}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            disabled={isShaking || totalBetAmount === 0}
            onClick={clearBets}
            className="px-4 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 border border-slate-700 disabled:opacity-40 transition-all flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" /> CLEAR BETS
          </button>

          <button
            disabled={isShaking || totalBetAmount === 0}
            onClick={rollDice}
            className={`flex-1 sm:flex-initial px-8 py-3 rounded-xl font-black text-sm transition-all shadow-xl flex items-center justify-center gap-2 ${
              isShaking || totalBetAmount === 0
                ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                : "bg-gradient-to-r from-red-500 via-amber-500 to-yellow-400 text-slate-950 shadow-red-500/30 cursor-pointer hover:from-red-400 hover:to-yellow-300"
            }`}
          >
            <Play className="w-5 h-5 fill-slate-950" />
            {isShaking ? "SHAKING DICE..." : `ROLL SIC BO ($${totalBetAmount})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SicBoTriplePitGame;
