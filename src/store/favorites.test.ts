// src/store/favorites.test.ts
import { useFavoritesStore } from "./favorites";

describe("Favorites Store (Zustand)", () => {
  beforeEach(() => {
    useFavoritesStore.setState({ favorites: [] });
  });

  it("должен добавлять книгу в избранное", () => {
    const { toggleFavorite, isFavorite } = useFavoritesStore.getState();
    
    expect(isFavorite("book-1")).toBe(false);

    toggleFavorite("book-1");

    expect(useFavoritesStore.getState().isFavorite("book-1")).toBe(true);
    expect(useFavoritesStore.getState().favorites).toContain("book-1");
  });

  it("должен удалять книгу из избранного при повторном клике", () => {
    const { toggleFavorite } = useFavoritesStore.getState();
    
    toggleFavorite("book-2");
    expect(useFavoritesStore.getState().isFavorite("book-2")).toBe(true);

    toggleFavorite("book-2");
    expect(useFavoritesStore.getState().isFavorite("book-2")).toBe(false);
    expect(useFavoritesStore.getState().favorites).not.toContain("book-2");
  });

  it("должен корректно хранить несколько книг", () => {
    const { toggleFavorite } = useFavoritesStore.getState();
    
    toggleFavorite("book-1");
    toggleFavorite("book-2");
    toggleFavorite("book-3");

    const favorites = useFavoritesStore.getState().favorites;
    expect(favorites).toHaveLength(3);
    expect(favorites).toEqual(["book-1", "book-2", "book-3"]);
  });
});