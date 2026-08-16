import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  MessageSquare, Send, Image as ImageIcon, X, CheckCheck, 
  ShieldCheck, AlertCircle, FileText, User, RefreshCw, Sparkles, Download
} from "lucide-react";
import { casinoAudio } from "../lib/audioService";
import { 
  TransactionChatMessage, 
  getTransactionChatMessages, 
  sendTransactionChatMessage,
  compressImageBase64
} from "../lib/transactionChat";
import { BankingRequest } from "../types";

interface TransactionChatBoxProps {
  isOpen: boolean;
  onClose: () => void;
  request: BankingRequest | null;
  currentUser: {
    name: string;
    role: "player" | "subadmin" | "admin" | "agent" | "Sub-Admin";
    email?: string;
  };
}

export default function TransactionChatBox({
  isOpen,
  onClose,
  request,
  currentUser,
}: TransactionChatBoxProps) {
  const [messages, setMessages] = useState<TransactionChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef<number>(0);
  const wasOpenRef = useRef<boolean>(false);

  const requestId = request?.id || "";

  // Helper to scroll to bottom smoothly while respecting user scroll position
  const scrollToBottom = (force = false) => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    if (force || isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Reload messages when requestId changes or live event triggers
  const loadMessages = () => {
    if (!requestId) return;
    const msgs = getTransactionChatMessages(requestId);
    setMessages(msgs);
  };

  useEffect(() => {
    if (isOpen && requestId) {
      loadMessages();
      const interval = setInterval(loadMessages, 1500);

      const handleStorage = () => loadMessages();
      const handleCustom = () => loadMessages();

      window.addEventListener("storage", handleStorage);
      window.addEventListener("p2p_chat_updated", handleCustom as EventListener);
      window.addEventListener("casino_tx_chat_updated", handleCustom as EventListener);

      return () => {
        clearInterval(interval);
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener("p2p_chat_updated", handleCustom as EventListener);
        window.removeEventListener("casino_tx_chat_updated", handleCustom as EventListener);
      };
    }
  }, [isOpen, requestId]);

  // Auto-scroll on new messages or modal open
  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      return;
    }

    const isNewMessage = messages.length > prevMessagesLengthRef.current;
    const justOpened = !wasOpenRef.current;

    if (justOpened) {
      setTimeout(() => scrollToBottom(true), 50);
      wasOpenRef.current = true;
    } else if (isNewMessage) {
      scrollToBottom(false);
    }

    prevMessagesLengthRef.current = messages.length;
  }, [messages, isOpen]);

  if (!isOpen || !request) return null;

  // Handle file select (image proof attachment)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Image is too large. Please select an image proof under 2MB.");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const rawUrl = event.target?.result as string;
      if (rawUrl) {
        const compressed = await compressImageBase64(rawUrl, 800, 800, 0.65);
        setSelectedImage(compressed);
      }
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() && !selectedImage) return;

    const isSubAdmin = currentUser.role === "subadmin" || currentUser.role === "Sub-Admin" || currentUser.role === "admin";
    const isAgent = currentUser.role === "agent";
    const senderRole = isSubAdmin ? "subadmin" : (isAgent ? "agent" : "player");
    const senderName = currentUser.name || (isSubAdmin ? "Sub-Admin Verify Officer" : (isAgent ? "P2P Cashier Agent" : "Player"));

    sendTransactionChatMessage({
      requestId,
      senderId: currentUser.email || currentUser.name,
      senderName,
      senderRole,
      message: inputMessage.trim(),
      attachmentUrl: selectedImage || undefined,
      imageBase64: selectedImage || undefined,
      image: selectedImage || undefined,
    });

    casinoAudio.playChipClink();
    setInputMessage("");
    setSelectedImage(null);
    loadMessages();
    setTimeout(() => scrollToBottom(true), 50);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-[90]">
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 20 }}
          className="relative w-full max-w-xl h-[90vh] max-h-[700px] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-amber-500/40 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.2)] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 bg-slate-900/90 border-b border-amber-500/30 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 font-mono">
                <MessageSquare className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-mono font-black text-white text-sm sm:text-base tracking-wide">
                    Live Transaction Verification Chat
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                    request.status === "approved"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : request.status === "rejected"
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse"
                  }`}>
                    {request.status}
                  </span>
                </div>
                <p className="text-[10.5px] font-mono text-slate-400">
                  Request ID: <strong className="text-amber-400">{request.id}</strong> • {request.type.toUpperCase()} • ${request.amount?.toLocaleString()}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                casinoAudio.playClick();
                onClose();
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Transaction Metadata Snapshot Bar */}
          <div className="bg-slate-950/80 px-4 py-2 border-b border-white/5 text-[10px] font-mono grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-300 shrink-0">
            <div>
              <span className="text-slate-500 block">PLAYER</span>
              <span className="text-amber-200 font-bold truncate block">{request.playerName}</span>
            </div>
            <div>
              <span className="text-slate-500 block">SUBMITTED TXID / ADDR</span>
              <span className="text-amber-300 font-bold truncate block">{request.transactionId || request.cryptoTxHash || request.cryptoWalletAddress || "N/A"}</span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-slate-500 block">CRYPTO ASSET / NETWORK</span>
              <span className="text-emerald-400 font-bold block">{request.mobileBankingService || request.cryptoAsset || "USDT TRC20"}</span>
            </div>
          </div>

          {/* Chat Messages Body */}
          <div ref={scrollContainerRef} className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-gradient-to-b from-slate-950/60 to-slate-900/40">
            {messages.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <div className="h-12 w-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <p className="text-xs font-mono text-slate-400">
                  Live verification channel ready. Send a message or upload your payment screenshot proof below!
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === (currentUser.email || currentUser.name) || 
                  (currentUser.role === "subadmin" && msg.senderRole === "subadmin") ||
                  (currentUser.role === "agent" && msg.senderRole === "agent") ||
                  (currentUser.role === "player" && msg.senderRole === "player");

                const isSystem = msg.senderRole === "system";

                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center my-2">
                      <div className="px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-[10px] font-mono text-amber-300 flex items-center gap-1.5 shadow-[0_0_10px_rgba(245,158,11,0.15)]">
                        <Sparkles className="h-3 w-3 text-amber-400 animate-spin" />
                        <span>{msg.message}</span>
                        <span className="text-slate-500 ml-1">({msg.timestamp})</span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-1.5 text-[9.5px] font-mono text-slate-400 mb-1 px-1">
                      <span className={`font-bold ${msg.senderRole === "subadmin" ? "text-amber-400" : msg.senderRole === "agent" ? "text-cyan-400" : "text-emerald-400"}`}>
                        {msg.senderName} {msg.senderRole === "subadmin" ? "🛡️ (Sub-Admin)" : msg.senderRole === "agent" ? "⚡ (P2P Agent)" : "👤 (Player)"}
                      </span>
                      <span>•</span>
                      <span>{msg.timestamp}</span>
                    </div>

                    <div
                      className={`max-w-[85%] p-3 rounded-2xl text-xs font-mono border shadow-md space-y-2 ${
                        isMe
                          ? "bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 text-slate-950 font-medium border-amber-300/60 rounded-tr-none"
                          : "bg-slate-900 text-slate-100 border-slate-800 rounded-tl-none"
                      }`}
                    >
                      {msg.message && <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>}

                      {/* Image Attachment Preview */}
                      {(msg.attachmentUrl || msg.imageBase64 || msg.image) && (
                        <div className="rounded-xl overflow-hidden border border-black/20 mt-1 bg-black/40">
                          <a href={msg.attachmentUrl || msg.imageBase64 || msg.image} target="_blank" rel="noreferrer">
                            <img
                              src={msg.attachmentUrl || msg.imageBase64 || msg.image}
                              alt="Payment Proof Screenshot"
                              className="max-h-52 w-full object-contain hover:scale-105 transition-transform cursor-pointer"
                            />
                          </a>
                          <span className="text-[9px] block p-1 text-center opacity-80 underline">
                            Click to view full image proof
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Selected Attachment Preview Box */}
          {selectedImage && (
            <div className="px-4 py-2 bg-slate-900 border-t border-amber-500/20 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <img src={selectedImage} alt="Attachment Preview" className="h-10 w-10 object-cover rounded-lg border border-amber-400" />
                <span className="text-[11px] font-mono text-amber-300">Screenshot Attached ready to send</span>
              </div>
              <button
                onClick={() => setSelectedImage(null)}
                className="p-1 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Input Footer */}
          <form onSubmit={handleSendMessage} className="p-3 bg-slate-900/90 border-t border-amber-500/30 flex items-center gap-2 shrink-0">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach Payment Proof Screenshot"
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 transition-all cursor-pointer flex items-center justify-center shrink-0"
            >
              <ImageIcon className="h-4 w-4" />
            </button>

            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type message or paste TXID proof..."
              className="flex-1 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none transition-all"
            />

            <button
              type="submit"
              disabled={!inputMessage.trim() && !selectedImage}
              className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-mono font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.4)]"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
