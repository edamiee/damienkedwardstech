import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { estimateCost } from "@/lib/ai-pricing";

// Fire-and-forget logging for every Anthropic/Voyage call, mirroring
// recordCronRun's swallow-errors shape (src/lib/cron-runs.ts) — a logging
// failure should never break the request that triggered it.
export async function logAiUsage(params: {
  provider: "anthropic" | "voyage";
  model: string;
  operation: string;
  status: "ok" | "error";
  latencyMs: number;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  errorMessage?: string | null;
}): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("ai_usage_log").insert({
      provider: params.provider,
      model: params.model,
      operation: params.operation,
      status: params.status,
      latency_ms: params.latencyMs,
      input_tokens: params.inputTokens ?? null,
      output_tokens: params.outputTokens ?? null,
      total_tokens: params.totalTokens ?? null,
      estimated_cost_usd: estimateCost(params.provider, params.model, {
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        totalTokens: params.totalTokens,
      }),
      error_message: params.errorMessage ?? null,
    });
  } catch (err) {
    console.error("failed to log AI usage", params.operation, err);
  }
}

type UsageRow = {
  provider: "anthropic" | "voyage";
  operation: string;
  status: "ok" | "error";
  latency_ms: number;
  estimated_cost_usd: number | null;
  created_at: string;
};

export type AiOpsSummary = {
  allTime: {
    calls: number;
    costUsd: number;
    byProvider: { provider: "anthropic" | "voyage"; calls: number; costUsd: number }[];
  };
  last30d: { calls: number; costUsd: number; successRate: number | null; avgLatencyMs: number | null };
  byOperation: { operation: string; calls: number; costUsd: number }[];
};

// Powers the public /ai-ops page. In-memory aggregation over a capped
// recent window, same style as chat-index's groupGaps() — no SQL group by
// needed at this scale.
export const getAiOpsSummary = cache(async (): Promise<AiOpsSummary> => {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("ai_usage_log")
    .select("provider, operation, status, latency_ms, estimated_cost_usd, created_at")
    .order("created_at", { ascending: false })
    .limit(10000);

  const rows = (data ?? []) as UsageRow[];
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const providerTotals = new Map<string, { calls: number; costUsd: number }>();
  const operationTotals = new Map<string, { calls: number; costUsd: number }>();
  let allTimeCalls = 0;
  let allTimeCost = 0;
  let last30dCalls = 0;
  let last30dCost = 0;
  let last30dOk = 0;
  let last30dLatencySum = 0;

  for (const row of rows) {
    const cost = row.estimated_cost_usd ?? 0;
    allTimeCalls += 1;
    allTimeCost += cost;

    const providerBucket = providerTotals.get(row.provider) ?? { calls: 0, costUsd: 0 };
    providerBucket.calls += 1;
    providerBucket.costUsd += cost;
    providerTotals.set(row.provider, providerBucket);

    const opBucket = operationTotals.get(row.operation) ?? { calls: 0, costUsd: 0 };
    opBucket.calls += 1;
    opBucket.costUsd += cost;
    operationTotals.set(row.operation, opBucket);

    if (new Date(row.created_at).getTime() >= cutoff) {
      last30dCalls += 1;
      last30dCost += cost;
      last30dLatencySum += row.latency_ms;
      if (row.status === "ok") last30dOk += 1;
    }
  }

  return {
    allTime: {
      calls: allTimeCalls,
      costUsd: allTimeCost,
      byProvider: [...providerTotals.entries()]
        .map(([provider, v]) => ({ provider: provider as "anthropic" | "voyage", ...v }))
        .sort((a, b) => b.costUsd - a.costUsd),
    },
    last30d: {
      calls: last30dCalls,
      costUsd: last30dCost,
      successRate: last30dCalls > 0 ? last30dOk / last30dCalls : null,
      avgLatencyMs: last30dCalls > 0 ? Math.round(last30dLatencySum / last30dCalls) : null,
    },
    byOperation: [...operationTotals.entries()]
      .map(([operation, v]) => ({ operation, ...v }))
      .sort((a, b) => b.costUsd - a.costUsd),
  };
});
