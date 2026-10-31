// src/app/book/[id]/BookRating.tsx
// КЛИЕНТСКИЙ ОСТРОВОК: две шкалы оценок (сюжет и чтец).
// Держит только локальное состояние — 20 кнопок вместо всей страницы.
"use client";

import React, { useEffect, useState } from "react";
import { Star } from "lucide-react";

/**
 * Оценки LibriVox не отдаёт, поэтому у книг из этой базы rating = 0.
 * Раньше здесь подставлялось «9.8» для чтеца прямо в коде, а из базы
 * приходило подставное «9.5» — на экране это выглядело как реальные
 * оценки. Теперь при отсутствии оценки честно показываем прочерк.
 *
 * Оценка посетителя сохраняется в localStorage этого браузера.
 * Надпись «учтён в рейтинге» убрана: сервера оценок у нас нет,
 * и обещать то, чего не происходит, нельзя.
 */
export default function BookRating({
  rating,
  narratorRating,
  narrator,
  bookId,
}: {
  rating: number;
  narratorRating: number;
  narrator: string;
  bookId?: string;
}) {
  const [userRating, setUserRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [userNarratorRating, setUserNarratorRating] = useState<number | null>(null);
  const [hoverNarratorRating, setHoverNarratorRating] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  const storageKey = bookId ? `audioteka:rating:${bookId}` : null;

  // Поднимаем ранее сохранённую оценку, чтобы она не пропадала после перезагрузки
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Number(parsed?.plot) > 0) setUserRating(Number(parsed.plot));
      if (Number(parsed?.narrator) > 0) setUserNarratorRating(Number(parsed.narrator));
      setSaved(true);
    } catch {
      /* повреждённые данные не мешают странице */
    }
  }, [storageKey]);

  const save = (plot: number | null, voice: number | null) => {
    setSaved(true);
    if (!storageKey) return;
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ plot: plot ?? 0, narrator: voice ?? 0 })
      );
    } catch {
      /* приватный режим браузера — оценка просто не сохранится */
    }
  };

  const stars = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const hasPlot = Number(rating) > 0;
  const hasVoice = Number(narratorRating) > 0;

  return (
    <div className="w-full max-w-[330px] mx-auto lg:mx-0 p-5 rounded-2xl bg-[#0F1420]/90 border border-white/10 space-y-4">
      <div className="grid grid-cols-2 gap-3 pb-3 border-b border-white/[0.08]">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block">
            📖 Сюжет
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-2xl font-black text-white">{hasPlot ? rating : "—"}</span>
            {hasPlot && <span className="text-xs text-gray-400 font-semibold">/10</span>}
          </div>
          {!hasPlot && (
            <span className="text-[10px] text-gray-500 font-semibold">нет оценок</span>
          )}
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-[#F59E0B] font-bold block">
            🎙 Чтец
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-2xl font-black text-[#F59E0B]">
              {hasVoice ? narratorRating : "—"}
            </span>
            {hasVoice && <span className="text-xs text-gray-400 font-semibold">/10</span>}
          </div>
          {!hasVoice && (
            <span className="text-[10px] text-gray-500 font-semibold">нет оценок</span>
          )}
        </div>
      </div>

      <div>
        <span className="text-[10px] text-gray-400 font-semibold block mb-1">
          Ваша оценка книги (сюжет):
        </span>
        <div className="flex items-center justify-between">
          {stars.map((star) => (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(null)}
              onClick={() => {
                setUserRating(star);
                save(star, userNarratorRating);
              }}
              className="p-0.5 hover:scale-125 transition-transform"
              title={`Оценить сюжет на ${star} из 10`}
              aria-label={`Оценить сюжет на ${star} из 10`}
            >
              <Star
                className={`w-3.5 h-3.5 ${
                  (hoverRating !== null
                    ? star <= hoverRating
                    : userRating !== null && star <= userRating)
                    ? "fill-[#F59E0B] text-[#F59E0B]"
                    : "text-gray-600"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="text-[10px] text-gray-400 font-semibold block mb-1">
          Ваша оценка чтеца ({narrator}):
        </span>
        <div className="flex items-center justify-between">
          {stars.map((star) => (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHoverNarratorRating(star)}
              onMouseLeave={() => setHoverNarratorRating(null)}
              onClick={() => {
                setUserNarratorRating(star);
                save(userRating, star);
              }}
              className="p-0.5 hover:scale-125 transition-transform"
              title={`Оценить чтеца на ${star} из 10`}
              aria-label={`Оценить чтеца на ${star} из 10`}
            >
              <Star
                className={`w-3.5 h-3.5 ${
                  (hoverNarratorRating !== null
                    ? star <= hoverNarratorRating
                    : userNarratorRating !== null && star <= userNarratorRating)
                    ? "fill-[#38BDF8] text-[#38BDF8]"
                    : "text-gray-600"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {saved && (
        <p className="text-[11px] text-gray-400 font-semibold text-center pt-1">
          Оценка сохранена в этом браузере
        </p>
      )}
    </div>
  );
}