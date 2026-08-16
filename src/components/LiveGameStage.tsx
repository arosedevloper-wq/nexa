import React, { useState, useEffect } from "react";
import { 
  Zap, 
  Sparkles, 
  ArrowLeft, 
  Radio, 
  Coins, 
  Award, 
  Flame, 
  RotateCcw,
  Volume2,
  VolumeX,
  Tv,
  HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../lib/audioService";
import { evaluateLiveGameRound, GLOBAL_LIVE_GAME_CONFIG } from "../constants/liveGameConfig";

interface LiveGameStageProps {
  gameId: string;
  gameName: string;
  chips: number;
  onBack?: () => void;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest?: (type: any) => void;
  rtpBias?: any;
  forcedOutcome?: any;
  onClearForcedOutcome?: () => void;
}

export const LiveGameStage: React.FC<LiveGameStageProps> = ({
  gameId,
  gameName,
  chips,
  onBack,
  onWin,
  onLose,
}) => {
  const [betAmount, setBetAmount] = useState<number>(50);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [lastWinAmount, setLastWinAmount] = useState<number>(0);
  
  // Game-specific interactive state
  const [selectedBetType, setSelectedBetType] = useState<string>("standard");
  const [lightningNumber, setLightningNumber] = useState<number | null>(null);
  const [lightningMultiplier, setLightningMultiplier] = useState<number>(50);
  const [crazyWheelSegment, setCrazyWheelSegment] = useState<string | null>(null);
  const [megaBallMultiplier, setMegaBallMultiplier] = useState<number>(10);
  const [squeezeCardState, setSqueezeCardState] = useState<"hidden" | "squeezing" | "revealed">("hidden");
  const [dealerCards, setDealerCards] = useState<number[]>([]);
  const [playerCards, setPlayerCards] = useState<number[]>([]);

  // Audio helper
  const playClick = () => casinoAudio.playClick();

  // Core execution engine implementing the 97% House Edge / 3% User Win Ratio
  const handlePlayRound = () => {
    if (chips < betAmount) {
      alert("Insufficient chips! Deposit or claim Vance loan to keep playing.");
      return;
    }

    playClick();
    setIsPlaying(true);
    setResultMessage(null);
    setLastWinAmount(0);
    casinoAudio.playWheelSpin(0.5);

    // Evaluate global 3% user win / 97% house edge
    const isWin = evaluateLiveGameRound();

    setTimeout(() => {
      setIsPlaying(false);

      if (gameId.includes("lightning") || gameId.includes("roulette")) {
        const luckyNum = Math.floor(Math.random() * 37);
        const mults = [50, 100, 200, 500];
        const mult = mults[Math.floor(Math.random() * mults.length)];
        setLightningNumber(luckyNum);
        setLightningMultiplier(mult);

        if (isWin) {
          casinoAudio.playWin();
          const win = betAmount * (mult / 10);
          setLastWinAmount(win);
          onWin(win, `Lightning Strike Win on #${luckyNum} (${mult}x)!`);
          setResultMessage(`⚡ LIGHTNING STRIKE WIN! Lucky #${luckyNum} hit with a ${mult}x multiplier! Won $${win}!`);
        } else {
          casinoAudio.playLose();
          onLose(betAmount, `Lightning Roulette loss on #${luckyNum}.`);
          setResultMessage(`⚡ Ball landed on #${luckyNum}. House won this spin. (3% Player Win Ratio Active)`);
        }
      } 
      else if (gameId.includes("crazy") || gameId.includes("time")) {
        const segments = ["1", "2", "5", "10", "PACHINKO", "CASH HUNT", "COIN FLIP", "CRAZY TIME"];
        const chosen = isWin ? "CRAZY TIME" : segments[Math.floor(Math.random() * 4)];
        setCrazyWheelSegment(chosen);

        if (isWin) {
          casinoAudio.playWin();
          const win = betAmount * 25;
          setLastWinAmount(win);
          onWin(win, `Crazy Time Bonus World (${chosen})!`);
          setResultMessage(`🎡 CRAZY TIME WORLD HIT! Wheel landed on ${chosen}! Won $${win}!`);
        } else {
          casinoAudio.playLose();
          onLose(betAmount, `Crazy Time wheel landed on segment ${chosen}.`);
          setResultMessage(`🎡 Wheel stopped on segment ${chosen}. House wins the round.`);
        }
      }
      else if (gameId.includes("blackjack")) {
        const p1 = Math.floor(Math.random() * 10) + 1;
        const p2 = Math.floor(Math.random() * 10) + 1;
        const pSum = p1 + p2;
        setPlayerCards([p1, p2]);

        if (isWin) {
          casinoAudio.playWin();
          setDealerCards([10, 6]);
          const win = Math.floor(betAmount * 2.5);
          setLastWinAmount(win);
          onWin(win, `VIP Live Blackjack Win (${pSum} vs Dealer Bust)!`);
          setResultMessage(`🃏 VIP BLACKJACK WIN! You had ${pSum} vs Dealer Bust! Won $${win}!`);
        } else {
          casinoAudio.playLose();
          setDealerCards([10, 10]); // Dealer 20
          onLose(betAmount, `Live Blackjack loss against Dealer 20.`);
          setResultMessage(`🃏 Dealer drew 20. Your hand was beat by the VIP dealer.`);
        }
      }
      else if (gameId.includes("mega") || gameId.includes("ball")) {
        const mult = [10, 25, 50, 100, 500][Math.floor(Math.random() * 5)];
        setMegaBallMultiplier(mult);

        if (isWin) {
          casinoAudio.playWin();
          const win = betAmount * mult;
          setLastWinAmount(win);
          onWin(win, `Mega Ball Draw Complete (${mult}x Multiplier)!`);
          setResultMessage(`🎱 MEGA BALL MULTIPLIER HIT! Drawn ball triggered ${mult}x! Won $${win}!`);
        } else {
          casinoAudio.playLose();
          onLose(betAmount, `Mega Ball card missed line combinations.`);
          setResultMessage(`🎱 Drawn Mega Ball: 2x. Card did not hit winning lines.`);
        }
      }
      else if (gameId.includes("baccarat")) {
        setSqueezeCardState("revealed");

        if (isWin) {
          casinoAudio.playWin();
          const win = Math.floor(betAmount * 2);
          setLastWinAmount(win);
          onWin(win, `Live Baccarat Squeeze Natural 9 Win!`);
          setResultMessage(`👑 SQUEEZE REVEALED NATURAL 9! Player hand won! Won $${win}!`);
        } else {
          casinoAudio.playLose();
          onLose(betAmount, `Baccarat Banker hand won.`);
          setResultMessage(`👑 Card Squeezed: Banker hand won with 8. House takes the chips.`);
        }
      }
      else {
        // Fallback for any generic live stream title
        if (isWin) {
          casinoAudio.playWin();
          const win = Math.floor(betAmount * 2.5);
          setLastWinAmount(win);
          onWin(win, `Live Stream Win on ${gameName}!`);
          setResultMessage(`🎥 LIVE STREAM WIN! Authorized payout $${win}!`);
        } else {
          casinoAudio.playLose();
          onLose(betAmount, `Live Stream round loss on ${gameName}.`);
          setResultMessage(`🎥 Live stream round concluded. House took the hand.`);
        }
      }
    }, 1500);
  };

  return (
    <div className="space-y-4 font-mono">
      
      {/* Top Navigation & Live Stream Indicator Header */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/90 border border-slate-800 flex items-center justify-between shadow-xl">
        <button
          onClick={() => {
            playClick();
            onBack();
          }}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-rose-900/80 to-amber-900/80 hover:from-rose-800 hover:to-amber-800 text-xs font-black text-amber-200 border border-rose-500/30 transition-all cursor-pointer min-h-[44px] min-w-[44px] touch-manipulation select-none active:scale-95 shadow-md"
          id="live-stage-exit-btn"
        >
          <ArrowLeft className="h-4 w-4 text-amber-400 stroke-[3]" />
          <span>Exit to Lobby</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600" />
          </span>
          <span className="text-[10px] font-black tracking-widest text-rose-500 uppercase">
            LIVE 4K FEED
          </span>
        </div>
      </div>

      {/* Main 4K Virtual Live Video Stage Container */}
      <div className="relative rounded-3xl border-2 border-cyan-500/30 bg-slate-950 overflow-hidden shadow-2xl min-h-[320px] sm:min-h-[380px] flex flex-col justify-between p-4 sm:p-6">
        
        {/* Background Live Studio Stream Simulation */}
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-indigo-950/40 to-slate-950 pointer-events-none" />
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Live Studio Header Badge & Global RTP Notice */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]">
              <Tv className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                {gameName} <Sparkles className="h-4 w-4 text-cyan-400 animate-pulse" />
              </h2>
              <span className="text-[9px] text-slate-400 flex items-center gap-1">
                <Radio className="h-2.5 w-2.5 text-rose-500 animate-pulse" /> Live Vegas Studio 04
              </span>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 px-2.5 py-1 rounded-xl text-[9px] font-bold text-slate-400 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>VIP ENCRYPTED FEED</span>
          </div>
        </div>

        {/* Dynamic Interactive Stage Display */}
        <div className="relative z-10 my-6 text-center flex flex-col items-center justify-center">
          
          {isPlaying ? (
            <motion.div 
              animate={{ rotate: 360 }} 
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="h-20 w-20 sm:h-24 sm:w-24 rounded-full border-4 border-cyan-400 border-t-transparent flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.6)]"
            >
              <Zap className="h-10 w-10 text-cyan-400 animate-pulse" />
            </motion.div>
          ) : (
            <div className="space-y-3 max-w-md w-full">
              
              {/* Lightning Roulette Visual */}
              {gameId.includes("lightning") && (
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/40 shadow-xl">
                  <span className="text-[10px] text-amber-400 uppercase font-black tracking-widest block mb-2">
                    ⚡ ELECTRIFIED STRIKE TARGET
                  </span>
                  <div className="text-4xl font-black text-amber-300 drop-shadow-[0_0_15px_rgba(245,158,11,0.8)]">
                    {lightningNumber !== null ? `#${lightningNumber}` : "LUCKY NUMBER"}
                  </div>
                  {lightningMultiplier && (
                    <span className="inline-block mt-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-black text-xs border border-amber-400/40 animate-pulse">
                      {lightningMultiplier}x STRIKE MULTIPLIER
                    </span>
                  )}
                </div>
              )}

              {/* Crazy Time Wheel Visual */}
              {gameId.includes("crazy") && (
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-fuchsia-500/40 shadow-xl">
                  <span className="text-[10px] text-fuchsia-400 uppercase font-black tracking-widest block mb-2">
                    🎡 CRAZY TIME WHEEL SEGMENT
                  </span>
                  <div className="text-3xl font-black text-fuchsia-300 drop-shadow-[0_0_15px_rgba(217,70,239,0.8)]">
                    {crazyWheelSegment || "READY TO SPIN"}
                  </div>
                </div>
              )}

              {/* Live Blackjack Visual */}
              {gameId.includes("blackjack") && (
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/40 shadow-xl">
                  <span className="text-[10px] text-emerald-400 uppercase font-black tracking-widest block mb-2">
                    🃏 VIP INFINITE DEALER FELT
                  </span>
                  <p className="text-xs text-slate-300">
                    {playerCards.length > 0 ? `Your Hand: ${playerCards.join(" + ")} | Dealer: ${dealerCards.join(" + ")}` : "Place your bet to deal live cards"}
                  </p>
                </div>
              )}

              {/* Mega Ball Visual */}
              {gameId.includes("mega") && (
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-cyan-500/40 shadow-xl">
                  <span className="text-[10px] text-cyan-400 uppercase font-black tracking-widest block mb-2">
                    🎱 MEGA BALL GLASS SPHERE DRAW
                  </span>
                  <div className="text-2xl font-black text-cyan-300">
                    {megaBallMultiplier}x MULTIPLIER BALL
                  </div>
                </div>
              )}

              {/* Baccarat Squeeze Visual */}
              {gameId.includes("baccarat") && (
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-rose-500/40 shadow-xl">
                  <span className="text-[10px] text-rose-400 uppercase font-black tracking-widest block mb-2">
                    👑 SLOW CAMERA CARD SQUEEZE
                  </span>
                  <p className="text-xs text-slate-300">
                    {squeezeCardState === "revealed" ? "Squeezed Card: Natural 9 Revealed!" : "Place chip wager to initiate card squeeze"}
                  </p>
                </div>
              )}

              {/* Generic Live Stream visual fallback */}
              {!gameId.includes("lightning") && !gameId.includes("crazy") && !gameId.includes("blackjack") && !gameId.includes("mega") && !gameId.includes("baccarat") && (
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-cyan-500/40 shadow-xl">
                  <span className="text-[10px] text-cyan-400 uppercase font-black tracking-widest block mb-2">
                    🎥 LIVE STREAM STUDIO
                  </span>
                  <p className="text-xs text-slate-300">
                    Connected to 4K Live Dealer Studio feed.
                  </p>
                </div>
              )}

            </div>
          )}

          {/* Result Display Banner */}
          <AnimatePresence>
            {resultMessage && !isPlaying && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`mt-4 p-3.5 rounded-2xl text-xs font-black w-full max-w-md ${
                  lastWinAmount > 0 
                    ? "bg-emerald-950/90 text-emerald-400 border border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                    : "bg-rose-950/90 text-rose-400 border border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.4)]"
                }`}
              >
                {resultMessage}
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Betting Controls & Launch Trigger */}
        <div className="relative z-10 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
          
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <Coins className="h-3.5 w-3.5 text-amber-400" /> SELECT CHIP STACK
            </span>
            <div className="flex gap-1.5">
              {[10, 25, 50, 100, 250, 500].map((amt) => (
                <button
                  key={amt}
                  onClick={() => {
                    playClick();
                    setBetAmount(amt);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                    betAmount === amt
                      ? "bg-cyan-500 text-slate-950 font-black shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                      : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  ${amt}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handlePlayRound}
            disabled={isPlaying}
            className="w-full py-3.5 bg-gradient-to-r from-cyan-500 via-indigo-600 to-fuchsia-600 hover:from-cyan-400 hover:to-fuchsia-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.5)] active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isPlaying ? "CONNECTING TO LIVE DEALER..." : `PLACE LIVE BET ($${betAmount})`}
          </button>

        </div>

      </div>

    </div>
  );
};
