import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  getApprovedFindings,
  VENDORS,
  VENDOR_LABELS,
  PATTERN_CATEGORY_LABELS,
  type Vendor,
} from "@/lib/research-findings";

export const revalidate = 60;

function isVendor(value: string): value is Vendor {
  return (VENDORS as readonly string[]).includes(value);
}

export default async function ResearchIndexPage({ searchParams }: PageProps<"/research">) {
  const { vendor: vendorParam } = await searchParams;
  const vendor =
    typeof vendorParam === "string" && isVendor(vendorParam) ? vendorParam : undefined;

  const supabase = await createClient();
  const findings = await getApprovedFindings(supabase, { vendor, limit: 100 });

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="font-display text-3xl">Research</h1>
      <p className="mt-2 max-w-[60ch] text-sm text-muted">
        Dated, structured findings about genuine architectural patterns across
        the data stack — incremental modeling, semantic layers, orchestration,
        cost optimization — filtered from vendor changelogs, engineering
        blogs, and release notes by an automated pipeline, reviewed by hand
        before anything lands here. Not vendor marketing.{" "}
        <Link href="/how-it-works" className="text-teal underline">
          How this works →
        </Link>
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        <Link
          href="/research"
          className={`rounded-sm border px-2.5 py-1 font-data text-[11.5px] ${
            !vendor
              ? "border-teal bg-teal text-ground"
              : "border-line bg-surface text-muted hover:text-fg"
          }`}
        >
          All
        </Link>
        {VENDORS.map((v) => (
          <Link
            key={v}
            href={`/research?vendor=${v}`}
            className={`rounded-sm border px-2.5 py-1 font-data text-[11.5px] ${
              vendor === v
                ? "border-teal bg-teal text-ground"
                : "border-line bg-surface text-muted hover:text-fg"
            }`}
          >
            {VENDOR_LABELS[v]}
          </Link>
        ))}
      </div>

      <ul className="mt-8 divide-y divide-line">
        {findings.map((f) => (
          <li key={f.id} className="py-6">
            <Link href={`/research/${f.slug}`} className="group block">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-data text-[10.5px] uppercase tracking-[0.08em] text-rust">
                  {VENDOR_LABELS[f.vendor]}
                </span>
                <span className="text-muted">·</span>
                <span className="font-data text-[10.5px] uppercase tracking-[0.08em] text-muted">
                  {PATTERN_CATEGORY_LABELS[f.pattern_category]}
                </span>
                <span className="text-muted">·</span>
                <span className="font-data text-[10.5px] text-muted">
                  {new Date(f.found_at).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <span className="mt-1.5 block font-display text-xl group-hover:text-teal">
                {f.title}
              </span>
              <span className="mt-1.5 block max-w-[65ch] text-sm text-muted">
                {f.why_it_matters}
              </span>
            </Link>
          </li>
        ))}
        {findings.length === 0 && (
          <li className="py-6 text-sm text-muted">
            {vendor
              ? `Nothing reviewed for ${VENDOR_LABELS[vendor]} yet — check back soon.`
              : "Nothing published yet — the research pipeline is still spinning up."}
          </li>
        )}
      </ul>
    </div>
  );
}
