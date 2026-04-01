import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Badge from "../../components/ui/Badge.jsx";

describe("Badge", () => {
  it("renders the label text", () => {
    render(<Badge label="D1A" />);
    expect(screen.getByText("D1A")).toBeInTheDocument();
  });

  it("uses the provided color for styling", () => {
    render(<Badge label="Men's" color="#0A1F44" />);
    const badge = screen.getByText("Men's");
    expect(badge.style.color).toBe("rgb(10, 31, 68)");
  });

  it("defaults to navy color when no color provided", () => {
    render(<Badge label="Test" />);
    const badge = screen.getByText("Test");
    expect(badge.style.color).toBe("rgb(10, 31, 68)");
  });

  it("renders as a span element", () => {
    render(<Badge label="Tag" />);
    expect(screen.getByText("Tag").tagName).toBe("SPAN");
  });
});
