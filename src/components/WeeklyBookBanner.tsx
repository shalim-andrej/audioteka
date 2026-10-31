// src/components/WeeklyBookBanner.tsx
// СЕРВЕРНЫЙ КОМПОНЕНТ. Разметка баннера уходит в HTML сразу, гидратации
// почти нет: клиентскими остаются только кнопка play и индикатор «играет».
import Link from "next/link";
import { Star, Clock, Mic, Info, Flame } from "lucide-react";

import type { Audiobook } from "@/lib/types";
import { BannerPlayButton, PlayingIndicator } from "./BannerPlayButton";

export default function WeeklyBookBanner({
  book,
  playerBook,
}: {
  /** полный объект — только для серверной разметки, в браузер не уходит */
  book: Audiobook;
  /** обрезанный объект — его получает клиентский островок с кнопкой play */
  playerBook: Audiobook;
}) {
  const chaptersCount = book.chapters?.length ?? 0;

  return (
    <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#111625] via-[#0C101B] to-[#06080D] border border-white/[0.1] p-6 sm:p-10 lg:p-12 mb-10 shadow-2xl shadow-black/80">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#F59E0B]/12 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-[400px] h-[400px] bg-[#38BDF8]/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-[1fr_260px] lg:grid-cols-[1fr_300px] gap-8 lg:gap-12 items-center">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-gradient-to-r from-[#F59E0B]/25 to-[#D97706]/20 text-[#F59E0B] border border-[#F59E0B]/40 flex items-center gap-1.5 shadow-sm">
              <Flame className="w-3.5 h-3.5 fill-[#F59E0B]" aria-hidden="true" />
              Книга недели • Обновляется каждый понедельник
            </span>
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-white/[0.06] text-gray-300 border border-white/[0.08]">
              {book.genre}
            </span>
            {book.year ? <span className="text-[11px] font-semibold text-gray-400">{book.year} год</span> : null}
          </div>

          <div className="space-y-1">
            <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.08] flex items-center gap-3">
              <span>{book.title}</span>
              <PlayingIndicator bookId={book.id} />
            </h1>

            <p className="text-base sm:text-lg text-[#F59E0B] font-semibold">{book.author}</p>
          </div>

          <p className="text-sm sm:text-base text-gray-300/90 leading-relaxed max-w-2xl line-clamp-3">
            {book.shortDescription || book.description}
          </p>

          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-300 pt-1">
            <div className="flex items-center gap-1.5 bg-black/40 px-3.5 py-1.5 rounded-xl border border-white/[0.08]">
              <Mic className="w-3.5 h-3.5 text-[#F59E0B]" aria-hidden="true" />
              <span>
                Чтец: <b className="text-white">{book.narrator}</b>
              </span>
            </div>

            {book.durationFormatted ? (
              <div className="flex items-center gap-1.5 bg-black/40 px-3.5 py-1.5 rounded-xl border border-white/[0.08]">
                <Clock className="w-3.5 h-3.5 text-gray-300" aria-hidden="true" />
                <span>{book.durationFormatted}</span>
              </div>
            ) : null}

            {book.rating > 0 && (
              <div className="flex items-center gap-1.5 bg-black/40 px-3.5 py-1.5 rounded-xl border border-white/[0.08]">
                <Star className="w-3.5 h-3.5 text-[#F59E0B] fill-[#F59E0B]" aria-hidden="true" />
                <span>
                  <b>{book.rating}</b>
                  {book.votesCount > 0 ? ` (${book.votesCount.toLocaleString("ru-RU")} оценок)` : ""}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3.5 pt-4">
            {book.listenUrl ? (
              // Каталог Литрес: прослушивание на площадке
              <a
                href={book.listenUrl}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="flex items-center gap-2.5 px-7 py-4 rounded-2xl bg-gradient-to-r from-[#F59E0B] via-[#EA580C] to-[#C2410C] text-[#06080D] font-black text-xs uppercase tracking-wider hover:shadow-xl hover:shadow-[#F59E0B]/30 hover:scale-[1.03] active:scale-[0.98] transition-all cursor-pointer"
              >
                <Info className="w-4 h-4" aria-hidden="true" />
                Слушать на Литрес
              </a>
            ) : (
              <BannerPlayButton book={playerBook} />
            )}

            <Link
              href={`/book/${book.id}`}
              prefetch={false}
              className="flex items-center gap-2 px-5 py-4 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] text-white font-bold text-xs uppercase tracking-wider border border-white/[0.1] transition-all hover:scale-[1.02]"
            >
              <Info className="w-4 h-4 text-gray-300" aria-hidden="true" />
              {chaptersCount > 0 ? `Все главы (${chaptersCount})` : "Подробнее"}
            </Link>
          </div>
        </div>

        {/* Обложка: контейнер aspect-[2/3] — размеры зарезервированы, сдвига нет */}
        <div className="hidden md:flex justify-center">
          <Link href={`/book/${book.id}`} prefetch={false} className="group relative block">
            <div className="relative w-[210px] lg:w-[250px] aspect-[2/3] rounded-2xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] border border-white/[0.15] group-hover:scale-105 group-hover:-rotate-1 transition-all duration-500 ease-out bg-gray-950">
              {book.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={book.coverUrl}
                  alt={book.title}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#1B2233] via-[#121722] to-[#0B0E16]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10 opacity-60 group-hover:opacity-80 transition-opacity" />
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}