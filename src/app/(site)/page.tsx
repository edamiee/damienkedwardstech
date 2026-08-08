import Link from "next/link";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-4xl px-6">
      <section className="relative overflow-hidden py-20">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-rust">
          Field notes from the data terrain
        </p>
        <h1 className="max-w-[16ch] text-balance font-display text-4xl font-normal leading-tight sm:text-5xl">
          Charting the ground between raw data and working AI systems.
        </h1>
        <p className="mt-5 max-w-[48ch] text-[15.5px] text-muted">
          I&apos;m Damien Edwards, a freelance AI &amp; data engineer — data
          pipelines, LLM integrations, and the applied AI features built on
          top of them. Available for contract and full-time engagements.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/writing"
            className="inline-flex items-center gap-2 rounded-sm bg-teal px-5 py-2.5 text-sm font-semibold text-bg"
          >
            Read my writing →
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-sm border border-line px-5 py-2.5 text-sm font-semibold"
          >
            Get in touch
          </Link>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-6 rounded-sm border border-line bg-surface px-6 py-4 text-[12.5px]">
        <span className="inline-flex items-center gap-2 text-muted">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-teal" />
          Published work — open to everyone
        </span>
        <span className="inline-flex items-center gap-2 text-muted">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-rust" />
          Uncharted — <Link href="/projects" className="text-rust underline">sign in</Link> to see project work, including the Arcade game
        </span>
      </section>

      <section className="py-14">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-teal">
          What I do
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            {
              title: "Data pipelines",
              body: "Ingestion, transformation, and orchestration that hold up under real production load.",
            },
            {
              title: "LLM integration",
              body: "Wiring Claude and other models into products as features, not demos.",
            },
            {
              title: "Applied AI features",
              body: "The interface layer on top — the part your users and customers actually touch.",
            },
          ].map((item) => (
            <div key={item.title}>
              <h3 className="font-display text-lg">{item.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
