export type ContentPair = { title: string; detail: string };

export type CapabilityEntry = {
  title: string;
  body: string;
  linkTitle: string;
  slug: string;
};

// Shared by any admin-editable "Title | detail" list stored as one pair per
// line in a site_content value (see how_it_works_sources/_surfaces and
// about_elsewhere_links) — a real structured list without needing a
// bespoke editor or a new table.
export function parsePairs(raw: string): ContentPair[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, ...rest] = line.split("|");
      return { title: title.trim(), detail: rest.join("|").trim() };
    });
}

// Same one-line-per-entry convention as parsePairs, extended with the two
// extra fields (see about_capabilities): "Title | body | link title | slug".
export function parseCapabilities(raw: string): CapabilityEntry[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, body, linkTitle, slug] = line.split("|").map((s) => s.trim());
      return { title: title ?? "", body: body ?? "", linkTitle: linkTitle ?? "", slug: slug ?? "" };
    });
}

export type InlineSegment = { text: string; href?: string };

const INLINE_LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;

// Minimal [text](url) support for prose fields (see about_body) that don't
// warrant pulling in the full markdown renderer used for posts.
export function parseInlineLinks(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  INLINE_LINK_PATTERN.lastIndex = 0;
  while ((match = INLINE_LINK_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index) });
    }
    segments.push({ text: match[1], href: match[2] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) });
  }
  return segments;
}
