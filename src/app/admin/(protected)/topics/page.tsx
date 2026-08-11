import { createAdminClient } from "@/lib/supabase/admin";
import { formatRelativeTime } from "@/lib/format-relative-time";
import TopicStatusSelect from "./topic-status-select";
import type { TopicStatus } from "./status";

type Topic = {
  id: string;
  title: string;
  source_gap_question: string | null;
  status: TopicStatus;
  created_at: string;
};

export default async function AdminTopicsPage() {
  const supabase = createAdminClient();
  const [{ data: topics }, { data: votes }] = await Promise.all([
    supabase
      .from("topic_suggestions")
      .select("id, title, source_gap_question, status, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("topic_suggestion_votes").select("topic_id"),
  ]);

  const voteCounts = new Map<string, number>();
  for (const v of votes ?? []) {
    voteCounts.set(v.topic_id, (voteCounts.get(v.topic_id) ?? 0) + 1);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl">Reader topics</h1>
      <p className="mt-1 text-sm text-muted">
        Topics published from the chat-index gap list to the public{" "}
        <a href="/write-next" target="_blank" rel="noreferrer" className="text-teal hover:underline">
          /write-next ↗
        </a>{" "}
        page. Visitors upvote; set status here as you work through them.
      </p>

      <ul className="mt-6 divide-y divide-line rounded-sm border border-line bg-surface">
        {(topics as Topic[] | null ?? []).map((topic) => (
          <li key={topic.id} className="flex items-start justify-between gap-4 px-4 py-3">
            <div>
              <p className="text-sm">{topic.title}</p>
              {topic.source_gap_question && topic.source_gap_question !== topic.title && (
                <p className="mt-0.5 text-[11.5px] text-muted">From: {topic.source_gap_question}</p>
              )}
              <p className="mt-1 font-data text-[10.5px] text-muted">
                {voteCounts.get(topic.id) ?? 0} vote{(voteCounts.get(topic.id) ?? 0) === 1 ? "" : "s"} ·{" "}
                {formatRelativeTime(topic.created_at)}
              </p>
            </div>
            <TopicStatusSelect id={topic.id} status={topic.status} />
          </li>
        ))}
        {(!topics || topics.length === 0) && (
          <li className="px-4 py-3 text-sm text-muted">
            Nothing published yet — promote a gap from /admin/chat-index.
          </li>
        )}
      </ul>
    </div>
  );
}
