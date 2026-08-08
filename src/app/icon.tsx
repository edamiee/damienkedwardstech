import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          fontSize: 18,
          fontWeight: 700,
        }}
      >
        DE
      </div>
    ),
    { ...size }
  );
}
