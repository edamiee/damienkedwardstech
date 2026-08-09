import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ToolDefinition } from "@/lib/anthropic";
import { SITE_CONTENT_DEFAULTS, type SiteContentKey } from "@/lib/site-content";

const SITE_CONTENT_KEYS = Object.keys(SITE_CONTENT_DEFAULTS);

// Deliberately small, curated set — enough for genuinely useful
// conversational edits without exposing anything structurally risky
// (no delete tools, no auth/user management, no arbitrary SQL).
export const ADMIN_AGENT_TOOLS: ToolDefinition[] = [
  {
    name: "list_site_content",
    description: "Read the current value of one piece of editable site copy, to check before changing it.",
    input_schema: {
      type: "object",
      properties: { key: { type: "string", enum: SITE_CONTENT_KEYS } },
      required: ["key"],
    },
  },
  {
    name: "update_site_content",
    description: `Update one piece of editable site copy. Valid keys: ${SITE_CONTENT_KEYS.join(", ")}.`,
    input_schema: {
      type: "object",
      properties: {
        key: { type: "string", enum: SITE_CONTENT_KEYS },
        value: { type: "string" },
      },
      required: ["key", "value"],
    },
  },
  {
    name: "add_testimonial",
    description:
      "Add a new testimonial to the homepage testimonials section (only visible if testimonials are enabled in site content).",
    input_schema: {
      type: "object",
      properties: {
        author_name: { type: "string" },
        author_title: { type: "string" },
        quote: { type: "string" },
      },
      required: ["author_name", "quote"],
    },
  },
  {
    name: "add_service",
    description: "Add a new card to the homepage \"What I do\" section.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        body: { type: "string" },
      },
      required: ["title", "body"],
    },
  },
];

export async function executeAdminAgentTool(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  const supabase = createAdminClient();

  if (name === "list_site_content") {
    const key = input.key as string;
    if (!SITE_CONTENT_KEYS.includes(key)) return `Error: "${key}" isn't a valid site_content key.`;
    const { data } = await supabase
      .from("site_content")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    const value = data?.value || SITE_CONTENT_DEFAULTS[key as SiteContentKey];
    return `${key} = ${JSON.stringify(value)}`;
  }

  if (name === "update_site_content") {
    const key = input.key as string;
    const value = input.value as string;
    if (!SITE_CONTENT_KEYS.includes(key)) return `Error: "${key}" isn't a valid site_content key.`;
    const { error } = await supabase
      .from("site_content")
      .upsert(
        { key: key as SiteContentKey, value, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
    return error ? `Error: ${error.message}` : `Updated ${key}.`;
  }

  if (name === "add_testimonial") {
    const { error } = await supabase.from("testimonials").insert({
      author_name: input.author_name,
      author_title: input.author_title || null,
      quote: input.quote,
    });
    return error ? `Error: ${error.message}` : "Testimonial added.";
  }

  if (name === "add_service") {
    const { error } = await supabase.from("home_services").insert({
      title: input.title,
      body: input.body,
    });
    return error ? `Error: ${error.message}` : "Service card added.";
  }

  return `Error: unknown tool "${name}".`;
}
