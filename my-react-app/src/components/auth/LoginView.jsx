import React, { useState } from "react";
import { authApi } from "../../api";
import { OtpStep } from "../common/OtpStep";
import { PatientRegister } from "../patients/PatientRegister";
import { ProviderRegister } from "../doctors/ProviderRegister";

export function LoginView({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [role, setRole] = useState("patient");
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [showMoreRoles, setShowMoreRoles] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const LEFT = {
    login: {
      title: "Smart\nHealth\nRecords",
      sub: "A unified EHR with Aadhaar identity and Secure Audit Trail.",
      features: [["🔐", "Aadhaar Digital Health Card"], ["🛡️", "Secure Audit Trail"], ["📋", "FHIR-compatible records"], ["🔏", "Patient-controlled sharing"]]
    },
    "rp": {
      title: "Join\nHealthChain",
      sub: "Create your Digital Health Card in minutes.",
      features: [["✨", "Instant Aadhaar Link"], ["🔒", "Private by default"], ["📱", "Mobile-linked"], ["🆓", "Free for patients"]]
    },
    "rv": {
      title: "Provider\nAccess\nPortal",
      sub: "Register as a verified doctor, lab or clinic.",
      features: [["✅", "MCI / NABL verification"], ["🏥", "HFR facility linking"], ["📊", "Consented patient history"], ["⛓️", "Every access logged"]]
    },
  };

  const c = LEFT[mode] || LEFT.login;
  const primaryRoles = [
    { key: "patient", label: "Patient", icon: "👤" },
    { key: "doctor", label: "Doctor", icon: "🩺" },
    { key: "admin", label: "Admin", icon: "⚙️" }
  ];
  const moreRoles = [
    { key: "lab", label: "Lab", icon: "🔬" },
    { key: "pharma", label: "Pharmacy", icon: "💊" },
    { key: "clinic", label: "Clinic", icon: "🏥" }
  ];

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-logo">
          <img src="/logo.png" alt="HealthChain Logo" style={{ width: 64, height: 64, objectFit: 'contain' }} />
        </div>
        <h1>{c.title}</h1>
        <p>{c.sub}</p>
        <div className="login-features">
          {c.features.map(([i, t]) => (
            <div className="login-feature" key={t}>
              <span>{i}</span>
              <span>{t}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="login-right">
        <div className="login-form-box">
          {mode === "login" && (
            <>
              {step === 1 ? (
                <>
                  <h2>Welcome back</h2>
                  <p>Sign in to your health portal</p>
                  <div className="mb-16">
                    <div className="form-label" style={{ marginBottom: 8 }}>Sign in as</div>
                    <div className="role-picker">
                      {primaryRoles.map(r => (
                        <div
                          key={r.key}
                          className={`role-btn ${role === r.key ? "active" : ""}`}
                          onClick={() => { setRole(r.key); setShowMoreRoles(false); }}
                        >
                          <span className="role-icon">{r.icon}</span>{r.label}
                        </div>
                      ))}
                      <div
                        className={`role-btn ${showMoreRoles || moreRoles.some(r => r.key === role) ? "active" : ""}`}
                        onClick={() => setShowMoreRoles(!showMoreRoles)}
                      >
                        <span className="role-icon">⋯</span>More
                      </div>
                    </div>
                    {showMoreRoles && (
                      <div className="role-picker" style={{ marginTop: 8 }}>
                        {moreRoles.map(r => (
                          <div
                            key={r.key}
                            className={`role-btn ${role === r.key ? "active" : ""}`}
                            onClick={() => setRole(r.key)}
                          >
                            <span className="role-icon">{r.icon}</span>{r.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">{role === "patient" ? "Mobile / Aadhaar Number" : role === "admin" ? "Email" : "Mobile Number"}</label>
                    <input
                      className="form-input"
                      placeholder={role === "admin" ? "admin / admin@abdm.gov.in" : role === "patient" ? "98765 43210 / 1234 5678 9012" : "98765 43210"}
                      maxLength={role === "admin" ? 50 : role === "patient" ? 12 : 10}
                      value={phone}
                      onChange={e => setPhone(role === "admin" ? e.target.value : e.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <label className="form-label">Password</label>
                      <span
                        className="text-xs text-faint"
                        style={{ cursor: "pointer", color: "var(--teal)" }}
                        onClick={() => { setMode("forgot"); setStep(1); }}
                      >
                        Forgot Password?
                      </span>
                    </div>
                    <div style={{ position: "relative" }}>
                      <input
                        className="form-input"
                        type={showLoginPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        style={{ paddingRight: 40 }}
                      />
                      <span
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", cursor: "pointer", fontSize: 16, color: "var(--ink-faint)" }}
                        title={showLoginPassword ? "Hide password" : "Show password"}
                      >
                        {showLoginPassword ? "👁️" : "🙈"}
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn btn-primary w-full"
                    style={{ marginTop: 8 }}
                    onClick={async () => {
                      if (role === "admin") {
                        if (phone === "" || password === "") { alert("Please enter admin credentials."); return; }
                      }
                      if (role === "patient" && (phone.length !== 10 && phone.length !== 12)) { 
                        alert("Please enter a valid 10-digit mobile or 12-digit Aadhaar."); 
                        return; 
                      }
                      if (role !== "patient" && role !== "admin" && phone.length !== 10) { 
                        alert("Please enter a valid 10-digit mobile number."); 
                        return; 
                      }
                      if (!password) { alert("Please enter your password."); return; }
                      try {
                        const res = await authApi.loginWithPassword(phone, password);
                        onLogin(res.role || role);
                      } catch (e) {
                        alert("Login Failed: " + e.message);
                      }
                    }}
                  >
                    Sign In →
                  </button>
                  {role !== "admin" && (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0" }}>
                        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                        <span className="text-xs text-faint">or</span>
                        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                      </div>
                      <button
                        className="btn btn-outline w-full"
                        onClick={() => setMode(role === "patient" ? "rp" : "rv")}
                      >
                        {role === "patient" ? "Create Patient Account" : "Register as Provider"} →
                      </button>
                    </>
                  )}
                </>
              ) : null}
            </>
          )}

          {mode === "forgot" && (
            <>
              {step === 1 ? (
                <>
                  <h2>Reset Password</h2>
                  <p>Enter your mobile number to receive an OTP.</p>
                  <div className="form-group">
                    <label className="form-label">Mobile Number</label>
                    <input
                      className="form-input"
                      placeholder="98765 43210"
                      maxLength={10}
                      value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                  <button
                    className="btn btn-primary w-full"
                    onClick={async () => {
                      if (phone.length !== 10) { alert("Please enter a valid 10-digit mobile number."); return; }
                      try {
                        await authApi.sendOtp(phone);
                        alert("OTP has been sent to your mobile.");
                        setStep(2);
                      } catch (e) {
                        alert("Error sending OTP: " + e.message);
                      }
                    }}
                  >
                    Send OTP →
                  </button>
                  <button className="btn btn-outline w-full" style={{ marginTop: 10 }} onClick={() => setMode("login")}>← Back to Login</button>
                </>
              ) : (
                <>
                  <h2>Set New Password</h2>
                  <p>Enter the OTP sent to {phone} and your new password.</p>
                  <div className="form-group">
                    <label className="form-label">OTP Code</label>
                    <input
                      className="form-input"
                      placeholder="000000"
                      maxLength={6}
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">New Password</label>
                    <div style={{ position: "relative" }}>
                      <input
                        className="form-input"
                        type={showNewPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        style={{ paddingRight: 40 }}
                      />
                      <span
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", cursor: "pointer", fontSize: 16, color: "var(--ink-faint)" }}
                        title={showNewPassword ? "Hide password" : "Show password"}
                      >
                        {showNewPassword ? "👁️" : "🙈"}
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn btn-primary w-full"
                    onClick={async () => {
                      if (otpCode.length !== 6) { alert("Please enter the 6-digit OTP."); return; }
                      if (!newPassword) { alert("Please enter a new password."); return; }
                      try {
                        await authApi.resetPassword(phone, otpCode, newPassword);
                        alert("Password reset successfully. You can now log in.");
                        setMode("login");
                        setStep(1);
                        setPassword("");
                        setOtpCode("");
                        setNewPassword("");
                      } catch (e) {
                        alert("Error resetting password: " + e.message);
                      }
                    }}
                  >
                    Reset Password →
                  </button>
                  <button className="btn btn-outline w-full" style={{ marginTop: 10 }} onClick={() => setStep(1)}>← Back</button>
                </>
              )}
            </>
          )}
          {mode === "rp" && <PatientRegister onDone={() => onLogin("patient")} onBack={() => { setMode("login"); setStep(1); }} />}
          {mode === "rv" && <ProviderRegister initialRole={role} onDone={() => {
            const actualRole = sessionStorage.getItem('user_role') || role;
            onLogin(actualRole);
          }} onBack={() => { setMode("login"); setStep(1); }} />}
        </div>
      </div>
    </div>
  );
}
