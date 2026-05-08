import React, { useState, useEffect } from "react";
import { remindersApi } from "../../api";

export function RemindersPanel({ patientData }) {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newR, setNewR] = useState({ text: "", time: new Date().toISOString().slice(0, 16), reminder_type: "Medication" });
  
  const icons = { "Medication": "💊", "Appointment": "🩺", "Lab Test": "🧪", "Other": "🔔" };
  const colors = { "Medication": "var(--teal-lt)", "Appointment": "var(--indigo-lt)", "Lab Test": "var(--amber-lt)", "Other": "var(--surface)" };

  useEffect(() => { 
    loadReminders(); 
  }, [patientData]);

  async function loadReminders() {
    setLoading(true);
    try {
      const pId = patientData?.id;
      const data = await remindersApi.getAll(pId ? { patient: pId } : {});
      setReminders(Array.isArray(data) ? data : []);
    } catch (e) { 
      console.error("Failed to load reminders", e); 
    } finally { 
      setLoading(false); 
    }
  }

  async function add() {
    if (!newR.text) { alert("Please enter a description for the reminder."); return; }
    if (!newR.time) { alert("Please select a date and time."); return; }
    setLoading(true);
    try {
      const data = { ...newR };
      if (patientData?.id) data.patient_id = patientData.id;
      await remindersApi.create(data);
      setNewR({ text: "", time: new Date().toISOString().slice(0, 16), reminder_type: "Medication" });
      setAdding(false);
      loadReminders();
    } catch (e) { 
      alert("Error: " + e.message); 
    } finally { 
      setLoading(false); 
    }
  }

  async function remove(id) {
    try {
      await remindersApi.delete(id);
      loadReminders();
    } catch (e) { 
      alert("Error: " + e.message); 
    }
  }

  return (
    <div className="card fade-up">
      <div className="flex justify-between items-center mb-16">
        <div className="section-title mb-0">⏰ Reminders & Alerts</div>
        <button className="btn btn-outline btn-sm" onClick={() => {
          if (!adding) setNewR(r => ({ ...r, time: new Date().toISOString().slice(0, 16) }));
          setAdding(a => !a);
        }}>{adding ? "Cancel" : "+ Add"}</button>
      </div>
      {adding && (
        <div style={{ background: "var(--surface)", borderRadius: "var(--radius)", padding: 14, marginBottom: 16, border: "1px solid var(--border)" }}>
          <div className="form-row" style={{ marginBottom: 10 }}>
            <div>
              <label className="form-label">Type</label>
              <select className="form-select" value={newR.reminder_type} onChange={e => setNewR(r => ({ ...r, reminder_type: e.target.value }))}>
                {Object.keys(icons).map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Date & Time</label>
              <input className="form-input" type="datetime-local" value={newR.time} onChange={e => setNewR(r => ({ ...r, time: e.target.value }))} />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label className="form-label">Reminder Description</label>
            <input className="form-input" placeholder="e.g. Take Metformin after breakfast" value={newR.text} onChange={e => setNewR(r => ({ ...r, text: e.target.value }))} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={add} disabled={loading}>{loading ? "Saving..." : "Save Reminder"}</button>
        </div>
      )}
      {loading && reminders.length === 0 ? (
        <div style={{ textAlign: "center", padding: 20, color: "var(--ink-faint)" }}>Loading reminders...</div>
      ) : reminders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--ink-faint)" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>⏰</div>
          <p>No active reminders. Click + Add to create one.</p>
        </div>
      ) : (
        reminders.map(r => (
          <div className="reminder-item" key={r.id}>
            <div className="reminder-icon" style={{ background: colors[r.reminder_type] || "var(--surface)" }}>{icons[r.reminder_type] || "🔔"}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{r.text}</div>
              <div style={{ fontSize: 12, color: "var(--ink-faint)", fontFamily: "var(--font-mono)" }}>{new Date(r.time).toLocaleString()}</div>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => remove(r.id)}>✕</button>
          </div>
        ))
      )}
    </div>
  );
}
