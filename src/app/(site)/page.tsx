import Link from "next/link";
import { getLatestAiNews } from "@/lib/ai-feed";
import { getSiteContent } from "@/lib/site-content";
import { getHomeServices } from "@/lib/home-services";
import { TerrainHero } from "@/components/terrain-hero";

export default async function HomePage() {
  const [aiNews, content, services] = await Promise.all([
    getLatestAiNews(5),
    getSiteContent(),
    getHomeServices(),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-6">
      <section className="relative overflow-hidden py-20 lg:pr-[46%]">
        <TerrainHero />
        <div className="relative z-10">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-rust">
            {content.home_eyebrow}
          </p>
          <h1 className="max-w-[16ch] text-balance font-display text-4xl font-normal leading-tight sm:text-5xl">
            {content.home_heading}
          </h1>
          <p className="mt-5 max-w-[48ch] text-[15.5px] text-muted">
            {content.home_subheading}
          </p>
          {content.now_line && (
            <p className="mt-3 max-w-[48ch] text-sm text-teal">
              <span className="font-semibold">Now:</span> {content.now_line}
            </p>
          )}
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

      <section className="border-l-2 border-teal py-8 pl-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal">
          Note of the week
        </p>
        <p className="mt-2 max-w-[55ch] font-display text-lg italic leading-snug text-fg">
          {content.weekly_ai_insight}
        </p>
      </section>

      <section className="py-14">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-teal">
          What I do
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {services.map((item) => (
            <div key={item.id}>
              <h3 className="font-display text-lg">{item.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {aiNews.length > 0 && (
        <section className="border-t border-line py-14">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-teal">
            Latest in AI
          </h2>
          <ul className="divide-y divide-line">
            {aiNews.map((item) => (
              <li key={item.link} className="py-3.5">
                <a
                  href={item.link}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-baseline justify-between gap-4"
                >
                  <span className="text-sm group-hover:text-teal">{item.title}</span>
                  <span className="whitespace-nowrap font-data text-[11px] text-muted">
                    {item.source}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
