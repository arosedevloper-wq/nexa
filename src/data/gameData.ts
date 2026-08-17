// NexaSpin Active Games Central Registry
// Registers all active casino games mapped directly to original codebase component files.

export type GameCategory = "crash" | "slots" | "table" | "arcade" | "live";
export type GameEngine = "crash" | "slots" | "table" | "arcade" | "live";

export interface GameConfig {
  id: string;
  name: string;
  category: GameCategory;
  engine: GameEngine;
  minBet: number;
  maxBet: number;
  payout: string;
  rtp: string;
  description: string;
  icon: string;
  badge?: string;
  bgGradient?: string;
  artworkUrl?: string;
  popularity?: number;
  status?: "Playable" | "VIP Locked" | "Under Maintenance";
  theme?: string;
  componentFile?: string;
  rules?: string[];
}

// 29 Core Real Active NexaSpin Games from repository codebase
export const ACTIVE_NEXASPIN_GAMES: GameConfig[] = [
  {
    id: "chicken_dash",
    name: "Chicken Dash & Frog Dash",
    category: "arcade",
    engine: "arcade",
    minBet: 0.10,
    maxBet: 1000,
    payout: "50x Scaling",
    rtp: "96.5%",
    description: "Quick arcade obstacle-dodging and multiplier-scaling dash games.",
    icon: "🐔",
    badge: "DASH 🐸",
    bgGradient: "from-amber-950 via-orange-950 to-slate-950 border-amber-500/50 text-amber-400",
    artworkUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Obstacle Dodge",
    componentFile: "src/components/games/ChickenDashGame.tsx",
    rules: [
      "Guide your character across busy highway lanes and lily pads.",
      "Each successful lane crossed increases your win multiplier.",
      "Cash out anytime or push for maximum 50x bonus payout."
    ]
  },
  {
    id: "crazy_time",
    name: "Crazy Time",
    category: "live",
    engine: "live",
    minBet: 0.10,
    maxBet: 2500,
    payout: "25,000x Peak",
    rtp: "96.1%",
    description: "World famous Live Game Show wheel with Cash Hunt, Pachinko, Coin Flip & Crazy Time bonus worlds!",
    icon: "🎡",
    badge: "LIVE SHOW",
    bgGradient: "from-fuchsia-950 via-pink-950 to-slate-950 border-fuchsia-500/50 text-fuchsia-400",
    artworkUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Game Show",
    componentFile: "src/components/games/CrazyTimeGame.tsx",
    rules: [
      "Bet on numbers 1, 2, 5, 10 or 4 distinct bonus rounds.",
      "Top Slot generates a random multiplier for one bet spot.",
      "Bonus rounds deliver interactive multipliers up to 25,000x."
    ]
  },
  {
    id: "super_ace",
    name: "Super Ace & Super Ace Deluxe",
    category: "slots",
    engine: "slots",
    minBet: 0.10,
    maxBet: 2500,
    payout: "1500x Cascades",
    rtp: "97.2%",
    description: "Cascading symbol slot machine featuring Golden Cards, Wild Locks, and progressive multiplier eliminations.",
    icon: "♠️",
    badge: "DELUXE ♠️",
    bgGradient: "from-amber-950 via-yellow-950 to-slate-950 border-amber-500/50 text-amber-400",
    artworkUrl: "https://images.unsplash.com/photo-1511193311914-0346f16efe90?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Card Symbols",
    componentFile: "src/components/games/SuperAceGame.tsx",
    rules: [
      "5x4 reel structure with cascading win mechanics.",
      "Golden Cards turn into Wilds upon elimination.",
      "Combo multiplier meter stacks 1x, 2x, 3x, 5x up to 1500x in Free Spins."
    ]
  },
  {
    id: "magic_ace",
    name: "Magic Ace / Golden Genie / Anubis Wrath",
    category: "slots",
    engine: "slots",
    minBet: 0.10,
    maxBet: 2000,
    payout: "2000x Genie",
    rtp: "96.9%",
    description: "Richly themed slot machine suite featuring custom paylines, free spin storms, and wild bounty showdowns.",
    icon: "🧞‍♂️",
    badge: "MYTHIC",
    bgGradient: "from-purple-950 via-indigo-950 to-slate-950 border-purple-500/50 text-purple-400",
    artworkUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Mythic Magic",
    componentFile: "src/components/games/ThemedSlotsGame.tsx",
    rules: [
      "Land 3 or more Magic Scatters to unlock 10 Free Spins.",
      "Genie Wilds expand vertically to cover entire reels.",
      "Progressive jackpots unlock on 5 matching mythical relics."
    ]
  },
  {
    id: "boxing_king",
    name: "Boxing King Combat Slot",
    category: "slots",
    engine: "slots",
    minBet: 0.10,
    maxBet: 1500,
    payout: "1000x KO",
    rtp: "96.7%",
    description: "Action-themed arcade combat slot with KO combo counters, championship rings, and belt multipliers.",
    icon: "🥊",
    badge: "COMBAT 🥊",
    bgGradient: "from-red-950 via-orange-950 to-slate-950 border-red-500/50 text-red-400",
    artworkUrl: "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Arcade Combat",
    componentFile: "src/components/games/ThemedSlotsGame.tsx",
    rules: [
      "Combos trigger free re-spins with sticky glove symbols.",
      "Knockout meter awards instant cash multipliers.",
      "Title belt scatters award 1000x KO grand jackpot."
    ]
  },
  {
    id: "teen_patti",
    name: "Teen Patti & Rummy VIP",
    category: "table",
    engine: "table",
    minBet: 0.10,
    maxBet: 2000,
    payout: "Trail 30:1",
    rtp: "98.1%",
    description: "Classic Indian 3-Card Teen Patti and 13-Card Rummy with smart bot dealer logic and hand ranking displays.",
    icon: "🎴",
    badge: "DESI CARDS",
    bgGradient: "from-emerald-950 via-teal-950 to-slate-950 border-emerald-500/50 text-emerald-400",
    artworkUrl: "https://images.unsplash.com/photo-1606167668584-78701c57f13d?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Indian Cards",
    componentFile: "src/components/games/TeenPattiGame.tsx",
    rules: [
      "Hand rankings: Trail (Set) > Pure Sequence > Sequence > Color > Pair > High Card.",
      "Bet blind or seen with side-show requests.",
      "Trail pays out maximum 30:1 bonus chips."
    ]
  },
  {
    id: "rummy",
    name: "Rummy VIP",
    category: "table",
    engine: "table",
    minBet: 0.10,
    maxBet: 2000,
    payout: "Hand Score 20:1",
    rtp: "97.8%",
    description: "13-card Indian Rummy table game. Form valid sets and sequences to declare first and collect pot.",
    icon: "🃏",
    badge: "RUMMY VIP",
    bgGradient: "from-emerald-950 via-slate-950 to-slate-950 border-emerald-500/50 text-emerald-400",
    artworkUrl: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Indian Cards",
    componentFile: "src/components/games/RummyGame.tsx",
    rules: [
      "13 cards dealt per player.",
      "Must form at least 2 sequences, including 1 pure sequence.",
      "Declare hand first with zero penalty points to win."
    ]
  },
  {
    id: "callbreak",
    name: "Callbreak Quick",
    category: "table",
    engine: "table",
    minBet: 0.10,
    maxBet: 1000,
    payout: "Tricks Multiplier",
    rtp: "97.5%",
    description: "Fast-paced turn-based trick-taking card game with bidding, spades trump rules, and quick payouts.",
    icon: "♠️",
    badge: "TRICK TAKING",
    bgGradient: "from-cyan-950 via-blue-950 to-slate-950 border-cyan-500/50 text-cyan-400",
    artworkUrl: "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Trick Taking",
    componentFile: "src/components/games/CallbreakGame.tsx",
    rules: [
      "Bid predicted tricks before play starts.",
      "Spades suit is always the master trump card.",
      "Meeting or exceeding your bid yields positive score multiplier."
    ]
  },
  {
    id: "dragon_tiger",
    name: "Dragon Tiger Showdown",
    category: "table",
    engine: "table",
    minBet: 0.10,
    maxBet: 5000,
    payout: "50:1 Suited Tie",
    rtp: "96.3%",
    description: "Ultrafast two-card showdown (Dragon vs. Tiger). Highest card wins with Tie and Suited Tie side wagers.",
    icon: "🐉",
    badge: "DRAGON 🐉",
    bgGradient: "from-rose-950 via-red-950 to-slate-950 border-rose-500/50 text-rose-400",
    artworkUrl: "https://images.unsplash.com/photo-1508807526345-15e9b5f4eaff?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Two-Card Fast",
    componentFile: "src/components/games/DragonTigerGame.tsx",
    rules: [
      "One card dealt to Dragon and one to Tiger.",
      "Highest card value wins (King is high, Ace is low).",
      "Dragon/Tiger pays 1:1, Tie pays 11:1, Suited Tie pays 50:1."
    ]
  },
  {
    id: "sic_bo",
    name: "Sic Bo & 7 Up 7 Down",
    category: "table",
    engine: "table",
    minBet: 0.10,
    maxBet: 3000,
    payout: "180:1 Triple",
    rtp: "97.2%",
    description: "Classic Asian 3-dice rolling betting game with Big/Small, Triple bets, and 7 Up 7 Down outcome tables.",
    icon: "🎲",
    badge: "DICE 🎲",
    bgGradient: "from-amber-950 via-yellow-950 to-slate-950 border-amber-500/50 text-amber-400",
    artworkUrl: "https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Dice Rolling",
    componentFile: "src/components/games/SicBoGame.tsx",
    rules: [
      "Bet on combinations of 3 shaken dice.",
      "Small (4-10) and Big (11-17) pay 1:1.",
      "Specific Triples pay out up to 180:1."
    ]
  },
  {
    id: "ludo",
    name: "Ludo & Ludo Quick",
    category: "arcade",
    engine: "arcade",
    minBet: 0.10,
    maxBet: 1000,
    payout: "Token Victory",
    rtp: "96.0%",
    description: "Interactive playable Ludo board layout with physics dice rolls, token movement, and winner prize pots.",
    icon: "♟️",
    badge: "LUDO 🎲",
    bgGradient: "from-blue-950 via-indigo-950 to-slate-950 border-blue-500/50 text-blue-400",
    artworkUrl: "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Board Game",
    componentFile: "src/components/games/LudoGame.tsx",
    rules: [
      "Roll a 6 to bring tokens onto the track.",
      "Capture opponent tokens to earn extra turns.",
      "First to move all tokens to home wins the total wager pot."
    ]
  },
  {
    id: "scratch_cards",
    name: "Super Ace Scratch Cards",
    category: "arcade",
    engine: "arcade",
    minBet: 0.10,
    maxBet: 1000,
    payout: "500x Scratch",
    rtp: "95.5%",
    description: "Instant-win digital scratch-off cards. Foil-coated grid revealing neon symbols and instant cash payouts.",
    icon: "🎫",
    badge: "SCRATCH 🎫",
    bgGradient: "from-emerald-950 via-teal-950 to-slate-950 border-emerald-500/50 text-emerald-400",
    artworkUrl: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Instant Win",
    componentFile: "src/components/games/ScratchCardsGame.tsx",
    rules: [
      "Buy a scratch card and rub off the protective foil.",
      "Match 3 identical symbols to win the corresponding prize.",
      "Golden Ace multiplier symbols multiply total card winnings."
    ]
  },
  {
    id: "fortune_gems",
    name: "Fortune Gems (1 & 2)",
    category: "slots",
    engine: "slots",
    minBet: 0.10,
    maxBet: 2000,
    payout: "15x Wheel Reel",
    rtp: "97.0%",
    description: "3x3 classic gem slot style with a specialized 4th Multiplier Wheel reel boosting wins up to 15x!",
    icon: "💎",
    badge: "FORTUNE GEMS",
    bgGradient: "from-cyan-950 via-teal-950 to-slate-950 border-cyan-500/50 text-cyan-400",
    artworkUrl: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "3x3 Gem Slot",
    componentFile: "src/components/games/FortuneGemsGame.tsx",
    rules: [
      "3x3 main grid plus 1 dedicated multiplier reel.",
      "Red, Green, Blue gems offer distinct payline multipliers.",
      "4th reel randomly multiplies total line wins from 1x to 15x."
    ]
  },
  {
    id: "money_coming",
    name: "Money Coming Wheel Slot",
    category: "slots",
    engine: "slots",
    minBet: 0.10,
    maxBet: 3000,
    payout: "10,000x Wheel",
    rtp: "97.3%",
    description: "Specialized multi-reel multiplier wheel slot game where number reels combine directly with top wheel bonuses.",
    icon: "💰",
    badge: "MONEY COMING",
    bgGradient: "from-yellow-950 via-amber-950 to-slate-950 border-yellow-500/50 text-yellow-400",
    artworkUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Multi-Reel Wheel",
    componentFile: "src/components/games/MoneyComingGame.tsx",
    rules: [
      "Reels land direct digits (e.g. 10, 50, 100).",
      "Special 4th reel awards 10X multiplier or Lucky Wheel spin.",
      "Super Wheel awards up to 10,000x jackpot payout."
    ]
  },
  {
    id: "royal_fishing",
    name: "Royal Fishing Arcade Shooter",
    category: "arcade",
    engine: "arcade",
    minBet: 0.10,
    maxBet: 2000,
    payout: "1000x Dragon Fish",
    rtp: "96.5%",
    description: "Interactive arcade shooter where players target underwater golden fish and dragons to capture point multipliers!",
    icon: "🐟",
    badge: "ARCADE FISHING",
    bgGradient: "from-sky-950 via-cyan-950 to-slate-950 border-sky-500/50 text-sky-400",
    artworkUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Arcade Shooter",
    componentFile: "src/components/games/RoyalFishingGame.tsx",
    rules: [
      "Aim and fire laser cannons at underwater sea creatures.",
      "Smaller fish pay frequent low multipliers (2x-10x).",
      "Golden Dragons and boss sea beasts award up to 1000x."
    ]
  },
  {
    id: "plinko",
    name: "Neon Plinko: Quantum Pegboard",
    category: "arcade",
    engine: "arcade",
    minBet: 0.10,
    maxBet: 500,
    payout: "Up to 16x",
    rtp: "98.0%",
    description: "Drop neon chips down the triangular peg layout. Hits bouncing pins with realistic collision physics and multipliers up to 16x!",
    icon: "🔵",
    badge: "PLINKO 🔵",
    bgGradient: "from-cyan-950 via-slate-950 to-slate-950 border-cyan-700/40 text-cyan-400",
    artworkUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Physics Drops",
    componentFile: "src/components/NeonPlinko.tsx",
    rules: [
      "Choose risk level (Low, Medium, High) and row depth.",
      "Drop chips from top pin dropper.",
      "Chip bounces down physics pegs into bottom multiplier slots."
    ]
  },
  {
    id: "baccarat",
    name: "Luxury Baccarat: High-Roller Felt",
    category: "table",
    engine: "table",
    minBet: 0.10,
    maxBet: 2500,
    payout: "Up to 8x",
    rtp: "98.9%",
    description: "High-roller streamlined Baccarat table. Wager on Player, Banker or Tie with standard casino drawing rules and modulo-10 calculations.",
    icon: "👑",
    badge: "EXCLUSIVE",
    bgGradient: "from-amber-950 via-slate-950 to-slate-950 border-yellow-700/40 text-yellow-400",
    artworkUrl: "https://images.unsplash.com/photo-1541278107931-e006523892df?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Vegas High-Roller",
    componentFile: "src/components/LuxuryBaccarat.tsx",
    rules: [
      "Wager on Player, Banker, or Tie.",
      "Hand closest to total of 9 wins.",
      "Player pays 1:1, Banker pays 0.95:1 (5% commission), Tie pays 8:1."
    ]
  },
  {
    id: "blackjack",
    name: "Royal Vegas Blackjack",
    category: "table",
    engine: "table",
    minBet: 0.10,
    maxBet: 1000,
    payout: "3:2 Payout",
    rtp: "99.5%",
    description: "Classic table blackjack with custom split and double multipliers, directly dealt by Vance.",
    icon: "🃏",
    badge: "POPULAR",
    bgGradient: "from-fuchsia-950 via-slate-950 to-slate-950 border-fuchsia-700/40 text-fuchsia-400",
    artworkUrl: "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Vegas Table",
    componentFile: "src/components/BlackjackGame.tsx",
    rules: [
      "Beat the dealer's hand total without exceeding 21.",
      "Blackjack pays 3:2 payout.",
      "Dealer must stand on soft 17."
    ]
  },
  {
    id: "roulette",
    name: "Neon European Roulette",
    category: "table",
    engine: "table",
    minBet: 0.10,
    maxBet: 5000,
    payout: "35:1 Single",
    rtp: "97.3%",
    description: "Place custom splits, ranges, colors, and numbers on the luxury cylinder board.",
    icon: "🔴",
    badge: "HOT",
    bgGradient: "from-emerald-950 via-slate-950 to-slate-950 border-emerald-700/40 text-emerald-400",
    artworkUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "European Cylinder",
    componentFile: "src/components/RouletteGame.tsx",
    rules: [
      "Single zero European wheel layout (37 pockets: 0 to 36).",
      "Single number pays 35:1.",
      "Red/Black, Even/Odd, 1-18/19-36 pay 1:1."
    ]
  },
  {
    id: "mines",
    name: "Cyber Mines: Tactical Grid",
    category: "arcade",
    engine: "arcade",
    minBet: 0.10,
    maxBet: 1000,
    payout: "Exponential",
    rtp: "97.0%",
    description: "Place your wager and reveal hidden grids. Find diamond multipliers while evading neon explosive mines!",
    icon: "💣",
    badge: "EXCLUSIVE",
    bgGradient: "from-emerald-950 via-slate-950 to-slate-950 border-emerald-700/40 text-emerald-400",
    artworkUrl: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Cyber Grid",
    componentFile: "src/components/CyberMines.tsx",
    rules: [
      "Set total mine count on the 5x5 grid (1 to 24 mines).",
      "Each safe diamond revealed escalates multiplier exponentially.",
      "Cash out anytime before hitting a mine."
    ]
  },
  {
    id: "video_poker",
    name: "Strategic Jacks or Better",
    category: "table",
    engine: "table",
    minBet: 0.10,
    maxBet: 500,
    payout: "250x Multiplier",
    rtp: "99.2%",
    description: "Hold and draw cards using strategic calculations. Win up to 250x for Royal Flush!",
    icon: "🎰",
    badge: "STRATEGY",
    bgGradient: "from-purple-950 via-slate-950 to-slate-950 border-purple-700/40 text-purple-400",
    artworkUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Video Poker",
    componentFile: "src/components/VideoPokerGame.tsx",
    rules: [
      "Dealt 5 cards initial hand.",
      "Select cards to hold and draw replacements.",
      "Pair of Jacks or Better triggers winning payout scale up to 250x Royal Flush."
    ]
  },
  {
    id: "high_low",
    name: "Interactive High-Low: Neon Streak",
    category: "arcade",
    engine: "arcade",
    minBet: 0.10,
    maxBet: 1500,
    payout: "Streak Built",
    rtp: "97.5%",
    description: "Built for multi-round streak building. Guess if the next card will be Higher or Lower to build massive consecutive multipliers!",
    icon: "📈",
    badge: "STREAK",
    bgGradient: "from-pink-950 via-slate-950 to-slate-950 border-pink-700/40 text-pink-400",
    artworkUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Streak Card",
    componentFile: "src/components/InteractiveHighLow.tsx",
    rules: [
      "Predict whether the next card drawn is higher or lower than current card.",
      "Consecutive correct predictions stack multipliers compounding.",
      "Bank profit at any point during your streak."
    ]
  },
  {
    id: "classic_slots",
    name: "Classic Cosmic Slots",
    category: "slots",
    engine: "slots",
    minBet: 0.10,
    maxBet: 500,
    payout: "150x Multiplier",
    rtp: "97.0%",
    description: "Classic 3-reel neon slots machine with cherries, diamonds, and lucky seven jackpots.",
    icon: "🎰",
    badge: "CLASSIC 🎰",
    bgGradient: "from-amber-950 via-slate-950 to-slate-950 border-amber-700/40 text-amber-400",
    artworkUrl: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Cosmic Neon",
    componentFile: "src/components/SlotsGame.tsx",
    rules: [
      "Select your spin stake from $10 up to $500.",
      "3 matching symbols trigger line multipliers.",
      "Hit triple 7s for the grand 150x jackpot payout."
    ]
  },
  {
    id: "lightning_roulette",
    name: "Live Lightning Roulette",
    category: "live",
    engine: "live",
    minBet: 0.10,
    maxBet: 5000,
    payout: "500x Strike",
    rtp: "97.3%",
    description: "Electrified Live Lightning Roulette with high-voltage multiplier strikes up to 500x on lucky numbers!",
    icon: "⚡",
    badge: "LIVE 500X",
    bgGradient: "from-amber-950 via-yellow-950 to-slate-950 border-amber-500/50 text-amber-400",
    artworkUrl: "https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Lightning Studio",
    componentFile: "src/components/LiveGameStage.tsx",
    rules: [
      "Standard European wheel bets plus Lightning numbers.",
      "1 to 5 lucky numbers get struck with 50x to 500x multipliers.",
      "Straight up lucky number hits pay massive multiplied wins."
    ]
  },
  {
    id: "mega_ball",
    name: "Mega Ball VIP",
    category: "live",
    engine: "live",
    minBet: 0.10,
    maxBet: 1000,
    payout: "1000x Ball",
    rtp: "95.4%",
    description: "Fast-paced Live Mega Ball game show with bouncing multiplier balls drawn live up to 1,000x!",
    icon: "🎱",
    badge: "LIVE 1000X",
    bgGradient: "from-cyan-950 via-blue-950 to-slate-950 border-cyan-500/50 text-cyan-400",
    artworkUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Live Lottery",
    componentFile: "src/components/LiveGameStage.tsx",
    rules: [
      "Buy Mega Ball cards.",
      "20 balls drawn rapidly from live machine.",
      "Final Mega Ball drawn multiplies entire line winnings up to 1,000x."
    ]
  },
  {
    id: "baccarat_squeeze",
    name: "Live Baccarat Squeeze",
    category: "live",
    engine: "live",
    minBet: 0.10,
    maxBet: 5000,
    payout: "Up to 88x",
    rtp: "98.9%",
    description: "High-roller Live Baccarat Squeeze with slow card reveal cameras and live side bets.",
    icon: "👑",
    badge: "LIVE SQUEEZE",
    bgGradient: "from-rose-950 via-slate-950 to-slate-950 border-rose-500/50 text-rose-400",
    artworkUrl: "https://images.unsplash.com/photo-1541278107931-e006523892df?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Luxury Squeeze",
    componentFile: "src/components/LiveGameStage.tsx",
    rules: [
      "Live dealer reveals cards slowly with multi-angle cameras.",
      "Punto Banco rules with Player/Banker/Tie options.",
      "Side bets pay out up to 88:1 on pairs."
    ]
  },
  {
    id: "funky_time",
    name: "Funky Time VIP Wheel",
    category: "live",
    engine: "live",
    minBet: 0.10,
    maxBet: 3000,
    payout: "10,000x Disco",
    rtp: "95.9%",
    description: "Disco-themed multiplier wheel spinning with Stayin' Alive bonus rounds and disco dance floors!",
    icon: "🪩",
    badge: "FUNKY SHOW",
    bgGradient: "from-fuchsia-950 via-purple-950 to-slate-950 border-fuchsia-500/50 text-fuchsia-400",
    artworkUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Disco Show",
    componentFile: "src/components/LiveGameStage.tsx",
    rules: [
      "Digiwheel contains 64 segments.",
      "Bet on PLAY, TIME, DISCO or Stayin' Alive bonus rounds.",
      "Multipliers multiply up to 10,000x on disco bonus floors."
    ]
  },
  {
    id: "live_blackjack",
    name: "Live Blackjack (VIP/Infinite)",
    category: "live",
    engine: "live",
    minBet: 0.10,
    maxBet: 10000,
    payout: "3:2 Payout",
    rtp: "99.3%",
    description: "Infinite seat VIP Live Blackjack with real-time dealer card streaming, insurance & 21+3 side bets.",
    icon: "🃏",
    badge: "LIVE VIP",
    bgGradient: "from-emerald-950 via-slate-950 to-slate-950 border-emerald-500/50 text-emerald-400",
    artworkUrl: "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "VIP Live Table",
    componentFile: "src/components/LiveGameStage.tsx",
    rules: [
      "Infinite seats available at live table.",
      "Side bets: Any Pair and 21+3 poker hands.",
      "Blackjack pays 3:2 with live dealer host."
    ]
  },

  // --- HIGH VOLATILITY SLOTS (Industry Standards) ---
  {
    id: "gates_of_olympus",
    name: "Gates of Olympus",
    category: "slots",
    engine: "slots",
    minBet: 0.10,
    maxBet: 2500,
    payout: "5000x Zeus",
    rtp: "96.5%",
    description: "Strike it rich with Zeus tumbling multipliers and random lightning orb scatters up to 500x!",
    icon: "⚡",
    badge: "HOT SLOT",
    bgGradient: "from-amber-950 via-purple-950 to-slate-950 border-amber-500/50 text-amber-400",
    artworkUrl: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Greek Mythology",
    rules: [
      "8+ matching symbols anywhere on 6x5 grid trigger wins.",
      "Tumble feature replaces winning symbols with new drops.",
      "Zeus randomly drops multiplier orbs from 2x up to 500x."
    ]
  },
  {
    id: "sweet_bonanza",
    name: "Sweet Bonanza",
    category: "slots",
    engine: "slots",
    minBet: 0.10,
    maxBet: 2000,
    payout: "21,100x Bomb",
    rtp: "96.48%",
    description: "Candyland tumble slot machine with rainbow candy bomb multipliers in free spins!",
    icon: "🍬",
    badge: "FEATURED",
    bgGradient: "from-pink-950 via-rose-950 to-slate-950 border-pink-500/50 text-pink-400",
    artworkUrl: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Candy Cascade",
    rules: [
      "Land 8+ matching fruit or candy symbols anywhere on grid.",
      "4 Lollipop Scatters trigger 10 Free Spins with Candy Bombs.",
      "Rainbow candy bombs multiply tumble total up to 100x each."
    ]
  },
  {
    id: "sugar_rush_1000",
    name: "Sugar Rush 1000",
    category: "slots",
    engine: "slots",
    minBet: 0.10,
    maxBet: 2000,
    payout: "25,000x Max",
    rtp: "96.53%",
    description: "7x7 cluster pays grid where repeated winning spots double multiplier spots up to 1024x!",
    icon: "🍭",
    badge: "POPULAR",
    bgGradient: "from-fuchsia-950 via-pink-950 to-slate-950 border-fuchsia-500/50 text-fuchsia-400",
    artworkUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Cluster Pays",
    rules: [
      "Form clusters of 5+ identical gummy symbols.",
      "Winning spots leave multiplier marks starting at 2x.",
      "Subsequent wins on marked spots double multipliers up to 1024x."
    ]
  },
  {
    id: "book_of_dead",
    name: "Book of Dead",
    category: "slots",
    engine: "slots",
    minBet: 0.10,
    maxBet: 1500,
    payout: "5000x Rich",
    rtp: "96.21%",
    description: "Ancient Egyptian tomb adventure slot with expanding scatter symbols in Free Spins!",
    icon: "📖",
    badge: "CLASSIC",
    bgGradient: "from-amber-950 via-yellow-950 to-slate-950 border-amber-500/50 text-amber-400",
    artworkUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Egyptian Adventure",
    rules: [
      "5x3 reel slot with 10 adjustable paylines.",
      "3 Golden Tomb Book symbols trigger 10 Free Spins.",
      "One special symbol is chosen to expand full reel during free spins."
    ]
  },
  {
    id: "baccarat_dragon_7",
    name: "Baccarat Dragon 7",
    category: "table",
    engine: "table",
    minBet: 0.10,
    maxBet: 5000,
    payout: "40:1 Dragon 7",
    rtp: "98.76%",
    description: "Luxury felt Baccarat layout with Player/Banker/Tie plus 40:1 Dragon 7 3-card Banker 7 payout!",
    icon: "🐉",
    badge: "SIDE BET 🐉",
    bgGradient: "from-red-950 via-amber-950 to-slate-950 border-red-500/50 text-red-400",
    artworkUrl: "https://images.unsplash.com/photo-1541278107931-e006523892df?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "High-Roller Felt",
    rules: [
      "Wager on Player (1:1), Banker (0.95:1), Tie (8:1) or Dragon 7 (40:1).",
      "Dragon 7 hits when Banker wins with a 3-card total of 7.",
      "Live card deal animations and roadmap tracking."
    ]
  },
  {
    id: "speed_bingo_80",
    name: "Speed Bingo 80",
    category: "arcade",
    engine: "arcade",
    minBet: 0.10,
    maxBet: 500,
    payout: "100x Full House",
    rtp: "96.50%",
    description: "Fast-paced 80-ball bingo card grid with rapid 35-ball draws and instant pattern detectors!",
    icon: "🎱",
    badge: "RAPID BINGO",
    bgGradient: "from-purple-950 via-pink-950 to-slate-950 border-purple-500/50 text-purple-400",
    artworkUrl: "https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Rapid Lottery",
    rules: [
      "4x4 color-coded 80-ball bingo card matrix.",
      "35 balls drawn rapidly with automatic daubing.",
      "Win on Single Line (10x), Double Line (25x), 4 Corners (15x), or Full House (100x)."
    ]
  },
  {
    id: "san_quentin",
    name: "San Quentin xWays",
    category: "slots",
    engine: "slots",
    minBet: 0.10,
    maxBet: 1000,
    payout: "150,000x Max",
    rtp: "96.03%",
    description: "High-impact prison themed slot featuring xWays, Razor Split reels, and Lockdown Spins!",
    icon: "⛓️",
    badge: "EXTREME HIGH VOL",
    bgGradient: "from-slate-950 via-zinc-900 to-black border-slate-700/50 text-slate-300",
    artworkUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Gritty Action",
    rules: [
      "Enhancer Cells unlock top and bottom row special symbols.",
      "xWays symbols split into matching identical payout icons.",
      "Lockdown Spins feature Jumping Wilds with scaling multipliers."
    ]
  },
  {
    id: "wanted_dead_or_wild",
    name: "Wanted Dead or a Wild",
    category: "slots",
    engine: "slots",
    minBet: 0.10,
    maxBet: 2000,
    payout: "12,500x VS",
    rtp: "96.38%",
    description: "Gritty Western showdown slot featuring VS multiplier duels and Dead Man's Hand bonus!",
    icon: "🤠",
    badge: "WESTERN",
    bgGradient: "from-amber-950 via-orange-950 to-slate-950 border-amber-600/50 text-amber-400",
    artworkUrl: "https://images.unsplash.com/photo-1511193311914-0346f16efe90?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Wild West",
    rules: [
      "5x5 grid with 15 paylines.",
      "VS symbols expand into full reel Wild multipliers (2x to 100x).",
      "Land 3 Great Train Robbery or Dead scatters for free spins."
    ]
  },
  {
    id: "money_train_4",
    name: "Money Train 4",
    category: "slots",
    engine: "slots",
    minBet: 0.10,
    maxBet: 2500,
    payout: "150,000x Cap",
    rtp: "96.10%",
    description: "Cyberpunk heist train slot with Persistent Collector, Payer, and Arms Dealer bonus symbols!",
    icon: "🚂",
    badge: "HEIST",
    bgGradient: "from-red-950 via-zinc-950 to-slate-950 border-red-500/50 text-red-400",
    artworkUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Cyberpunk Train",
    rules: [
      "6x6 cluster pays mechanic with re-spin features.",
      "Money Cart Bonus Round grants 3 re-spins resetting on new symbols.",
      "Persistent character symbols gather, double, or multiply all grid values."
    ]
  },
  {
    id: "razor_returns",
    name: "Razor Returns",
    category: "slots",
    engine: "slots",
    minBet: 0.10,
    maxBet: 2000,
    payout: "100,000x Shark",
    rtp: "96.30%",
    description: "Deep ocean shark slot with Mystery Stacks, Nudge & Reveal, and Razor Reveal Golden Sharks!",
    icon: "🦈",
    badge: "OCEAN SHARK",
    bgGradient: "from-cyan-950 via-blue-950 to-slate-950 border-cyan-500/50 text-cyan-400",
    artworkUrl: "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Undersea Apex",
    rules: [
      "5x5 grid with Mystery Stacks sliding down each spin.",
      "Razor Reveal unveils Instant Cash Coins up to 5000x.",
      "Torpedo Scatters trigger Free Spins with progressive win multipliers."
    ]
  },
  {
    id: "mental",
    name: "Mental",
    category: "slots",
    engine: "slots",
    minBet: 0.10,
    maxBet: 1000,
    payout: "66,666x Meltdown",
    rtp: "96.08%",
    description: "Extreme volatility psychological thrill slot with Fire Frames, Dead Patients, and Mental Transform!",
    icon: "🧠",
    badge: "THRILLER",
    bgGradient: "from-purple-950 via-zinc-950 to-slate-950 border-purple-500/50 text-purple-400",
    artworkUrl: "https://images.unsplash.com/photo-1606167668584-78701c57f13d?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Psycho Thriller",
    rules: [
      "Random positions get Fire Frames splitting symbols into two.",
      "Dead Patient symbols award instant multipliers up to 9999x.",
      "Autopsy & Mental Freespin modes split reels for huge way counts."
    ]
  },
  {
    id: "dead_or_alive_2",
    name: "Dead or Alive II",
    category: "slots",
    engine: "slots",
    minBet: 0.10,
    maxBet: 1500,
    payout: "111,111x Outlaw",
    rtp: "96.82%",
    description: "Legendary Western slot with 3 Free Spin choices: Old Saloon, High Noon Saloon & Train Heist!",
    icon: "🌵",
    badge: "LEGENDARY",
    bgGradient: "from-amber-950 via-yellow-950 to-slate-950 border-amber-500/50 text-amber-400",
    artworkUrl: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Outlaw Showdown",
    rules: [
      "5 reels, 9 paylines with outlaw Wild symbols.",
      "Land 3 Scatter skulls to activate 12 Free Spins.",
      "High Noon Saloon mode features Sticky Wilds with multiplying Wilds."
    ]
  },

  // --- LOTTERY, BINGO & HIGH-EDGE CLASSICS ---
  {
    id: "vip_keno",
    name: "VIP Keno",
    category: "arcade",
    engine: "arcade",
    minBet: 0.10,
    maxBet: 2000,
    payout: "10,000x Match 10",
    rtp: "95.0%",
    description: "Select 1 to 10 lucky numbers on 80-ball grid and watch gold spheres draw in real time!",
    icon: "🎱",
    badge: "LOTTERY",
    bgGradient: "from-emerald-950 via-teal-950 to-slate-950 border-emerald-500/50 text-emerald-400",
    artworkUrl: "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "VIP Keno Lounge",
    rules: [
      "Pick between 1 and 10 spots on 80-ball board.",
      "20 winning balls drawn per game round.",
      "Matching 10/10 numbers awards top 10,000x jackpot."
    ]
  },
  {
    id: "speed_bingo_80_card",
    name: "Speed Bingo 80",
    category: "arcade",
    engine: "arcade",
    minBet: 0.10,
    maxBet: 1500,
    payout: "500x Full House",
    rtp: "95.5%",
    description: "80-ball rapid bingo layout with multi-card purchasing and extra power ball draws!",
    icon: "🎟️",
    badge: "SPEED BINGO",
    bgGradient: "from-purple-950 via-indigo-950 to-slate-950 border-purple-500/50 text-purple-400",
    artworkUrl: "https://images.unsplash.com/photo-1508807526345-15e9b5f4eaff?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Rapid Bingo",
    rules: [
      "Play up to 4 4x4 bingo tickets simultaneously.",
      "Complete lines, patterns, or full house for cash wins.",
      "Buy extra power balls to complete near-miss winning patterns."
    ]
  },
  {
    id: "wheel_of_fortune",
    name: "Wheel of Fortune",
    category: "arcade",
    engine: "arcade",
    minBet: 0.10,
    maxBet: 3000,
    payout: "1000x Grand Spin",
    rtp: "96.0%",
    description: "Classic Vegas fortune wheel with multiplier wedges, jackpot slices, and mystery prizes!",
    icon: "🎡",
    badge: "VEGAS CLASSIC",
    bgGradient: "from-amber-950 via-yellow-950 to-slate-950 border-amber-500/50 text-amber-400",
    artworkUrl: "https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Fortune Wheel",
    rules: [
      "Wager on segment values (1x, 2x, 5x, 10x, 20x, Jackpot).",
      "Golden pointer spins with realistic deceleration.",
      "Landing on Jackpot slice triggers full wheel multiplier payout."
    ]
  },
  {
    id: "sic_bo_pit",
    name: "Sic Bo Triple Pit",
    category: "table",
    engine: "table",
    minBet: 0.10,
    maxBet: 3000,
    payout: "180:1 Triple",
    rtp: "97.2%",
    description: "Authentic 3-dice Asian gaming pit with comprehensive betting layout and illuminated totals!",
    icon: "🎲",
    badge: "DICE PIT",
    bgGradient: "from-red-950 via-rose-950 to-slate-950 border-red-500/50 text-red-400",
    artworkUrl: "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Asian Dice Pit",
    rules: [
      "3 dice rolled under glass dome shaker.",
      "Wager on Small/Big, Single Dice, Combinations, or Specific Triples.",
      "Specific Triples pay out maximum 180:1."
    ]
  },
  {
    id: "craps_trap",
    name: "Craps Seven Trap",
    category: "table",
    engine: "table",
    minBet: 0.10,
    maxBet: 2500,
    payout: "30:1 Hardways",
    rtp: "98.6%",
    description: "Action-packed casino craps table with Pass Line, Come Bets, Odds, and Hardways!",
    icon: "🎲",
    badge: "VEGAS CRAPS",
    bgGradient: "from-emerald-950 via-teal-950 to-slate-950 border-emerald-500/50 text-emerald-400",
    artworkUrl: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Vegas Craps Felt",
    rules: [
      "Come-out roll: 7 or 11 wins Pass Line, 2/3/12 craps out.",
      "Other numbers set Point; hit Point before 7 to win.",
      "Take free odds behind Pass Line with zero house edge."
    ]
  },
  {
    id: "baccarat_dragon_7_pit",
    name: "Baccarat Dragon 7 Pit",
    category: "table",
    engine: "table",
    minBet: 0.10,
    maxBet: 5000,
    payout: "40:1 Dragon 7",
    rtp: "98.9%",
    description: "EZ Baccarat variant featuring Dragon 7 (Banker 3-card total 7) paying 40:1 commission-free!",
    icon: "🐉",
    badge: "NO COMMISSION",
    bgGradient: "from-amber-950 via-rose-950 to-slate-950 border-amber-500/50 text-amber-400",
    artworkUrl: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "EZ Baccarat",
    rules: [
      "Banker wins pay 1:1 with no 5% commission charged.",
      "If Banker wins with a 3-card total of 7, main Banker pushes.",
      "Dragon 7 side bet pays 40:1 when Banker wins with 3-card 7."
    ]
  },
  {
    id: "triple_zero_roulette",
    name: "Triple Zero Vegas Roulette",
    category: "table",
    engine: "table",
    minBet: 0.10,
    maxBet: 5000,
    payout: "35:1 Single",
    rtp: "92.3%",
    description: "High-roller Sands-style Vegas wheel featuring 0, 00, and 000 Sands logo pockets!",
    icon: "🎡",
    badge: "HIGH EDGE",
    bgGradient: "from-yellow-950 via-amber-950 to-slate-950 border-yellow-500/50 text-yellow-400",
    artworkUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Vegas Sands Wheel",
    rules: [
      "39 total wheel pockets (0, 00, 000, and 1-36).",
      "Inside bets pay 35:1 for straight-up number hits.",
      "Outside bets on Red/Black or Odds/Evens lose on any zero."
    ]
  },
  {
    id: "pull_tabs",
    name: "Millionaire Pull Tabs",
    category: "arcade",
    engine: "arcade",
    minBet: 0.10,
    maxBet: 1000,
    payout: "1000x Pull",
    rtp: "95.0%",
    description: "Instant tab-peeling arcade classic with paper tear sounds and golden multiplier symbols!",
    icon: "🎫",
    badge: "PULL TABS",
    bgGradient: "from-cyan-950 via-teal-950 to-slate-950 border-cyan-500/50 text-cyan-400",
    artworkUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Paper Pull Tabs",
    rules: [
      "Buy a pull tab ticket with 5 perforated window strips.",
      "Click or swipe to pull back paper strips.",
      "3 matching symbols under any single tab pays listed cash prize."
    ]
  },
  {
    id: "scratch_gold",
    name: "Scratch & Win Gold",
    category: "arcade",
    engine: "arcade",
    minBet: 0.10,
    maxBet: 1000,
    payout: "2500x Gold",
    rtp: "95.8%",
    description: "Luxury 3x3 scratch card with metallic gold foil layer and instant multiplier reveals!",
    icon: "🪙",
    badge: "INSTANT WIN",
    bgGradient: "from-yellow-950 via-amber-950 to-slate-950 border-yellow-500/50 text-yellow-400",
    artworkUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Gold Foil Scratch",
    rules: [
      "Scratch off 9 gold coin fields on card surface.",
      "Match 3 identical cash values to win instantly.",
      "Golden Horseshoe bonus symbol doubles total card winnings."
    ]
  },
  {
    id: "casino_war_royale",
    name: "Casino War Royale",
    category: "table",
    engine: "table",
    minBet: 0.10,
    maxBet: 2500,
    payout: "10:1 Tie War",
    rtp: "97.1%",
    description: "Fastest high-card game in Vegas. Go to War on ties to claim double stakes!",
    icon: "⚔️",
    badge: "WAR FELT",
    bgGradient: "from-red-950 via-rose-950 to-slate-950 border-red-500/50 text-red-400",
    artworkUrl: "https://images.unsplash.com/photo-1541278107931-e006523892df?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "High Card War",
    rules: [
      "Dealt one card against dealer's single card (Aces high).",
      "If your card is higher, win 1:1 instantly.",
      "On a Tie, surrender half bet or Go to War for 2x payout!"
    ]
  },

  // --- TABLE & CARD FAVORITES ---
  {
    id: "european_roulette",
    name: "European Roulette Single Zero",
    category: "table",
    engine: "table",
    minBet: 0.10,
    maxBet: 5000,
    payout: "35:1 Single",
    rtp: "97.3%",
    description: "Classic 37-pocket European roulette with single zero and low house edge of 2.70%!",
    icon: "🎡",
    badge: "SINGLE ZERO",
    bgGradient: "from-emerald-950 via-teal-950 to-slate-950 border-emerald-500/50 text-emerald-400",
    artworkUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "European Wheel",
    rules: [
      "Single zero pocket (0) plus numbers 1 to 36.",
      "Straight up bets pay 35:1.",
      "Even-money outside bets pay 1:1."
    ]
  },
  {
    id: "american_roulette",
    name: "American Roulette Double Zero",
    category: "table",
    engine: "table",
    minBet: 0.10,
    maxBet: 5000,
    payout: "35:1 Single",
    rtp: "94.74%",
    description: "Classic Vegas 38-pocket wheel featuring 0 and 00 pockets and Five-Number Basket bets!",
    icon: "🎡",
    badge: "DOUBLE ZERO",
    bgGradient: "from-blue-950 via-indigo-950 to-slate-950 border-blue-500/50 text-blue-400",
    artworkUrl: "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "American Wheel",
    rules: [
      "38 pockets: 0, 00, and numbers 1 to 36.",
      "Basket bet covers 0, 00, 1, 2, 3 paying 6:1.",
      "Inside straight-up bets pay 35:1."
    ]
  },
  {
    id: "blackjack_65",
    name: "Classic 6:5 Blackjack",
    category: "table",
    engine: "table",
    minBet: 0.10,
    maxBet: 2500,
    payout: "6:5 Blackjack",
    rtp: "98.6%",
    description: "Single-deck Vegas Strip style Blackjack with 6:5 natural payout and dealer hits soft 17!",
    icon: "🃏",
    badge: "SINGLE DECK",
    bgGradient: "from-slate-950 via-zinc-900 to-black border-slate-700/50 text-slate-300",
    artworkUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Vegas Single Deck",
    rules: [
      "Single 52-card deck shuffled every round.",
      "Natural Blackjack pays 6:5.",
      "Double down allowed on any 2 initial cards."
    ]
  },
  {
    id: "caribbean_stud",
    name: "Caribbean Stud Poker",
    category: "table",
    engine: "table",
    minBet: 0.10,
    maxBet: 2000,
    payout: "100:1 Royal",
    rtp: "97.4%",
    description: "5-Card stud poker against the dealer with Progressive Jackpot side bet option!",
    icon: "🌴",
    badge: "STUD POKER",
    bgGradient: "from-teal-950 via-cyan-950 to-slate-950 border-teal-500/50 text-teal-400",
    artworkUrl: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Tropical Poker",
    rules: [
      "Dealt 5 cards face down; dealer shows 1 upcard.",
      "Raise (2x Ante) or Fold.",
      "Dealer must qualify with Ace-King or better to pay Call bet."
    ]
  },
  {
    id: "three_card_poker",
    name: "Three Card Poker",
    category: "table",
    engine: "table",
    minBet: 0.10,
    maxBet: 2000,
    payout: "40:1 Pair Plus",
    rtp: "98.2%",
    description: "Fast 3-card poker game with Ante Play, Pair Plus side wagers, and 6-Card Bonus!",
    icon: "♠️",
    badge: "3-CARD",
    bgGradient: "from-purple-950 via-pink-950 to-slate-950 border-purple-500/50 text-purple-400",
    artworkUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "3-Card Table",
    rules: [
      "Dealt 3 cards to beat dealer's 3 cards.",
      "Pair Plus bet wins on any Pair or higher regardless of dealer.",
      "Dealer qualifies with Queen high or better."
    ]
  },
  {
    id: "mississippi_stud",
    name: "Mississippi Stud",
    category: "table",
    engine: "table",
    minBet: 0.10,
    maxBet: 1500,
    payout: "500:1 Royal",
    rtp: "98.6%",
    description: "5-card poker table game where players raise on 3 community cards against paytable!",
    icon: "🃏",
    badge: "STUD FELT",
    bgGradient: "from-amber-950 via-yellow-950 to-slate-950 border-amber-500/50 text-amber-400",
    artworkUrl: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Mississippi Poker",
    rules: [
      "Dealt 2 hole cards and 3 face-down community cards.",
      "Bet 1x, 2x, or 3x on 3rd, 4th, and 5th Street.",
      "Pairs of 6s-10s push; Pair of Jacks or better pays according to scale."
    ]
  },
  {
    id: "let_it_ride",
    name: "Let It Ride",
    category: "table",
    engine: "table",
    minBet: 0.10,
    maxBet: 1500,
    payout: "1000:1 Royal",
    rtp: "96.5%",
    description: "5-card poker variant where players can pull back 2 of their 3 bets as community cards reveal!",
    icon: "🏇",
    badge: "RETRACT BETS",
    bgGradient: "from-indigo-950 via-blue-950 to-slate-950 border-indigo-500/50 text-indigo-400",
    artworkUrl: "https://images.unsplash.com/photo-1510519138161-58441d82595d?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "3-Bet Poker",
    rules: [
      "Place 3 equal bets on table.",
      "Look at your 3 cards: Pull back Bet #1 or Let It Ride.",
      "Reveal 1st community card: Pull back Bet #2 or Let It Ride."
    ]
  },
  {
    id: "ultimate_texas_holdem",
    name: "Ultimate Texas Hold'em",
    category: "table",
    engine: "table",
    minBet: 0.10,
    maxBet: 2500,
    payout: "500:1 Royal",
    rtp: "97.8%",
    description: "Heads-up Texas Hold'em against dealer with 4x pre-flop Play bet option and Trips side bet!",
    icon: "🤠",
    badge: "HOLDEM VIP",
    bgGradient: "from-red-950 via-amber-950 to-slate-950 border-red-500/50 text-red-400",
    artworkUrl: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Casino Hold'em",
    rules: [
      "Place Ante and Blind bets.",
      "Pre-flop: Raise 3x/4x or Check.",
      "After Flop: Raise 2x or Check; after Turn/River: Raise 1x or Fold."
    ]
  },
  {
    id: "fortune_pai_gow",
    name: "Fortune Pai Gow",
    category: "table",
    engine: "table",
    minBet: 0.10,
    maxBet: 2000,
    payout: "8000:1 7-Card Straight",
    rtp: "97.3%",
    description: "7-card Asian poker game forming 5-card High and 2-card Low hands against dealer!",
    icon: "🀄",
    badge: "PAI GOW",
    bgGradient: "from-rose-950 via-red-950 to-slate-950 border-rose-500/50 text-rose-400",
    artworkUrl: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Pai Gow Poker",
    rules: [
      "Dealt 7 cards including 1 Joker.",
      "Split into 5-card High hand and 2-card Low hand.",
      "Both hands must beat dealer's corresponding hands to win."
    ]
  },
  {
    id: "hilo_ladder",
    name: "High-Low Ladder",
    category: "arcade",
    engine: "arcade",
    minBet: 0.10,
    maxBet: 1000,
    payout: "100x Ladder",
    rtp: "96.8%",
    description: "Climb the multiplier ladder card by card. Predict Higher or Lower to ascend step payouts!",
    icon: "🪜",
    badge: "LADDER",
    bgGradient: "from-pink-950 via-fuchsia-950 to-slate-950 border-pink-500/50 text-pink-400",
    artworkUrl: "https://images.unsplash.com/photo-1520038410233-7141be7e6f97?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Ladder Step",
    rules: [
      "Start at 1.0x at bottom rung of multiplier ladder.",
      "Correctly predict Higher or Lower to climb 1 rung.",
      "Cash out banked winnings anytime before a wrong guess."
    ]
  },

  // --- INSTANT WIN, ARCADE & MINES ---
  {
    id: "cyber_mines",
    name: "Cyber Mines",
    category: "arcade",
    engine: "arcade",
    minBet: 0.10,
    maxBet: 2000,
    payout: "10,000x Grid",
    rtp: "97.0%",
    description: "5x5 tactical grid. Select mine count (1 to 24) and uncover diamond multipliers!",
    icon: "💣",
    badge: "TACTICAL MINES",
    bgGradient: "from-emerald-950 via-slate-950 to-slate-950 border-emerald-500/50 text-emerald-400",
    artworkUrl: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Cyber Grid",
    rules: [
      "Choose 1 to 24 hidden mines on 25-tile grid.",
      "Click tiles to reveal safe gems and increase cashout value.",
      "Cash out anytime or risk for maximum payout."
    ]
  },
  {
    id: "plinko_golden",
    name: "Vegas Golden Plinko",
    category: "arcade",
    engine: "arcade",
    minBet: 0.10,
    maxBet: 1000,
    payout: "1000x Golden Drop",
    rtp: "98.0%",
    description: "Gold peg pyramid Plinko drop with 16-row depth and customizable Low/Med/High risk modes!",
    icon: "🔵",
    badge: "GOLD PLINKO",
    bgGradient: "from-amber-950 via-yellow-950 to-slate-950 border-amber-500/50 text-amber-400",
    artworkUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Golden Pegs",
    rules: [
      "Select row count (8 to 16) and risk level.",
      "Drop single or multi golden balls down physics pins.",
      "Outer edge buckets award up to 1000x jackpot multipliers."
    ]
  },
  {
    id: "penalty_shootout",
    name: "Penalty Shootout",
    category: "arcade",
    engine: "arcade",
    minBet: 0.10,
    maxBet: 1000,
    payout: "32x Goal Streak",
    rtp: "96.0%",
    description: "Instant arcade soccer penalty kicks! Aim for net corners to stack goal multipliers!",
    icon: "⚽",
    badge: "SOCCER ARCADE",
    bgGradient: "from-emerald-950 via-green-950 to-slate-950 border-emerald-500/50 text-emerald-400",
    artworkUrl: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Penalty Kicks",
    rules: [
      "Choose target zone in goal net (Top Left, Top Right, Center, etc.).",
      "Score goal past goalkeeper to step up multiplier (1.92x to 32x).",
      "Cash out after any successful goal."
    ]
  },
  {
    id: "icefield_climber",
    name: "Icefield Tower Climber",
    category: "arcade",
    engine: "arcade",
    minBet: 0.10,
    maxBet: 1000,
    payout: "150x Summit",
    rtp: "97.0%",
    description: "Cross fragile ice tiles step-by-step. Avoid cracking ice to reach summit payouts!",
    icon: "🧊",
    badge: "TOWER CLIMBER",
    bgGradient: "from-cyan-950 via-sky-950 to-slate-950 border-cyan-500/50 text-cyan-400",
    artworkUrl: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Icefield Crossing",
    rules: [
      "Select grid width (2 to 5 columns) per row.",
      "Step on safe ice tiles to move up row by row.",
      "If ice breaks, wager is lost; cash out anytime."
    ]
  },
  {
    id: "fish_hunter_arcade",
    name: "Golden Fish Hunter Arcade",
    category: "arcade",
    engine: "arcade",
    minBet: 0.10,
    maxBet: 2000,
    payout: "1000x Boss Fish",
    rtp: "96.5%",
    description: "Arcade laser shooter targeting golden dragon fish and deep ocean treasures!",
    icon: "🐠",
    badge: "ARCADE SHOOTER",
    bgGradient: "from-blue-950 via-teal-950 to-slate-950 border-blue-500/50 text-blue-400",
    artworkUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Fish Hunter",
    rules: [
      "Lock on laser canon shots at swimming sea targets.",
      "Common fish pay 2x-20x, Golden Sharks pay 100x-500x.",
      "Defeat Boss Dragon Fish for 1000x grand jackpot reward."
    ]
  },
  {
    id: "limbo_multiplier",
    name: "Limbo Multiplier",
    category: "arcade",
    engine: "arcade",
    minBet: 0.10,
    maxBet: 2500,
    payout: "1,000,000x Target",
    rtp: "98.0%",
    description: "Set target multiplier from 1.01x to 1,000,000x and roll instant high-speed multiplier!",
    icon: "🎯",
    badge: "INSTANT LIMBO",
    bgGradient: "from-fuchsia-950 via-purple-950 to-slate-950 border-fuchsia-500/50 text-fuchsia-400",
    artworkUrl: "https://images.unsplash.com/photo-1543807535-eceef0bc6599?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Limbo Target",
    rules: [
      "Enter target payout multiplier (e.g. 5.00x).",
      "Random result generated instantly.",
      "If generated result >= target, win your target payout."
    ]
  },
  {
    id: "dice_slider",
    name: "Dice Slider",
    category: "arcade",
    engine: "arcade",
    minBet: 0.10,
    maxBet: 2500,
    payout: "99x Roll Over",
    rtp: "98.0%",
    description: "Adjust Roll Over/Roll Under slider probability threshold from 1% to 98% win chance!",
    icon: "🎲",
    badge: "PROBABILITY",
    bgGradient: "from-amber-950 via-orange-950 to-slate-950 border-amber-500/50 text-amber-400",
    artworkUrl: "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Slider Dice",
    rules: [
      "Move slider bar to pick target number (0-100).",
      "Choose Roll Over or Roll Under.",
      "Win payout scales inversely with target probability."
    ]
  },
  {
    id: "hilo_streak",
    name: "Hi-Lo Streak",
    category: "arcade",
    engine: "arcade",
    minBet: 0.10,
    maxBet: 1500,
    payout: "50x Streak",
    rtp: "97.5%",
    description: "Rapid-fire card streak game. Guess higher/lower to build compounding cash multipliers!",
    icon: "🃏",
    badge: "CARD STREAK",
    bgGradient: "from-pink-950 via-rose-950 to-slate-950 border-pink-500/50 text-pink-400",
    artworkUrl: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Card Streak",
    rules: [
      "Guess if next card is higher or lower than base card.",
      "Correct guess increases current round multiplier.",
      "Cash out anytime or risk for higher streak tier."
    ]
  },
  {
    id: "goal_striker",
    name: "Goal Striker Multiplier",
    category: "arcade",
    engine: "arcade",
    minBet: 0.10,
    maxBet: 1000,
    payout: "50x Striker",
    rtp: "96.2%",
    description: "Kick progressive field shots into bonus targets to build striker multiplier combos!",
    icon: "🥅",
    badge: "STRIKER",
    bgGradient: "from-emerald-950 via-teal-950 to-slate-950 border-emerald-500/50 text-emerald-400",
    artworkUrl: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Field Goal",
    rules: [
      "Kick soccer ball towards moving target zones.",
      "Hitting golden bullseye boosts win multiplier.",
      "Cash out bank balance before missing a shot."
    ]
  },
  {
    id: "coin_miner",
    name: "Coin Miner",
    category: "arcade",
    engine: "arcade",
    minBet: 0.10,
    maxBet: 1000,
    payout: "500x Miner",
    rtp: "97.0%",
    description: "Mine gold coins in underground mine shafts while avoiding hazardous rockslides!",
    icon: "⛏️",
    badge: "GOLD MINER",
    bgGradient: "from-yellow-950 via-amber-950 to-slate-950 border-yellow-500/50 text-yellow-400",
    artworkUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Mining Grid",
    rules: [
      "Pick tiles on 5x5 mine shaft grid.",
      "Golden coin pickups increase round multiplier.",
      "Cash out before hitting an explosive rockslide tile."
    ]
  },

  // --- LIVE GAME SHOWS & LIVE CASINO STAGE ---
  {
    id: "crazy_time_live",
    name: "Crazy Time Live",
    category: "live",
    engine: "live",
    minBet: 0.10,
    maxBet: 2500,
    payout: "25,000x Crazy",
    rtp: "96.1%",
    description: "World-famous live game show wheel with Pachinko, Cash Hunt, Coin Flip & Crazy Time bonus worlds!",
    icon: "🎡",
    badge: "LIVE SHOW",
    bgGradient: "from-fuchsia-950 via-pink-950 to-slate-950 border-fuchsia-500/50 text-fuchsia-400",
    artworkUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Game Show",
    rules: [
      "Bet on numbers 1, 2, 5, 10 or 4 distinct bonus rounds.",
      "Top Slot generates a random multiplier for one bet spot.",
      "Bonus rounds deliver interactive multipliers up to 25,000x."
    ]
  },
  {
    id: "monopoly_live",
    name: "Monopoly Live",
    category: "live",
    engine: "live",
    minBet: 0.10,
    maxBet: 2500,
    payout: "10,000x 3D Board",
    rtp: "96.23%",
    description: "Live money wheel show featuring Mr. MONOPOLY and 3D augmented reality board bonus game!",
    icon: "🎩",
    badge: "3D BOARD",
    bgGradient: "from-red-950 via-amber-950 to-slate-950 border-red-500/50 text-red-400",
    artworkUrl: "https://images.unsplash.com/photo-1511193311914-0346f16efe90?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "3D Monopoly",
    rules: [
      "Bet on 1, 2, 5, 10, '2 ROLLS' or '4 ROLLS'.",
      "Landing on 2 or 4 ROLLS takes Mr. MONOPOLY onto 3D board.",
      "Roll dice to collect houses, hotels, and multipliers across board."
    ]
  },
  {
    id: "candyland_live",
    name: "Sweet Bonanza Candyland",
    category: "live",
    engine: "live",
    minBet: 0.10,
    maxBet: 2500,
    payout: "20,000x Candy",
    rtp: "96.48%",
    description: "Live money wheel game show based on Sweet Bonanza with Candy Drop and Sweet Spins bonus!",
    icon: "🍭",
    badge: "CANDYLAND",
    bgGradient: "from-pink-950 via-rose-950 to-slate-950 border-pink-500/50 text-pink-400",
    artworkUrl: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Live Candyland",
    rules: [
      "Wager on 1, 2, 5, Candy Drop, or Sweet Spins.",
      "Candy Drop plays live plinko drop with accumulating multipliers.",
      "Sweet Spins triggers 10 slot spins on live video wall."
    ]
  },
  {
    id: "wonderland_show",
    name: "Adventures Beyond Wonderland",
    category: "live",
    engine: "live",
    minBet: 0.10,
    maxBet: 2000,
    payout: "10,000x Wonders",
    rtp: "96.11%",
    description: "Fairytale live wheel show with Mad Hatter's Tea Party, Caterpillar Mystery, and Walter Wonders!",
    icon: "🎩",
    badge: "WONDERLAND",
    bgGradient: "from-purple-950 via-teal-950 to-slate-950 border-purple-500/50 text-purple-400",
    artworkUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Wonderland Show",
    rules: [
      "Bet on numbers 1, 2, 5, 10 or Wonders segments.",
      "Caterpillar blows bubble multipliers onto wheel.",
      "Mad Hatter Tea Party spins teacups for multiplying payout stacks."
    ]
  },
  {
    id: "dream_catcher",
    name: "Dream Catcher",
    category: "live",
    engine: "live",
    minBet: 0.10,
    maxBet: 2500,
    payout: "7x Multiplier Wheel",
    rtp: "96.58%",
    description: "The original live lucky wheel game with 2x and 7x multiplier segments!",
    icon: "🎡",
    badge: "ORIGINAL WHEEL",
    bgGradient: "from-amber-950 via-orange-950 to-slate-950 border-amber-500/50 text-amber-400",
    artworkUrl: "https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Dream Catcher",
    rules: [
      "Bet on 1, 2, 5, 10, 20, or 40.",
      "Landing on 2x or 7x multiplies all bets and wheel spins again.",
      "Multiple 2x/7x hits compound multipliers exponentially."
    ]
  },
  {
    id: "deal_or_no_deal",
    name: "Deal or No Deal Live",
    category: "live",
    engine: "live",
    minBet: 0.10,
    maxBet: 2000,
    payout: "500x Briefcase",
    rtp: "95.42%",
    description: "Live high-stakes briefcase game show! Top up briefcases and negotiate with the Banker!",
    icon: "💼",
    badge: "BANKER DEAL",
    bgGradient: "from-yellow-950 via-amber-950 to-slate-950 border-yellow-500/50 text-yellow-400",
    artworkUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Briefcase Show",
    rules: [
      "Qualify through vault wheel spin.",
      "Top up selected briefcase value in Top Up round.",
      "Open briefcases in 4 rounds and accept or reject Banker's cash offer."
    ]
  },
  {
    id: "mega_roulette",
    name: "Mega Roulette Multiplier",
    category: "live",
    engine: "live",
    minBet: 0.10,
    maxBet: 5000,
    payout: "500x Mega Straight",
    rtp: "97.30%",
    description: "Single-zero live roulette with up to 5 Mega Lucky Numbers paying up to 500x!",
    icon: "🎡",
    badge: "MEGA ROULETTE",
    bgGradient: "from-emerald-950 via-teal-950 to-slate-950 border-emerald-500/50 text-emerald-400",
    artworkUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Live Mega Roulette",
    rules: [
      "Standard 37-pocket European roulette layout.",
      "1 to 5 Mega Multipliers (50x to 500x) randomly assigned per spin.",
      "Straight-up bets on Mega Lucky numbers pay full multiplier payout."
    ]
  },
  {
    id: "gates_of_olympus_deluxe",
    name: "Gates of Olympus",
    category: "slots",
    engine: "slots",
    minBet: 0.10,
    maxBet: 2500,
    payout: "5,000x Tumble",
    rtp: "96.50%",
    description: "Zeus strikes lightning multi-orbs up to 500x with pay-anywhere tumble mechanics!",
    icon: "⚡",
    badge: "ZEUS MULTI",
    bgGradient: "from-amber-950 via-purple-950 to-slate-950 border-amber-500/50 text-amber-400",
    artworkUrl: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Greek Mythology",
    componentFile: "src/components/games/GatesOfOlympusGame.tsx",
    rules: [
      "Pay anywhere 6x5 grid with tumble cascade wins.",
      "Zeus randomly drops Orb Multipliers from 2x up to 500x.",
      "Global multiplier accumulates in Free Spins."
    ]
  },
  {
    id: "sweet_bonanza_deluxe",
    name: "Sweet Bonanza",
    category: "slots",
    engine: "slots",
    minBet: 0.10,
    maxBet: 2000,
    payout: "21,100x Candy",
    rtp: "96.51%",
    description: "Sugar-coated tumbling reels with rainbow bomb multipliers up to 100x!",
    icon: "🍭",
    badge: "CANDY BOMB",
    bgGradient: "from-pink-950 via-rose-950 to-slate-950 border-pink-500/50 text-pink-400",
    artworkUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Candy World",
    componentFile: "src/components/games/SweetBonanzaGame.tsx",
    rules: [
      "8+ matching candy symbols pay anywhere on screen.",
      "Lollipop scatters trigger Free Spins mode.",
      "Rainbow bomb multipliers multiply total cascade win."
    ]
  },
  {
    id: "sugar_rush_1000_v2",
    name: "Sugar Rush 1000",
    category: "slots",
    engine: "slots",
    minBet: 0.10,
    maxBet: 2500,
    payout: "25,000x Peak",
    rtp: "96.53%",
    description: "Cluster pays 7x7 grid slot machine with persistent multiplier spots stacking up to 1,024x!",
    icon: "🍬",
    badge: "1024x SPOTS",
    bgGradient: "from-fuchsia-950 via-purple-950 to-slate-950 border-fuchsia-500/50 text-fuchsia-400",
    artworkUrl: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Gummy Bear Land",
    componentFile: "src/components/games/SugarRush1000Game.tsx",
    rules: [
      "Cluster wins of 5+ adjacent gummy symbols.",
      "Winning spots mark grid and double multipliers with each tumble up to 1024x.",
      "Multiplier spots remain locked across all Free Spins."
    ]
  },
  {
    id: "american_roulette_vip",
    name: "American Roulette VIP",
    category: "table",
    engine: "table",
    minBet: 0.10,
    maxBet: 5000,
    payout: "35:1 Straight",
    rtp: "94.74%",
    description: "Classic double-zero 38-pocket Vegas roulette wheel with high-limit betting sectors.",
    icon: "🎡",
    badge: "38 POCKET",
    bgGradient: "from-red-950 via-slate-950 to-black border-red-500/50 text-red-400",
    artworkUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Vegas Strip Roulette",
    componentFile: "src/components/games/AmericanRouletteGame.tsx",
    rules: [
      "Features 0 and 00 double-zero pockets.",
      "Straight-up bets pay 35:1 payout.",
      "Offers Red/Black, Odd/Even, Dozens, and Split wagers."
    ]
  },
  {
    id: "wanted_dead_or_a_wild",
    name: "Wanted Dead or a Wild",
    category: "slots",
    engine: "slots",
    minBet: 0.10,
    maxBet: 2500,
    payout: "12,500x VS Multiplier",
    rtp: "96.38%",
    description: "Dark gritty Wild West outlaw slot featuring VS Duel Multipliers, The Great Train Robbery & Dead Man's Hand!",
    icon: "🤠",
    badge: "VS DUEL",
    bgGradient: "from-amber-950 via-red-950 to-slate-950 border-amber-500/50 text-amber-400",
    artworkUrl: "https://images.unsplash.com/photo-1511193311914-0346f16efe90?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Dark Outlaw West",
    componentFile: "src/components/games/WantedDeadOrAWildGame.tsx",
    rules: [
      "VS symbols expand into Duel Wild reels with up to 100x multipliers.",
      "The Great Train Robbery awards sticky Wild spins.",
      "Dead Man's Hand collects Wilds and multipliers for showdown."
    ]
  },
  {
    id: "classic_65_blackjack",
    name: "Classic 6:5 Blackjack",
    category: "table",
    engine: "table",
    minBet: 0.10,
    maxBet: 5000,
    payout: "6:5 Natural 21",
    rtp: "98.8%",
    description: "High-roller single-deck Vegas Strip 21 table with Insurance and Double Down.",
    icon: "🃏",
    badge: "6:5 VEGAS",
    bgGradient: "from-emerald-950 via-green-950 to-slate-950 border-emerald-500/50 text-emerald-400",
    artworkUrl: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Vegas Felt 21",
    componentFile: "src/components/games/Classic65BlackjackGame.tsx",
    rules: [
      "Dealer stands on all 17s.",
      "Natural Blackjack pays 6:5 payout.",
      "Double down on any initial two-card total."
    ]
  },
  {
    id: "razor_returns_v2",
    name: "Razor Returns",
    category: "slots",
    engine: "slots",
    minBet: 0.10,
    maxBet: 2500,
    payout: "100,000x Max",
    rtp: "96.55%",
    description: "Deep sea shark slot machine featuring Mystery Stacks, Razor Reveal coins, Converter symbols & Torpedo Free Spins!",
    icon: "🦈",
    badge: "100K x SHARK",
    bgGradient: "from-cyan-950 via-blue-950 to-slate-950 border-cyan-500/50 text-cyan-400",
    artworkUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Deep Sea Ocean",
    componentFile: "src/components/games/RazorReturnsGame.tsx",
    rules: [
      "Mystery Stacks nudge down each spin revealing matching symbols.",
      "Razor Reveal triggers Golden Shark coins up to 5000x.",
      "Torpedo Scatters launch Free Spins with increasing global multiplier."
    ]
  },
  {
    id: "san_quentin_v2",
    name: "San Quentin xWays",
    category: "slots",
    engine: "slots",
    minBet: 0.10,
    maxBet: 2000,
    payout: "150,000x Psycho",
    rtp: "96.03%",
    description: "Extreme high-volatility prison slot with Enhancer Cells, xWays, Split Wilds, and Lockdown Spins!",
    icon: "⛓️",
    badge: "150,000x MAX",
    bgGradient: "from-slate-900 via-rose-950 to-slate-950 border-rose-500/50 text-rose-400",
    artworkUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Prison Outbreak",
    componentFile: "src/components/games/SanQuentinGame.tsx",
    rules: [
      "Enhancer Cells open top and bottom positions to unlock Razor Split & xWays.",
      "Split Wilds divide paylines into massive ways.",
      "Lockdown Spins feature jumping Wilds with scaling multipliers."
    ]
  },
  {
    id: "european_roulette_single_zero",
    name: "European Roulette Single Zero",
    category: "table",
    engine: "table",
    minBet: 0.10,
    maxBet: 5000,
    payout: "35:1 Single Zero",
    rtp: "97.30%",
    description: "Classic 37-pocket single zero roulette table with lowest house edge and racetrack bets.",
    icon: "🎡",
    badge: "SINGLE ZERO",
    bgGradient: "from-emerald-950 via-teal-950 to-slate-950 border-emerald-500/50 text-emerald-400",
    artworkUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Monte Carlo Casino",
    componentFile: "src/components/games/EuropeanRouletteGame.tsx",
    rules: [
      "Single 0 pocket provides optimal 97.3% RTP.",
      "Includes Racetrack for Voisins, Tiers, and Orphelins bets.",
      "Straight-up bets pay 35:1 payout."
    ]
  },
  {
    id: "book_of_dead_deluxe",
    name: "Book of Dead Deluxe",
    category: "slots",
    engine: "slots",
    minBet: 0.10,
    maxBet: 2500,
    payout: "5,000x Tomb",
    rtp: "96.21%",
    description: "Uncover sacred Egyptian tombs and expanding hieroglyph wild symbols for 5,000x payouts.",
    icon: "📜",
    badge: "EXPANDING WILDS",
    bgGradient: "from-amber-950 via-yellow-950 to-slate-950 border-amber-500/50 text-amber-400",
    artworkUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Egyptian Tomb",
    componentFile: "src/components/games/BookOfDeadGame.tsx",
    rules: [
      "3 Book scatters trigger 10 Free Spins.",
      "One special symbol selected to expand across entire reels during Free Spins.",
      "Books act as both Scatter and Wild symbols."
    ]
  },
  {
    id: "baccarat_dragon_7_vip",
    name: "Baccarat Dragon 7 VIP",
    category: "table",
    engine: "table",
    minBet: 0.10,
    maxBet: 10000,
    payout: "40:1 Dragon 7",
    rtp: "98.94%",
    description: "Asian VIP Baccarat table featuring 40:1 Dragon 7 and 25:1 Panda 8 side bets.",
    icon: "🐉",
    badge: "DRAGON 7 🐉",
    bgGradient: "from-red-950 via-amber-950 to-slate-950 border-red-500/50 text-red-400",
    artworkUrl: "https://images.unsplash.com/photo-1508807526345-15e9b5f4eaff?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Asian VIP Salon",
    componentFile: "src/components/games/BaccaratDragon7Game.tsx",
    rules: [
      "Standard Player / Banker / Tie Baccarat rules.",
      "Dragon 7 side bet pays 40:1 when Banker wins with a 3-card total of 7.",
      "Panda 8 side bet pays 25:1 when Player wins with a 3-card total of 8."
    ]
  },
  {
    id: "speed_bingo_80_turbo",
    name: "Speed Bingo 80 Turbo",
    category: "arcade",
    engine: "arcade",
    minBet: 0.10,
    maxBet: 1000,
    payout: "800x Full Card",
    rtp: "96.80%",
    description: "Turbo-charged 80-ball bingo draw with instant pattern multipliers.",
    icon: "🎱",
    badge: "RAPID BINGO",
    bgGradient: "from-cyan-950 via-blue-950 to-slate-950 border-cyan-500/50 text-cyan-400",
    artworkUrl: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80",
    popularity: 5,
    status: "Playable",
    theme: "Rapid Bingo Shaker",
    componentFile: "src/components/games/SpeedBingo80Game.tsx",
    rules: [
      "80-ball shaker drops balls at lightning speed.",
      "Mark lines, corners, and full house patterns for massive multipliers.",
      "Multi-card tickets supported simultaneously."
    ]
  }
];

// Lookup Map for active games
const GAME_MAP = new Map<string, GameConfig>();

function initGameMap() {
  if (GAME_MAP.size === 0) {
    ALL_NEXASPIN_GAMES.forEach((g) => {
      GAME_MAP.set(g.id, g);
      GAME_MAP.set(g.id.toLowerCase(), g);
      GAME_MAP.set(g.id.toLowerCase().replace(/[^a-z0-9]/g, ""), g);
      GAME_MAP.set(g.name.toLowerCase().replace(/[^a-z0-9]/g, ""), g);
    });
  }
}

/**
 * Retrieve registered game by ID or normalized string name
 */
export function getRegisteredGame(idOrName: string): GameConfig | null {
  if (!idOrName) return null;
  initGameMap();
  
  const exact = GAME_MAP.get(idOrName) || GAME_MAP.get(idOrName.toLowerCase());
  if (exact) return exact;

  const normalized = idOrName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const foundNorm = GAME_MAP.get(normalized);
  if (foundNorm) return foundNorm;

  // Match normalized id or name across ALL_NEXASPIN_GAMES
  for (const game of ALL_NEXASPIN_GAMES) {
    const gameNormId = game.id.toLowerCase().replace(/[^a-z0-9]/g, "");
    const gameNormName = game.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (gameNormId === normalized || gameNormName === normalized || normalized.includes(gameNormId) || gameNormId.includes(normalized)) {
      return game;
    }
  }

  return null;
}

/**
 * Dynamic Game Registry Generator for scalable 1000+ casino catalog expansion.
 * All items in expanded catalog use one of our 5 fully-coded modular engines (crash, slots, table, arcade, live).
 */
export function generateExpandedCatalog(count: number = 1000): GameConfig[] {
  const games: GameConfig[] = [...ACTIVE_NEXASPIN_GAMES];
  
  if (games.length >= count) return games.slice(0, count);

  const categories: GameCategory[] = ["crash", "slots", "table", "arcade", "live"];
  const engines: Record<GameCategory, GameEngine> = {
    crash: "crash",
    slots: "slots",
    table: "table",
    arcade: "arcade",
    live: "live"
  };

  const themes = [
    "Cyberpunk", "Cosmic", "Golden Pharaoh", "Neon Nights", "Vegas High-Roller",
    "Dragon Fortune", "Irish Clover", "Pirate Treasure", "Imperial Dynasty", "Quantum Physics"
  ];

  const artworkUrls = [
    "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1511193311914-0346f16efe90?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80"
  ];

  for (let i = games.length + 1; i <= count; i++) {
    const category = categories[i % categories.length];
    const theme = themes[i % themes.length];
    const engine = engines[category];
    const minBet = 0.10;
    const maxBet = minBet * [50, 100, 200, 500][i % 4];
    const payoutMult = [50, 100, 250, 500, 1000, 2500][i % 6];

    games.push({
      id: `catalog_game_${i}`,
      name: `${theme} ${category.toUpperCase()} #${i}`,
      category,
      engine,
      minBet,
      maxBet,
      payout: `${payoutMult}x Max`,
      rtp: `${(95.5 + (i % 35) * 0.1).toFixed(1)}%`,
      description: `Experience ${theme} styled high-roller ${category} action with up to ${payoutMult}x multipliers.`,
      icon: category === "crash" ? "🚀" : category === "slots" ? "🎰" : category === "table" ? "🃏" : category === "live" ? "🎥" : "⚡",
      badge: i % 10 === 0 ? "NEW" : i % 15 === 0 ? "VIP" : undefined,
      bgGradient: "from-slate-900 via-purple-950 to-slate-950 border-purple-500/30 text-purple-300",
      artworkUrl: artworkUrls[i % artworkUrls.length],
      popularity: 3 + (i % 3),
      status: "Playable",
      theme,
      componentFile: `src/components/engines/${engine.charAt(0).toUpperCase() + engine.slice(1)}Engine.tsx`,
      rules: [
        `Adjust your wager within $${minBet} to $${maxBet} chips.`,
        `RTP set at ${(95.5 + (i % 35) * 0.1).toFixed(1)}% with house edge verification.`,
        `Max achievable jackpot win multiplier is ${payoutMult}x.`
      ]
    });
  }

  return games;
}

export const ALL_NEXASPIN_GAMES = generateExpandedCatalog(1000);

// Global RTP State Management
export const DEFAULT_GLOBAL_RTP = 5.0; // 5.0% Default Win Ratio (95.0% House Edge)
export const BASELINE_GLOBAL_RTP = 95.0; // Baseline reference RTP

/**
 * Retrieve the current Master Casino Global Win Ratio / RTP (defaults to 5.0%)
 */
export function getGlobalRtp(): number {
  if (typeof window === "undefined") return DEFAULT_GLOBAL_RTP;
  const stored = localStorage.getItem("casino_global_rtp") || localStorage.getItem("casino_custom_win_ratio") || localStorage.getItem("casino_global_win_ratio");
  if (stored) {
    const parsed = parseFloat(stored);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
      return parsed;
    }
  }
  return DEFAULT_GLOBAL_RTP;
}

/**
 * Update the Master Casino Global Win Ratio / RTP in real-time across all running games
 */
export function setGlobalRtp(val: number): void {
  if (typeof window === "undefined") return;
  const sanitized = Math.max(1, Math.min(100, val));
  localStorage.setItem("casino_global_rtp", sanitized.toString());
  localStorage.setItem("casino_custom_win_ratio", sanitized.toString());
  localStorage.setItem("casino_global_win_ratio", sanitized.toString());

  // Dispatch custom events for real-time listener updates
  window.dispatchEvent(new CustomEvent("global_rtp_updated", { detail: { globalRtp: sanitized } }));
  window.dispatchEvent(new Event("system_config_updated"));
  window.dispatchEvent(new Event("storage"));
}

/**
 * Calculate effective RTP dynamically scaling game base RTP with global casino win ratio
 */
export function getEffectiveRtp(gameConfigRtp?: string | number, overrideGlobalRtp?: number): number {
  const currentGlobal = overrideGlobalRtp !== undefined ? overrideGlobalRtp : getGlobalRtp();
  if (gameConfigRtp) {
    const gameBase = typeof gameConfigRtp === "number" ? gameConfigRtp : (parseFloat(String(gameConfigRtp)) || 95.0);
    return +(gameBase * (currentGlobal / BASELINE_GLOBAL_RTP)).toFixed(2);
  }
  return currentGlobal;
}

