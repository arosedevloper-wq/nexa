import React, { useState, useEffect } from "react";
import { Coins, Play, Trophy, Sparkles, RefreshCw, HelpCircle, AlertCircle, Eye } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../lib/audioService";
import { evaluateLiveGameRound } from "../constants/liveGameConfig";

interface LuxuryBaccaratProps {
  chips: number;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest: (type: "greet" | "win" | "lose") => void;
}

interface BaccaratCard {
  id: string;
  suit: "hearts" | "diamonds" | "clubs" | "spades";
  value: string;
  score: number;
}

type BetType = "player" | "banker" | "tie";

const SUITS = [
  { name: "hearts", icon: "♥", color: "text-rose-500" },
  { name: "diamonds", icon: "♦", color: "text-rose-400" },
  { name: "clubs", icon: "♣", color: "text-slate-400" },
  { name: "spades", icon: "♠", color: "text-indigo-400" },
];

const VALUES = [
  { name: "A", score: 1 },
  { name: "2", score: 2 },
  { name: "3", score: 3 },
  { name: "4", score: 4 },
  { name: "5", score: 5 },
  { name: "6", score: 6 },
  { name: "7", score: 7 },
  { name: "8", score: 8 },
  { name: "9", score: 9 },
  { name: "10", score: 0 },
  { name: "J", score: 0 },
  { name: "Q", score: 0 },
  { name: "K", score: 0 },
];

function generateCardDeck(): BaccaratCard[] {
  const deck: BaccaratCard[] = [];
  for (let s = 0; s < SUITS.length; s++) {
    for (let v = 0; v < VALUES.length; v++) {
      deck.push({
        id: `${SUITS[s].name}-${VALUES[v].name}-${Math.random().toString(36).substring(2, 7)}`,
        suit: SUITS[s].name as any,
        value: VALUES[v].name,
        score: VALUES[v].score,
      });
    }
  }
  // Shuffle cards
  return deck.sort(() => Math.random() - 0.5);
}

function calculateHandScore(cards: BaccaratCard[]): number {
  const total = cards.reduce((sum, card) => sum + card.score, 0);
  return total % 10;
}

export default function LuxuryBaccarat({ chips, onWin, onLose, onCommentaryRequest }: LuxuryBaccaratProps) {
  const [bets, setBets] = useState<Record<BetType, number>>({ player: 0, banker: 0, tie: 0 });
  const [activeChip, setActiveChip] = useState(50);
  const [playerCards, setPlayerCards] = useState<BaccaratCard[]>([]);
  const [bankerCards, setBankerCards] = useState<BaccaratCard[]>([]);
  const [isDealing, setIsDealing] = useState(false);
  const [dealStage, setDealStage] = useState<string>("");
  const [gameResult, setGameResult] = useState<{
    winner: "player" | "banker" | "tie" | null;
    payout: number;
    wagerLost: number;
    description: string;
  } | null>(null);

  const [history, setHistory] = useState<Array<"P" | "B" | "T">>([
    "P", "B", "B", "P", "T", "B", "P", "P", "B"
  ]);

  const [stats, setStats] = useState({
    totalHands: 0,
    totalWagered: 0,
    maxWin: 0,
  });

  const totalCurrentBet = bets.player + bets.banker + bets.tie;

  const handlePlaceBet = (type: BetType) => {
    if (isDealing) return;
    if (chips < totalCurrentBet + activeChip) {
      casinoAudio.playLose();
      return;
    }
    casinoAudio.playChipClink();
    setBets((prev) => ({
      ...prev,
      [type]: prev[type] + activeChip,
    }));
  };

  const handleClearBets = () => {
    if (isDealing) return;
    casinoAudio.playClick();
    setBets({ player: 0, banker: 0, tie: 0 });
  };

  const handleDeal = async () => {
    if (isDealing || totalCurrentBet === 0) return;
    if (chips < totalCurrentBet) {
      casinoAudio.playLose();
      return;
    }

    setIsDealing(true);
    setGameResult(null);
    setPlayerCards([]);
    setBankerCards([]);

    const deck = generateCardDeck();
    
    const isWin = evaluateLiveGameRound();
    let targetWinner: "player" | "banker" | "tie" = "player";
    
    // Determine target winner based on bets and isWin
    const maxBetType = bets.player >= bets.banker && bets.player >= bets.tie 
      ? "player" 
      : bets.banker >= bets.player && bets.banker >= bets.tie 
        ? "banker" 
        : "tie";
        
    if (isWin) {
      targetWinner = maxBetType;
    } else {
      // Force loss: pick anything other than their max bet
      if (maxBetType === "player") {
        targetWinner = "banker";
      } else if (maxBetType === "banker") {
        targetWinner = "player";
      } else {
        targetWinner = Math.random() < 0.5 ? "player" : "banker";
      }
    }

    const usedIds = new Set<string>();
    const findCardByScore = (score: number, excludeIds: Set<string>): BaccaratCard => {
      const idx = deck.findIndex(c => c.score === score && !excludeIds.has(c.id));
      const card = deck[idx !== -1 ? idx : 0];
      excludeIds.add(card.id);
      return card;
    };

    let p1: BaccaratCard, b1: BaccaratCard, p2: BaccaratCard, b2: BaccaratCard;
    if (targetWinner === "player") {
      p1 = findCardByScore(1, usedIds); // Ace
      b1 = findCardByScore(4, usedIds);
      p2 = findCardByScore(8, usedIds);
      b2 = findCardByScore(3, usedIds);
    } else if (targetWinner === "banker") {
      p1 = findCardByScore(4, usedIds);
      b1 = findCardByScore(1, usedIds); // Ace
      p2 = findCardByScore(3, usedIds);
      b2 = findCardByScore(8, usedIds);
    } else {
      p1 = findCardByScore(5, usedIds);
      b1 = findCardByScore(6, usedIds);
      p2 = findCardByScore(3, usedIds);
      b2 = findCardByScore(2, usedIds);
    }

    let deckIndex = 0;
    // Advance deck index so rest of the deck is clean
    while (deck[deckIndex] && (deck[deckIndex].id === p1.id || deck[deckIndex].id === b1.id || deck[deckIndex].id === p2.id || deck[deckIndex].id === b2.id)) {
      deckIndex++;
    }

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // Deal Player Card 1
    setDealStage("Dealing Player Card 1...");
    setPlayerCards([p1]);
    casinoAudio.playCardShuffle();
    await sleep(650);

    // Deal Banker Card 1
    setDealStage("Dealing Banker Card 1...");
    setBankerCards([b1]);
    casinoAudio.playCardShuffle();
    await sleep(650);

    // Deal Player Card 2
    setDealStage("Dealing Player Card 2...");
    setPlayerCards([p1, p2]);
    casinoAudio.playCardShuffle();
    await sleep(650);

    // Deal Banker Card 2
    setDealStage("Dealing Banker Card 2...");
    setBankerCards([b1, b2]);
    casinoAudio.playCardShuffle();
    await sleep(800);

    let finalPlayerHand = [p1, p2];
    let finalBankerHand = [b1, b2];

    let pScore = calculateHandScore(finalPlayerHand);
    let bScore = calculateHandScore(finalBankerHand);

    // Baccarat Drawing Rules Matrix
    const isPlayerNatural = pScore === 8 || pScore === 9;
    const isBankerNatural = bScore === 8 || bScore === 9;

    if (isPlayerNatural || isBankerNatural) {
      setDealStage("Natural Hand! Stand.");
      await sleep(1000);
    } else {
      // Player draws if score is 0-5
      let playerThirdCard: BaccaratCard | null = null;
      if (pScore <= 5) {
        setDealStage("Player draws Third Card...");
        playerThirdCard = deck[deckIndex++];
        finalPlayerHand.push(playerThirdCard);
        setPlayerCards([...finalPlayerHand]);
        casinoAudio.playCardShuffle();
        await sleep(1000);
        pScore = calculateHandScore(finalPlayerHand);
      }

      // Banker draw logic
      let bankerDraws = false;
      const b3rd = bScore; // banker initial score

      if (playerThirdCard === null) {
        // Player stood on 6 or 7
        if (bScore <= 5) {
          bankerDraws = true;
        }
      } else {
        // Player drew a 3rd card
        const val3 = playerThirdCard.score; // Third card value
        if (b3rd <= 2) {
          bankerDraws = true;
        } else if (b3rd === 3) {
          bankerDraws = val3 !== 8;
        } else if (b3rd === 4) {
          bankerDraws = val3 >= 2 && val3 <= 7;
        } else if (b3rd === 5) {
          bankerDraws = val3 >= 4 && val3 <= 7;
        } else if (b3rd === 6) {
          bankerDraws = val3 === 6 || val3 === 7;
        }
      }

      if (bankerDraws) {
        setDealStage("Banker draws Third Card...");
        const bankerThirdCard = deck[deckIndex++];
        finalBankerHand.push(bankerThirdCard);
        setBankerCards([...finalBankerHand]);
        casinoAudio.playCardShuffle();
        await sleep(1000);
        bScore = calculateHandScore(finalBankerHand);
      }
    }

    // Resolve Game Outcome
    let winner: "player" | "banker" | "tie" = "tie";
    if (pScore > bScore) {
      winner = "player";
    } else if (bScore > pScore) {
      winner = "banker";
    }

    // Payout formulas
    let winAmount = 0;
    let loseAmount = 0;

    // Player bet pays 1:1
    if (winner === "player") {
      if (bets.player > 0) winAmount += bets.player * 2;
      loseAmount += bets.banker + bets.tie;
    }
    // Banker bet pays 1:1 less 5% VIP commission (0.95:1 net profit)
    else if (winner === "banker") {
      if (bets.banker > 0) winAmount += bets.banker * 1.95;
      loseAmount += bets.player + bets.tie;
    }
    // Tie bet pays 8:1
    else if (winner === "tie") {
      if (bets.tie > 0) winAmount += bets.tie * 9; // return original stake + 8x profit
      // Push (return bets) on player/banker if tie
      if (bets.player > 0) winAmount += bets.player;
      if (bets.banker > 0) winAmount += bets.banker;
    }

    const netWinLoss = winAmount - totalCurrentBet;

    let finalDesc = "";
    if (winner === "tie") {
      finalDesc = `Tie Hand (${pScore} - ${bScore})! Player & Banker stakes returned.`;
    } else {
      finalDesc = `${winner.toUpperCase()} wins with a score of ${winner === "player" ? pScore : bScore} to ${winner === "player" ? bScore : pScore}!`;
    }

    setDealStage("Result decided!");
    await sleep(400);

    // Apply payouts
    if (netWinLoss > 0) {
      onWin(netWinLoss, `Luxury Baccarat: Bet on ${winner.toUpperCase()}, won $${netWinLoss.toFixed(2)} with score ${pScore} to ${bScore}!`);
      casinoAudio.playWin();
    } else if (netWinLoss < 0) {
      onLose(Math.abs(netWinLoss), `Luxury Baccarat: Wagered on ${winner === "tie" ? "Tie" : winner === "player" ? "Banker" : "Player"} and lost.`);
      casinoAudio.playLose();
    } else {
      // Tie outcome with no bets, or equal return
      casinoAudio.playWheelSpin(0.04);
    }

    // Update history tracker
    setHistory((prev) => {
      const char: "P" | "B" | "T" = winner === "player" ? "P" : winner === "banker" ? "B" : "T";
      const next = [...prev, char];
      if (next.length > 12) next.shift();
      return next;
    });

    setGameResult({
      winner,
      payout: winAmount,
      wagerLost: loseAmount,
      description: finalDesc,
    });

    setStats((prev) => ({
      totalHands: prev.totalHands + 1,
      totalWagered: prev.totalWagered + totalCurrentBet,
      maxWin: Math.max(prev.maxWin, netWinLoss),
    }));

    setIsDealing(false);
    setBets({ player: 0, banker: 0, tie: 0 });

    if (netWinLoss > 150) {
      onCommentaryRequest("win");
    } else if (netWinLoss < -150) {
      onCommentaryRequest("lose");
    }
  };

  const getSuitSymbol = (suitName: string) => {
    const found = SUITS.find((s) => s.name === suitName);
    return found ? found.icon : "";
  };

  const getSuitColor = (suitName: string) => {
    const found = SUITS.find((s) => s.name === suitName);
    return found ? found.color : "";
  };

  return (
    <div id="baccarat-game-container" className="flex flex-col gap-6 p-4 sm:p-6 rounded-3xl border border-slate-900 bg-slate-950/80 backdrop-blur-xl relative overflow-hidden shadow-2xl glow-fuchsia">
      {/* Royal deep-green background design */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-950/20 via-slate-950/40 to-slate-950 pointer-events-none" />

      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[9px] uppercase tracking-widest font-mono font-black rounded-md bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
              HIGH ROLLER felt
            </span>
            <span className="flex items-center gap-1 text-[9px] uppercase tracking-widest font-mono font-black rounded-md bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <Sparkles className="h-2.5 w-2.5 text-teal-400" /> EXCLUSIVE RELEASE
            </span>
          </div>
          <h2 className="text-xl font-sans font-black text-white tracking-tight mt-1 flex items-center gap-2">
            Luxury Baccarat <span className="text-yellow-500 text-sm">$</span>
          </h2>
        </div>

        {/* Board stats */}
        <div className="flex gap-4 font-mono text-[10px] text-slate-500 bg-slate-900/40 border border-white/[0.02] p-2.5 rounded-2xl">
          <div className="flex flex-col">
            <span className="text-slate-400 font-extrabold uppercase">HANDS PLAYED</span>
            <span className="text-xs font-black text-slate-100">{stats.totalHands}</span>
          </div>
          <div className="w-[1px] bg-white/[0.04]" />
          <div className="flex flex-col">
            <span className="text-slate-400 font-extrabold uppercase">TOTAL BETS</span>
            <span className="text-xs font-black text-slate-100">${stats.totalWagered}</span>
          </div>
          <div className="w-[1px] bg-white/[0.04]" />
          <div className="flex flex-col">
            <span className="text-slate-400 font-extrabold uppercase">PEAK WIN</span>
            <span className="text-xs font-black text-amber-400">${stats.maxWin}</span>
          </div>
        </div>
      </div>

      {/* Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch z-10">
        {/* Left Interactive Side - Dealer Felt Board */}
        <div className="lg:col-span-8 flex flex-col gap-4 bg-slate-900/20 p-5 rounded-3xl border border-white/[0.02] relative min-h-[460px]">
          
          {/* Winner announcement banners */}
          <AnimatePresence>
            {gameResult && (
              <motion.div
                initial={{ opacity: 0, y: -15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -15, scale: 0.95 }}
                className="absolute top-4 left-4 right-4 z-20 p-4 rounded-2xl border text-center backdrop-blur-md flex flex-col items-center justify-center gap-2 shadow-lg"
                style={{
                  background:
                    gameResult.winner === "player"
                      ? "rgba(6, 182, 212, 0.15)"
                      : gameResult.winner === "banker"
                      ? "rgba(244, 63, 94, 0.15)"
                      : "rgba(234, 179, 8, 0.15)",
                  borderColor:
                    gameResult.winner === "player"
                      ? "rgba(6, 182, 212, 0.3)"
                      : gameResult.winner === "banker"
                      ? "rgba(244, 63, 94, 0.3)"
                      : "rgba(234, 179, 8, 0.3)",
                }}
              >
                <div className="inline-flex p-1.5 bg-slate-950/80 rounded-full">
                  <Trophy
                    className={`h-5 w-5 ${
                      gameResult.winner === "player"
                        ? "text-cyan-400"
                        : gameResult.winner === "banker"
                        ? "text-rose-400"
                        : "text-amber-400"
                    }`}
                  />
                </div>
                <h3 className="text-base font-black text-white uppercase tracking-wider">
                  {gameResult.description}
                </h3>
                {gameResult.payout > 0 && (
                  <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-lg border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                    Payout: +${gameResult.payout.toFixed(2)}
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Cards dealing tabletop felt */}
          <div className="flex-1 grid grid-cols-2 gap-4 items-center justify-center p-4">
            
            {/* Player Hand Section */}
            <div className="flex flex-col items-center justify-center space-y-4 p-4 rounded-2xl bg-cyan-950/10 border border-cyan-500/10 relative overflow-hidden h-[240px]">
              <div className="absolute top-2 left-3 flex items-center gap-1.5 font-mono text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" /> PLAYER HAND
              </div>
              
              {playerCards.length > 0 && (
                <div className="absolute top-2 right-3 font-mono text-xs font-black px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  Total: {calculateHandScore(playerCards)}
                </div>
              )}

              <div className="flex gap-2 justify-center items-center mt-2">
                <AnimatePresence>
                  {playerCards.map((card, idx) => (
                    <motion.div
                      key={card.id}
                      initial={{ opacity: 0, y: -40, rotate: -15, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
                      transition={{ type: "spring", damping: 12 }}
                      className="w-16 sm:w-20 aspect-[2.5/3.5] bg-slate-900 border-2 border-cyan-500/30 rounded-xl shadow-xl flex flex-col justify-between p-2 relative overflow-hidden"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-sans font-black text-sm text-white">{card.value}</span>
                        <span className={`text-base ${getSuitColor(card.suit)}`}>{getSuitSymbol(card.suit)}</span>
                      </div>
                      <div className="text-center">
                        <span className={`text-2xl ${getSuitColor(card.suit)} filter drop-shadow-[0_0_4px_rgba(255,255,255,0.15)]`}>
                          {getSuitSymbol(card.suit)}
                        </span>
                      </div>
                      <div className="flex justify-between items-end rotate-180">
                        <span className="font-sans font-black text-sm text-white">{card.value}</span>
                        <span className={`text-base ${getSuitColor(card.suit)}`}>{getSuitSymbol(card.suit)}</span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {playerCards.length === 0 && (
                  <div className="text-slate-600 text-xs font-mono select-none uppercase tracking-widest text-center animate-pulse">
                    Awaiting Deal
                  </div>
                )}
              </div>
            </div>

            {/* Banker Hand Section */}
            <div className="flex flex-col items-center justify-center space-y-4 p-4 rounded-2xl bg-rose-950/10 border border-rose-500/10 relative overflow-hidden h-[240px]">
              <div className="absolute top-2 left-3 flex items-center gap-1.5 font-mono text-[10px] font-bold text-rose-400 uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" /> BANKER HAND
              </div>
              
              {bankerCards.length > 0 && (
                <div className="absolute top-2 right-3 font-mono text-xs font-black px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400">
                  Total: {calculateHandScore(bankerCards)}
                </div>
              )}

              <div className="flex gap-2 justify-center items-center mt-2">
                <AnimatePresence>
                  {bankerCards.map((card, idx) => (
                    <motion.div
                      key={card.id}
                      initial={{ opacity: 0, y: -40, rotate: 15, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
                      transition={{ type: "spring", damping: 12 }}
                      className="w-16 sm:w-20 aspect-[2.5/3.5] bg-slate-900 border-2 border-rose-500/30 rounded-xl shadow-xl flex flex-col justify-between p-2 relative overflow-hidden"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-sans font-black text-sm text-white">{card.value}</span>
                        <span className={`text-base ${getSuitColor(card.suit)}`}>{getSuitSymbol(card.suit)}</span>
                      </div>
                      <div className="text-center">
                        <span className={`text-2xl ${getSuitColor(card.suit)} filter drop-shadow-[0_0_4px_rgba(255,255,255,0.15)]`}>
                          {getSuitSymbol(card.suit)}
                        </span>
                      </div>
                      <div className="flex justify-between items-end rotate-180">
                        <span className="font-sans font-black text-sm text-white">{card.value}</span>
                        <span className={`text-base ${getSuitColor(card.suit)}`}>{getSuitSymbol(card.suit)}</span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {bankerCards.length === 0 && (
                  <div className="text-slate-600 text-xs font-mono select-none uppercase tracking-widest text-center animate-pulse">
                    Awaiting Deal
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Interactive Baccarat Felt Betting Zones */}
          <div className="grid grid-cols-3 gap-3 p-2 bg-slate-950/60 rounded-2xl border border-white/[0.01]">
            {/* Player Zone */}
            <button
              disabled={isDealing}
              onClick={() => handlePlaceBet("player")}
              className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-1.5 group cursor-pointer transition-all ${
                bets.player > 0
                  ? "bg-cyan-950/40 border-cyan-400 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                  : "bg-slate-900/60 border-white/[0.02] hover:border-cyan-500/40 text-slate-400 hover:text-cyan-400"
              }`}
            >
              <span className="text-[10px] font-mono font-black uppercase tracking-widest text-slate-500 group-hover:text-cyan-400">
                PLAYER PAYS 1:1
              </span>
              {bets.player > 0 && (
                <div className="h-6 px-2.5 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center font-mono text-[10px] font-black animate-bounce shadow-md">
                  ${bets.player}
                </div>
              )}
              {bets.player === 0 && <span className="text-[11px] font-mono opacity-60">Tap to Bet</span>}
            </button>

            {/* Tie Zone */}
            <button
              disabled={isDealing}
              onClick={() => handlePlaceBet("tie")}
              className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-1.5 group cursor-pointer transition-all ${
                bets.tie > 0
                  ? "bg-amber-950/40 border-amber-400 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                  : "bg-slate-900/60 border-white/[0.02] hover:border-amber-500/40 text-slate-400 hover:text-amber-400"
              }`}
            >
              <span className="text-[10px] font-mono font-black uppercase tracking-widest text-slate-500 group-hover:text-amber-400">
                TIE PAYS 8:1
              </span>
              {bets.tie > 0 && (
                <div className="h-6 px-2.5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-mono text-[10px] font-black animate-bounce shadow-md">
                  ${bets.tie}
                </div>
              )}
              {bets.tie === 0 && <span className="text-[11px] font-mono opacity-60">Tap to Bet</span>}
            </button>

            {/* Banker Zone */}
            <button
              disabled={isDealing}
              onClick={() => handlePlaceBet("banker")}
              className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-1.5 group cursor-pointer transition-all ${
                bets.banker > 0
                  ? "bg-rose-950/40 border-rose-400 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                  : "bg-slate-900/60 border-white/[0.02] hover:border-rose-500/40 text-slate-400 hover:text-rose-400"
              }`}
            >
              <span className="text-[10px] font-mono font-black uppercase tracking-widest text-slate-500 group-hover:text-rose-400">
                BANKER PAYS 0.95:1
              </span>
              {bets.banker > 0 && (
                <div className="h-6 px-2.5 rounded-full bg-rose-500 text-slate-950 flex items-center justify-center font-mono text-[10px] font-black animate-bounce shadow-md">
                  ${bets.banker}
                </div>
              )}
              {bets.banker === 0 && <span className="text-[11px] font-mono opacity-60">Tap to Bet</span>}
            </button>
          </div>
        </div>

        {/* Right Side Control Interface */}
        <div className="lg:col-span-4 flex flex-col justify-between p-5 bg-slate-900/40 border border-white/[0.02] rounded-3xl space-y-4">
          <div className="space-y-4">
            
            {/* Live Bead Road Board */}
            <div className="space-y-2">
              <label className="block text-[10px] uppercase font-mono tracking-widest text-slate-400 font-extrabold flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-slate-400" /> BACCARAT BEAD ROAD
              </label>
              <div className="grid grid-cols-6 gap-1 bg-slate-950 p-2.5 rounded-xl border border-white/[0.02]">
                {history.map((char, index) => (
                  <div
                    key={index}
                    className={`aspect-square rounded-lg flex items-center justify-center font-mono text-[11px] font-black text-white ${
                      char === "P"
                        ? "bg-cyan-500/25 border border-cyan-500/50 text-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.2)]"
                        : char === "B"
                        ? "bg-rose-500/25 border border-rose-500/50 text-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.2)]"
                        : "bg-amber-500/25 border border-amber-500/50 text-amber-400 shadow-[0_0_6px_rgba(234,179,8,0.2)]"
                    }`}
                  >
                    {char}
                  </div>
                ))}
              </div>
            </div>

            {/* Chip Selection Panel */}
            <div className="space-y-2 pt-2">
              <label className="block text-[10px] uppercase font-mono tracking-widest text-slate-400 font-extrabold">
                BET VALUE VALUE
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[10, 50, 100, 500].map((amt) => {
                  const isActive = activeChip === amt;
                  return (
                    <button
                      key={amt}
                      onClick={() => {
                        casinoAudio.playClick();
                        setActiveChip(amt);
                      }}
                      className={`py-2 rounded-xl border font-mono text-[11px] font-black cursor-pointer transition-all ${
                        isActive
                          ? "bg-yellow-500 text-slate-950 border-yellow-400 shadow-[0_0_12px_rgba(234,179,8,0.3)]"
                          : "bg-slate-950 border-white/[0.02] text-slate-400 hover:text-white"
                      }`}
                    >
                      ${amt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Betting guidelines overview */}
            <div className="bg-slate-950/60 p-3 rounded-xl border border-white/[0.01] text-[9.5px] font-mono text-slate-500 leading-relaxed space-y-2">
              <span className="font-extrabold uppercase text-slate-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-slate-400" /> Baccarat Guidelines
              </span>
              <p>
                Dealer deals two initial cards to Player & Banker. Sum modulo 10 determines the score (8 or 9 is Natural). Player draws first if score is 0-5. Banker drawing logic dynamically responds to the player's third card. Tie wagers return full principal wagers on Player/Banker.
              </p>
            </div>

          </div>

          <div className="space-y-2.5">
            <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-white/[0.02]">
              <span className="text-[10px] font-mono text-slate-500 font-extrabold uppercase">TOTAL ACTIVE WAGER</span>
              <span className="text-sm font-mono font-black text-amber-400">${totalCurrentBet}</span>
            </div>

            <div className="flex gap-2">
              <button
                disabled={isDealing || totalCurrentBet === 0}
                onClick={handleClearBets}
                className="w-1/3 py-3 bg-slate-900 hover:bg-slate-850 border border-white/[0.02] text-slate-400 hover:text-white rounded-xl font-mono text-xs font-bold uppercase transition-all cursor-pointer active:scale-95 disabled:opacity-30"
              >
                Clear
              </button>

              <button
                disabled={isDealing || totalCurrentBet === 0}
                onClick={handleDeal}
                className="flex-1 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 font-sans font-black text-xs rounded-xl shadow-lg shadow-amber-950/40 cursor-pointer transition-all active:scale-95 disabled:opacity-40 uppercase tracking-widest"
              >
                {isDealing ? "Dealing..." : "Deal Cards"}
              </button>
            </div>

            {isDealing && (
              <div className="text-center">
                <span className="text-[9px] font-mono text-amber-500 animate-pulse uppercase tracking-widest">
                  {dealStage}
                </span>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
