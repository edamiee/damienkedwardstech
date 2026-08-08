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
      <h1 className="font-display text-3xl">About</h1>
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
