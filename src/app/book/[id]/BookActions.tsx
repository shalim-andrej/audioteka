// src/app/book/[id]/BookActions.tsx
// КЛИЕНТСКИЕ ОСТРОВКИ: полка, избранное, «поделиться» и список озвучек.
// Всё локальное состояние страницы книги живёт здесь, а не в одном
// компоненте на тысячу строк.
"use client";

import React, { useState } from "react";
import { Bookmark, ChevronDown, Heart, Share2, CheckCircle2 } from "lucide-react";
import type { OtherNarration } from "@/lib/types";
import { usePlayer } from "@/context/PlayerContext";
import { useFavoritesStore } from "@/store/favorites";
import { reachMetrikaGoal } from "@/components/YandexMetrika";

export function BookActions({ bookId, title }: { bookId: string; title: string }) {
  const [shelfStatus, setShelfStatus] = useState<string>("default");
  const [isShelfMenuOpen, setIsShelfMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
  const isFavorite = useFavoritesStore((state) => state.isFavorite);
  /*
   * Подписка на массив избранного ОБЯЗАТЕЛЬНА: селектор isFavorite сам по себе
   * не вызывает перерисовку при изменении стора. Без этой строки сердечко
   * на странице книги не обновлялось.
   */
  useFavoritesStore((state) => state.favorites);
  const isFav = isFavorite(bookId);

  const { currentBook, currentChapterIndex, currentTime } = usePlayer();

  const handleShare = () => {
    if (typeof window !== "undefined" && navigator.clipboard) {
      const url =
        currentBook?.id === bookId && currentTime > 5
          ? `${window.location.origin}/book/${bookId}?ch=${currentChapterIndex}&t=${Math.floor(currentTime)}`
          : window.location.href;
      navigator.clipboard.writeText(url);
      setCopied(true);
      reachMetrikaGoal("share_book", { bookId, title });
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="w-full max-w-[330px] mx-auto lg:mx-0 space-y-3">
      <div className="relative">
        <button
          onClick={() => setIsShelfMenuOpen(!isShelfMenuOpen)}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#182030] to-[#121824] hover:from-[#1F293D] hover:to-[#161F2E] border border-white/15 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-between shadow-lg transition-all cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-[#F59E0B]" />
            {shelfStatus === "default" && "На полку"}
            {shelfStatus === "want" && "📌 В планах послушать"}
            {shelfStatus === "listening" && "🎧 Слушаю сейчас"}
            {shelfStatus === "done" && "✅ Уже прослушано"}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isShelfMenuOpen ? "rotate-180" : ""}`} />
        </button>

        {isShelfMenuOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#0F1420] border border-white/15 rounded-xl shadow-2xl p-1.5 z-30 space-y-1 backdrop-blur-xl">
            <button
              onClick={() => { setShelfStatus("want"); setIsShelfMenuOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-white/10 flex items-center gap-2.5 text-gray-200"
            >
              <span>📌</span> Хочу послушать
            </button>
            <button
              onClick={() => { setShelfStatus("listening"); setIsShelfMenuOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-white/10 flex items-center gap-2.5 text-gray-200"
            >
              <span>🎧</span> Слушаю сейчас
            </button>
            <button
              onClick={() => { setShelfStatus("done"); setIsShelfMenuOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-white/10 flex items-center gap-2.5 text-gray-200"
            >
              <span>✅</span> Уже прослушано
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => toggleFavorite(bookId)}
          className={`py-3 px-4 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            isFav
              ? "bg-[#EF4444]/20 border-[#EF4444] text-[#EF4444]"
              : "bg-[#0F1420] border-white/10 text-gray-300 hover:text-white hover:border-white/20"
          }`}
        >
          <Heart className={`w-4 h-4 ${isFav ? "fill-current" : ""}`} />
          {isFav ? "В избранном" : "В избранное"}
        </button>

        <button
          onClick={handleShare}
          className="py-3 px-4 rounded-xl bg-[#0F1420] border border-white/10 text-gray-300 hover:text-white hover:border-white/20 font-bold text-xs flex items-center justify-center gap-2 transition-all relative cursor-pointer"
        >
          {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
          <span>{copied ? "Ссылка скопирована!" : "Поделиться"}</span>
        </button>
      </div>
    </div>
  );
}

export function NarrationsList({ narrations }: { narrations: OtherNarration[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {narrations.map((on, i) => (
        <div
          key={i}
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
            on.active
              ? "bg-[#F59E0B]/10 border-[#F59E0B]/50 text-white"
              : "bg-white/[0.02] border-white/10 text-gray-300 hover:bg-white/[0.05]"
          }`}
        >
          <div>
            <p className="font-bold text-sm text-white">{on.narrator}</p>
            <span className="text-[11px] text-gray-400">{on.duration} • ★ {on.rating}</span>
          </div>
          <div>
            {on.active ? (
              <span className="text-[10px] bg-[#F59E0B] text-[#06080D] font-extrabold px-2.5 py-1 rounded-md">Текущая</span>
            ) : (
              <button
                onClick={() => alert(`Переключение на озвучку: ${on.narrator}`)}
                className="text-[11px] bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-lg transition-colors cursor-pointer font-bold"
              >
                Слушать
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
