import React from "react";

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const isMobile = window.innerWidth <= 900;

  // Build page numbers to show
  const pages = [];
  const maxVisible = isMobile ? 3 : 7;
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);

  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push("...");
  }
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages) {
    if (end < totalPages - 1) pages.push("...");
    pages.push(totalPages);
  }

  const btnStyle = {
    padding: isMobile ? "6px 10px" : "6px 12px",
    borderRadius: 6,
    border: "1px solid #E5E7EB",
    background: "#fff",
    color: "#475569",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
  };

  const activeStyle = {
    ...btnStyle,
    background: "#0A1F44",
    color: "#fff",
    border: "1px solid #0A1F44",
  };

  const disabledStyle = {
    ...btnStyle,
    opacity: 0.4,
    cursor: "default",
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      gap: 4, padding: "16px 0", flexWrap: "wrap",
    }}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        style={currentPage === 1 ? disabledStyle : btnStyle}
      >
        {isMobile ? "<" : "Prev"}
      </button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`dots-${i}`} style={{ padding: "6px 4px", color: "#94a3b8", fontSize: 13 }}>...</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            style={p === currentPage ? activeStyle : btnStyle}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        style={currentPage === totalPages ? disabledStyle : btnStyle}
      >
        {isMobile ? ">" : "Next"}
      </button>
    </div>
  );
}

export function usePagination(items, perPage = 25) {
  const [page, setPage] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paged = items.slice((safePage - 1) * perPage, safePage * perPage);

  return { page: safePage, totalPages, paged, setPage };
}
