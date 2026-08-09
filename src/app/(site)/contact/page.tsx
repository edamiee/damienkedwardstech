import { getSiteContent } from "@/lib/site-content";
import { ContactForm } from "@/components/contact-form";

export default async function ContactPage() {
  const content = await getSiteContent();

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="font-display text-3xl">Contact</h1>
      <p className="mt-4 max-w-[50ch] text-[15.5px] text-muted">
        {content.contact_intro}
      </p>
      <div className="mt-6 flex flex-wrap gap-4">
        <a
          href={`mailto:${content.contact_email}`}
          className="inline-flex items-center gap-2 rounded-sm bg-teal px-5 py-2.5 text-sm font-semibold text-ground"
        >
          {content.contact_email}
        </a>
        {content.contact_linkedin && (
          <a
            href={content.contact_linkedin}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-sm border border-line px-5 py-2.5 text-sm font-semibold"
          >
            LinkedIn ↗
          </a>
        )}
        {content.resume_url && (
          <a
            href={content.resume_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-sm border border-line px-5 py-2.5 text-sm font-semibold"
          >
            Resume ↗
          </a>
        )}
      </div>

      <p className="mt-10 text-xs font-semibold uppercase tracking-[0.1em] text-teal">
        Or send a message directly
      </p>
      <ContactForm />
    </div>
  );
}
