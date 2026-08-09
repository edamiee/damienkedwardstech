import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type RepoCommit = { repo: string; message: string; date: string };

function parseOwnerRepo(url: string): { owner: string; repo: string } | null {
  const match = /github\.com\/([^/]+)\/([^/?#]+)/.exec(url);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

// Best-effort: an unreachable/private/rate-limited repo just contributes
// no commits rather than failing the whole digest. GITHUB_TOKEN is
// optional — only needed for private repos or to avoid the 60/hr
// unauthenticated rate limit.
export async function fetchRecentCommits(repoUrl: string, sinceIso: string): Promise<RepoCommit[]> {
  const parsed = parseOwnerRepo(repoUrl);
  if (!parsed) return [];

  const headers: Record<string, string> = { accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const res = await fetch(
    `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/commits?since=${encodeURIComponent(sinceIso)}&per_page=30`,
    { headers }
  );
  if (!res.ok) return [];

  const commits = (await res.json()) as {
    commit: { message: string; author: { date: string } };
  }[];

  return commits.map((c) => ({
    repo: `${parsed.owner}/${parsed.repo}`,
    message: c.commit.message.split("\n")[0],
    date: c.commit.author.date,
  }));
}

// Raw, non-summarized commit list across every visible linked repo for the
// last `days` — powers the Build log page's "What shipped this week"
// section. Separate from the dev-log agent's draftDevLogWithAgent(), which
// covers the same window but hands the commits to Claude to write a post;
// this is a plain display of the same underlying activity, no LLM call.
export async function getRecentShippedCommits(days = 7): Promise<RepoCommit[]> {
  const supabase = createAdminClient();
  const { data: links } = await supabase.from("github_links").select("url").eq("visible", true);

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const commitLists = await Promise.all(
    (links ?? []).map((l) => fetchRecentCommits(l.url, since))
  );

  return commitLists.flat().sort((a, b) => b.date.localeCompare(a.date));
}
