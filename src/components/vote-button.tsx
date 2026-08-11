"use client";

import { useState, useTransition } from "react";

export default function VoteButton({
  topicId,
  initialVotes,
  initiallyVoted,
}: {
  topicId: string;
  initialVotes: number;
  initiallyVoted: boolean;
}) {
  const [votes, setVotes] = useState(initialVotes);
  const [voted, setVoted] = useState(initiallyVoted);
  const [isPending, startTransition] = useTransition();

  function vote() {
    if (voted || isPending) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/topics/vote", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ topic_id: topicId }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { votes: number };
        setVotes(data.votes);
        setVoted(true);
      } catch {
        // Silent — voting is a nice-to-have, not worth surfacing an error.
      }
    });
  }

  return (
    <button
      onClick={vote}
      disabled={voted || isPending}
      className={`flex shrink-0 flex-col items-center gap-0.5 rounded-sm border px-3 py-1.5 text-xs transition-colors ${
        voted
          ? "border-teal bg-teal text-ground"
          : "border-line bg-surface text-muted hover:border-teal hover:text-teal"
      } disabled:cursor-default`}
    >
      <span className="font-display text-base leading-none">{votes}</span>
      <span className="text-[10px] uppercase tracking-[0.06em]">{voted ? "Voted" : "Vote"}</span>
    </button>
  );
}
