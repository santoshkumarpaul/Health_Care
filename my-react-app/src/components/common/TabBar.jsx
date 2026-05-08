import React from "react";

export function TabBar({ tabs, active, onChange }) {
  return (
    <div className="tab-bar">
      {tabs.map(([k, l]) => (
        <button
          key={k}
          className={`tab-btn ${active === k ? "active" : ""}`}
          onClick={() => onChange(k)}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
