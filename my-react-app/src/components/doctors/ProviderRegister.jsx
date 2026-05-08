import React, { useState } from "react";
import { authApi, doctorApi } from "../../api";
import { StepIndicator } from "../common/StepIndicator";
import { OtpStep } from "../common/OtpStep";

export function ProviderRegister({ initialRole = "doctor", onDone, onBack }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [f, setF] = useState({ 
    type: initialRole === "lab" ? "lab" : "doctor", 
    name: "", 
    phone: "", 
    email: "", 
    password: "", 
    regNumber: "", 
    facility: "", 
    hfrId: ""
  });

  const s = (k, v) => setF(x => ({ ...x, [k]: v }));

  async function handleFinish() {
    setLoading(true);
    try {
      await doctorApi.updateProfile({
        name: f.name,
        specialty: f.specialty,
        facility: f.facility,
        reg_number: f.regNumber,
        hfr_id: f.hfrId
      });
      onDone();
    } catch (e) {
      alert("Error updating profile: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <StepIndicator steps={["Details", "Verify", "Credentials", "Facility", "Review"]} current={step} />
      
      {step === 0 && (
        <>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 400, marginBottom: 4 }}>Provider Registration</h2>
          <p style={{ color: "var(--ink-faint)", fontSize: 14, marginBottom: 18 }}>Register as a verified healthcare provider.</p>
          <div className="form-group">
            <label className="form-label">Type</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              {[
                { k: "doctor", icon: "🩺", l: "Doctor" }, 
                { k: "lab", icon: "🔬", l: "Lab" }, 
                { k: "pharma", icon: "💊", l: "Pharmacy" }, 
                { k: "clinic", icon: "🏥", l: "Clinic" }
              ].map(t => (
                <div 
                  key={t.k} 
                  onClick={() => s("type", t.k)} 
                  className={`role-btn ${f.type === t.k ? "active" : ""}`}
                >
                  <span className="role-icon">{t.icon}</span>{t.l}
                </div>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{f.type === "doctor" ? "Full Name (MCI)" : "Organisation Name"}</label>
            <input className="form-input" value={f.name} onChange={e => s("name", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Work Email</label>
            <input className="form-input" type="email" value={f.email} onChange={e => s("email", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Mobile</label>
            <div style={{ display: "flex", gap: 8 }}>
              <select className="form-select" style={{ width: 76, flexShrink: 0 }}>
                <option>+91</option>
              </select>
              <input 
                className="form-input" 
                placeholder="98765 43210" 
                maxLength={10} 
                value={f.phone} 
                onChange={e => s("phone", e.target.value.replace(/\D/g, ""))} 
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: "relative" }}>
              <input 
                className="form-input" 
                type={showPassword ? "text" : "password"} 
                value={f.password} 
                onChange={e => s("password", e.target.value)} 
                style={{ paddingRight: 40 }}
              />
              <span 
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", cursor: "pointer", fontSize: 16, color: "var(--ink-faint)" }}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "👁️" : "🙈"}
              </span>
            </div>
          </div>
          <button 
            className="btn btn-primary w-full" 
            onClick={async () => {
              if (f.phone.length !== 10) { alert("Please enter a valid 10-digit mobile number."); return; }
              try {
                await authApi.sendOtp(f.phone);
                alert("Verification code has been sent to your work mobile.");
                setStep(1);
              } catch (e) {
                alert("Error: " + e.message);
              }
            }}
          >
            Send OTP →
          </button>
          <button className="btn btn-outline w-full" style={{ marginTop: 10 }} onClick={onBack}>← Back</button>
        </>
      )}

      {step === 1 && (
        <OtpStep 
          phone={f.phone} 
          onVerify={async (otp) => {
            try {
              await authApi.verifyOtp(f.phone, otp, f.type, "register", {
                password: f.password,
                name: f.name || "Provider",
                phone_number: f.phone
              });
              setStep(2);
            } catch (e) {
              alert("Verification failed: " + e.message);
            }
          }} 
          onBack={() => setStep(0)} 
          label="Verify Work Mobile" 
        />
      )}

      {step === 2 && (
        <>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 400, marginBottom: 4 }}>Credentials</h2>
          <p style={{ color: "var(--ink-faint)", fontSize: 14, marginBottom: 18 }}>Verified by admin before activation.</p>
          <div className="form-group">
            <label className="form-label">MCI / NABL Registration No.</label>
            <input 
              className="form-input" 
              placeholder="MH-2019-12345" 
              style={{ fontFamily: "var(--font-mono)" }} 
              value={f.regNumber} 
              onChange={e => s("regNumber", e.target.value)} 
            />
          </div>
          {f.type === "doctor" && (
            <div className="form-group">
              <label className="form-label">Specialisation</label>
              <select className="form-select" value={f.specialty} onChange={e => s("specialty", e.target.value)}>
                <option value="">Select</option>
                {["General Medicine", "Cardiology", "Paediatrics", "Dermatology", "Neurology", "Orthopaedics", "Gynaecology"].map(sp => (
                  <option key={sp}>{sp}</option>
                ))}
              </select>
            </div>
          )}
          <button className="btn btn-primary w-full" onClick={() => setStep(3)}>Continue →</button>
          <button className="btn btn-outline w-full" style={{ marginTop: 10 }} onClick={() => setStep(1)}>← Back</button>
        </>
      )}

      {step === 3 && (
        <>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 400, marginBottom: 4 }}>Facility</h2>
          <div className="form-group">
            <label className="form-label">Facility Name</label>
            <input className="form-input" placeholder="City Hospital, Pune" value={f.facility} onChange={e => s("facility", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">HFR ID <span className="text-faint">(optional)</span></label>
            <input 
              className="form-input" 
              placeholder="HFR-MH-00123" 
              style={{ fontFamily: "var(--font-mono)" }} 
              value={f.hfrId} 
              onChange={e => s("hfrId", e.target.value)} 
            />
          </div>
          <button className="btn btn-primary w-full" onClick={() => setStep(4)}>Review →</button>
          <button className="btn btn-outline w-full" style={{ marginTop: 10 }} onClick={() => setStep(2)}>← Back</button>
        </>
      )}

      {step === 4 && (
        <>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 400, marginBottom: 14 }}>Review & Submit</h2>
          {[
            ["Name", f.name || "—"], 
            ["Type", f.type], 
            ["Email", f.email || "—"], 
            ["Reg. No.", f.regNumber || "—"], 
            ["Specialty", f.specialty || "—"], 
            ["Facility", f.facility || "—"], 
            ["HFR ID", f.hfrId || "Pending"]
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
              <span className="text-sm text-faint">{k}</span>
              <span className="text-sm font-600">{v}</span>
            </div>
          ))}
          <div className="alert alert-warn" style={{ marginTop: 14 }}>⏳ Reviewed within 24–48 hrs. SMS confirmation on approval.</div>
          <button 
            className="btn btn-primary w-full" 
            style={{ marginTop: 8 }} 
            onClick={handleFinish} 
            disabled={loading}
          >
            {loading ? "Updating..." : "Submit for Verification →"}
          </button>
          <button className="btn btn-outline w-full" style={{ marginTop: 10 }} onClick={() => setStep(3)}>← Edit</button>
        </>
      )}
    </>
  );
}
