import React, { useState } from "react";
import Avatar from "./Avatar.jsx";

function getDomain(url) {
  if (!url) return null;
  try {
    return new URL(url.startsWith("http") ? url : "https://" + url).hostname.replace(/^www\./, "");
  } catch { return null; }
}

export default function SchoolLogo({ program, size = 44 }) {
  const [imgError, setImgError] = useState(false);

  // Priority: 1) logoUrl from Firestore, 2) Google favicon from website domain, 3) Avatar fallback
  const logoUrl = program.logoUrl;
  const domain = getDomain(program.website);
  const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : null;
  const src = logoUrl || faviconUrl;

  if (!src || imgError) {
    return <Avatar name={program.school} size={size} />;
  }

  return (
    <img
      src={src}
      alt={program.school}
      onError={() => setImgError(true)}
      style={{
        width: size, height: size, borderRadius: 8, objectFit: "contain",
        background: "#fff", flexShrink: 0,
      }}
    />
  );
}
