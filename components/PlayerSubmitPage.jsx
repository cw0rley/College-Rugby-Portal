import React, { useState, useEffect } from "react";
import { collection, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { db, auth, googleProvider } from "../firebase.js";

const POSITIONS = [
  "Loosehead Prop", "Hooker", "Tighthead Prop",
  "Lock", "Blindside Flanker", "Openside Flanker", "Number 8",
  "Scrum Half", "Fly Half", "Inside Center", "Outside Center",
  "Left Wing", "Right Wing", "Fullback",
];

const GRADUATION_YEARS = [];
const currentYear = new Date().getFullYear();
for (let y = currentYear; y <= currentYear + 5; y++) GRADUATION_YEARS.push(y);

const EMPTY_FORM = {
  firstName: "", lastName: "", email: "", phone: "",
  graduationYear: "", highSchool: "", city: "", state: "",
  gpa: "", sat: "", act: "", intendedMajor: "",
  position: "", secondaryPosition: "", yearsPlaying: "",
  currentClub: "", coachName: "", coachEmail: "",
  height: "", weight: "",
  selections: "", achievements: "",
  preferredRegion: "", interestedSchools: "", notes: "",
};

export default function PlayerSubmitPage() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [status, setStatus] = useState(null);
  const [hasExisting, setHasExisting] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    getRedirectResult(auth).catch(() => {});
    return onAuthStateChanged(auth, u => { setUser(u); setAuthLoading(false); });
  }, []);

  // Load existing profile when user signs in
  useEffect(() => {
    if (!user) return;
    setLoadingProfile(true);
    getDoc(doc(db, "playerProfiles", user.uid)).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        setForm(f => {
          const merged = { ...f };
          Object.keys(EMPTY_FORM).forEach(k => { if (data[k] !== undefined) merged[k] = data[k]; });
          return merged;
        });
        setHasExisting(true);
      } else {
        // Pre-fill email from Google account
        setForm(f => ({ ...f, email: user.email || "" }));
      }
      setLoadingProfile(false);
    }).catch(() => setLoadingProfile(false));
  }, [user]);

  function set(field, val) {
    setForm(f => ({ ...f, [field]: val }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("sending");
    try {
      const clean = Object.fromEntries(
        Object.entries(form).filter(([, v]) => v !== undefined && v !== "")
      );
      await setDoc(doc(db, "playerProfiles", user.uid), {
        ...clean,
        uid: user.uid,
        updatedAt: serverTimestamp(),
        ...(hasExisting ? {} : { createdAt: serverTimestamp() }),
      }, { merge: true });
      setHasExisting(true);
      setStatus("sent");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
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

  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 8,
    border: "1px solid #E5E7EB", fontSize: 14, boxSizing: "border-box",
    outline: "none", color: "#0A1F44",
  };
  const labelStyle = {
    display: "block", fontSize: 12, fontWeight: 700,
    color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em",
  };
  const sectionStyle = {
    fontSize: 16, fontWeight: 800, color: "#0A1F44", margin: "28px 0 14px",
    paddingBottom: 8, borderBottom: "2px solid #0A1F44",
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
        <h2 style={{ margin: "0 0 8px", fontSize: 20, color: "#0A1F44" }}>Player Profile</h2>
        <p style={{ margin: "0 0 24px", fontSize: 14, color: "#64748b", lineHeight: 1.6 }}>
          Sign in to create or update your player profile.
          Your profile will be saved so you can come back and edit it anytime.
        </p>

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

  if (loadingProfile) return (
    <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading your profile...</div>
  );

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 32,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #E5E7EB" }}>

        {/* Header with user info */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: "0 0 6px", fontSize: 20, color: "#0A1F44" }}>
              {hasExisting ? "Edit Your Profile" : "Create Your Profile"}
            </h2>
            <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>
              {hasExisting
                ? "Update your info below — changes are saved instantly."
                : "Get on the radar of college rugby programs. Fill out your profile and let coaches find you."}
            </p>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>{user.email}</div>
            <button onClick={() => { signOut(auth); setForm({ ...EMPTY_FORM }); setHasExisting(false); setStatus(null); }} style={{
              padding: "4px 12px", borderRadius: 6, border: "1px solid #E5E7EB",
              background: "#fff", color: "#64748b", fontSize: 12, cursor: "pointer",
            }}>Sign Out</button>
          </div>
        </div>

        {status === "sent" ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#0A1F44", marginBottom: 8 }}>
              {hasExisting ? "Profile Updated!" : "Profile Created!"}
            </div>
            <div style={{ fontSize: 14, color: "#64748b", marginBottom: 24 }}>
              Your profile has been saved. You can come back anytime to update it.
            </div>
            <button onClick={() => setStatus(null)} style={{
              padding: "10px 24px", borderRadius: 8, border: "none", background: "#00FF00",
              color: "#0A1F44", fontWeight: 600, fontSize: 14, cursor: "pointer",
            }}>Edit Profile</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>

            {/* Personal Info */}
            <div style={sectionStyle}>Personal Information</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>First Name *</label>
                <input value={form.firstName} onChange={e => set("firstName", e.target.value)}
                  required placeholder="First name" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Last Name *</label>
                <input value={form.lastName} onChange={e => set("lastName", e.target.value)}
                  required placeholder="Last name" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Email *</label>
                <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                  required placeholder="your@email.com" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input type="tel" value={form.phone} onChange={e => set("phone", e.target.value)}
                  placeholder="Optional" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>High School *</label>
                <input value={form.highSchool} onChange={e => set("highSchool", e.target.value)}
                  required placeholder="School name" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>City, State</label>
                <input value={form.city} onChange={e => set("city", e.target.value)}
                  placeholder="e.g. Austin, TX" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Graduation Year *</label>
                <select value={form.graduationYear} onChange={e => set("graduationYear", e.target.value)}
                  required style={inputStyle}>
                  <option value="">— Select —</option>
                  {GRADUATION_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {/* Academics */}
            <div style={sectionStyle}>Academics</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>GPA</label>
                <input type="number" step="0.01" min="0" max="5" value={form.gpa}
                  onChange={e => set("gpa", e.target.value)} placeholder="e.g. 3.5" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>SAT</label>
                <input type="number" min="400" max="1600" value={form.sat}
                  onChange={e => set("sat", e.target.value)} placeholder="e.g. 1200" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>ACT</label>
                <input type="number" min="1" max="36" value={form.act}
                  onChange={e => set("act", e.target.value)} placeholder="e.g. 28" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Intended Major</label>
                <input value={form.intendedMajor} onChange={e => set("intendedMajor", e.target.value)}
                  placeholder="e.g. Business" style={inputStyle} />
              </div>
            </div>

            {/* Rugby */}
            <div style={sectionStyle}>Rugby</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Primary Position *</label>
                <select value={form.position} onChange={e => set("position", e.target.value)}
                  required style={inputStyle}>
                  <option value="">— Select —</option>
                  {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Secondary Position</label>
                <select value={form.secondaryPosition} onChange={e => set("secondaryPosition", e.target.value)}
                  style={inputStyle}>
                  <option value="">— Select —</option>
                  {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Years Playing</label>
                <input type="number" min="0" max="20" value={form.yearsPlaying}
                  onChange={e => set("yearsPlaying", e.target.value)} placeholder="e.g. 4" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Current Club / Team</label>
                <input value={form.currentClub} onChange={e => set("currentClub", e.target.value)}
                  placeholder="e.g. Austin Huns Youth" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Height / Weight</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={form.height} onChange={e => set("height", e.target.value)}
                    placeholder={"e.g. 6'1\""} style={inputStyle} />
                  <input value={form.weight} onChange={e => set("weight", e.target.value)}
                    placeholder="e.g. 195 lbs" style={inputStyle} />
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Coach Name</label>
                <input value={form.coachName} onChange={e => set("coachName", e.target.value)}
                  placeholder="Current coach" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Coach Email</label>
                <input type="email" value={form.coachEmail} onChange={e => set("coachEmail", e.target.value)}
                  placeholder="coach@email.com" style={inputStyle} />
              </div>
            </div>

            {/* Selections & Achievements */}
            <div style={sectionStyle}>Selections & Achievements</div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Representative Selections</label>
              <textarea value={form.selections} onChange={e => set("selections", e.target.value)}
                rows={3} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                placeholder="e.g. State Select Side 2025, Regional All-Star 2024, ODP Camp 2024..." />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Rugby Achievements</label>
              <textarea value={form.achievements} onChange={e => set("achievements", e.target.value)}
                rows={3} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                placeholder="e.g. State Championship MVP, Leading try scorer 2024-25 season..." />
            </div>

            {/* Preferences */}
            <div style={sectionStyle}>College Preferences</div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Preferred Region</label>
              <input value={form.preferredRegion} onChange={e => set("preferredRegion", e.target.value)}
                placeholder="e.g. Northeast, West Coast, no preference" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Schools You're Interested In</label>
              <textarea value={form.interestedSchools} onChange={e => set("interestedSchools", e.target.value)}
                rows={2} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                placeholder="List any specific schools or programs you're considering..." />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Anything Else?</label>
              <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
                rows={3} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                placeholder="Anything else coaches should know — video links, availability, etc." />
            </div>

            {status === "error" && (
              <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8,
                background: "#fee2e2", color: "#dc2626", fontSize: 13 }}>
                Something went wrong. Please try again.
              </div>
            )}

            <button type="submit" disabled={status === "sending"} style={{
              width: "100%", padding: "12px", borderRadius: 8, border: "none",
              background: status === "sending" ? "#E5E7EB" : "#00FF00",
              color: "#0A1F44", fontWeight: 700, fontSize: 15, cursor: status === "sending" ? "default" : "pointer",
            }}>
              {status === "sending" ? "Saving..." : hasExisting ? "Update Profile" : "Submit Profile"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
