"use client";

import { useState, useRef, useEffect } from "react";

type Message = {
  role: "user" | "assistant";
  text: string;
  sources?: { title: string; url_path: string }[];
};

type ChatWidgetProps = {
  header: string;
  subheader: string;
  exampleQuestion: string;
};

export function ChatWidget({ header, subheader, exampleQuestion }: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || pending) return;

    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setPending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.answer, sources: data.sources },
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
    <div className="fixed bottom-5 right-5 z-50">
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
                    m.role === "user" ? "bg-teal text-bg" : "border border-line bg-bg text-fg"
                  }`}
                >
                  {m.text}
                </span>
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {m.sources.map((s) => (
                      <a
                        key={s.url_path}
                        href={s.url_path}
                        className="text-[11px] text-teal hover:underline"
                      >
                        {s.title} ↗
                      </a>
                    ))}
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
              className="flex-1 rounded-sm border border-line bg-bg px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-teal focus:outline-none"
            />
            <button
              type="submit"
              disabled={pending || !input.trim()}
              className="rounded-sm bg-teal px-3 py-2 text-sm font-semibold text-bg disabled:opacity-60"
            >
              Send
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="ml-auto flex items-center gap-2 rounded-full bg-teal px-4 py-3 text-sm font-semibold text-bg shadow-lg"
      >
        {open ? "Close" : "Ask a question"}
      </button>
    </div>
  );
}
