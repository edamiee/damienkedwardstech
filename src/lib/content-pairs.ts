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
