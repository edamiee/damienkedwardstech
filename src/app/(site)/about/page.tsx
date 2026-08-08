export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="font-display text-3xl">About</h1>
      <div className="mt-6 max-w-[60ch] space-y-4 text-[15.5px] text-muted">
        <p>
          I&apos;m Damien Edwards, an AI and data engineer. I build the
          pipelines that move and shape data, and the AI-powered features
          that sit on top of it — the parts a business actually depends on,
          not just a demo.
        </p>
        <p>
          Replace this paragraph with your real background: past roles,
          industries you&apos;ve worked in, the kind of problems you&apos;re
          best at, and what you&apos;re looking for next (contract,
          freelance, full-time — or all three).
        </p>
      </div>

      <h2 className="mt-10 text-xs font-semibold uppercase tracking-[0.12em] text-teal">
        Skills &amp; tools
      </h2>
      <ul className="mt-3 flex flex-wrap gap-2 text-[13px]">
        {[
          "Data pipelines",
          "Python",
          "TypeScript / Next.js",
          "Supabase / Postgres",
          "Claude / LLM integration",
          "ETL & orchestration",
        ].map((skill) => (
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
