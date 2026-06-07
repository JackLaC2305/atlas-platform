import { ImageResponse } from "next/og";

export const size = {
  width: 64,
  height: 64,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#0F172A",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 4,
            display: "flex",
            flexWrap: "wrap",
            gap: 4,
            height: 40,
            padding: 5,
            width: 40,
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.9)",
              borderRadius: 2,
              height: 12,
              width: 12,
            }}
          />
          <div style={{ background: "#D4A017", borderRadius: 2, height: 12, width: 12 }} />
          <div
            style={{
              background: "rgba(255,255,255,0.9)",
              borderRadius: 2,
              height: 12,
              width: 12,
            }}
          />
          <div
            style={{
              background: "rgba(255,255,255,0.9)",
              borderRadius: 2,
              height: 12,
              width: 12,
            }}
          />
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
