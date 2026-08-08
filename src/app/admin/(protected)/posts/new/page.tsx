import { PostForm } from "../post-form";

export default function NewPostPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl">New post</h1>
      <div className="mt-6">
        <PostForm />
      </div>
    </div>
  );
}
