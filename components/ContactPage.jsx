import React, { useState, useEffect } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { db, auth, googleProvider } from "../firebase.js";
import { logChange } from "../utils/changelog.js";

export default function ContactPage({ programs }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState("login"); // "login" or "signup"
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState(null);

  const [requestType, setRequestType] = useState("update");
  const [form, setForm] = useState({
    name: "", email: "", title: "", school: "", phone: "", details: "",
  });
  const [status, setStatus] = useState(null);

  useEffect(() => {
    getRedirectResult(auth).catch(() => {});
    return onAuthStateChanged(auth, u => { setUser(u); setAuthLoading(false); });
  }, []);

  // Pre-fill email from auth
  useEffect(() => {
    if (user && !form.email) setForm(f => ({ ...f, email: user.email || "" }));
  }, [user]);

  function set(field, val) {
    setForm(f => ({ ...f, [field]: val }));
  }

  async function handleGoogleSignIn() {
    setAuthError(null);
    try { await signInWithPopup(auth, googleProvider); }
    catch (err) { signInWithRedirect(auth, googleProvider); }
  }

  async function handleEmailAuth(e) {
    e.preventDefault();
    setAuthError(null);
    try {
      if (authMode === "signup") {
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
    } catch (err) {
      const msg = err.code === "auth/email-already-in-use" ? "An account with this email already exists. Try signing in."
        : err.code === "auth/wrong-password" || err.code === "auth/invalid-credential" ? "Incorrect password. Try again."
        : err.code === "auth/user-not-found" ? "No account found with this email. Try creating one."
        : err.code === "auth/weak-password" ? "Password must be at least 6 characters."
        : err.code === "auth/invalid-email" ? "Please enter a valid email address."
        : "Sign-in failed. Please try again.";
      setAuthError(msg);
    }
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

  if (authLoading) return (
    <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading...</div>
  );

  // Sign-in screen
  if (!user) return (
    <div style={{ maxWidth: 440, margin: "0 auto" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 40, textAlign: "center",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #E5E7EB" }}>
        <img src="/logo-icon.svg" alt="" style={{ width: 64, height: 64, marginBottom: 16 }} />
        <h2 style={{ margin: "0 0 8px", fontSize: 20, color: "#0A1F44" }}>Submit Program Info</h2>
        <p style={{ margin: "0 0 24px", fontSize: 14, color: "#64748b", lineHeight: 1.6 }}>
          Sign in to submit or update program information.
        </p>

        {/* Google sign-in */}
        <button onClick={handleGoogleSignIn} style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          width: "100%", padding: "12px", borderRadius: 8,
          border: "1px solid #E5E7EB", background: "#fff",
          color: "#0A1F44", fontWeight: 600, fontSize: 15, cursor: "pointer",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)", marginBottom: 20,
        }}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Sign in with Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
          <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>OR</span>
          <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
        </div>

        {/* Email/password */}
        <form onSubmit={handleEmailAuth}>
          <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)}
            required placeholder="Email address" style={{ ...inputStyle, marginBottom: 10 }} />
          <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)}
            required placeholder="Password" minLength={6} style={{ ...inputStyle, marginBottom: 16 }} />

          {authError && (
            <div style={{ marginBottom: 12, padding: "8px 12px", borderRadius: 8,
              background: "#fee2e2", color: "#dc2626", fontSize: 13, textAlign: "left" }}>
              {authError}
            </div>
          )}

          <button type="submit" style={{
            width: "100%", padding: "12px", borderRadius: 8, border: "none",
            background: "#0A1F44", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer",
            marginBottom: 12,
          }}>
            {authMode === "signup" ? "Create Account" : "Sign In"}
          </button>
        </form>

        <button onClick={() => { setAuthMode(authMode === "login" ? "signup" : "login"); setAuthError(null); }} style={{
          background: "none", border: "none", color: "#00CC00", fontWeight: 600,
          fontSize: 13, cursor: "pointer",
        }}>
          {authMode === "login" ? "Don't have an account? Create one" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 32,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #E5E7EB" }}>

        {/* Header with user info */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: "0 0 6px", fontSize: 20, color: "#0A1F44" }}>Submit Program Info</h2>
            <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>
              Are you a coach or school representative? Use this form to add a new program or update existing information.
            </p>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>{user.email}</div>
            <button onClick={() => signOut(auth)} style={{
              padding: "4px 12px", borderRadius: 6, border: "1px solid #E5E7EB",
              background: "#fff", color: "#64748b", fontSize: 12, cursor: "pointer",
            }}>Sign Out</button>
          </div>
        </div>

        {status === "sent" ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
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
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Request Type</label>
              <div style={{ display: "flex", gap: 10 }}>
                {[["update","Update Existing Program"],["add","Add New Program"]].map(([val, label]) => (
                  <button key={val} type="button" onClick={() => setRequestType(val)} style={{
                    flex: 1, padding: "10px", borderRadius: 8, cursor: "pointer", fontWeight: 600,
                    fontSize: 13, border: "2px solid",
                    borderColor: requestType === val ? "#00CC00" : "#E5E7EB",
                    background: requestType === val ? "#f0fde8" : "#fff",
                    color: requestType === val ? "#00CC00" : "#64748b",
                  }}>{label}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>School / Program Name *</label>
              {requestType === "update" ? (
                <select value={form.school} onChange={e => set("school", e.target.value)}
                  required style={inputStyle}>
                  <option value="">— Select a school —</option>
                  {[...new Set(programs.map(p => p.school).filter(Boolean))].sort()
                    .map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <input value={form.school} onChange={e => set("school", e.target.value)}
                  required placeholder="e.g. University of Example" style={inputStyle} />
              )}
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
                {requestType === "update" ? "What needs to be updated?" : "Program Details"} *
              </label>
              <textarea value={form.details} onChange={e => set("details", e.target.value)}
                required rows={5} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                placeholder={requestType === "update"
                  ? "Describe what information needs to be corrected or updated..."
                  : "Include conference, league, location, scholarship info, contact details, website, etc."
                } />
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
  );
}
