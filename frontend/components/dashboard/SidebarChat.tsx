"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { DateRange } from "@/types";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Who are the most active agents today?",
  "How many videos were generated this week?",
  "List users who generated videos today",
  "What are the peak usage hours?",
  "Studio job completion rate this month",
  "Which agent has sent the most messages?",
];

let msgId = 0;
const nextId = () => String(++msgId);

// ---------------------------------------------------------------------------
// Plain-text renderer
// Converts "- item" lines into bullet points, strips stray ** markers
// ---------------------------------------------------------------------------
function renderContent(text: string) {
  const clean = text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1");

  const lines = clean.split("\n");
  const nodes: React.ReactNode[] = [];
  let bullets: string[] = [];

  const flushBullets = (key: string) => {
    if (bullets.length === 0) return;
    nodes.push(
      <ul key={key} className="mt-1 space-y-0.5">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-1.5 items-start">
            <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-blue-400 flex-shrink-0" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    );
    bullets = [];
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      bullets.push(trimmed.replace(/^[-•]\s+/, ""));
    } else {
      flushBullets(`b-${i}`);
      if (trimmed !== "") {
        nodes.push(
          <p key={i} className={nodes.length > 0 ? "mt-1" : ""}>
            {trimmed}
          </p>
        );
      }
    }
  });
  flushBullets("b-end");

  return <div className="space-y-0">{nodes}</div>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface Props {
  range: DateRange;
}

const GREETING_ID = "0";

export function SidebarChat({ range }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: GREETING_ID,
      role: "assistant",
      content:
        "Ask me anything in plain English — I'll query the live database and give you a real answer. Try the suggestions below or type your own question.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput("");

    const userMsg: Message = { id: nextId(), role: "user", content: trimmed };

    // Build history from all real exchanges (exclude the initial greeting)
    // This gives Claude context for follow-up questions like "who generated this?"
    const history = messages
      .filter((m) => m.id !== GREETING_ID)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const { reply } = await api.chat(trimmed, range, history);
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "assistant", content: reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "assistant",
          content: "Couldn't reach the backend. Make sure the API is running.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const showSuggestions = messages.length === 1;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 flex-shrink-0">
        <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-blue-50 flex-shrink-0">
          <Bot className="h-3.5 w-3.5 text-blue-600" />
        </span>
        <span className="text-xs font-semibold text-gray-700">Ask AskAlpha</span>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-2 space-y-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[88%] rounded-xl px-3 py-2 text-xs leading-relaxed",
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-gray-100 text-gray-700 rounded-bl-sm"
              )}
            >
              {msg.role === "assistant" ? renderContent(msg.content) : msg.content}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-xl rounded-bl-sm px-3 py-2 flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 text-gray-400 animate-spin" />
              <span className="text-xs text-gray-400">Thinking…</span>
            </div>
          </div>
        )}

        {/* Suggestion chips */}
        {showSuggestions && !loading && (
          <div className="pt-1 flex flex-col gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-left text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg px-3 py-1.5 transition-colors border border-blue-100"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-3 pb-3 pt-1">
        <div className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask a question…"
            disabled={loading}
            className="flex-1 text-xs bg-transparent outline-none text-gray-800 placeholder:text-gray-400 disabled:opacity-50"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="h-5 w-5 inline-flex items-center justify-center rounded-md text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            <Send className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
