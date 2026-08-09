"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SiteIndexItem } from "@/lib/site-index";

export function CommandPalette({ items }: { items: SiteIndexItem[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const results = query.trim()
    ? items
        .filter((item) => item.title.toLowerCase().includes(query.trim().toLowerCase()))
        .slice(0, 8)
    : items.slice(0, 8);

  function openPalette() {
    setQuery("");
    setActiveIndex(0);
    setOpen(true);
  }

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openPalette();
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function handleQueryChange(value: string) {
    setQuery(value);
    setActiveIndex(0);
  }

  function go(href: string) {
    setOpen(false);
    if (href.startsWith("/")) {
      router.push(href);
    } else {
      window.open(href, "_blank", "noreferrer");
    }
  }

  function handleInputKeydown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[activeIndex];
      if (item) go(item.href);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openPalette}
        aria-label="Search the site"
        className="flex items-center gap-1.5 rounded-sm border border-line px-2.5 py-1.5 text-[11.5px] text-muted hover:text-teal"
      >
        <span className="hidden sm:inline">Search</span>
        <span className="font-data">⌘K</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 px-4 pt-24"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-sm border border-line bg-ground shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={handleInputKeydown}
              placeholder="Jump to a page or post..."
              className="w-full border-b border-line bg-transparent px-4 py-3 text-sm text-fg placeholder:text-muted focus:outline-none"
            />
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((item, i) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => go(item.href)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm ${
                      i === activeIndex ? "bg-surface text-teal" : "text-fg"
                    }`}
                  >
                    <span className="truncate">{item.title}</span>
                    <span className="whitespace-nowrap font-data text-[10.5px] uppercase tracking-[0.06em] text-muted">
                      {item.kind}
                    </span>
                  </button>
                </li>
              ))}
              {results.length === 0 && (
                <li className="px-4 py-3 text-sm text-muted">No matches.</li>
              )}
            </ul>
            <p className="border-t border-line px-4 py-2 text-[10.5px] text-muted">
              ↑↓ navigate · Enter go · Esc close · press{" "}
              <span className="font-data">?</span> elsewhere for all shortcuts
            </p>
          </div>
        </div>
      )}
    </>
  );
}
