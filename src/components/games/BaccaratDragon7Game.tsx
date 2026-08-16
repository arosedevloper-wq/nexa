import React, { useState, useEffect } from "react";
import { Coins, Play, RotateCcw, Sparkles, Trophy, ShieldAlert, Award, Layers } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../../lib/audioService";
import { evaluateLiveGameRound } from "../../constants/liveGameConfig";

interface BaccaratDragon7GameProps {
  chips: number;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest?: (type: "greet" | "win" | "lose") => void;
  rtpBias?: string;
}

interface Card {
  suit: "♠" | "♥" | "♦" | "♣";
  value: string;
  score: number;
  color: "red" | "black";
}

const SUITS: ("♠" | "♥" | "♦" | "♣")[] = ["♠", "♥", "♦", "♣"];
const VALUES = [
  { val: "A", score: 1 },
  { val: "2", score: 2 },
  { val: "3", score: 3 },
  { val: "4", score: 4 },
  { val: "5", score: 5 },
  { val: "6", score: 6 },
  { val: "7", score: 7 },
  { val: "8", score: 8 },
  { val: "9", score: 9 },
  { val: "10", score: 0 },
  { val: "J", score: 0 },
  { val: "Q", score: 0 },
  { val: "K", score: 0 },
];

export const BaccaratDragon7Game: React.FC<BaccaratDragon7GameProps> = ({
  chips,
  onWin,
  onLose,
  onCommentaryRequest,
  rtpBias,
}) => {
  const [selectedChip, setSelectedChip] = useState<number>(25);
  const [bets, setBets] = useState<{ [spot: string]: number }>({});
  const [isDealing, setIsDealing] = useState<boolean>(false);

  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [bankerCards, setBankerCards] = useState<Card[]>([]);
  const [playerTotal, setPlayerTotal] = useState<number | null>(null);
  const [bankerTotal, setBankerTotal] = useState<number | null>(null);

  const [winner, setWinner] = useState<"PLAYER" | "BANKER" | "TIE" | null>(null);
  const [isDragon7Won, setIsDragon7Won] = useState<boolean>(false);
  const [history, setHistory] = useState<("P" | "B" | "T" | "D7")[]>([]);
  const [lastWinAmount, setLastWinAmount] = useState<number | null>(null);

  const chipValues = [5, 25, 50, 100, 500];

  const totalBetAmount = (Object.values(bets) as number[]).reduce((a: number, b: number) => a + b, 0);

  const getRandomCard = (): Card => {
    const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
    const valObj = VALUES[Math.floor(Math.random() * VALUES.length)];
    const color = suit === "♥" || suit === "♦" ? "red" : "black";
    return { suit, value: valObj.val, score: valObj.score, color };
  };

  const calcHandTotal = (cards: Card[]): number => {
    const sum = cards.reduce((acc, c) => acc + c.score, 0);
    return sum % 10;
  };

  const placeBet = (spot: string) => {
    if (isDealing) return;
    if (chips < totalBetAmount + selectedChip) {
      casinoAudio.playLose();
      return;
    }
    casinoAudio.playChipClink();
    setBets((prev) => ({
      ...prev,
      [spot]: (prev[spot] || 0) + selectedChip,
    }));
  };

  const clearBets = () => {
    if (isDealing) return;
    setBets({});
  };

  const dealHand = async () => {
    if (isDealing || totalBetAmount === 0) return;

    if (chips < totalBetAmount) {
      casinoAudio.playLose();
      return;
    }

    casinoAudio.playChipClink();
    onLose(totalBetAmount, `Baccarat Dragon 7 Bet ($${totalBetAmount})`);

    setIsDealing(true);
    setPlayerCards([]);
    setBankerCards([]);
    setPlayerTotal(null);
    setBankerTotal(null);
    setWinner(null);
    setIsDragon7Won(false);
    setLastWinAmount(null);

    // Initial 2 cards each
    const p1 = getRandomCard();
    const b1 = getRandomCard();
    const p2 = getRandomCard();
    const b2 = getRandomCard();

    casinoAudio.playCardFlip();
    setPlayerCards([p1]);
    await new Promise((res) => setTimeout(res, 300));

    casinoAudio.playCardFlip();
    setBankerCards([b1]);
    await new Promise((res) => setTimeout(res, 300));

    casinoAudio.playCardFlip();
    setPlayerCards([p1, p2]);
    await new Promise((res) => setTimeout(res, 300));

    casinoAudio.playCardFlip();
    const bHand = [b1, b2];
    setBankerCards(bHand);
    await new Promise((res) => setTimeout(res, 400));

    let pTotal = calcHandTotal([p1, p2]);
    let bTotal = calcHandTotal(bHand);

    setPlayerTotal(pTotal);
    setBankerTotal(bTotal);

    let pFinalCards = [p1, p2];
    let bFinalCards = [...bHand];

    // Check Naturals (8 or 9)
    if (pTotal >= 8 || bTotal >= 8) {
      // Natural outcome, no 3rd cards drawn
    } else {
      // Player 3rd Card Rule
      let p3rdCard: Card | null = null;
      if (pTotal <= 5) {
        casinoAudio.playCardFlip();
        p3rdCard = getRandomCard();
        pFinalCards.push(p3rdCard);
        setPlayerCards([...pFinalCards]);
        pTotal = calcHandTotal(pFinalCards);
        setPlayerTotal(pTotal);
        await new Promise((res) => setTimeout(res, 400));
      }

      // Banker 3rd Card Rule
      let bankerDraws = false;
      if (!p3rdCard) {
        if (bTotal <= 5) bankerDraws = true;
      } else {
        const p3Val = p3rdCard.score;
        if (bTotal <= 2) bankerDraws = true;
        else if (bTotal === 3 && p3Val !== 8) bankerDraws = true;
        else if (bTotal === 4 && p3Val >= 2 && p3Val <= 7) bankerDraws = true;
        else if (bTotal === 5 && p3Val >= 4 && p3Val <= 7) bankerDraws = true;
        else if (bTotal === 6 && (p3Val === 6 || p3Val === 7)) bankerDraws = true;
      }

      if (bankerDraws) {
        casinoAudio.playCardFlip();
        const b3rdCard = getRandomCard();
        bFinalCards.push(b3rdCard);
        setBankerCards([...bFinalCards]);
        bTotal = calcHandTotal(bFinalCards);
        setBankerTotal(bTotal);
        await new Promise((res) => setTimeout(res, 400));
      }
    }

    // Determine Winner
    let result: "PLAYER" | "BANKER" | "TIE" = "TIE";
    if (pTotal > bTotal) result = "PLAYER";
    else if (bTotal > pTotal) result = "BANKER";

    const isWinAllowed = evaluateLiveGameRound(undefined, rtpBias);
    if (!isWinAllowed) {
      const pBet = Number(bets["PLAYER"]) || 0;
      const bBet = Number(bets["BANKER"]) || 0;
      if (pBet > bBet) result = "BANKER";
      else if (bBet > pBet) result = "PLAYER";
    }

    setWinner(result);

    // Check Dragon 7 Condition: Banker wins with 3 cards AND total == 7
    const d7Condition = result === "BANKER" && bFinalCards.length === 3 && bTotal === 7;
    setIsDragon7Won(d7Condition);

    // Update History Ribbon
    const histTag = d7Condition ? "D7" : result === "PLAYER" ? "P" : result === "BANKER" ? "B" : "T";
    setHistory((prev) => [histTag, ...prev.slice(0, 9)]);

    // Evaluate Payouts
    let totalWin = 0;
    const playerBet = Number(bets["PLAYER"]) || 0;
    const bankerBet = Number(bets["BANKER"]) || 0;
    const tieBet = Number(bets["TIE"]) || 0;
    const dragon7Bet = Number(bets["DRAGON_7"]) || 0;

    if (result === "PLAYER" && playerBet > 0) {
      totalWin += playerBet * 2; // 1:1 + bet
    }
    if (result === "BANKER" && bankerBet > 0) {
      // 5% commission on Banker win -> 1.95x total payout
      totalWin += bankerBet * 1.95;
    }
    if (result === "TIE" && tieBet > 0) {
      totalWin += tieBet * 9; // 8:1 + bet
    }
    if (d7Condition && dragon7Bet > 0) {
      totalWin += dragon7Bet * 41; // 40:1 + bet
    }

    // Push back bets on Tie for Main Hands
    if (result === "TIE") {
      totalWin += playerBet + bankerBet;
    }

    const finalWin = Math.floor(totalWin);

    if (finalWin > 0) {
      casinoAudio.playWin();
      setLastWinAmount(finalWin);
      onWin(finalWin, `Baccarat Dragon 7 Win (${result}${d7Condition ? " DRAGON 7!" : ""}) -> $${finalWin}`);
    }

    setIsDealing(false);
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-slate-950 border border-amber-500/30 rounded-2xl p-4 sm:p-6 text-white shadow-2xl relative overflow-hidden backdrop-blur-xl">
      {/* Red Felt Atmosphere Glow */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-gradient-to-b from-red-600/15 via-amber-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800/80 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 via-amber-600 to-yellow-500 flex items-center justify-center shadow-lg shadow-red-600/20">
            <Award className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-wide bg-gradient-to-r from-red-400 via-amber-300 to-yellow-200 bg-clip-text text-transparent">
                BACCARAT DRAGON 7
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-full uppercase tracking-wider">
                DRAGON 7 SIDE BET 40:1 PAYOUT
              </span>
            </div>
            <p className="text-xs text-slate-400">Player, Banker, Tie & Dragon 7 (3-Card Banker 7 Payout)</p>
          </div>
        </div>

        {/* Balance Display */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-amber-500/30 px-4 py-2 rounded-xl shadow-inner">
          <Coins className="w-5 h-5 text-amber-400" />
          <span className="text-xs text-slate-400 font-medium">Balance:</span>
          <span className="text-base font-bold text-amber-300">${chips.toLocaleString()}</span>
        </div>
      </div>

      {/* Felt Dealing Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gradient-to-b from-red-950/40 to-slate-950 border border-red-900/40 p-4 sm:p-6 rounded-2xl mb-6 shadow-inner relative">
        {/* Player Hand */}
        <div className="flex flex-col items-center gap-3 border-r border-slate-800/80 pr-4">
          <div className="flex items-center justify-between w-full px-2">
            <span className="text-xs font-black text-blue-400 tracking-wider">PLAYER HAND</span>
            {playerTotal !== null && (
              <span className="text-sm font-black text-amber-300 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700">
                TOTAL: {playerTotal}
              </span>
            )}
          </div>
          <div className="flex gap-2 min-h-[96px] items-center">
            {playerCards.length === 0 ? (
              <div className="w-16 h-24 rounded-lg border-2 border-dashed border-slate-800 flex items-center justify-center text-slate-600 text-xs font-bold">
                PLAYER
              </div>
            ) : (
              playerCards.map((card, idx) => (
                <motion.div
                  key={idx}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-16 h-24 rounded-xl bg-slate-100 text-slate-950 border-2 border-slate-300 p-1.5 flex flex-col justify-between shadow-xl font-black text-sm relative"
                >
                  <span className={card.color === "red" ? "text-red-600" : "text-slate-900"}>
                    {card.value}{card.suit}
                  </span>
                  <span className={`text-2xl self-center ${card.color === "red" ? "text-red-600" : "text-slate-900"}`}>
                    {card.suit}
                  </span>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Banker Hand */}
        <div className="flex flex-col items-center gap-3 pl-4">
          <div className="flex items-center justify-between w-full px-2">
            <span className="text-xs font-black text-red-400 tracking-wider">BANKER HAND</span>
            {bankerTotal !== null && (
              <span className="text-sm font-black text-amber-300 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700">
                TOTAL: {bankerTotal}
              </span>
            )}
          </div>
          <div className="flex gap-2 min-h-[96px] items-center">
            {bankerCards.length === 0 ? (
              <div className="w-16 h-24 rounded-lg border-2 border-dashed border-slate-800 flex items-center justify-center text-slate-600 text-xs font-bold">
                BANKER
              </div>
            ) : (
              bankerCards.map((card, idx) => (
                <motion.div
                  key={idx}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-16 h-24 rounded-xl bg-slate-100 text-slate-950 border-2 border-slate-300 p-1.5 flex flex-col justify-between shadow-xl font-black text-sm relative"
                >
                  <span className={card.color === "red" ? "text-red-600" : "text-slate-900"}>
                    {card.value}{card.suit}
                  </span>
                  <span className={`text-2xl self-center ${card.color === "red" ? "text-red-600" : "text-slate-900"}`}>
                    {card.suit}
                  </span>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Winner Highlight Ribbon */}
        {winner && (
          <div className="col-span-1 md:col-span-2 mt-2 flex justify-center">
            <div className="bg-slate-950/90 border-2 border-amber-400 text-amber-300 px-6 py-2 rounded-xl text-center shadow-2xl backdrop-blur-md">
              <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mr-2">RESULT:</span>
              <span className="text-lg font-black text-amber-300">{winner} WIN!</span>
              {isDragon7Won && <span className="ml-3 font-black text-red-400 animate-pulse">🐉 DRAGON 7 40:1 HIT!</span>}
            </div>
          </div>
        )}
      </div>

      {/* Betting Controls & Felt Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Chip Selector */}
          <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
            <span className="text-xs font-bold text-slate-400">SELECT CHIP:</span>
            <div className="flex gap-2">
              {chipValues.map((val) => (
                <button
                  key={val}
                  onClick={() => setSelectedChip(val)}
                  className={`w-9 h-9 rounded-full text-xs font-black border flex items-center justify-center shadow-md transition-all ${
                    selectedChip === val
                      ? "bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 border-amber-300 scale-110"
                      : "bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  ${val}
                </button>
              ))}
            </div>
          </div>

          {/* History Ribbon */}
          <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-between gap-2 overflow-x-auto">
            <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">ROADMAP:</span>
            <div className="flex gap-1.5 overflow-x-auto">
              {history.map((h, idx) => (
                <span
                  key={idx}
                  className={`w-7 h-7 rounded-full text-xs font-black flex items-center justify-center border shadow ${
                    h === "D7"
                      ? "bg-red-600 border-yellow-300 text-yellow-200"
                      : h === "P"
                      ? "bg-blue-600 border-blue-400 text-white"
                      : h === "B"
                      ? "bg-red-700 border-red-500 text-white"
                      : "bg-emerald-600 border-emerald-400 text-white"
                  }`}
                >
                  {h}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Felt Betting Spots */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { id: "PLAYER", label: "PLAYER (1:1)", bg: "bg-blue-950/80 border-blue-600 text-blue-300" },
              { id: "TIE", label: "TIE (8:1)", bg: "bg-emerald-950/80 border-emerald-600 text-emerald-300" },
              { id: "BANKER", label: "BANKER (0.95:1)", bg: "bg-red-950/80 border-red-600 text-red-300" },
              { id: "DRAGON_7", label: "DRAGON 7 (40:1)", bg: "bg-amber-950/90 border-amber-500 text-amber-300 font-black" },
            ].map((spot) => (
              <button
                key={spot.id}
                disabled={isDealing}
                onClick={() => placeBet(spot.id)}
                className={`h-24 rounded-2xl border p-3 flex flex-col items-center justify-center relative transition-all ${
                  spot.bg
                } ${bets[spot.id] ? "ring-2 ring-amber-400" : ""}`}
              >
                <span className="text-xs font-extrabold text-center">{spot.label}</span>
                {bets[spot.id] && (
                  <span className="absolute top-2 right-2 bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow">
                    ${bets[spot.id]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between gap-4">
            <button
              disabled={isDealing || totalBetAmount === 0}
              onClick={clearBets}
              className="px-4 py-3.5 rounded-xl border border-slate-700 bg-slate-900 text-xs font-bold text-slate-400 hover:text-white disabled:opacity-40 transition-all flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" /> CLEAR BETS
            </button>

            <button
              disabled={isDealing || totalBetAmount === 0}
              onClick={dealHand}
              className={`flex-1 py-4 rounded-xl font-black text-slate-950 transition-all shadow-xl flex items-center justify-center gap-2 text-base tracking-wide ${
                isDealing || totalBetAmount === 0
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                  : "bg-gradient-to-r from-red-500 via-amber-400 to-yellow-400 hover:from-red-400 shadow-red-600/20 cursor-pointer"
              }`}
            >
              <Play className="w-5 h-5 fill-slate-950" />
              {isDealing ? "DEALING CARDS..." : `DEAL BACCARAT ($${totalBetAmount.toLocaleString()})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BaccaratDragon7Game;
