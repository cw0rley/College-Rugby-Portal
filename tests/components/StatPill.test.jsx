import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StatPill from "../../components/ui/StatPill.jsx";

describe("StatPill", () => {
  it("renders label and value", () => {
    render(<StatPill label="GPA" value="3.56" />);
    expect(screen.getByText("GPA")).toBeInTheDocument();
    expect(screen.getByText("3.56")).toBeInTheDocument();
  });

  it("renders when value is 0", () => {
    render(<StatPill label="Rank" value={0} />);
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("Rank")).toBeInTheDocument();
  });

  it("returns null when value is null", () => {
    const { container } = render(<StatPill label="SAT" value={null} />);
    expect(container.innerHTML).toBe("");
  });

  it("returns null when value is undefined", () => {
    const { container } = render(<StatPill label="SAT" value={undefined} />);
    expect(container.innerHTML).toBe("");
  });

  it("returns null when value is empty string", () => {
    const { container } = render(<StatPill label="SAT" value="" />);
    expect(container.innerHTML).toBe("");
  });
});
