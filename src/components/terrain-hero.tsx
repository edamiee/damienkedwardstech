"use client";

import { useSyncExternalStore } from "react";
import dynamic from "next/dynamic";

const TerrainScene = dynamic(
  () => import("./terrain-scene").then((mod) => mod.TerrainScene),
  { ssr: false, loading: () => null }
);

const QUERY = "(min-width: 1024px) and (prefers-reduced-motion: no-preference)";

function subscribe(callback: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

// Interactive contour terrain for the hero — tilts toward the pointer and
// sends out a ripple on click/tap. Mounted only when the viewport is wide
// enough and the OS isn't requesting reduced motion; useSyncExternalStore
// keeps that current if either changes, without a setState-in-effect.
// Colors are fixed rather than read from the theme's CSS variables — chosen
// as a midpoint that stays legible against both the light and dark grounds.
export function TerrainHero() {
  const shouldRender = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!shouldRender) return null;

  return (
    <div
      className="pointer-events-auto absolute inset-y-0 right-0 hidden w-[48%] lg:block"
      aria-hidden="true"
    >
      <TerrainScene color="#4f9b8f" lineColor="#c9714a" />
      <span className="hero-hint pointer-events-none absolute bottom-8 right-8 rounded-full border border-line bg-surface/80 px-3 py-1 text-xs uppercase tracking-[0.1em] text-muted backdrop-blur-sm">
        drag to explore
      </span>
    </div>
  );
}
