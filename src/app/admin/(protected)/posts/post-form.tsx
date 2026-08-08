import { savePost, deletePost } from "./actions";

type Post = {
  id: string;
  title: string;
  excerpt: string | null;
  body_markdown: string;
  published: boolean;
};

export function PostForm({ post }: { post?: Post }) {
  return (
    <form action={savePost} className="flex flex-col gap-4">
      {post && <input type="hidden" name="id" value={post.id} />}
      <label className="flex flex-col gap-1.5 text-sm">
        Title
        <input
          name="title"
          required
          defaultValue={post?.title}
          className="rounded-sm border border-line bg-surface px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        Excerpt (shown on the Writing index)
        <input
          name="excerpt"
          defaultValue={post?.excerpt ?? ""}
          className="rounded-sm border border-line bg-surface px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        Body (Markdown)
        <textarea
          name="body_markdown"
          required
          rows={16}
          defaultValue={post?.body_markdown}
          className="rounded-sm border border-line bg-surface px-3 py-2 font-data text-sm"
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="published" defaultChecked={post?.published} />
        Published
      </label>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-sm bg-teal px-4 py-2 text-sm font-semibold text-bg"
        >
          Save
        </button>
        {post && (
          <button
            formAction={deletePost}
            className="rounded-sm border border-rust px-4 py-2 text-sm text-rust"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
