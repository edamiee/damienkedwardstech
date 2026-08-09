import "server-only";

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
