import Link from "next/link";
import type { NavLink } from "@/lib/nav-links";

export function SiteHeader({ links }: { links: NavLink[] }) {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
        <Link href="/" className="font-display text-lg font-bold tracking-tight">
          Damien K. Edwards
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          {links.map((link) => (
            <Link
              key={link.id}
              href={link.href}
              className="text-teal hover:opacity-80"
            >
              {link.href === "/projects" ? `${link.label} ⚑` : link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
