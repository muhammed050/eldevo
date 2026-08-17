import { ImageResponse } from "next/og";

export const ogImageSize = { width: 1200, height: 630 };

export function renderOgImage({ title, category }: { title: string; category?: string }) {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "70px",
        backgroundColor: "#070b14",
        backgroundImage: "linear-gradient(135deg, #070b14 0%, #0b1424 55%, #072133 100%)",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            display: "flex",
            width: 60,
            height: 60,
            borderRadius: 16,
            background: "#22d3ee",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 32,
            fontWeight: 700,
            color: "#020617",
          }}
        >
          {">"}
        </div>
        <div style={{ display: "flex", fontSize: 32, fontWeight: 700, color: "#e2e8f0" }}>
          El<span style={{ color: "#22d3ee" }}>Devo</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {category ? (
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              fontSize: 24,
              color: "#22d3ee",
              border: "2px solid rgba(34,211,238,0.4)",
              borderRadius: 999,
              padding: "10px 26px",
              textTransform: "uppercase",
              letterSpacing: 4,
            }}
          >
            {category}
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            fontSize: 66,
            fontWeight: 800,
            color: "#f8fafc",
            lineHeight: 1.15,
            maxWidth: 1000,
          }}
        >
          {title}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 24,
          color: "#64748b",
        }}
      >
        <div style={{ display: "flex" }}>eldevo.com</div>
        <div style={{ display: "flex" }}>Free · Private · Browser-based</div>
      </div>
    </div>,
    { ...ogImageSize },
  );
}
