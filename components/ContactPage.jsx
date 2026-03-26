import React, { useState, useEffect } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "../firebase.js";
import { logChange } from "../utils/changelog.js";
import AuthGate from "./ui/AuthGate.jsx";

export default function ContactPage({ programs, user }) {
  const [requestType, setRequestType] = useState("update");
  const [form, setForm] = useState({
    name: "", email: "", title: "", school: "", phone: "", details: "",
  });
  const [status, setStatus] = useState(null);

  // Pre-fill email from auth
  useEffect(() => {
    if (user && !form.email) setForm(f => ({ ...f, email: user.email || "" }));
  }, [user]);

  function set(field, val) {
    setForm(f => ({ ...f, [field]: val }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("sending");
    try {
      const submissionData = { ...form, requestType, uid: user.uid, submittedAt: serverTimestamp() };
      const ref = await addDoc(collection(db, "submissions"), submissionData);
      await logChange("add", "submissions", ref.id, { ...form, requestType }, form.email || user.email || "anonymous");
      setStatus("sent");
      setForm({ name: "", email: user.email || "", title: "", school: "", phone: "", details: "" });
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }

  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 8,
    border: "1px solid #E5E7EB", fontSize: 14, boxSizing: "border-box",
    outline: "none", color: "#0A1F44",
  };
  const labelStyle = {
    display: "block", fontSize: 12, fontWeight: 700,
    color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em",
  };

  return (
    <AuthGate user={user} title="Submit Program Info" description="Sign in to submit or update program information.">
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 32,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #E5E7EB" }}>

          {/* Header with user info */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: "0 0 6px", fontSize: 20, color: "#0A1F44" }}>Submit Program Info</h2>
              <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>
                Are you a coach or school representative? Use this form to update existing program information.
              </p>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>{user?.email}</div>
              <button onClick={() => signOut(auth)} style={{
                padding: "4px 12px", borderRadius: 6, border: "1px solid #E5E7EB",
                background: "#fff", color: "#64748b", fontSize: 12, cursor: "pointer",
              }}>Sign Out</button>
            </div>
          </div>

          {status === "sent" ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>&#10004;&#65039;</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#0A1F44", marginBottom: 8 }}>Submission Received!</div>
              <div style={{ fontSize: 14, color: "#64748b", marginBottom: 24 }}>
                Thank you — we'll review your submission and update the portal shortly.
              </div>
              <button onClick={() => setStatus(null)} style={{
                padding: "10px 24px", borderRadius: 8, border: "none", background: "#00FF00",
                color: "#0A1F44", fontWeight: 600, fontSize: 14, cursor: "pointer",
              }}>Submit Another</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>School / Program Name *</label>
                <select value={form.school} onChange={e => set("school", e.target.value)}
                  required style={inputStyle}>
                  <option value="">— Select a school —</option>
                  {[...new Set(programs.map(p => p.school).filter(Boolean))].sort()
                    .map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Your Name *</label>
                  <input value={form.name} onChange={e => set("name", e.target.value)}
                    required placeholder="Full name" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Your Title</label>
                  <input value={form.title} onChange={e => set("title", e.target.value)}
                    placeholder="e.g. Head Coach" style={inputStyle} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Email *</label>
                  <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                    required placeholder="you@school.edu" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input type="tel" value={form.phone} onChange={e => set("phone", e.target.value)}
                    placeholder="Optional" style={inputStyle} />
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>
                  What needs to be updated? *
                </label>
                <textarea value={form.details} onChange={e => set("details", e.target.value)}
                  required rows={5} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                  placeholder="Describe what information needs to be corrected or updated..." />
              </div>

              {status === "error" && (
                <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8,
                  background: "#fee2e2", color: "#dc2626", fontSize: 13 }}>
                  Something went wrong. Please try again or email us directly.
                </div>
              )}

              <button type="submit" disabled={status === "sending"} style={{
                width: "100%", padding: "12px", borderRadius: 8, border: "none",
                background: status === "sending" ? "#E5E7EB" : "#00FF00",
                color: "#0A1F44", fontWeight: 700, fontSize: 15, cursor: status === "sending" ? "default" : "pointer",
              }}>
                {status === "sending" ? "Submitting..." : "Submit"}
              </button>
            </form>
          )}
        </div>
      </div>
    </AuthGate>
  );
}
