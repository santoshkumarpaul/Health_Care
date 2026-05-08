import React, { useState } from "react";
import { LoginView } from "./components/auth/LoginView";
import { PatientDashboard } from "./components/patients/PatientDashboard";
import { DoctorDashboard } from "./components/doctors/DoctorDashboard";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { ChatBot } from "./components/common/ChatBot";
import './index.css';

export default function App() {
  const [authed, setAuthed] = useState(!!sessionStorage.getItem('access_token'));
  const [role, setRole] = useState(sessionStorage.getItem('user_role') || "patient");
  const [activeTab, setActiveTab] = useState("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sync state if sessionStorage changes
  React.useEffect(() => {
    const r = sessionStorage.getItem('user_role');
    const token = sessionStorage.getItem('access_token');
    if (token && r) {
      setAuthed(true);
      setRole(r);
      if (activeTab === "overview" && r !== "patient") {
        setActiveTab(r === "admin" ? "providers" : r === "doctor" ? "patients" : "qrscan");
      }
    }
  }, []);

  function login(r) {
    setRole(r);
    setAuthed(true);
    // Set default tab based on role
    if (r === "patient") {
      setActiveTab("overview");
    } else if (r === "admin") {
      setActiveTab("providers");
    } else if (r === "doctor" || r === "clinic") {
      setActiveTab("patients");
    } else {
      setActiveTab("qrscan");
    }
  }

  function logout() {
    setAuthed(false);
    setRole("patient");
    setActiveTab("overview");
    // Clear ALL auth tokens so the next login gets a fresh session
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    sessionStorage.removeItem('user_role');
    sessionStorage.removeItem('user_phone');
  }

  const NAV = {
    patient: [
      ["👤", "Overview", "overview"],
      ["📋", "Records", "records"],
      ["📝", "Health Log", "log"],
      ["🤖", "AI Insights", "ai"],
      ["📈", "Charts", "charts"],
      ["🤝", "Consents", "consents"],
      ["⏰", "Reminders", "reminders"],
      ["📤", "Upload", "upload"],
      ["📱", "My QR", "qr"]
    ],
    doctor: [
      ["🏠", "Patients", "patients"],
      ["📝", "Register", "register"],
      ["➕", "Add Record", "add"],
      ["📸", "Scan QR", "qrscan"],
      ["🤖", "AI Tools", "aitools"]
    ],
    lab: [
      ["➕", "Add Record", "add"],
      ["📸", "Scan QR", "qrscan"]
    ],
    pharma: [
      ["➕", "Add Record", "add"],
      ["📸", "Scan QR", "qrscan"]
    ],
    clinic: [
      ["🏠", "Patients", "patients"],
      ["📝", "Register", "register"],
      ["➕", "Add Record", "add"],
      ["📸", "Scan QR", "qrscan"]
    ],
    admin: [
      ["⚙️", "Providers", "providers"],
      ["👥", "Patients", "patients"],
      ["⛓️", "Audit Log", "audit"],
      ["📊", "Analytics", "analytics"]
    ],
  };

  return (
    <>
      {!authed ? (
        <LoginView onLogin={login} />
      ) : (
        <div className="app-shell">
          <div className={`sidebar-overlay ${mobileMenuOpen ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}></div>
          <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <div className="sidebar-brand">
              <img src="/logo.png" alt="HealthChain Logo" style={{ width: 40, height: 40, objectFit: 'contain' }} />
              <h1>HealthChain</h1>
              <p>ABDM · EHR System</p>
            </div>

            <nav className="sidebar-nav">
              <div className="nav-label">
                {role === "patient" ? "Patient" : role === "admin" ? "Administration" : "Provider"}
              </div>

              {(NAV[role] || NAV.patient).map(([icon, label, tabKey]) => (
                <button
                  key={label}
                  className={`nav-item ${activeTab === tabKey ? "active" : ""}`}
                  onClick={() => { setActiveTab(tabKey); setMobileMenuOpen(false); }}
                >
                  <span className="icon">{icon}</span>{label}
                </button>
              ))}
            </nav>

            <div className="sidebar-footer">
              <button className="nav-item" onClick={logout}>
                <span className="icon">🚪</span>Sign Out
              </button>
            </div>
          </aside>

          <main className="main-content">
            {role === "patient" && (
              <PatientDashboard tab={activeTab} setTab={setActiveTab} toggleSidebar={() => setMobileMenuOpen(true)} />
            )}
            {['doctor', 'lab', 'pharma', 'clinic'].includes(role) && (
              <DoctorDashboard tab={activeTab} setTab={setActiveTab} role={role} toggleSidebar={() => setMobileMenuOpen(true)} />
            )}
            {role === "admin" && (
              <AdminDashboard tab={activeTab} setTab={setActiveTab} toggleSidebar={() => setMobileMenuOpen(true)} />
            )}
          </main>
        </div>
      )}
      <ChatBot />
    </>
  );
}
