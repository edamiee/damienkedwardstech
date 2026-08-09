import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { draftPostWithAgent } from "./actions";

export default async function AdminPostsPage({ searchParams }: PageProps<"/admin/posts">) {
  const { agent_error: agentError } = await searchParams;
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, slug, published, published_at, source")
    .order("updated_at", { ascending: false });

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

      <ul className="mt-6 divide-y divide-line">
        {(posts ?? []).map((post) => (
          <li key={post.id} className="flex items-center justify-between py-4">
            <div>
              <Link href={`/admin/posts/${post.id}`} className="font-medium hover:text-teal">
                {post.title}
              </Link>
              <p className="mt-0.5 text-xs text-muted">
                {post.published ? "Published" : "Draft"} · via {post.source}
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
