// frontend/src/app/certificate/[badgeId]/page.tsx
"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Share2, Download, ExternalLink, CheckCircle2, Award } from "lucide-react";
import api from "@/lib/api";

/* ═══════════════════════════════════════════════════════════════════
   UNIVERSAL GRADE SYSTEM — Consistent across ALL pages
═══════════════════════════════════════════════════════════════════ */
function universalGrade(s: number) {
  if (s >= 90) return { grade: "A+", label: "Elite", tier: "Elite Strategist", color: "#10b981" };
  if (s >= 80) return { grade: "A", label: "Strong", tier: "Strong Leader", color: "#10b981" };
  if (s >= 70) return { grade: "B+", label: "Good", tier: "Developing Manager", color: "#3b82f6" };
  if (s >= 60) return { grade: "B", label: "Developing", tier: "Developing Manager", color: "#f59e0b" };
  return { grade: "C", label: "High Risk", tier: "High Risk Manager", color: "#ef4444" };
}

/* Professional certificate palette */
const DARK_BLUE = "#0f1e3d";
const MID_BLUE = "#2563eb";
const LIGHT_BLUE = "#dbeafe";
const MID_LIGHT = "#93c5fd";
const F = "'Segoe UI','Helvetica Neue',Arial,sans-serif";

export default function CertificatePage() {
  const params = useParams();
  const rawId = params?.badgeId;
  const publicId = Array.isArray(rawId) ? rawId[0] : (rawId ?? "");

  const [badge, setBadge] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!publicId) { setLoading(false); setError("Invalid certificate link."); return; }
    api.get(`/badges/${publicId}`)
      .then(r => setBadge(r.data?.data))
      .catch(() => setError("Certificate not found."))
      .finally(() => setLoading(false));
  }, [publicId]);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 className="w-7 h-7 animate-spin" style={{ color: MID_BLUE }} />
    </div>
  );
  if (error || !badge) return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", fontFamily: F }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "#64748b", marginBottom: "12px" }}>{error || "Certificate not found."}</p>
        <Link href="/" style={{ color: MID_BLUE, fontSize: "13px" }}>← ManaGenz</Link>
      </div>
    </div>
  );

  const score = Math.round(badge.score ?? 0);
  const { grade, label, tier: tierLabel, color: gradeColor } = universalGrade(score);
  /* Certificate ID = last 12 chars of publicId uppercased, formatted as MG-XXXX-XXXX */
  const certRaw = publicId.replace(/-/g, "").slice(-12).toUpperCase();
  const certId = `MG-${certRaw.slice(0, 4)}-${certRaw.slice(4, 8)}-${certRaw.slice(8, 12)}`;
  const barW = Math.min(score, 100);
  const earned = badge.earnedAt
    ? new Date(badge.earnedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const certUrl = typeof window !== "undefined" ? `${window.location.origin}/certificate/${publicId}` : "";

  const handleDownload = async () => {
    const el = cardRef.current;
    if (!el) return;
    try {
      // @ts-ignore
      const h2c = (await import("html2canvas")).default;
      const canvas = await h2c(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff", windowWidth: el.offsetWidth });
      const link = document.createElement("a");
      link.download = `ManaGenz_Certificate_${certId}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch { window.print(); }
  };

  const handleLinkedIn = async () => {
    await handleDownload();
    await new Promise(r => setTimeout(r, 700));
    const post = `🎓 I earned the "${tierLabel}" certificate on ManaGenz!\n\n📊 Simulation: "${badge.simTitle}"\n🏆 Score: ${score}/100 — Grade ${grade} (${label})\n🌐 Domain: ${badge.domainName}\n\nManaGenz builds real management judgment through 25-decision business simulations — not theory, just decisions with real consequences.\n\n🔗 Verify: ${certUrl}\n\n#ManaGenz #ManagementSkills #Leadership #Certificate`;
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(certUrl)}&summary=${encodeURIComponent(post)}`, "_blank");
  };

  return (
    <>
    <style>{`
      @keyframes up { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      @media print { .no-print{display:none!important;} #certificate-card { box-shadow:none!important; border:2px solid #e2e8f0!important; } }
    `}</style>

    {/* Page — always light */}
    <div style={{ minHeight: "100vh", background: "#f1f5f9", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 16px", fontFamily: F }}>

      {/* Action bar */}
      <div className="no-print" style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px", animation: "up 0.35s ease" }}>
        <Link href="/" style={{ fontFamily: F, fontSize: "12px", color: "#64748b", textDecoration: "none" }}>← ManaGenz</Link>
        <span style={{ color: "#cbd5e1" }}>|</span>
        <button onClick={handleLinkedIn}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 18px", borderRadius: "8px", background: "#0A66C2", border: "none", color: "#fff", fontFamily: F, fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
          <Share2 style={{ width: "14px", height: "14px" }} /> Share on LinkedIn
        </button>
        <button onClick={handleDownload}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", background: "#fff", border: "1px solid #e2e8f0", color: "#334155", fontFamily: F, fontSize: "13px", cursor: "pointer" }}>
          <Download style={{ width: "14px", height: "14px" }} /> Download
        </button>
      </div>

      {/* ── HORIZONTAL CERTIFICATE ──────────────────────────────────── */}
      <div ref={cardRef} id="certificate-card" style={{
        width: "860px",
        background: "#ffffff",
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid #e2e8f0",
        boxShadow: "0 4px 20px rgba(0,0,0,0.07)",
        fontFamily: F,
      }}>

        {/* Top accent stripe */}
        <div style={{ height: "5px", background: `linear-gradient(90deg,${DARK_BLUE},${MID_BLUE},${MID_LIGHT})` }} />

        {/* ── MAIN CONTENT — horizontal two-column ── */}
        <div style={{ display: "flex" }}>

          {/* LEFT PANEL — dark navy, vertical branding */}
          <div style={{
            width: "220px",
            flexShrink: 0,
            background: DARK_BLUE,
            padding: "40px 28px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            {/* Logo */}
            <div style={{ textAlign: "center" }}>
              <img src="/dark_logo.png" alt="ManaGenz"
                style={{ height: "28px", objectFit: "contain", marginBottom: "8px" }} />
              <div style={{ width: "40px", height: "1px", background: "rgba(255,255,255,0.2)", margin: "0 auto 16px" }} />
              <p style={{ fontSize: "8px", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.18em", margin: 0, fontWeight: 600 }}>
                Certificate of<br />Completion
              </p>
            </div>

            {/* Grade badge */}
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: "72px", height: "72px", borderRadius: "50%",
                border: "2px solid rgba(255,255,255,0.25)",
                background: "rgba(255,255,255,0.08)",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                margin: "0 auto 10px",
              }}>
                <span style={{ fontSize: "28px", fontWeight: 900, color: "#ffffff", fontFamily: "monospace", lineHeight: 1 }}>{grade}</span>
                <span style={{ fontSize: "7px", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "3px" }}>Grade</span>
              </div>
              <p style={{ fontSize: "11px", fontWeight: 700, color: MID_LIGHT, margin: "0 0 2px", textAlign: "center" }}>{label}</p>
              <p style={{ fontSize: "8px", color: "rgba(255,255,255,0.35)", margin: 0, textAlign: "center" }}>{score} / 100</p>
            </div>

            {/* Score bar vertical */}
            <div style={{ width: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                <span style={{ fontSize: "7.5px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Score</span>
                <span style={{ fontSize: "7.5px", color: MID_LIGHT, fontWeight: 700, fontFamily: "monospace" }}>{score}%</span>
              </div>
              <div style={{ height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${barW}%`, background: `linear-gradient(90deg,${MID_BLUE},${MID_LIGHT})`, borderRadius: "2px" }} />
              </div>
            </div>
          </div>

          {/* RIGHT PANEL — white, certificate body */}
          <div style={{ flex: 1, padding: "36px 40px 32px" }}>

            {/* This is to certify that */}
            <p style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.22em", margin: "0 0 8px", fontWeight: 500 }}>
              This is to certify that
            </p>

            {/* Recipient name */}
            <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#0f172a", margin: "0 0 2px", letterSpacing: "-0.3px", lineHeight: 1.2 }}>
              {badge.userName}
            </h1>

            {/* Sub text */}
            <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 20px" }}>
              has successfully completed the following simulation
            </p>

            {/* Simulation name highlight */}
            <div style={{
              background: LIGHT_BLUE, border: `1.5px solid ${MID_LIGHT}`,
              borderLeft: `4px solid ${DARK_BLUE}`,
              borderRadius: "8px", padding: "12px 20px", marginBottom: "20px",
            }}>
              <p style={{ fontSize: "17px", fontWeight: 800, color: DARK_BLUE, margin: "0 0 3px", letterSpacing: "-0.1px" }}>
                {badge.simTitle}
              </p>
              <p style={{ fontSize: "11px", color: "#3b82f6", margin: 0, fontWeight: 500 }}>
                {badge.domainName} · ManaGenz
              </p>
            </div>

            {/* Three stat chips */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
              {[
                { label: "Performance", value: tierLabel },
                { label: "Grade", value: grade },
                { label: "Score", value: `${score}/100` },
              ].map(({ label: l, value: v }, i) => (
                <div key={i} style={{
                  padding: "8px 16px", borderRadius: "7px",
                  background: "#f8fafc", border: "1px solid #e2e8f0",
                  minWidth: "100px",
                }}>
                  <p style={{ fontSize: "7.5px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.14em", margin: "0 0 3px", fontWeight: 600 }}>{l}</p>
                  <p style={{ fontSize: "13px", fontWeight: 800, color: DARK_BLUE, margin: 0, fontFamily: "monospace" }}>{v}</p>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div style={{ height: "1px", background: "#f1f5f9", marginBottom: "20px" }} />

            {/* Footer row: date | seal | cert ID */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>

              <div>
                <p style={{ fontSize: "7.5px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.14em", margin: "0 0 3px", fontWeight: 600 }}>Date Issued</p>
                <p style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a", margin: 0 }}>{earned}</p>
              </div>

              {/* Centre seal */}
              <div style={{ textAlign: "center" }}>
                <div style={{
                  width: "52px", height: "52px", borderRadius: "50%",
                  border: `2px solid ${MID_LIGHT}`, background: LIGHT_BLUE,
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <CheckCircle2 style={{ width: "16px", height: "16px", color: DARK_BLUE }} />
                  <span style={{ fontSize: "6px", color: DARK_BLUE, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "2px" }}>Verified</span>
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "7.5px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.14em", margin: "0 0 3px", fontWeight: 600 }}>Certificate ID</p>
                <p style={{ fontSize: "12px", fontWeight: 800, color: DARK_BLUE, margin: "0 0 1px", fontFamily: "monospace", letterSpacing: "0.05em" }}>{certId}</p>
                <p style={{ fontSize: "7.5px", color: "#cbd5e1", margin: 0, fontFamily: "monospace" }}>managenz.academy</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── VERIFICATION STRIP ── */}
        <div style={{
          padding: "9px 40px 9px 28px",
          background: "#f8fafc", borderTop: "1px solid #f1f5f9",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontSize: "8px", color: "#94a3b8" }}>
            Publicly verifiable · managenz.academy/certificate/{certId}
          </span>
          <span style={{ fontSize: "7.5px", color: "#cbd5e1", fontFamily: "monospace" }}>
            {publicId.slice(0, 24).toUpperCase()}
          </span>
        </div>
      </div>

      {/* Verify link */}
      <div className="no-print" style={{ marginTop: "14px", animation: "up 0.5s ease 0.25s both" }}>
        <a href={certUrl} target="_blank" rel="noreferrer"
          style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: "monospace", fontSize: "11px", color: "#94a3b8", textDecoration: "none" }}>
          <ExternalLink style={{ width: "11px", height: "11px" }} /> {certUrl}
        </a>
      </div>
    </div>
    </>
  );
}