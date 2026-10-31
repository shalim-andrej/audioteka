// src/components/BookCard.tsx
// СЕРВЕРНЫЙ КОМПОНЕНТ: без "use client", без хуков.
// Интерактивная часть — только <BookCardActions /> (маленький клиентский островок).

import React from "react";
import Link from "next/link";
import { Star, Clock } from "lucide-react";
import { Audiobook } from "@/lib/types";
import BookCardActions from "./BookCardActions";

interface BookCardProps {
  book: Audiobook;
  /** true для карточек первой строки — это LCP-элементы */
  priority?: boolean;
  /** оставлен для совместимости вызовов */
  index?: number;
}

export default function BookCard({ book, priority = false }: BookCardProps) {
  // durationFormatted может быть пустым — .split(" ") упал бы на undefined
  const hours = book.durationFormatted ? book.durationFormatted.split(" ")[0] : null;

  /*
   * ОБЛОЖКА БЕЗ next/image — это не стилистическая правка, а лечение
   * десятисекундной задержки при переходе на страницу книги.
   *
   * Было: <Image src={coverUrl} /> → браузер запрашивал
   *       /_next/image?url=<чужой адрес>&w=...&q=72
   * то есть картинка шла ЧЕРЕЗ НАШ СЕРВЕР. Хосты обложек в базе
   * (knigavuhe.org, audioknigi.xyz, archive.org) частью мертвы и отвечают
   * десятками секунд. Браузер держит 6 соединений на домен — все шесть
   * занимали висящие обложки, и запрос перехода на /book/... вставал
   * в очередь. Адрес в строке менялся только через 10 секунд.
   *
   * Стало: обычный <img> с прямым адресом. Висящая картинка теперь занимает
   * соединение к ЧУЖОМУ домену и наш сервер не блокирует вообще.
   *
   * Если обложки нет — рисуем заглушку из CSS-градиента. Раньше в этом случае
   * запрашивался /api/cover (наш же домен, та же проблема с очередью).
   */
  const coverSrc = book.coverUrl || "";

  return (
    <div className="group relative glass-panel glass-panel-hover rounded-2xl overflow-hidden transition-colors duration-300 flex flex-col">
      {/*
        prefetch={false}: иначе Next тянет полный RSC-payload следующей страницы
        по ~95 КБ на карточку.
      */}
      <Link
        href={`/book/${book.id}`}
        prefetch={false}
        className="block relative w-full aspect-[2/3] overflow-hidden bg-gray-950"
      >
        {coverSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverSrc}
            alt={book.title}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : "auto"}
            referrerPolicy="no-referrer"
            className="absolute inset-0 h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1B2233] via-[#121722] to-[#0B0E16]"
            aria-hidden="true"
          >
            <span className="px-4 text-center font-serif text-sm text-white/35 line-clamp-3">
              {book.title}
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          {book.rating > 0 && (
            <span className="flex items-center gap-1 bg-black/70 px-2 py-0.5 rounded-lg text-[11px] font-bold text-[#F59E0B] border border-white/10">
            <Star className="w-3 h-3 fill-[#F59E0B]" aria-hidden="true" />
            {book.rating}
          </span>
          )}

          {hours && (
            <span className="flex items-center gap-1 bg-black/70 px-2 py-0.5 rounded-lg text-[10px] font-semibold text-gray-200 border border-white/10">
              <Clock className="w-2.5 h-2.5 text-gray-300" aria-hidden="true" />
              {book.durationFormatted}
            </span>
          )}
        </div>

        <BookCardActions book={book} />
      </Link>

      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <span
            className="text-[10px] font-bold text-gray-300 uppercase tracking-wider block mb-1 truncate"
            title={book.genre}
          >
            {book.genre}
          </span>

          <Link href={`/book/${book.id}`} prefetch={false} className="block">
            <h3
              className="font-serif text-lg font-bold text-white group-hover:text-[#F59E0B] transition-colors line-clamp-1 leading-snug"
              title={book.title}
            >
              {book.title}
            </h3>
          </Link>

          <p className="text-xs text-[#F59E0B] font-semibold mt-0.5 line-clamp-1">{book.author}</p>
        </div>

        <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-gray-300">
          <span className="truncate max-w-[140px] font-medium text-gray-300" title={`Чтец: ${book.narrator}`}>
            🎙️ {book.narrator}
          </span>
          <span className="text-gray-300 font-mono text-[10px] font-bold">⏱ {book.durationFormatted}</span>
        </div>
      </div>
    </div>
  );
}