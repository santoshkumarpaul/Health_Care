import React, { useState } from "react";
import { specialApi } from "../../api";

export function AISummaryPanel({ patient }) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  async function generate() {
    setLoading(true);
    try {
      const pId = patient?.id;
      const data = await specialApi.getAIInsights(pId ? { patient_id: pId } : {});
      setSummary(data.summary);
    } catch (e) {
      console.error(e);
      setSummary("API Error: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card fade-up">
      <div className="flex justify-between items-center mb-16">
        <div className="section-title mb-0">🤖 AI Health Summary</div>
        <button className="btn btn-purple btn-sm" onClick={generate} disabled={loading}>
          {loading ? <><span className="spin">⟳</span> Analysing…</> : "✦ Generate Summary"}
        </button>
      </div>
      {!summary && !loading && (
        <div style={{ textAlign: "center", padding: "24px 0", color: "var(--ink-faint)" }}>
          <div style={{ fontSize: 34, marginBottom: 8 }}>🧠</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>AI-Powered Health Insights</div>
          <div className="text-sm">Click Generate to analyse all patient records and produce a clinical overview.</div>
        </div>
      )}
      {loading && (
        <div style={{ textAlign: "center", padding: "24px 0", color: "var(--indigo)" }}>
          <div className="spin" style={{ fontSize: 32, display: "block", marginBottom: 8 }}>⟳</div>
          <div style={{ fontWeight: 600 }}>Analysing health records…</div>
          <div className="text-sm" style={{ marginTop: 4 }}>Reading records across visits, labs and prescriptions</div>
        </div>
      )}
      {summary && (
        <div className="ai-bubble">
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--purple)", marginBottom: 10, letterSpacing: ".06em", textTransform: "uppercase" }}>
            ✦ AI Clinical Summary · Generated just now
          </div>
          {summary.split("\n").map((line, i) => (
            <p key={i} style={{ fontSize: 14, lineHeight: 1.75, color: "var(--ink-soft)", marginBottom: line.startsWith("•") ? 4 : 8 }}>
              {line}
            </p>
          ))}
          <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, fontSize: 12, background: "rgba(217,119,6,.08)", border: "1px solid #fde68a", color: "var(--amber)" }}>
            ⚠️ AI-generated for clinical support only. Not a medical diagnosis.
          </div>
        </div>
      )}
    </div>
  );
}
