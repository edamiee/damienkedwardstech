import Link from "next/link";
import type { NavLink } from "@/lib/nav-links";
import type { SiteIndexItem } from "@/lib/site-index";
import { MobileNav } from "./mobile-nav";
import { CommandPalette } from "./command-palette";

export function SiteHeader({
  links,
  name,
  siteIndex,
}: {
  links: NavLink[];
  name: string;
  siteIndex: SiteIndexItem[];
}) {
  return (
    <header className="relative border-b border-line">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-6 py-5">
        <Link
          href="/"
          className="truncate font-display text-base font-bold tracking-tight sm:text-lg"
        >
          {name}
        </Link>
        <nav className="hidden items-center gap-6 text-sm sm:flex">
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
        <div className="flex items-center gap-2">
          <CommandPalette items={siteIndex} />
          <MobileNav links={links} />
        </div>
      </div>
    </header>
  );
}
