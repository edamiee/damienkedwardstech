"use client";

import { useRef, useState } from "react";
import { savePost, deletePost } from "./actions";

type Post = {
  id: string;
  title: string;
  excerpt: string | null;
  body_markdown: string;
  cover_image_url: string | null;
  tags: string[] | null;
  published: boolean;
};

async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/admin/upload-image", { method: "POST", body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Upload failed");
  return data.url as string;
}

export function PostForm({ post }: { post?: Post }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [coverImageUrl, setCoverImageUrl] = useState(post?.cover_image_url ?? "");
  const [coverUploading, setCoverUploading] = useState(false);
  const [inlineUploading, setInlineUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setCoverUploading(true);
    try {
      setCoverImageUrl(await uploadImage(file));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setCoverUploading(false);
      e.target.value = "";
    }
  }

  async function handleInlineInsert(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setInlineUploading(true);
    try {
      const url = await uploadImage(file);
      const alt = file.name.replace(/\.[^.]+$/, "");
      const markdown = `![${alt}](${url})`;
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart ?? textarea.value.length;
        const end = textarea.selectionEnd ?? textarea.value.length;
        textarea.value = textarea.value.slice(0, start) + markdown + textarea.value.slice(end);
        const cursor = start + markdown.length;
        textarea.focus();
        textarea.setSelectionRange(cursor, cursor);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setInlineUploading(false);
      e.target.value = "";
    }
  }

  return (
    <form action={savePost} className="flex flex-col gap-4">
      {post && <input type="hidden" name="id" value={post.id} />}
      <input type="hidden" name="cover_image_url" value={coverImageUrl} />
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
        Tags (comma-separated)
        <input
          name="tags"
          defaultValue={post?.tags?.join(", ") ?? ""}
          placeholder="data engineering, LLMs"
          className="rounded-sm border border-line bg-surface px-3 py-2"
        />
      </label>

      <div className="flex flex-col gap-1.5 text-sm">
        Cover image (shown at the top of the post and on the Writing index)
        <div className="flex items-center gap-3">
          {coverImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary uploaded image, not worth remotePatterns config
            <img
              src={coverImageUrl}
              alt=""
              className="h-16 w-16 rounded-sm border border-line object-cover"
            />
          )}
          <label className="cursor-pointer rounded-sm border border-line px-3 py-2 text-sm hover:bg-surface">
            {coverUploading ? "Uploading…" : coverImageUrl ? "Replace image" : "Upload image"}
            <input
              type="file"
              accept="image/*"
              onChange={handleCoverChange}
              disabled={coverUploading}
              className="hidden"
            />
          </label>
          {coverImageUrl && (
            <button
              type="button"
              onClick={() => setCoverImageUrl("")}
              className="text-xs text-rust hover:underline"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 text-sm">
        <div className="flex items-center justify-between">
          <span>Body (Markdown)</span>
          <label className="cursor-pointer text-xs text-teal hover:underline">
            {inlineUploading ? "Uploading…" : "+ Insert image"}
            <input
              type="file"
              accept="image/*"
              onChange={handleInlineInsert}
              disabled={inlineUploading}
              className="hidden"
            />
          </label>
        </div>
        <textarea
          ref={textareaRef}
          name="body_markdown"
          required
          rows={16}
          defaultValue={post?.body_markdown}
          className="rounded-sm border border-line bg-surface px-3 py-2 font-data text-sm"
        />
      </div>

      {uploadError && <p className="text-xs text-rust">{uploadError}</p>}

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
