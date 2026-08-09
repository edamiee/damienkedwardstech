"use client";

import { useState } from "react";
import Link from "next/link";
import type { NavLink } from "@/lib/nav-links";

export function MobileNav({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="flex h-9 w-9 flex-col items-center justify-center gap-1.5"
      >
        <span
          className={`block h-px w-5 bg-fg transition-transform ${open ? "translate-y-[6.5px] rotate-45" : ""}`}
        />
        <span className={`block h-px w-5 bg-fg transition-opacity ${open ? "opacity-0" : ""}`} />
        <span
          className={`block h-px w-5 bg-fg transition-transform ${open ? "-translate-y-[6.5px] -rotate-45" : ""}`}
        />
      </button>

      {open && (
        <nav className="absolute inset-x-0 top-full z-50 border-b border-line bg-ground px-6 py-4 shadow-lg">
          <ul className="flex flex-col gap-4 text-sm">
            {links.map((link) => (
              <li key={link.id}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block text-teal hover:opacity-80"
                >
                  {link.href === "/projects" ? `${link.label} ⚑` : link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
