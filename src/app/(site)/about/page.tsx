import Link from "next/link";
import { getSiteContent } from "@/lib/site-content";
import { parsePairs, parseCapabilities, parseInlineLinks } from "@/lib/content-pairs";

export default async function AboutPage() {
  const content = await getSiteContent();
  const paragraphs = content.about_body.split("\n").filter(Boolean);
  const skills = content.about_skills
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const elsewhereLinks = parsePairs(content.about_elsewhere_links);
  const capabilities = parseCapabilities(content.about_capabilities);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Damien Edwards",
    jobTitle: "AI & Data Engineer",
    description: paragraphs[0] ?? content.home_subheading,
    url: "https://damienkedwards.tech",
    email: content.contact_email || undefined,
    knowsAbout: skills.length > 0 ? skills : undefined,
    sameAs: content.contact_linkedin ? [content.contact_linkedin] : undefined,
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="font-display text-3xl">About</h1>
        {content.resume_url && (
          <a
            href={content.resume_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-sm border border-line px-4 py-2 text-sm font-semibold hover:border-teal"
          >
            Resume ↗
          </a>
        )}
      </div>
      <div className="mt-6 max-w-[60ch] space-y-4 text-[15.5px] text-muted">
        {paragraphs.map((paragraph, i) => (
          <p key={i}>
            {parseInlineLinks(paragraph).map((segment, j) =>
              segment.href ? (
                <a
                  key={j}
                  href={segment.href}
                  target={segment.href.startsWith("/") ? undefined : "_blank"}
                  rel={segment.href.startsWith("/") ? undefined : "noreferrer"}
                  className="text-teal hover:underline"
                >
                  {segment.text}
                </a>
              ) : (
                segment.text
              ),
            )}
          </p>
        ))}
      </div>

      {capabilities.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-teal">
            What I do
          </h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-3">
            {capabilities.map((item) => (
              <div key={item.title}>
                <h3 className="font-display text-lg">{item.title}</h3>
                <p className="mt-1.5 max-w-[32ch] text-sm text-muted">{item.body}</p>
                {item.slug && (
                  <Link
                    href={`/build-log/${item.slug}`}
                    className="mt-2 inline-block text-[13px] text-teal hover:underline"
                  >
                    {item.linkTitle} →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="mt-10 text-xs font-semibold uppercase tracking-[0.12em] text-teal">
        Skills &amp; tools
      </h2>
      <ul className="mt-3 flex flex-wrap gap-2 text-[13px]">
        {skills.map((skill) => (
          <li
            key={skill}
            className="rounded-sm border border-line bg-surface px-3 py-1.5"
          >
            {skill}
          </li>
        ))}
      </ul>

      {elsewhereLinks.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-teal">
            Also published elsewhere
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {elsewhereLinks.map((link) => (
              <li key={link.detail}>
                <a
                  href={link.detail}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[15px] text-fg hover:text-teal"
                >
                  {link.title} ↗
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
