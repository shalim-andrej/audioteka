// src/components/BookCard.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import BookCard from "./BookCard";
import { useFavoritesStore } from "../store/favorites";
import { Audiobook } from "../lib/types";

// BookCardActions использует usePlayerUi (не usePlayer!)
jest.mock("../context/PlayerContext", () => ({
  usePlayerUi: () => ({
    currentBookId: null,
    isPlaying: false,
    playBook: jest.fn(),
    togglePlay: jest.fn(),
    history: [],
  }),
}));

jest.mock("./YandexMetrika", () => ({
  reachMetrikaGoal: jest.fn(),
}));

const mockBook: Audiobook = {
  id: "book-test-1",
  title: "Тестовая аудиокнига",
  author: "Тестовый Автор",
  narrator: "Тестовый Чтец",
  genre: "Фантастика",
  rating: 8.5,
  narratorRating: 9.0,
  durationFormatted: "10 ч",
  coverUrl: "https://example.com/cover.jpg",
  description: "Описание",
  shortDescription: "Краткое описание",
  chapters: [],
  year: 2024,
  votesCount: 0,
  durationSeconds: 0,
};

describe("BookCard Component", () => {
  beforeEach(() => {
    useFavoritesStore.setState({ favorites: [] });
  });

  it("отображает информацию о книге", () => {
    render(<BookCard book={mockBook} />);
    expect(screen.getByText("Тестовая аудиокнига")).toBeInTheDocument();
    expect(screen.getByText("Тестовый Автор")).toBeInTheDocument();
    expect(screen.getByText(/Тестовый Чтец/)).toBeInTheDocument();
  });

  it("отображает ссылку на книгу в заголовке (stretched link)", () => {
    render(<BookCard book={mockBook} />);
    const heading = screen.getByRole("heading", { name: /тестовая аудиокнига/i });
    // <Link> вокруг h3 — stretched link. Проверяем, что внутри есть <a> с href.
    const link = heading.closest("a");
    expect(link).not.toBeNull();
    expect(link).toHaveAttribute("href", "/book/book-test-1");
  });

  it("добавляет книгу в избранное при клике на сердечко", () => {
    render(<BookCard book={mockBook} />);
    const favoriteButton = screen.getByRole("button", {
      name: /добавить в избранное/i,
    });
    fireEvent.click(favoriteButton);
    expect(useFavoritesStore.getState().favorites).toContain(mockBook.id);
  });

  it("удаляет книгу из избранного при повторном клике", () => {
    useFavoritesStore.setState({ favorites: [mockBook.id] });
    render(<BookCard book={mockBook} />);
    const favoriteButton = screen.getByRole("button", {
      name: /удалить из избранного/i,
    });
    fireEvent.click(favoriteButton);
    expect(useFavoritesStore.getState().favorites).not.toContain(mockBook.id);
  });

  it("кнопка избранного имеет aria-pressed", () => {
    render(<BookCard book={mockBook} />);
    const favoriteButton = screen.getByRole("button", {
      name: /добавить в избранное/i,
    });
    expect(favoriteButton).toHaveAttribute("aria-pressed", "false");
  });

  it("кнопка избранного меняет aria-pressed на true, если книга в избранном", () => {
    useFavoritesStore.setState({ favorites: [mockBook.id] });
    render(<BookCard book={mockBook} />);
    const favoriteButton = screen.getByRole("button", {
      name: /удалить из избранного/i,
    });
    expect(favoriteButton).toHaveAttribute("aria-pressed", "true");
  });
});