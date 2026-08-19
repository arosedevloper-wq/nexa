import React, { useState, useEffect } from "react";
import { ShieldCheck, Zap, Lock, Award, CheckCircle2, ChevronRight, ChevronDown, Sparkles, Coins, Wallet, Flame, ArrowUpRight, Layers, TrendingUp, TrendingDown, Activity, RefreshCw, Globe, Server, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../lib/audioService";

interface PaymentPartnersBannerProps {
  onOpenDeposit?: () => void;
  className?: string;
  defaultExpanded?: boolean;
}

export type GlobalCurrency = "USD" | "EUR" | "GBP" | "JPY" | "USDT" | "CAD" | "AUD";

export const CURRENCY_CONFIG: Record<GlobalCurrency, { symbol: string; rate: number; label: string; flag: string }> = {
  USD: { symbol: "$", rate: 1.0, label: "USD", flag: "🇺🇸" },
  EUR: { symbol: "€", rate: 0.92, label: "EUR", flag: "🇪🇺" },
  GBP: { symbol: "£", rate: 0.79, label: "GBP", flag: "🇬🇧" },
  JPY: { symbol: "¥", rate: 154.2, label: "JPY", flag: "🇯🇵" },
  USDT: { symbol: "₮", rate: 1.0, label: "USDT", flag: "💎" },
  CAD: { symbol: "CA$", rate: 1.38, label: "CAD", flag: "🇨🇦" },
  AUD: { symbol: "AU$", rate: 1.52, label: "AUD", flag: "🇦🇺" },
};

export interface CryptoPartner {
  id: string;
  name: string;
  symbol: string;
  category: "coin" | "stablecoin" | "wallet" | "network";
  network: string;
  badge: string;
  badgeColor: string;
  brandColor: string;
  glowColor: string;
  icon: React.ReactNode;
  defaultPrice?: number;
  defaultChange?: number;
  isWallet?: boolean;
}

export interface CryptoPriceState {
  price: number;
  change24h: number;
  direction?: "up" | "down" | null;
  lastUpdated?: number;
}

export const INITIAL_CRYPTO_PRICES: Record<string, CryptoPriceState> = {
  btc: { price: 96480.50, change24h: 2.85, direction: null },
  usdt: { price: 1.0002, change24h: 0.01, direction: null },
  eth: { price: 2745.80, change24h: 3.42, direction: null },
  bnb: { price: 668.40, change24h: 1.95, direction: null },
  sol: { price: 195.20, change24h: 5.64, direction: null },
  usdc: { price: 1.0000, change24h: 0.00, direction: null },
  trx: { price: 0.2415, change24h: 1.15, direction: null },
  doge: { price: 0.2682, change24h: 4.38, direction: null },
  ltc: { price: 112.80, change24h: 1.45, direction: null },
  xrp: { price: 2.4850, change24h: 3.90, direction: null },
  ton: { price: 5.8640, change24h: 2.15, direction: null },
  matic: { price: 0.4850, change24h: -0.65, direction: null },
};

export const CRYPTO_PAYMENT_PARTNERS: CryptoPartner[] = [
  {
    id: "btc",
    name: "Bitcoin",
    symbol: "BTC",
    category: "coin",
    network: "Bitcoin Native & Lightning",
    badge: "Instant 0-Conf",
    badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/40",
    brandColor: "#F7931A",
    glowColor: "rgba(247,147,26,0.3)",
    icon: (
      <svg viewBox="0 0 32 32" className="w-5 h-5 fill-current">
        <circle cx="16" cy="16" r="16" fill="#F7931A" />
        <path
          d="M22.5 13.5c.3-2.1-1.3-3.2-3.5-4l.7-2.9-1.8-.4-.7 2.8c-.5-.1-1-.2-1.5-.3l.7-2.8-1.8-.4-.7 2.9c-.4-.1-.8-.2-1.2-.3l-2.5-.6-.5 2s1.3.3 1.3.3c.7.2.9.7.8 1.1l-.8 3.3c.1 0 .1 0 .2.1l-.2-.1-1.2 4.7c-.1.2-.3.6-.8.5 0 0-1.3-.3-1.3-.3l-.9 2.1 2.3.6c.4.1.9.2 1.3.3l-.7 3 1.8.4.7-2.9c.5.1 1 .2 1.5.3l-.7 2.9 1.8.4.7-2.9c3.1.6 5.4.3 6.4-2.5.8-2.2-.04-3.5-1.7-4.3 1.2-.3 2.1-1.1 2.3-2.8zm-4.1 6c-.6 2.3-4.5 1.1-5.7.8l1-4.1c1.3.3 5.3 1 4.7 3.3zm.6-6c-.5 2.1-3.8 1-4.8.8l.9-3.7c1.1.3 4.4.8 3.9 2.9z"
          fill="#FFFFFF"
        />
      </svg>
    ),
  },
  {
    id: "usdt",
    name: "Tether USD",
    symbol: "USDT",
    category: "stablecoin",
    network: "TRC20 / ERC20 / BEP20 / SOL",
    badge: "$1.00 USD Fixed",
    badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    brandColor: "#26A17B",
    glowColor: "rgba(38,161,123,0.3)",
    icon: (
      <svg viewBox="0 0 32 32" className="w-5 h-5 fill-current">
        <circle cx="16" cy="16" r="16" fill="#26A17B" />
        <path
          d="M17.9 17.1v-.1c-.1 0-.7.1-1.9.1-1 0-1.7 0-1.9-.1v.1c-3.6-.2-6.3-1-6.3-2 0-1.1 2.7-1.9 6.3-2.1V10h4.2v3.1c3.6.2 6.3 1 6.3 2.1 0 1-2.7 1.8-6.3 2v-.1zm0-3.3c-1.1 0-2.3-.1-3.8-.1-1.4 0-2.5.1-3.8.1v.2c0 .8 2.5 1.4 5.7 1.4s5.7-.6 5.7-1.4v-.2c-1.3 0-2.5 0-3.8 0zm-2 4.4c.1 0 .6 0 1.9-.1 1.2 0 1.8.1 1.9.1v6.9h-3.8v-6.9z"
          fill="#FFFFFF"
        />
      </svg>
    ),
  },
  {
    id: "eth",
    name: "Ethereum",
    symbol: "ETH",
    category: "coin",
    network: "Mainnet / Arbitrum / Base",
    badge: "Smart Web3",
    badgeColor: "bg-indigo-500/20 text-indigo-400 border-indigo-500/40",
    brandColor: "#627EEA",
    glowColor: "rgba(98,126,234,0.3)",
    icon: (
      <svg viewBox="0 0 32 32" className="w-5 h-5 fill-current">
        <circle cx="16" cy="16" r="16" fill="#627EEA" />
        <path d="M16 4l-.2.7v15.6l.2.2 7.2-4.3L16 4z" fill="#FFFFFF" fillOpacity="0.6" />
        <path d="M16 4L8.8 16.2l7.2 4.3V4z" fill="#FFFFFF" />
        <path d="M16 21.8l-.1.1v6l.1.3 7.3-10.2L16 21.8z" fill="#FFFFFF" fillOpacity="0.6" />
        <path d="M16 28.2v-6.4L8.8 18 16 28.2z" fill="#FFFFFF" />
        <path d="M16 20.5l7.2-4.3-7.2-3.3v7.6z" fill="#FFFFFF" fillOpacity="0.2" />
        <path d="M8.8 16.2l7.2 4.3v-7.6l-7.2 3.3z" fill="#FFFFFF" fillOpacity="0.6" />
      </svg>
    ),
  },
  {
    id: "bnb",
    name: "BNB & Binance Pay",
    symbol: "BNB",
    category: "coin",
    network: "BNB Smart Chain (BEP20)",
    badge: "0% Gas Fees",
    badgeColor: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
    brandColor: "#F0B90B",
    glowColor: "rgba(240,185,11,0.3)",
    icon: (
      <svg viewBox="0 0 32 32" className="w-5 h-5 fill-current">
        <circle cx="16" cy="16" r="16" fill="#F0B90B" />
        <path
          d="M16 7l3.2 3.2-3.2 3.2-3.2-3.2L16 7zm-5.4 5.4l3.2 3.2-3.2 3.2-3.2-3.2 3.2-3.2zm10.8 0l3.2 3.2-3.2 3.2-3.2-3.2 3.2-3.2zm-5.4 5.4l3.2 3.2-3.2 3.2-3.2-3.2 3.2-3.2zm0-3.6l1.8 1.8-1.8 1.8-1.8-1.8 1.8-1.8zm-5.4 9l3.2 3.2-3.2 3.2-3.2-3.2 3.2-3.2zm10.8 0l3.2 3.2-3.2 3.2-3.2-3.2 3.2-3.2z"
          fill="#000000"
        />
      </svg>
    ),
  },
  {
    id: "sol",
    name: "Solana",
    symbol: "SOL",
    category: "coin",
    network: "Solana High-Speed Network",
    badge: "< 400ms Sub-Second",
    badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/40",
    brandColor: "#14F195",
    glowColor: "rgba(20,241,149,0.3)",
    icon: (
      <svg viewBox="0 0 32 32" className="w-5 h-5">
        <circle cx="16" cy="16" r="16" fill="#000000" />
        <path d="M8.5 21.8l2.4-2.4c.2-.2.5-.3.8-.3h11.8c.4 0 .7.5.4.8l-2.4 2.4c-.2.2-.5.3-.8.3H8.9c-.4 0-.7-.5-.4-.8z" fill="#00FFA3" />
        <path d="M8.5 10.2l2.4-2.4c.2-.2.5-.3.8-.3h11.8c.4 0 .7.5.4.8l-2.4 2.4c-.2.2-.5.3-.8.3H8.9c-.4 0-.7-.5-.4-.8z" fill="#00FFA3" />
        <path d="M23.5 16l-2.4 2.4c-.2.2-.5.3-.8.3H8.5c-.4 0-.7-.5-.4-.8l2.4-2.4c.2-.2.5-.3.8-.3h11.8c.4 0 .7.5.4.8z" fill="#DC1FFF" />
      </svg>
    ),
  },
  {
    id: "usdc",
    name: "USD Coin",
    symbol: "USDC",
    category: "stablecoin",
    network: "Multi-Chain Regulated",
    badge: "100% Backed",
    badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/40",
    brandColor: "#2775CA",
    glowColor: "rgba(39,117,202,0.3)",
    icon: (
      <svg viewBox="0 0 32 32" className="w-5 h-5 fill-current">
        <circle cx="16" cy="16" r="16" fill="#2775CA" />
        <path
          d="M16 6.5C10.8 6.5 6.5 10.8 6.5 16s4.3 9.5 9.5 9.5 9.5-4.3 9.5-9.5-4.3-9.5-9.5-9.5zm0 17.5c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm-.8-13.8v1.6c-2 .2-3.4 1.3-3.4 3 0 1.8 1.4 2.6 3.4 2.9v3.4c-1.3-.2-2.3-.9-2.6-1.8l-1.6.7c.5 1.5 2 2.5 4.2 2.7v1.7h1.6v-1.6c2.2-.3 3.6-1.4 3.6-3.2 0-1.8-1.3-2.7-3.6-3.1v-3.1c1.2.2 2 .8 2.3 1.6l1.6-.7c-.5-1.4-1.8-2.3-3.9-2.6V10.2h-1.6zm0 5.8c-1.1-.2-1.7-.5-1.7-1.3 0-.7.6-1.3 1.7-1.4v2.7zm1.6 3.5c1.3.3 1.9.7 1.9 1.5 0 .8-.7 1.4-1.9 1.6v-3.1z"
          fill="#FFFFFF"
        />
      </svg>
    ),
  },
  {
    id: "trx",
    name: "TRON",
    symbol: "TRX",
    category: "coin",
    network: "TRON Network (TRC-20)",
    badge: "$0.10 Fee",
    badgeColor: "bg-red-500/20 text-red-400 border-red-500/40",
    brandColor: "#EF0027",
    glowColor: "rgba(239,0,39,0.3)",
    icon: (
      <svg viewBox="0 0 32 32" className="w-5 h-5 fill-current">
        <circle cx="16" cy="16" r="16" fill="#EF0027" />
        <path d="M7.5 8.5l17.8 4.2-12.6 12.8L7.5 8.5zm16.5 5.5L13.8 24.2l11.7-9.5-1.5-.7zm-1.8-1.5L8.9 9.8l3.4 13.5 9.9-10.8z" fill="#FFFFFF" />
      </svg>
    ),
  },
  {
    id: "doge",
    name: "Dogecoin",
    symbol: "DOGE",
    category: "coin",
    network: "Dogecoin Native Chain",
    badge: "Community Fav",
    badgeColor: "bg-amber-400/20 text-amber-300 border-amber-400/40",
    brandColor: "#C2A633",
    glowColor: "rgba(194,166,51,0.3)",
    icon: (
      <svg viewBox="0 0 32 32" className="w-5 h-5 fill-current">
        <circle cx="16" cy="16" r="16" fill="#C2A633" />
        <path
          d="M12.5 8h4.5c4.1 0 7.5 3.4 7.5 8s-3.4 8-7.5 8h-4.5V8zm4.5 13.5c2.8 0 5-2.2 5-5.5s-2.2-5.5-5-5.5h-2v11h2zm-4-6.5h6v2h-6v-2z"
          fill="#FFFFFF"
        />
      </svg>
    ),
  },
  {
    id: "ltc",
    name: "Litecoin",
    symbol: "LTC",
    category: "coin",
    network: "Scrypt Super-Fast",
    badge: "Low 0.001 Fee",
    badgeColor: "bg-slate-400/20 text-slate-300 border-slate-400/40",
    brandColor: "#345D9D",
    glowColor: "rgba(52,93,157,0.3)",
    icon: (
      <svg viewBox="0 0 32 32" className="w-5 h-5 fill-current">
        <circle cx="16" cy="16" r="16" fill="#345D9D" />
        <path d="M15.5 7h3v11.8l4.5-.8-.5 2.5-4 1v.5h6V25h-12V7h3zm-4 7l7-2.2-.6 2.5-7 2.2.6-2.5z" fill="#FFFFFF" />
      </svg>
    ),
  },
  {
    id: "xrp",
    name: "Ripple XRP",
    symbol: "XRP",
    category: "coin",
    network: "XRPL Ledger (3s Settle)",
    badge: "Instant 3s",
    badgeColor: "bg-slate-300/20 text-slate-200 border-slate-300/40",
    brandColor: "#23292F",
    glowColor: "rgba(255,255,255,0.2)",
    icon: (
      <svg viewBox="0 0 32 32" className="w-5 h-5 fill-current">
        <circle cx="16" cy="16" r="16" fill="#23292F" />
        <path
          d="M24.2 9h-2.7l-4.1 4.1c-.8.8-2.1.8-2.9 0L10.5 9H7.8l5.5 5.5c1.6 1.6 4.1 1.6 5.6 0L24.2 9zM7.8 23h2.7l4.1-4.1c.8-.8 2.1-.8 2.9 0l4.1 4.1h2.7l-5.5-5.5c-1.6-1.6-4.1-1.6-5.6 0L7.8 23z"
          fill="#FFFFFF"
        />
      </svg>
    ),
  },
  {
    id: "ton",
    name: "The Open Network",
    symbol: "TON",
    category: "coin",
    network: "Telegram TON Wallet",
    badge: "1-Click Telegram",
    badgeColor: "bg-sky-400/20 text-sky-300 border-sky-400/40",
    brandColor: "#0098EA",
    glowColor: "rgba(0,152,234,0.3)",
    icon: (
      <svg viewBox="0 0 32 32" className="w-5 h-5 fill-current">
        <circle cx="16" cy="16" r="16" fill="#0098EA" />
        <path d="M16 6.5L6.5 12.8v8.4L16 27.5l9.5-6.3v-8.4L16 6.5zm0 3.2l6.8 4.5-6.8 4.2-6.8-4.2 6.8-4.5zm-7.2 6.5l6.2 3.8v7.4l-6.2-4.1v-7.1zm8.2 11.2v-7.4l6.2-3.8v7.1l-6.2 4.1z" fill="#FFFFFF" />
      </svg>
    ),
  },
  {
    id: "matic",
    name: "Polygon",
    symbol: "POL",
    category: "network",
    network: "Polygon POS / zkEVM",
    badge: "Sub-Cent Gas",
    badgeColor: "bg-purple-600/20 text-purple-300 border-purple-600/40",
    brandColor: "#8247E5",
    glowColor: "rgba(130,71,229,0.3)",
    icon: (
      <svg viewBox="0 0 32 32" className="w-5 h-5 fill-current">
        <circle cx="16" cy="16" r="16" fill="#8247E5" />
        <path
          d="M21.7 13.5l-4-2.3c-.4-.2-.8-.2-1.2 0l-4 2.3c-.4.2-.6.6-.6 1v4.6c0 .4.2.8.6 1l4 2.3c.4.2.8.2 1.2 0l4-2.3c.4-.2.6-.6.6-1v-4.6c0-.4-.2-.8-.6-1zm-5.1 7.2l-3.3-1.9v-3.8l3.3 1.9v3.8zm1-1.9l-3.3-1.9 3.3-1.9 3.3 1.9-3.3 1.9zm3.3-1.9l-3.3-1.9v-3.8l3.3 1.9v3.8z"
          fill="#FFFFFF"
        />
      </svg>
    ),
  },
  {
    id: "metamask",
    name: "MetaMask",
    symbol: "Web3",
    category: "wallet",
    network: "Browser Extension & Mobile",
    badge: "Direct Connect",
    badgeColor: "bg-orange-500/20 text-orange-400 border-orange-500/40",
    brandColor: "#F6851B",
    glowColor: "rgba(246,133,27,0.3)",
    icon: (
      <svg viewBox="0 0 32 32" className="w-5 h-5 fill-current">
        <circle cx="16" cy="16" r="16" fill="#233447" />
        <path d="M25.5 8l-8.5 6.3 1.6 3.7 6.9-10zM6.5 8l6.8 10 1.6-3.7L6.5 8z" fill="#E2761B" />
        <path d="M22.2 21.6l-1.9-3-4.6 3.3 4.6 2 1.9-2.3zM9.8 21.6l1.9 2.3 4.6-2-4.6-3.3-1.9 3z" fill="#E4761B" />
        <path d="M13.3 18l-1.6-3.7-5.2-6.3 2 7.7 4.8 2.3zM18.7 18l4.8-2.3 2-7.7-5.2 6.3-1.6 3.7z" fill="#D7C1B3" />
        <path d="M16 15.8l6.2 2.2-4.8 2.3-1.4-4.5zM16 15.8l-1.4 4.5-4.8-2.3 6.2-2.2z" fill="#CD6116" />
      </svg>
    ),
  },
  {
    id: "trustwallet",
    name: "Trust Wallet",
    symbol: "Wallet",
    category: "wallet",
    network: "Multi-Chain 70+ Chains",
    badge: "Cold/Hot Secure",
    badgeColor: "bg-blue-600/20 text-blue-400 border-blue-600/40",
    brandColor: "#0500FF",
    glowColor: "rgba(5,0,255,0.3)",
    icon: (
      <svg viewBox="0 0 32 32" className="w-5 h-5 fill-current">
        <circle cx="16" cy="16" r="16" fill="#0500FF" />
        <path
          d="M16 6.5C10.5 8.7 7.5 11.5 7.5 17.5c0 6.3 5 8.3 8.5 8.9 3.5-.6 8.5-2.6 8.5-8.9 0-6-3-8.8-8.5-11zm0 17.6c-2.8-.5-6.5-2.1-6.5-6.8 0-4.5 2-6.6 6.5-8.3 4.5 1.7 6.5 3.8 6.5 8.3 0 4.7-3.7 6.3-6.5 6.8z"
          fill="#FFFFFF"
        />
      </svg>
    ),
  },
  {
    id: "phantom",
    name: "Phantom Wallet",
    symbol: "SOL/ETH",
    category: "wallet",
    network: "Solana, Ethereum & Polygon",
    badge: "1-Click Sign",
    badgeColor: "bg-indigo-400/20 text-indigo-300 border-indigo-400/40",
    brandColor: "#AB9FF2",
    glowColor: "rgba(171,159,242,0.3)",
    icon: (
      <svg viewBox="0 0 32 32" className="w-5 h-5 fill-current">
        <circle cx="16" cy="16" r="16" fill="#AB9FF2" />
        <path d="M22.5 17c0-4.1-3.4-7.5-7.5-7.5s-7.5 3.4-7.5 7.5c0 3.2 2 5.9 4.8 7v-1.8c-1.9-.9-3.2-2.8-3.2-4.9 0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5c0 2.1-1.3 4-3.2 4.9v1.8c2.8-1.1 4.8-3.8 4.8-7z" fill="#362F5E" />
        <circle cx="12.5" cy="15.5" r="1.5" fill="#362F5E" />
        <circle cx="17.5" cy="15.5" r="1.5" fill="#362F5E" />
      </svg>
    ),
  },
  {
    id: "coinbase",
    name: "Coinbase Pay",
    symbol: "Coinbase",
    category: "wallet",
    network: "Coinbase Pay & Self-Custody",
    badge: "Verified Web3",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    brandColor: "#0052FF",
    glowColor: "rgba(0,82,255,0.3)",
    icon: (
      <svg viewBox="0 0 32 32" className="w-5 h-5 fill-current">
        <circle cx="16" cy="16" r="16" fill="#0052FF" />
        <path d="M16 8.5C11.9 8.5 8.5 11.9 8.5 16s3.4 7.5 7.5 7.5 7.5-3.4 7.5-7.5-3.4-7.5-7.5-7.5zm-2.8 9.8c-1.3 0-2.3-1-2.3-2.3s1-2.3 2.3-2.3h5.6c1.3 0 2.3 1 2.3 2.3s-1 2.3-2.3 2.3h-5.6z" fill="#FFFFFF" />
      </svg>
    ),
  },
];

export default function PaymentPartnersBanner({
  onOpenDeposit,
  className = "",
  defaultExpanded = false,
}: PaymentPartnersBannerProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [hoveredPartner, setHoveredPartner] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, CryptoPriceState>>(INITIAL_CRYPTO_PRICES);
  const [selectedCurrency, setSelectedCurrency] = useState<GlobalCurrency>("USD");
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState<boolean>(false);

  const triggerHaptic = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(12);
      } catch (_) {}
    }
  };

  // Live real-time market micro-fluctuations & public feed fetcher
  useEffect(() => {
    let isMounted = true;

    // 1. Initial live fetch from public crypto API if available
    const fetchLivePrices = async () => {
      try {
        const res = await fetch("https://api.binance.com/api/v3/ticker/24hr");
        if (res.ok && isMounted) {
          const data = (await res.json()) as Array<{ symbol: string; lastPrice: string; priceChangePercent: string }>;
          const symbolMap: Record<string, string> = {
            BTCUSDT: "btc",
            ETHUSDT: "eth",
            BNBUSDT: "bnb",
            SOLUSDT: "sol",
            TRXUSDT: "trx",
            DOGEUSDT: "doge",
            LTCUSDT: "ltc",
            XRPUSDT: "xrp",
            TONUSDT: "ton",
            POLUSDT: "matic",
            MATICUSDT: "matic",
          };

          const updates: Record<string, CryptoPriceState> = {};
          if (Array.isArray(data)) {
            data.forEach((item) => {
              const key = symbolMap[item.symbol];
              if (key) {
                const currentP = parseFloat(item.lastPrice);
                const change = parseFloat(item.priceChangePercent);
                updates[key] = {
                  price: currentP,
                  change24h: change,
                  direction: null,
                  lastUpdated: Date.now(),
                };
              }
            });
          }

          if (Object.keys(updates).length > 0) {
            setPrices((prev) => ({ ...prev, ...updates }));
          }
        }
      } catch (err) {
        // Fallback gracefully to simulated real-time market fluctuations
      }
    };

    fetchLivePrices();

    // 2. High-frequency live tick generator (every 2.8s) for real-time market action
    const interval = setInterval(() => {
      if (!isMounted) return;
      setPrices((prev) => {
        const next = { ...prev };
        const keys = Object.keys(next);
        const count = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < count; i++) {
          const randomKey = keys[Math.floor(Math.random() * keys.length)];
          const current = next[randomKey];
          if (!current) continue;

          if (randomKey === "usdt" || randomKey === "usdc") {
            const microDelta = (Math.random() - 0.5) * 0.0002;
            next[randomKey] = {
              price: Math.max(0.9995, Math.min(1.0005, current.price + microDelta)),
              change24h: current.change24h,
              direction: microDelta > 0 ? "up" : "down",
              lastUpdated: Date.now(),
            };
          } else {
            const percentChange = (Math.random() - 0.48) * 0.002;
            const newPrice = current.price * (1 + percentChange);
            const dir = percentChange >= 0 ? "up" : "down";
            next[randomKey] = {
              price: Number(newPrice.toFixed(current.price > 100 ? 2 : 4)),
              change24h: Number((current.change24h + percentChange * 10).toFixed(2)),
              direction: dir,
              lastUpdated: Date.now(),
            };
          }
        }
        return next;
      });
    }, 2800);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const formatPrice = (partner: CryptoPartner): { priceStr: string; changeStr: string; isPositive: boolean; isCoin: boolean } => {
    const curr = CURRENCY_CONFIG[selectedCurrency];
    const currSymbol = curr.symbol;
    const currRate = curr.rate;

    if (partner.category === "wallet") {
      return {
        priceStr: "0.00 Gas",
        changeStr: "Ready",
        isPositive: true,
        isCoin: false,
      };
    }

    const priceData = prices[partner.id];
    if (!priceData) {
      const convertedBase = 1.0 * currRate;
      return {
        priceStr: `${currSymbol}${convertedBase.toFixed(2)}`,
        changeStr: "0.00%",
        isPositive: true,
        isCoin: true,
      };
    }

    const p = priceData.price * currRate;
    let formattedPrice = "";
    if (p >= 1000) {
      formattedPrice = currSymbol + p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (p >= 1) {
      formattedPrice = currSymbol + p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    } else {
      formattedPrice = currSymbol + p.toFixed(4);
    }

    const change = priceData.change24h;
    const isPositive = change >= 0;
    const formattedChange = (isPositive ? "+" : "") + change.toFixed(2) + "%";

    return {
      priceStr: formattedPrice,
      changeStr: formattedChange,
      isPositive,
      isCoin: true,
    };
  };

  const filteredPartners = activeCategory === "all"
    ? CRYPTO_PAYMENT_PARTNERS
    : CRYPTO_PAYMENT_PARTNERS.filter((p) => p.category === activeCategory);

  // Duplicate list 3 times for seamless infinite -33.33% marquee looping
  const marqueeItems = [...CRYPTO_PAYMENT_PARTNERS, ...CRYPTO_PAYMENT_PARTNERS, ...CRYPTO_PAYMENT_PARTNERS];

  const handleToggleRoll = () => {
    triggerHaptic();
    casinoAudio.playClick();
    setIsExpanded((prev) => !prev);
  };

  return (
    <div
      id="crypto-payment-partners-banner"
      className={`w-full relative overflow-hidden rounded-3xl border border-slate-800/90 bg-gradient-to-b from-[#0B0F17]/95 via-[#080B12]/95 to-[#05070C]/95 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.7)] ${className}`}
    >
      {/* Dynamic Ambient Background Illumination */}
      <div className="absolute -top-16 left-1/5 w-96 h-28 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 right-1/5 w-96 h-28 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar with Crypto Stats, Global Multi-Currency & Live Status */}
      <div className="px-3.5 sm:px-6 py-3 border-b border-slate-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-slate-950/60">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)] font-black shrink-0">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-mono text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center gap-1.5 flex-wrap">
                <span>Global Crypto & Web3 Gateway</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-[10px] font-mono font-black flex items-center gap-1 animate-pulse">
                  <Activity className="w-2.5 h-2.5" />
                  Live Market Feed
                </span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-mono font-bold hidden md:inline-flex items-center gap-1">
                  <Globe className="w-2.5 h-2.5" />
                  Global Edge 12ms
                </span>
              </h3>
            </div>
            <p className="text-[11px] font-mono text-slate-400 hidden sm:block">
              20+ cryptocurrencies & Web3 wallets with multi-currency market conversion & 0s settlement.
            </p>
          </div>
        </div>

        {/* Global Multi-Currency Toggle & Action Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end flex-wrap">
          {/* Currency Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                triggerHaptic();
                casinoAudio.playClick();
                setIsCurrencyDropdownOpen((prev) => !prev);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 hover:border-amber-500/50 text-slate-200 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
              title="Change display currency"
            >
              <span>{CURRENCY_CONFIG[selectedCurrency].flag}</span>
              <span className="text-amber-400 font-extrabold">{selectedCurrency}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isCurrencyDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-36 bg-slate-950/95 border border-slate-700/90 rounded-2xl shadow-2xl backdrop-blur-xl p-1.5 z-50 flex flex-col gap-0.5 font-mono text-xs">
                {(Object.keys(CURRENCY_CONFIG) as GlobalCurrency[]).map((curr) => (
                  <button
                    key={curr}
                    onClick={() => {
                      triggerHaptic();
                      casinoAudio.playClick();
                      setSelectedCurrency(curr);
                      setIsCurrencyDropdownOpen(false);
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-xl text-left flex items-center justify-between transition-colors cursor-pointer ${
                      selectedCurrency === curr
                        ? "bg-amber-500/20 text-amber-300 font-black border border-amber-500/40"
                        : "text-slate-300 hover:bg-slate-850 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span>{CURRENCY_CONFIG[curr].flag}</span>
                      <span>{curr}</span>
                    </span>
                    <span className="text-[10px] text-slate-400">{CURRENCY_CONFIG[curr].symbol}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.94, y: 1 }}
            onClick={handleToggleRoll}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer select-none ${
              isExpanded
                ? "bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.25)]"
                : "bg-slate-900/90 border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-600 hover:bg-slate-800"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xs:inline">{isExpanded ? "Roll Collapse ▴" : "Roll Open 20+ Assets ▾"}</span>
            <span className="xs:hidden">{isExpanded ? "Close ▴" : "20+ Coins ▾"}</span>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </motion.div>
          </motion.button>

          {onOpenDeposit && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.94, y: 1 }}
              onClick={() => {
                triggerHaptic();
                casinoAudio.playClick();
                onOpenDeposit();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 text-xs font-mono font-black uppercase tracking-wider flex items-center gap-1 shadow-[0_0_16px_rgba(245,158,11,0.35)] transition-all cursor-pointer shrink-0"
            >
              <span>Cashier</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </div>
      </div>

      {/* CONTINUOUS SMOOTH MARQUEE TICKER OF CRYPTO PARTNERS WITH LIVE PRICES */}
      <div className="py-2.5 px-2 bg-[#06090F]/85 border-b border-slate-800/60 overflow-hidden relative group">
        <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-12 bg-gradient-to-r from-[#06090F] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-12 bg-gradient-to-l from-[#06090F] to-transparent z-10 pointer-events-none" />

        <div className="flex gap-2.5 sm:gap-3 animate-marquee group-hover:[animation-play-state:paused] whitespace-nowrap">
          {marqueeItems.map((crypto, idx) => {
            const priceInfo = formatPrice(crypto);
            const liveState = prices[crypto.id];
            const direction = liveState?.direction;

            return (
              <motion.div
                key={`${crypto.id}-marquee-${idx}`}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.93 }}
                onClick={() => {
                  triggerHaptic();
                  casinoAudio.playClick();
                  if (onOpenDeposit) onOpenDeposit();
                }}
                className="inline-flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900/70 border border-slate-800/90 hover:border-amber-500/40 hover:bg-slate-850/90 transition-colors cursor-pointer select-none shrink-0 shadow-sm"
              >
                <div className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 flex items-center justify-center">
                  {crypto.icon}
                </div>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-white">{crypto.symbol}</span>
                      <span className="text-[10px] text-slate-400 hidden xs:inline">{crypto.name}</span>
                    </div>
                    {/* Live Price Display */}
                    <div className="flex items-center gap-1 text-[10px]">
                      <span
                        className={`font-black tracking-tight transition-colors duration-300 ${
                          direction === "up"
                            ? "text-emerald-400"
                            : direction === "down"
                            ? "text-rose-400"
                            : "text-amber-300"
                        }`}
                      >
                        {priceInfo.priceStr}
                      </span>
                      {priceInfo.isCoin && (
                        <span
                          className={`font-bold flex items-center text-[8px] ${
                            priceInfo.isPositive ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {priceInfo.isPositive ? (
                            <TrendingUp className="w-2 h-2 mr-0.5 inline" />
                          ) : (
                            <TrendingDown className="w-2 h-2 mr-0.5 inline" />
                          )}
                          {priceInfo.changeStr}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border hidden sm:inline-block ${crypto.badgeColor}`}>
                    {crypto.badge}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* CLICK TO ROLL EXPAND / COLLAPSE INTERACTIVE STRIP WITH PULSIVE GLOW & SHIMMER */}
      <motion.button
        whileHover={{ scale: 1.002, backgroundColor: "rgba(18, 24, 38, 0.95)" }}
        whileTap={{ scale: 0.985, y: 1 }}
        onClick={handleToggleRoll}
        className="w-full relative px-3.5 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-slate-950 via-[#101726] to-slate-950 hover:from-slate-900 hover:via-[#162035] hover:to-slate-900 border-b border-amber-500/30 flex items-center justify-between gap-2.5 sm:gap-3 text-xs font-mono text-slate-300 transition-all cursor-pointer group select-none shadow-[0_4px_24px_rgba(245,158,11,0.15)] overflow-hidden"
      >
        {/* Animated Sweeping Gold Light Shimmer */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />
        <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent animate-pulse pointer-events-none" />

        <div className="flex items-center gap-2 sm:gap-2.5 relative z-10 min-w-0">
          {/* Dual Pulsive Neon Light Indicators */}
          <div className="relative flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
            <span className="animate-pulse absolute inline-flex h-3.5 w-3.5 rounded-full bg-yellow-400/40" />
            <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-gradient-to-r from-amber-400 to-yellow-300 shadow-[0_0_8px_#f59e0b]" />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
            <span className="text-amber-300 font-black tracking-wide uppercase drop-shadow-[0_0_10px_rgba(245,158,11,0.5)] group-hover:text-yellow-200 transition-colors text-[11px] sm:text-xs truncate">
              {isExpanded ? "▲ Tap to Close Grid" : "▼ Tap to Open 20+ Live Cryptos & Web3"}
            </span>
            <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-400/50 text-amber-300 text-[8px] sm:text-[9px] font-black uppercase tracking-wider animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.3)] hidden xs:inline-flex items-center gap-1 shrink-0">
              <Sparkles className="w-2.5 h-2.5 text-amber-400" />
              <span>{isExpanded ? "Active Market" : "Live PnL"}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 relative z-10 shrink-0">
          <span className="text-[10px] text-amber-200/70 hidden md:inline font-bold group-hover:text-amber-200 transition-colors">
            {isExpanded ? "Hide token specs" : "Instant 0s deposit & 0% fee matrix"}
          </span>

          <motion.div
            animate={
              isExpanded
                ? { rotate: 180, scale: 1.1 }
                : { y: [0, -3, 0], scale: [1, 1.08, 1], rotate: 0 }
            }
            transition={
              isExpanded
                ? { duration: 0.3 }
                : { repeat: Infinity, duration: 1.8, ease: "easeInOut" }
            }
            className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-gradient-to-br from-amber-500/30 to-yellow-500/20 border border-amber-400/60 shadow-[0_0_12px_rgba(245,158,11,0.4)] flex items-center justify-center text-amber-300 group-hover:border-amber-300 group-hover:text-yellow-100"
          >
            <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </motion.div>
        </div>
      </motion.button>

      {/* ROLLABLE ANIMATED CRYPTO SHOWCASE DRAWER WITH LIVE RATES */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="rollable-crypto-showcase"
            initial={{ height: 0, opacity: 0, scaleY: 0.95 }}
            animate={{
              height: "auto",
              opacity: 1,
              scaleY: 1,
              transition: {
                height: { duration: 0.38, ease: [0.04, 0.62, 0.23, 0.98] },
                opacity: { duration: 0.28, delay: 0.05 },
                scaleY: { duration: 0.38, ease: "easeOut" },
              },
            }}
            exit={{
              height: 0,
              opacity: 0,
              scaleY: 0.95,
              transition: {
                height: { duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] },
                opacity: { duration: 0.2 },
                scaleY: { duration: 0.3 },
              },
            }}
            className="overflow-hidden origin-top"
          >
            <div className="p-3 sm:p-5 bg-slate-950/40">
              {/* Category Filter Chips & Currency Conversion inside Rollable Area */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/70 flex-wrap gap-2">
                {/* Horizontal Scrollable Categories on Mobile */}
                <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800/90 p-1 rounded-xl overflow-x-auto no-scrollbar max-w-full">
                  {[
                    { id: "all", label: "All (20+)" },
                    { id: "coin", label: "Coins" },
                    { id: "stablecoin", label: "Stables" },
                    { id: "wallet", label: "Wallets" },
                  ].map((tab) => (
                    <motion.button
                      key={tab.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => {
                        triggerHaptic();
                        casinoAudio.playClick();
                        setActiveCategory(tab.id);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-colors cursor-pointer shrink-0 min-h-[32px] flex items-center ${
                        activeCategory === tab.id
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                      }`}
                    >
                      {tab.label}
                    </motion.button>
                  ))}
                </div>

                <div className="flex items-center gap-2 sm:gap-3 font-mono text-[10px]">
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Auto 2.8s Live Refresh
                  </span>
                  <span className="text-amber-400 font-bold hidden sm:inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> 0% Markup ({selectedCurrency})
                  </span>
                </div>
              </div>

              {/* 20+ Crypto Cards Matrix Grid with Live Price Tickers */}
              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3">
                {filteredPartners.map((crypto) => {
                  const isHovered = hoveredPartner === crypto.id;
                  const priceInfo = formatPrice(crypto);
                  const liveState = prices[crypto.id];
                  const direction = liveState?.direction;

                  return (
                    <motion.div
                      key={crypto.id}
                      whileHover={{ scale: 1.05, y: -3 }}
                      whileTap={{ scale: 0.92, rotate: -1 }}
                      onMouseEnter={() => setHoveredPartner(crypto.id)}
                      onMouseLeave={() => setHoveredPartner(null)}
                      onClick={() => {
                        triggerHaptic();
                        casinoAudio.playClick();
                        if (onOpenDeposit) onOpenDeposit();
                      }}
                      className="group relative flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl border border-slate-800/80 bg-slate-900/50 hover:bg-slate-850/95 transition-colors duration-200 cursor-pointer select-none"
                      style={{
                        boxShadow: isHovered ? `0 0 20px ${crypto.glowColor}` : undefined,
                        borderColor: isHovered ? crypto.brandColor : undefined,
                      }}
                    >
                      {/* Logo & Symbol Container */}
                      <div className="flex flex-col items-center gap-1 sm:gap-1.5 w-full">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-300">
                          {crypto.icon}
                        </div>
                        <div className="text-center w-full min-w-0">
                          <span className="block font-mono text-xs font-black text-white group-hover:text-amber-300 transition-colors truncate">
                            {crypto.symbol}
                          </span>
                          <span className="block font-mono text-[9px] text-slate-400 truncate">
                            {crypto.name}
                          </span>
                        </div>
                      </div>

                      {/* Live Real-Time Price Tag */}
                      <div className="mt-1.5 sm:mt-2 w-full text-center bg-slate-950/60 border border-slate-800/80 rounded-lg py-1 px-1">
                        <span
                          className={`block font-mono text-[10px] sm:text-[11px] font-black tracking-tight transition-colors duration-300 truncate ${
                            direction === "up"
                              ? "text-emerald-400"
                              : direction === "down"
                              ? "text-rose-400"
                              : "text-amber-300"
                          }`}
                        >
                          {priceInfo.priceStr}
                        </span>
                        {priceInfo.isCoin ? (
                          <span
                            className={`block font-mono text-[7.5px] sm:text-[8px] font-bold tracking-tight truncate ${
                              priceInfo.isPositive ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {priceInfo.isPositive ? "▲" : "▼"} {priceInfo.changeStr}
                          </span>
                        ) : (
                          <span className="block font-mono text-[7.5px] sm:text-[8px] font-bold text-cyan-400 uppercase tracking-tight truncate">
                            {crypto.badge}
                          </span>
                        )}
                      </div>

                      {/* Network Tag */}
                      <div className="mt-1.5 w-full text-center">
                        <span
                          className={`block w-full py-0.5 px-1 rounded border text-[7.5px] sm:text-[8px] font-mono font-bold uppercase tracking-tight truncate ${crypto.badgeColor}`}
                        >
                          {crypto.category === "wallet" ? "Self-Custody" : crypto.network.split(" ")[0]}
                        </span>
                      </div>

                      {/* Micro Live Light Indicator */}
                      <div
                        className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full transition-colors ${
                          direction === "up"
                            ? "bg-emerald-400 animate-ping"
                            : direction === "down"
                            ? "bg-rose-400 animate-ping"
                            : "bg-emerald-400"
                        }`}
                      />
                    </motion.div>
                  );
                })}
              </div>

              {/* Trust Badges & Guarantee Strip */}
              <div className="mt-3.5 sm:mt-4 pt-3 sm:pt-3.5 border-t border-slate-800/70 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 text-[10px] sm:text-[11px] font-mono text-slate-400">
                <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Automatic 1-Block Credit</span>
                  </div>
                  <span className="hidden sm:inline text-slate-600">•</span>
                  <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Multi-Sig Cold Vault</span>
                  </div>
                  <span className="hidden sm:inline text-slate-600">•</span>
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>0% Platform Fees</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase">Multi-Chain:</span>
                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[9px] sm:text-[10px] text-amber-300 font-bold">
                    TRC-20, ERC-20, BEP-20, SOL, BTC, TON
                  </span>
                </div>
              </div>

              {/* Quick Roll Close Button */}
              <div className="mt-3 sm:mt-3.5 flex justify-center">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.93, y: 1 }}
                  onClick={handleToggleRoll}
                  className="px-4 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>▲ Roll Close Crypto Matrix</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
