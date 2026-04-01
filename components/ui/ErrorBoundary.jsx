import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          minHeight: 300, padding: 40, textAlign: "center",
          background: "#F4F4F4", borderRadius: 12, margin: "24px auto", maxWidth: 500,
        }}>
          <div style={{
            fontSize: 48, marginBottom: 16, lineHeight: 1,
          }}>&#9888;</div>
          <h2 style={{
            margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: "#0A1F44",
            fontFamily: "'Montserrat', 'Inter', system-ui, sans-serif",
          }}>Something went wrong</h2>
          <p style={{
            margin: "0 0 24px", fontSize: 14, color: "#64748b", lineHeight: 1.5,
          }}>
            An unexpected error occurred. Please try reloading the page.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: "10px 28px", borderRadius: 8, border: "none",
              background: "#0A1F44", color: "#F4F4F4", fontWeight: 700,
              fontSize: 14, cursor: "pointer", transition: "opacity 0.15s",
            }}
            onMouseOver={e => e.currentTarget.style.opacity = "0.85"}
            onMouseOut={e => e.currentTarget.style.opacity = "1"}
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
