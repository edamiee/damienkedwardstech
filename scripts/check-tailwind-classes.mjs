#!/usr/bin/env node
// Catches the failure mode behind commit f86f4cc: a Tailwind v4 color
// token whose name collides with a reserved utility word (e.g. "bg",
// or "base" which is Tailwind's own font-size scale) silently produces
// NO compiled CSS for bg-*/text-*/border-* — no build error, no warning,
// just an invisible-text button that only shows up by eye. This scans the
// production build's compiled CSS and fails if any bg-*/text-*/border-*
// class built from this project's own color tokens (read from
// globals.css) is used in source but never actually generated.
//
// Run after `next build` (wired as the "postbuild" npm script) — needs
// the compiled CSS on disk in .next/static.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, "src");
const NEXT_STATIC_DIR = join(ROOT, ".next", "static");
const GLOBALS_CSS = join(SRC_DIR, "app", "globals.css");
const PREFIXES = ["bg", "text", "border"];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) walk(path, out);
    else if (/\.(tsx|ts|jsx|js|css)$/.test(entry)) out.push(path);
  }
  return out;
}

function getColorTokens() {
  const css = readFileSync(GLOBALS_CSS, "utf8");
  const tokens = [];
  for (const match of css.matchAll(/--color-([a-z0-9-]+):/g)) {
    tokens.push(match[1]);
  }
  if (tokens.length === 0) {
    throw new Error(`No --color-* tokens found in ${GLOBALS_CSS}`);
  }
  return tokens;
}

function findUsedClasses(files, tokens) {
  // Longest tokens first, so "term-fg-dim" wins over the shorter "term-fg"
  // at the same position instead of the alternation stopping early.
  const sortedTokens = [...tokens].sort((a, b) => b.length - a.length);
  // Negative lookbehind excludes variant-prefixed usage (hover:text-teal,
  // [&_a]:text-teal, ...) — Tailwind compiles those independently of the
  // bare class, and a collision breaks the bare form too, so checking only
  // bare usage still catches the bug without false-positiving on variants
  // whose compiled selector this script doesn't attempt to reconstruct.
  const pattern = new RegExp(
    `(?<![:\\w-])(${PREFIXES.join("|")})-(${sortedTokens.join("|")})\\b`,
    "g"
  );
  const used = new Set();
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(pattern)) {
      used.add(`${match[1]}-${match[2]}`);
    }
  }
  return used;
}

function findCompiledCss() {
  let cssFiles;
  try {
    cssFiles = walk(NEXT_STATIC_DIR).filter((f) => f.endsWith(".css"));
  } catch {
    cssFiles = [];
  }
  if (cssFiles.length === 0) {
    console.error(`No compiled CSS found under ${NEXT_STATIC_DIR} — run \`next build\` first.`);
    process.exit(1);
  }
  return cssFiles.map((f) => readFileSync(f, "utf8")).join("\n");
}

const tokens = getColorTokens();
const usedClasses = findUsedClasses(walk(SRC_DIR), tokens);
const compiledCss = findCompiledCss();

const missing = [...usedClasses].filter((cls) => {
  const escaped = cls.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return !new RegExp(`\\.${escaped}[{,]`).test(compiledCss);
});

if (missing.length > 0) {
  console.error(
    "\nThese Tailwind classes are used in source but produced NO compiled CSS:\n"
  );
  for (const cls of missing.sort()) console.error(`  - ${cls}`);
  console.error(
    "\nLikely a color token name colliding with a reserved Tailwind word " +
      "(e.g. a color literally named 'bg', or 'base' which is a built-in " +
      "font-size utility). Rename the token in src/app/globals.css.\n"
  );
  process.exit(1);
}

console.log(`check-tailwind-classes: OK — ${usedClasses.size} custom-token classes all compiled.`);
