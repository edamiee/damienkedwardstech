import Link from "next/link";
import { runContentHealthCheck } from "@/lib/content-health";

export default async function AdminContentHealthPage() {
  const issues = await runContentHealthCheck();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl">Content health</h1>
      <p className="mt-1 text-sm text-muted">
        Scans published posts and case studies for broken project links,
        missing impact stats, and untagged posts — re-run by revisiting this
        page. Reports only; nothing here edits content automatically.
      </p>

      <ul className="mt-6 divide-y divide-line">
        {issues.map((issue) => (
          <li key={issue.href + issue.type} className="py-4">
            <Link href={issue.href} className="font-medium hover:text-teal">
              {issue.title}
            </Link>
            <p className="mt-0.5 text-xs text-rust">{issue.type}</p>
            <p className="mt-1 text-sm text-muted">{issue.detail}</p>
          </li>
        ))}
        {issues.length === 0 && (
          <li className="py-4 text-sm text-teal">No issues found — everything checks out.</li>
        )}
      </ul>
    </div>
  );
}
