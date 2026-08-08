import { getSiteContent } from "@/lib/site-content";

export default async function ContactPage() {
  const content = await getSiteContent();

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="font-display text-3xl">Contact</h1>
      <p className="mt-4 max-w-[50ch] text-[15.5px] text-muted">
        {content.contact_intro}
      </p>
      <a
        href={`mailto:${content.contact_email}`}
        className="mt-6 inline-flex items-center gap-2 rounded-sm bg-teal px-5 py-2.5 text-sm font-semibold text-bg"
      >
        {content.contact_email}
      </a>
    </div>
  );
}
