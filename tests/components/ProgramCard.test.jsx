import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProgramCard from "../../components/ProgramCard.jsx";

const mockProgram = {
  id: "prog1",
  school: "Penn State University",
  city: "State College",
  state: "PA",
  gender: "mens",
  league: "D1A",
  conference: "Big Ten",
  gpa: 3.56,
  sat: 1200,
  inStateTuition: 19286,
  rugbyRanking: 5,
  rugbyScholarship: true,
  schoolFunded: false,
  featured: false,
  logoUrl: "",
  website: "https://psu.edu",
  usNewsRank: 60,
  usNewsUrl: "",
  _contacts: [],
};

describe("ProgramCard", () => {
  it("renders school name", () => {
    render(<ProgramCard program={mockProgram} onClick={vi.fn()} />);
    expect(screen.getByText("Penn State University")).toBeInTheDocument();
  });

  it("renders city", () => {
    render(<ProgramCard program={mockProgram} onClick={vi.fn()} />);
    expect(screen.getByText("State College")).toBeInTheDocument();
  });

  it("renders gender badge as Men's for mens", () => {
    render(<ProgramCard program={mockProgram} onClick={vi.fn()} />);
    expect(screen.getByText("Men's")).toBeInTheDocument();
  });

  it("renders Women's for women's program", () => {
    const womensProgram = { ...mockProgram, gender: "womens" };
    render(<ProgramCard program={womensProgram} onClick={vi.fn()} />);
    expect(screen.getByText("Women's")).toBeInTheDocument();
  });

  it("renders league badge", () => {
    render(<ProgramCard program={mockProgram} onClick={vi.fn()} />);
    expect(screen.getByText("D1A")).toBeInTheDocument();
  });

  it("renders scholarship badge when rugbyScholarship is true", () => {
    render(<ProgramCard program={mockProgram} onClick={vi.fn()} />);
    expect(screen.getByText(/Scholarship/)).toBeInTheDocument();
  });

  it("does not render scholarship badge when false", () => {
    const noScholarship = { ...mockProgram, rugbyScholarship: false };
    render(<ProgramCard program={noScholarship} onClick={vi.fn()} />);
    expect(screen.queryByText(/Scholarship/)).not.toBeInTheDocument();
  });

  it("renders GPA stat pill", () => {
    render(<ProgramCard program={mockProgram} onClick={vi.fn()} />);
    expect(screen.getByText("3.56")).toBeInTheDocument();
    expect(screen.getByText("GPA")).toBeInTheDocument();
  });

  it("renders rugby ranking", () => {
    render(<ProgramCard program={mockProgram} onClick={vi.fn()} />);
    expect(screen.getByText("#5")).toBeInTheDocument();
  });

  it("renders tuition as abbreviated", () => {
    render(<ProgramCard program={mockProgram} onClick={vi.fn()} />);
    expect(screen.getByText("$19k")).toBeInTheDocument();
  });

  it("calls onClick when card is clicked", () => {
    const onClick = vi.fn();
    render(<ProgramCard program={mockProgram} onClick={onClick} />);
    fireEvent.click(screen.getByText("Penn State University"));
    expect(onClick).toHaveBeenCalledWith(mockProgram);
  });

  it("renders featured badge when program is featured", () => {
    const featured = { ...mockProgram, featured: true };
    render(<ProgramCard program={featured} onClick={vi.fn()} />);
    expect(screen.getByText(/Featured/)).toBeInTheDocument();
  });

  it("renders favorite heart button when onToggleFavorite provided", () => {
    render(
      <ProgramCard program={mockProgram} onClick={vi.fn()} onToggleFavorite={vi.fn()} isFavorited={false} />
    );
    expect(screen.getByTitle("Add to favorites")).toBeInTheDocument();
  });

  it("calls onToggleFavorite when heart is clicked", () => {
    const onToggle = vi.fn();
    render(
      <ProgramCard program={mockProgram} onClick={vi.fn()} onToggleFavorite={onToggle} isFavorited={false} />
    );
    fireEvent.click(screen.getByTitle("Add to favorites"));
    expect(onToggle).toHaveBeenCalledWith("prog1");
  });

  it("shows 'Remove from favorites' title when favorited", () => {
    render(
      <ProgramCard program={mockProgram} onClick={vi.fn()} onToggleFavorite={vi.fn()} isFavorited={true} />
    );
    expect(screen.getByTitle("Remove from favorites")).toBeInTheDocument();
  });

  it("renders compare button when onToggleCompare provided", () => {
    render(
      <ProgramCard program={mockProgram} onClick={vi.fn()} onToggleCompare={vi.fn()} isComparing={false} />
    );
    expect(screen.getByText("Compare")).toBeInTheDocument();
  });

  it("calls onToggleCompare when compare button is clicked", () => {
    const onCompare = vi.fn();
    render(
      <ProgramCard program={mockProgram} onClick={vi.fn()} onToggleCompare={onCompare} isComparing={false} />
    );
    fireEvent.click(screen.getByText("Compare"));
    expect(onCompare).toHaveBeenCalledWith("prog1");
  });

  it("renders contacts when _contacts is populated", () => {
    const withContacts = {
      ...mockProgram,
      _contacts: [
        { name: "Coach Smith", title: "Head Coach", email: "smith@psu.edu" },
        { name: "Coach Jones", title: "Assistant Coach", email: "jones@psu.edu" },
      ],
    };
    render(<ProgramCard program={withContacts} onClick={vi.fn()} />);
    expect(screen.getByText("Coach Smith")).toBeInTheDocument();
    expect(screen.getByText("Coach Jones")).toBeInTheDocument();
  });

  it("sorts contacts with Head Coach first", () => {
    const withContacts = {
      ...mockProgram,
      _contacts: [
        { name: "Assistant", title: "Assistant Coach" },
        { name: "Head", title: "Head Coach" },
      ],
    };
    const { container } = render(<ProgramCard program={withContacts} onClick={vi.fn()} />);
    const names = container.querySelectorAll("[style*='font-weight: 600'][style*='color: rgb(71, 85, 105)']");
    // Head Coach should come first
    expect(names[0].textContent).toBe("Head");
  });
});
