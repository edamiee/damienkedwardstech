import { createClient } from "@/lib/supabase/server";
import { getSiteContent } from "@/lib/site-content";
import { NewsletterForm } from "@/components/newsletter-form";

export const revalidate = 60;

export default async function NewsletterArchivePage() {
  const supabase = await createClient();
  const [{ data: issues }, content] = await Promise.all([
    supabase
      .from("weekly_insights")
      .select("id, content, created_at")
      .order("created_at", { ascending: false })
      .limit(52),
    getSiteContent(),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="font-display text-3xl">Newsletter</h1>
      <p className="mt-2 max-w-[55ch] text-sm text-muted">
        A short weekly note on AI and data engineering, archived here as it
        goes out.
      </p>

      {content.newsletter_capture_enabled === "true" && <NewsletterForm />}

      <ul className="mt-10 flex flex-col gap-8">
        {(issues ?? []).map((issue) => (
          <li key={issue.id} className="border-l-2 border-teal pl-5">
            <p className="font-data text-[11.5px] text-muted">
              {new Date(issue.created_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            <p className="mt-2 max-w-[60ch] font-display text-lg italic leading-snug text-fg">
              {issue.content}
            </p>
          </li>
        ))}
        {(!issues || issues.length === 0) && (
          <li className="text-sm text-muted">
            Nothing archived yet — check back after the next note goes out.
          </li>
        )}
      </ul>
    </div>
  );
}
