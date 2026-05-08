import React from "react";

export function RecordTypeBadge({ type }) {
  const m = {
    "Visit": "badge-teal",
    "Lab": "badge-indigo",
    "Prescription": "badge-amber",
    "Imaging": "badge-rose",
    "Lab Report": "badge-indigo",
    "Blood Test": "badge-rose",
    "Imaging / Scan": "badge-purple",
    "Discharge Summary": "badge-amber",
    "Vital Signs": "badge-teal",
    "Vaccination Record": "badge-green",
    "Allergy Record": "badge-rose",
    "Surgery Report": "badge-indigo"
  };
  const t = type || "Medical Record";
  return <span className={`badge ${m[t] || "badge-gray"}`}>{t}</span>;
}
