// src/components/CatalogShell.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CatalogShell from "./CatalogShell";
import { useRouter, usePathname } from "next/navigation";

// 1. Мокаем навигацию Next.js
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => "/catalog",
}));

// 2. Мокаем FilterControls, чтобы изолировать тест CatalogShell.
jest.mock("@/components/FilterControls", () => {
  return function MockFilterControls({
    selectedGenre,
    onGenreChange,
  }: {
    selectedGenre: string;
    onGenreChange: (genre: string) => void;
  }) {
    return (
      <div>
        <span data-testid="current-genre">{selectedGenre}</span>
        <button onClick={() => onGenreChange("Фантастика")}>Выбрать фантастику</button>
        <button onClick={() => onGenreChange(selectedGenre)}>Кликнуть на активный</button>
      </div>
    );
  };
});

describe("CatalogShell", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("вызывает router.push при выборе нового жанра", async () => {
    const user = userEvent.setup();
    render(
      <CatalogShell selectedGenre="Все" sortBy="popular">
        <div>Grid content</div>
      </CatalogShell>
    );

    await user.click(screen.getByText("Выбрать фантастику"));

    expect(mockPush).toHaveBeenCalledTimes(1);

    // Проверяем семантику: URL содержит нужный параметр (декодированный)
    const calledUrl = mockPush.mock.calls[0][0] as string;
    const parsedUrl = new URL(calledUrl, "http://localhost");
    expect(parsedUrl.pathname).toBe("/catalog");
    expect(parsedUrl.searchParams.get("genre")).toBe("Фантастика");

    // Проверяем второй аргумент (scroll: false)
    expect(mockPush.mock.calls[0][1]).toEqual({ scroll: false });
  });

  it("НЕ вызывает router.push, если кликнуть на уже активный жанр (фикс застывания)", async () => {
    const user = userEvent.setup();
    render(
      <CatalogShell selectedGenre="Все" sortBy="popular">
        <div>Grid content</div>
      </CatalogShell>
    );

    // Кликаем на кнопку, которая передает текущий selectedGenre ("Все")
    await user.click(screen.getByText("Кликнуть на активный"));

    // router.push не должен вызываться
    expect(mockPush).not.toHaveBeenCalled();

    // Также проверим, что isPending не установился в true (сетка не застыла)
    const gridContainer = screen.getByText("Grid content").parentElement;
    expect(gridContainer).not.toHaveClass("pointer-events-none");
  });
});