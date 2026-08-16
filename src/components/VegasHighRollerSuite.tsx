import React, { useState, useEffect, useRef } from "react";
import { Crown, Sparkles, Trophy, Play, ArrowRight, Zap, Star, Award, Layers, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { GameType } from "../types";
import { casinoAudio } from "../lib/audioService";
import { motion } from "motion/react";
import { CASINO_GAMES_CATALOG } from "../data/gamesList";

export interface HighRollerGame {
  id: GameType;
  title: string;
  subtitle: string;
  tagline: string;
  icon: string;
  maxMultiplier: string;
  minBet: number;
  jackpotPool: number;
  rtp: string;
  badge: string;
  category: "all" | "crash" | "slots" | "table" | "instant";
  gradient: string;
  glowColor: string;
  accentColor: string;
  artworkUrl: string;
  characterTag: string;
  recentWinner: { name: string; amount: number; multiplier: string };
  features: string[];
}

export const HIGH_ROLLER_GAMES: HighRollerGame[] = [
  {
    id: "plinko",
    title: "Vegas Golden Plinko 🔵",
    subtitle: "Diamond Peg Drop Matrix",
    tagline: "Release glowing high-value balls down 16 rows of high-stakes pegs.",
    icon: "🔵",
    maxMultiplier: "1,000x",
    minBet: 0.10,
    jackpotPool: 290000,
    rtp: "5.0% WIN (95.0% HOUSE)",
    badge: "⚡ 1,000X DROP",
    category: "instant",
    gradient: "from-purple-950/60 via-[#0B0E14] to-indigo-950/60",
    glowColor: "rgba(168, 85, 247, 0.5)",
    accentColor: "#A855F7",
    artworkUrl: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80",
    characterTag: "Diamond Peg Master",
    recentWinner: { name: "PlinkoMaster", amount: 110000, multiplier: "1000x Corner" },
    features: ["16-Row Deep Pyramid", "Auto Multi-Ball Drop", "Risk Level Tuning"],
  },
  {
    id: "chicken_dash",
    title: "Chicken & Frog Dash 🐔",
    subtitle: "Jungle Tile Obstacle Leap",
    tagline: "Dodge high-voltage obstacles and leap across multiplier tiles.",
    icon: "🐔",
    maxMultiplier: "250x",
    minBet: 0.10,
    jackpotPool: 220000,
    rtp: "5.0% WIN (95.0% HOUSE)",
    badge: "🐸 DASH MULTIPLIER",
    category: "instant",
    gradient: "from-amber-950/60 via-[#0B0E14] to-yellow-950/60",
    glowColor: "rgba(245, 158, 11, 0.5)",
    accentColor: "#FBBF24",
    artworkUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80",
    characterTag: "Jungle Gold Explorer",
    recentWinner: { name: "FrogLeaper", amount: 45000, multiplier: "32.0x" },
    features: ["Step-by-step Cashout", "Safety Shield", "Tile Predictor"],
  },
  {
    id: "crazy_time",
    title: "Crazy Time VIP Show 🪩",
    subtitle: "Spinning Wheel & Multipliers",
    tagline: "Gigantic spinning wheel with Stayin' Alive bonus rounds and Coin Flip features!",
    icon: "🪩",
    maxMultiplier: "10,000x",
    minBet: 0.10,
    jackpotPool: 980000,
    rtp: "5.0% WIN (95.0% HOUSE)",
    badge: "🪩 VIP WHEEL SHOW",
    category: "slots",
    gradient: "from-pink-950/60 via-[#0B0E14] to-purple-950/60",
    glowColor: "rgba(236, 72, 153, 0.5)",
    accentColor: "#F472B6",
    artworkUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80",
    characterTag: "VIP Live Host",
    recentWinner: { name: "FunkyKing", amount: 350000, multiplier: "2500x Bonus" },
    features: ["Cash Hunt Bonus", "Pachinko Wall", "Crazy Multiplier"],
  },
  {
    id: "super_ace",
    title: "Super Ace Deluxe ♠️",
    subtitle: "Golden Cards & Cascade Multipliers",
    tagline: "Golden Cards transform into Wild Locks with progressive elimination multipliers.",
    icon: "♠️",
    maxMultiplier: "2,500x",
    minBet: 0.10,
    jackpotPool: 620000,
    rtp: "5.0% WIN (95.0% HOUSE)",
    badge: "♠️ DELUXE CASCADES",
    category: "slots",
    gradient: "from-amber-950/60 via-[#0B0E14] to-yellow-950/60",
    glowColor: "rgba(251, 191, 36, 0.5)",
    accentColor: "#FCD34D",
    artworkUrl: "https://images.unsplash.com/photo-1511193311914-0346f16efe90?auto=format&fit=crop&w=800&q=80",
    characterTag: "Royal Velvet Ace",
    recentWinner: { name: "AceHighroller", amount: 180000, multiplier: "1200x" },
    features: ["Golden Card Lock", "Cascade Combos", "Free Spin Multiplier"],
  },
  {
    id: "magic_ace",
    title: "Magic Ace & Genie 🧞‍♂️",
    subtitle: "Genie Lamp Wilds & Free Spins",
    tagline: "Summon the Genie's lamp for wild bounty showdowns and free spin tempests.",
    icon: "🧞‍♂️",
    maxMultiplier: "3,000x",
    minBet: 0.10,
    jackpotPool: 710000,
    rtp: "5.0% WIN (95.0% HOUSE)",
    badge: "👑 MYTHIC MAGIC",
    category: "slots",
    gradient: "from-purple-950/60 via-[#0B0E14] to-indigo-950/60",
    glowColor: "rgba(168, 85, 247, 0.5)",
    accentColor: "#C084FC",
    artworkUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80",
    characterTag: "Genie Lamp Guardian",
    recentWinner: { name: "SultanSlots", amount: 210000, multiplier: "1500x" },
    features: ["Genie Lamp Wilds", "Anubis Wrath Spins", "Payline Boosters"],
  },
  {
    id: "boxing_king",
    title: "Boxing King KO 🥊",
    subtitle: "KO Combos & Championship Round",
    tagline: "Trigger KO combos, knockout championship belts, and heavy hit multipliers.",
    icon: "🥊",
    maxMultiplier: "1,500x",
    minBet: 0.10,
    jackpotPool: 490000,
    rtp: "5.0% WIN (95.0% HOUSE)",
    badge: "🥊 COMBAT KO",
    category: "slots",
    gradient: "from-red-950/60 via-[#0B0E14] to-rose-950/60",
    glowColor: "rgba(239, 68, 68, 0.5)",
    accentColor: "#F87171",
    artworkUrl: "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&w=800&q=80",
    characterTag: "Heavyweight Champion",
    recentWinner: { name: "KnockoutBoss", amount: 92000, multiplier: "450x" },
    features: ["KO Combo Counter", "Free Championship Round", "Belt Multipliers"],
  },
  {
    id: "teen_patti",
    title: "Teen Patti & Rummy VIP 🎴",
    subtitle: "3-Card Teen Patti & 13-Card Rummy",
    tagline: "Real 3-Card Teen Patti and 13-Card Rummy tables with smart bot dealers.",
    icon: "🎴",
    maxMultiplier: "30:1 Trail",
    minBet: 0.10,
    jackpotPool: 380000,
    rtp: "5.0% WIN (95.0% HOUSE)",
    badge: "🎴 DESI CARDS",
    category: "table",
    gradient: "from-emerald-950/60 via-[#0B0E14] to-teal-950/60",
    glowColor: "rgba(16, 185, 129, 0.5)",
    accentColor: "#34D399",
    artworkUrl: "https://images.unsplash.com/photo-1606167668584-78701c57f13d?auto=format&fit=crop&w=800&q=80",
    characterTag: "Royal Card Monarch",
    recentWinner: { name: "DesiKing99", amount: 140000, multiplier: "30:1 Trail" },
    features: ["Pure Sequence Bonus", "Live Bot Dealer", "Chaal / Blind Wagers"],
  },
  {
    id: "callbreak",
    title: "Callbreak Midnight ♠️",
    subtitle: "Trick-Taking Spade Strategy",
    tagline: "Bid your tricks accurately, leverage Spades trump cards, and claim the pot.",
    icon: "♠️",
    maxMultiplier: "20x Pot",
    minBet: 0.10,
    jackpotPool: 250000,
    rtp: "5.0% WIN (95.0% HOUSE)",
    badge: "♠️ TRICK TAKING",
    category: "table",
    gradient: "from-blue-950/60 via-[#0B0E14] to-indigo-950/60",
    glowColor: "rgba(59, 130, 246, 0.5)",
    accentColor: "#60A5FA",
    artworkUrl: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=800&q=80",
    characterTag: "Spade Strategist",
    recentWinner: { name: "CallbreakMaster", amount: 55000, multiplier: "18.0x" },
    features: ["Spades Trump System", "Trick Target Betting", "Instant Pot Payouts"],
  },
  {
    id: "dragon_tiger",
    title: "Dragon Tiger Duel 🐉",
    subtitle: "Dragon vs Tiger Showdown",
    tagline: "Dragon vs. Tiger two-card duel with Suited Tie side bets up to 50:1.",
    icon: "🐉",
    maxMultiplier: "50:1 Suited Tie",
    minBet: 0.10,
    jackpotPool: 510000,
    rtp: "5.0% WIN (95.0% HOUSE)",
    badge: "🐉 DRAGON TIGER",
    category: "table",
    gradient: "from-red-950/60 via-[#0B0E14] to-amber-950/60",
    glowColor: "rgba(239, 68, 68, 0.5)",
    accentColor: "#F87171",
    artworkUrl: "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=800&q=80",
    characterTag: "Dragon Master",
    recentWinner: { name: "TigerBet", amount: 185000, multiplier: "50:1 Suited Tie" },
    features: ["Fast 10s Rounds", "Roadmap Charts", "Big/Small Side Bets"],
  },
  {
    id: "baccarat_squeeze",
    title: "Baccarat Squeeze VIP 👑",
    subtitle: "Classic High Stakes Squeeze",
    tagline: "Slow-squeeze high stakes cards with 0.95:1 Banker and 8:1 Tie odds.",
    icon: "👑",
    maxMultiplier: "8:1 Tie",
    minBet: 0.10,
    jackpotPool: 820000,
    rtp: "5.0% WIN (95.0% HOUSE)",
    badge: "👑 VIP SQUEEZE",
    category: "table",
    gradient: "from-amber-950/60 via-[#0B0E14] to-yellow-950/60",
    glowColor: "rgba(255, 215, 0, 0.5)",
    accentColor: "#FFD700",
    artworkUrl: "https://images.unsplash.com/photo-1508807526345-15e9b5f4eaff?auto=format&fit=crop&w=800&q=80",
    characterTag: "VIP Baccarat Croupier",
    recentWinner: { name: "SultanBaccarat", amount: 320000, multiplier: "8:1 Tie" },
    features: ["Interactive Squeeze", "Dragon Bonus", "VIP Private Salon"],
  },
  {
    id: "sic_bo",
    title: "Sic Bo Ruby Dice 🎲",
    subtitle: "Triple Dice & 7 Up 7 Down",
    tagline: "Roll three dice for 180:1 Triple multipliers or wager 7 Up 7 Down.",
    icon: "🎲",
    maxMultiplier: "180:1 Triple",
    minBet: 0.10,
    jackpotPool: 430000,
    rtp: "5.0% WIN (95.0% HOUSE)",
    badge: "🎲 TRIPLE DICE",
    category: "table",
    gradient: "from-amber-950/60 via-[#0B0E14] to-yellow-950/60",
    glowColor: "rgba(245, 158, 11, 0.5)",
    accentColor: "#FBBF24",
    artworkUrl: "https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?auto=format&fit=crop&w=800&q=80",
    characterTag: "Golden Dice Pit Boss",
    recentWinner: { name: "SicBoKing", amount: 160000, multiplier: "180:1 Triple" },
    features: ["Specific Triple 180:1", "Big / Small Bets", "7 Up 7 Down Layout"],
  },
  {
    id: "ludo",
    title: "Ludo VIP Board ♟️",
    subtitle: "Interactive Pawn Move & Dice",
    tagline: "Interactive Ludo board with physics dice rolls and pawn racing pots.",
    icon: "♟️",
    maxMultiplier: "25x Board Pot",
    minBet: 0.10,
    jackpotPool: 280000,
    rtp: "5.0% WIN (95.0% HOUSE)",
    badge: "🎲 LUDO BOARD",
    category: "instant",
    gradient: "from-blue-950/60 via-[#0B0E14] to-indigo-950/60",
    glowColor: "rgba(59, 130, 246, 0.5)",
    accentColor: "#60A5FA",
    artworkUrl: "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=800&q=80",
    characterTag: "Gold Board Champion",
    recentWinner: { name: "LudoPro_BD", amount: 48000, multiplier: "25.0x" },
    features: ["Interactive Pawn Move", "Dice Roll Physics", "Winner Take All"],
  },
  {
    id: "scratch_cards",
    title: "Super Ace Scratch 🎫",
    subtitle: "Digital Scratch Foil Tiles",
    tagline: "Scratch digital foil tiles to reveal matching neon symbols and prizes.",
    icon: "🎫",
    maxMultiplier: "500x",
    minBet: 0.10,
    jackpotPool: 340000,
    rtp: "5.0% WIN (95.0% HOUSE)",
    badge: "🎫 INSTANT SCRATCH",
    category: "instant",
    gradient: "from-emerald-950/60 via-[#0B0E14] to-teal-950/60",
    glowColor: "rgba(16, 185, 129, 0.5)",
    accentColor: "#34D399",
    artworkUrl: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80",
    characterTag: "Silver Foil Master",
    recentWinner: { name: "ScratchLucky", amount: 75000, multiplier: "500x" },
    features: ["Auto Scratch All", "Multi-Card Packs", "Instant Cashout"],
  },
  {
    id: "fortune_gems",
    title: "Fortune Gems VIP 💎",
    subtitle: "4th Multiplier Reel Wheel",
    tagline: "Classic 3x3 gem slot featuring a dedicated 4th Wheel Reel boosting wins up to 15x!",
    icon: "💎",
    maxMultiplier: "1,500x",
    minBet: 0.10,
    jackpotPool: 590000,
    rtp: "5.0% WIN (95.0% HOUSE)",
    badge: "💎 WHEEL REEL",
    category: "slots",
    gradient: "from-cyan-950/60 via-[#0B0E14] to-teal-950/60",
    glowColor: "rgba(6, 182, 212, 0.5)",
    accentColor: "#22D3EE",
    artworkUrl: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80",
    characterTag: "Gemstone Monarch",
    recentWinner: { name: "FortuneGemsVip", amount: 135000, multiplier: "850x" },
    features: ["4th Multiplier Reel", "Extra Bet Feature", "Cascading Gems"],
  },
  {
    id: "money_coming",
    title: "Money Coming Wheel 💰",
    subtitle: "Front Digit Combination Wheel",
    tagline: "Combine front digit reels directly with the top giant multiplier wheel!",
    icon: "💰",
    maxMultiplier: "10,000x",
    minBet: 0.10,
    jackpotPool: 910000,
    rtp: "5.0% WIN (95.0% HOUSE)",
    badge: "💰 GIANT WHEEL",
    category: "slots",
    gradient: "from-yellow-950/60 via-[#0B0E14] to-amber-950/60",
    glowColor: "rgba(234, 179, 8, 0.5)",
    accentColor: "#FACC15",
    artworkUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=800&q=80",
    characterTag: "Golden Money Boss",
    recentWinner: { name: "MoneyMaker99", amount: 290000, multiplier: "2000x" },
    features: ["Front Digit Combination", "Top Giant Wheel", "Respin Chance"],
  },
  {
    id: "royal_fishing",
    title: "Royal Fishing Arcade 🐟",
    subtitle: "Arcade Laser & Cannon Shooter",
    tagline: "Shoot lasers and cannons at golden dragon fish for massive point multipliers!",
    icon: "🐟",
    maxMultiplier: "1,000x",
    minBet: 0.10,
    jackpotPool: 670000,
    rtp: "5.0% WIN (95.0% HOUSE)",
    badge: "🐟 ARCADE SHOOTER",
    category: "instant",
    gradient: "from-sky-950/60 via-[#0B0E14] to-cyan-950/60",
    glowColor: "rgba(14, 165, 233, 0.5)",
    accentColor: "#38BDF8",
    artworkUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80",
    characterTag: "Deep Ocean Shooter",
    recentWinner: { name: "FishHunter", amount: 155000, multiplier: "1000x Dragon" },
    features: ["Laser Cannon Lock", "Dragon King Boss", "Multi-Target Auto Lock"],
  },
  {
    id: "blackjack",
    title: "Royal Vegas Blackjack 🃏",
    subtitle: "Classic VIP 21 Blackjack",
    tagline: "Challenge Vance head-on with 3:2 Blackjack payouts and split hands.",
    icon: "🃏",
    maxMultiplier: "3:2 Payout",
    minBet: 0.10,
    jackpotPool: 320000,
    rtp: "5.0% WIN (95.0% HOUSE)",
    badge: "⭐ VIP BLACKJACK",
    category: "table",
    gradient: "from-purple-950/60 via-[#0B0E14] to-indigo-950/60",
    glowColor: "rgba(168, 85, 247, 0.5)",
    accentColor: "#C084FC",
    artworkUrl: "https://images.unsplash.com/photo-1511193311914-0346f16efe90?auto=format&fit=crop&w=800&q=80",
    characterTag: "VIP 21 Dealer",
    recentWinner: { name: "BossSharif", amount: 95000, multiplier: "2.5x Double" },
    features: ["Double Down Any Card", "Split Equal Pairs", "Insurance Protection"],
  },
  {
    id: "roulette",
    title: "Neon Rose European Roulette 🔴",
    subtitle: "European Single Zero Wheel",
    tagline: "Place high-limit chip stacks on splits, dozens, and 35:1 single numbers.",
    icon: "🔴",
    maxMultiplier: "35:1 Single",
    minBet: 0.10,
    jackpotPool: 610000,
    rtp: "5.0% WIN (95.0% HOUSE)",
    badge: "💎 CLASSIC 35:1",
    category: "table",
    gradient: "from-rose-950/60 via-[#0B0E14] to-red-950/60",
    glowColor: "rgba(244, 63, 94, 0.5)",
    accentColor: "#FB7185",
    artworkUrl: "https://images.unsplash.com/photo-1606167668584-78701c57f13d?auto=format&fit=crop&w=800&q=80",
    characterTag: "Roulette Croupier",
    recentWinner: { name: "LuckyNumber7", amount: 175000, multiplier: "35:1 Straight" },
    features: ["Interactive Racetrack Bets", "Hot/Cold Number Stats", "Instant Chip Stacks"],
  },
  {
    id: "mines",
    title: "Diamond Cyber Mines 💣",
    subtitle: "Cyber Matrix & Mine Sweeper",
    tagline: "Uncover glowing gems while dodging explosive high-voltage mines.",
    icon: "💣",
    maxMultiplier: "880x",
    minBet: 0.10,
    jackpotPool: 380000,
    rtp: "5.0% WIN (95.0% HOUSE)",
    badge: "💣 HIGH SURVIVAL",
    category: "instant",
    gradient: "from-amber-950/60 via-[#0B0E14] to-yellow-950/60",
    glowColor: "rgba(245, 158, 11, 0.5)",
    accentColor: "#FBBF24",
    artworkUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
    characterTag: "Matrix Cyber Navigator",
    recentWinner: { name: "MineSweeperPro", amount: 64000, multiplier: "18.5x Cashout" },
    features: ["Custom Mine Count (1-24)", "Instant Cashout Button", "Safe Tile Predictor"],
  },
  {
    id: "highlow",
    title: "Quantum High-Low 📈",
    subtitle: "Streak Multiplier Ramp",
    tagline: "Guess if the next draw is higher or lower to build exponential chip payouts.",
    icon: "📈",
    maxMultiplier: "Unlimited",
    minBet: 0.10,
    jackpotPool: 190000,
    rtp: "5.0% WIN (95.0% HOUSE)",
    badge: "🚀 STREAK RAMP",
    category: "table",
    gradient: "from-emerald-950/60 via-[#0B0E14] to-teal-950/60",
    glowColor: "rgba(16, 185, 129, 0.5)",
    accentColor: "#34D399",
    artworkUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80",
    characterTag: "Quantum Streak Master",
    recentWinner: { name: "StreakRunner", amount: 82000, multiplier: "45.2x Streak" },
    features: ["Card Skip Ability", "Live Streak Multiplier", "Instant Cash Out"],
  },
  {
    id: "videopoker",
    title: "Jacks or Better Poker 🃏",
    subtitle: "Classic Jacks or Better Poker",
    tagline: "Calculate probabilities, hold strategic cards, and draw for Royal Flushes.",
    icon: "♠️",
    maxMultiplier: "250x Royal",
    minBet: 0.10,
    jackpotPool: 740000,
    rtp: "5.0% WIN (95.0% HOUSE)",
    badge: "♠️ ROYAL FLUSH",
    category: "table",
    gradient: "from-purple-950/60 via-[#0B0E14] to-fuchsia-950/60",
    glowColor: "rgba(217, 70, 239, 0.5)",
    accentColor: "#E879F9",
    artworkUrl: "https://images.unsplash.com/photo-1541278107931-e006523892df?auto=format&fit=crop&w=800&q=80",
    characterTag: "Poker High-Roller",
    recentWinner: { name: "PokerAce_BD", amount: 250000, multiplier: "250x Royal" },
    features: ["Auto Hold Recommendation", "Full House 9:1 Boost", "Instant Redraw"],
  },
  {
    id: "mega_ball",
    title: "Mega Ball VIP Bingo 🎱",
    subtitle: "Bouncing Balls & Lightning Multipliers",
    tagline: "Fill lines on active cards with live bouncing balls and lightning multipliers.",
    icon: "🎱",
    maxMultiplier: "100x Lightning",
    minBet: 0.10,
    jackpotPool: 480000,
    rtp: "5.0% WIN (95.0% HOUSE)",
    badge: "🎱 MEGA BALL",
    category: "instant",
    gradient: "from-violet-950/60 via-[#0B0E14] to-purple-950/60",
    glowColor: "rgba(139, 92, 246, 0.5)",
    accentColor: "#A78BFA",
    artworkUrl: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80",
    characterTag: "Mega Ball Host",
    recentWinner: { name: "MegaWinner99", amount: 115000, multiplier: "100x Lightning" },
    features: ["Multi-Card Play", "Lightning Multiplier Wheel", "Instant Line Cashout"],
  },
  {
    id: "book_of_dead",
    title: "Book of Dead Deluxe 📜",
    subtitle: "Egyptian Expanding Wild Spins",
    tagline: "Uncover sacred tombs and expanding hieroglyph wild symbols for 5,000x payouts.",
    icon: "📜",
    maxMultiplier: "5,000x",
    minBet: 0.10,
    jackpotPool: 850000,
    rtp: "5.0% WIN (95.0% HOUSE)",
    badge: "🔥 EXPANDING WILDS",
    category: "slots",
    gradient: "from-amber-950/60 via-[#0B0E14] to-yellow-950/60",
    glowColor: "rgba(245, 158, 11, 0.5)",
    accentColor: "#FBBF24",
    artworkUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80",
    characterTag: "Tomb Adventurer",
    recentWinner: { name: "PharaohKing", amount: 250000, multiplier: "5000x Tomb" },
    features: ["Expanding Symbols", "Free Spin Scatter", "Gamble Feature"],
  },
  {
    id: "baccarat_dragon_7",
    title: "Baccarat Dragon 7 VIP 🐉",
    subtitle: "Dragon 7 & Panda 8 Side Bets",
    tagline: "Asian VIP Baccarat table featuring 40:1 Dragon 7 and 25:1 Panda 8 payouts.",
    icon: "🐉",
    maxMultiplier: "40:1 Dragon 7",
    minBet: 0.10,
    jackpotPool: 950000,
    rtp: "5.0% WIN (95.0% HOUSE)",
    badge: "🐉 DRAGON 7",
    category: "table",
    gradient: "from-red-950/60 via-[#0B0E14] to-amber-950/60",
    glowColor: "rgba(239, 68, 68, 0.5)",
    accentColor: "#F87171",
    artworkUrl: "https://images.unsplash.com/photo-1508807526345-15e9b5f4eaff?auto=format&fit=crop&w=800&q=80",
    characterTag: "Dragon Salon Dealer",
    recentWinner: { name: "MacauHighRoller", amount: 400000, multiplier: "40:1 Dragon 7" },
    features: ["Dragon 7 (40:1)", "Panda 8 (25:1)", "Live Squeeze"],
  },
  {
    id: "speed_bingo_80",
    title: "Speed Bingo 80 Turbo ⚡",
    subtitle: "Rapid 80-Ball Shaker",
    tagline: "Turbo-charged 80-ball bingo draw with instant pattern multipliers.",
    icon: "🎱",
    maxMultiplier: "800x",
    minBet: 0.10,
    jackpotPool: 310000,
    rtp: "5.0% WIN (95.0% HOUSE)",
    badge: "⚡ RAPID BINGO",
    category: "instant",
    gradient: "from-cyan-950/60 via-[#0B0E14] to-blue-950/60",
    glowColor: "rgba(6, 182, 212, 0.5)",
    accentColor: "#22D3EE",
    artworkUrl: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80",
    characterTag: "Speed Master",
    recentWinner: { name: "TurboBingo", amount: 80000, multiplier: "800x Full Card" },
    features: ["80-Ball Rapid Draw", "Pattern Boosters", "Multi-Ticket Play"],
  },
];

const existingIds = new Set(HIGH_ROLLER_GAMES.map((g) => g.id));

const supplementalGames: HighRollerGame[] = (CASINO_GAMES_CATALOG || [])
  .filter((cg) => cg && cg.id && !existingIds.has(cg.id))
  .map((cg) => ({
    id: cg.id,
    title: cg.name || cg.id,
    subtitle: `${cg.theme || "Vegas"} VIP Table`,
    tagline: cg.description || "High limit stakes with massive jackpot potential.",
    icon: cg.icon || "🎰",
    maxMultiplier: cg.multiplier || "1,000x",
    minBet: cg.minBet !== undefined ? cg.minBet : 0.10,
    jackpotPool: cg.jackpot || 500000,
    rtp: "5.0% WIN (95.0% HOUSE)",
    badge: cg.badge || "VIP SELECTION",
    category: (cg.category === "live" ? "table" : (cg.category || "slots")) as any,
    gradient: cg.bgGradient || "from-amber-950/60 via-[#0B0E14] to-yellow-950/60",
    glowColor: "rgba(245, 158, 11, 0.5)",
    accentColor: "#FBBF24",
    artworkUrl: cg.artworkUrl || "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80",
    characterTag: cg.theme || "Vegas Legend",
    recentWinner: { name: "HighRollerVIP", amount: (cg.maxBet || 1000) * 100, multiplier: cg.multiplier || "500x" },
    features: ["VIP High Limit", "Instant Cashout", "Provably Fair"],
  }));

export const ALL_HIGH_ROLLER_GAMES: HighRollerGame[] = [...HIGH_ROLLER_GAMES, ...supplementalGames];

interface VegasHighRollerSuiteProps {
  onSelectGame: (gameId: GameType, category?: string, gameName?: string) => void;
}

export const VegasHighRollerSuite: React.FC<VegasHighRollerSuiteProps> = ({ onSelectGame }) => {
  const [tickerJackpot, setTickerJackpot] = useState(1284950);
  const [activeCategory, setActiveCategory] = useState<"all" | "crash" | "slots" | "table" | "instant">("all");
  const [activePage, setActivePage] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const gamesPerPage = 36;

  // Live ticking progressive jackpot
  useEffect(() => {
    const interval = setInterval(() => {
      setTickerJackpot((prev) => prev + Math.floor(Math.random() * 8) + 1);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleLaunch = (game: HighRollerGame) => {
    casinoAudio.playWin();
    onSelectGame(game.id, game.category, game.title);
  };

  const filteredGames = ALL_HIGH_ROLLER_GAMES.filter((g) => {
    if (activeCategory === "all") return true;
    return g.category === activeCategory;
  });

  const paginatedGames = React.useMemo(() => {
    const startIndex = (activePage - 1) * gamesPerPage;
    return filteredGames.slice(startIndex, startIndex + gamesPerPage);
  }, [filteredGames, activePage, gamesPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredGames.length / gamesPerPage));

  const scrollSuite = (direction: "left" | "right") => {
    casinoAudio.playClick();
    if (scrollRef.current) {
      const amount = direction === "left" ? -360 : 360;
      scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  return (
    <div className="rounded-3xl border-2 border-[#FFD700]/40 bg-gradient-to-b from-[#121722] via-[#0B0E14] to-[#07090E] p-4 sm:p-6 shadow-[0_0_50px_rgba(255,215,0,0.15)] relative overflow-hidden">
      
      {/* Golden Vegas Header Banner */}
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-tr from-[#FFD700] via-amber-300 to-yellow-500 text-slate-950 flex items-center justify-center shadow-[0_0_25px_rgba(255,215,0,0.6)] border-2 border-yellow-100 shrink-0 animate-pulse">
            <Crown className="h-7 w-7 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[#FFD700]/20 border border-[#FFD700]/40 text-[9px] font-mono font-black uppercase text-[#FFD700] tracking-widest shadow-sm">
                VEGAS HIGH ROLLER SUITE
              </span>
              <span className="flex h-2 w-2 rounded-full bg-[#00FF66] animate-ping" />
            </div>
            <h2 className="text-lg sm:text-2xl font-mono font-black text-white tracking-tight mt-0.5">
              ALL {ALL_HIGH_ROLLER_GAMES.length} <span className="text-[#FFD700] drop-shadow-[0_0_12px_rgba(255,215,0,0.5)]">HIGH-STAKES GAMES</span>
            </h2>
          </div>
        </div>

        {/* Live Progressive Vegas Jackpot Ticker */}
        <div className="w-full md:w-auto bg-[#131926] border border-[#FFD700]/50 px-4 py-2.5 rounded-2xl flex items-center justify-between md:justify-end gap-3 shadow-[0_0_20px_rgba(255,215,0,0.2)]">
          <div className="text-left">
            <span className="text-[9px] font-mono text-amber-400 font-bold uppercase tracking-widest block">GRAND VEGAS POOL</span>
            <div className="font-mono text-base sm:text-lg font-black text-[#FFD700] tracking-tight">
              ${tickerJackpot.toLocaleString()}
            </div>
          </div>
          <div className="h-8 w-8 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/30 flex items-center justify-center text-[#FFD700]">
            <Trophy className="h-4 w-4 animate-bounce" />
          </div>
        </div>
      </div>

      {/* High Roller Category Filter Navigation Bar */}
      <div className="mt-4 flex items-center justify-between gap-2 border-b border-white/5 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none relative z-10">
          {[
            { id: "all", label: "SPOTLIGHT CAROUSEL", icon: Layers },
            { id: "slots", label: "SLOTS & WHEELS", icon: Star },
            { id: "table", label: "TABLE & CARDS", icon: Crown },
            { id: "instant", label: "INSTANT & ARCADE", icon: Sparkles },
          ].map((tab) => {
            const IconComp = tab.icon;
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  casinoAudio.playClick();
                  setActiveCategory(tab.id as any);
                  setActivePage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-[#FFD700] to-amber-400 text-slate-950 shadow-[0_0_15px_rgba(255,215,0,0.4)]"
                    : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/5"
                }`}
              >
                <IconComp className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {activeCategory === "all" && (
          <div className="hidden sm:flex items-center gap-1 bg-black/60 border border-amber-500/30 rounded-xl p-1 shrink-0">
            <button
              onClick={() => scrollSuite("left")}
              className="p-1.5 rounded-lg text-amber-300 hover:text-white hover:bg-amber-500/20 transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scrollSuite("right")}
              className="p-1.5 rounded-lg text-amber-300 hover:text-white hover:bg-amber-500/20 transition-colors cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* CONTENT: HORIZONTAL SPOTLIGHT CAROUSEL or PAGINATED GRID */}
      {activeCategory === "all" ? (
        /* HORIZONTAL SLIDING CAROUSEL SPOTLIGHT */
        <div className="mt-4 relative z-10">
          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto scrollbar-none snap-x py-2 px-0.5"
          >
            {ALL_HIGH_ROLLER_GAMES.slice(0, 18).map((game, idx) => (
              <div
                key={`${game.title}-${idx}`}
                className="w-[155px] xs:w-[175px] sm:w-[195px] md:w-[210px] shrink-0 snap-start"
              >
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: (idx % 8) * 0.015 }}
                  onClick={() => handleLaunch(game)}
                  style={{ animationDelay: `${(idx % 6) * 0.35}s` }}
                  className="group relative rounded-xl border border-slate-800/80 bg-[#0d131e]/95 animate-gold-pulse-glow hover:border-amber-400/90 hover:shadow-[0_0_26px_rgba(245,158,11,0.4)] shadow-lg transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between h-full active:scale-[0.97] touch-manipulation"
                >
                  {/* Top Edge Gold Neon Laser Bar */}
                  <div className="h-[2px] w-full bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 opacity-80 group-hover:opacity-100 transition-opacity" />

                  {/* Card Artwork with Holographic Sheen */}
                  <div className="select-none relative overflow-hidden">
                    <div className="relative h-24 xs:h-28 sm:h-32 md:h-36 w-full overflow-hidden bg-slate-950 laser-sheen-effect">
                      <img
                        src={game.artworkUrl}
                        alt={game.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 filter brightness-95 contrast-105"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0d131e] via-transparent to-black/40" />

                      {/* Quick Play Overlay with Pinging Ring */}
                      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-1.5 z-20">
                        <div className="relative">
                          <div className="absolute -inset-1.5 rounded-full bg-amber-400/30 animate-ping opacity-70 pointer-events-none" />
                          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-rose-500 flex items-center justify-center text-slate-950 shadow-[0_0_18px_rgba(245,158,11,0.85)] transform scale-75 group-hover:scale-100 transition-transform duration-300 relative z-10">
                            <Play className="h-4 w-4 fill-slate-950 stroke-0 ml-0.5" />
                          </div>
                        </div>
                        <span className="text-[9px] font-mono font-black text-amber-300 tracking-widest uppercase drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]">PLAY NOW</span>
                      </div>

                      {/* Character & Badge */}
                      <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between gap-1 z-10">
                        <span className="px-1.5 py-0.5 rounded bg-black/85 border border-amber-500/50 text-amber-200 font-bold text-[7.5px] uppercase tracking-wider backdrop-blur-md shadow-sm flex items-center gap-1">
                          <Sparkles className="w-2 h-2 text-[#FFD700] animate-pulse" />
                          <span className="truncate max-w-[50px]">{game.characterTag}</span>
                        </span>

                        <span className="px-1.5 py-0.5 rounded bg-black/85 border border-amber-400/50 text-[#FFD700] font-mono font-black text-[7.5px] uppercase tracking-wider backdrop-blur-md shadow-[0_0_8px_rgba(245,158,11,0.4)]">
                          {game.badge}
                        </span>
                      </div>

                      {/* Floating Game Icon Emblem */}
                      <div
                        className="absolute bottom-1.5 left-1.5 z-10 h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-black/85 border border-amber-400/50 flex items-center justify-center text-xs sm:text-sm shadow-md shrink-0"
                        style={{ boxShadow: `0 0 12px ${game.glowColor}` }}
                      >
                        <span>{game.icon}</span>
                      </div>

                      {/* Bottom-Right Live Player Count Badge */}
                      <div className="absolute bottom-1.5 right-1.5 z-10 flex items-center gap-1 bg-black/85 backdrop-blur-md px-1.5 py-0.5 rounded-full border border-emerald-500/40 shadow-sm">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                        </span>
                        <span className="text-[7px] sm:text-[7.5px] font-mono font-bold text-emerald-300 tracking-wider">
                          {75 + ((idx * 29) % 190)} LIVE
                        </span>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="p-2 sm:p-2.5">
                      <div className="min-w-0 mb-1.5">
                        <h3 className="font-serif font-black text-xs sm:text-sm text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] via-yellow-200 to-amber-300 drop-shadow-sm truncate group-hover:text-amber-200">
                          {game.title}
                        </h3>
                        <p className="text-[9px] text-amber-300/80 font-mono tracking-wide truncate">
                          {game.subtitle}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-1 text-[8px] font-mono">
                        <div className="bg-black/60 px-1 py-0.5 rounded border border-amber-500/20 text-center">
                          <span className="text-amber-400/80 block text-[7px] font-bold uppercase truncate">MAX</span>
                          <span className="text-[#FFD700] font-black truncate block drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]">{game.maxMultiplier}</span>
                        </div>
                        <div className="bg-black/60 px-1 py-0.5 rounded border border-slate-700/50 text-center">
                          <span className="text-slate-400 block text-[7px] font-bold uppercase truncate">MIN</span>
                          <span className="text-white font-black truncate block">${game.minBet}</span>
                        </div>
                        <div className="bg-black/60 px-1 py-0.5 rounded border border-emerald-500/20 text-center">
                          <span className="text-emerald-400/80 block text-[7px] font-bold uppercase truncate">RTP</span>
                          <span className="text-emerald-300 font-black truncate block">{game.rtp}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* CLEAN PAGINATED GRID VIEW FOR CATEGORY TABS */
        <div className="mt-4 space-y-4 relative z-10">
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5 sm:gap-3">
            {paginatedGames.map((game, idx) => (
              <motion.div
                key={`${game.title}-${idx}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: (idx % 8) * 0.015 }}
                onClick={() => handleLaunch(game)}
                style={{ animationDelay: `${(idx % 6) * 0.3}s` }}
                className="group relative rounded-xl border border-slate-800/80 bg-[#0d131e]/95 animate-gold-pulse-glow hover:border-amber-400/90 hover:shadow-[0_0_26px_rgba(245,158,11,0.4)] shadow-lg transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between active:scale-[0.97] touch-manipulation"
              >
                {/* Top Edge Gold Neon Laser Bar */}
                <div className="h-[2px] w-full bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 opacity-80 group-hover:opacity-100 transition-opacity" />

                <div className="select-none relative overflow-hidden">
                  <div className="relative h-24 xs:h-28 sm:h-32 md:h-36 w-full overflow-hidden bg-slate-950 laser-sheen-effect">
                    <img
                      src={game.artworkUrl}
                      alt={game.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 filter brightness-95 contrast-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0d131e] via-transparent to-black/40" />

                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-1.5 z-20">
                      <div className="relative">
                        <div className="absolute -inset-1.5 rounded-full bg-amber-400/30 animate-ping opacity-70 pointer-events-none" />
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-rose-500 flex items-center justify-center text-slate-950 shadow-[0_0_18px_rgba(245,158,11,0.85)] transform scale-75 group-hover:scale-100 transition-transform duration-300 relative z-10">
                          <Play className="h-4 w-4 fill-slate-950 stroke-0 ml-0.5" />
                        </div>
                      </div>
                      <span className="text-[9px] font-mono font-black text-amber-300 tracking-widest uppercase drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]">PLAY NOW</span>
                    </div>

                    <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between gap-1 z-10">
                      <span className="px-1.5 py-0.5 rounded bg-black/85 border border-amber-500/50 text-amber-200 font-bold text-[7.5px] uppercase tracking-wider backdrop-blur-md shadow-sm flex items-center gap-1">
                        <Sparkles className="w-2 h-2 text-[#FFD700] animate-pulse" />
                        <span className="truncate max-w-[45px]">{game.characterTag}</span>
                      </span>

                      <span className="px-1.5 py-0.5 rounded bg-black/85 border border-amber-400/50 text-[#FFD700] font-mono font-black text-[7.5px] uppercase tracking-wider backdrop-blur-md shadow-[0_0_8px_rgba(245,158,11,0.4)]">
                        {game.badge}
                      </span>
                    </div>

                    <div
                      className="absolute bottom-1.5 left-1.5 z-10 h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-black/85 border border-amber-400/50 flex items-center justify-center text-xs sm:text-sm shadow-md shrink-0"
                      style={{ boxShadow: `0 0 12px ${game.glowColor}` }}
                    >
                      <span>{game.icon}</span>
                    </div>

                    {/* Bottom-Right Live Player Count Badge */}
                    <div className="absolute bottom-1.5 right-1.5 z-10 flex items-center gap-1 bg-black/85 backdrop-blur-md px-1.5 py-0.5 rounded-full border border-emerald-500/40 shadow-sm">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                      </span>
                      <span className="text-[7px] sm:text-[7.5px] font-mono font-bold text-emerald-300 tracking-wider">
                        {80 + ((idx * 23) % 170)} LIVE
                      </span>
                    </div>
                  </div>

                  <div className="p-2 sm:p-2.5">
                    <div className="min-w-0 mb-1.5">
                      <h3 className="font-serif font-black text-xs sm:text-sm text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] via-yellow-200 to-amber-300 drop-shadow-sm truncate group-hover:text-amber-200">
                        {game.title}
                      </h3>
                      <p className="text-[9px] text-amber-300/80 font-mono tracking-wide truncate">
                        {game.subtitle}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-1 text-[8px] font-mono">
                      <div className="bg-black/60 px-1 py-0.5 rounded border border-amber-500/20 text-center">
                        <span className="text-amber-400/80 block text-[7px] font-bold uppercase truncate">MAX</span>
                        <span className="text-[#FFD700] font-black truncate block drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]">{game.maxMultiplier}</span>
                      </div>
                      <div className="bg-black/60 px-1 py-0.5 rounded border border-slate-700/50 text-center">
                        <span className="text-slate-400 block text-[7px] font-bold uppercase truncate">MIN</span>
                        <span className="text-white font-black truncate block">${game.minBet}</span>
                      </div>
                      <div className="bg-black/60 px-1 py-0.5 rounded border border-emerald-500/20 text-center">
                        <span className="text-emerald-400/80 block text-[7px] font-bold uppercase truncate">RTP</span>
                        <span className="text-emerald-300 font-black truncate block">{game.rtp}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t border-white/10 font-mono text-xs">
              <span className="text-slate-400">
                Page <span className="text-amber-300 font-bold">{activePage}</span> of {totalPages} ({filteredGames.length} Total Games)
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={activePage === 1}
                  onClick={() => {
                    casinoAudio.playClick();
                    setActivePage((p) => Math.max(1, p - 1));
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  Previous
                </button>
                <button
                  disabled={activePage === totalPages}
                  onClick={() => {
                    casinoAudio.playClick();
                    setActivePage((p) => Math.min(totalPages, p + 1));
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  Next Page
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
