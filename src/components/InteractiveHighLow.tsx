import React, { useState, useEffect } from "react";
import { Coins, Play, Trophy, Sparkles, AlertTriangle, ArrowUp, ArrowDown, RefreshCw, Eye, Percent, TrendingUp, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../lib/audioService";
import { evaluateLiveGameRound } from "../constants/liveGameConfig";

interface InteractiveHighLowProps {
  chips: number;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest: (type: "greet" | "win" | "lose") => void;
}

interface HighLowCard {
  id: string;
  suit: "hearts" | "diamonds" | "clubs" | "spades";
  value: string;
  rank: number; // 1 (Ace) to 13 (King)
}

const SUITS = [
  { name: "hearts", icon: "♥", color: "text-rose-500" },
  { name: "diamonds", icon: "♦", color: "text-rose-400" },
  { name: "clubs", icon: "♣", color: "text-slate-400" },
  { name: "spades", icon: "♠", color: "text-indigo-400" },
];

const CARD_VALUES = [
  { name: "A", rank: 1 },
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
];

function getRandomCard(): HighLowCard {
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  const val = CARD_VALUES[Math.floor(Math.random() * CARD_VALUES.length)];
  return {
    id: `${suit.name}-${val.name}-${Math.random().toString(36).substring(2, 7)}`,
    suit: suit.name as any,
    value: val.name,
    rank: val.rank,
  };
}

export default function InteractiveHighLow({ chips, onWin, onLose, onCommentaryRequest }: InteractiveHighLowProps) {
  const [bet, setBet] = useState(50);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isWinRound, setIsWinRound] = useState(false);
  const [currentCard, setCurrentCard] = useState<HighLowCard | null>(null);
  const [nextCard, setNextCard] = useState<HighLowCard | null>(null);
  const [streak, setStreak] = useState(0);
  const [accumulatedMultiplier, setAccumulatedMultiplier] = useState(1.0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [recentCards, setRecentCards] = useState<HighLowCard[]>([]);
  const [gameStatus, setGameStatus] = useState<"idle" | "playing" | "won" | "lost" | "push">("idle");
  const [choiceMade, setChoiceMade] = useState<"higher" | "lower" | null>(null);
  const [stats, setStats] = useState({ totalPlayed: 0, highestStreak: 0, totalWinnings: 0 });

  // Generate initial card on load or when resetting
  useEffect(() => {
    if (!isPlaying && gameStatus === "idle") {
      setCurrentCard(getRandomCard());
    }
  }, [isPlaying, gameStatus]);

  // Calculate dynamic multipliers for higher/lower options based on current card rank
  // Ace (1) to King (13)
  const currentRank = currentCard ? currentCard.rank : 7;
  
  // Probabilities calculation:
  // Higher: rank can be from currentRank + 1 to 13 (so 13 - currentRank cards)
  // Lower: rank can be from 1 to currentRank - 1 (so currentRank - 1 cards)
  const higherCardsCount = 13 - currentRank;
  const lowerCardsCount = currentRank - 1;
  const totalOtherCards = 12; // Out of remaining card pools approximately

  // Fair multipliers + House advantage adjustment (e.g., 95% payout rate)
  const probHigher = higherCardsCount > 0 ? higherCardsCount / totalOtherCards : 0.01;
  const probLower = lowerCardsCount > 0 ? lowerCardsCount / totalOtherCards : 0.01;

  const rawMultHigher = higherCardsCount > 0 ? (0.96 / probHigher) : 0;
  const rawMultLower = lowerCardsCount > 0 ? (0.96 / probLower) : 0;

  const multHigher = rawMultHigher > 0 ? Math.max(1.05, parseFloat(rawMultHigher.toFixed(2))) : 0;
  const multLower = rawMultLower > 0 ? Math.max(1.05, parseFloat(rawMultLower.toFixed(2))) : 0;

  const startNewGame = () => {
    if (chips < bet) {
      casinoAudio.playLose();
      return;
    }

    casinoAudio.playChipClink();
    onLose(bet, `Placed $${bet} High-Low Bet`);

    setIsPlaying(true);
    setIsWinRound(evaluateLiveGameRound());
    setStreak(0);
    setAccumulatedMultiplier(1.0);
    setGameStatus("playing");
    setChoiceMade(null);
    setNextCard(null);
    
    const initialCard = getRandomCard();
    setCurrentCard(initialCard);
    setRecentCards([initialCard]);

    setStats((prev) => ({
      ...prev,
      totalPlayed: prev.totalPlayed + 1,
    }));
  };

  const handleGuess = async (guess: "higher" | "lower") => {
    if (!isPlaying || isFlipping || !currentCard) return;

    setIsFlipping(true);
    setChoiceMade(guess);
    casinoAudio.playCardShuffle();

    const drawn = getRandomCard();
    setNextCard(drawn);

    // Easing sleep for card flip suspense
    await new Promise((resolve) => setTimeout(resolve, 800));

    const isTie = drawn.rank === currentCard.rank;
    let isCorrect = false;

    if (!isTie) {
      if (guess === "higher" && drawn.rank > currentCard.rank) {
        isCorrect = true;
      } else if (guess === "lower" && drawn.rank < currentCard.rank) {
        isCorrect = true;
      }
    }

    if (isTie) {
      // Tie option is extremely player-friendly! Keep streak, draw again
      casinoAudio.playWheelSpin(0.05);
      setGameStatus("push");
      // Add drawn card to history
      setRecentCards((prev) => [drawn, ...prev].slice(0, 8));
      setCurrentCard(drawn);
      setNextCard(null);
      setIsFlipping(false);
      setChoiceMade(null);
      return;
    }

    if (isCorrect) {
      // Success! Multiply accumulated pool
      const multiplierApplied = guess === "higher" ? multHigher : multLower;
      const nextMultiplier = accumulatedMultiplier * multiplierApplied;
      
      casinoAudio.playWin();
      setStreak((s) => {
        const nextStreak = s + 1;
        setStats((p) => ({ ...p, highestStreak: Math.max(p.highestStreak, nextStreak) }));
        return nextStreak;
      });
      setAccumulatedMultiplier(nextMultiplier);
      
      // Move card over
      setRecentCards((prev) => [drawn, ...prev].slice(0, 8));
      setCurrentCard(drawn);
      setNextCard(null);
      setChoiceMade(null);
    } else {
      // Wrong guess! Blew the streak
      casinoAudio.playLose();
      setGameStatus("lost");
      setIsPlaying(false);
      setRecentCards((prev) => [drawn, ...prev].slice(0, 8));
      onCommentaryRequest("lose");
    }

    setIsFlipping(false);
  };

  const handleCashOut = () => {
    if (!isPlaying || streak === 0) return;

    const totalWin = bet * accumulatedMultiplier;
    casinoAudio.playWin();
    setGameStatus("won");
    setIsPlaying(false);

    onWin(totalWin, `Interactive High-Low: Cashed out on ${streak}-win streak at ${accumulatedMultiplier.toFixed(2)}x. Earned $${totalWin.toFixed(2)}!`);
    onCommentaryRequest("win");

    setStats((prev) => ({
      ...prev,
      totalWinnings: prev.totalWinnings + totalWin,
    }));
  };

  const adjustBet = (amount: number) => {
    if (isPlaying) return;
    casinoAudio.playClick();
    setBet(amount);
  };

  const getSuitSymbol = (suitName: string) => {
    const found = SUITS.find((s) => s.name === suitName);
    return found ? found.icon : "";
  };

  const getSuitColor = (suitName: string) => {
    const found = SUITS.find((s) => s.name === suitName);
    return found ? found.color : "";
  };

  const currentWinnings = bet * accumulatedMultiplier;

  return (
    <div id="highlow-game-container" className="flex flex-col gap-6 p-4 sm:p-6 rounded-3xl border border-slate-900 bg-slate-950/80 backdrop-blur-xl relative overflow-hidden shadow-2xl glow-fuchsia">
      {/* Dynamic atmospheric visuals */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/10 via-slate-950/30 to-slate-950 pointer-events-none" />

      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[9px] uppercase tracking-widest font-mono font-black rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              STREAK BUILDER
            </span>
            <span className="flex items-center gap-1 text-[9px] uppercase tracking-widest font-mono font-black rounded-md bg-pink-500/10 border border-pink-500/20 text-pink-400">
              <Sparkles className="h-2.5 w-2.5 text-pink-400" /> LIVE multipliers
            </span>
          </div>
          <h2 className="text-xl font-sans font-black text-white tracking-tight mt-1 flex items-center gap-2">
            Interactive High-Low <span className="text-pink-500 text-sm">$</span>
          </h2>
        </div>

        {/* Dynamic Stats board */}
        <div className="flex gap-4 font-mono text-[10px] text-slate-500 bg-slate-900/40 border border-white/[0.02] p-2.5 rounded-2xl">
          <div className="flex flex-col">
            <span className="text-slate-400 font-extrabold uppercase">ROUNDS</span>
            <span className="text-xs font-black text-slate-100">{stats.totalPlayed}</span>
          </div>
          <div className="w-[1px] bg-white/[0.04]" />
          <div className="flex flex-col">
            <span className="text-slate-400 font-extrabold uppercase">MAX STREAK</span>
            <span className="text-xs font-black text-pink-400">{stats.highestStreak} Wins</span>
          </div>
          <div className="w-[1px] bg-white/[0.04]" />
          <div className="flex flex-col">
            <span className="text-slate-400 font-extrabold uppercase">TOTAL CASHOUTS</span>
            <span className="text-xs font-black text-emerald-400">${stats.totalWinnings.toFixed(0)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch z-10">
        
        {/* Left Side: Game Bet & Prediction Controls */}
        <div className="lg:col-span-4 flex flex-col justify-between p-5 bg-slate-900/40 border border-white/[0.02] rounded-2xl space-y-4">
          <div className="space-y-4">
            
            {/* Wager Input Section */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] uppercase font-mono tracking-widest text-slate-400 font-extrabold flex items-center gap-1.5">
                  <Coins className="h-3.5 w-3.5 text-slate-400" /> WAGER AMOUNT
                </label>
                <span className="text-[10px] font-mono font-bold text-pink-400">USDT</span>
              </div>

              <input
                type="number"
                min={0.10}
                step={0.10}
                max={Math.max(0.10, chips)}
                disabled={isPlaying}
                value={bet}
                onChange={(e) => setBet(Math.max(0.10, Number(e.target.value)))}
                className="w-full px-4 py-3 bg-slate-950 border border-white/[0.04] disabled:opacity-50 hover:border-slate-850 focus:border-pink-500 focus:outline-none rounded-xl font-mono text-xs font-bold text-white transition-all shadow-inner"
              />

              <div className="grid grid-cols-5 gap-1.5">
                {[10, 25, 50, 100].map((amt) => (
                  <button
                    key={amt}
                    disabled={isPlaying}
                    onClick={() => adjustBet(amt)}
                    className="py-1.5 rounded-lg bg-slate-950 hover:bg-slate-900 disabled:opacity-50 border border-white/[0.02] font-mono text-[10px] text-slate-400 hover:text-white transition-all cursor-pointer"
                  >
                    ${amt}
                  </button>
                ))}
                <button
                  disabled={isPlaying}
                  onClick={() => adjustBet(chips)}
                  className="py-1.5 rounded-lg bg-slate-950 hover:bg-slate-900 disabled:opacity-50 border border-pink-500/20 font-mono text-[10px] text-pink-400 hover:text-pink-300 font-bold transition-all cursor-pointer"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Live forecast indicators for options */}
            {isPlaying && currentCard && (
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-white/[0.01] space-y-3">
                <div className="text-[9px] uppercase tracking-wider font-mono font-bold text-slate-500 flex items-center gap-1">
                  <Percent className="h-3 w-3 text-pink-400" /> Odds Calculator
                </div>
                
                <div className="space-y-2">
                  {/* Higher forecast */}
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-slate-400 flex items-center gap-1">
                      <ArrowUp className="h-3.5 w-3.5 text-emerald-400" /> Next is Higher:
                    </span>
                    <span className="font-bold text-emerald-400">
                      {multHigher > 0 ? `${multHigher.toFixed(2)}x` : "Impossible"}
                    </span>
                  </div>

                  {/* Lower forecast */}
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-slate-400 flex items-center gap-1">
                      <ArrowDown className="h-3.5 w-3.5 text-rose-400" /> Next is Lower:
                    </span>
                    <span className="font-bold text-rose-400">
                      {multLower > 0 ? `${multLower.toFixed(2)}x` : "Impossible"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Game rules checklist */}
            {!isPlaying && (
              <div className="bg-slate-950/60 p-3 rounded-xl border border-white/[0.01] text-[9.5px] font-mono text-slate-500 leading-relaxed space-y-1.5">
                <span className="font-extrabold uppercase text-slate-400 flex items-center gap-1">
                  <HelpCircle className="h-3 w-3 text-pink-400" /> Game Rules
                </span>
                <p>
                  Guess whether the next randomly drawn card has a higher or lower numerical rank than the card on display.
                </p>
                <p>
                  Aces are low (1) and Kings are high (13). Tie value cards result in a friendly push, keeping your streak alive!
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2.5 pt-4">
            {!isPlaying ? (
              <button
                onClick={startNewGame}
                disabled={chips < bet}
                className="w-full py-4 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-sans font-black text-xs rounded-2xl shadow-lg shadow-pink-950/40 hover:shadow-pink-500/10 cursor-pointer transition-all disabled:opacity-40 active:scale-[0.98] flex items-center justify-center gap-2 uppercase tracking-widest"
              >
                <Play className="h-4 w-4 fill-white text-white" /> START STREAK (${bet})
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    disabled={isFlipping || multHigher === 0}
                    onClick={() => handleGuess("higher")}
                    className="py-3.5 bg-slate-900 hover:bg-slate-850 border border-emerald-500/20 text-emerald-400 font-sans font-black text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer uppercase transition-all disabled:opacity-30"
                  >
                    <ArrowUp className="h-4 w-4 text-emerald-400" /> HIGHER
                  </button>

                  <button
                    disabled={isFlipping || multLower === 0}
                    onClick={() => handleGuess("lower")}
                    className="py-3.5 bg-slate-900 hover:bg-slate-850 border border-rose-500/20 text-rose-400 font-sans font-black text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer uppercase transition-all disabled:opacity-30"
                  >
                    <ArrowDown className="h-4 w-4 text-rose-400" /> LOWER
                  </button>
                </div>

                <button
                  disabled={streak === 0 || isFlipping}
                  onClick={handleCashOut}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-sans font-black text-xs rounded-xl shadow-md cursor-pointer transition-all disabled:opacity-40 flex flex-col items-center justify-center leading-tight tracking-wider"
                >
                  <span className="uppercase font-black flex items-center gap-1 text-[11px]">
                    <Trophy className="h-3.5 w-3.5" /> CASH OUT NOW
                  </span>
                  <span className="text-[9px] opacity-80 font-mono font-bold mt-0.5">
                    Claim ${currentWinnings.toFixed(2)} ({accumulatedMultiplier.toFixed(2)}x)
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Sleek Card Flip Felt Display & Live score panels */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          
          {/* Streak indicator stats */}
          <div className="grid grid-cols-3 gap-2.5 items-center p-3 bg-slate-950/50 border border-white/[0.02] rounded-2xl font-mono text-xs text-center">
            <div className="flex flex-col items-center p-2 rounded-xl bg-slate-900/30 border border-white/[0.01]">
              <span className="text-[8px] text-slate-500 uppercase font-black">CURRENT STREAK</span>
              <span className="text-sm font-black text-pink-400 mt-0.5 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-pink-400" /> {streak} Wins
              </span>
            </div>

            <div className="flex flex-col items-center p-2 rounded-xl bg-slate-900/30 border border-white/[0.01]">
              <span className="text-[8px] text-slate-500 uppercase font-black">STREAK MULTIPLIER</span>
              <span className="text-sm font-black text-white mt-0.5">
                {accumulatedMultiplier.toFixed(2)}x
              </span>
            </div>

            <div className="flex flex-col items-center p-2 rounded-xl bg-slate-900/30 border border-white/[0.01]">
              <span className="text-[8px] text-slate-500 uppercase font-black">CHIP ACCUMULATION</span>
              <span className="text-sm font-black text-emerald-400 mt-0.5">
                ${currentWinnings.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Immersive card display felt */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-950/80 border border-white/[0.03] rounded-3xl relative min-h-[360px]">
            
            {/* Game over overlays */}
            <AnimatePresence>
              {(gameStatus === "lost" || gameStatus === "won" || gameStatus === "push") && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-950/95 z-20 flex flex-col items-center justify-center p-6 text-center rounded-3xl"
                >
                  {gameStatus === "won" && (
                    <div className="space-y-4">
                      <div className="inline-flex p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-full animate-bounce">
                        <Trophy className="h-8 w-8 text-emerald-400" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xl font-sans font-black text-white uppercase tracking-tight">
                          Streak Cashed Out!
                        </h3>
                        <p className="text-xs text-slate-400 font-mono">
                          You successfully secured your multiplier profit before any wrong guesses.
                        </p>
                      </div>
                      <div className="py-2.5 px-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 inline-block font-mono">
                        <div className="text-[10px] text-slate-500 font-bold uppercase">Final Multiplier</div>
                        <div className="text-2xl font-black text-emerald-400">{accumulatedMultiplier.toFixed(2)}x</div>
                        <div className="text-xs font-semibold text-emerald-400 mt-0.5">+${(bet * accumulatedMultiplier).toFixed(2)} Chips</div>
                      </div>
                    </div>
                  )}

                  {gameStatus === "lost" && (
                    <div className="space-y-4">
                      <div className="inline-flex p-3 bg-rose-500/10 border border-rose-500/30 rounded-full animate-pulse">
                        <AlertTriangle className="h-8 w-8 text-rose-500" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xl font-sans font-black text-white uppercase tracking-tight">
                          Streak Broken! 💥
                        </h3>
                        <p className="text-xs text-slate-400 font-mono">
                          The drawn card was {nextCard ? `${nextCard.value} of ${nextCard.suit}` : "different"}. Guess was incorrect.
                        </p>
                      </div>
                      <div className="py-2 px-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 inline-block font-mono">
                        <div className="text-[10px] text-slate-500 font-bold uppercase">Wager lost</div>
                        <div className="text-lg font-black text-rose-500">-${bet.toFixed(2)} Chips</div>
                      </div>
                    </div>
                  )}

                  {gameStatus === "push" && (
                    <div className="space-y-4">
                      <div className="inline-flex p-3 bg-amber-500/10 border border-amber-500/30 rounded-full">
                        <RefreshCw className="h-8 w-8 text-amber-400 animate-spin" style={{ animationDuration: '3s' }} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xl font-sans font-black text-white uppercase tracking-tight">
                          Push Tie Hand!
                        </h3>
                        <p className="text-xs text-slate-400 font-mono">
                          Drawn card rank matched exactly! Streak stays intact, continue your climb.
                        </p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      casinoAudio.playClick();
                      if (gameStatus === "push") {
                        setGameStatus("playing");
                      } else {
                        setGameStatus("idle");
                        setAccumulatedMultiplier(1.0);
                        setStreak(0);
                      }
                    }}
                    className="mt-6 px-6 py-2.5 bg-slate-900 hover:bg-slate-850 border border-white/[0.04] text-slate-300 hover:text-white rounded-xl font-mono text-xs font-bold tracking-wider uppercase transition-all cursor-pointer active:scale-95"
                  >
                    {gameStatus === "push" ? "Continue Streak" : "Back to Felt Board"}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Core Card layout felt */}
            <div className="flex items-center justify-center gap-6 relative w-full max-w-[280px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentCard ? currentCard.id : "empty"}
                  initial={{ rotateY: 90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  exit={{ rotateY: -90, opacity: 0 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="w-40 aspect-[2.5/3.5] bg-slate-900 border-2 border-pink-500 rounded-2xl shadow-2xl flex flex-col justify-between p-4 relative overflow-hidden shadow-pink-950/20"
                >
                  {/* Neon glossy reflection card border overlay */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-white/[0.06] pointer-events-none" />

                  {currentCard ? (
                    <>
                      <div className="flex justify-between items-start">
                        <span className="font-sans font-black text-xl text-white">{currentCard.value}</span>
                        <span className={`text-xl ${getSuitColor(currentCard.suit)}`}>{getSuitSymbol(currentCard.suit)}</span>
                      </div>
                      <div className="text-center">
                        <span className={`text-5xl ${getSuitColor(currentCard.suit)} filter drop-shadow-[0_0_12px_rgba(236,72,153,0.3)]`}>
                          {getSuitSymbol(currentCard.suit)}
                        </span>
                      </div>
                      <div className="flex justify-between items-end rotate-180">
                        <span className="font-sans font-black text-xl text-white">{currentCard.value}</span>
                        <span className={`text-xl ${getSuitColor(currentCard.suit)}`}>{getSuitSymbol(currentCard.suit)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-600 font-mono text-xs uppercase tracking-widest text-center">
                      No Card Loaded
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Recent Cards bead road strip */}
            {recentCards.length > 0 && (
              <div className="mt-8 w-full max-w-[320px] space-y-2">
                <label className="block text-[8px] uppercase font-mono tracking-widest text-slate-500 font-black flex items-center gap-1">
                  <Eye className="h-3 w-3" /> Recent Cards history
                </label>
                <div className="flex gap-2 justify-start items-center overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-900">
                  {recentCards.map((card, idx) => (
                    <div
                      key={card.id}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/[0.02] font-mono text-xs ${
                        idx === 0 ? "border-pink-500/30 text-white font-bold bg-pink-950/20" : "text-slate-400"
                      }`}
                    >
                      <span>{card.value}</span>
                      <span className={getSuitColor(card.suit)}>{getSuitSymbol(card.suit)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
