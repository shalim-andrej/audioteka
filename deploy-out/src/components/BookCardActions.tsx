// src/components/BookCardActions.tsx
"use client";

import React from "react";
import { Play, Pause, Heart, Headphones } from "lucide-react";
import { Audiobook } from "@/lib/types";
import { usePlayerUi } from "@/context/PlayerContext";
import { useFavoritesStore } from "@/store/favorites";

/**
 * Единственный клиентский островок карточки.
 *
 * Раньше вся карточка была клиентским компонентом: 12 карточек на первом
 * экране — это 12 подписок на контекст плеера и 12 подписок на стор
 * избранного, которые браузер обязан поднять при гидратации.
 *
 * Теперь разметка карточки серверная, а гидратируются только эти три
 * элемента: сердечко, кнопка play и плашка «Сейчас играет».
 */
export default function BookCardActions({ book }: { book: Audiobook }) {
  const { currentBookId, isPlaying, playBook, togglePlay } = usePlayerUi();

  /*
   * ВАЖНО: подписка именно на массив favorites, а не только на функцию.
   * Если подписаться на state.isFavorite, ссылка на функцию не меняется
   * при добавлении книги, компонент не перерисовывается — и сердечко
   * остаётся серым, хотя книга в избранное уже попала.
   * Массив меняет ссылку на каждом изменении, поэтому перерисовка идёт.
   */
  const favorites = useFavoritesStore((state) => state.favorites);
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
  const isFavorite = useFavoritesStore((state) => state.isFavorite);

  const isThisBookPlaying = currentBookId === book.id && isPlaying;
  const isFav = isFavorite(book.id);

  // favorites намеренно читается в рендере: это и есть подписка на изменения
  void favorites;

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentBookId === book.id) {
      togglePlay();
    } else {
      playBook(book, 0);
    }
  };

  const handleFavClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(book.id);
  };

  return (
    <>
      {/* Тач-таргет 44×44 для соответствия a11y */}
      <button
        type="button"
        onClick={handleFavClick}
        aria-label={isFav ? "Удалить из избранного" : "Добавить в избранное"}
        aria-pressed={isFav}
        className="absolute top-1 right-1 z-20 min-w-[44px] min-h-[44px] grid place-items-center rounded-full text-white transition-transform active:scale-90"
      >
        <span className="grid place-items-center w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 border border-white/10">
          <Heart
            className={`w-3.5 h-3.5 transition-colors ${
              isFav ? "fill-[#EF4444] text-[#EF4444]" : "text-white"
            }`}
            aria-hidden="true"
          />
        </span>
      </button>

      <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300 bg-black/40 pointer-events-none [&:focus-within]:pointer-events-auto group-hover:pointer-events-auto">
        <button
          type="button"
          onClick={handlePlayClick}
          aria-label={isThisBookPlaying ? `Пауза: ${book.title}` : `Слушать: ${book.title}`}
          className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#F59E0B] to-[#EA580C] flex items-center justify-center text-[#06080D] shadow-xl shadow-[#F59E0B]/30 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
        >
          {isThisBookPlaying ? (
            <Pause className="w-6 h-6 fill-current" aria-hidden="true" />
          ) : (
            <Play className="w-6 h-6 fill-current translate-x-0.5" aria-hidden="true" />
          )}
        </button>
      </div>

      {isThisBookPlaying && (
        <div className="absolute bottom-2.5 left-2.5 right-2.5 z-20 bg-[#F59E0B] text-[#06080D] text-[10px] font-black uppercase py-1 px-2.5 rounded-lg text-center flex items-center justify-center gap-2 shadow-lg">
          <Headphones className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Сейчас играет</span>
        </div>
      )}
    </>
  );
}