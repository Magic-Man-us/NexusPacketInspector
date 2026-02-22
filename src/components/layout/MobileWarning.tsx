import { useState, useEffect } from "react";

const STORAGE_KEY = "nexus-mobile-ack";
const MOBILE_QUERY = "(max-width: 768px)";

export function MobileWarning() {
  const [isMobile, setIsMobile] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) {
      setDismissed(true);
    }

    const mql = window.matchMedia(MOBILE_QUERY);
    setIsMobile(mql.matches);

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
            fontFamily: "'Orbitron', sans-serif",
            color: "#00ff9f",
            fontSize: 18,
            margin: "0 0 16px",
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          Desktop Recommended
        </h2>
        <p
          style={{
            color: "#8a9bb2",
            fontSize: 14,
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
            fontFamily: "'Orbitron', sans-serif",
            background: "transparent",
            color: "#00ff9f",
            border: "1px solid #00ff9f",
            borderRadius: 4,
            padding: "10px 32px",
            fontSize: 13,
            letterSpacing: 2,
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
