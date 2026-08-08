import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0e211e",
          color: "#8fd4c4",
          fontFamily: "sans-serif",
          fontSize: 84,
          fontWeight: 700,
        }}
      >
        DE
      </div>
    ),
    { ...size }
  );
}
