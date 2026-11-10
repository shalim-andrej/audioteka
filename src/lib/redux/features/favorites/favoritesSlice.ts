// src/lib/redux/features/favorites/favoritesSlice.ts
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/**
 * Favorites slice — аналог Zustand-стора, но на Redux Toolkit.
 * Immer внутри createSlice позволяет писать «мутирующий» код,
 * но state остаётся иммутабельным.
 */
interface FavoritesState {
  ids: string[];
}

const initialState: FavoritesState = {
  ids: [],
};

const favoritesSlice = createSlice({
  name: "favorites",
  initialState,
  reducers: {
    /** Добавить/удалить книгу из избранного (toggle). */
    toggleFavorite: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      const index = state.ids.indexOf(id);
      if (index === -1) {
        state.ids.push(id);
      } else {
        state.ids.splice(index, 1);
      }
    },
    /** Удалить сразу несколько ID (для очистки «мёртвых» ID). */
    removeFavorites: (state, action: PayloadAction<string[]>) => {
      const removeSet = new Set(action.payload);
      state.ids = state.ids.filter((id) => !removeSet.has(id));
    },
  },
});

export const { toggleFavorite, removeFavorites } = favoritesSlice.actions;
export default favoritesSlice.reducer;