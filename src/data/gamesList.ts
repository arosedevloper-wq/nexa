// 1000-Game Neon Casino Catalog Database
// Algorithmic high-fidelity list of exactly 1,000 premium casino games with distinct metadata.
import { ACTIVE_NEXASPIN_GAMES, GameConfig } from "./gameData";

export interface CasinoGame {
  id: string;
  name: string;
  category: "slots" | "table" | "instant" | "live" | "exotic" | "lottery" | "originals" | "arcade";
  theme: string;
  description: string;
  minBet: number;
  maxBet: number;
  jackpot: number;
  multiplier: string;
  popularity: number; // 1-5 stars
  bgGradient: string;
  textColor: string;
  icon: string;
  badge?: string;
  status: "Playable" | "VIP Locked" | "Under Maintenance";
  artworkUrl?: string;
  characterTag?: string;
}

const CATEGORIES: Array<"slots" | "table" | "instant" | "live" | "exotic"> = [
  "slots", "table", "instant", "live", "exotic"
];

const EMOTE_MAP: Record<string, string> = {
  slots: "🎰",
  table: "🃏",
  instant: "⚡",
  live: "🎥",
  exotic: "🔮"
};

const THEMES = [
  { prefix: "Cosmic", suffix: "Reels", category: "slots" },
  { prefix: "Pharaoh's", suffix: "Gold", category: "slots" },
  { prefix: "Neon", suffix: "Blaze", category: "slots" },
  { prefix: "Retro", suffix: "Fruit", category: "slots" },
  { prefix: "Cyberpunk", suffix: "Spins", category: "slots" },
  { prefix: "Viking", suffix: "Thrones", category: "slots" },
  { prefix: "Pirate", suffix: "Plunder", category: "slots" },
  { prefix: "Wild West", suffix: "Saloon", category: "slots" },
  { prefix: "Diamond", suffix: "Deluxe", category: "slots" },
  { prefix: "Cleopatra's", suffix: "Secret", category: "slots" },
  { prefix: "Aztec", suffix: "Treasure", category: "slots" },
  { prefix: "Irish", suffix: "Leprechaun", category: "slots" },
  { prefix: "Golden", suffix: "Dragon", category: "slots" },
  { prefix: "Candy", suffix: "Bonanza", category: "slots" },
  { prefix: "Undersea", suffix: "Pearl", category: "slots" },
  { prefix: "Olympic", suffix: "Gods", category: "slots" },
  { prefix: "Joker's", suffix: "Wild", category: "slots" },
  { prefix: "Lucky", suffix: "Seven", category: "slots" },
  { prefix: "Chrono", suffix: "Shift", category: "slots" },
  { prefix: "Infinity", suffix: "Jackpot", category: "slots" },

  { prefix: "High-Stakes", suffix: "Blackjack", category: "table" },
  { prefix: "European", suffix: "Roulette", category: "table" },
  { prefix: "Baccarat", suffix: "Squeeze", category: "table" },
  { prefix: "Classic", suffix: "Craps", category: "table" },
  { prefix: "Royal", suffix: "Texas Hold'em", category: "table" },
  { prefix: "Caribbean", suffix: "Stud Poker", category: "table" },
  { prefix: "Three-Card", suffix: "Monte", category: "table" },
  { prefix: "Vegas Strip", suffix: "Blackjack", category: "table" },
  { prefix: "Double Exposure", suffix: "Blackjack", category: "table" },
  { prefix: "American", suffix: "Roulette", category: "table" },

  { prefix: "Lightning", suffix: "Coin Flip", category: "instant" },
  { prefix: "Neon", suffix: "Plinko", category: "instant" },
  { prefix: "Retro", suffix: "Mines", category: "instant" },
  { prefix: "Quantum", suffix: "Hi-Lo", category: "instant" },
  { prefix: "Diamond", suffix: "Scratch", category: "instant" },
  { prefix: "Cyber", suffix: "Crash", category: "instant" },
  { prefix: "Royal", suffix: "Wheel", category: "instant" },
  { prefix: "Dice", suffix: "Duels", category: "instant" },
  { prefix: "Keno", suffix: "Blast", category: "instant" },
  { prefix: "Lucky", suffix: "Ball", category: "instant" },

  { prefix: "Live", suffix: "Dealers", category: "live" },
  { prefix: "VIP Host", suffix: "Lounge", category: "live" },
  { prefix: "Vegas Vance", suffix: "Showdown", category: "live" },
  { prefix: "NexaSpin VIP", suffix: "Dealer Table", category: "live" },
  { prefix: "Immersive", suffix: "Casino Live", category: "live" },

  { prefix: "Solar", suffix: "Eclipse", category: "exotic" },
  { prefix: "Interstellar", suffix: "Plunge", category: "exotic" },
  { prefix: "Quantum", suffix: "Tangle", category: "exotic" },
  { prefix: "Matrix", suffix: "Overdrive", category: "exotic" },
  { prefix: "Abyssal", suffix: "Depths", category: "exotic" }
];

const GRADIENTS = [
  "from-slate-900 to-zinc-950 border-slate-800 text-slate-300",
  "from-fuchsia-950 via-purple-950 to-slate-950 border-fuchsia-800 text-fuchsia-400",
  "from-cyan-950 via-teal-950 to-slate-950 border-cyan-800 text-cyan-400",
  "from-amber-950 via-yellow-950 to-slate-950 border-amber-800 text-amber-400",
  "from-emerald-950 via-green-950 to-slate-950 border-emerald-800 text-emerald-400",
  "from-indigo-950 via-violet-950 to-slate-950 border-indigo-800 text-indigo-400",
  "from-rose-950 via-pink-950 to-slate-950 border-rose-800 text-rose-400",
  "from-sky-950 via-blue-950 to-slate-950 border-sky-800 text-sky-400"
];

const DESCRIPTIONS: Record<string, string[]> = {
  slots: [
    "Spin matching futuristic paylines to trigger triple bonuses.",
    "Unearth legendary multipliers hidden within ancient reels.",
    "A gorgeous neon-styled slot machine with expanding scatter symbols.",
    "Action-packed classic cherry fruit lines with high-roller odds."
  ],
  table: [
    "Challenge the dealer head-on with classic 21 strategy.",
    "Place chip stacks on numbers, splits, and hot colors.",
    "Play your cards right in this high-tension, high-limit showdown.",
    "A pure mechanical simulator of premium European table rules."
  ],
  instant: [
    "A super fast double-or-nothing heads-tails flip generator.",
    "Guide the ball through glowing pegs to hit multiplier pockets.",
    "Uncover gem matrices while evading explosive mines.",
    "Guess if the next draw is higher or lower to build streaks."
  ],
  live: [
    "Interact with real-time video feeds and luxury neon tables.",
    "High-class lounge streams hosted by pro VIP high-rollers.",
    "Vegas Vance's exclusive live broadcast seat. Grab your chips!",
    "Chariot racing and direct dice rolls with beautiful UI layouts."
  ],
  exotic: [
    "A cosmic visualizer where your odds shift with planetary alignments.",
    "Sling retro laser projectiles into lucky target fields.",
    "Unorthodox betting grid incorporating standard multi-reels.",
    "Unlock extreme high-multiplier levels by navigating stellar orbits."
  ]
};

export const PHOTOREALISTIC_ARTWORKS = [
  { url: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=800&q=80", tag: "Sensual Jet Pilot" },
  { url: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80", tag: "Diamond Dust Siren" },
  { url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80", tag: "Cyberpunk Siren" },
  { url: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80", tag: "Jungle Gold Temptress" },
  { url: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80", tag: "Cabaret Hostess" },
  { url: "https://images.unsplash.com/photo-1511193311914-0346f16efe90?auto=format&fit=crop&w=800&q=80", tag: "Alluring Velvet Queen" },
  { url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80", tag: "Genie Temptress" },
  { url: "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&w=800&q=80", tag: "Knockout VIP Siren" },
  { url: "https://images.unsplash.com/photo-1606167668584-78701c57f13d?auto=format&fit=crop&w=800&q=80", tag: "Royal Desi Empress" },
  { url: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=800&q=80", tag: "Midnight Spade Siren" },
  { url: "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=800&q=80", tag: "Dragon Temptress" },
  { url: "https://images.unsplash.com/photo-1508807526345-15e9b5f4eaff?auto=format&fit=crop&w=800&q=80", tag: "Silk Glove Squeeze" },
  { url: "https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?auto=format&fit=crop&w=800&q=80", tag: "Ruby Dice Siren" },
  { url: "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=800&q=80", tag: "Gold Pawn Queen" },
  { url: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80", tag: "Foil Scratch Vixen" },
  { url: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80", tag: "Dazzling Gem Empress" },
  { url: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=800&q=80", tag: "Golden Cash Goddess" },
  { url: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80", tag: "Laser Mermaid Siren" },
  { url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80", tag: "Cyber Diamond Siren" },
  { url: "https://images.unsplash.com/photo-1541278107931-e006523892df?auto=format&fit=crop&w=800&q=80", tag: "Royal Flush Velvet Siren" },
  { url: "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&w=800&q=80", tag: "Gilded Vegas Dealer" },
  { url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80", tag: "Neon Disco Diva" },
  { url: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80", tag: "Sultry Poker Dealer" },
  { url: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80", tag: "Neon Nights Siren" },
  { url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80", tag: "Cosmic Starlight Goddess" },
  { url: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80", tag: "Golden Empress Dealer" },
  { url: "https://images.unsplash.com/photo-1510519138161-58441d82595d?auto=format&fit=crop&w=800&q=80", tag: "Cyber Matrix Queen" },
  { url: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=800&q=80", tag: "High Roller Tuxedo Dealer" },
  { url: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80", tag: "Vegas VIP Showgirl" },
  { url: "https://images.unsplash.com/photo-1520038410233-7141be7e6f97?auto=format&fit=crop&w=800&q=80", tag: "Glitzy Casino Siren" },
  { url: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80", tag: "Emerald Velvet Temptress" },
  { url: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80", tag: "Neon Party Hostess" },
  { url: "https://images.unsplash.com/photo-1543807535-eceef0bc6599?auto=format&fit=crop&w=800&q=80", tag: "Crimson Velvet Dealer" },
  { url: "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=800&q=80", tag: "Velvet Stage Siren" },
  { url: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=800&q=80", tag: "Gold Glitter Empress" }
];

function generate1000Games(): CasinoGame[] {
  const games: CasinoGame[] = [];

  // 1. Populate all Active NexaSpin Games from central gameData registry
  ACTIVE_NEXASPIN_GAMES.forEach((ag) => {
    const catMap: Record<string, "slots" | "table" | "instant" | "live" | "exotic"> = {
      crash: "instant",
      slots: "slots",
      table: "table",
      arcade: "instant",
      live: "live",
    };

    games.push({
      id: ag.id,
      name: ag.name || ag.id,
      category: catMap[ag.category] || "slots",
      theme: ag.theme || (ag.name ? ag.name.split(" ")[0] : "Casino"),
      description: ag.description || "Exciting high-stakes casino game with massive payouts.",
      minBet: ag.minBet !== undefined ? ag.minBet : 0.10,
      maxBet: ag.maxBet || 1000,
      jackpot: (ag.maxBet || 1000) * 50,
      multiplier: ag.payout || "100x",
      popularity: ag.popularity || 5,
      bgGradient: ag.bgGradient || "from-amber-950 via-slate-950 to-slate-950 border-amber-700/40 text-amber-400",
      textColor: "text-amber-400",
      icon: ag.icon || "🎰",
      badge: ag.badge,
      status: ag.status || "Playable",
      artworkUrl: ag.artworkUrl,
    });
  });

  // 2. Generate remaining games algorithmically to reach exactly 1,000 games
  let idCounter = 1;
  while (games.length < 1000) {
    const category = CATEGORIES[idCounter % CATEGORIES.length];
    
    // Choose theme pair
    const themeObj = THEMES[idCounter % THEMES.length];
    const name = `${themeObj.prefix} ${themeObj.suffix} #${10 + Math.floor(idCounter / 5)}`;
    
    // Check for duplicates
    if (games.some(g => g.name === name)) {
      idCounter++;
      continue;
    }

    const minBet = 0.10;
    const maxBet = [500, 1000, 2500, 5000][idCounter % 4];
    const jackpot = maxBet * 50;
    
    const multipliers: Record<string, string[]> = {
      slots: ["80x", "120x", "250x", "500x", "1000x"],
      table: ["2.0x", "3.0x", "11:1 Odds", "35:1 Single"],
      instant: ["1.98x", "5.0x", "10x Win", "100x Peak"],
      live: ["1.95x", "2.0x Match", "50x Grand"],
      exotic: ["10x", "50x Orbit", "200x Nebula", "1000x Supernova"]
    };

    const multiplierList = multipliers[category] || ["2.0x"];
    const mult = multiplierList[idCounter % multiplierList.length];

    const descList = DESCRIPTIONS[category] || ["A beautiful, high-limit modern casino game."];
    const desc = descList[idCounter % descList.length];

    const isVip = false;
    const status = "Playable";

    const pop = 3 + (idCounter % 3); // 3, 4, 5 stars
    const gradient = GRADIENTS[idCounter % GRADIENTS.length];

    // Badge allocation
    let badge: string | undefined = undefined;
    if (idCounter % 20 === 0) badge = "JACKPOT";
    else if (idCounter % 29 === 0) badge = "NEW";
    else if (idCounter % 15 === 0) badge = "ORIGINAL";
    else if (isVip) badge = "VIP 👑";

    games.push({
      id: `game-generated-${idCounter}`,
      name,
      category,
      theme: themeObj.prefix,
      description: desc,
      minBet,
      maxBet,
      jackpot,
      multiplier: mult,
      popularity: pop,
      bgGradient: gradient,
      textColor: gradient.includes("text-") ? gradient.split(" ").find(x => x.startsWith("text-")) || "text-white" : "text-white",
      icon: EMOTE_MAP[category] || "🎯",
      badge,
      status
    });

    idCounter++;
  }

  // Ensure every game card has its own photorealistic artwork & tag
  return games.map((game, idx) => {
    const art = PHOTOREALISTIC_ARTWORKS[idx % PHOTOREALISTIC_ARTWORKS.length];
    return {
      ...game,
      artworkUrl: game.artworkUrl || art.url,
      characterTag: game.characterTag || art.tag
    };
  });
}

export const CASINO_GAMES_CATALOG = generate1000Games();

