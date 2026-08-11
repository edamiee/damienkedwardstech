"use client";

import { useState, useRef, useEffect } from "react";

type Message = {
  role: "user" | "assistant";
  text: string;
  sources?: {
    title: string;
    url_path: string;
    lastUpdatedBy?: string;
    lastUpdatedAt?: string;
  }[];
  question?: string;
  feedback?: "up" | "down";
};

type ChatWidgetProps = {
  header: string;
  subheader: string;
  exampleQuestion: string;
};

// Line-art thumb icons in currentColor — plain 👍/👎 emoji render in their
// own fixed color on most platforms and ignore text-teal/text-rust
// entirely, which is why the buttons looked the same regardless of state.
function ThumbIcon({ direction }: { direction: "up" | "down" }) {
  return (
    <svg
      viewBox="0 0 20 20"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={direction === "down" ? "rotate-180" : undefined}
    >
      <path d="M7 8.5V17H4.5A1.5 1.5 0 0 1 3 15.5v-5A1.5 1.5 0 0 1 4.5 9H7Z" />
      <path d="M7 8.5 10.5 3a1.8 1.8 0 0 1 2 2l-1 3.5H15a2 2 0 0 1 1.9 2.7l-1.8 5A2 2 0 0 1 13.2 17H7" />
    </svg>
  );
}

export function ChatWidget({ header, subheader, exampleQuestion }: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open]);

  async function rateMessage(index: number, rating: "up" | "down") {
    const target = messages[index];
    if (target.role !== "assistant" || target.feedback) return;

    setMessages((prev) => prev.map((m, i) => (i === index ? { ...m, feedback: rating } : m)));

    try {
      await fetch("/api/chat/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question: target.question ?? "",
          answer: target.text,
          rating,
          sources: target.sources ?? [],
        }),
      });
    } catch {
      // Best-effort — a failed feedback POST shouldn't disrupt the chat.
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || pending) return;

    const history = messages.map(({ role, text }) => ({ role, text }));
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setPending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: question, history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.answer, sources: data.sources, question },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Something went wrong — try again in a moment." },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="chat-widget-launcher fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 flex h-[28rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-sm border border-line bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <p className="font-display text-sm">{header}</p>
              <p className="text-[11px] text-muted">{subheader}</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="text-muted hover:text-fg"
            >
              ✕
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <p className="text-sm text-muted">Try: &quot;{exampleQuestion}&quot;</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
                <span
                  className={`inline-block max-w-[85%] rounded-sm px-3 py-2 text-sm ${
                    m.role === "user" ? "bg-teal text-ground" : "border border-line bg-ground text-fg"
                  }`}
                >
                  {m.text}
                </span>
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-1.5 flex flex-col items-start gap-1">
                    {m.sources.map((s) => (
                      <div key={s.url_path} className="flex flex-wrap items-baseline gap-1.5">
                        <a href={s.url_path} className="text-[11px] text-teal hover:underline">
                          {s.title} ↗
                        </a>
                        {s.lastUpdatedBy && (
                          <span className="text-[10px] text-muted">
                            · last touched by {s.lastUpdatedBy} {s.lastUpdatedAt}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {m.role === "assistant" && (
                  <div className="mt-1 flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-label="Good answer"
                      onClick={() => rateMessage(i, "up")}
                      disabled={!!m.feedback}
                      className={`rounded-sm p-1 ${
                        m.feedback === "up"
                          ? "text-teal"
                          : m.feedback
                            ? "text-muted opacity-40"
                            : "text-muted hover:text-teal"
                      }`}
                    >
                      <ThumbIcon direction="up" />
                    </button>
                    <button
                      type="button"
                      aria-label="Bad answer"
                      onClick={() => rateMessage(i, "down")}
                      disabled={!!m.feedback}
                      className={`rounded-sm p-1 ${
                        m.feedback === "down"
                          ? "text-rust"
                          : m.feedback
                            ? "text-muted opacity-40"
                            : "text-muted hover:text-rust"
                      }`}
                    >
                      <ThumbIcon direction="down" />
                    </button>
                    {m.feedback && (
                      <span className="text-[10px] text-muted">Thanks for the feedback</span>
                    )}
                  </div>
                )}
              </div>
            ))}
            {pending && <p className="text-sm text-muted">Thinking…</p>}
          </div>

          <form onSubmit={sendMessage} className="flex gap-2 border-t border-line p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              maxLength={500}
              className="flex-1 rounded-sm border border-line bg-ground px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-teal focus:outline-none"
            />
            <button
              type="submit"
              disabled={pending || !input.trim()}
              className="rounded-sm bg-teal px-3 py-2 text-sm font-semibold text-ground disabled:opacity-60"
            >
              Send
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="ml-auto flex items-center gap-2 rounded-full bg-teal px-4 py-3 text-sm font-semibold text-ground shadow-lg"
      >
        {open ? "Close" : "Ask a question"}
      </button>
    </div>
  );
}
