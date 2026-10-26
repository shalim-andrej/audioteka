"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Play, Pause, Star, Clock, Mic, Info, Flame, Calendar } from "lucide-react";
import { Audiobook } from "@/lib/types";
import { usePlayer } from "@/context/PlayerContext";

interface HeroBannerProps {
  allBooks: Audiobook[];
}

export default function HeroBanner({ allBooks }: HeroBannerProps) {
  const { currentBook, isPlaying, playBook, togglePlay } = usePlayer();

  // Weekly Auto-Rotation Logic (автоматически меняется каждый понедельник)
  const book = useMemo(() => {
    if (!allBooks || allBooks.length === 0) return null;

    // Пул проверенных супер-хитов для «Книги недели»
    const weeklyPoolIds = [
      "master-i-margarita",
      "metro-2033",
      "1984-orwell",
      "sherlock-holmes",
      "fahrenheit-451",
      "prestuplenie-i-nakazanie",
      "ostrov-sokrovisch",
      "sobache-serdce",
    ];

    const pool = weeklyPoolIds
      .map((id) => allBooks.find((b) => b.id === id))
      .filter(Boolean) as Audiobook[];

    const activeList = pool.length > 0 ? pool : allBooks.filter((b) => b.isFeatured || b.rating >= 9.7);

    // Номер недели с начала эпохи (меняется каждый понедельник в 00:00)
    const now = new Date();
    const currentWeekNumber = Math.floor(now.getTime() / (7 * 24 * 3600 * 1000));
    const weeklyIndex = currentWeekNumber % activeList.length;

    return activeList[weeklyIndex] || allBooks[0];
  }, [allBooks]);

  if (!book) return null;

  const isThisBookPlaying = currentBook?.id === book.id && isPlaying;

  const handlePlayClick = () => {
    if (currentBook?.id === book.id) {
      togglePlay();
    } else {
      playBook(book, 0);
    }
  };

  return (
    <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#111625] via-[#0C101B] to-[#06080D] border border-white/[0.1] p-6 sm:p-10 lg:p-12 mb-10 shadow-2xl shadow-black/80">
      {/* Dynamic Ambient Blur Glow behind the cover */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#F59E0B]/12 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-[400px] h-[400px] bg-[#38BDF8]/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-[1fr_260px] lg:grid-cols-[1fr_300px] gap-8 lg:gap-12 items-center">
        {/* Left Column: Editorial Information */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-gradient-to-r from-[#F59E0B]/25 to-[#D97706]/20 text-[#F59E0B] border border-[#F59E0B]/40 flex items-center gap-1.5 shadow-sm">
              <Flame className="w-3.5 h-3.5 fill-[#F59E0B]" />
              Книга недели • Обновляется каждый понедельник
            </span>
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-white/[0.06] text-gray-300 border border-white/[0.08]">
              {book.genre}
            </span>
            <span className="text-[11px] font-semibold text-gray-400">
              {book.year} год
            </span>
          </div>

          <div className="space-y-1">
            <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.08] flex items-center gap-3">
              <span>{book.title}</span>
              {isThisBookPlaying && (
                <div className="flex items-center gap-1 h-6">
                  <span className="equalizer-bar" />
                  <span className="equalizer-bar" />
                  <span className="equalizer-bar" />
                  <span className="equalizer-bar" />
                </div>
              )}
            </h1>

            <p className="text-base sm:text-lg text-[#F59E0B] font-semibold">
              {book.author}
            </p>
          </div>

          <p className="text-sm sm:text-base text-gray-300/90 leading-relaxed max-w-2xl line-clamp-3">
            {book.shortDescription || book.description}
          </p>

          {/* Quick Details Badges */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-300 pt-1">
            <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/[0.08]">
              <Mic className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Чтец: <b className="text-white">{book.narrator}</b></span>
            </div>

            <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/[0.08]">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span>{book.durationFormatted}</span>
            </div>

            <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/[0.08]">
              <Star className="w-3.5 h-3.5 text-[#F59E0B] fill-[#F59E0B]" />
              <span suppressHydrationWarning>
                <b>{book.rating}</b> ({book.votesCount ? book.votesCount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") : "14 250"} слушателей)
              </span>
            </div>
          </div>

          {/* Action CTA Buttons */}
          <div className="flex flex-wrap items-center gap-3.5 pt-4">
            <button
              onClick={handlePlayClick}
              className="flex items-center gap-2.5 px-7 py-4 rounded-2xl bg-gradient-to-r from-[#F59E0B] via-[#EA580C] to-[#C2410C] text-[#06080D] font-black text-xs uppercase tracking-wider hover:shadow-xl hover:shadow-[#F59E0B]/30 hover:scale-[1.03] active:scale-[0.98] transition-all cursor-pointer"
            >
              {isThisBookPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  Пауза
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Слушать онлайн
                </>
              )}
            </button>

            <Link
              href={`/book/${book.id}`}
              className="flex items-center gap-2 px-5 py-4 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] text-white font-bold text-xs uppercase tracking-wider border border-white/[0.1] transition-all hover:scale-[1.02]"
            >
              <Info className="w-4 h-4 text-gray-300" />
              Все главы ({book.chapters.length})
            </Link>
          </div>
        </div>

        {/* Right Column: Floating 3D Book Cover (ТОЧНОЕ СООТВЕТСТВИЕ ОБЛОЖКИ) */}
        <div className="hidden md:flex justify-center">
          <Link href={`/book/${book.id}`} className="group relative block">
            <div className="relative w-[210px] lg:w-[250px] aspect-[2/3] rounded-2xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] border border-white/[0.15] group-hover:scale-105 group-hover:-rotate-1 transition-all duration-500 ease-out flex items-center justify-center bg-gray-950">
              <img
                src={book.coverUrl || `/api/cover?title=${encodeURIComponent(book.title)}&author=${encodeURIComponent(book.author)}`}
                alt={book.title}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `/api/cover?title=${encodeURIComponent(book.title)}&author=${encodeURIComponent(book.author)}`;
                }}
                className="w-full h-full object-cover"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10 opacity-60 group-hover:opacity-80 transition-opacity" />
              
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]">
                <span className="text-xs font-bold text-white px-3 py-1.5 rounded-xl bg-white/20 border border-white/30 backdrop-blur-md">
                  Смотреть детали →
                </span>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
