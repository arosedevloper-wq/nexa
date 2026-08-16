import React, { useState, useEffect } from "react";
import { Play, ShieldCheck, RefreshCw, AlertTriangle, Sparkles, Coins, ArrowRight } from "lucide-react";
import { Card } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../lib/audioService";
import { evaluateLiveGameRound } from "../constants/liveGameConfig";

interface BlackjackGameProps {
  chips: number;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest: (type: "greet" | "win" | "lose" | "strategy") => void;
  rtpBias?: "standard" | "loose" | "tight" | "rigged" | "custom";
  forcedOutcome?: "none" | "jackpot" | "lose";
  onClearForcedOutcome?: () => void;
}

const SUITS = [
  { name: "hearts", char: "♥", color: "text-rose-500 border-rose-500/25 bg-rose-500/5" },
  { name: "diamonds", char: "♦", color: "text-rose-500 border-rose-500/25 bg-rose-500/5" },
  { name: "spades", char: "♠", color: "text-indigo-400 border-indigo-500/25 bg-indigo-500/5" },
  { name: "clubs", char: "♣", color: "text-indigo-400 border-indigo-500/25 bg-indigo-500/5" },
 ] as const;

const VALUES = [
  { name: "2", val: 2 },
  { name: "3", val: 3 },
  { name: "4", val: 4 },
  { name: "5", val: 5 },
  { name: "6", val: 6 },
  { name: "7", val: 7 },
  { name: "8", val: 8 },
  { name: "9", val: 9 },
  { name: "10", val: 10 },
  { name: "J", val: 10 },
  { name: "Q", val: 10 },
  { name: "K", val: 10 },
  { name: "A", val: 11 },
];

function generateDeck(): Card[] {
  const deck: Card[] = [];
  for (let s = 0; s < 4; s++) {
    for (let v = 0; v < VALUES.length; v++) {
      deck.push({
        id: `${SUITS[s].name}-${VALUES[v].name}-${Math.random().toString(36).substr(2, 4)}`,
        suit: SUITS[s].name,
        value: VALUES[v].name,
        score: VALUES[v].val,
      });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

function calculateHandScore(hand: Card[]): number {
  let score = 0;
  let acesCount = 0;
  for (const card of hand) {
    if (card.hidden) continue;
    score += card.score;
    if (card.value === "A") acesCount++;
  }
  while (score > 21 && acesCount > 0) {
    score -= 10;
    acesCount--;
  }
  return score;
}

export default function BlackjackGame({ chips, onWin, onLose, onCommentaryRequest, rtpBias, forcedOutcome, onClearForcedOutcome }: BlackjackGameProps) {
  const [deck, setDeck] = useState<Card[]>([]);
  const [bet, setBet] = useState(25);
  const [activeBet, setActiveBet] = useState(0);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [gameStage, setGameStage] = useState<"betting" | "player-turn" | "dealer-turn" | "ended">("betting");
  const [outcomeMessage, setOutcomeMessage] = useState("");
  const [stats, setStats] = useState({ handsPlayed: 0, dealerWins: 0, playerWins: 0, pushes: 0 });

  useEffect(() => {
    setDeck(generateDeck());
    onCommentaryRequest("greet");
  }, []);

  const drawCard = (currentDeck: Card[], isPlayer: boolean = true): [Card, Card[]] => {
    let deckCopy = [...currentDeck];
    if (deckCopy.length < 10) {
      deckCopy = generateDeck();
    }

    if (rtpBias === "rigged" && isPlayer) {
      const pCurrentScore = calculateHandScore(playerHand);
      if (pCurrentScore >= 12) {
        // Find a card that busts the player
        const bustIdx = deckCopy.findIndex(c => pCurrentScore + c.score > 21);
        if (bustIdx !== -1) {
          const card = deckCopy.splice(bustIdx, 1)[0];
          return [card, deckCopy];
        }
      }
    } else if (rtpBias === "loose" && !isPlayer) {
      const dCurrentScore = calculateHandScore(dealerHand.map(c => ({ ...c, hidden: false })));
      if (dCurrentScore >= 12) {
        // Find a card that busts the dealer
        const bustIdx = deckCopy.findIndex(c => dCurrentScore + c.score > 21);
        if (bustIdx !== -1) {
          const card = deckCopy.splice(bustIdx, 1)[0];
          return [card, deckCopy];
        }
      }
    } else if (rtpBias === "custom") {
      const customRatio = Number(localStorage.getItem("casino_custom_win_ratio")) || 50;
      const isPlayerWinner = Math.random() * 100 < customRatio;

      if (isPlayer) {
        const pCurrentScore = calculateHandScore(playerHand);
        if (pCurrentScore >= 12) {
          if (!isPlayerWinner) {
            const bustIdx = deckCopy.findIndex(c => pCurrentScore + c.score > 21);
            if (bustIdx !== -1) {
              const card = deckCopy.splice(bustIdx, 1)[0];
              return [card, deckCopy];
            }
          } else {
            const safeIdx = deckCopy.findIndex(c => pCurrentScore + c.score <= 21);
            if (safeIdx !== -1) {
              const card = deckCopy.splice(safeIdx, 1)[0];
              return [card, deckCopy];
            }
          }
        }
      } else {
        const dCurrentScore = calculateHandScore(dealerHand.map(c => ({ ...c, hidden: false })));
        if (dCurrentScore >= 12) {
          if (isPlayerWinner) {
            const bustIdx = deckCopy.findIndex(c => dCurrentScore + c.score > 21);
            if (bustIdx !== -1) {
              const card = deckCopy.splice(bustIdx, 1)[0];
              return [card, deckCopy];
            }
          } else {
            const safeIdx = deckCopy.findIndex(c => dCurrentScore + c.score <= 21);
            if (safeIdx !== -1) {
              const card = deckCopy.splice(safeIdx, 1)[0];
              return [card, deckCopy];
            }
          }
        }
      }
    }

    const card = deckCopy.pop()!;
    return [card, deckCopy];
  };

  const handleStartRound = () => {
    if (chips < bet) {
      onCommentaryRequest("lose");
      return;
    }

    casinoAudio.playCardShuffle();
    setStats(prev => ({ ...prev, handsPlayed: prev.handsPlayed + 1 }));
    setOutcomeMessage("");
    setActiveBet(bet);
    onLose(bet, `Placed $${bet} Blackjack Bet`);

    let currentDeck = deck.length > 10 ? [...deck] : generateDeck();
    let p1: Card, d1: Card, p2: Card, d2: Card;

    if (forcedOutcome === "jackpot") {
      // Find Ace and Jack/10 for Player
      const aceIdx = currentDeck.findIndex(c => c.value === "A");
      const aceCard = aceIdx !== -1 ? currentDeck.splice(aceIdx, 1)[0] : currentDeck.pop()!;
      
      const tenIdx = currentDeck.findIndex(c => c.score === 10);
      const tenCard = tenIdx !== -1 ? currentDeck.splice(tenIdx, 1)[0] : currentDeck.pop()!;

      p1 = aceCard;
      p2 = tenCard;

      // Give dealer standard low card
      const lowIdx = currentDeck.findIndex(c => c.score <= 6);
      d1 = lowIdx !== -1 ? currentDeck.splice(lowIdx, 1)[0] : currentDeck.pop()!;
      d2 = { ...currentDeck.pop()!, hidden: true };

      if (onClearForcedOutcome) onClearForcedOutcome();
    } else if (forcedOutcome === "lose") {
      // Give player raw 15 (e.g. 5 and 10)
      const fiveIdx = currentDeck.findIndex(c => c.score === 5);
      const fiveCard = fiveIdx !== -1 ? currentDeck.splice(fiveIdx, 1)[0] : currentDeck.pop()!;

      const tenIdx = currentDeck.findIndex(c => c.score === 10);
      const tenCard = tenIdx !== -1 ? currentDeck.splice(tenIdx, 1)[0] : currentDeck.pop()!;

      p1 = fiveCard;
      p2 = tenCard;

      // Give dealer 20 (e.g. two 10s)
      const dTen1Idx = currentDeck.findIndex(c => c.score === 10);
      const dTen1 = dTen1Idx !== -1 ? currentDeck.splice(dTen1Idx, 1)[0] : currentDeck.pop()!;

      const dTen2Idx = currentDeck.findIndex(c => c.score === 10);
      const dTen2 = dTen2Idx !== -1 ? currentDeck.splice(dTen2Idx, 1)[0] : currentDeck.pop()!;

      d1 = dTen1;
      d2 = { ...dTen2, hidden: true };

      if (onClearForcedOutcome) onClearForcedOutcome();
    } else {
      const isWinner = evaluateLiveGameRound();

      if (isWinner) {
        // Give player a 20 (two 10s)
        const pTen1Idx = currentDeck.findIndex(c => c.score === 10);
        const pTen1 = pTen1Idx !== -1 ? currentDeck.splice(pTen1Idx, 1)[0] : currentDeck.pop()!;
        const pTen2Idx = currentDeck.findIndex(c => c.score === 10);
        const pTen2 = pTen2Idx !== -1 ? currentDeck.splice(pTen2Idx, 1)[0] : currentDeck.pop()!;
        p1 = pTen1;
        p2 = pTen2;

        // Give dealer a raw 15 (5 and 10)
        const dFiveIdx = currentDeck.findIndex(c => c.score === 5);
        const dFive = dFiveIdx !== -1 ? currentDeck.splice(dFiveIdx, 1)[0] : currentDeck.pop()!;
        const dTenIdx = currentDeck.findIndex(c => c.score === 10);
        const dTen = dTenIdx !== -1 ? currentDeck.splice(dTenIdx, 1)[0] : currentDeck.pop()!;
        d1 = dFive;
        d2 = { ...dTen, hidden: true };
      } else {
        // Give player a raw 15 (5 and 10)
        const pFiveIdx = currentDeck.findIndex(c => c.score === 5);
        const pFive = pFiveIdx !== -1 ? currentDeck.splice(pFiveIdx, 1)[0] : currentDeck.pop()!;
        const pTenIdx = currentDeck.findIndex(c => c.score === 10);
        const pTen = pTenIdx !== -1 ? currentDeck.splice(pTenIdx, 1)[0] : currentDeck.pop()!;
        p1 = pFive;
        p2 = pTen;

        // Give dealer a 20 (two 10s)
        const dTen1Idx = currentDeck.findIndex(c => c.score === 10);
        const dTen1 = dTen1Idx !== -1 ? currentDeck.splice(dTen1Idx, 1)[0] : currentDeck.pop()!;
        const dTen2Idx = currentDeck.findIndex(c => c.score === 10);
        const dTen2 = dTen2Idx !== -1 ? currentDeck.splice(dTen2Idx, 1)[0] : currentDeck.pop()!;
        d1 = dTen1;
        d2 = { ...dTen2, hidden: true };
      }
    }

    setPlayerHand([p1, p2]);
    setDealerHand([d1, d2]);
    setDeck(currentDeck);

    const pScore = calculateHandScore([p1, p2]);
    const dScore = calculateHandScore([d1, { ...d2, hidden: false }]);

    if (pScore === 21) {
      setDealerHand([d1, { ...d2, hidden: false }]);
      if (dScore === 21) {
        handleEndGame("push", "Both have Blackjack! Push standoff.");
      } else {
        handleEndGame("blackjack", "Natural Blackjack! Paid 3 to 2.");
      }
    } else {
      setGameStage("player-turn");
    }
  };

  const handleHit = () => {
    if (gameStage !== "player-turn") return;

    casinoAudio.playCardShuffle();
    const [card, nextDeck] = drawCard(deck);
    const updatedHand = [...playerHand, card];
    setPlayerHand(updatedHand);
    setDeck(nextDeck);

    const score = calculateHandScore(updatedHand);
    if (score > 21) {
      handleEndGame("player-bust", "Busted! You went over 21.");
    }
  };

  const handleDoubleDown = () => {
    if (gameStage !== "player-turn") return;
    if (chips < activeBet) return;

    casinoAudio.playCardShuffle();
    onLose(activeBet, `Doubled Down for extra $${activeBet}`);
    const nextBetValue = activeBet * 2;
    setActiveBet(nextBetValue);

    const [card, nextDeck] = drawCard(deck);
    const updatedHand = [...playerHand, card];
    setPlayerHand(updatedHand);
    setDeck(nextDeck);

    const score = calculateHandScore(updatedHand);
    if (score > 21) {
      handleEndGame("player-bust", "Busted on Double Down! Went over 21.");
    } else {
      runDealerTurn(updatedHand, nextDeck, nextBetValue);
    }
  };

  const handleStand = () => {
    if (gameStage !== "player-turn") return;
    casinoAudio.playClick();
    runDealerTurn(playerHand, deck, activeBet);
  };

  const runDealerTurn = (currentPlayerHand: Card[], currentDeck: Card[], currentRoundBet: number) => {
    setGameStage("dealer-turn");

    let revealedDealerHand: Card[] = dealerHand.map(c => ({ ...c, hidden: false }));
    setDealerHand(revealedDealerHand);

    let dScore = calculateHandScore(revealedDealerHand);
    const pScore = calculateHandScore(currentPlayerHand);
    let workingDeck = [...currentDeck];

    const interval = setInterval(() => {
      if (dScore >= 17) {
        clearInterval(interval);
        if (dScore > 21) {
          handleEndGame("dealer-bust", "Dealer busts! You win this round.", currentRoundBet);
        } else if (dScore > pScore) {
          handleEndGame("dealer-win", "Dealer wins. Better luck next hand!", currentRoundBet);
        } else if (pScore > dScore) {
          handleEndGame("player-win", "You beat the dealer! Chips credited.", currentRoundBet);
        } else {
          handleEndGame("push", "Standoff! Both players tie.", currentRoundBet);
        }
        return;
      }

      casinoAudio.playCardShuffle();
      const [card, nextDeck] = drawCard(workingDeck, false);
      revealedDealerHand = [...revealedDealerHand, card];
      workingDeck = nextDeck;
      dScore = calculateHandScore(revealedDealerHand);

      setDealerHand(revealedDealerHand);
      setDeck(workingDeck);
    }, 700);
  };

  const handleEndGame = (result: "blackjack" | "player-win" | "dealer-win" | "player-bust" | "dealer-bust" | "push", message: string, finalBet = activeBet) => {
    setGameStage("ended");
    setOutcomeMessage(message);

    if (result === "blackjack") {
      const winnings = Math.floor(finalBet * 2.5);
      onWin(winnings, `Won $${winnings} with Natural Blackjack!`);
      setStats(prev => ({ ...prev, playerWins: prev.playerWins + 1 }));
      onCommentaryRequest("win");
    } else if (result === "player-win" || result === "dealer-bust") {
      const winnings = finalBet * 2;
      onWin(winnings, `Won $${winnings} on Blackjack hand`);
      setStats(prev => ({ ...prev, playerWins: prev.playerWins + 1 }));
      onCommentaryRequest("win");
    } else if (result === "push") {
      onWin(finalBet, `Blackjack Hand Push (Refunded $${finalBet})`);
      setStats(prev => ({ ...prev, pushes: prev.pushes + 1 }));
      onCommentaryRequest("strategy");
    } else {
      setStats(prev => ({ ...prev, dealerWins: prev.dealerWins + 1 }));
      onCommentaryRequest("lose");
    }
  };

  const getSuitSymbol = (suit: string) => {
    const s = SUITS.find((x) => x.name === suit);
    return s ? s.char : "?";
  };

  const getSuitClass = (suit: string) => {
    const s = SUITS.find((x) => x.name === suit);
    return s ? s.color : "";
  };

  const pScore = calculateHandScore(playerHand);
  const dScore = calculateHandScore(dealerHand);

  return (
    <div id="blackjack-game-container" className="flex flex-col gap-6 p-4 sm:p-6 rounded-3xl border border-slate-900 bg-slate-950/80 backdrop-blur-xl relative overflow-hidden shadow-2xl glow-fuchsia">
      
      {/* Decorative luxury indigo-fuchsia status top rail */}
      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-fuchsia-500 via-purple-600 to-indigo-600 shadow-[0_2px_15px_rgba(217,70,239,0.5)]" />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/[0.04] pb-4">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-fuchsia-400 font-bold block mb-0.5 font-mono">👑 HIGH LIMIT VELVET TABLE</span>
          <h3 className="font-mono text-xl font-black text-white flex items-center gap-2 tracking-tight">
            <ShieldCheck className="h-5.5 w-5.5 text-fuchsia-400" /> VIP Vegas Blackjack
          </h3>
        </div>
        <div className="flex items-center gap-4 bg-slate-950/60 border border-white/[0.03] rounded-2xl px-4 py-2 font-mono text-xs w-full sm:w-auto justify-between sm:justify-start">
          <div className="text-slate-500">
            Wins: <span className="text-fuchsia-400 font-bold">{stats.playerWins}</span>
          </div>
          <div className="h-4 w-px bg-white/[0.06]" />
          <div className="text-slate-500">
            Dealer: <span className="text-slate-300 font-bold">{stats.dealerWins}</span>
          </div>
          <div className="h-4 w-px bg-white/[0.06]" />
          <div className="text-slate-500">
            Push: <span className="text-slate-300 font-bold">{stats.pushes}</span>
          </div>
        </div>
      </div>

      {/* Main velvet floor zone containing dealer / player cards */}
      <div className="flex flex-col gap-7 py-6 px-4 md:px-6 bg-gradient-to-b from-indigo-950/20 to-slate-950/90 rounded-3xl border border-white/[0.02] shadow-[inset_0_4px_30px_rgba(0,0,0,0.8)] relative min-h-[320px] justify-center">
        
        {/* Dealer Zone */}
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" /> DEALER BOARD
            </span>
            {dealerHand.length > 0 && (
              <span className="text-xs font-mono px-3 py-1 bg-slate-950 border border-white/[0.04] rounded-xl text-slate-300 font-bold shadow-md">
                Score: {dScore}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-3.5 p-4 bg-slate-950/40 rounded-2xl border border-white/[0.02] min-h-[130px] items-center">
            {dealerHand.length === 0 ? (
              <p className="text-xs text-slate-500 font-mono italic mx-auto">Dealer is ready. Buy in below.</p>
            ) : (
              <AnimatePresence>
                {dealerHand.map((card, idx) => (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, scale: 0.8, y: -20, rotate: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
                    transition={{ duration: 0.25, delay: idx * 0.12 }}
                    className={`relative h-28 w-20 md:h-32 md:w-22 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border-2 shadow-2xl flex flex-col justify-between p-3 select-none hover:-translate-y-2 hover:rotate-2 transition-all cursor-pointer ${
                      card.hidden ? "border-fuchsia-500/50 bg-gradient-to-br from-indigo-950 via-slate-950 to-fuchsia-950/90" : `border-white/10 ${getSuitClass(card.suit)}`
                    }`}
                  >
                    {card.hidden ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                        <div className="text-3xl font-black text-fuchsia-500 drop-shadow-[0_0_10px_rgba(217,70,239,0.5)] animate-pulse">👑</div>
                        <span className="text-[8px] uppercase font-mono tracking-widest text-fuchsia-400 font-bold mt-2">Vance VIP</span>
                      </div>
                    ) : (
                      <>
                        <div className="text-sm font-extrabold font-mono text-left leading-none tracking-tight">
                          {card.value}
                        </div>
                        <div className="text-3xl md:text-4xl self-center leading-none filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]">
                          {getSuitSymbol(card.suit)}
                        </div>
                        <div className="text-sm font-extrabold font-mono text-right leading-none rotate-180 tracking-tight">
                          {card.value}
                        </div>
                      </>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Player Zone */}
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-500 animate-pulse" /> PLAYER HAND
            </span>
            {playerHand.length > 0 && (
              <span className={`text-xs font-mono px-3 py-1 rounded-xl border font-bold shadow-md ${pScore > 21 ? "bg-rose-950/50 border-rose-500/30 text-rose-400" : "bg-slate-950 border-white/[0.04] text-fuchsia-400"}`}>
                Score: {pScore} {pScore === 21 && "✨ NATURAL"}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-3.5 p-4 bg-slate-950/40 rounded-2xl border border-white/[0.02] min-h-[130px] items-center">
            {playerHand.length === 0 ? (
              <p className="text-xs text-slate-500 font-mono italic mx-auto">Set wager amount to begin.</p>
            ) : (
              <AnimatePresence>
                {playerHand.map((card, idx) => (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, scale: 0.8, y: 20, rotate: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
                    transition={{ duration: 0.25, delay: idx * 0.12 }}
                    className={`relative h-28 w-20 md:h-32 md:w-22 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-white/10 shadow-2xl flex flex-col justify-between p-3 select-none hover:-translate-y-2 hover:rotate-1 transition-all cursor-pointer ${getSuitClass(
                      card.suit
                    )}`}
                  >
                    <div className="text-sm font-extrabold font-mono text-left leading-none tracking-tight">
                      {card.value}
                    </div>
                    <div className="text-3xl md:text-4xl self-center leading-none filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]">
                      {getSuitSymbol(card.suit)}
                    </div>
                    <div className="text-sm font-extrabold font-mono text-right leading-none rotate-180 tracking-tight">
                      {card.value}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Dealer Shuffling loading overlay */}
        {gameStage === "dealer-turn" && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center rounded-3xl z-30">
            <RefreshCw className="h-8 w-8 text-fuchsia-400 animate-spin" />
            <span className="text-xs text-slate-300 font-mono mt-2.5 font-bold tracking-widest">DEALER DRAWING...</span>
          </div>
        )}
      </div>

      {/* Control console panel */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-5 bg-slate-950/60 border border-white/[0.03] p-5 rounded-2xl shadow-inner">
        {gameStage === "betting" ? (
          <>
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold flex items-center gap-1">
                <Coins className="h-3.5 w-3.5 text-fuchsia-400" /> SELECT PLAY BET
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[10, 25, 50, 100, 500].map((betValue) => (
                  <button
                    key={betValue}
                    onClick={() => {
                      casinoAudio.playChipClink();
                      setBet(betValue);
                    }}
                    className={`px-4 py-2 font-mono text-xs rounded-xl border transition-all duration-250 cursor-pointer active:scale-95 ${
                      bet === betValue
                        ? "bg-fuchsia-600 border-fuchsia-500 text-white font-extrabold shadow-[0_0_15px_rgba(217,70,239,0.35)]"
                        : "bg-slate-900/90 border-white/[0.03] text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    ${betValue}
                  </button>
                ))}
              </div>
            </div>

            <button
              id="btn-deal-blackjack"
              onClick={handleStartRound}
              disabled={chips < bet}
              className={`w-full sm:w-44 py-3.5 px-6 rounded-2xl text-xs font-mono font-black tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 ${
                chips < bet
                  ? "bg-rose-950/40 text-rose-500 border border-rose-500/30 font-bold"
                  : "bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-white hover:shadow-[0_0_20px_rgba(217,70,239,0.4)]"
              }`}
            >
              <Play className="h-4 w-4 fill-current" /> DEAL CHIPS (${bet})
            </button>
          </>
        ) : (
          <>
            <div className="text-left font-mono">
              <span className="text-[9px] uppercase text-slate-500 font-bold block mb-0.5">CURRENT PLAYING BET</span>
              <span className="text-base text-fuchsia-400 font-black tracking-tight">${activeBet} Chips</span>
            </div>

            <div className="flex gap-2.5 w-full sm:w-auto">
              {gameStage === "player-turn" && (
                <>
                  <button
                    id="btn-blackjack-hit"
                    onClick={handleHit}
                    className="flex-1 sm:flex-none px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-xs font-mono font-bold text-white rounded-xl transition-all cursor-pointer active:scale-95"
                  >
                    Hit
                  </button>
                  <button
                    id="btn-blackjack-double"
                    onClick={handleDoubleDown}
                    disabled={chips < activeBet}
                    className={`flex-1 sm:flex-none px-5 py-3 border text-xs font-mono font-bold rounded-xl transition-all cursor-pointer active:scale-95 ${
                      chips < activeBet
                        ? "bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed"
                        : "bg-amber-400 hover:bg-amber-300 border-amber-300 text-slate-950"
                    }`}
                  >
                    Double
                  </button>
                  <button
                    id="btn-blackjack-stand"
                    onClick={handleStand}
                    className="flex-1 sm:flex-none px-6 py-3 bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold text-slate-300 rounded-xl transition-all cursor-pointer active:scale-95"
                  >
                    Stand
                  </button>
                </>
              )}

              {gameStage === "ended" && (
                <button
                  id="btn-blackjack-reset"
                  onClick={() => setGameStage("betting")}
                  className="w-full sm:w-48 py-3.5 px-6 bg-fuchsia-600 hover:bg-fuchsia-500 text-xs font-mono font-black tracking-widest text-white rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 hover:shadow-[0_0_15px_rgba(217,70,239,0.3)] animate-pulse"
                >
                  <RefreshCw className="h-4 w-4" /> PLAY NEXT HAND
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Outcome Banner Overlay */}
      <AnimatePresence>
        {outcomeMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`p-5 rounded-2xl border text-center font-mono shadow-2xl ${
              outcomeMessage.includes("win") || outcomeMessage.includes("Paid") || outcomeMessage.includes("beat") || outcomeMessage.includes("busts")
                ? "bg-emerald-950/50 border-emerald-500/30 text-emerald-300 glow-emerald"
                : outcomeMessage.includes("push") || outcomeMessage.includes("Push") || outcomeMessage.includes("tie")
                ? "bg-slate-950/80 border-slate-900 text-slate-300"
                : "bg-rose-950/50 border-rose-500/30 text-rose-300"
            }`}
          >
            <div className="flex flex-col items-center gap-1 relative z-10">
              <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">ROUND RESULT</span>
              <span className="text-base font-black tracking-tight">{outcomeMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

