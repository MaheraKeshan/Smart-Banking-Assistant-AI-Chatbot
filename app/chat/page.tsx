"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type LoanType = { id: number; name: string; interest_rate: string; max_amount: string; duration: string; description: string };
type Message = {
  role: "user" | "bot";
  text: string;
  loanTypes?: LoanType[];
  confidence?: string;
  time: string;
};
type Chat = {
  id: string;
  title: string;
  messages: Message[];
  teachMode: boolean;
  teachQuestion: string;
};

function now() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function newChat(id: string): Chat {
  return {
    id,
    title: "New Conversation",
    messages: [
      {
        role: "bot",
        text: "Welcome to Smart Bank. How can I assist you today?",
        time: now(),
        confidence: "high",
      },
    ],
    teachMode: false,
    teachQuestion: "",
  };
}

export default function ChatPage() {
  const [chats, setChats] = useState<Chat[]>([newChat("1")]);
  const [activeChatId, setActiveChatId] = useState("1");
  const [input, setInput] = useState("");
  const [teachInput, setTeachInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const nextId = useRef(2);

  const activeChat = chats.find((c) => c.id === activeChatId)!;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 192) + "px";
  }, [input]);

  function updateChat(id: string, updater: (c: Chat) => Chat) {
    setChats((prev) => prev.map((c) => (c.id === id ? updater(c) : c)));
  }

  function createNewChat() {
    const id = String(nextId.current++);
    setChats((prev) => [...prev, newChat(id)]);
    setActiveChatId(id);
    setInput("");
  }

  function deleteChat(id: string) {
    setChats((prev) => {
      const remaining = prev.filter((c) => c.id !== id);
      if (remaining.length === 0) {
        const fresh = newChat(String(nextId.current++));
        setActiveChatId(fresh.id);
        return [fresh];
      }
      if (activeChatId === id) setActiveChatId(remaining[remaining.length - 1].id);
      return remaining;
    });
  }

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", text, time: now() };

    // Set title from first user message
    updateChat(activeChatId, (c) => ({
      ...c,
      title: c.messages.length === 1 ? text.slice(0, 36) + (text.length > 36 ? "…" : "") : c.title,
      messages: [...c.messages, userMsg],
    }));

    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();

      const botMsg: Message = {
        role: "bot",
        text: data.reply,
        loanTypes: data.loanTypes,
        confidence: data.confidence,
        time: now(),
      };

      updateChat(activeChatId, (c) => ({
        ...c,
        messages: [...c.messages, botMsg],
        teachMode: !!data.unknown,
        teachQuestion: data.question ?? "",
      }));
    } finally {
      setLoading(false);
    }
  }, [input, loading, activeChatId]);

  async function submitTeach() {
    const answer = teachInput.trim();
    if (!answer) return;

    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: activeChat.teachQuestion, teachAnswer: answer }),
    });

    updateChat(activeChatId, (c) => ({
      ...c,
      messages: [
        ...c.messages,
        { role: "bot", text: "Got it — I'll remember that. 🧠", time: now(), confidence: "high" },
      ],
      teachMode: false,
      teachQuestion: "",
    }));
    setTeachInput("");
  }

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ background: "#fcf8f9", fontFamily: "Inter, sans-serif" }}>

      {/* ── Sidebar ── */}
      <aside
        className="flex flex-col h-full shrink-0"
        style={{ width: 272, background: "#f0edef", padding: "24px 16px" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 px-2">
          <div
            className="flex items-center justify-center"
            style={{
              width: 40, height: 40, borderRadius: 12,
              background: "linear-gradient(135deg, #585f6b, #4c535f)",
              color: "#f6f7ff", flexShrink: 0,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>account_balance</span>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#323235", letterSpacing: "-0.02em" }}>Smart Bank</div>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#7b7a7d", fontWeight: 600 }}>
              Assistant
            </div>
          </div>
        </div>

        {/* New Chat CTA */}
        <button
          onClick={createNewChat}
          className="flex items-center justify-center gap-2 w-full mb-6 transition-transform active:scale-95"
          style={{
            padding: "11px 16px", borderRadius: 10,
            background: "linear-gradient(135deg, #585f6b, #4c535f)",
            color: "#f6f7ff", fontWeight: 500, fontSize: 14,
            border: "none", cursor: "pointer",
            boxShadow: "0 2px 8px rgba(88,95,107,0.25)",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_comment</span>
          New Conversation
        </button>

        {/* Section label */}
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#7b7a7d", fontWeight: 700, padding: "0 8px", marginBottom: 6 }}>
          Recent Threads
        </div>

        {/* Chat list */}
        <nav className="flex-1 overflow-y-auto space-y-1" style={{ marginRight: -4, paddingRight: 4 }}>
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => setActiveChatId(chat.id)}
              className="group flex items-center gap-2 cursor-pointer transition-all"
              style={{
                padding: "9px 12px", borderRadius: 8,
                background: chat.id === activeChatId ? "#ffffff" : "transparent",
                boxShadow: chat.id === activeChatId ? "0 1px 4px rgba(50,50,53,0.08)" : "none",
              }}
              onMouseEnter={(e) => { if (chat.id !== activeChatId) (e.currentTarget as HTMLDivElement).style.background = "#e3e2e4"; }}
              onMouseLeave={(e) => { if (chat.id !== activeChatId) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: chat.id === activeChatId ? "#585f6b" : "#7b7a7d", flexShrink: 0 }}>chat</span>
              <span
                className="flex-1 truncate"
                style={{ fontSize: 13, fontWeight: chat.id === activeChatId ? 600 : 400, color: chat.id === activeChatId ? "#323235" : "#5f5f61" }}
              >
                {chat.title}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "#7b7a7d", borderRadius: 4, flexShrink: 0 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
              </button>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ paddingTop: 16, borderTop: "1px solid rgba(178,177,180,0.15)", marginTop: 8 }}>
          <div
            className="flex items-center gap-3 transition-colors"
            style={{ padding: "10px 12px", borderRadius: 8, cursor: "pointer", color: "#5f5f61" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "#e3e2e4")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "transparent")}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>account_circle</span>
            <span style={{ fontSize: 13, fontWeight: 500 }}>Account</span>
          </div>
        </div>
      </aside>

      {/* ── Main Canvas ── */}
      <main className="flex-1 flex flex-col overflow-hidden" style={{ background: "#fcf8f9" }}>

        {/* Top Bar */}
        <header
          className="flex justify-between items-center shrink-0"
          style={{
            height: 64, padding: "0 48px",
            background: "rgba(252,248,249,0.85)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(178,177,180,0.12)",
          }}
        >
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 17, fontWeight: 600, color: "#323235", letterSpacing: "-0.02em" }}>
              Smart Banking Assistant
            </span>
            <div style={{ width: 1, height: 16, background: "rgba(178,177,180,0.4)", margin: "0 4px" }} />
            <span style={{ fontSize: 13, color: "#7b7a7d", fontWeight: 500 }}>
              {activeChat.title === "New Conversation" ? "Current Session" : activeChat.title}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1.5" style={{ fontSize: 10, color: "#7b7a7d", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#585f6b", display: "inline-block", animation: "pulse 2s infinite" }} />
              Connected
            </div>
          </div>
        </header>

        {/* Messages */}
        <section className="flex-1 overflow-y-auto" style={{ padding: "48px 96px" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>

            {/* Welcome state — shown only on fresh chat */}
            {activeChat.messages.length === 1 && (
              <div style={{ marginBottom: 56 }}>
                <h1 style={{ fontSize: "2.25rem", fontWeight: 700, color: "#323235", lineHeight: 1.2, letterSpacing: "-0.03em", marginBottom: 16 }}>
                  Welcome to Smart Bank.<br />How can I assist you today?
                </h1>
                <p style={{ fontSize: 16, color: "#7b7a7d", lineHeight: 1.7, maxWidth: 480 }}>
                  Ask me about loans, credit cards, account balances, transfers, or anything banking related.
                </p>
              </div>
            )}

            {/* Message flow */}
            <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
              {activeChat.messages.map((m, i) =>
                m.role === "bot" ? (
                  // Bot — editorial uncontained style
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div className="flex items-center gap-2">
                      <div
                        style={{
                          width: 24, height: 24, borderRadius: 6,
                          background: "#e3e2e4",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 13, color: "#585f6b" }}>account_balance</span>
                      </div>
                      <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#7b7a7d", fontWeight: 700 }}>
                        Smart Bank
                      </span>
                    </div>
                    <div style={{ fontSize: 16, color: "#323235", lineHeight: 1.75, fontWeight: 400 }}>
                      {m.text}
                      {m.loanTypes && <LoanTable loans={m.loanTypes} />}
                    </div>
                    <div className="flex items-center gap-3">
                      <span style={{ fontSize: 10, color: "rgba(95,95,97,0.5)", fontWeight: 500 }}>{m.time}</span>
                      {m.confidence && <ConfidenceBadge level={m.confidence} />}
                    </div>
                  </div>
                ) : (
                  // User — contained secondary-container block
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                    <div
                      style={{
                        maxWidth: "85%", background: "#e1e2e9",
                        color: "#4f5257", padding: "20px 24px",
                        borderRadius: 12,
                        boxShadow: "0 1px 4px rgba(50,50,53,0.06)",
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, color: "#7b7a7d", textTransform: "uppercase", letterSpacing: "0.06em" }}>You</div>
                      <p style={{ fontSize: 15, lineHeight: 1.65, fontWeight: 500, margin: 0 }}>{m.text}</p>
                    </div>
                    <span style={{ fontSize: 10, color: "rgba(95,95,97,0.5)", fontWeight: 500, paddingRight: 4 }}>
                      Delivered • {m.time}
                    </span>
                  </div>
                )
              )}

              {/* Loading pulse */}
              {loading && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, opacity: 0.5 }}>
                  <div className="flex items-center gap-2">
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: "#e3e2e4", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 13, color: "#585f6b" }}>account_balance</span>
                    </div>
                    <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#7b7a7d", fontWeight: 700 }}>
                      Smart Bank is thinking
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[90, 70, 45].map((w, i) => (
                      <div
                        key={i}
                        style={{ height: 14, borderRadius: 999, background: "#e3e2e4", width: `${w}%`, animation: "pulse 1.5s ease-in-out infinite" }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div ref={bottomRef} />
          </div>
        </section>

        {/* Teach Mode Banner */}
        {activeChat.teachMode && (
          <div style={{ padding: "12px 96px", background: "#f6f3f4", borderTop: "1px solid rgba(178,177,180,0.15)" }}>
            <div style={{ maxWidth: 720, margin: "0 auto" }}>
              <p style={{ fontSize: 12, color: "#5f5f61", marginBottom: 8 }}>
                🎓 Teach me — what should I answer for: <strong>"{activeChat.teachQuestion}"</strong>?
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={teachInput}
                  onChange={(e) => setTeachInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitTeach()}
                  placeholder="Type the correct answer..."
                  style={{
                    flex: 1, padding: "8px 14px", borderRadius: 8,
                    border: "1px solid rgba(178,177,180,0.4)",
                    background: "#ffffff", fontSize: 13, color: "#323235",
                    outline: "none",
                  }}
                />
                <button
                  onClick={submitTeach}
                  style={{ padding: "8px 16px", borderRadius: 8, background: "linear-gradient(135deg,#585f6b,#4c535f)", color: "#f6f7ff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500 }}
                >
                  Teach
                </button>
                <button
                  onClick={() => updateChat(activeChatId, (c) => ({ ...c, teachMode: false }))}
                  style={{ padding: "8px 14px", borderRadius: 8, background: "#e3e2e4", color: "#5f5f61", border: "none", cursor: "pointer", fontSize: 13 }}
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Input Bar */}
        <footer style={{ padding: "24px 96px 32px", background: "linear-gradient(to top, #fcf8f9 80%, transparent)" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div
              style={{
                background: "#e9e7ea",
                borderRadius: 14, padding: 8,
                display: "flex", alignItems: "flex-end", gap: 8,
                transition: "background 0.2s, box-shadow 0.2s",
                boxShadow: "0 1px 4px rgba(50,50,53,0.06)",
              }}
              onFocusCapture={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = "#ffffff";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 0 1px rgba(88,95,107,0.2), 0 4px 16px rgba(50,50,53,0.08)";
              }}
              onBlurCapture={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = "#e9e7ea";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 4px rgba(50,50,53,0.06)";
              }}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Ask me about loans, cards, balance..."
                disabled={loading}
                rows={1}
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  padding: "12px 8px 12px 12px", fontSize: 14, color: "#323235",
                  resize: "none", lineHeight: 1.6, fontFamily: "Inter, sans-serif",
                  minHeight: 48, maxHeight: 192,
                }}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                style={{
                  width: 40, height: 40, borderRadius: 10, border: "none", cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                  background: loading || !input.trim() ? "#b2b1b4" : "linear-gradient(135deg, #585f6b, #4c535f)",
                  color: "#f6f7ff", display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, transition: "background 0.2s, transform 0.1s",
                  boxShadow: loading || !input.trim() ? "none" : "0 2px 8px rgba(88,95,107,0.3)",
                }}
                onMouseDown={(e) => { if (!loading && input.trim()) (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.93)"; }}
                onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_upward</span>
              </button>
            </div>
            <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", padding: "0 4px" }}>
              <span style={{ fontSize: 10, color: "#7b7a7d", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Banking Knowledge Base
              </span>
              <span style={{ fontSize: 10, color: "rgba(123,122,125,0.6)" }}>Shift + Enter for new line</span>
            </div>
          </div>
        </footer>
      </main>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d3d4da; border-radius: 4px; }
      `}</style>
    </div>
  );
}

function ConfidenceBadge({ level }: { level: string }) {
  const config: Record<string, { label: string; color: string; bg: string }> = {
    high:   { label: "● High confidence",   color: "#1b5e20", bg: "#c8e6c9" },
    medium: { label: "◑ Medium confidence", color: "#e65100", bg: "#ffe0b2" },
    low:    { label: "○ Low confidence",    color: "#7b7a7d", bg: "#e3e2e4" },
  };
  const c = config[level];
  if (!c) return null;
  return (
    <span style={{ fontSize: 10, fontWeight: 600, color: c.color, background: c.bg, borderRadius: 10, padding: "2px 8px", display: "inline-block" }}>
      {c.label}
    </span>
  );
}

function LoanTable({ loans }: { loans: LoanType[] }) {
  return (
    <div style={{ marginTop: 16, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(178,177,180,0.25)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#585f6b", color: "#f6f7ff" }}>
            {["Type", "Purpose", "Rate", "Max Amount", "Duration"].map((h) => (
              <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loans.map((l, i) => (
            <tr key={l.id} style={{ background: i % 2 === 0 ? "#ffffff" : "#f6f3f4" }}>
              <td style={{ padding: "10px 14px", fontWeight: 600, color: "#323235" }}>{l.name}</td>
              <td style={{ padding: "10px 14px", color: "#7b7a7d", fontSize: 12 }}>{l.description}</td>
              <td style={{ padding: "10px 14px", color: "#5f5f61" }}>{l.interest_rate}</td>
              <td style={{ padding: "10px 14px", color: "#5f5f61" }}>{l.max_amount}</td>
              <td style={{ padding: "10px 14px", color: "#5f5f61" }}>{l.duration}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
