import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Pagination, { usePagination } from "../../components/ui/Pagination.jsx";
import React from "react";

describe("Pagination", () => {
  it("renders nothing when totalPages is 1", () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} onPageChange={vi.fn()} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders page buttons when totalPages > 1", () => {
    render(<Pagination currentPage={1} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("calls onPageChange when a page button is clicked", () => {
    const handler = vi.fn();
    render(<Pagination currentPage={1} totalPages={5} onPageChange={handler} />);
    fireEvent.click(screen.getByText("3"));
    expect(handler).toHaveBeenCalledWith(3);
  });

  it("calls onPageChange with next page on Next click", () => {
    const handler = vi.fn();
    render(<Pagination currentPage={2} totalPages={5} onPageChange={handler} />);
    fireEvent.click(screen.getByText("Next"));
    expect(handler).toHaveBeenCalledWith(3);
  });

  it("calls onPageChange with previous page on Prev click", () => {
    const handler = vi.fn();
    render(<Pagination currentPage={3} totalPages={5} onPageChange={handler} />);
    fireEvent.click(screen.getByText("Prev"));
    expect(handler).toHaveBeenCalledWith(2);
  });

  it("disables Prev on first page", () => {
    render(<Pagination currentPage={1} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByText("Prev")).toBeDisabled();
  });

  it("disables Next on last page", () => {
    render(<Pagination currentPage={5} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByText("Next")).toBeDisabled();
  });
});

describe("usePagination", () => {
  function TestComponent({ items, perPage }) {
    const { page, totalPages, paged, setPage } = usePagination(items, perPage);
    return (
      <div>
        <span data-testid="page">{page}</span>
        <span data-testid="totalPages">{totalPages}</span>
        <span data-testid="pagedCount">{paged.length}</span>
        <span data-testid="pagedItems">{paged.join(",")}</span>
        <button onClick={() => setPage(2)}>Go to 2</button>
      </div>
    );
  }

  it("paginates items correctly", () => {
    const items = Array.from({ length: 30 }, (_, i) => i + 1);
    render(<TestComponent items={items} perPage={10} />);
    expect(screen.getByTestId("page").textContent).toBe("1");
    expect(screen.getByTestId("totalPages").textContent).toBe("3");
    expect(screen.getByTestId("pagedCount").textContent).toBe("10");
  });

  it("handles empty items", () => {
    render(<TestComponent items={[]} perPage={10} />);
    expect(screen.getByTestId("totalPages").textContent).toBe("1");
    expect(screen.getByTestId("pagedCount").textContent).toBe("0");
  });

  it("navigates to page 2", () => {
    const items = Array.from({ length: 30 }, (_, i) => i + 1);
    render(<TestComponent items={items} perPage={10} />);
    fireEvent.click(screen.getByText("Go to 2"));
    expect(screen.getByTestId("page").textContent).toBe("2");
    expect(screen.getByTestId("pagedItems").textContent).toBe("11,12,13,14,15,16,17,18,19,20");
  });
});
