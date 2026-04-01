import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SchoolLogo from "../../components/ui/SchoolLogo.jsx";

describe("SchoolLogo", () => {
  it("renders img with logoUrl when available", () => {
    const program = { school: "Test U", logoUrl: "https://example.com/logo.png", website: "" };
    render(<SchoolLogo program={program} size={44} />);
    const img = screen.getByAltText("Test U");
    expect(img).toBeInTheDocument();
    expect(img.src).toBe("https://example.com/logo.png");
  });

  it("falls back to Google favicon when no logoUrl but website exists", () => {
    const program = { school: "Test U", logoUrl: "", website: "https://www.testuniversity.edu" };
    render(<SchoolLogo program={program} size={44} />);
    const img = screen.getByAltText("Test U");
    expect(img.src).toContain("google.com/s2/favicons");
    expect(img.src).toContain("testuniversity.edu");
  });

  it("renders Avatar fallback when no logo sources available", () => {
    const program = { school: "Test U", logoUrl: "", website: "" };
    const { container } = render(<SchoolLogo program={program} size={44} />);
    // Should render Avatar (a div with initials), not an img
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders Avatar fallback on image load error", () => {
    const program = { school: "Test U", logoUrl: "https://example.com/broken.png", website: "" };
    render(<SchoolLogo program={program} size={44} />);
    const img = screen.getByAltText("Test U");
    fireEvent.error(img);
    // After error, should no longer show the broken image
    expect(screen.queryByAltText("Test U")).not.toBeInTheDocument();
  });

  it("applies the size prop", () => {
    const program = { school: "Test U", logoUrl: "https://example.com/logo.png", website: "" };
    render(<SchoolLogo program={program} size={60} />);
    const img = screen.getByAltText("Test U");
    expect(img.style.width).toBe("60px");
    expect(img.style.height).toBe("60px");
  });
});
