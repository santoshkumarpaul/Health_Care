import React from "react";

export function StatCard({ icon, label, value, sub, accentClass, delay = "" }) {
  return (
    <div className={`card fade-up ${delay}`}>
      <div className={`stat-accent ${accentClass}`}>{icon}</div>
      <div className="card-title">{label}</div>
      <div className="card-value">{value}</div>
      {sub && <div className="card-sub">{sub}</div>}
    </div>
  );
}
