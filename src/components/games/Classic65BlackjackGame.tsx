import React, { useState } from "react";
import { Coins, Play, RotateCcw, ShieldCheck, Sparkles, Award, Layers } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../../lib/audioService";

interface Classic65BlackjackGameProps {
  chips: number;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest?: (type: "greet" | "win" | "lose") => void;
  rtpBias?: string;
}

interface Card {
  suit: "♠" | "♥" | "♦" | "♣";
  value: string;
  numericValue: number;
}

const SUITS: ("♠" | "♥" | "♦" | "♣")[] = ["♠", "♥", "♦", "♣"];
const VALUES = [
  { str: "2", val: 2 }, { str: "3", val: 3 }, { str: "4", val: 4 },
  { str: "5", val: 5 }, { str: "6", val: 6 }, { str: "7", val: 7 },
  { str: "8", val: 8 }, { str: "9", val: 9 }, { str: "10", val: 10 },
  { str: "J", val: 10 }, { str: "Q", val: 10 }, { str: "K", val: 10 },
  { str: "A", val: 11 },
];

export const Classic65BlackjackGame: React.FC<Classic65BlackjackGameProps> = ({
  chips,
  onWin,
  onLose,
  onCommentaryRequest,
  rtpBias,
}) => {
  const [bet, setBet] = useState<number>(50);
  const [selectedChip, setSelectedChip] = useState<number>(25);

  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [gameState, setGameState] = useState<"IDLE" | "PLAYING" | "DEALER_TURN" | "ENDED">("IDLE");
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [insuranceBet, setInsuranceBet] = useState<number>(0);

  const chipValues = [10, 25, 50, 100, 250, 500];

  const drawCard = (): Card => {
    const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
    const valObj = VALUES[Math.floor(Math.random() * VALUES.length)];
    return { suit, value: valObj.str, numericValue: valObj.val };
  };

  const calculateScore = (hand: Card[]) => {
    let score = hand.reduce((acc, card) => acc + card.numericValue, 0);
    let aces = hand.filter((card) => card.value === "A").length;
    while (score > 21 && aces > 0) {
      score -= 10;
      aces--;
    }
    const isSoft = hand.some((c) => c.value === "A") && score <= 21 && (score + 10 <= 21);
    return { score, isSoft };
  };

  const startDeal = () => {
    if (chips < bet || gameState === "PLAYING" || gameState === "DEALER_TURN") {
      casinoAudio.playLose();
      return;
    }

    casinoAudio.playChipClink();
    onLose(bet, `Classic 6:5 Blackjack Bet ($${bet})`);

    const p1 = drawCard();
    const d1 = drawCard();
    const p2 = drawCard();
    const d2 = drawCard();

    const initialPlayerHand = [p1, p2];
    const initialDealerHand = [d1, d2];

    setPlayerHand(initialPlayerHand);
    setDealerHand(initialDealerHand);
    setGameState("PLAYING");
    setGameResult(null);
    setInsuranceBet(0);

    // Check Player Natural 6:5 Blackjack (6:5 payout = 1.2x bet profit + 1x bet return = 2.2x total)
    const pScore = calculateScore(initialPlayerHand).score;
    const dScore = calculateScore(initialDealerHand).score;

    if (pScore === 21) {
      if (dScore === 21) {
        setGameState("ENDED");
        setGameResult("PUSH - BOTH BLACKJACK");
        onWin(bet, `Blackjack Push Return ($${bet})`);
      } else {
        setGameState("ENDED");
        const bjPayout = Math.floor(bet + bet * 1.2); // 6:5 Blackjack Payout
        setGameResult(`BLACKJACK! (6:5 Payout: +$${Math.floor(bet * 1.2)})`);
        casinoAudio.playJackpot();
        onWin(bjPayout, `6:5 Blackjack Natural Win -> $${bjPayout}`);
      }
    }
  };

  const hit = () => {
    if (gameState !== "PLAYING") return;
    casinoAudio.playChipClink();

    const newHand = [...playerHand, drawCard()];
    setPlayerHand(newHand);

    const { score } = calculateScore(newHand);
    if (score > 21) {
      setGameState("ENDED");
      setGameResult("BUST! YOU EXCEEDED 21");
      casinoAudio.playLose();
    }
  };

  const stand = async () => {
    if (gameState !== "PLAYING") return;
    setGameState("DEALER_TURN");

    let currentDealer = [...dealerHand];
    let dCalc = calculateScore(currentDealer);

    // Dealer AI: Hits on Soft 17 or any score < 17
    while (dCalc.score < 17 || (dCalc.score === 17 && dCalc.isSoft)) {
      casinoAudio.playWheelSpin(0.05);
      await new Promise((r) => setTimeout(r, 600));
      currentDealer.push(drawCard());
      dCalc = calculateScore(currentDealer);
      setDealerHand([...currentDealer]);
    }

    const pScore = calculateScore(playerHand).score;
    const finalDealerScore = dCalc.score;

    setGameState("ENDED");

    if (finalDealerScore > 21) {
      const winPayout = bet * 2;
      setGameResult("DEALER BUSTED! YOU WIN!");
      casinoAudio.playWin();
      onWin(winPayout, `Blackjack Win vs Dealer Bust -> $${winPayout}`);
    } else if (pScore > finalDealerScore) {
      const winPayout = bet * 2;
      setGameResult(`YOU WIN! (${pScore} vs ${finalDealerScore})`);
      casinoAudio.playWin();
      onWin(winPayout, `Blackjack Win (${pScore} vs ${finalDealerScore}) -> $${winPayout}`);
    } else if (pScore === finalDealerScore) {
      setGameResult(`PUSH! DRAW (${pScore} vs ${finalDealerScore})`);
      onWin(bet, `Blackjack Push Return ($${bet})`);
    } else {
      setGameResult(`DEALER WINS (${finalDealerScore} vs ${pScore})`);
      casinoAudio.playLose();
    }
  };

  const doubleDown = () => {
    if (gameState !== "PLAYING" || playerHand.length !== 2) return;
    if (chips < bet) {
      casinoAudio.playLose();
      return;
    }

    casinoAudio.playChipClink();
    onLose(bet, `Blackjack Double Down ($${bet})`);
    setBet((prev) => prev * 2);

    const newHand = [...playerHand, drawCard()];
    setPlayerHand(newHand);

    const { score } = calculateScore(newHand);
    if (score > 21) {
      setGameState("ENDED");
      setGameResult("DOUBLE DOWN BUST!");
      casinoAudio.playLose();
    } else {
      setTimeout(() => stand(), 400);
    }
  };

  const buyInsurance = () => {
    const cost = Math.floor(bet / 2);
    if (chips < cost || insuranceBet > 0) return;

    casinoAudio.playChipClink();
    onLose(cost, `Blackjack Insurance Bet ($${cost})`);
    setInsuranceBet(cost);
  };

  const pCalc = calculateScore(playerHand);
  const dCalc = calculateScore(dealerHand);

  return (
    <div className="w-full max-w-5xl mx-auto bg-slate-950 border border-emerald-500/30 rounded-2xl p-4 sm:p-6 text-white shadow-2xl relative overflow-hidden backdrop-blur-xl">
      {/* Background Atmosphere */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-gradient-to-b from-emerald-600/15 via-teal-950/20 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800/80 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Award className="w-6 h-6 text-white stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-wide bg-gradient-to-r from-emerald-300 via-teal-200 to-amber-200 bg-clip-text text-transparent">
                CLASSIC 6:5 BLACKJACK
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-full uppercase tracking-wider">
                DEALER HITS SOFT 17
              </span>
            </div>
            <p className="text-xs text-slate-400">Authentic 6:5 payout ratio • Insurance • Double Down • Dealer hits soft 17</p>
          </div>
        </div>

        {/* Balance Display */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-emerald-500/30 px-4 py-2 rounded-xl shadow-inner">
          <Coins className="w-5 h-5 text-amber-400" />
          <span className="text-xs text-slate-400 font-medium">Balance:</span>
          <span className="text-base font-bold text-amber-300">${chips.toLocaleString()}</span>
        </div>
      </div>

      {/* Felt Table Surface */}
      <div className="bg-emerald-950/40 border-2 border-emerald-700/60 p-6 rounded-2xl mb-6 shadow-2xl flex flex-col gap-6 relative">
        {/* Dealer Hand Area */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-slate-400">DEALER'S HAND</span>
            {gameState !== "IDLE" && (
              <span className="bg-slate-900 border border-emerald-500/40 text-emerald-300 text-xs px-2 py-0.5 rounded-full font-bold">
                {gameState === "PLAYING" ? `${dealerHand[0]?.numericValue || 0} + ?` : `${dCalc.score}`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 min-h-[96px]">
            {dealerHand.map((card, idx) => {
              const isHidden = gameState === "PLAYING" && idx === 1;
              return (
                <motion.div
                  key={idx}
                  initial={{ scale: 0.8, y: -20 }}
                  animate={{ scale: 1, y: 0 }}
                  className={`w-16 h-24 rounded-xl border-2 flex flex-col justify-between p-2 font-black shadow-lg ${
                    isHidden
                      ? "bg-gradient-to-br from-slate-900 to-slate-950 border-emerald-500/40 text-slate-600"
                      : card.suit === "♥" || card.suit === "♦"
                      ? "bg-slate-950 border-slate-700 text-red-500"
                      : "bg-slate-950 border-slate-700 text-white"
                  }`}
                >
                  {isHidden ? (
                    <div className="m-auto text-xl">❓</div>
                  ) : (
                    <>
                      <div className="text-xs">{card.value}</div>
                      <div className="text-2xl text-center">{card.suit}</div>
                      <div className="text-xs text-right">{card.value}</div>
                    </>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Game Banner Status */}
        {gameResult && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mx-auto bg-slate-900/95 border-2 border-amber-400 px-6 py-2.5 rounded-2xl text-sm font-black text-amber-300 shadow-2xl flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-400" /> {gameResult}
          </motion.div>
        )}

        {/* Player Hand Area */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-slate-400">YOUR HAND</span>
            {playerHand.length > 0 && (
              <span className="bg-slate-900 border border-amber-400/40 text-amber-300 text-xs px-2.5 py-0.5 rounded-full font-bold">
                SCORE: {pCalc.score} {pCalc.isSoft && "(SOFT)"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 min-h-[96px]">
            {playerHand.map((card, idx) => (
              <motion.div
                key={idx}
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className={`w-16 h-24 rounded-xl border-2 flex flex-col justify-between p-2 font-black shadow-lg ${
                  card.suit === "♥" || card.suit === "♦"
                    ? "bg-slate-950 border-slate-700 text-red-500"
                    : "bg-slate-950 border-slate-700 text-white"
                }`}
              >
                <div className="text-xs">{card.value}</div>
                <div className="text-2xl text-center">{card.suit}</div>
                <div className="text-xs text-right">{card.value}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Betting Controls & Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">BET:</span>
          <input
            type="number"
            disabled={gameState === "PLAYING" || gameState === "DEALER_TURN"}
            value={bet}
            onChange={(e) => setBet(Math.max(0.10, Math.min(5000, Number(e.target.value))))}
            className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-amber-300 font-bold text-sm outline-none"
          />
          {chipValues.map((val) => (
            <button
              key={val}
              disabled={gameState === "PLAYING" || gameState === "DEALER_TURN"}
              onClick={() => setBet(val)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border ${
                bet === val ? "bg-emerald-500/20 border-emerald-500 text-emerald-300" : "bg-slate-950 border-slate-800 text-slate-400"
              }`}
            >
              ${val}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {gameState === "IDLE" || gameState === "ENDED" ? (
            <button
              onClick={startDeal}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-black text-sm bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 text-slate-950 shadow-emerald-500/30 hover:from-emerald-300 transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5 fill-slate-950" /> DEAL CARDS (${bet})
            </button>
          ) : (
            <>
              <button
                onClick={hit}
                className="px-5 py-3 rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-all"
              >
                HIT
              </button>
              <button
                onClick={stand}
                className="px-5 py-3 rounded-xl font-black text-xs bg-amber-600 hover:bg-amber-500 text-white shadow-lg transition-all"
              >
                STAND
              </button>
              {playerHand.length === 2 && (
                <button
                  onClick={doubleDown}
                  className="px-5 py-3 rounded-xl font-black text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition-all"
                >
                  DOUBLE DOWN
                </button>
              )}
              {dealerHand[0]?.value === "A" && insuranceBet === 0 && (
                <button
                  onClick={buyInsurance}
                  className="px-4 py-3 rounded-xl font-bold text-xs bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700"
                >
                  INSURANCE (${Math.floor(bet / 2)})
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Classic65BlackjackGame;
