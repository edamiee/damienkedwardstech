import { getSiteContent } from "@/lib/site-content";
import { saveSiteContent, regenerateWeeklyInsight } from "./actions";

export default async function AdminSiteContentPage() {
  const content = await getSiteContent();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl">Site content</h1>
      <p className="mt-1 text-sm text-muted">
        Edits go live immediately — no redeploy needed.
      </p>

      <form action={saveSiteContent} className="mt-8 flex flex-col gap-8">
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-teal">
            Site identity
          </legend>
          <label className="flex flex-col gap-1.5 text-sm">
            Name (header, footer, and browser tab title)
            <input
              name="site_name"
              defaultValue={content.site_name}
              className="rounded-sm border border-line bg-surface px-3 py-2"
            />
          </label>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-teal">
            Chat widget
          </legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="chat_enabled"
              defaultChecked={content.chat_enabled !== "false"}
              className="h-4 w-4 accent-teal"
            />
            Show the chat button on public pages
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            Header (shown at the top of the chat panel)
            <input
              name="chat_header"
              defaultValue={content.chat_header}
              className="rounded-sm border border-line bg-surface px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            Subheader
            <input
              name="chat_subheader"
              defaultValue={content.chat_subheader}
              className="rounded-sm border border-line bg-surface px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            Example question (shown before the visitor asks anything)
            <input
              name="chat_example_question"
              defaultValue={content.chat_example_question}
              className="rounded-sm border border-line bg-surface px-3 py-2"
            />
          </label>
          <p className="text-xs text-muted">
            Answers are grounded in the{" "}
            <a href="/admin/chat-index" className="text-teal hover:underline">
              chat index
            </a>{" "}
            — keep it rebuilt after publishing new content.
          </p>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-teal">
            Newsletter
          </legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="newsletter_capture_enabled"
              defaultChecked={content.newsletter_capture_enabled === "true"}
              className="h-4 w-4 accent-teal"
            />
            Show the signup form on the homepage
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="newsletter_sending_enabled"
              defaultChecked={content.newsletter_sending_enabled === "true"}
              className="h-4 w-4 accent-teal"
            />
            Actually email subscribers the weekly note (needs a verified sender below)
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            From address (must be a Resend-verified sender, e.g. Damien &lt;hello@damienkedwards.tech&gt;)
            <input
              name="newsletter_from_email"
              placeholder="Name <hello@yourdomain.com>"
              defaultValue={content.newsletter_from_email}
              className="rounded-sm border border-line bg-surface px-3 py-2 font-data text-sm"
            />
          </label>
          <p className="text-xs text-muted">
            Both start off. Turning on signup just shows the form and stores
            emails — turning on sending also requires{" "}
            <code className="font-data">RESEND_API_KEY</code> to be set and a
            from address verified in Resend, or sending silently no-ops.
            Subscribers are listed at{" "}
            <a href="/admin/subscribers" className="text-teal hover:underline">
              /admin/subscribers
            </a>
            .
          </p>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-teal">
            Gated projects page
          </legend>
          <label className="flex flex-col gap-1.5 text-sm">
            GitHub URL (leave blank to hide the link)
            <input
              name="projects_github_url"
              type="url"
              placeholder="https://github.com/…"
              defaultValue={content.projects_github_url}
              className="rounded-sm border border-line bg-surface px-3 py-2"
            />
          </label>
        </fieldset>

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
          <label className="flex flex-col gap-1.5 text-sm">
            Now (one short line — what you&apos;re building or exploring
            currently; leave blank to hide it)
            <input
              name="now_line"
              placeholder="Building an agent that..."
              defaultValue={content.now_line}
              className="rounded-sm border border-line bg-surface px-3 py-2"
            />
          </label>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-teal">
            Weekly AI note
          </legend>
          <p className="text-xs text-muted">
            Regenerated automatically every Monday via Claude. Edit it
            directly here, or regenerate it on demand — regenerating
            ignores whatever&apos;s typed below and doesn&apos;t need Save.
          </p>
          <label className="flex flex-col gap-1.5 text-sm">
            Current note
            <textarea
              name="weekly_ai_insight"
              rows={2}
              defaultValue={content.weekly_ai_insight}
              className="rounded-sm border border-line bg-surface px-3 py-2"
            />
          </label>
          <button
            formAction={regenerateWeeklyInsight}
            className="self-start rounded-sm border border-teal px-4 py-2 text-sm font-semibold text-teal"
          >
            Regenerate now
          </button>
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
          <label className="flex flex-col gap-1.5 text-sm">
            Resume link (PDF or Google Doc URL — leave blank to hide the button)
            <input
              name="resume_url"
              type="url"
              placeholder="https://…"
              defaultValue={content.resume_url}
              className="rounded-sm border border-line bg-surface px-3 py-2"
            />
          </label>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-teal">
            Contact page
          </legend>
          <label className="flex flex-col gap-1.5 text-sm">
            Intro text
            <textarea
              name="contact_intro"
              rows={2}
              defaultValue={content.contact_intro}
              className="rounded-sm border border-line bg-surface px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            Contact email
            <input
              name="contact_email"
              type="email"
              defaultValue={content.contact_email}
              className="rounded-sm border border-line bg-surface px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            LinkedIn URL (leave blank to hide the button)
            <input
              name="contact_linkedin"
              type="url"
              placeholder="https://www.linkedin.com/in/…"
              defaultValue={content.contact_linkedin}
              className="rounded-sm border border-line bg-surface px-3 py-2"
            />
          </label>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-teal">
            Footer
          </legend>
          <label className="flex flex-col gap-1.5 text-sm">
            Tagline (next to the copyright line)
            <input
              name="footer_tagline"
              defaultValue={content.footer_tagline}
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
