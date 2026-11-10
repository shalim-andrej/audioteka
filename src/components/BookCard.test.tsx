// src/components/BookCard.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import BookCard from "./BookCard";
import favoritesReducer from "@/lib/redux/features/favorites/favoritesSlice";
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

/**
 * renderWithRedux — оборачивает компонент в Redux Provider
 * со СВЕЖИМ store на каждый тест. Так состояние не течёт между тестами.
 */
function renderWithRedux(ui: React.ReactElement) {
  const store = configureStore({
    reducer: { favorites: favoritesReducer },
    preloadedState: { favorites: { ids: [] } },
  });
  const result = render(<Provider store={store}>{ui}</Provider>);
  return { ...result, store };
}

describe("BookCard Component", () => {
  it("отображает информацию о книге", () => {
    renderWithRedux(<BookCard book={mockBook} />);
    expect(screen.getByText("Тестовая аудиокнига")).toBeInTheDocument();
    expect(screen.getByText("Тестовый Автор")).toBeInTheDocument();
    expect(screen.getByText(/Тестовый Чтец/)).toBeInTheDocument();
  });

  it("отображает ссылку на книгу в заголовке (stretched link)", () => {
    renderWithRedux(<BookCard book={mockBook} />);
    const heading = screen.getByRole("heading", { name: /тестовая аудиокнига/i });
    const link = heading.closest("a");
    expect(link).not.toBeNull();
    expect(link).toHaveAttribute("href", "/book/book-test-1");
  });

  it("добавляет книгу в избранное при клике на сердечко", () => {
    const { store } = renderWithRedux(<BookCard book={mockBook} />);
    const favoriteButton = screen.getByRole("button", {
      name: /добавить в избранное/i,
    });
    fireEvent.click(favoriteButton);
    expect(store.getState().favorites.ids).toContain(mockBook.id);
  });

  it("удаляет книгу из избранного при повторном клике", () => {
    const store = configureStore({
      reducer: { favorites: favoritesReducer },
      preloadedState: { favorites: { ids: [mockBook.id] } },
    });
    render(
      <Provider store={store}>
        <BookCard book={mockBook} />
      </Provider>
    );
    const favoriteButton = screen.getByRole("button", {
      name: /удалить из избранного/i,
    });
    fireEvent.click(favoriteButton);
    expect(store.getState().favorites.ids).not.toContain(mockBook.id);
  });

  it("кнопка избранного имеет aria-pressed", () => {
    renderWithRedux(<BookCard book={mockBook} />);
    const favoriteButton = screen.getByRole("button", {
      name: /добавить в избранное/i,
    });
    expect(favoriteButton).toHaveAttribute("aria-pressed", "false");
  });

  it("кнопка избранного меняет aria-pressed на true, если книга в избранном", () => {
    const store = configureStore({
      reducer: { favorites: favoritesReducer },
      preloadedState: { favorites: { ids: [mockBook.id] } },
    });
    render(
      <Provider store={store}>
        <BookCard book={mockBook} />
      </Provider>
    );
    const favoriteButton = screen.getByRole("button", {
      name: /удалить из избранного/i,
    });
    expect(favoriteButton).toHaveAttribute("aria-pressed", "true");
  });
});