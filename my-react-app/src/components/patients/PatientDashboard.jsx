import React, { useState, useEffect } from "react";
import { patientApi, recordsApi, consentsApi, vitalsApi, specialApi } from "../../api";
import { TabBar } from "../common/TabBar";
import { StatCard } from "../common/StatCard";
import { RecordTypeBadge } from "../common/RecordTypeBadge";
import { QRDisplay } from "../common/QRDisplay";
import { AISummaryPanel } from "../doctors/AISummaryPanel";
import { RiskPrediction } from "../doctors/RiskPrediction";
import { HealthLogPanel } from "./HealthLogPanel";
import { HealthCharts } from "./HealthCharts";
import { RemindersPanel } from "./RemindersPanel";
import { UploadReportPanel } from "./UploadReportPanel";

// Patient Dashboard - Handles patient-specific views and data
export function PatientDashboard({ tab, setTab, toggleSidebar }) {
  const [consents, setConsents] = useState([]);
  const [vitalsHistory, setVitalsHistory] = useState([]);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [patientData, setPatientData] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recordSearch, setRecordSearch] = useState("");
  const [qrImage, setQrImage] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);

  const getInsightMessage = () => {
    if (!vitalsHistory || vitalsHistory.length === 0) return "Your health records are up to date";
    
    const latest = vitalsHistory[0];
    const prev = vitalsHistory[1];
    
    let insights = [];
    
    // Glucose check (Normal: 70-140 mg/dL)
    if (latest.glucose > 140) {
      insights.push(<span key="glu" style={{ color: "var(--amber)" }}>⚠ High Glucose ({latest.glucose})</span>);
    } else if (prev && latest.glucose > prev.glucose + 10) {
      insights.push(<span key="glu" style={{ color: "var(--amber)" }}>⚠ Glucose trending up</span>);
    }
    
    // BP check (Normal: <140/90 mmHg)
    if (latest.systolic > 140 || latest.diastolic > 90) {
      insights.push(<span key="bp" style={{ color: "var(--amber)" }}>⚠ High Blood Pressure</span>);
    } else if (prev && (latest.systolic > prev.systolic + 10)) {
      insights.push(<span key="bp" style={{ color: "var(--amber)" }}>⚠ BP trending up</span>);
    }
    
    if (insights.length === 0) {
      return "Your health records are up to date · Everything looks stable";
    }
    
    return (
      <>
        Your health records are up to date · {insights.map((ins, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && " · "}
            {ins}
          </React.Fragment>
        ))}
        {insights.length > 0 && " — check AI Insights"}
      </>
    );
  };

  const downloadCard = () => {
    if (!qrImage) {
      alert("QR code is not loaded yet.");
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 640;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(0, 0, 400, 640, 24); // border radius
    ctx.fill();

    // Border
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.stroke();

    // "HEALTH ID" text
    ctx.fillStyle = '#0f766e'; // teal-700
    ctx.font = 'bold 20px "Inter", sans-serif';
    ctx.fillText('HEALTH ID', 40, 60);

    // Teal dot
    ctx.beginPath();
    ctx.arc(360, 54, 8, 0, 2 * Math.PI);
    ctx.fill();

    // Divider line
    ctx.strokeStyle = '#e5e7eb';
    ctx.beginPath();
    ctx.moveTo(40, 90);
    ctx.lineTo(360, 90);
    ctx.stroke();

    // Load QR Image and draw the rest
    const img = new Image();
    img.onload = () => {
      // Draw QR code (center it)
      ctx.drawImage(img, 50, 120, 300, 300);

      // AADHAAR NUMBER Label
      ctx.fillStyle = '#9ca3af'; // gray-400
      ctx.font = '600 14px "Inter", sans-serif';
      ctx.fillText('AADHAAR NUMBER', 40, 470);

      // AADHAAR NUMBER Value
      ctx.fillStyle = '#374151'; // gray-700
      ctx.font = 'bold 22px "Inter", sans-serif';
      ctx.fillText(patientData?.aadhaar_number || "XXXX-XXXX-0001", 40, 500);

      // FULL NAME Value
      ctx.fillStyle = '#374151';
      ctx.font = 'bold 22px "Inter", sans-serif';
      ctx.fillText(patientData?.name || "Priya Sharma", 40, 590);

      // EMERGENCY CONTACT (if exists)
      if (patientData?.emergency_name) {
        ctx.fillStyle = '#f43f5e'; // rose-500 for prominence
        ctx.font = '600 12px "Inter", sans-serif';
        ctx.fillText('EMERGENCY', 240, 470);
        
        ctx.fillStyle = '#374151';
        ctx.font = '600 16px "Inter", sans-serif';
        ctx.fillText(patientData.emergency_name, 240, 495);
        
        ctx.font = 'bold 16px "monospace"';
        ctx.fillText(patientData.emergency_phone, 240, 520);
      }

      // Trigger download
      const link = document.createElement('a');
      link.download = 'Health-ID-Card.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = qrImage;
  };

  const loadAll = async () => {
    try {
      const pt = await patientApi.getMe();
      if (pt) {
        setPatientData(pt);
        try {
          setQrLoading(true);
          const qrData = await specialApi.getQR();
          setQrImage(qrData.qr_image);
        } catch (qrErr) {
          console.error("Failed to fetch QR", qrErr);
          alert("QR Fetch Error: " + (qrErr.message || JSON.stringify(qrErr)));
          setQrImage(null);
        } finally {
          setQrLoading(false);
        }
      }

      const recs = await recordsApi.getAll();
      setRecords(Array.isArray(recs) ? recs : (recs?.results || []));

      const cons = await consentsApi.getAll();
      setConsents(Array.isArray(cons) ? cons : (cons?.results || []));

      const vits = await vitalsApi.getAll(pt?.id ? { patient: pt.id } : {});
      const vitsData = Array.isArray(vits) ? vits : (vits?.results || []);
      setVitalsHistory(vitsData.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (e) {
      console.error("Failed to load real data, falling back to mock", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [tab]);

  async function revoke(id) {
    try { await consentsApi.updateStatus(id, 'revoked'); loadAll(); } catch (e) { alert("Failed to revoke consent."); }
  }
  async function accept(id) {
    try {
      const nextYear = new Date(); nextYear.setFullYear(nextYear.getFullYear() + 1);
      await consentsApi.updateStatus(id, 'active', nextYear.toISOString());
      loadAll();
    } catch (e) { alert("Failed to accept consent."); }
  }
  async function deny(id) {
    try { await consentsApi.updateStatus(id, 'denied'); loadAll(); } catch (e) { alert("Failed to deny consent."); }
  }

  const TABS = [
    ["overview", "Overview"], ["records", "Records"], ["log", "📝 Health Log"],
    ["ai", "🤖 AI Insights"], ["charts", "📈 Charts"], ["consents", "Consents"],
    ["reminders", "Reminders"], ["upload", "Upload"], ["qr", "My QR"]
  ];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const allRecords = [...records].sort((a, b) => {
    const dateDiff = new Date(b.date || b.ts || 0) - new Date(a.date || a.ts || 0);
    if (dateDiff === 0) return (b.id || 0) - (a.id || 0);
    return dateDiff;
  });

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <button className="mobile-menu-btn" onClick={toggleSidebar}>☰</button>
          <div style={{ fontSize: 18 }}>👤</div><h2>Patient Portal</h2>
        </div>
        <div className="topbar-right">
          <div className="topbar-user">
            <strong>{patientData?.name || "Priya Sharma"}</strong>
            <span>Aadhaar: {patientData?.aadhaar_number || "XXXX-XXXX-0001"}</span>
          </div>
          <div className="avatar">{patientData?.name ? patientData.name.split(' ').map(n => n[0]).join('') : "PS"}</div>
        </div>
      </div>
      <div className="page">
        <div className="page-header">
          <h3>{greeting}, {patientData?.name ? patientData.name.split(' ')[0] : 'Priya'} 👋</h3>
          <p>{getInsightMessage()}</p>
        </div>


        {tab === "overview" && (
          <>
            <div className="grid-2 mb-20">
              <div className="abha-card fade-up">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div className="abha-label">Digital Health Card · AADHAAR</div>
                    <div className="abha-id">{patientData?.aadhaar_number || "XXXX-XXXX-0001"}</div>
                    <div className="abha-name">{patientData?.name || "Priya Sharma"}</div>
                    <div className="abha-dob">DOB: {patientData?.dob || "14 Aug 1991"} · Blood: {patientData?.blood_group || "B+"} · {patientData?.gender || "Female"}</div>
                    {patientData?.emergency_name && (
                      <div style={{ marginTop: 8, fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>
                        🆘 Emergency: {patientData.emergency_name} ({patientData.emergency_relation}) · {patientData.emergency_phone}
                      </div>
                    )}
                    <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span className="badge" style={{ background: "rgba(255,255,255,.15)", color: "#fff", fontSize: 11 }}>✓ Aadhaar Linked</span>
                      <span className="badge" style={{ background: "rgba(255,255,255,.15)", color: "#fff", fontSize: 11 }}>✓ Verified</span>
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, background: "white", padding: "6px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {qrLoading ? (
                      <span className="spin" style={{ fontSize: 16, color: "var(--teal)" }}>⟳</span>
                    ) : qrImage ? (
                      <img src={qrImage} alt="QR" style={{ width: "100%", height: "100%", borderRadius: "8px" }} />
                    ) : (
                      <div style={{ fontSize: 8, color: "var(--ink-faint)" }}>N/A</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="card fade-up fade-up-1">
                <div className="section-title">📊 Latest Vitals <span className="text-xs text-faint font-mono">({records.length > 0 ? "Real-time sync" : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })})</span></div>
                {[
                  ["Blood Pressure", vitalsHistory?.[0]?.systolic && vitalsHistory?.[0]?.diastolic ? `${vitalsHistory[0].systolic}/${vitalsHistory[0].diastolic}` : "N/A", "mmHg"],
                  ["Heart Rate", vitalsHistory?.[0]?.heart_rate || "N/A", "bpm"],
                  ["Blood Glucose", vitalsHistory?.[0]?.glucose || "N/A", "mg/dL"],
                  ["BMI", vitalsHistory?.[0]?.bmi || "N/A", "kg/m²"],
                  ["SpO₂", vitalsHistory?.[0]?.spo2 || "N/A", "%"],
                  ["Weight", vitalsHistory?.[0]?.weight || "N/A", "kg"]
                ].map(([l, v, u]) => (
                  <div className="vital-row" key={l}><span className="vital-label">{l}</span><span><span className="vital-value">{v}</span> <span className="vital-unit">{u}</span></span></div>
                ))}
              </div>
            </div>
            <div className="grid-3 mb-20">
              <StatCard icon="📋" label="Total Records" value={allRecords.length} sub={`${records.length} uploaded`} accentClass="accent-teal" delay="fade-up-1" />
              <StatCard icon="🤝" label="Active Consents" value={consents.filter(c => c.status === "active").length} sub="Authorized providers" accentClass="accent-amber" delay="fade-up-2" />
              <StatCard icon="🛡️" label="Audit Logs" value={records.length} sub="All records secured by hash" accentClass="accent-indigo" delay="fade-up-3" />
            </div>
            <div className="card fade-up fade-up-4">
              <div className="section-title mb-20">🕒 Recent Activity</div>
              <div className="timeline">
                {allRecords.map((r, i) => (
                  <div className="timeline-item" key={r.id || i}><div className="timeline-dot" /><div className="timeline-date">{r.date && !isNaN(new Date(r.date)) ? new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (r.date || "Unknown Date")}</div>
                    <div className="flex items-center gap-8 mb-4">
                      <RecordTypeBadge type={r.record_type || r.type || "Report"} />
                      <span className="timeline-title">{r.title || r.record_type || "Medical Record"}</span>
                    </div>
                    <div className="timeline-sub">{r.provider_display || r.provider || r.doctor_name || "Self Uploaded"}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === "records" && (
          <div className="card fade-up">
            <div className="flex justify-between items-center mb-20">
              <div className="section-title mb-0">All Health Records</div>
              <div className="search-bar" style={{ width: 220 }}><span className="search-icon">🔍</span><input className="form-input" placeholder="Search…" value={recordSearch} onChange={e => setRecordSearch(e.target.value)} /></div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Date</th><th>Type</th><th>Record</th><th>Provider</th><th>Document</th><th></th></tr>
                </thead>
                <tbody>
                  {allRecords.filter(r => {
                    const searchLower = recordSearch.toLowerCase();
                    const titleMatch = (r.title || "").toLowerCase().includes(searchLower);
                    const providerMatch = (r.provider_display || r.provider || r.doctor_name || "Self Uploaded").toLowerCase().includes(searchLower);
                    const typeMatch = (r.record_type || r.type || "").toLowerCase().includes(searchLower);
                    return titleMatch || providerMatch || typeMatch;
                  }).map((r, i) => (
                    <tr key={r.id || i}>
                      <td className="font-mono text-sm text-faint">{r.date && !isNaN(new Date(r.date)) ? new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (r.date || "Unknown Date")}</td>
                      <td><RecordTypeBadge type={r.record_type || r.type || "Report"} /></td>
                      <td className="font-600">{r.title || r.record_type || "Medical Record"}</td>
                      <td className="text-sm text-faint">{r.provider_display || r.provider || r.doctor_name || "Self Uploaded"}</td>
                      <td>{r.file ? <a href={r.file} target="_blank" rel="noreferrer" className="btn btn-primary btn-xs">📄 File</a> : <span className="text-faint text-xs">—</span>}</td>
                      <td><button className="btn btn-outline btn-sm" onClick={() => setViewingRecord(r)}>View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "ai" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <AISummaryPanel patient={patientData} />
            <RiskPrediction patient={patientData} />
          </div>
        )}
        {tab === "log" && <HealthLogPanel patientData={patientData} onRefresh={loadAll} />}
        {tab === "charts" && <HealthCharts patientData={patientData} />}

        {tab === "consents" && (
          <div className="fade-up">
            <div className="alert alert-info mb-20">🔐 All consent events are recorded in the Secure Audit Trail. Revoking access takes effect immediately.</div>
            {consents.filter(c => c.status === "pending").length > 0 && (
              <>
                <div className="section-title mb-16">Pending Requests</div>
                {consents.filter(c => c.status === "pending").map(c => (
                  <div className="consent-item" key={c.id} style={{ borderLeft: "3px solid var(--amber)", background: "var(--amber-lt)", borderColor: "var(--amber-lt)" }}>
                    <div><div className="consent-name">{c.doctor_name || "Unknown Doctor"}</div><div className="consent-meta">{c.doctor_facility || "Clinic"} · {c.scope || "Full Records"}</div></div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn btn-primary btn-sm" onClick={() => accept(c.id)}>Accept</button>
                      <button className="btn btn-outline btn-sm" onClick={() => deny(c.id)}>Deny</button>
                    </div>
                  </div>
                ))}
              </>
            )}

            <div className="section-title mb-16 mt-20">Active Consents</div>
            {consents.filter(c => c.status === "active").map(c => (
              <div className="consent-item" key={c.id}>
                <div><div className="consent-name">{c.doctor_name || "Unknown Doctor"}</div><div className="consent-meta">{c.doctor_facility || "Clinic"} · {c.scope || "Full Records"} · Expires: {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "Unlimited"}</div></div>
                <button className="btn btn-danger btn-sm" onClick={() => revoke(c.id)}>Revoke</button>
              </div>
            ))}
            <div className="section-title mb-16 mt-20">Expired / Revoked</div>
            {consents.filter(c => c.status === "revoked" || c.status === "denied").map(c => <div className="consent-item" key={c.id} style={{ opacity: .5 }}><div><div className="consent-name" style={{ color: "var(--ink-faint)" }}>{c.doctor_name || "Unknown Doctor"}</div><div className="consent-meta">{c.doctor_facility || "Clinic"} · {c.scope || "Full Records"}</div></div><span className="badge" style={{ background: "var(--border)", color: "var(--ink-soft)" }}>{c.status === "denied" ? "Denied" : "Revoked"}</span></div>)}
          </div>
        )}

        {tab === "reminders" && <RemindersPanel patientData={patientData} />}

        {tab === "upload" && <UploadReportPanel patientData={patientData} onSuccess={() => { setTab('records'); loadAll(); }} />}

        {tab === "qr" && (
          <div className="fade-up"><div className="grid-2" style={{ maxWidth: 680 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div className="health-card fade-up" style={{ 
                background: "white", 
                padding: "24px", 
                borderRadius: "20px", 
                boxShadow: "0 10px 30px rgba(0,0,0,0.08)", 
                border: "1px solid var(--border)",
                width: "100%",
                maxWidth: "260px",
                textAlign: "center"
              }}>
                <div style={{ marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 800, color: "var(--teal)", fontSize: 12 }}>HEALTH ID</span>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--teal)" }}></div>
                </div>

                <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                  {qrLoading ? (
                    <div style={{ width: 180, height: 180, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface)", borderRadius: 12 }}>
                      <span className="spin" style={{ fontSize: 24, color: "var(--teal)" }}>⟳</span>
                    </div>
                  ) : qrImage ? (
                    <img src={qrImage} alt="Patient QR Code" style={{ width: 180, height: 180, borderRadius: 8 }} />
                  ) : (
                    <div style={{ width: 180, height: 180, background: "var(--surface)", borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--ink-faint)", padding: 12 }}>
                      <div style={{ fontSize: 11, marginBottom: 8 }}>QR Not Available</div>
                      <button className="btn btn-outline btn-xs" onClick={loadAll}>↻ Retry</button>
                    </div>
                  )}
                </div>

                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 10, color: "var(--ink-faint)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Aadhaar Number</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--ink-soft)" }}>{patientData?.aadhaar_number || "XXXX-XXXX-0001"}</div>
                  
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-soft)" }}>{patientData?.name || "Priya Sharma"}</div>
                  
                  {patientData?.emergency_name && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed var(--border)" }}>
                      <div style={{ fontSize: 10, color: "var(--ink-faint)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Emergency Contact</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--rose)" }}>{patientData.emergency_name} ({patientData.emergency_relation})</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--rose)", fontFamily: "var(--font-mono)" }}>{patientData.emergency_phone}</div>
                    </div>
                  )}
                </div>
              </div>
              
              <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
                <button 
                  onClick={downloadCard} 
                  className="btn btn-primary" 
                  disabled={!qrImage} 
                  style={{ opacity: qrImage ? 1 : 0.5 }}
                >
                  ⬇ Download ID Card
                </button>
              </div>
            </div>
            <div className="card">
              <div className="section-title">ℹ️ How QR works</div>
              {[["1", "Doctor scans your QR code at the clinic."], ["2", "System looks up your Aadhaar ID and sends you a consent request."], ["3", "You approve or deny access from this app."], ["4", "Doctor gets time-limited access to approved records only."], ["5", "Every access is logged in the Secure Audit Trail."]].map(([n, t]) => (
                <div key={n} style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "flex-start" }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--teal-lt)", color: "var(--teal)", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{n}</div>
                  <span className="text-sm" style={{ color: "var(--ink-soft)" }}>{t}</span>
                </div>
              ))}
            </div>
          </div></div>
        )}

        {viewingRecord && (
          <div className="modal-backdrop" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setViewingRecord(null)}>
            <div className="card fade-up" style={{ width: "100%", maxWidth: 500, margin: "0 20px", textAlign: "center", padding: 40 }} onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-20" style={{ marginTop: -20 }}>
                <div className="section-title mb-0" style={{ fontSize: 24 }}>Record Details</div>
                <button className="btn btn-outline btn-sm" style={{ borderRadius: '50%', width: 36, height: 36, padding: 0 }} onClick={() => setViewingRecord(null)}>✕</button>
              </div>

              <div style={{ marginBottom: 16, fontSize: 18 }}>
                <strong>Type:</strong> <RecordTypeBadge type={viewingRecord.record_type || viewingRecord.type || "Report"} />
              </div>
              <div style={{ marginBottom: 16, fontSize: 22 }}>
                <strong>Title:</strong> {viewingRecord.title || viewingRecord.record_type || "Medical Record"}
              </div>
              <div style={{ marginBottom: 16, fontSize: 18 }}>
                <strong>Date:</strong> <span style={{ color: 'var(--ink-faint)' }}>{viewingRecord.date}</span>
              </div>
              <div style={{ marginBottom: 16, fontSize: 18 }}>
                <strong>Provider:</strong> {viewingRecord.doctor_name || viewingRecord.provider}
              </div>

              {viewingRecord.file && (
                <div style={{ background: 'var(--surface-lt)', padding: 20, borderRadius: 12, marginBottom: 10 }}>
                  <div className="flex justify-between items-center mb-10">
                    <span className="font-600">📄 Attached File</span>
                    <a href={viewingRecord.file} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">Open File</a>
                  </div>
                  {viewingRecord.file.match(/\.(jpg|jpeg|png|gif)$/i) && (
                    <img src={viewingRecord.file} alt="Preview" style={{ width: '100%', borderRadius: 8, marginTop: 10 }} />
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
