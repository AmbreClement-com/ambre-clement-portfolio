import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/seo";

export const alt = `${SITE_NAME} — Photographe`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#fafafa",
        }}
      >
        <div style={{ fontSize: 88, letterSpacing: 18, fontWeight: 300 }}>
          AMBRE CLÉMENT
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 30,
            letterSpacing: 8,
            color: "#a3a3a3",
            textTransform: "uppercase",
          }}
        >
          Photographe
        </div>
      </div>
    ),
    { ...size },
  );
}
