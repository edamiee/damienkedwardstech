import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import VoteButton from "@/components/vote-button";

export const revalidate = 60;

const VOTER_COOKIE = "write_next_voter";

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  writing: "In progress",
};

export default async function WriteNextPage() {
  const cookieStore = await cookies();
  const voterId = cookieStore.get(VOTER_COOKIE)?.value;

  const supabase = createAdminClient();
  const [{ data: topics }, { data: votes }, { data: myVotes }] = await Promise.all([
    supabase
      .from("topic_suggestions")
      .select("id, title, status, created_at")
      .in("status", ["open", "writing"])
      .order("created_at", { ascending: false }),
    supabase.from("topic_suggestion_votes").select("topic_id"),
    voterId
      ? supabase.from("topic_suggestion_votes").select("topic_id").eq("voter_id", voterId)
      : Promise.resolve({ data: [] as { topic_id: string }[] }),
  ]);

  const voteCounts = new Map<string, number>();
  for (const v of votes ?? []) {
    voteCounts.set(v.topic_id, (voteCounts.get(v.topic_id) ?? 0) + 1);
  }
  const alreadyVoted = new Set((myVotes ?? []).map((v) => v.topic_id));

  const sorted = [...(topics ?? [])].sort(
    (a, b) => (voteCounts.get(b.id) ?? 0) - (voteCounts.get(a.id) ?? 0)
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="font-display text-3xl">Vote on what I write next</h1>
      <p className="mt-2 max-w-[55ch] text-sm text-muted">
        Topics pulled from real questions this site&apos;s chat couldn&apos;t answer
        well. Upvote what you&apos;d actually want to read — one vote per
        browser.
      </p>

      <ul className="mt-8 divide-y divide-line rounded-sm border border-line bg-surface">
        {sorted.map((topic) => (
          <li key={topic.id} className="flex items-center justify-between gap-4 px-4 py-4">
            <div>
              <p className="text-sm">{topic.title}</p>
              {topic.status === "writing" && (
                <span className="mt-1 inline-block rounded-sm border border-teal px-1.5 py-0.5 text-[10px] uppercase tracking-[0.06em] text-teal">
                  {STATUS_LABELS[topic.status]}
                </span>
              )}
            </div>
            <VoteButton
              topicId={topic.id}
              initialVotes={voteCounts.get(topic.id) ?? 0}
              initiallyVoted={alreadyVoted.has(topic.id)}
            />
          </li>
        ))}
        {sorted.length === 0 && (
          <li className="px-4 py-4 text-sm text-muted">
            Nothing open for voting right now — check back soon.
          </li>
        )}
      </ul>
    </div>
  );
}
