import React, { useState, useEffect } from "react";
import { vitalsApi } from "../../api";
import { MiniChart } from "../common/MiniChart";

const VITALS_HISTORY = {
  labels: ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"],
  glucose: [98, 104, 108, 102, 109, 112],
  systolic: [118, 122, 125, 120, 124, 128],
  weight: [68, 69, 70, 71, 71.5, 72],
  heartRate: [72, 74, 71, 73, 70, 72],
};

export function HealthCharts({ patientData }) {
  const [realVitals, setRealVitals] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const pId = patientData?.id;
        const data = await vitalsApi.getAll(pId ? { patient: pId } : {});
        if (Array.isArray(data) && data.length > 0) setRealVitals(data);
      } catch (e) { 
        console.error("Vitals load error", e); 
      }
    }
    load();
  }, [patientData]);

  // Process data for charts
  const sorted = Array.isArray(realVitals) ? [...realVitals].sort((a, b) => new Date(a.date) - new Date(b.date)) : [];
  const labels = sorted.map(v => new Date(v.date).toLocaleDateString('en-US', { month: 'short' }));
  const glucose = sorted.map(v => v.glucose).filter(x => x);
  const systolic = sorted.map(v => v.systolic).filter(x => x);
  const weight = sorted.map(v => v.weight).filter(x => x);
  const hr = sorted.map(v => v.heart_rate).filter(x => x);

  const isReal = labels.length > 0;
  const displayLabels = isReal ? labels : VITALS_HISTORY.labels;
  const displayGlucose = isReal ? (glucose.length > 0 ? glucose : [0]) : VITALS_HISTORY.glucose;
  const displaySystolic = isReal ? (systolic.length > 0 ? systolic : [0]) : VITALS_HISTORY.systolic;
  const displayWeight = isReal ? (weight.length > 0 ? weight : [0]) : VITALS_HISTORY.weight;
  const displayHr = isReal ? (hr.length > 0 ? hr : [0]) : [72, 74, 70, 73, 69, 72];

  return (
    <div className="card fade-up">
      <div className="section-title mb-20">📈 Health Trends — {labels.length > 0 ? "Real Data Log" : "Last 6 Months (Demo Data)"}</div>
      <div className="grid-2" style={{ gap: 28 }}>
        <MiniChart data={displayGlucose} labels={displayLabels} color="var(--amber)" unit="mg/dL" title="Blood Glucose" />
        <MiniChart data={displaySystolic} labels={displayLabels} color="var(--rose)" unit="mmHg" title="Systolic BP" />
        <MiniChart data={displayWeight} labels={displayLabels} color="var(--indigo)" unit="kg" title="Body Weight" />
        <MiniChart data={displayHr} labels={displayLabels} color="var(--teal)" unit="bpm" title="Heart Rate" />
      </div>
    </div>
  );
}
