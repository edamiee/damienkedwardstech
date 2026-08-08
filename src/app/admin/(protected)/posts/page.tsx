import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPostsPage() {
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
          className="rounded-sm bg-teal px-4 py-2 text-sm font-semibold text-bg"
        >
          New post
        </Link>
      </div>

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
