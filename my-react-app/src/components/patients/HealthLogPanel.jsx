import React, { useState, useEffect } from "react";
import { vitalsApi, allergiesApi } from "../../api";

export function HealthLogPanel({ patientData, onRefresh }) {
  const [vitals, setVitals] = useState({ glucose: "", systolic: "", diastolic: "", weight: "", heart_rate: "", bmi: "", spo2: "", height: "" });
  const [vitalsHistory, setVitalsHistory] = useState([]);
  const [allergies, setAllergies] = useState([]);
  const [newAllergy, setNewAllergy] = useState({ substance: "", severity: "Medium", reaction: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => { 
    loadAll(); 
  }, [patientData]);

  // Auto-calculate BMI
  useEffect(() => {
    if (vitals.weight && vitals.height) {
      const hMeters = parseFloat(vitals.height) / 100;
      const wKg = parseFloat(vitals.weight);
      if (hMeters > 0) {
        const calculatedBmi = (wKg / (hMeters * hMeters)).toFixed(1);
        setVitals(v => ({ ...v, bmi: calculatedBmi }));
      }
    }
  }, [vitals.weight, vitals.height]);

  async function loadAll() {
    setLoading(true);
    try {
      const pId = patientData?.id;
      const [v, a] = await Promise.all([
        vitalsApi.getAll(pId ? { patient: pId } : {}),
        allergiesApi.getAll(pId ? { patient: pId } : {})
      ]);
      const vData = Array.isArray(v) ? v : (v?.results || []);
      const aData = Array.isArray(a) ? a : (a?.results || []);
      setVitalsHistory(vData.sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id));
      setAllergies(aData.sort((a, b) => b.id - a.id));
    } catch (e) {
      console.error("Health log sync failed:", e);
    } finally {
      setLoading(false);
    }
  }

  async function saveVitals() {
    const cleaned = {};
    Object.keys(vitals).forEach(k => {
      if (vitals[k] !== "" && vitals[k] !== null) cleaned[k] = vitals[k];
    });
    if (patientData?.id) cleaned.patient_id = patientData.id;
    if (Object.keys(cleaned).length === (patientData?.id ? 1 : 0)) return;
    setLoading(true);
    try {
      await vitalsApi.create(cleaned);
      alert("Vitals logged successfully!");
      setVitals({ glucose: "", systolic: "", diastolic: "", weight: "", heart_rate: "", bmi: "", spo2: "", height: "" });
      loadAll();
      if (onRefresh) onRefresh();
    } catch (e) { 
      alert("Error: " + e.message); 
    } finally { 
      setLoading(false); 
    }
  }

  async function addAllergy() {
    if (!newAllergy.substance) return;
    const data = { ...newAllergy };
    if (patientData?.id) data.patient_id = patientData.id;
    try {
      await allergiesApi.create(data);
      setNewAllergy({ substance: "", severity: "Medium", reaction: "" });
      loadAll();
      if (onRefresh) onRefresh();
    } catch (e) { 
      alert("Error: " + e.message); 
    }
  }

  async function deleteAllergy(id) {
    try {
      await allergiesApi.delete(id);
      loadAll();
    } catch (e) { 
      alert("Error: " + e.message); 
    }
  }

  return (
    <div className="grid-2 gap-20">
      <div className="card fade-up">
        <div className="section-title">📝 Monthly Health Log</div>
        <p className="text-sm text-faint mb-16">Update your vitals manually for accurate trend tracking.</p>
        
        <div className="grid-2 gap-12">
          <div className="form-group"><label className="form-label">Systolic BP (mmHg)</label><input className="form-input" type="number" placeholder="e.g. 120" value={vitals.systolic} onChange={e => setVitals({ ...vitals, systolic: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Diastolic BP (mmHg)</label><input className="form-input" type="number" placeholder="e.g. 80" value={vitals.diastolic} onChange={e => setVitals({ ...vitals, diastolic: e.target.value })} /></div>
        </div>

        <div className="grid-2 gap-12">
          <div className="form-group"><label className="form-label">Heart Rate (bpm)</label><input className="form-input" type="number" placeholder="e.g. 72" value={vitals.heart_rate} onChange={e => setVitals({ ...vitals, heart_rate: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Blood Glucose (mg/dL)</label><input className="form-input" type="number" placeholder="e.g. 110" value={vitals.glucose} onChange={e => setVitals({ ...vitals, glucose: e.target.value })} /></div>
        </div>

        <div className="grid-2 gap-12">
          <div className="form-group"><label className="form-label">Height (cm)</label><input className="form-input" type="number" placeholder="e.g. 170" value={vitals.height} onChange={e => setVitals({ ...vitals, height: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Weight (kg)</label><input className="form-input" type="number" step="0.1" placeholder="e.g. 70.5" value={vitals.weight} onChange={e => setVitals({ ...vitals, weight: e.target.value })} /></div>
        </div>

        <div className="grid-2 gap-12">
          <div className="form-group"><label className="form-label">SpO₂ (%)</label><input className="form-input" type="number" placeholder="e.g. 98" value={vitals.spo2} onChange={e => setVitals({ ...vitals, spo2: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">BMI (Calculated)</label><input className="form-input" type="number" step="0.1" placeholder="Auto" value={vitals.bmi} readOnly style={{ background: "var(--surface)" }} /></div>
        </div>

        <button className="btn btn-primary w-full" style={{ marginTop: 10 }} onClick={saveVitals} disabled={loading}>{loading ? "Saving..." : "Save Health Log →"}</button>

        {loading && <div style={{ textAlign: "center", padding: 20 }}><span className="spin" style={{ display: "inline-block" }}>⟳</span> Syncing...</div>}

        {Array.isArray(vitalsHistory) && vitalsHistory.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div className="section-title" style={{ fontSize: 14, marginBottom: 12 }}>Recent Logs</div>
            <div className="table-wrap">
              <table className="text-xs">
                <thead><tr><th>Date</th><th>BP</th><th>HR</th><th>Gluc.</th><th>Ht.</th><th>Wt.</th><th>BMI</th><th>SpO₂</th></tr></thead>
                <tbody>
                  {vitalsHistory.slice(0, 3).map(vh => (
                    <tr key={vh.id}>
                      <td className="text-faint">{new Date(vh.date).toLocaleDateString()}</td>
                      <td>{vh.systolic && vh.diastolic ? `${vh.systolic}/${vh.diastolic}` : vh.systolic || "—"}</td>
                      <td>{vh.heart_rate || "—"}</td>
                      <td>{vh.glucose || "—"}</td>
                      <td>{vh.height || "—"}</td>
                      <td>{vh.weight || "—"}</td>
                      <td>{vh.bmi || "—"}</td>
                      <td>{vh.spo2 || "—"}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <div className="card fade-up fade-up-1">
        <div className="section-title">⚠️ Allergies</div>
        <p className="text-sm text-faint mb-16">Maintain a verified list of allergies for safer prescriptions.</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input className="form-input" placeholder="Substance (e.g. Penicillin)" value={newAllergy.substance} onChange={e => setNewAllergy({ ...newAllergy, substance: e.target.value })} />
          <select className="form-select" style={{ width: 130 }} value={newAllergy.severity} onChange={e => setNewAllergy({ ...newAllergy, severity: e.target.value })}>
            <option>Low</option><option>Medium</option><option>High</option>
          </select>
          <button className="btn btn-primary" onClick={addAllergy}>Add</button>
        </div>
        <div className="table-wrap">
          <table className="text-sm">
            <thead><tr><th>Substance</th><th>Severity</th><th style={{ textAlign: "right" }}>Action</th></tr></thead>
            <tbody>
              {!Array.isArray(allergies) || allergies.length === 0 ? <tr><td colSpan="3" style={{ textAlign: "center", padding: 20, color: "var(--ink-faint)" }}>No allergies reported</td></tr> :
                allergies.map(a => (
                  <tr key={a.id}>
                    <td className="font-600">{a.substance}</td>
                    <td><span className={`badge ${a.severity === "High" ? "badge-rose" : a.severity === "Medium" ? "badge-amber" : "badge-teal"}`}>{a.severity}</span></td>
                    <td style={{ textAlign: "right" }}><button className="btn btn-outline btn-sm" style={{ color: "var(--rose)", borderColor: "rgba(225,29,72,0.1)" }} onClick={() => deleteAllergy(a.id)}>✕</button></td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
