"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Sparkles, X, Send, Loader2, Bot, User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatbotResponse {
  reply: string;
  fallback?: boolean;
}

const WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  content: "Selamat datang! Saya PEKB Assistant, pembantu AI untuk sistem eBantuan-PEKB. Bagaimana saya boleh membantu anda hari ini?",
};

const QUICK_SUGGESTIONS = [
  "Apakah kriteria kelayakan B40?",
  "Dokumen diperlukan untuk baik pulih rumah?",
  "Apakah perbezaan Trek 1 dan Trek 2?",
  "Bagaimana status permohonan saya?",
];

export function AIChatbotWidget() {
  const chatbotOpen = useAppStore((s) => s.chatbotOpen);
  const toggleChatbot = useAppStore((s) => s.toggleChatbot);
  const user = useAppStore((s) => s.user);

  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (chatbotOpen) {
      setHasShownWelcome(true);
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [chatbotOpen]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const history = nextMessages
        .slice(-7, -1) // exclude the just-added user message, take last 6
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await api.post<ChatbotResponse>("/api/ai/chatbot", {
        message: trimmed,
        history,
        userId: user?.id,
      });
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Maaf, saya tidak dapat membalas sekarang. Sila cuba sebentar lagi.";
      setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${errMsg}` }]);
      toast.error("Chatbot tidak tersedia seketika");
    } finally {
      setLoading(false);
    }
  }, [messages, loading, user]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleClose = () => {
    toggleChatbot(false);
  };

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!chatbotOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            onClick={() => toggleChatbot(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent text-white shadow-2xl flex items-center justify-center group hover:scale-110 transition-transform"
            aria-label="Buka Chatbot AI"
          >
            <span className="absolute inset-0 rounded-full bg-accent/40 animate-pulse-glow -z-10" />
            <Sparkles className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            </span>
            <span className="absolute right-16 top-1/2 -translate-y-1/2 hidden md:flex items-center glass-strong rounded-full px-3 py-1.5 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md">
              Tanya PEKB Assistant
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {chatbotOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="fixed z-50 inset-x-3 bottom-3 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[380px] flex flex-col glass-strong rounded-2xl shadow-2xl overflow-hidden"
            style={{ maxHeight: "min(600px, calc(100vh - 2rem))" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/40 bg-gradient-to-r from-primary/95 to-accent/95 text-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm leading-tight">PEKB Assistant</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                    <span className="text-[10px] opacity-90">Dalam talian</span>
                    <Badge variant="outline" className="text-[9px] py-0 h-4 border-white/40 bg-white/10 text-white ml-1">
                      GLM-4.5
                    </Badge>
                  </div>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                aria-label="Tutup chatbot"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3 bg-background/40"
              style={{ minHeight: "260px" }}
            >
              {messages.map((m, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-start gap-2 ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {m.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                      m.role === "user"
                        ? "bg-gradient-to-br from-primary to-accent text-white rounded-tr-sm shadow-md"
                        : "glass border border-border/40 rounded-tl-sm"
                    }`}
                  >
                    {m.content}
                  </div>
                  {m.role === "user" && (
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                      <UserIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 justify-start"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="glass border border-border/40 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </motion.div>
              )}
            </div>

            {/* Quick suggestions */}
            {messages.length <= 1 && !loading && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5 bg-background/40">
                {QUICK_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-[11px] px-2.5 py-1.5 rounded-full glass border border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-colors text-foreground/80"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-border/40 bg-background/60">
              <div className="flex items-center gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Taip soalan anda..."
                  disabled={loading}
                  className="flex-1 bg-background/80 border-border/50 focus-visible:ring-accent/40"
                />
                <Button
                  size="icon"
                  onClick={() => sendMessage(input)}
                  disabled={loading || !input.trim()}
                  className="bg-gradient-to-br from-primary to-accent text-white shadow-md flex-shrink-0"
                  aria-label="Hantar mesej"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                PEKB Assistant · AI boleh membuat kesilapan. Semak maklumat penting.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
