import React from "react";

export function QRDisplay({ value, hideText }) {
  const seed = value.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const sz = 21, cs = 6;
  const cells = [];
  for (let r = 0; r < sz; r++) {
    for (let c = 0; c < sz; c++) {
      const finder = (r < 7 && c < 7) || (r < 7 && c > 13) || (r > 13 && c < 7);
      const timing = (r === 6 || c === 6) && !finder;
      let on = finder || ((seed * r * c + r * 7 + c * 13) % 3 === 0);
      if (timing) on = (r + c) % 2 === 0;
      cells.push({ r, c, on });
    }
  }

  return (
    <div className="qr-box" style={hideText ? { padding: 6, gap: 0 } : {}}>
      <svg width={sz * cs + 8} height={sz * cs + 8} style={{ display: "block" }}>
        <rect width={sz * cs + 8} height={sz * cs + 8} fill="white" />
        {cells.map(({ r, c, on }) => 
          on ? <rect key={`${r}-${c}`} x={4 + c * cs} y={4 + r * cs} width={cs - 1} height={cs - 1} rx="1" fill="#0f1117" /> : null
        )}
      </svg>
      {!hideText && (
        <div style={{ 
          fontSize: 9, 
          fontFamily: "var(--font-mono)", 
          color: "var(--ink-faint)", 
          textAlign: "center", 
          maxWidth: 130, 
          wordBreak: "break-all", 
          marginTop: 8 
        }}>
          {value}
        </div>
      )}
    </div>
  );
}
