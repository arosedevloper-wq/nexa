import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, X, Send, Users, Sparkles, Flame, Check, HelpCircle } from "lucide-react";
import { casinoAudio } from "../lib/audioService";

interface ChatMessage {
  id: string;
  sender: string;
  avatar: string;
  text: string;
  time: string;
  isCurrentUser?: boolean;
  isVIP?: boolean;
  role?: string;
  roleColor?: string;
}

const AVATARS = ["🦁", "🐯", "🐺", "🦊", "🦝", "🦁", "🐨", "🐼", "🐻", "🐸", "🐉", "🦄", "🦅", "🦉"];

const SENDER_NAMES = [
  "Roni_Vegas", "JackpotBoss", "Spins_King", "Crash_Master", "Hassan_007",
  "Lucky_Bhai", "PlinkoGamer", "Slot_Guru", "Dhaka_Titan", "Sylhet_Star",
  "Casino_Queen", "Vance_Student", "VIP_Roller", "AlphaWinner", "Golden_Chip",
  "Crypto_Spinner", "HighRoll_BD", "Royal_Streak", "Nagad_King", "bKash_Boss"
];

const SIMULATED_MESSAGES = [
  "Wow, Neon Plinko just paid 100x on the green ball! 🔥",
  " bKash deposit got approved in literally 15 seconds. High speed!",
  "Who is playing Crash Rocket? Let's cash out together at 5x!",
  "Vance host gave me an emergency loan, I'm back in the game baby! 😎",
  "Just hit 3 cherries on Slots Machine! +$1,500 chips!",
  "Any bKash agent online right now? Need a fast top-up.",
  "Yes bro, bKash agent Roni is active and lightning fast.",
  "The USDT rate at $125 is actually super solid.",
  "Slots jackpot is sitting at $45,000, who is going to crack it today?",
  "Blackjack dealer got 21 three times in a row, Vance help 😭",
  "Finally a Baccarat win on banker! 👑",
  "Plinko is definitely the most chill game, just watching the balls drop.",
  "Always cash out of Crash before 2x if you want safe profit guys.",
  "Never! Rocket to the moon 🚀 10x minimum!",
  "Nagad cashout worked instantly, thanks admin team!",
  "I'm at 5 daily missions completed, today's rewards are huge.",
  "Just joined the VIP Club, the Golden Booster chest is totally worth it.",
  "Can someone lend me 200 chips? I lost on Roulette 🔴",
  "Go sign the emergency loan ledger with Vance in your profile page!",
  "Dhaka Elite agent is highly responsive, highly recommended for P2P."
];

export default function GlobalFloatingChat({ currentUser }: { currentUser: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [onlineCount, setOnlineCount] = useState(2412);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevMessagesCountRef = useRef<number>(0);
  const wasOpenRef = useRef<boolean>(false);

  // Initialize with default chat messages
  useEffect(() => {
    const initialMessages: ChatMessage[] = Array.from({ length: 12 }).map((_, i) => {
      const sender = SENDER_NAMES[Math.floor(Math.random() * SENDER_NAMES.length)];
      const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
      const text = SIMULATED_MESSAGES[Math.floor(Math.random() * SIMULATED_MESSAGES.length)];
      const isVIP = Math.random() < 0.25;
      
      return {
        id: `msg-${Date.now()}-${i}`,
        sender,
        avatar,
        text,
        time: new Date(Date.now() - (12 - i) * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isVIP,
        role: isVIP ? "VIP" : undefined,
        roleColor: isVIP ? "text-amber-400 bg-amber-500/10 border-amber-500/20" : undefined
      };
    });
    setMessages(initialMessages);
  }, []);

  // Scroll to bottom helper with user scroll position check
  const scrollToBottom = (force = false) => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    // Check if user is within 120px of the bottom
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;

    if (force || isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Scroll to bottom helper when messages change or open status changes
  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      return;
    }

    setUnreadCount(0);

    const isNewMessage = messages.length > prevMessagesCountRef.current;
    const justOpened = !wasOpenRef.current;

    if (justOpened) {
      setTimeout(() => scrollToBottom(true), 50);
      wasOpenRef.current = true;
    } else if (isNewMessage) {
      scrollToBottom(false);
    }

    prevMessagesCountRef.current = messages.length;
  }, [messages, isOpen]);

  // Handle frequent online player count fluctuations to make it look hyper-realistic
  useEffect(() => {
    const playerInterval = setInterval(() => {
      setOnlineCount((prev) => {
        const targetCenter = 2430;
        const drift = prev > targetCenter ? -1 : prev < targetCenter ? 1 : 0;
        const change = Math.floor(Math.random() * 7) - 3; // -3 to +3
        const nextValue = prev + change + drift;
        return Math.max(2350, Math.min(2510, nextValue));
      });
    }, 1500); // Update every 1.5 seconds

    return () => clearInterval(playerInterval);
  }, []);

  // Handle periodic new simulated messages to make site feel alive
  useEffect(() => {
    const interval = setInterval(() => {
      const sender = SENDER_NAMES[Math.floor(Math.random() * SENDER_NAMES.length)];
      const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
      const text = SIMULATED_MESSAGES[Math.floor(Math.random() * SIMULATED_MESSAGES.length)];
      const isVIP = Math.random() < 0.2;

      const newMsg: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random()}`,
        sender,
        avatar,
        text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isVIP,
        role: isVIP ? "VIP" : undefined,
        roleColor: isVIP ? "text-amber-400 bg-amber-500/10 border-amber-500/20" : undefined
      };

      setMessages((prev) => [...prev, newMsg].slice(-50)); // Keep last 50 messages
      
      if (!isOpen) {
        setUnreadCount((prev) => prev + 1);
        // Play a very subtle chatter pop sound (using low volume chip clink)
        if (Math.random() < 0.3) {
          casinoAudio.playChipClink();
        }
      }
    }, 6000); // New message every 6 seconds

    return () => clearInterval(interval);
  }, [isOpen]);

  // Handle message send
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    casinoAudio.playClick();

    const userDisplayName = currentUser?.name || "LuckyPlayer";
    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      sender: userDisplayName,
      avatar: "👑",
      text: inputValue.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isCurrentUser: true,
      isVIP: true,
      role: "YOU",
      roleColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    };

    setMessages((prev) => [...prev, userMsg]);
    const typedText = inputValue.trim();
    setInputValue("");
    setTimeout(() => scrollToBottom(true), 50);

    // Setup an interactive instant reply from another player to the user message
    setTimeout(() => {
      const RESPONSES = [
        `Nice one @${userDisplayName}! Good luck on the tables! 🍀`,
        `Yo @${userDisplayName}, what game are you playing right now?`,
        `Facts bro! @${userDisplayName}`,
        `Good luck! May Vance's luck be with you. ✨`,
        `Indeed, the multipliers are running very hot today.`,
        `Welcome to the chat! Lets crack the slots jackpot! 🍒`
      ];

      const respondent = SENDER_NAMES[Math.floor(Math.random() * SENDER_NAMES.length)];
      const respondentAvatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
      const responseText = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];

      const reply: ChatMessage = {
        id: `reply-${Date.now()}`,
        sender: respondent,
        avatar: respondentAvatar,
        text: responseText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isVIP: Math.random() < 0.3,
        role: "REPLY",
        roleColor: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
      };

      setMessages((prev) => [...prev, reply]);
      if (!isOpen) {
        setUnreadCount((prev) => prev + 1);
      }
    }, 2000);
  };

  return (
    <>
      {/* Floating Action Button - Round, Glowing, Pulsing & Colourful */}
      <div className="fixed bottom-[72px] right-3 sm:right-6 md:bottom-6 z-[60] font-mono">
        <motion.button
          onClick={() => {
            casinoAudio.playClick();
            setIsOpen(!isOpen);
            if (!isOpen) setUnreadCount(0);
          }}
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.92 }}
          className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-tr from-cyan-500 via-indigo-500 to-fuchsia-500 border-2 border-cyan-300/80 flex items-center justify-center text-white shadow-[0_0_20px_rgba(6,182,212,0.7)] hover:shadow-[0_0_30px_rgba(217,70,239,0.9)] cursor-pointer group transition-all duration-300"
        >
          {/* Outer Pulsing Glow Aura */}
          <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-indigo-500 opacity-70 blur-md animate-pulse pointer-events-none" />
          <span className="absolute -inset-0.5 rounded-full bg-cyan-400/40 animate-ping duration-1000 pointer-events-none" />
          
          {/* Chat Icon */}
          <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-white group-hover:rotate-12 transition-transform duration-300 relative z-10 filter drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]" />

          {/* Online Players Green Dot Counter Tag */}
          <span className="absolute -bottom-1 bg-slate-950/90 text-cyan-300 text-[7.5px] font-black px-1.5 py-0.2 rounded-full border border-cyan-400/50 shadow-md flex items-center gap-0.5 z-10 uppercase tracking-tighter">
            <span className="h-1 w-1 rounded-full bg-[#00FF66] animate-ping" />
            {onlineCount}
          </span>

          {/* Unread Message Count Badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-gradient-to-r from-rose-500 to-red-600 text-[8px] text-white font-black h-4 w-4 rounded-full flex items-center justify-center animate-bounce border-2 border-slate-950 shadow-[0_0_10px_rgba(244,63,94,0.8)] z-20">
              {unreadCount}
            </span>
          )}
        </motion.button>
      </div>

      {/* Slide-out Chat Panel Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-[76px] right-2 sm:bottom-20 sm:right-6 z-[100] w-[340px] max-w-[calc(100vw-16px)] h-[420px] max-h-[calc(100vh-100px)] bg-slate-950/95 border border-slate-800 rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col shadow-[0_15px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl font-mono"
          >
            {/* Glossy Header */}
            <div className="p-4 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-indigo-500/10 pointer-events-none" />
              
              <div className="flex items-center gap-2 relative z-10">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <div className="flex flex-col">
                  <span className="text-xs font-black text-white uppercase tracking-wider leading-none">
                    GLOBAL COMMUNITY LOBBY
                  </span>
                  <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-1 flex items-center gap-1">
                    <Users className="h-2.5 w-2.5 text-cyan-400" /> {onlineCount.toLocaleString()} Players Chatting P2P
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  casinoAudio.playClick();
                  setIsOpen(false);
                }}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrolling Messages Area */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 items-start ${msg.isCurrentUser ? "flex-row-reverse" : ""}`}
                >
                  {/* Sender Avatar */}
                  <div className="h-8 w-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-base shrink-0 select-none shadow-sm">
                    {msg.avatar}
                  </div>

                  {/* Message Bubble Container */}
                  <div className={`flex flex-col max-w-[70%] ${msg.isCurrentUser ? "items-end" : ""}`}>
                    {/* Header info */}
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-black text-slate-300">
                        {msg.sender}
                      </span>
                      {msg.role && (
                        <span className={`px-1 rounded text-[7px] font-black border uppercase ${msg.roleColor}`}>
                          {msg.role}
                        </span>
                      )}
                      <span className="text-[8px] text-slate-500 font-sans">{msg.time}</span>
                    </div>

                    {/* Bubble Content */}
                    <div className={`p-2.5 rounded-2xl text-[11px] leading-relaxed font-sans ${
                      msg.isCurrentUser 
                        ? "bg-gradient-to-r from-cyan-600 to-indigo-600 text-white rounded-tr-none border border-cyan-500/20 shadow-md"
                        : "bg-slate-900/80 text-slate-200 rounded-tl-none border border-slate-900"
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Bar */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 bg-slate-900/40 border-t border-slate-900 flex gap-2"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Say something to 2400+ players..."
                className="flex-1 bg-slate-950 border border-slate-900 focus:border-cyan-500/50 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none transition-colors"
              />
              <button
                type="submit"
                className="p-2.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:brightness-115 rounded-xl text-white font-bold transition-all shrink-0 cursor-pointer flex items-center justify-center"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
