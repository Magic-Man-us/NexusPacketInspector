import { useState, useEffect } from "react";
import { FONT } from "../../styles/typography";

const STORAGE_KEY = "nexus-mobile-ack";
const MOBILE_QUERY = "(max-width: 768px)";

export function MobileWarning() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem(STORAGE_KEY));

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  if (!isMobile || dismissed) return null;

  const handleContinue = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0, 0, 0, 0.92)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          background: "#0a0f14",
          border: "1px solid #00ff9f",
          borderRadius: 8,
          padding: "32px 24px",
          maxWidth: 360,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 0 30px rgba(0, 255, 159, 0.15)",
        }}
      >
        <h2
          style={{
            fontFamily: FONT.family.display,
            color: "#00ff9f",
            fontSize: FONT.size["3xl"],
            margin: "0 0 16px",
            letterSpacing: FONT.spacing.widest,
            textTransform: "uppercase",
          }}
        >
          Desktop Recommended
        </h2>
        <p
          style={{
            color: "#8a9bb2",
            fontSize: FONT.size.xl,
            lineHeight: 1.6,
            margin: "0 0 24px",
          }}
        >
          This demo is optimized for desktop usage. Viewing on a phone will
          provide a limited experience.
        </p>
        <button
          onClick={handleContinue}
          style={{
            fontFamily: FONT.family.display,
            background: "transparent",
            color: "#00ff9f",
            border: "1px solid #00ff9f",
            borderRadius: 4,
            padding: "10px 32px",
            fontSize: FONT.size.lg,
            letterSpacing: FONT.spacing.widest,
            cursor: "pointer",
            textTransform: "uppercase",
            transition: "background 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(0, 255, 159, 0.1)";
            e.currentTarget.style.boxShadow = "0 0 12px rgba(0, 255, 159, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
