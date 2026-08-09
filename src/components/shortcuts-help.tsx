"use client";

import { useEffect, useState } from "react";

const SHORTCUTS = [
  { keys: "⌘K / Ctrl+K", desc: "Open search" },
  { keys: "↑ / ↓", desc: "Navigate results" },
  { keys: "Enter", desc: "Go to selected result" },
  { keys: "Esc", desc: "Close any open panel" },
  { keys: "?", desc: "Show this help" },
];

export function ShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (e.key === "?" && !isTyping) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-sm rounded-sm border border-line bg-bg p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-teal">
          Keyboard shortcuts
        </p>
        <ul className="mt-4 flex flex-col gap-2.5">
          {SHORTCUTS.map((s) => (
            <li key={s.keys} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted">{s.desc}</span>
              <span className="font-data text-[11.5px] text-fg">{s.keys}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
