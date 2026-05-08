import React, { useState } from "react";
import { authApi, patientApi } from "../../api";
import { StepIndicator } from "../common/StepIndicator";
import { OtpStep } from "../common/OtpStep";
import { QRDisplay } from "../common/QRDisplay";

export function PatientRegister({ onDone, onBack }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [f, setF] = useState({ 
    phone: "", 
    password: "",
    email: "", 
    firstName: "", 
    lastName: "", 
    dob: "", 
    gender: "", 
    blood: "", 
    state: "", 
    city: "", 
    eName: "", 
    eRel: "", 
    ePhone: "", 
    aadhaar: "" 
  });

  const s = (k, v) => setF(x => ({ ...x, [k]: v }));

  async function handleSendOtp() {
    if (f.phone.length !== 10) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (f.aadhaar.length !== 12) {
      alert("Please enter a valid 12-digit Aadhaar number.");
      return;
    }
    if (!f.password) {
      alert("Please enter a password.");
      return;
    }
    setLoading(true);
    try {
      await authApi.sendOtp(f.phone);
      alert("OTP has been sent to your mobile number.");
      setStep(1);
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(otp) {
    setLoading(true);
    try {
      await authApi.verifyOtp(f.phone, otp, "patient", "register", { 
        password: f.password,
        aadhaar_number: f.aadhaar,
        name: f.firstName ? `${f.firstName} ${f.lastName}` : "New Patient",
        phone_number: f.phone
      });
      setStep(2);
    } catch (e) {
      alert(e.message || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleFinish() {
    setLoading(true);
    try {
      await patientApi.updateProfile({
        first_name: f.firstName,
        last_name: f.lastName,
        dob: f.dob,
        gender: f.gender,
        blood_group: f.blood,
        state: f.state,
        city: f.city,
        emergency_name: f.eName,
        emergency_relation: f.eRel,
        emergency_phone: f.ePhone
      });
      setStep(3);
    } catch (e) {
      alert("Error saving profile: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <StepIndicator steps={["Identity", "Verify", "Profile", "Done"]} current={step} />
      
      {step === 0 && (
        <>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 400, marginBottom: 4 }}>Create Patient Account</h2>
          <p style={{ color: "var(--ink-faint)", fontSize: 14, marginBottom: 20 }}>Register to get your Digital Health Card</p>
          <div className="form-group">
            <label className="form-label">Mobile Number</label>
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
            <label className="form-label">Aadhaar Number</label>
            <input 
              className="form-input" 
              placeholder="1234 5678 9012" 
              maxLength={12} 
              value={f.aadhaar} 
              onChange={e => s("aadhaar", e.target.value.replace(/\D/g, ""))} 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email <span className="text-faint">(optional)</span></label>
            <input className="form-input" type="email" value={f.email} onChange={e => s("email", e.target.value)} />
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
          <button className="btn btn-primary w-full" disabled={loading} onClick={handleSendOtp}>
            {loading ? "Sending..." : "Send OTP →"}
          </button>
          <button className="btn btn-outline w-full" style={{ marginTop: 10 }} onClick={onBack}>← Back</button>
        </>
      )}

      {step === 1 && <OtpStep phone={f.phone} onVerify={handleVerifyOtp} onBack={() => setStep(0)} />}

      {step === 2 && (
        <>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 400, marginBottom: 4 }}>Personal Information</h2>
          <p style={{ color: "var(--ink-faint)", fontSize: 14, marginBottom: 18 }}>Creates your health profile.</p>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input className="form-input" placeholder="Priya" value={f.firstName} onChange={e => s("firstName", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input className="form-input" placeholder="Sharma" value={f.lastName} onChange={e => s("lastName", e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input className="form-input" type="date" value={f.dob} onChange={e => s("dob", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select className="form-select" value={f.gender} onChange={e => s("gender", e.target.value)}>
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Blood Group</label>
              <select className="form-select" value={f.blood} onChange={e => s("blood", e.target.value)}>
                <option value="">Select</option>
                {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">State</label>
              <select className="form-select" value={f.state} onChange={e => s("state", e.target.value)}>
                <option value="">Select</option>
                {[
                  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
                  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
                  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", 
                  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", 
                  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
                ].map(st => <option key={st}>{st}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">City</label>
            <input className="form-input" placeholder="Pune" value={f.city} onChange={e => s("city", e.target.value)} />
          </div>
          <div className="divider" />
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>🆘 Emergency Contact</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" placeholder="Rahul Sharma" value={f.eName} onChange={e => s("eName", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Relation</label>
              <select className="form-select" value={f.eRel} onChange={e => s("eRel", e.target.value)}>
                <option value="">Select</option>
                <option>Spouse</option>
                <option>Parent</option>
                <option>Sibling</option>
                <option>Friend</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Emergency Phone</label>
            <input className="form-input" placeholder="+91 98765 00000" value={f.ePhone} onChange={e => s("ePhone", e.target.value)} />
          </div>
          <button className="btn btn-primary w-full" disabled={loading} onClick={handleFinish}>
            {loading ? "Saving Profile..." : "Finish Profile →"}
          </button>
          <button className="btn btn-outline w-full" style={{ marginTop: 10 }} onClick={() => setStep(1)}>← Back</button>
        </>
      )}

      {step === 3 && (
        <div style={{ textAlign: "center", padding: "12px 0" }}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>🎉</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 400, marginBottom: 8 }}>Registration Complete!</h2>
          <p style={{ color: "var(--ink-faint)", fontSize: 14, marginBottom: 22 }}>Your Aadhaar-Linked Identity is ready.</p>
          <div className="abha-card" style={{ marginBottom: 20, textAlign: "left" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div className="abha-label">Digital Health Card · AADHAAR</div>
                <div className="abha-id">XXXX-XXXX-{f.aadhaar ? f.aadhaar.slice(-4) : "0000"}</div>
                <div className="abha-name">{f.firstName || "New"} {f.lastName || "Patient"}</div>
                <div className="abha-dob">{f.dob || "—"} · {f.blood || "—"} · {f.gender || "—"}</div>
              </div>
              <div style={{ flexShrink: 0, background: "white", padding: "6px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                <QRDisplay value={`AADHAAR:${f.aadhaar}`} hideText />
              </div>
            </div>
          </div>
          <button className="btn btn-primary w-full" onClick={onDone}>Go to My Dashboard →</button>
        </div>
      )}
    </>
  );
}
