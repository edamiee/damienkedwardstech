export type ContentPair = { title: string; detail: string };

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
