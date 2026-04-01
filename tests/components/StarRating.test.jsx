import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StarRating from "../../components/ui/StarRating.jsx";

describe("StarRating", () => {
  it("renders 5 stars", () => {
    const { container } = render(<StarRating value={0} />);
    const stars = container.querySelectorAll("span > span");
    expect(stars).toHaveLength(5);
  });

  it("highlights stars up to the value", () => {
    const { container } = render(<StarRating value={3} />);
    const stars = container.querySelectorAll("span > span");
    // Stars 1-3 should be gold (#FFB800), stars 4-5 should be gray (#E5E7EB)
    expect(stars[0].style.color).toBe("rgb(255, 184, 0)");
    expect(stars[1].style.color).toBe("rgb(255, 184, 0)");
    expect(stars[2].style.color).toBe("rgb(255, 184, 0)");
    expect(stars[3].style.color).toBe("rgb(229, 231, 235)");
    expect(stars[4].style.color).toBe("rgb(229, 231, 235)");
  });

  it("shows all gray stars when value is 0", () => {
    const { container } = render(<StarRating value={0} />);
    const stars = container.querySelectorAll("span > span");
    stars.forEach(star => {
      expect(star.style.color).toBe("rgb(229, 231, 235)");
    });
  });

  it("shows all gold stars when value is 5", () => {
    const { container } = render(<StarRating value={5} />);
    const stars = container.querySelectorAll("span > span");
    stars.forEach(star => {
      expect(star.style.color).toBe("rgb(255, 184, 0)");
    });
  });

  it("calls onChange with star number when clicked", () => {
    const onChange = vi.fn();
    const { container } = render(<StarRating value={0} onChange={onChange} />);
    const stars = container.querySelectorAll("span > span");
    fireEvent.click(stars[2]); // Click 3rd star
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("toggles off when clicking the already-selected star", () => {
    const onChange = vi.fn();
    const { container } = render(<StarRating value={3} onChange={onChange} />);
    const stars = container.querySelectorAll("span > span");
    fireEvent.click(stars[2]); // Click 3rd star (already selected)
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it("sets cursor to pointer when onChange is provided", () => {
    const { container } = render(<StarRating value={0} onChange={vi.fn()} />);
    const star = container.querySelector("span > span");
    expect(star.style.cursor).toBe("pointer");
  });

  it("sets cursor to default when onChange is not provided", () => {
    const { container } = render(<StarRating value={3} />);
    const star = container.querySelector("span > span");
    expect(star.style.cursor).toBe("default");
  });

  it("does not call onChange when no handler provided", () => {
    const { container } = render(<StarRating value={3} />);
    const stars = container.querySelectorAll("span > span");
    // Should not throw when clicking without onChange
    expect(() => fireEvent.click(stars[0])).not.toThrow();
  });

  it("accepts custom size", () => {
    const { container } = render(<StarRating value={1} size={24} />);
    const star = container.querySelector("span > span");
    expect(star.style.fontSize).toBe("24px");
  });
});
