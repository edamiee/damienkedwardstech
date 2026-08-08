import { getSiteContent } from "@/lib/site-content";
import { saveSiteContent } from "./actions";

export default async function AdminSiteContentPage() {
  const content = await getSiteContent();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl">Homepage &amp; About content</h1>
      <p className="mt-1 text-sm text-muted">
        Edits go live on the public homepage and About page immediately.
      </p>

      <form action={saveSiteContent} className="mt-8 flex flex-col gap-8">
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-teal">
            Homepage hero
          </legend>
          <label className="flex flex-col gap-1.5 text-sm">
            Eyebrow (small label above the headline)
            <input
              name="home_eyebrow"
              defaultValue={content.home_eyebrow}
              className="rounded-sm border border-line bg-surface px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            Headline
            <textarea
              name="home_heading"
              rows={2}
              defaultValue={content.home_heading}
              className="rounded-sm border border-line bg-surface px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            Subheading
            <textarea
              name="home_subheading"
              rows={3}
              defaultValue={content.home_subheading}
              className="rounded-sm border border-line bg-surface px-3 py-2"
            />
          </label>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-teal">
            About page
          </legend>
          <label className="flex flex-col gap-1.5 text-sm">
            Body (one paragraph per line)
            <textarea
              name="about_body"
              rows={8}
              defaultValue={content.about_body}
              className="rounded-sm border border-line bg-surface px-3 py-2 font-data text-sm"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            Skills &amp; tools (comma-separated)
            <input
              name="about_skills"
              defaultValue={content.about_skills}
              className="rounded-sm border border-line bg-surface px-3 py-2"
            />
          </label>
        </fieldset>

        <button
          type="submit"
          className="self-start rounded-sm bg-teal px-5 py-2.5 text-sm font-semibold text-bg"
        >
          Save
        </button>
      </form>
    </div>
  );
}
