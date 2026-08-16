import React, { useState } from "react";
import { Play, Sparkles, Coins, RefreshCw, Award, Info, HelpCircle } from "lucide-react";
import { Card as CardType } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../lib/audioService";
import { evaluateLiveGameRound } from "../constants/liveGameConfig";

interface VideoPokerGameProps {
  chips: number;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest: (type: "greet" | "win" | "lose" | "strategy") => void;
}

const SUITS = [
  { name: "hearts", char: "♥", color: "text-rose-500 border-rose-500/25 bg-rose-500/5" },
  { name: "diamonds", char: "♦", color: "text-rose-500 border-rose-500/25 bg-rose-500/5" },
  { name: "spades", char: "♠", color: "text-indigo-400 border-indigo-500/25 bg-indigo-500/5" },
  { name: "clubs", char: "♣", color: "text-indigo-400 border-indigo-500/25 bg-indigo-500/5" },
] as const;

const VALUES = [
  { name: "2", rank: 2 },
  { name: "3", rank: 3 },
  { name: "4", rank: 4 },
  { name: "5", rank: 5 },
  { name: "6", rank: 6 },
  { name: "7", rank: 7 },
  { name: "8", rank: 8 },
  { name: "9", rank: 9 },
  { name: "10", rank: 10 },
  { name: "J", rank: 11 },
  { name: "Q", rank: 12 },
  { name: "K", rank: 13 },
  { name: "A", rank: 14 },
];

interface PokerCard extends CardType {
  rank: number;
}

// Jacks or Better Paytable multipliers
const PAYTABLE = [
  { name: "Royal Flush", multiplier: 250, desc: "A, K, Q, J, 10 of same suit" },
  { name: "Straight Flush", multiplier: 50, desc: "Five consecutive cards of same suit" },
  { name: "Four of a Kind", multiplier: 25, desc: "Four cards of same rank" },
  { name: "Full House", multiplier: 9, desc: "Three of a kind & a pair" },
  { name: "Flush", multiplier: 6, desc: "Five cards of same suit" },
  { name: "Straight", multiplier: 4, desc: "Five consecutive cards" },
  { name: "Three of a Kind", multiplier: 3, desc: "Three cards of same rank" },
  { name: "Two Pair", multiplier: 2, desc: "Two separate pairs of cards" },
  { name: "Jacks or Better", multiplier: 1, desc: "Pair of Jacks, Queens, Kings, or Aces" },
];

function generateDeck(): PokerCard[] {
  const deck: PokerCard[] = [];
  for (let s = 0; s < SUITS.length; s++) {
    for (let v = 0; v < VALUES.length; v++) {
      deck.push({
        id: `${SUITS[s].name}-${VALUES[v].name}-${Math.random().toString(36).substr(2, 4)}`,
        suit: SUITS[s].name,
        value: VALUES[v].name,
        score: VALUES[v].rank, // use score as equivalent rank
        rank: VALUES[v].rank,
      });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

// Evaluate poker hand
function evaluatePokerHand(hand: PokerCard[]): { name: string; multiplier: number } | null {
  if (hand.length !== 5) return null;

  const suits = hand.map((c) => c.suit);
  const ranks = hand.map((c) => c.rank).sort((a, b) => a - b);

  // Check flush
  const isFlush = suits.every((s) => s === suits[0]);

  // Check straight
  let isStraight = false;
  // Standard straight
  if (
    ranks[4] - ranks[0] === 4 &&
    new Set(ranks).size === 5
  ) {
    isStraight = true;
  }
  // Low Ace straight (A, 2, 3, 4, 5) => rank order: [2, 3, 4, 5, 14]
  if (
    ranks[0] === 2 &&
    ranks[1] === 3 &&
    ranks[2] === 4 &&
    ranks[3] === 5 &&
    ranks[4] === 14
  ) {
    isStraight = true;
  }

  // Count rank frequencies
  const freqMap: Record<number, number> = {};
  for (const r of ranks) {
    freqMap[r] = (freqMap[r] || 0) + 1;
  }
  const frequencies = Object.values(freqMap).sort((a, b) => b - a);

  // Royal Flush check (10, J, Q, K, A with same suit)
  if (isFlush && isStraight && ranks[0] === 10 && ranks[4] === 14) {
    return { name: "Royal Flush", multiplier: 250 };
  }

  // Straight Flush
  if (isFlush && isStraight) {
    return { name: "Straight Flush", multiplier: 50 };
  }

  // Four of a Kind
  if (frequencies[0] === 4) {
    return { name: "Four of a Kind", multiplier: 25 };
  }

  // Full House
  if (frequencies[0] === 3 && frequencies[1] === 2) {
    return { name: "Full House", multiplier: 9 };
  }

  // Flush
  if (isFlush) {
    return { name: "Flush", multiplier: 6 };
  }

  // Straight
  if (isStraight) {
    return { name: "Straight", multiplier: 4 };
  }

  // Three of a Kind
  if (frequencies[0] === 3) {
    return { name: "Three of a Kind", multiplier: 3 };
  }

  // Two Pair
  if (frequencies[0] === 2 && frequencies[1] === 2) {
    return { name: "Two Pair", multiplier: 2 };
  }

  // Jacks or Better
  if (frequencies[0] === 2) {
    // find the pair rank
    const pairRankStr = Object.keys(freqMap).find((k) => freqMap[Number(k)] === 2);
    if (pairRankStr) {
      const pairRank = Number(pairRankStr);
      if (pairRank >= 11) {
        return { name: "Jacks or Better", multiplier: 1 };
      }
    }
  }

  return null;
}

export default function VideoPokerGame({
  chips,
  onWin,
  onLose,
  onCommentaryRequest,
}: VideoPokerGameProps) {
  const [deck, setDeck] = useState<PokerCard[]>([]);
  const [hand, setHand] = useState<PokerCard[]>([]);
  const [heldIndices, setHeldIndices] = useState<boolean[]>([false, false, false, false, false]);
  const [gameState, setGameState] = useState<"betting" | "first-deal" | "drawn">("betting");
  const [activeBet, setActiveBet] = useState(50);
  const [outcome, setOutcome] = useState<{ name: string; payout: number; multiplier: number } | null>(null);
  const [stats, setStats] = useState({ handsPlayed: 0, highestMultiplier: "0x", wins: 0 });

  const getSuitChar = (suit: string) => {
    return SUITS.find((s) => s.name === suit)?.char || "";
  };

  const getSuitColor = (suit: string) => {
    return SUITS.find((s) => s.name === suit)?.color || "";
  };

  const handleDeal = () => {
    if (gameState !== "betting") return;
    if (chips < activeBet) {
      alert("Authorizing loan or matching chip balances is required! Talk with Vance.");
      return;
    }

    casinoAudio.playCardShuffle();
    onLose(activeBet, `Wagered $${activeBet} on Jacks or Better Video Poker`);

    const newDeck = generateDeck();
    const dealtHand = newDeck.slice(0, 5);
    const remainingDeck = newDeck.slice(5);

    setDeck(remainingDeck);
    setHand(dealtHand);
    setHeldIndices([false, false, false, false, false]);
    setGameState("first-deal");
    setOutcome(null);
    setStats((prev) => ({ ...prev, handsPlayed: prev.handsPlayed + 1 }));
  };

  const handleToggleHold = (index: number) => {
    if (gameState !== "first-deal") return;
    casinoAudio.playClick();
    setHeldIndices((prev) => {
      const copy = [...prev];
      copy[index] = !copy[index];
      return copy;
    });
  };

  const handleDraw = () => {
    if (gameState !== "first-deal") return;
    casinoAudio.playCardShuffle();

    let workingDeck = [...deck];
    const finalHand: PokerCard[] = hand.map((card, idx) => {
      if (heldIndices[idx]) {
        return card;
      }
      return workingDeck.pop() || card;
    });

    setDeck(workingDeck);
    setHand(finalHand);
    setGameState("drawn");

    const pokerResult = evaluatePokerHand(finalHand);

    if (pokerResult) {
      // WIN!
      const payoutAmount = activeBet * pokerResult.multiplier;
      onWin(payoutAmount, `Video Poker Win: ${pokerResult.name} with ${pokerResult.multiplier}x payout`);
      setOutcome({
        name: pokerResult.name,
        multiplier: pokerResult.multiplier,
        payout: payoutAmount,
      });
      setStats((prev) => ({
        ...prev,
        wins: prev.wins + 1,
        highestMultiplier:
          pokerResult.multiplier > parseInt(prev.highestMultiplier)
            ? `${pokerResult.multiplier}x`
            : prev.highestMultiplier,
      }));
      casinoAudio.playWin();
      onCommentaryRequest("win");
    } else {
      // LOSS
      setOutcome({
        name: "No Hand Match",
        multiplier: 0,
        payout: 0,
      });
      casinoAudio.playLose();
      onCommentaryRequest("lose");
    }
  };

  const handleReset = () => {
    casinoAudio.playClick();
    setGameState("betting");
    setHand([]);
    setHeldIndices([false, false, false, false, false]);
    setOutcome(null);
  };

  // Basic Vance strategic recommendation based on current hand
  const getStrategicAdvice = () => {
    if (gameState !== "first-deal") return "Place your bet and press DEAL to start your hand!";
    
    const matched = evaluatePokerHand(hand);
    if (matched) {
      if (matched.multiplier >= 9) {
        return `Vance's Strategy: You already have a premium ${matched.name}! Hold all 5 cards immediately for a guaranteed big win!`;
      }
      return `Vance's Strategy: You currently hold a ${matched.name}. Keep your winning combination and draw for potential upgrades.`;
    }

    // Check for pairs or royal components
    const ranks = hand.map((c) => c.rank);
    const freqMap: Record<number, number> = {};
    ranks.forEach((r) => (freqMap[r] = (freqMap[r] || 0) + 1));
    const pairRanks = Object.keys(freqMap).filter((k) => freqMap[Number(k)] >= 2).map(Number);

    if (pairRanks.length > 0) {
      const highestPair = Math.max(...pairRanks);
      const label = highestPair === 11 ? "J" : highestPair === 12 ? "Q" : highestPair === 13 ? "K" : highestPair === 14 ? "A" : highestPair;
      if (highestPair >= 11) {
        return `Vance's Strategy: You hold a high pair of ${label}s! Hold both of them to lock in a payout, then draw 3 new cards.`;
      } else {
        return `Vance's Strategy: You hold a low pair of ${label}s. Hold them both to build toward a Three of a Kind or Full House.`;
      }
    }

    // Look for high cards (J or better)
    const highCardsCount = hand.filter((c) => c.rank >= 11).length;
    if (highCardsCount > 0) {
      return `Vance's Strategy: No pairs detected. Hold any high cards (J, Q, K, A) to build toward a Jacks or Better pair.`;
    }

    return "Vance's Strategy: Hard hand with low synergy. Consider discarding all 5 cards for a clean redraw!";
  };

  return (
    <div className="space-y-6">
      
      {/* Upper Panel: Game Header & Strategy Box */}
      <div className="p-5 rounded-2xl border border-slate-900 bg-slate-950/80 backdrop-blur-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg">
        <div className="flex items-center gap-2.5">
          <Award className="h-5 w-5 text-fuchsia-400 animate-pulse" />
          <div>
            <h3 className="font-mono text-sm font-black text-white tracking-wider uppercase">Strategic Jacks or Better</h3>
            <span className="text-[10px] text-slate-500 font-mono">STATION #12 • VIDEO POKER HIGH VOLTAGE</span>
          </div>
        </div>

        {/* Vance Video Poker Advice Box */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-left w-full md:max-w-md flex items-start gap-2">
          <Info className="h-4 w-4 text-fuchsia-400 shrink-0 mt-0.5" />
          <p className="text-[11px] font-mono text-slate-400 leading-normal">
            {getStrategicAdvice()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (Lg: 4/12) - Paytable Display */}
        <div className="lg:col-span-4 p-5 rounded-3xl border border-slate-900 bg-slate-950/40 flex flex-col justify-between space-y-4">
          <div>
            <span className="text-[10px] uppercase font-mono font-black text-slate-500 tracking-wider block mb-3">PAYTABLE (MULTIPLIER CHART)</span>
            <div className="space-y-1.5 font-mono text-[11px]">
              {PAYTABLE.map((row) => {
                const isActiveWin = outcome && outcome.name === row.name;
                return (
                  <div
                    key={row.name}
                    className={`flex justify-between items-center px-2.5 py-1.5 rounded-lg border transition-all ${
                      isActiveWin
                        ? "bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-300 font-black shadow-[0_0_12px_rgba(217,70,239,0.2)] animate-pulse"
                        : "bg-slate-900/40 border-transparent text-slate-400"
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className={isActiveWin ? "text-fuchsia-300 font-extrabold" : "text-slate-300 font-medium"}>
                        {row.name}
                      </span>
                      <span className="text-[9px] text-slate-500 leading-none mt-0.5">{row.desc}</span>
                    </div>
                    <span className={`font-black ${isActiveWin ? "text-amber-400" : "text-amber-500/80"}`}>
                      {row.multiplier}x
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-2 text-center pt-3 border-t border-slate-900">
            <div className="p-2 rounded-xl bg-slate-900/40">
              <span className="text-[9px] text-slate-500 font-mono block">HANDS</span>
              <span className="text-xs font-mono font-black text-white">{stats.handsPlayed}</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/40">
              <span className="text-[9px] text-slate-500 font-mono block">WINS</span>
              <span className="text-xs font-mono font-black text-emerald-400">{stats.wins}</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/40">
              <span className="text-[9px] text-slate-500 font-mono block">PEAK MULT</span>
              <span className="text-xs font-mono font-black text-amber-400">{stats.highestMultiplier}</span>
            </div>
          </div>
        </div>

        {/* Right Column (Lg: 8/12) - Interactive Playing Field */}
        <div className="lg:col-span-8 p-6 rounded-3xl border border-slate-900 bg-slate-950/80 backdrop-blur-md flex flex-col justify-between space-y-8 relative overflow-hidden">
          
          {/* Neon Grid decoration */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(217,70,239,0.05),transparent_60%)] pointer-events-none" />

          {/* Hand Cards Rendering Area */}
          <div className="relative">
            {gameState === "betting" ? (
              // Empty / Ready board visual
              <div className="h-44 flex flex-col justify-center items-center rounded-2xl border border-dashed border-slate-900 bg-slate-950/20 text-center space-y-2 py-6">
                <span className="text-4xl filter drop-shadow-md select-none animate-bounce">🃏</span>
                <p className="font-mono text-xs text-slate-400 font-bold">Wager your custom chips bundle to deal.</p>
                <p className="font-mono text-[10px] text-slate-600">Perfect strategy guarantees up to 250x payouts!</p>
              </div>
            ) : (
              // Visual Poker cards line
              <div className="grid grid-cols-5 gap-2.5 sm:gap-4">
                {hand.map((card, idx) => {
                  const isHeld = heldIndices[idx];
                  return (
                    <motion.div
                      key={card.id}
                      initial={{ rotateY: 90, opacity: 0 }}
                      animate={{ rotateY: 0, opacity: 1 }}
                      transition={{ duration: 0.3, delay: idx * 0.08 }}
                      onClick={() => handleToggleHold(idx)}
                      className={`relative h-28 xs:h-36 sm:h-44 rounded-2xl border-2 flex flex-col justify-between p-2 sm:p-3.5 cursor-pointer select-none transition-all duration-250 ${
                        isHeld
                          ? "border-fuchsia-500 bg-fuchsia-950/10 shadow-[0_0_15px_rgba(217,70,239,0.25)] scale-[1.03] -translate-y-1.5"
                          : "border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:scale-[1.01]"
                      }`}
                    >
                      {/* Hold state badge */}
                      <div className="flex justify-between items-center h-4">
                        {gameState === "first-deal" && (
                          <span
                            className={`px-1.5 sm:px-2 py-0.5 text-[7px] sm:text-[8px] font-mono font-black uppercase tracking-widest rounded transition-all ${
                              isHeld
                                ? "bg-fuchsia-600 text-white animate-pulse"
                                : "bg-slate-950 text-slate-600 hover:text-slate-400"
                            }`}
                          >
                            {isHeld ? "HELD" : "HOLD"}
                          </span>
                        )}
                      </div>

                      {/* Card visual Suit and Value */}
                      <div className="text-center my-auto flex flex-col items-center">
                        <span className={`text-xl xs:text-2xl sm:text-3xl font-black font-mono leading-none ${getSuitColor(card.suit)}`}>
                          {card.value}
                        </span>
                        <span className={`text-lg xs:text-xl sm:text-2xl mt-0.5 ${getSuitColor(card.suit)}`}>
                          {getSuitChar(card.suit)}
                        </span>
                      </div>

                      {/* Suit tiny indicator at the bottom right */}
                      <div className="flex justify-end text-[8px] sm:text-[10px] font-bold uppercase font-mono text-slate-600">
                        {card.suit.substr(0, 3)}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Results display */}
          <AnimatePresence>
            {outcome && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`p-4 rounded-2xl text-center font-mono ${
                  outcome.multiplier > 0
                    ? "bg-emerald-950/80 border border-emerald-800 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                    : "bg-rose-950/80 border border-rose-800 text-rose-400"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="text-base select-none">{outcome.multiplier > 0 ? "✨" : "♠"}</span>
                  <span className="text-xs uppercase font-black tracking-wider">
                    {outcome.multiplier > 0
                      ? `${outcome.name} (${outcome.multiplier}x Payout!)`
                      : "Hand Complete - No Matches"}
                  </span>
                </div>
                {outcome.payout > 0 && (
                  <p className="text-lg font-black mt-1 text-amber-400">
                    +${outcome.payout} CHIPS CREDITED
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Interactive controls and bets selection */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between pt-4 border-t border-slate-900">
            
            {/* Bet chips slider selector */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">WAGER</span>
              <div className="flex gap-1.5">
                {[10, 25, 50, 100, 500].map((betValue) => (
                  <button
                    key={betValue}
                    disabled={gameState !== "betting"}
                    onClick={() => {
                      casinoAudio.playChipClink();
                      setActiveBet(betValue);
                    }}
                    className={`px-3 py-2 font-mono text-xs rounded-xl border transition-all duration-250 cursor-pointer active:scale-95 ${
                      activeBet === betValue
                        ? "bg-fuchsia-600 border-fuchsia-500 text-white font-extrabold shadow-[0_0_12px_rgba(217,70,239,0.25)]"
                        : "bg-slate-900/60 border-slate-800 text-slate-500 hover:text-slate-300 hover:bg-slate-900 disabled:opacity-30 disabled:pointer-events-none"
                    }`}
                  >
                    ${betValue}
                  </button>
                ))}
              </div>
            </div>

            {/* Stage Action Buttons */}
            <div className="flex gap-3 w-full md:w-auto justify-end">
              {gameState === "betting" && (
                <button
                  onClick={handleDeal}
                  className="w-full md:w-36 py-3 px-5 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-mono text-xs font-black tracking-widest uppercase rounded-2xl shadow-lg hover:shadow-2xl transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  <Play className="h-4 w-4 text-white fill-white" />
                  <span>DEAL CARD</span>
                </button>
              )}

              {gameState === "first-deal" && (
                <button
                  onClick={handleDraw}
                  className="w-full md:w-36 py-3 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-black tracking-widest uppercase rounded-2xl shadow-lg hover:shadow-2xl transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  <RefreshCw className="h-4 w-4 animate-spin text-white" />
                  <span>DRAW CARD</span>
                </button>
              )}

              {gameState === "drawn" && (
                <button
                  onClick={handleReset}
                  className="w-full md:w-36 py-3 px-5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono text-xs font-black tracking-widest uppercase rounded-2xl border border-slate-800 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  <span>NEXT HAND</span>
                </button>
              )}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
