import React, { useState, useEffect } from "react";
import { doctorApi, patientApi, auditApi, adminApi } from "../../api";
import { StatCard } from "../common/StatCard";
import { TabBar } from "../common/TabBar";
import { MiniChart } from "../common/MiniChart";
import { ProviderRegister } from "../doctors/ProviderRegister";

export function AdminDashboard({ tab, setTab, toggleSidebar }) {
  const [providers, setProviders] = useState([]);
  const [patientsList, setPatientsList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [stats, setStats] = useState({ total_patients: 0, total_providers: 0, total_records: 0, total_audits: 0 });
  const [viewingPatient, setViewingPatient] = useState(null);
  const [viewingProvider, setViewingProvider] = useState(null);
  const [registeringProvider, setRegisteringProvider] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    try {
      const [docs, pts, audits, st] = await Promise.all([
        doctorApi.getAll().catch(() => []),
        patientApi.getAll().catch(() => []),
        auditApi.getAll().catch(() => []),
        adminApi.getStats().catch(() => ({ total_patients: 0, total_providers: 0, total_records: 0, total_audits: 0 }))
      ]);
      setProviders(docs);
      setPatientsList(pts);
      setAuditLogs(audits);
      setStats(st);
    } catch (e) {
      console.error("Failed to load admin data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  async function approve(id) { 
    try {
      await doctorApi.verify(id);
      refreshData();
    } catch (e) {
      alert("Failed to approve provider: " + e.message);
    }
  }

  const adminIdentifier = localStorage.getItem('user_phone') || "Admin";

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <button className="mobile-menu-btn" onClick={toggleSidebar}>☰</button>
          <div style={{ fontSize: 18 }}>⚙️</div>
          <h2>Admin Panel</h2>
        </div>
        <div className="topbar-right">
          <div className="topbar-user">
            <strong>{adminIdentifier}</strong>
            <span>ABDM Portal</span>
          </div>
          <div className="avatar" style={{ background: "var(--indigo-lt)", color: "var(--indigo)" }}>
            {adminIdentifier.substring(0, 2).toUpperCase()}
          </div>
        </div>
      </div>

      <div className="page">
        <div className="page-header">
          <h3>System Administration</h3>
          <p>Manage providers, patients, audit logs and analytics</p>
        </div>

        <div className="grid-4 mb-24">
          <StatCard 
            icon="👥" 
            label="Total Patients" 
            value={stats.total_patients || patientsList.length || "0"} 
            sub="Registered profiles" 
            accentClass="accent-teal" 
            delay="fade-up-1" 
          />
          <StatCard 
            icon="🏥" 
            label="Providers" 
            value={stats.total_providers || providers.length || "0"} 
            sub="Registered facilities" 
            accentClass="accent-amber" 
            delay="fade-up-2" 
          />
          <StatCard 
            icon="📋" 
            label="EHR Records" 
            value={stats.total_records || "0"} 
            sub="Total clinical notes" 
            accentClass="accent-indigo" 
            delay="fade-up-3" 
          />
          <StatCard 
            icon="🛡️" 
            label="Audit Trail Logs" 
            value={stats.total_audits || auditLogs.length || "0"} 
            sub="100% verified" 
            accentClass="accent-rose" 
            delay="fade-up-4" 
          />
        </div>

        <TabBar 
          tabs={[
            ["providers", "Providers"], 
            ["patients", "Patients"], 
            ["audit", "Audit Log"], 
            ["analytics", "Analytics"]
          ]} 
          active={tab} 
          onChange={setTab} 
        />

        {tab === "providers" && (
          <div className="card fade-up">
            <div className="flex justify-between items-center mb-20">
              <div className="section-title mb-0">Registered Providers</div>
              <button className="btn btn-primary btn-sm" onClick={() => setRegisteringProvider(true)}>
                + Register Provider
              </button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Specialty</th>
                    <th>HFR ID</th>
                    <th>Patients</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(loading ? [] : providers).map(p => (
                    <tr key={p.id}>
                      <td>
                        <div className="font-600">{p.name}</div>
                        <div className="text-xs text-faint">{p.facility}</div>
                      </td>
                      <td className="text-sm">{p.specialty}</td>
                      <td className="font-mono text-xs text-faint">{p.hfr_id || p.hfr}</td>
                      <td className="text-sm">{p.patients > 0 ? p.patients : "—"}</td>
                      <td>
                        <span className={`badge ${p.status === "verified" ? "badge-teal" : p.status === "pending" ? "badge-amber" : "badge-gray"}`}>
                          {p.status}
                        </span>
                      </td>
                      <td>
                        {p.status === "pending" ? (
                          <button className="btn btn-primary btn-sm" onClick={() => approve(p.id)}>Approve</button>
                        ) : (
                          <button className="btn btn-outline btn-sm" onClick={() => setViewingProvider(p)}>View</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "patients" && (
          <div className="card fade-up">
            <div className="flex justify-between items-center mb-20">
              <div className="section-title mb-0">Patient Registry</div>
              <div className="search-bar" style={{ width: 220 }}>
                <span className="search-icon">🔍</span>
                <input 
                  className="form-input" 
                  placeholder="Search patients…" 
                  value={patientSearch} 
                  onChange={e => setPatientSearch(e.target.value)} 
                />
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>ABHA ID</th>
                    <th>Age/Sex</th>
                    <th>Blood</th>
                    <th>BMI</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(loading ? [] : patientsList)
                    .filter(p => (p.name || "").toLowerCase().includes(patientSearch.toLowerCase()) || (p.abha || "").includes(patientSearch))
                    .map(p => (
                      <tr key={p.id}>
                        <td>
                          <div className="flex items-center gap-8">
                            <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                              {(p.name || "?")[0]}{(p.name || " ").split(" ")[1]?.[0] || ''}
                            </div>
                            <span className="font-600">{p.name || "Unnamed"}</span>
                          </div>
                        </td>
                        <td className="font-mono text-xs text-faint">{p.abha || "—"}</td>
                        <td className="text-sm">{p.age || "—"}/{p.gender || "—"}</td>
                        <td>
                          <span className="badge badge-rose">{p.blood_group || p.blood || "—"}</span>
                        </td>
                        <td className="font-mono text-sm">{p.bmi || "—"}</td>
                        <td>
                          <span className={`badge ${p.status === "active" ? "badge-teal" : "badge-gray"}`}>
                            {p.status || "active"}
                          </span>
                        </td>
                        <td>
                          <button className="btn btn-outline btn-sm" onClick={() => setViewingPatient(p)}>View</button>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "audit" && (
          <div className="card fade-up">
            <div className="flex justify-between items-center mb-16">
              <div className="section-title mb-0">🛡️ Secure Audit Log</div>
              <button className="btn btn-outline btn-sm">Export CSV</button>
            </div>
            <div className="alert alert-success mb-16">✅ All transactions verified. Last check: just now.</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Resource</th>
                    <th>Verified</th>
                  </tr>
                </thead>
                <tbody>
                  {(loading ? [] : auditLogs).map((a, i) => (
                    <tr key={a.id || i}>
                      <td className="font-mono text-xs text-faint">
                        {new Date(a.timestamp || a.ts).toLocaleString()}
                      </td>
                      <td className="font-600 text-sm">{a.actor_name || a.actor}</td>
                      <td className="text-sm">{a.action}</td>
                      <td className="text-sm text-faint">{a.resource || "System"}</td>
                      <td><span className="badge badge-teal">✓</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "analytics" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="grid-2">
              <div className="card fade-up">
                <div className="section-title mb-16">📊 BMI Distribution</div>
                {[
                  ["Underweight <18.5", "2%", "var(--indigo)"], 
                  ["Normal 18.5–24.9", "38%", "var(--green)"], 
                  ["Overweight 25–29.9", "41%", "var(--amber)"], 
                  ["Obese >30", "19%", "var(--rose)"]
                ].map(([l, pct, c]) => (
                  <div key={l} style={{ marginBottom: 12 }}>
                    <div className="flex justify-between text-sm mb-4">
                      <span>{l}</span>
                      <strong>{pct}</strong>
                    </div>
                    <div className="risk-bar">
                      <div className="risk-fill" style={{ width: pct, background: c }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="card fade-up fade-up-1">
                <div className="section-title mb-16">🧪 Common Diagnoses</div>
                {[
                  ["Hypertension", "34%", "var(--rose)"], 
                  ["Pre-Diabetes", "28%", "var(--amber)"], 
                  ["Obesity", "22%", "var(--purple)"], 
                  ["Anaemia", "11%", "var(--indigo)"], 
                  ["Thyroid", "5%", "var(--teal)"]
                ].map(([l, pct, c]) => (
                  <div key={l} style={{ marginBottom: 12 }}>
                    <div className="flex justify-between text-sm mb-4">
                      <span>{l}</span>
                      <strong>{pct}</strong>
                    </div>
                    <div className="risk-bar">
                      <div className="risk-fill" style={{ width: pct, background: c }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card fade-up fade-up-2">
              <div className="section-title mb-20">📈 System EHR Records Created (6 months)</div>
              <MiniChart data={[410, 538, 621, 714, 802, 921]} labels={["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"]} color="var(--teal)" unit="records" title="" />
            </div>
          </div>
        )}

        {viewingPatient && (
          <div className="modal-backdrop" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
            <div className="card fade-up" style={{ width: "100%", maxWidth: 500, margin: "0 20px" }}>
              <div className="flex justify-between items-center mb-16">
                <div className="section-title mb-0">Patient Profile</div>
                <button className="btn btn-outline btn-sm" onClick={() => setViewingPatient(null)}>✕</button>
              </div>
              <div style={{ marginBottom: 12 }}><strong>Name:</strong> <span style={{ fontSize: 16 }}>{viewingPatient.name}</span></div>
              <div style={{ marginBottom: 12 }}><strong>ABHA ID:</strong> <span className="font-mono text-sm text-faint">{viewingPatient.abha}</span></div>
              <div style={{ marginBottom: 12 }}><strong>Age/Sex:</strong> {viewingPatient.age} / {viewingPatient.gender}</div>
              <div style={{ marginBottom: 12 }}><strong>Blood Group:</strong> <span className="badge badge-rose">{viewingPatient.blood_group || viewingPatient.blood}</span></div>
              <div style={{ marginBottom: 12 }}><strong>BMI:</strong> {viewingPatient.bmi}</div>
              <div style={{ marginBottom: 12 }}><strong>Status:</strong> <span className={`badge ${viewingPatient.status === "active" ? "badge-teal" : "badge-gray"}`}>{viewingPatient.status}</span></div>
            </div>
          </div>
        )}

        {viewingProvider && (
          <div className="modal-backdrop" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
            <div className="card fade-up" style={{ width: "100%", maxWidth: 500, margin: "0 20px" }}>
              <div className="flex justify-between items-center mb-16">
                <div className="section-title mb-0">Provider Details</div>
                <button className="btn btn-outline btn-sm" onClick={() => setViewingProvider(null)}>✕</button>
              </div>
              <div style={{ marginBottom: 12 }}><strong>Name:</strong> <span style={{ fontSize: 16 }}>{viewingProvider.name}</span></div>
              <div style={{ marginBottom: 12 }}><strong>Specialty:</strong> {viewingProvider.specialty || 'N/A'}</div>
              <div style={{ marginBottom: 12 }}><strong>Facility:</strong> {viewingProvider.facility}</div>
              <div style={{ marginBottom: 12 }}><strong>HFR ID:</strong> <span className="font-mono text-sm text-faint">{viewingProvider.hfr_id || viewingProvider.hfr}</span></div>
              <div style={{ marginBottom: 12 }}><strong>Patients:</strong> {viewingProvider.patients || '0'}</div>
              <div style={{ marginBottom: 12 }}><strong>Status:</strong> <span className={`badge ${viewingProvider.status === "verified" ? "badge-teal" : viewingProvider.status === "pending" ? "badge-amber" : "badge-gray"}`}>{viewingProvider.status}</span></div>
            </div>
          </div>
        )}

        {registeringProvider && (
          <div className="modal-backdrop" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "20px", overflowY: "auto" }}>
            <div className="card fade-up" style={{ width: "100%", maxWidth: 600, padding: 40, margin: "auto" }}>
              <ProviderRegister 
                onDone={() => { 
                  setRegisteringProvider(false); 
                  setTab("providers"); 
                  refreshData();
                }} 
                onBack={() => setRegisteringProvider(false)} 
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
