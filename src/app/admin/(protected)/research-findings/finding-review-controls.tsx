"use client";

import { useTransition } from "react";
import { approveFindingAction, discardFindingAction } from "./actions";
import { DISCARD_REASONS, DISCARD_REASON_LABELS } from "./status";

export default function FindingReviewControls({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          const formData = new FormData();
          formData.set("id", id);
          startTransition(() => {
            approveFindingAction(formData);
          });
        }}
        className="rounded-sm bg-teal px-3 py-1.5 font-data text-[11px] font-semibold uppercase tracking-[0.06em] text-ground disabled:opacity-60"
      >
        Approve
      </button>
      <select
        defaultValue=""
        disabled={isPending}
        onChange={(e) => {
          const reason = e.target.value;
          if (!reason) return;
          const formData = new FormData();
          formData.set("id", id);
          formData.set("reason", reason);
          startTransition(() => {
            discardFindingAction(formData);
          });
          e.target.value = "";
        }}
        className="rounded-sm border border-line bg-surface px-1.5 py-1.5 font-data text-[11px] uppercase tracking-[0.06em] text-muted disabled:opacity-60"
      >
        <option value="">Discard…</option>
        {DISCARD_REASONS.map((r) => (
          <option key={r} value={r}>
            {DISCARD_REASON_LABELS[r]}
          </option>
        ))}
      </select>
    </div>
  );
}
