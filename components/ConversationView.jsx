import React, { useState, useEffect, useRef } from "react";
import { subscribeToMessages, sendMessage, markAsRead } from "../utils/messaging.js";

export default function ConversationView({ conversationId, conversation, user, onBack, containerHeight }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesRef = useRef(null);

  const otherUid = conversation?.participants?.find(uid => uid !== user.uid);
  const otherInfo = conversation?.participantInfo?.[otherUid] || {};
  const otherName = otherInfo.name || "Unknown";

  useEffect(() => {
    if (!conversationId) return;
    const unsub = subscribeToMessages(conversationId, setMessages);
    return unsub;
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || !user) return;
    markAsRead(conversationId, user.uid).catch(() => {});
  }, [conversationId, user, messages.length]);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const myName = user.displayName || user.email || "Someone";
      await sendMessage(conversationId, user.uid, otherUid, text.trim(), myName);
      setText("");
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function formatTime(ts) {
    if (!ts) return "";
    const date = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
    const diff = Date.now() - date;
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return date.toLocaleDateString([], { month: "short", day: "numeric" }) + " " +
      date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  // Messages area fills remaining space via flex

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px", borderBottom: "1px solid #E5E7EB",
        display: "flex", alignItems: "center", gap: 12,
        background: "#fff", height: 50, boxSizing: "border-box",
      }}>
        {onBack && (
          <button onClick={onBack} style={{
            background: "none", border: "none", cursor: "pointer", padding: 4,
            fontSize: 18, color: "#64748b", display: "flex", alignItems: "center",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div style={{
          width: 36, height: 36, borderRadius: "50%", background: "#0A1F44",
          color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 800, fontSize: 14, flexShrink: 0,
        }}>
          {(otherName || "?")[0].toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#0A1F44" }}>{otherName}</div>
          <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "capitalize" }}>
            {otherInfo.role || ""}
          </div>
        </div>
      </div>

      {/* Messages area — fixed height */}
      <div ref={messagesRef} style={{
        flex: "1 1 0", minHeight: 0, overflowY: "auto", padding: 16,
        display: "flex", flexDirection: "column", gap: 8, background: "#f8fafc",
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8", fontSize: 14 }}>
            No messages yet. Start the conversation!
          </div>
        )}
        {messages.map(msg => {
          const isMine = msg.senderId === user.uid;
          return (
            <div key={msg.id} style={{
              display: "flex", justifyContent: isMine ? "flex-end" : "flex-start",
            }}>
              <div style={{
                maxWidth: "75%", padding: "10px 14px", borderRadius: 12,
                background: isMine ? "#0A1F44" : "#fff",
                color: isMine ? "#fff" : "#0A1F44",
                boxShadow: isMine ? "none" : "0 1px 3px rgba(0,0,0,0.06)",
                border: isMine ? "none" : "1px solid #E5E7EB",
              }}>
                <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {msg.text}
                </div>
                <div style={{
                  fontSize: 10, marginTop: 4, textAlign: "right",
                  color: isMine ? "rgba(255,255,255,0.6)" : "#94a3b8",
                }}>
                  {formatTime(msg.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input area — fixed height */}
      <div style={{
        padding: 12, borderTop: "1px solid #E5E7EB", background: "#fff",
        display: "flex", gap: 8, alignItems: "center", height: 50, boxSizing: "border-box",
      }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          style={{
            flex: 1, padding: "8px 14px", borderRadius: 10,
            border: "1px solid #E5E7EB", fontSize: 14,
            outline: "none", color: "#0A1F44", fontFamily: "inherit",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          style={{
            padding: "8px 18px", borderRadius: 10, border: "none",
            background: text.trim() ? "#0A1F44" : "#e2e8f0",
            color: text.trim() ? "#fff" : "#94a3b8",
            fontWeight: 700, fontSize: 14, cursor: text.trim() ? "pointer" : "default",
            flexShrink: 0,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
