"use client";
import { useEffect } from "react";

// global-error wraps the entire app including the root layout.
// It must include its own <html> and <body> tags.
// This only fires for catastrophic errors in the root layout itself.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{
        margin: 0,
        minHeight: "100vh",
        background: "#070711",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
        padding: "1rem",
      }}>
        <div style={{ textAlign: "center", maxWidth: 420 }}>

          {/* Icon */}
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: "rgba(244,63,94,0.12)",
            border: "1px solid rgba(244,63,94,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 24px",
          }}>
            <svg width="36" height="36" fill="none" stroke="#f43f5e" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
            </svg>
          </div>

          <h1 style={{
            fontSize: 24, fontWeight: 700, margin: "0 0 12px",
            background: "linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.6) 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Application Error
          </h1>

          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, margin: "0 0 32px" }}>
            A critical error occurred. Please try refreshing the page.
            {error?.digest && (
              <><br/><span style={{ fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,0.2)", marginTop: 8, display: "block" }}>
                ID: {error.digest}
              </span></>
            )}
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={reset} style={{
              padding: "12px 24px", borderRadius: 12,
              background: "#7c6cfc", border: "none",
              color: "#fff", fontSize: 14, fontWeight: 600,
              cursor: "pointer", transition: "opacity 0.2s",
            }}
              onMouseOver={e => (e.currentTarget.style.opacity = "0.85")}
              onMouseOut={e  => (e.currentTarget.style.opacity = "1")}>
              Try Again
            </button>
            <a href="/" style={{
              padding: "12px 24px", borderRadius: 12,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 500,
              textDecoration: "none", transition: "color 0.2s",
              display: "inline-block",
            }}>
              Back to Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}