import React from "react";

export function MiniChart({ data, labels, color, unit, title }) {
  const W = 320, H = 100, pad = 28;
  const mn = Math.min(...data) - 4, mx = Math.max(...data) + 4;
  
  const pts = data.map((v, i) => ({
    x: pad + (data.length > 1 ? (i / (data.length - 1)) * (W - pad * 2) : (W - pad * 2) / 2),
    y: mx === mn ? H / 2 : H - pad - ((v - mn) / (mx - mn)) * (H - pad * 2)
  }));
  
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = d + ` L ${pts[pts.length - 1].x} ${H - pad} L ${pts[0].x} ${H - pad} Z`;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <span style={{ fontWeight: 600, fontSize: 13 }}>{title}</span>
        <span className="badge badge-gray">{unit}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", overflow: "visible" }}>
        {[0, 1, 2].map(i => { 
          const y = H - pad - i * ((H - pad * 2) / 2); 
          const v = Math.round(mn + i * ((mx - mn) / 2)); 
          return (
            <g key={i}>
              <line x1={pad} x2={W - pad} y1={y} y2={y} stroke="var(--border)" strokeWidth="1" />
              <text x={pad - 4} y={y + 4} textAnchor="end" fontSize="9" fill="var(--ink-faint)" fontFamily="var(--font-mono)">{v}</text>
            </g>
          ); 
        })}
        {labels.map((l, i) => (
          <text key={i} x={pts[i]?.x} y={H - 2} textAnchor="middle" fontSize="9" fill="var(--ink-faint)" fontFamily="var(--font-mono)">{l}</text>
        ))}
        <path d={area} fill={color} opacity=".12" />
        <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill="white" stroke={color} strokeWidth="2" />)}
      </svg>
    </div>
  );
}
