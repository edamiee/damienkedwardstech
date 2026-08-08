import { getSiteContent } from "@/lib/site-content";

export default async function AboutPage() {
  const content = await getSiteContent();
  const paragraphs = content.about_body.split("\n").filter(Boolean);
  const skills = content.about_skills
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
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
          <p key={i}>{paragraph}</p>
        ))}
      </div>

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
    </div>
  );
}
