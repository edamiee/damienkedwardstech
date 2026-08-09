import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PostForm } from "../post-form";

export default async function EditPostPage({
  params,
}: PageProps<"/admin/posts/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: post } = await supabase
    .from("posts")
    .select(
      "id, slug, title, excerpt, body_markdown, cover_image_url, tags, series, series_order, published, publish_at, preview_token"
    )
    .eq("id", id)
    .maybeSingle();

  if (!post) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl">Edit post</h1>
      <div className="mt-6">
        <PostForm post={post} />
      </div>
    </div>
  );
}
