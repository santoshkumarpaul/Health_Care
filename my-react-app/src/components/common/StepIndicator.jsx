import React from "react";

export function StepIndicator({ steps, current }) {
  return (
    <div className="step-row">
      {steps.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : 0 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div style={{ 
              width: 26, 
              height: 26, 
              borderRadius: "50%", 
              background: i < current ? "var(--teal)" : i === current ? "var(--ink)" : "var(--border)", 
              color: i <= current ? "#fff" : "var(--ink-faint)", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              fontSize: 11, 
              fontWeight: 600, 
              fontFamily: "var(--font-mono)", 
              flexShrink: 0 
            }}>
              {i < current ? "✓" : i + 1}
            </div>
            <span style={{ 
              fontSize: 9, 
              whiteSpace: "nowrap", 
              color: i === current ? "var(--ink)" : "var(--ink-faint)", 
              fontWeight: i === current ? 600 : 400, 
              fontFamily: "var(--font-mono)", 
              textTransform: "uppercase", 
              letterSpacing: ".04em" 
            }}>
              {s}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ 
              flex: 1, 
              height: 1, 
              background: i < current ? "var(--teal)" : "var(--border)", 
              margin: "0 6px", 
              marginBottom: 18 
            }} />
          )}
        </div>
      ))}
    </div>
  );
}
