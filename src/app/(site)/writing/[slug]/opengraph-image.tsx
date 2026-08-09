import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";

export const alt = "Post";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createAdminClient();
  const { data: post } = await supabase
    .from("posts")
    .select("title")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  const title = post?.title ?? "Writing";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "88px",
          background: "#0e211e",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 14, height: 14, borderRadius: 999, background: "#8fd4c4", display: "flex" }} />
          <div
            style={{
              fontSize: 26,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#e08159",
              display: "flex",
            }}
          >
            Post
          </div>
        </div>
        <div
          style={{
            fontSize: title.length > 60 ? 56 : 72,
            fontWeight: 700,
            marginTop: 32,
            lineHeight: 1.1,
            color: "#efe6d2",
            display: "flex",
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 28, marginTop: 28, color: "#9cad9f", display: "flex" }}>
          damienkedwards.tech
        </div>
      </div>
    ),
    { ...size }
  );
}
