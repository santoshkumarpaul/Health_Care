import React, { useState } from "react";

export function OtpStep({ phone, onVerify, onBack, label = "Verify Mobile Number" }) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  function h(i, val) {
    if (!/^\d?$/.test(val)) return;
    const n = [...otp];
    n[i] = val;
    setOtp(n);
    if (val && i < 5) document.getElementById(`otp-${i + 1}`)?.focus();
    if (!val && i > 0) document.getElementById(`otp-${i - 1}`)?.focus();
  }

  return (
    <>
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>📱</div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 400, marginBottom: 4, color: "var(--ink)" }}>{label}</h2>
        <p style={{ color: "var(--ink-faint)", fontSize: 14 }}>Code sent to <strong>{phone || "+91 ••••••0001"}</strong></p>
      </div>
      <div className="form-group">
        <label className="form-label">Enter OTP</label>
        <div className="otp-boxes">
          {otp.map((v, i) => (
            <input
              key={i}
              id={`otp-${i}`}
              className="otp-box"
              maxLength={1}
              value={v}
              onChange={e => h(i, e.target.value)}
            />
          ))}
        </div>
      </div>
      <button className="btn btn-primary w-full" style={{ marginTop: 8 }} onClick={() => {
        const code = otp.join('');
        if (code.length !== 6) { alert("Please enter the full 6-digit code."); return; }
        onVerify(code);
      }}>Verify & Continue →</button>
      <button className="btn btn-outline w-full" style={{ marginTop: 10 }} onClick={onBack}>← Back</button>
    </>
  );
}
