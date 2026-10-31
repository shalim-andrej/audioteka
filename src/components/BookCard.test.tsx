// src/components/BookCard.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import BookCard from "./BookCard";
import { useFavoritesStore } from "../store/favorites";
import { Audiobook } from "../lib/types";

jest.mock("../context/PlayerContext", () => ({
  usePlayer: () => ({
    currentBook: null,
    isPlaying: false,
    playBook: jest.fn(),
    togglePlay: jest.fn(),
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

  it("добавляет книгу в избранное при клике на сердечко", () => {
    render(<BookCard book={mockBook} />);
    const favoriteButton = screen.getByTitle(/Добавить в полку/i);
    fireEvent.click(favoriteButton);
    expect(useFavoritesStore.getState().favorites).toContain(mockBook.id);
  });

  it("удаляет книгу из избранного при повторном клике", () => {
    useFavoritesStore.setState({ favorites: [mockBook.id] });
    render(<BookCard book={mockBook} />);
    const favoriteButton = screen.getByTitle(/Удалить из полки/i);
    fireEvent.click(favoriteButton);
    expect(useFavoritesStore.getState().favorites).not.toContain(mockBook.id);
  });
});