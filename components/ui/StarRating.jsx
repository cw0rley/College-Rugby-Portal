import React, { useState } from "react";

export default function StarRating({ value = 0, onChange, size = 16 }) {
  const [hover, setHover] = useState(0);

  return (
    <span style={{ display: "inline-flex", gap: 2 }} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map(star => (
        <span
          key={star}
          onClick={onChange ? (e) => { e.stopPropagation(); onChange(star === value ? 0 : star); } : undefined}
          onMouseEnter={() => onChange && setHover(star)}
          style={{
            cursor: onChange ? "pointer" : "default",
            fontSize: size,
            lineHeight: 1,
            color: star <= (hover || value) ? "#FFB800" : "#E5E7EB",
            transition: "color 0.1s",
            userSelect: "none",
          }}
        >
          &#9733;
        </span>
      ))}
    </span>
  );
}
