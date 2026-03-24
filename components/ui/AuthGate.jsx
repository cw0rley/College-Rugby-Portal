import React, { useState } from "react";
import { signInWithPopup, signInWithRedirect, getRedirectResult,
  createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth, googleProvider } from "../../firebase.js";

export default function AuthGate({ user, title, description, children }) {
  const [authMode, setAuthMode] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  async function handleGoogleSignIn() {
    setAuthError(null);
    try { await signInWithPopup(auth, googleProvider); }
    catch (err) { signInWithRedirect(auth, googleProvider); }
  }

  async function handleEmailAuth(e) {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
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
    } finally {
      setAuthLoading(false);
    }
  }

  if (user) return <>{children}</>;

  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 8,
    border: "1px solid #E5E7EB", fontSize: 14, boxSizing: "border-box",
    outline: "none", color: "#0A1F44",
  };

  return (
    <div style={{ maxWidth: 440, margin: "0 auto" }}>
      <div style={{
        background: "#fff", borderRadius: 16, padding: 40, textAlign: "center",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #E5E7EB",
      }}>
        <img src="/logo-icon.svg" alt="" style={{ width: 48, height: 48, marginBottom: 16 }} />
        <h2 style={{ margin: "0 0 8px", fontSize: 20, color: "#0A1F44" }}>{title}</h2>
        <p style={{ margin: "0 0 24px", fontSize: 14, color: "#64748b", lineHeight: 1.6 }}>
          {description}
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

          <button type="submit" disabled={authLoading} style={{
            width: "100%", padding: "12px", borderRadius: 8, border: "none",
            background: authLoading ? "#E5E7EB" : "#0A1F44", color: "#fff", fontWeight: 700, fontSize: 15,
            cursor: authLoading ? "default" : "pointer",
            marginBottom: 12,
          }}>
            {authLoading ? "Please wait..." : authMode === "signup" ? "Create Account" : "Sign In"}
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
}
