import { ImageResponse } from "next/og";
import { getSiteName } from "@/lib/site-content";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const siteName = await getSiteName();

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
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: "#8fd4c4",
              display: "flex",
            }}
          />
          <div
            style={{
              fontSize: 26,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#e08159",
              display: "flex",
            }}
          >
            AI &amp; Data Engineering
          </div>
        </div>
        <div
          style={{
            fontSize: 84,
            fontWeight: 700,
            marginTop: 32,
            lineHeight: 1.05,
            color: "#efe6d2",
            display: "flex",
          }}
        >
          {siteName}
        </div>
        <div style={{ fontSize: 32, marginTop: 28, color: "#9cad9f", display: "flex" }}>
          damienkedwards.tech
        </div>
      </div>
    ),
    { ...size }
  );
}
