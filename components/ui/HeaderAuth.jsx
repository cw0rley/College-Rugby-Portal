import React, { useState } from "react";
import { signInWithPopup, signInWithRedirect, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, sendEmailVerification, signOut, updateProfile } from "firebase/auth";
import { auth, googleProvider } from "../../firebase.js";

export default function HeaderAuth({ user, isMobile }) {
  const [showForm, setShowForm] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  async function handleGoogle() {
    setError(null);
    const isMobile = window.innerWidth <= 900 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) { signInWithRedirect(auth, googleProvider); return; }
    try { await signInWithPopup(auth, googleProvider); setShowForm(false); }
    catch { signInWithRedirect(auth, googleProvider); }
  }

  async function handleEmailAuth(e) {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      if (authMode === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (name.trim()) {
          await updateProfile(cred.user, { displayName: name.trim() });
        }
        sendEmailVerification(cred.user).catch(() => {});
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setShowForm(false);
      setName("");
      setEmail("");
      setPassword("");
    } catch (err) {
      const msg = err.code === "auth/email-already-in-use" ? "Account exists. Try signing in."
        : err.code === "auth/wrong-password" || err.code === "auth/invalid-credential" ? "Incorrect password."
        : err.code === "auth/user-not-found" ? "No account found. Try creating one."
        : err.code === "auth/weak-password" ? "Password must be at least 6 characters."
        : err.code === "auth/invalid-email" ? "Invalid email address."
        : "Sign-in failed. Try again.";
      setError(msg);
    } finally { setSending(false); }
  }

  if (!user) {
    return (
      <div style={{ position: "relative" }}>
        <button onClick={() => setShowForm(!showForm)} style={{
          padding: isMobile ? "6px 14px" : "7px 18px",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.3)",
          background: showForm ? "rgba(255,255,255,0.15)" : "transparent",
          color: "#fff",
          fontWeight: 600,
          fontSize: isMobile ? 12 : 13,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}>
          Sign In
        </button>

        {showForm && (
          <>
            {/* Backdrop */}
            <div onClick={() => setShowForm(false)} style={{
              position: "fixed", inset: 0, zIndex: 999,
            }} />
            {/* Dropdown form */}
            <div style={{
              position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 1000,
              background: "#fff", borderRadius: 12, padding: 20, width: 300,
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)", border: "1px solid #E5E7EB",
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#0A1F44", marginBottom: 14 }}>
                {authMode === "signup" ? "Create Account" : "Sign In"}
              </div>

              {/* Google */}
              <button onClick={handleGoogle} style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                width: "100%", padding: "10px", borderRadius: 8,
                border: "1px solid #E5E7EB", background: "#fff",
                color: "#0A1F44", fontWeight: 600, fontSize: 13, cursor: "pointer",
                marginBottom: 14,
              }}>
                <svg width="16" height="16" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Sign in with Google
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
                <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>OR</span>
                <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
              </div>

              {/* Email/password */}
              <form onSubmit={handleEmailAuth}>
                {authMode === "signup" && (
                  <input type="text" value={name} onChange={e => setName(e.target.value)}
                    required placeholder="Full name" style={{
                      width: "100%", padding: "8px 10px", borderRadius: 6,
                      border: "1px solid #E5E7EB", fontSize: 13, marginBottom: 8,
                      boxSizing: "border-box", outline: "none", color: "#0A1F44",
                    }} />
                )}
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required placeholder="Email" style={{
                    width: "100%", padding: "8px 10px", borderRadius: 6,
                    border: "1px solid #E5E7EB", fontSize: 13, marginBottom: 8,
                    boxSizing: "border-box", outline: "none", color: "#0A1F44",
                  }} />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  required placeholder="Password" minLength={6} style={{
                    width: "100%", padding: "8px 10px", borderRadius: 6,
                    border: "1px solid #E5E7EB", fontSize: 13, marginBottom: 10,
                    boxSizing: "border-box", outline: "none", color: "#0A1F44",
                  }} />

                {error && (
                  <div style={{ marginBottom: 8, padding: "6px 10px", borderRadius: 6,
                    background: "#fee2e2", color: "#dc2626", fontSize: 12 }}>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={sending} style={{
                  width: "100%", padding: "9px", borderRadius: 6, border: "none",
                  background: "#0A1F44", color: "#fff", fontWeight: 700, fontSize: 13,
                  cursor: sending ? "default" : "pointer", marginBottom: 10,
                }}>
                  {sending ? "..." : authMode === "signup" ? "Create Account" : "Sign In"}
                </button>
              </form>

              <button onClick={() => { setAuthMode(authMode === "login" ? "signup" : "login"); setError(null); }} style={{
                background: "none", border: "none", color: "#00CC00", fontWeight: 600,
                fontSize: 12, cursor: "pointer", width: "100%", textAlign: "center",
              }}>
                {authMode === "login" ? "Need an account? Create one" : "Have an account? Sign in"}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  const emailDisplay = user.email
    ? (user.email.length > (isMobile ? 18 : 24) ? user.email.slice(0, isMobile ? 15 : 21) + "..." : user.email)
    : "";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: isMobile ? 8 : 10,
      flexShrink: 0,
    }}>
      <span style={{
        fontSize: isMobile ? 11 : 12, color: "rgba(255,255,255,0.7)",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        maxWidth: isMobile ? 120 : 180,
      }}>
        {emailDisplay}
      </span>
      <button onClick={() => signOut(auth)} style={{
        padding: isMobile ? "4px 10px" : "5px 14px",
        borderRadius: 6,
        border: "1px solid rgba(255,255,255,0.25)",
        background: "transparent",
        color: "rgba(255,255,255,0.8)",
        fontWeight: 600,
        fontSize: isMobile ? 11 : 12,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}>
        Sign Out
      </button>
    </div>
  );
}
