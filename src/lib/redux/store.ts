// src/lib/redux/store.ts
import { configureStore } from "@reduxjs/toolkit";
import favoritesReducer from "./features/favorites/favoritesSlice";

/**
 * Redux Toolkit store.
 * configureStore автоматически добавляет:
 *  - Redux DevTools (в dev-режиме);
 *  - thunk middleware (для асинхронных экшенов);
 *  - проверку на мутации (immutability check).
 */
export const store = configureStore({
  reducer: {
    favorites: favoritesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;