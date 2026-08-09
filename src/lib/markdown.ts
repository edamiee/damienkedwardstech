import { marked } from "marked";

export type Heading = { id: string; text: string; level: number };

function slugifyHeading(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Regex-scans raw markdown for h2/h3 lines rather than hooking marked's
// renderer — sidesteps that API's `this`-bound token internals and stays
// simple to keep in lockstep with renderMarkdownWithHeadingIds below,
// which injects matching ids into the same headings in the same order.
export function extractHeadings(markdown: string): Heading[] {
  const headings: Heading[] = [];
  const seen = new Map<string, number>();
  let inFence = false;

  for (const line of markdown.split("\n")) {
    if (/^```/.test(line.trim())) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (!match) continue;

    const level = match[1].length;
    const text = match[2].replace(/[*_`]/g, "").trim();
    if (!text) continue;

    const base = slugifyHeading(text);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    const id = count > 0 ? `${base}-${count}` : base;

    headings.push({ id, text, level });
  }

  return headings;
}

// Renders markdown to HTML and stamps each <h2>/<h3> with the same id
// extractHeadings() computed, so the table of contents' #fragment links
// land on the right heading.
export async function renderMarkdownWithHeadingIds(markdown: string): Promise<string> {
  const headings = extractHeadings(markdown);
  const html = await marked.parse(markdown);
  let i = 0;
  return html.replace(/<h([23])>/g, (full, level) => {
    const heading = headings[i];
    if (!heading || String(heading.level) !== level) return full;
    i++;
    return `<h${level} id="${heading.id}">`;
  });
}
