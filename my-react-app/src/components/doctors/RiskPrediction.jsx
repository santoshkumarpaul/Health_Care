import React, { useState } from "react";
import { specialApi } from "../../api";

export function RiskPrediction({ patient }) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  async function predict() {
    setLoading(true);
    try {
      const pId = patient?.id;
      const data = await specialApi.getAIInsights(pId ? { patient_id: pId } : {});
      setResults(data.risks);
    } catch (e) {
      alert("Risk Prediction Error: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  function level(r) { 
    return r < 30 
      ? { label: "Low", cls: "risk-low", c: "var(--green)" } 
      : r < 60 
        ? { label: "Moderate", cls: "risk-medium", c: "var(--amber)" } 
        : { label: "High", cls: "risk-high", c: "var(--rose)" }; 
  }

  return (
    <div className="card fade-up fade-up-1">
      <div className="flex justify-between items-center mb-16">
        <div className="section-title mb-0">🔬 Disease Risk Prediction</div>
        <button className="btn btn-purple btn-sm" onClick={predict} disabled={loading}>
          {loading ? <span className="spin">⟳</span> : "✦ Predict Health Risk"}
        </button>
      </div>
      {!results && !loading && (
        <div style={{ textAlign: "center", padding: "18px 0", color: "var(--ink-faint)" }}>
          <div style={{ fontSize: 30, marginBottom: 8 }}>📊</div>
          <div className="text-sm">Analyzes vitals, demographics, and clinical history using medical AI to forecast potential health risks.</div>
        </div>
      )}
      {loading && (
        <div style={{ textAlign: "center", padding: "18px 0" }}>
          <div className="spin" style={{ fontSize: 26, display: "block", marginBottom: 8, color: "var(--teal)" }}>⟳</div>
          <div className="text-sm text-faint">Running prediction model…</div>
        </div>
      )}
      {results && results.map((r, i) => {
        const lv = level(r.risk); 
        return (
          <div key={i} className={`risk-card ${lv.cls}`}>
            <div className="flex justify-between items-center">
              <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
              <span className="badge" style={{ background: "white", color: lv.c, border: `1px solid ${lv.c}55` }}>
                {lv.label} · {r.risk}%
              </span>
            </div>
            <div className="risk-bar">
              <div className="risk-fill" style={{ width: `${r.risk}%`, background: r.color }} />
            </div>
          </div>
        );
      })}
      {results && (
        <div style={{ marginTop: 10, padding: "9px 14px", borderRadius: 8, fontSize: 12, background: "rgba(217,119,6,.08)", border: "1px solid #fde68a", color: "var(--amber)" }}>
          ⚠️ Probabilistic estimates only. Not a clinical diagnosis.
        </div>
      )}
    </div>
  );
}
