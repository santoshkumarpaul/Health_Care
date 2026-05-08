import React, { useState, useEffect } from "react";
import { Html5QrcodeScanner, Html5Qrcode } from "html5-qrcode";
import { doctorApi, recordsApi, specialApi, consentsApi } from "../../api";
import { StatCard } from "../common/StatCard";
import { TabBar } from "../common/TabBar";
import { RecordTypeBadge } from "../common/RecordTypeBadge";
import { AISummaryPanel } from "./AISummaryPanel";
import { RiskPrediction } from "./RiskPrediction";

function QRScanner({ onScan, onClose }) {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 200, height: 200 }, videoConstraints: { facingMode: "environment", width: { ideal: 400 }, height: { ideal: 400 } } }, false);

    const onScanSuccess = (decodedText) => {
      scanner.clear().then(() => {
        onScan(decodedText);
      }).catch(err => console.error(err));
    };

    scanner.render(onScanSuccess, (error) => {
      // console.warn(error);
    });

    return () => {
      scanner.clear().catch(err => console.error("Failed to clear scanner", err));
    };
  }, [onScan]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // We use a separate element for file scanning to avoid conflicts with the live "reader" scanner
    const fileScanEl = document.createElement("div");
    fileScanEl.id = "file-scan-temp";
    fileScanEl.style.display = "none";
    document.body.appendChild(fileScanEl);

    const html5QrCode = new Html5Qrcode("file-scan-temp");
    try {
      const decodedText = await html5QrCode.scanFile(file, true);
      onScan(decodedText);
    } catch (err) {
      alert("No QR code found in this image. Please ensure the QR code is clearly visible.");
    } finally {
      html5QrCode.clear();
      document.body.removeChild(fileScanEl);
    }
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.85)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "white", padding: "24px", borderRadius: "16px", maxWidth: "420px", width: "100%", boxShadow: "0 20px 50px rgba(0,0,0,0.3)", maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 22 }}>Scan Patient QR</h3>
          <button onClick={onClose} style={{ border: "none", background: "var(--surface)", width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>
        <style>{`
          #reader { border-radius: 12px; overflow: hidden; border: none !important; }
          #reader video { width: 100% !important; height: auto !important; max-height: 350px !important; object-fit: cover !important; }
          #reader img { display: none !important; }
          #reader__scan_region { max-height: 350px; overflow: hidden; }
          #reader__dashboard { margin-top: 10px; }
          #reader__dashboard button { background: var(--teal) !important; color: white !important; border: none !important; padding: 8px 16px !important; border-radius: 8px !important; cursor: pointer !important; font-size: 13px !important; }
          /* Hide the library's default stop button to avoid duplication */
          #reader__dashboard_section_csr button:nth-child(2), 
          #html5-qrcode-button-camera-stop { display: none !important; }
          #reader__header_message { font-size: 12px !important; color: #666 !important; }
        `}</style>
        <div id="reader"></div>
        <p style={{ marginTop: "16px", fontSize: "13px", color: "var(--ink-faint)", textAlign: "center" }}>Position the QR code within the frame to scan.</p>

        <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px dashed var(--border)", textAlign: "center" }}>
          <p style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 12 }}>Camera not working?</p>
          <label className="btn btn-outline w-full" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", gap: 8 }}>
            📂 Upload QR Image
            <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: "none" }} />
          </label>
        </div>

        <button onClick={onClose} className="btn btn-outline w-full" style={{ marginTop: 12, color: "var(--rose)" }}>Cancel</button>
      </div>
    </div>
  );
}

export function DoctorDashboard({ tab, setTab, role = "doctor", toggleSidebar }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [scannedPatient, setScannedPatient] = useState(null);
  const [ptab, setPtab] = useState("records");
  const [doctorData, setDoctorData] = useState(null);
  const [patientsList, setPatientsList] = useState([]);
  const [recordForm, setRecordForm] = useState({ aadhaar: "", type: "Consultation", date: new Date().toISOString().split('T')[0], complaint: "" });
  const [recordFile, setRecordFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [scannedPatientRecords, setScannedPatientRecords] = useState([]);
  const [registerForm, setRegisterForm] = useState({ phone: "", name: "", aadhaar: "" });
  const [advancedAIData, setAdvancedAIData] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const doc = await doctorApi.getMe();
        if (doc) setDoctorData(doc);
        const pts = await doctorApi.getPatients();
        if (pts) setPatientsList(pts);
      } catch (e) {
        console.error("Failed to load doctor data", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    async function fetchPatientRecords() {
      if (selected && ptab === "records") {
        try {
          const recs = await recordsApi.getAll({ patient: selected.id });
          setSelectedRecords(Array.isArray(recs) ? recs : (recs?.results || []));
        } catch (e) {
          console.error("Failed to fetch patient records", e);
          setSelectedRecords([]);
        }
      }
    }
    fetchPatientRecords();
  }, [selected, ptab]);

  useEffect(() => {
    async function fetchScannedRecords() {
      if (scannedPatient) {
        try {
          const recs = await recordsApi.getAll({ patient: scannedPatient.id });
          setScannedPatientRecords(Array.isArray(recs) ? recs : (recs?.results || []));
        } catch (e) {
          setScannedPatientRecords([]);
        }
      } else {
        setScannedPatientRecords([]);
      }
    }
    fetchScannedRecords();
  }, [scannedPatient]);

  useEffect(() => {
    async function loadAdvancedAI() {
      if (tab === "aitools") {
        try {
          const data = await specialApi.getAdvancedAI();
          setAdvancedAIData(data);
        } catch (e) {
          console.error("Failed to load advanced AI data", e);
        }
      }
    }
    loadAdvancedAI();
  }, [tab]);

  const handleSaveRecord = async () => {
    try {
      if (!recordForm.aadhaar) return alert("Patient Aadhaar ID is required");
      if (!recordForm.complaint && !recordFile) return alert("Please enter a title or upload a document.");

      const formData = new FormData();
      formData.append('patient_aadhaar', recordForm.aadhaar);
      formData.append('record_type', recordForm.type);
      formData.append('date', recordForm.date);
      formData.append('title', recordForm.complaint || recordForm.type);
      if (recordFile) formData.append('file', recordFile);
      if (role === 'lab') {
        formData.append('is_abnormal', recordForm.is_abnormal || false);
        formData.append('is_urgent', recordForm.is_urgent || false);
      }

      await recordsApi.create(formData);
      alert("Record successfully saved and secured in the audit trail!");
      setRecordForm({ aadhaar: "", type: "Consultation", date: new Date().toISOString().split('T')[0], complaint: "", is_abnormal: false, is_urgent: false });
      setRecordFile(null);
    } catch (e) {
      if (e.message.includes("CONSENT_REQUESTED")) {
        alert("📩 Consent Request Sent!\n\nA consent request has been automatically sent to the patient. They will see it in their Consents section.\n\nOnce the patient approves, you can upload records for them.");
      } else if (e.message.includes("403") || e.message.toLowerCase().includes("permission") || e.message.toLowerCase().includes("consent")) {
        alert("⏳ Consent Pending\n\nA consent request is already pending for this patient. Please wait for their approval.");
      } else {
        alert("Error saving record: " + e.message);
      }
    }
  };

  const filtered = patientsList.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || p.aadhaar_number?.includes(search));

  const handleQRScan = async (decodedText) => {
    setShowScanner(false);
    try {
      const res = await specialApi.lookupByQR(decodedText);

      // Automatically request consent
      try {
        await doctorApi.registerPatient({ phone_number: res.phone || "", name: res.name });
        alert(`Patient ${res.name} scanned successfully! A consent request has been sent.`);
      } catch (err) {
        console.error("Auto-consent error", err);
        // It might be already pending/active, which is fine
        alert(`Patient ${res.name} found. Ensure they have accepted the consent request.`);
      }

      setScannedPatient(res);

      // Refresh patient list
      try {
        const pts = await doctorApi.getPatients();
        setPatientsList(pts);
      } catch (e) { }

    } catch (e) {
      alert("Patient not found for this QR code.");
    }
  };

  const handleRegisterPatient = async () => {
    if (!registerForm.phone || !registerForm.name || !registerForm.aadhaar) {
      return alert("Phone number, Aadhaar and Name are required.");
    }
    if (registerForm.phone.length < 10) {
      return alert("Please enter a valid phone number.");
    }
    if (registerForm.aadhaar.length !== 12) {
      return alert("Please enter a valid 12-digit Aadhaar number.");
    }
    try {
      setLoading(true);
      await doctorApi.registerPatient({ 
        phone_number: registerForm.phone, 
        name: registerForm.name,
        aadhaar_number: registerForm.aadhaar 
      });
      alert("Patient linked successfully! A consent request has been sent to the patient.");
      setRegisterForm({ phone: "", name: "", aadhaar: "" });
      const pts = await doctorApi.getPatients();
      setPatientsList(pts);
      setTab("patients");
    } catch (e) {
      console.error("Full Error Object:", e);
      alert("Error linking patient: " + (e.details || e.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showScanner && <QRScanner onScan={handleQRScan} onClose={() => setShowScanner(false)} />}
      <div className="topbar">
        <div className="topbar-left">
          <button className="mobile-menu-btn" onClick={toggleSidebar}>☰</button>
          <div style={{ fontSize: 18 }}>{role === "lab" ? "🔬" : role === "pharma" ? "💊" : role === "clinic" ? "🏥" : "🩺"}</div>
          <h2>{role === "pharma" ? "Pharmacy" : role === "clinic" ? "Clinic" : role === "lab" ? "Lab" : "Doctor"} Dashboard</h2>
        </div>
        <div className="topbar-right">
          <div className="topbar-user">
            <strong>{doctorData ? doctorData.name : (role === "lab" ? "Lab" : role === "pharma" ? "Pharmacy" : role === "clinic" ? "Clinic" : "Doctor")}</strong>
            <span>{doctorData ? [doctorData.facility, doctorData.specialty].filter(Boolean).join(' · ') || role.charAt(0).toUpperCase() + role.slice(1) : "Healthcare Provider"}</span>
          </div>
          <div className="avatar" style={{ background: "var(--amber-lt)", color: "var(--amber)" }}>
            {doctorData ? doctorData.name.split(' ').map(n => n[0]).join('') : "AN"}
          </div>
        </div>
      </div>
      <div className="page">
        <div className="page-header">
          <h3>{role === "pharma" ? "Pharmacy" : role === "clinic" ? "Clinic" : role === "lab" ? "Lab" : "Doctor"} Dashboard</h3>
          <p>{role === "doctor" ? "Manage patients, add records, run AI summaries and disease risk predictions" : role === "lab" ? "Upload lab reports and manage patient test results" : role === "pharma" ? "Dispense prescriptions and upload records" : "Manage clinic records and patient data"}</p>
        </div>
        <div className={role === "doctor" || role === "clinic" ? "grid-4 mb-24" : "grid-2 mb-24"}>
          {role === "doctor" ? (
            <>
              <StatCard icon="👥" label="My Patients" value={patientsList.length} sub="Authorised access" accentClass="accent-teal" delay="fade-up-1" />
              <StatCard icon="📋" label="Records Today" value="8" sub="Viewed or uploaded" accentClass="accent-amber" delay="fade-up-2" />
              <StatCard icon="⏳" label="Pending Consents" value="3" sub="Awaiting patient reply" accentClass="accent-rose" delay="fade-up-3" />
              <StatCard icon="🔬" label="High Risk Patients" value={patientsList.filter(p => (p.bmi > 30 || p.glucose > 130)).length} sub="Flagged by AI model" accentClass="accent-purple" delay="fade-up-4" />
            </>
          ) : role === "clinic" ? (
            <>
              <StatCard icon="👥" label="Registered Patients" value={patientsList.length} sub="Linked to clinic" accentClass="accent-teal" delay="fade-up-1" />
              <StatCard icon="📋" label="Records Added" value="12" sub="This month" accentClass="accent-amber" delay="fade-up-2" />
              <StatCard icon="⏳" label="Pending Consents" value="3" sub="Awaiting approval" accentClass="accent-rose" delay="fade-up-3" />
              <StatCard icon="📅" label="Appointments" value="5" sub="Scheduled today" accentClass="accent-indigo" delay="fade-up-4" />
            </>
          ) : (
            <>
              <StatCard icon={role === "lab" ? "🧪" : "💊"} label="Records Added" value="12" sub="This month" accentClass="accent-teal" delay="fade-up-1" />
              <StatCard icon="📸" label="QR Scans" value="5" sub="Patients looked up" accentClass="accent-amber" delay="fade-up-2" />
            </>
          )}
        </div>

        <TabBar
          tabs={
            role === "doctor" ? [
              ["patients", "Patients"],
              ["register", "Link Patient"],
              ["add", "Add Record"],
              ["qrscan", "Scan QR"],
              ["aitools", "AI Tools"]
            ] : role === "clinic" ? [
              ["patients", "Patients"],
              ["register", "Register Patient"],
              ["add", "Add Record"],
              ["qrscan", "Scan QR"]
            ] : [
              ["add", "Add Record"],
              ["qrscan", "Scan QR"]
            ]
          }
          active={tab}
          onChange={setTab}
        />

        {tab === "register" && (
          <div className="card fade-up" style={{ maxWidth: 540 }}>
            <div className="section-title mb-20">🔗 Link Patient</div>
            <p className="text-sm text-faint mb-20">Search and link an already registered patient to your dashboard to view their records. This will request consent to access their health history.</p>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input className="form-input" placeholder="e.g. 9876543210" value={registerForm.phone} onChange={e => setRegisterForm({ ...registerForm, phone: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Aadhaar Number</label>
              <input className="form-input" placeholder="e.g. 123412341234" maxLength={12} value={registerForm.aadhaar} onChange={e => setRegisterForm({ ...registerForm, aadhaar: e.target.value.replace(/\D/g, "") })} />
            </div>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" placeholder="e.g. Priya Sharma" value={registerForm.name} onChange={e => setRegisterForm({ ...registerForm, name: e.target.value })} />
            </div>
            <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleRegisterPatient} disabled={loading}>
              {loading ? <span className="spin">⟳</span> : "Link Patient & Request Consent"}
            </button>
          </div>
        )}

        {tab === "patients" && (
          <div className="grid-auto gap-20">
            <div>
              <div className="card fade-up">
                <div className="section-title mb-16">🔍 Patient Search</div>
                <div className="search-bar mb-16"><span className="search-icon">🔍</span><input className="form-input" placeholder="Name or Aadhaar ID…" value={search} onChange={e => setSearch(e.target.value)} /></div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Patient</th><th>Aadhaar</th><th>Age</th><th>BMI</th><th>Risk</th><th></th></tr>
                    </thead>
                    <tbody>
                      {filtered.map(p => {
                        const risk = p.bmi > 30 || p.glucose > 130 ? "High" : p.bmi > 25 || p.glucose > 100 ? "Medium" : "Low";
                        return (
                          <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => { setSelected(p); setPtab("records"); }}>
                            <td><div className="flex items-center gap-8"><div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{p.name[0]}{p.name.split(" ")[1][0]}</div><span className="font-600">{p.name}</span></div></td>
                            <td className="font-mono text-xs text-faint">{p.aadhaar_number}</td>
                            <td className="text-sm">{p.age}{p.gender}</td>
                            <td className="font-mono text-sm">{p.bmi}</td>
                            <td><span className={`badge ${risk === "High" ? "badge-rose" : risk === "Medium" ? "badge-amber" : "badge-teal"}`}>{risk}</span></td>
                            <td><button className="btn btn-outline btn-sm">View →</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div>
              {selected ? (
                <div className="card fade-up">
                  <div className="flex items-center gap-12 mb-16">
                    <div className="avatar" style={{ width: 44, height: 44, fontSize: 16 }}>{selected.name[0]}{selected.name.split(" ")[1][0]}</div>
                    <div>
                      <div className="font-600" style={{ fontSize: 16 }}>{selected.name}</div>
                      <div className="text-xs text-faint font-mono">{selected.aadhaar_number}</div>
                    </div>
                    <span className="badge badge-teal" style={{ marginLeft: "auto" }}>✓ Access</span>
                  </div>
                  <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
                    {[["records", "Records"], ["vitals", "Vitals"], ["rx", "Rx"], ["ai", "AI"]]
                      .filter(([k]) => k !== "ai" || role === "doctor")
                      .map(([k, l]) => (
                        <button key={k} className={`tab-btn ${ptab === k ? "active" : ""}`} style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setPtab(k)}>{l}</button>
                      ))}
                  </div>
                  {ptab === "records" && (
                    <div className="timeline">
                      {selectedRecords.map((r, i) => (
                        <div className="timeline-item" key={i}>
                          <div className="timeline-dot" />
                          <div className="timeline-date">{r.date}</div>
                          <div className="flex items-center gap-8 mb-4 flex-wrap">
                            <RecordTypeBadge type={r.record_type || r.type} />
                            {r.is_abnormal && <span className="badge badge-rose" style={{ fontSize: 9 }}>⚠️ ABNORMAL</span>}
                            {r.is_urgent && <span className="badge badge-amber" style={{ fontSize: 9 }}>⚡ URGENT</span>}
                            <span className="timeline-title">{r.title}</span>
                          </div>
                          <div className="text-sm text-faint">{r.doctor_name || r.provider}</div>
                          <div style={{ marginTop: 8 }}><span className="tx-hash">{r.tx_hash || r.tx}</span></div>
                        </div>
                      ))}
                      {selectedRecords.length === 0 && <div className="text-sm text-faint" style={{ padding: "10px 0" }}>No matching records found in system.</div>}
                    </div>
                  )}
                  {ptab === "vitals" && [
                    ["Blood Pressure", selected.bp || "N/A", "mmHg"],
                    ["BMI", selected.bmi || "N/A", "kg/m²"],
                    ["Blood Glucose", selected.glucose || "N/A", "mg/dL"],
                    ["Weight", selected.weight || "N/A", "kg"]
                  ].map(([l, v, u]) => (
                    <div className="vital-row" key={l}><span className="vital-label">{l}</span><span><span className="vital-value">{v}</span> <span className="vital-unit">{u}</span></span></div>
                  ))}
                  {ptab === "rx" && (
                    <div style={{ padding: "12px 0", color: "var(--ink-faint)", textAlign: "center" }}>
                      <div style={{ fontSize: 24, marginBottom: 8 }}>💊</div>
                      <div className="text-sm">No active prescriptions found for this patient.</div>
                    </div>
                  )}
                  {ptab === "ai" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <AISummaryPanel patient={selected} />
                      <RiskPrediction patient={selected} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="card fade-up" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 260, textAlign: "center", color: "var(--ink-faint)" }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Select a Patient</div>
                  <div className="text-sm">Click a patient row to view their authorised records and AI insights.</div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "add" && (
          <div className="card fade-up" style={{ maxWidth: 540 }}>
            <div className="section-title mb-20">
              {role === "lab" ? "🧪 Upload Lab Report" : role === "pharma" ? "💊 Add Prescription / Dispensation" : role === "clinic" ? "🏥 Add Clinic Record" : "➕ Add Visit / Record"}
            </div>
            <div className="form-group"><label className="form-label">Patient Aadhaar ID</label><input className="form-input" placeholder="XXXX-XXXX-XXXX" style={{ fontFamily: "var(--font-mono)", letterSpacing: 2 }} value={recordForm.aadhaar} onChange={e => setRecordForm({ ...recordForm, aadhaar: e.target.value })} /></div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{role === "lab" ? "Report Type" : role === "pharma" ? "Record Type" : "Visit Type"}</label>
                <select className="form-select" value={recordForm.type} onChange={e => setRecordForm({ ...recordForm, type: e.target.value })}>
                  {role === "lab" ? (
                    <>
                      <option>Lab Report</option>
                      <option>Blood Work (Complete)</option>
                      <option>Biochemistry</option>
                      <option>Hematology</option>
                      <option>Immunology / Serology</option>
                      <option>Microbiology / Culture</option>
                      <option>Pathology / Histology</option>
                      <option>Urine Analysis</option>
                      <option>Imaging / X-Ray</option>
                      <option>Ultrasound (USG)</option>
                      <option>CT Scan / MRI</option>
                      <option>ECG / Cardiology</option>
                    </>
                  ) : role === "pharma" ? (
                    <><option>Prescription</option><option>Dispensation</option><option>Refill</option><option>OTC Sale</option></>
                  ) : role === "clinic" ? (
                    <><option>Consultation</option><option>Follow-up</option><option>Procedure</option><option>Emergency</option><option>Vaccination</option></>
                  ) : (
                    <><option>Consultation</option><option>Follow-up</option><option>Emergency</option><option>Discharge Summary</option></>
                  )}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input className="form-input" type="date" value={recordForm.date} onChange={e => setRecordForm({ ...recordForm, date: e.target.value })} />
              </div>
            </div>
            <div className="form-group"><label className="form-label">{role === "lab" ? "Test Name / Panel" : role === "pharma" ? "Drug Name" : role === "clinic" ? "Visit Title" : "Chief Complaint"}</label><input className="form-input" placeholder={role === "lab" ? "e.g. CBC, Lipid Profile, HbA1c" : role === "pharma" ? "e.g. Metformin 500mg, Amoxicillin" : "e.g. General Checkup"} value={recordForm.complaint} onChange={e => setRecordForm({ ...recordForm, complaint: e.target.value })} /></div>
            
            {role === "lab" && (
              <div className="form-row" style={{ marginTop: 14, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" id="abnormal" checked={recordForm.is_abnormal || false} onChange={e => setRecordForm({ ...recordForm, is_abnormal: e.target.checked })} />
                  <label htmlFor="abnormal" style={{ fontSize: 13, fontWeight: 600, color: 'var(--rose)' }}>⚠️ Abnormal Result</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" id="urgent" checked={recordForm.is_urgent || false} onChange={e => setRecordForm({ ...recordForm, is_urgent: e.target.checked })} />
                  <label htmlFor="urgent" style={{ fontSize: 13, fontWeight: 600, color: 'var(--amber)' }}>⚡ Urgent Processing</label>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">📄 Upload Report / Document</label>
              <div
                style={{
                  border: recordFile ? '2px solid var(--teal)' : '2px dashed var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '28px 20px',
                  textAlign: 'center',
                  background: recordFile ? 'var(--teal-lt)' : 'var(--surface)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => document.getElementById('record-file-input').click()}
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--teal)'; }}
                onDragLeave={e => { e.currentTarget.style.borderColor = recordFile ? 'var(--teal)' : 'var(--border)'; }}
                onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--teal)'; if (e.dataTransfer.files[0]) setRecordFile(e.dataTransfer.files[0]); }}
              >
                <input
                  id="record-file-input"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx"
                  style={{ display: 'none' }}
                  onChange={e => { if (e.target.files[0]) setRecordFile(e.target.files[0]); }}
                />
                {recordFile ? (
                  <>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>✅</div>
                    <div className="font-600" style={{ color: 'var(--teal)' }}>{recordFile.name}</div>
                    <div className="text-xs text-faint" style={{ marginTop: 4 }}>{(recordFile.size / 1024).toFixed(1)} KB · Click to change</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>📁</div>
                    <div className="font-600">Click or drag file to upload</div>
                    <div className="text-xs text-faint" style={{ marginTop: 4 }}>PDF, Images, Word, Excel · Max 10MB</div>
                  </>
                )}
              </div>
            </div>

            <div className="alert alert-success">✅ Record will be secured in the Secure Audit Trail. Patient will be notified.</div>
            <button className="btn btn-primary w-full" onClick={handleSaveRecord}>Upload & Save Record →</button>
          </div>
        )}

        {tab === "qrscan" && (
          <div className="card fade-up" style={{ maxWidth: 500 }}>
            <div className="section-title mb-16">📸 Scan Patient QR Code</div>
            <p className="text-sm text-faint mb-20">Scan the patient's secure Aadhaar QR code to automatically retrieve demographics and request record access.</p>
            <div style={{ border: "2px dashed var(--border)", borderRadius: "var(--radius)", padding: "36px", textAlign: "center", background: "var(--surface)", marginBottom: 20 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📷</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Live QR Scanner</div>
              <div className="text-sm text-faint mb-20">Click the button below to activate your device's camera.</div>
              <button className="btn btn-primary" onClick={() => setShowScanner(true)}>Open Camera Scanner</button>
            </div>
            <div className="section-title mb-12" style={{ fontSize: 13 }}>Or enter manually</div>
            <div className="flex gap-8">
              <input className="form-input" id="qr-lookup-input" placeholder="Patient ID or Aadhaar ID" style={{ flex: 1 }} />
              <button className="btn btn-primary" onClick={async () => {
                const val = document.getElementById('qr-lookup-input').value;
                if (!val) return;
                try {
                  const res = await specialApi.lookupByQR(val);
                  setScannedPatient(res);
                } catch (e) { alert("Patient not found in system."); }
              }}>Look Up</button>
            </div>
          </div>
        )}

        {tab === "aitools" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="alert alert-info">🤖 Select a patient from the Patients tab to run AI analysis. Below shows aggregate stats for your patient list.</div>

            <div className="section-title mt-10 mb-0">Population Health Analytics</div>
            <div className="grid-3">
              <div className="card fade-up">
                <div className="card-title">High Risk Patients</div>
                <div className="card-value" style={{ color: "var(--rose)" }}>{patientsList.filter(p => (p.bmi > 30 || p.glucose > 130)).length}</div>
                <div className="card-sub">BMI &gt;30 or Glucose &gt;130</div>
              </div>
              <div className="card fade-up fade-up-1">
                <div className="card-title">Avg Patient BMI</div>
                <div className="card-value" style={{ color: "var(--amber)" }}>
                  {patientsList.length > 0 ? (patientsList.reduce((acc, p) => acc + (p.bmi || 24), 0) / patientsList.length).toFixed(1) : 0}
                </div>
                <div className="card-sub">Overweight range (normal: 18.5–24.9)</div>
              </div>
              <div className="card fade-up fade-up-2">
                <div className="card-title">Avg Glucose</div>
                <div className="card-value" style={{ color: "var(--indigo)" }}>
                  {patientsList.length > 0 ? (patientsList.reduce((acc, p) => acc + (p.glucose || 90), 0) / patientsList.length).toFixed(0) : 0}
                </div>
                <div className="card-sub">mg/dL · Pre-diabetic threshold: 100</div>
              </div>
            </div>

            <div className="section-title mt-10 mb-0">Advanced AI Capabilities</div>
            <div className="grid-2">
              <div className="card fade-up fade-up-3" style={{ borderLeft: "4px solid var(--teal)" }}>
                <div className="flex items-center gap-12 mb-12">
                  <div className="avatar" style={{ background: "var(--teal-lt)", color: "var(--teal)" }}>📈</div>
                  <div className="font-600">Predictive Clinical Alerts</div>
                </div>
                <p className="text-sm text-faint mb-12">AI continuously monitors vital trends to predict impending chronic conditions.</p>
                <div className="text-sm font-600 mb-8">Active Insights:</div>
                <ul className="text-sm" style={{ paddingLeft: 20, color: "var(--ink-soft)" }}>
                  {advancedAIData?.predictive_alerts?.active_insights?.map((alert, idx) => (
                    <li key={idx}><strong>{alert}</strong></li>
                  )) || (
                    <>
                      <li><strong>2 patients</strong> showing early signs of impending hypertension.</li>
                      <li><strong>1 patient</strong> exhibits rapid BMI increase over 3 months.</li>
                    </>
                  )}
                </ul>
                <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }}>Review Flagged Patients</button>
              </div>

              <div className="card fade-up fade-up-4" style={{ borderLeft: "4px solid var(--amber)" }}>
                <div className="flex items-center gap-12 mb-12">
                  <div className="avatar" style={{ background: "var(--amber-lt)", color: "var(--amber)" }}>💊</div>
                  <div className="font-600">Treatment Adherence Analyzer</div>
                </div>
                <p className="text-sm text-faint mb-12">Analyzes pharmacy logs and self-reported data to predict medication adherence.</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <div style={{ flex: 1, height: 8, background: "var(--surface-lt)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${advancedAIData?.treatment_adherence?.score || 72}%`, height: "100%", background: "var(--amber)" }}></div>
                  </div>
                  <div className="text-sm font-600">{advancedAIData?.treatment_adherence?.score || 72}%</div>
                </div>
                <p className="text-xs text-faint">{advancedAIData?.treatment_adherence?.status || "Overall"} clinic adherence rate.</p>
                <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }}>Send Automated Reminders</button>
              </div>

              <div className="card fade-up fade-up-5" style={{ gridColumn: "1 / -1", borderLeft: "4px solid var(--purple)" }}>
                <div className="flex items-center gap-12 mb-12">
                  <div className="avatar" style={{ background: "var(--purple-lt)", color: "var(--purple)" }}>📝</div>
                  <div className="font-600">Automated SOAP Notes Assistant</div>
                </div>
                <p className="text-sm text-faint mb-16">Use Voice-to-Text during consultations. AI will automatically structure your conversation into clinical SOAP notes.</p>
                <div style={{ background: "var(--surface)", padding: 16, borderRadius: "var(--radius)", display: "flex", gap: 12, alignItems: "center" }}>
                  <button className="btn btn-primary" style={{ borderRadius: '50%', width: 44, height: 44, padding: 0 }}>🎤</button>
                  <div className="text-sm text-faint italic">"Patient presents with a 3-day history of persistent cough and mild fever..."</div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {scannedPatient && (
        <div className="modal-backdrop" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setScannedPatient(null)}>
          <div className="card fade-up" style={{ width: "100%", maxWidth: 500, margin: "0 20px", padding: 24, position: "relative", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <button className="btn btn-outline btn-sm" style={{ position: "absolute", top: 12, right: 12, borderRadius: "50%", width: 32, height: 32, padding: 0 }} onClick={() => setScannedPatient(null)}>✕</button>
            <div style={{ fontSize: 48, textAlign: "center", marginBottom: 12 }}>👤</div>
            <div className="font-600 text-center" style={{ fontSize: 20, color: "var(--teal)", marginBottom: 4 }}>{scannedPatient.name}</div>
            <div className="text-sm font-mono text-faint text-center mb-16">{scannedPatient.aadhaar_number}</div>
            
            <div style={{ background: "var(--surface)", padding: 16, borderRadius: "var(--radius)", marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span className="text-faint text-sm">Age</span>
                <span className="font-600">{scannedPatient.age}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span className="text-faint text-sm">Gender</span>
                <span className="font-600">{scannedPatient.gender === "F" ? "Female" : "Male"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="text-faint text-sm">Mobile</span>
                <span className="font-600">{scannedPatient.phone || "N/A"}</span>
              </div>
            </div>

            <div className="section-title mb-16" style={{ fontSize: 15, borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>🕒 Recent Activity</div>
            <div className="timeline" style={{ marginBottom: 24, marginTop: 8, maxHeight: 250, overflowY: "auto", paddingRight: 8 }}>
              {scannedPatientRecords.length > 0 ? scannedPatientRecords.map((r, i) => (
                <div className="timeline-item" key={i}>
                  <div className="timeline-dot" />
                  <div className="timeline-date">{r.date}</div>
                  <div className="flex items-center gap-8 mb-4">
                    <RecordTypeBadge type={r.record_type || r.type} />
                    <span className="timeline-title">{r.title}</span>
                  </div>
                  <div className="text-sm text-faint">{r.doctor_name || r.provider}</div>
                </div>
              )) : (
                <div className="text-sm text-faint" style={{ padding: "10px 0" }}>No recent activity available. Patient may not have records or consent is required.</div>
              )}
            </div>

            <button
              className="btn btn-primary w-full"
              onClick={async () => {
                try {
                  await consentsApi.create(scannedPatient.id, "Full Records");
                  alert("Consent request sent to patient.");
                  setScannedPatient(null);
                } catch (e) { alert("Error requesting consent: " + e.message); }
              }}
            >
              Request Access Consent →
            </button>
          </div>
        </div>
      )}

    </>
  );
}
