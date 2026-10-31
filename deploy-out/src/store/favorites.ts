// src/store/favorites.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { reachMetrikaGoal } from "@/components/YandexMetrika";

interface FavoritesState {
  favorites: string[];
  toggleFavorite: (bookId: string) => void;
  isFavorite: (bookId: string) => boolean;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      toggleFavorite: (bookId) => {
        const current = get().favorites;
        const isRemoving = current.includes(bookId);
        const next = isRemoving
          ? current.filter((id) => id !== bookId)
          : [...current, bookId];

        set({ favorites: next });

        reachMetrikaGoal("toggle_favorite", {
          bookId,
          action: isRemoving ? "remove" : "add",
        });
      },
      isFavorite: (bookId) => get().favorites.includes(bookId),
    }),
    {
      name: "audio_favorites", // Ключ в localStorage
    }
  )
);