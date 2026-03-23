import React from "react";

export default function RugbyBall({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="32" cy="32" rx="22" ry="14" transform="rotate(-35 32 32)"
        fill="#b45309" stroke="#92400e" strokeWidth="1.5" />
      <ellipse cx="32" cy="32" rx="16" ry="9" transform="rotate(-35 32 32)"
        fill="none" stroke="#fbbf24" strokeWidth="1" strokeDasharray="3 2" />
      {/* lace */}
      <line x1="29" y1="25" x2="35" y2="39" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <line x1="26" y1="29" x2="38" y2="35" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="27" y1="26" x2="37" y2="38" stroke="#fff" strokeWidth="1" strokeLinecap="round" strokeDasharray="2 2" />
      <ellipse cx="32" cy="32" rx="22" ry="14" transform="rotate(-35 32 32)"
        fill="none" stroke="#92400e" strokeWidth="1.5" />
    </svg>
  );
}
