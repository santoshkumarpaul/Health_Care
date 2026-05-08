import React, { useState } from "react";
import { recordsApi } from "../../api";

const REPORT_CATEGORIES = {
  "Lab Report": [
    "Complete Blood Count (CBC)", "Liver Function Test (LFT)", "Kidney Function Test (KFT)",
    "Lipid Profile", "Thyroid Profile", "HbA1c", "Urine Routine", "Stool Test", "Other"
  ],
  "Blood Test": [
    "Blood Sugar (Fasting)", "Blood Sugar (PP)", "Blood Group & Rh", "Hemoglobin",
    "Platelet Count", "ESR", "CRP", "Vitamin D", "Vitamin B12", "Iron Studies", "Other"
  ],
  "Imaging / Scan": [
    "X-Ray", "MRI", "CT Scan", "Ultrasound", "PET Scan", "Mammography",
    "DEXA Scan", "Echocardiogram", "Other"
  ],
  "Prescription": [
    "General Prescription", "Specialist Prescription", "Follow-up Prescription",
    "Emergency Prescription", "Chronic Medication", "Other"
  ],
  "Discharge Summary": [
    "Hospital Discharge", "Day Care Discharge", "ICU Discharge",
    "Surgery Discharge", "Maternity Discharge", "Other"
  ],
  "Vital Signs": [
    "Blood Pressure", "Heart Rate", "Temperature", "SpO2",
    "Respiratory Rate", "Blood Glucose", "Weight & BMI", "Other"
  ],
  "Vaccination Record": [
    "COVID-19", "Influenza", "Hepatitis B", "Hepatitis A", "Tetanus",
    "MMR", "Typhoid", "HPV", "Pneumococcal", "Rabies", "Other"
  ],
  "Allergy Record": [
    "Drug Allergy", "Food Allergy", "Environmental Allergy",
    "Skin Allergy", "Respiratory Allergy", "Other"
  ],
  "Surgery Report": [
    "Pre-Surgery Assessment", "Operative Notes", "Post-Surgery Report",
    "Anesthesia Report", "Biopsy Report", "Other"
  ],
  "Others": []
};

export function UploadReportPanel({ patientData, onSuccess }) {
  const [category, setCategory] = useState("Lab Report");
  const [subType, setSubType] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [customSubType, setCustomSubType] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [provider, setProvider] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const subOptions = REPORT_CATEGORIES[category] || [];

  const handleCategoryChange = (val) => {
    setCategory(val);
    setSubType("");
    setCustomSubType("");
    setCustomCategory("");
  };

  const getFinalType = () => {
    if (category === "Others") return customCategory || "Other";
    if (subType === "Other") return customSubType ? `${category} - ${customSubType}` : category;
    return subType ? `${category} - ${subType}` : category;
  };

  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
  const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const handleUpload = async () => {
    if (!provider) return alert("Please enter Provider / Facility.");
    if (category === "Others" && !customCategory) return alert("Please specify the report category.");
    if (subType === "Other" && !customSubType) return alert("Please specify the sub-type.");
    if (!file) return alert("Please select a file to upload.");

    setLoading(true);
    try {
      const fd = new FormData();
      const typeToUpload = getFinalType();

      if (patientData?.id) fd.append("patient", patientData.id);
      fd.append("record_type", category === "Others" ? customCategory : category);
      fd.append("date", date);
      fd.append("provider", provider);
      fd.append("title", typeToUpload);
      fd.append("file", file);

      await recordsApi.create(fd);
      alert("Report uploaded successfully! ✅");
      setCategory("Lab Report"); setSubType(""); setCustomCategory(""); setCustomSubType("");
      setProvider(""); setFile(null);
      if (onSuccess) onSuccess();
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card fade-up" style={{ maxWidth: 540 }}>
      <div className="section-title mb-20">📤 Upload Health Report</div>

      {/* Row 1: Category + Date */}
      <div className="form-row mb-12">
        <div className="form-group mb-0">
          <label className="form-label">Report Category</label>
          <select className="form-select" value={category} onChange={e => handleCategoryChange(e.target.value)}>
            {Object.keys(REPORT_CATEGORIES).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="form-group mb-0">
          <label className="form-label">Date</label>
          <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
      </div>

      {/* Custom category input for "Others" */}
      {category === "Others" && (
        <div className="form-group fade-up" style={{ marginBottom: 12 }}>
          <label className="form-label">Specify Report Category</label>
          <input className="form-input" placeholder="e.g. Dental Record, Eye Test, Physiotherapy" value={customCategory} onChange={e => setCustomCategory(e.target.value)} />
        </div>
      )}

      {/* Sub-type dropdown (shown when category has sub-options) */}
      {subOptions.length > 0 && category !== "Others" && (
        <div className="form-group fade-up" style={{ marginBottom: 12 }}>
          <label className="form-label">Report Sub-Type</label>
          <select className="form-select" value={subType} onChange={e => { setSubType(e.target.value); setCustomSubType(""); }}>
            <option value="">— Select sub-type —</option>
            {subOptions.map(sub => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
        </div>
      )}

      {/* Custom sub-type input when "Other" is selected in sub-dropdown */}
      {subType === "Other" && (
        <div className="form-group fade-up" style={{ marginBottom: 12 }}>
          <label className="form-label">Specify Sub-Type</label>
          <input className="form-input" placeholder={`e.g. Custom ${category} type`} value={customSubType} onChange={e => setCustomSubType(e.target.value)} />
        </div>
      )}

      {/* Provider */}
      <div className="form-group">
        <label className="form-label">Provider / Facility</label>
        <input className="form-input" placeholder="e.g. LifeLabs Diagnostics" value={provider} onChange={e => setProvider(e.target.value)} />
      </div>

      {/* File upload with drag & drop */}
      <div className="form-group">
        <label className="form-label">File</label>
        <label
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            border: dragging ? "2px dashed var(--teal)" : "2px dashed var(--border)",
            borderRadius: "var(--radius)",
            padding: "26px",
            textAlign: "center",
            background: dragging ? "rgba(20,184,166,0.06)" : "var(--surface)",
            cursor: "pointer",
            display: "block",
            transition: "border-color 0.2s, background 0.2s"
          }}
        >
          <input type="file" style={{ display: "none" }} onChange={e => setFile(e.target.files[0])} />
          <div style={{ fontSize: 28, marginBottom: 8 }}>📁</div>
          <div style={{ fontSize: 14, color: "var(--ink-soft)" }}>
            {file ? <span style={{ color: "var(--teal)", fontWeight: 500 }}>{file.name}</span> : <span>Drag & drop or <span style={{ color: "var(--teal)" }}>browse</span></span>}
          </div>
          <div className="text-xs text-faint" style={{ marginTop: 4 }}>PDF, PNG, JPG — max 10MB</div>
        </label>
      </div>

      <div className="alert alert-success">✅ File will be AES-256 encrypted and secured with an Audit Trail hash.</div>
      <button className="btn btn-primary" onClick={handleUpload} disabled={loading}>
        {loading ? "Uploading..." : "Upload Report"}
      </button>
    </div>
  );
}
