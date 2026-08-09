import { createClient } from "@/lib/supabase/server";
import { saveTestimonial, deleteTestimonial } from "./actions";

export default async function AdminTestimonialsPage() {
  const supabase = await createClient();
  const { data: testimonials } = await supabase
    .from("testimonials")
    .select("id, author_name, author_title, quote, sort_order, visible")
    .order("sort_order", { ascending: true });

  const nextOrder = (testimonials?.length ?? 0) * 10;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl">Testimonials</h1>
      <p className="mt-1 text-sm text-muted">
        Shown on the homepage when enabled — toggle it on at{" "}
        <a href="/admin/content" className="text-teal hover:underline">
          Site content
        </a>
        .
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {(testimonials ?? []).map((t) => (
          <form
            key={t.id}
            action={saveTestimonial}
            className="flex flex-col gap-2 rounded-sm border border-line bg-surface p-3"
          >
            <input type="hidden" name="id" value={t.id} />
            <div className="flex flex-wrap items-center gap-3">
              <input
                name="author_name"
                defaultValue={t.author_name}
                placeholder="Name"
                className="w-40 rounded-sm border border-line bg-ground px-2 py-1.5 text-sm"
              />
              <input
                name="author_title"
                defaultValue={t.author_title ?? ""}
                placeholder="Title / company"
                className="w-52 rounded-sm border border-line bg-ground px-2 py-1.5 text-sm"
              />
              <input
                name="sort_order"
                type="number"
                defaultValue={t.sort_order}
                className="w-20 rounded-sm border border-line bg-ground px-2 py-1.5 text-sm"
              />
              <label className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" name="visible" defaultChecked={t.visible} />
                Visible
              </label>
            </div>
            <textarea
              name="quote"
              rows={2}
              defaultValue={t.quote}
              className="rounded-sm border border-line bg-ground px-2 py-1.5 text-sm"
            />
            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="rounded-sm bg-teal px-3 py-1.5 text-sm font-semibold text-ground"
              >
                Save
              </button>
              <button formAction={deleteTestimonial} className="text-sm text-rust">
                Delete
              </button>
            </div>
          </form>
        ))}
      </div>

      <form
        action={saveTestimonial}
        className="mt-6 flex flex-col gap-2 rounded-sm border border-dashed border-line p-3"
      >
        <div className="flex flex-wrap items-center gap-3">
          <input
            name="author_name"
            placeholder="Name"
            required
            className="w-40 rounded-sm border border-line bg-surface px-2 py-1.5 text-sm"
          />
          <input
            name="author_title"
            placeholder="Title / company"
            className="w-52 rounded-sm border border-line bg-surface px-2 py-1.5 text-sm"
          />
          <input
            name="sort_order"
            type="number"
            defaultValue={nextOrder}
            className="w-20 rounded-sm border border-line bg-surface px-2 py-1.5 text-sm"
          />
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" name="visible" defaultChecked />
            Visible
          </label>
        </div>
        <textarea
          name="quote"
          rows={2}
          placeholder="What they said"
          required
          className="rounded-sm border border-line bg-surface px-2 py-1.5 text-sm"
        />
        <button
          type="submit"
          className="self-start rounded-sm border border-teal px-3 py-1.5 text-sm font-semibold text-teal"
        >
          Add testimonial
        </button>
      </form>
    </div>
  );
}
