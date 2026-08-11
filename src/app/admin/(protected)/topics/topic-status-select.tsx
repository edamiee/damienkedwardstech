"use client";

import { useTransition } from "react";
import { TOPIC_STATUSES, setTopicStatus, type TopicStatus } from "./actions";

export default function TopicStatusSelect({ id, status }: { id: string; status: TopicStatus }) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(e) => {
        const formData = new FormData();
        formData.set("id", id);
        formData.set("status", e.target.value);
        startTransition(() => {
          setTopicStatus(formData);
        });
      }}
      className="rounded-sm border border-line bg-surface px-1.5 py-0.5 font-data text-[10px] uppercase tracking-[0.06em] text-muted disabled:opacity-60"
    >
      {TOPIC_STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
