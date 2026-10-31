// src/components/BannerPlayButton.tsx
// КЛИЕНТСКИЙ ОСТРОВОК баннера. Всё остальное в баннере — серверная разметка.
// Здесь только кнопка play/pause и «эквалайзер» возле названия.
"use client";

import React from "react";
import { Play, Pause } from "lucide-react";
import type { Audiobook } from "@/lib/types";
import { usePlayerUi } from "@/context/PlayerContext";

export function BannerPlayButton({ book }: { book: Audiobook }) {
  const { currentBookId, isPlaying, playBook, togglePlay } = usePlayerUi();
  const isThisBookPlaying = currentBookId === book.id && isPlaying;

  const handleClick = () => {
    if (currentBookId === book.id) togglePlay();
    else playBook(book, 0);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center gap-2.5 px-7 py-4 rounded-2xl bg-gradient-to-r from-[#F59E0B] via-[#EA580C] to-[#C2410C] text-[#06080D] font-black text-xs uppercase tracking-wider hover:shadow-xl hover:shadow-[#F59E0B]/30 hover:scale-[1.03] active:scale-[0.98] transition-all cursor-pointer"
    >
      {isThisBookPlaying ? (
        <>
          <Pause className="w-4 h-4 fill-current" aria-hidden="true" />
          Пауза
        </>
      ) : (
        <>
          <Play className="w-4 h-4 fill-current" aria-hidden="true" />
          Слушать онлайн
        </>
      )}
    </button>
  );
}

export function PlayingIndicator({ bookId }: { bookId: string }) {
  const { currentBookId, isPlaying } = usePlayerUi();
  if (currentBookId !== bookId || !isPlaying) return null;

  return (
    <span className="flex items-center gap-1 h-6" aria-hidden="true">
      <span className="equalizer-bar" />
      <span className="equalizer-bar" />
      <span className="equalizer-bar" />
      <span className="equalizer-bar" />
    </span>
  );
}