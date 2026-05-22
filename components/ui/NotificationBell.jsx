import React, { useState, useEffect, useRef } from "react";
import { subscribeToNotifications, markNotificationRead, markAllNotificationsRead,
  requestBrowserNotificationPermission, showBrowserNotification, setupPushNotifications } from "../../utils/notifications.js";
import { timeAgo } from "../../utils/timeAgo.js";

const ICON_MAP = {
  message: "\u2709",      // envelope
  submission: "\u2709",   // envelope
  recruit_interest: "\u2B50", // star
};

export default function NotificationBell({ user, isMobile, onNavigate }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [permissionAsked, setPermissionAsked] = useState(false);
  const prevCountRef = useRef(0);
  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Subscribe to notifications
  useEffect(() => {
    if (!user) { setNotifications([]); return; }
    const unsub = subscribeToNotifications(user.uid, setNotifications);
    return unsub;
  }, [user]);

  // Request browser notification permission on first interaction
  useEffect(() => {
    if (!user || permissionAsked) return;
    if ("Notification" in window && Notification.permission === "default") {
      // Ask after a short delay so it doesn't feel aggressive
      const timer = setTimeout(() => {
        requestBrowserNotificationPermission();
        setupPushNotifications(user.uid).catch(() => {});
        setPermissionAsked(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [user, permissionAsked]);

  // Show browser notification when new notifications arrive
  useEffect(() => {
    if (notifications.length === 0) return;
    const currentUnread = notifications.filter(n => !n.read).length;
    if (currentUnread > prevCountRef.current && prevCountRef.current >= 0) {
      const newest = notifications.find(n => !n.read);
      if (newest) {
        showBrowserNotification(
          newest.title || "New notification",
          newest.body || "",
          () => {
            if (newest.link && onNavigate) onNavigate(newest.link);
          }
        );
      }
    }
    prevCountRef.current = currentUnread;
  }, [notifications, onNavigate]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!user) return null;

  function handleClickNotification(n) {
    if (!n.read) markNotificationRead(n.id).catch(() => {});
    if (n.link && onNavigate) {
      onNavigate(n.link);
    }
    setOpen(false);
  }

  function handleMarkAllRead() {
    markAllNotificationsRead(user.uid).catch(() => {});
  }

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: "relative",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: isMobile ? 4 : 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <svg width={isMobile ? 20 : 22} height={isMobile ? 20 : 22} viewBox="0 0 24 24" fill="none"
          stroke="rgba(255,255,255,0.85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: 0, right: 0,
            minWidth: 16, height: 16, borderRadius: "50%",
            background: "#00CC00", color: "#0A1F44",
            fontSize: 10, fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 3px",
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop for mobile */}
          {isMobile && (
            <div onClick={() => setOpen(false)} style={{
              position: "fixed", inset: 0, zIndex: 998,
            }} />
          )}
          <div style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 1000,
            background: "#fff", borderRadius: 12, overflow: "hidden",
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)", border: "1px solid #E5E7EB",
            width: isMobile ? "calc(100vw - 32px)" : 340,
            maxWidth: 380,
            maxHeight: 420, display: "flex", flexDirection: "column",
          }}>
            {/* Header */}
            <div style={{
              padding: "12px 16px", borderBottom: "1px solid #E5E7EB",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontWeight: 800, fontSize: 14, color: "#0A1F44" }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} style={{
                  background: "none", border: "none", color: "#1a56db",
                  fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0,
                }}>
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification list */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {notifications.length === 0 ? (
                <div style={{
                  padding: "40px 16px", textAlign: "center",
                  color: "#94a3b8", fontSize: 13,
                }}>
                  No notifications yet
                </div>
              ) : (
                notifications.map(n => (
                  <button
                    key={n.id}
                    onClick={() => handleClickNotification(n)}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 10,
                      padding: "10px 16px", width: "100%",
                      background: n.read ? "#fff" : "#f0f7ff",
                      border: "none", borderBottom: "1px solid #f1f5f9",
                      cursor: "pointer", textAlign: "left",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = n.read ? "#f8fafc" : "#e0efff"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = n.read ? "#fff" : "#f0f7ff"; }}
                  >
                    <span style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>
                      {ICON_MAP[n.type] || "\u2709"}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: n.read ? 500 : 700,
                        color: "#0A1F44",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {n.title || "Notification"}
                      </div>
                      {n.body && (
                        <div style={{
                          fontSize: 12, color: "#64748b", marginTop: 2,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {n.body}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>
                        {timeAgo(n.createdAt)}
                      </div>
                    </div>
                    {!n.read && (
                      <span style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: "#1a56db", flexShrink: 0, marginTop: 6,
                      }} />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
