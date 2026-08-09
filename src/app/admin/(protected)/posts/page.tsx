import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { draftPostWithAgent } from "./actions";

export default async function AdminPostsPage({ searchParams }: PageProps<"/admin/posts">) {
  const { agent_error: agentError, scope } = await searchParams;
  const activeScope = typeof scope === "string" ? scope : null;

  const supabase = await createClient();
  let query = supabase
    .from("posts")
    .select("id, title, slug, published, published_at, source, is_site_post")
    .order("updated_at", { ascending: false });
  if (activeScope === "site") query = query.eq("is_site_post", true);
  if (activeScope === "other") query = query.eq("is_site_post", false);
  const { data: posts } = await query;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Blog posts</h1>
        <Link
          href="/admin/posts/new"
          className="rounded-sm bg-teal px-4 py-2 text-sm font-semibold text-ground"
        >
          New post
        </Link>
      </div>

      <form
        action={draftPostWithAgent}
        className="mt-6 flex flex-col gap-2 rounded-sm border border-dashed border-line p-3"
      >
        <label className="flex flex-col gap-1.5 text-sm">
          Have the agent research and draft a post
          <div className="flex flex-wrap gap-2">
            <input
              name="topic"
              required
              placeholder="e.g. vector database indexing tradeoffs"
              className="flex-1 min-w-[220px] rounded-sm border border-line bg-surface px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-sm border border-teal px-3 py-2 text-sm font-semibold text-teal"
            >
              Draft it
            </button>
          </div>
        </label>
        <p className="text-xs text-muted">
          Researches the topic via web search and saves an unpublished draft
          for you to review — nothing goes live automatically.
        </p>
        {typeof agentError === "string" && (
          <p className="text-xs text-rust">{agentError}</p>
        )}
      </form>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {[
          { value: null, label: "All" },
          { value: "site", label: "Site" },
          { value: "other", label: "Other" },
        ].map((s) => (
          <Link
            key={s.label}
            href={s.value ? `/admin/posts?scope=${s.value}` : "/admin/posts"}
            className={`rounded-sm border px-2.5 py-1 text-[11.5px] ${
              activeScope === s.value
                ? "border-teal bg-teal text-ground"
                : "border-line bg-surface text-muted hover:text-teal"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      <ul className="mt-4 divide-y divide-line">
        {(posts ?? []).map((post) => (
          <li key={post.id} className="flex items-center justify-between py-4">
            <div>
              <Link href={`/admin/posts/${post.id}`} className="font-medium hover:text-teal">
                {post.title}
              </Link>
              <p className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                <span>
                  {post.published ? "Published" : "Draft"} · via {post.source}
                </span>
                {post.is_site_post && (
                  <span className="rounded-sm bg-surface px-1.5 py-0.5 font-data text-[10px] uppercase tracking-[0.06em] text-teal">
                    Site
                  </span>
                )}
              </p>
            </div>
            <Link href={`/admin/posts/${post.id}`} className="text-sm text-teal">
              Edit
            </Link>
          </li>
        ))}
        {(!posts || posts.length === 0) && (
          <li className="py-4 text-sm text-muted">No posts yet.</li>
        )}
      </ul>
    </div>
  );
}
