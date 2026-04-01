import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";

const ToastContext = createContext(null);

const MAX_TOASTS = 3;
const AUTO_DISMISS_MS = 4000;

const typeStyles = {
  success: { background: "#0A1F44", borderLeft: "4px solid #00CC00", icon: "\u2713" },
  error: { background: "#0A1F44", borderLeft: "4px solid #dc2626", icon: "\u2717" },
  info: { background: "#0A1F44", borderLeft: "4px solid #3b82f6", icon: "\u2139" },
};

const iconColors = {
  success: "#00CC00",
  error: "#dc2626",
  info: "#3b82f6",
};

let toastIdCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const removeToast = useCallback((id) => {
    // Mark as exiting for animation
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      if (timersRef.current[id]) {
        clearTimeout(timersRef.current[id]);
        delete timersRef.current[id];
      }
    }, 300);
  }, []);

  const addToast = useCallback((message, type = "info") => {
    const id = ++toastIdCounter;
    setToasts(prev => {
      const next = [...prev, { id, message, type, exiting: false }];
      // Keep only the last MAX_TOASTS
      if (next.length > MAX_TOASTS) {
        const removed = next.shift();
        if (timersRef.current[removed.id]) {
          clearTimeout(timersRef.current[removed.id]);
          delete timersRef.current[removed.id];
        }
      }
      return next;
    });
    timersRef.current[id] = setTimeout(() => removeToast(id), AUTO_DISMISS_MS);
    return id;
  }, [removeToast]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(clearTimeout);
    };
  }, []);

  const isMobile = typeof window !== "undefined" && window.innerWidth <= 900;

  const containerStyle = {
    position: "fixed",
    bottom: 24,
    right: isMobile ? "50%" : 24,
    transform: isMobile ? "translateX(50%)" : "none",
    zIndex: 9999,
    display: "flex",
    flexDirection: "column-reverse",
    gap: 10,
    pointerEvents: "none",
    width: isMobile ? "calc(100% - 32px)" : "auto",
    maxWidth: 400,
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div style={containerStyle}>
        {toasts.map((toast) => {
          const ts = typeStyles[toast.type] || typeStyles.info;
          return (
            <div
              key={toast.id}
              style={{
                background: ts.background,
                borderLeft: ts.borderLeft,
                borderRadius: 8,
                padding: "12px 16px",
                color: "#F4F4F4",
                fontSize: 14,
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 10,
                boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
                pointerEvents: "auto",
                opacity: toast.exiting ? 0 : 1,
                transform: toast.exiting ? "translateY(20px)" : "translateY(0)",
                transition: "opacity 0.3s ease, transform 0.3s ease",
                animation: "toastSlideIn 0.3s ease",
              }}
            >
              <span style={{
                fontSize: 16, fontWeight: 700, lineHeight: 1, flexShrink: 0,
                color: iconColors[toast.type] || iconColors.info,
              }}>{ts.icon}</span>
              <span style={{ flex: 1 }}>{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                style={{
                  background: "none", border: "none", color: "#94a3b8",
                  fontSize: 18, cursor: "pointer", lineHeight: 1, padding: 0,
                  flexShrink: 0,
                }}
              >&times;</button>
            </div>
          );
        })}
      </div>
      {/* Inject keyframe animation */}
      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
