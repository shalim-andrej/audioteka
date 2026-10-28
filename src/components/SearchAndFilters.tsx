"use client";

import React, { useRef } from "react";
import { SlidersHorizontal, ArrowUpDown, Mic, X, ChevronRight, ChevronLeft } from "lucide-react";

interface SearchAndFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedGenre: string;
  onGenreChange: (g: string) => void;
  selectedDuration: string;
  onDurationChange: (d: string) => void;
  selectedSort: string;
  onSortChange: (s: string) => void;
  selectedNarrator?: string;
  onNarratorChange?: (n: string) => void;
  genres: string[];
  narrators?: string[];
}

export default function SearchAndFilters({
  searchQuery,
  onSearchChange,
  selectedGenre,
  onGenreChange,
  selectedDuration,
  onDurationChange,
  selectedSort,
  onSortChange,
  selectedNarrator = "Все",
  onNarratorChange,
  genres,
  narrators,
}: SearchAndFiltersProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollGenres = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const offset = direction === "left" ? -200 : 200;
      scrollContainerRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  const getGenreIcon = (genre: string) => {
    switch (genre) {
      case "Все":
        return "📚";
      case "Фантастика":
        return "🚀";
      case "Детективы":
        return "🕵️";
      case "Ужасы и мистика":
        return "👻";
      case "Психология":
        return "🧠";
      case "Классика":
        return "📖";
      case "Для детей":
        return "🎈";
      default:
        return "🎧";
    }
  };

  return (
    <div className="space-y-4 mb-8 w-full min-w-0">
      {/* Active Search Filter Badge */}
      {searchQuery && (
        <div className="flex items-center gap-2 p-2.5 px-4 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-2xl w-fit animate-in fade-in">
          <span className="text-xs text-gray-300">
            Результаты поиска по запросу: <b className="text-[#F59E0B]">«{searchQuery}»</b>
          </span>
          <button
            onClick={() => onSearchChange("")}
            className="p-1 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors ml-1 cursor-pointer"
            title="Сбросить поиск"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Genres Strip with Smooth Touch-Scrolling & Edge Fade */}
      <div className="relative w-full min-w-0 group">
        {/* Left scroll arrow on desktop */}
        <button
          onClick={() => scrollGenres("left")}
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-7 h-7 rounded-full bg-[#0F1420] border border-white/20 items-center justify-center text-gray-300 hover:text-white hover:border-[#F59E0B] shadow-lg transition-all cursor-pointer"
          aria-label="Прокрутить жанры влево"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Scrollable Genres Track */}
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-2 overflow-x-auto py-1 px-1 -mx-1 scroll-smooth no-scrollbar touch-pan-x"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {genres.map((genre) => {
            const isActive = selectedGenre === genre;
            return (
              <button
                key={genre}
                onClick={() => onGenreChange(genre)}
                className={`text-xs sm:text-sm font-bold px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-[#06080D] shadow-md shadow-[#F59E0B]/25 scale-[1.02]"
                    : "bg-[#0F1420]/90 text-gray-300 hover:bg-white/[0.08] hover:text-white border border-white/[0.08]"
                }`}
              >
                <span>{getGenreIcon(genre)}</span>
                <span>{genre}</span>
              </button>
            );
          })}
        </div>

        {/* Right scroll arrow on desktop */}
        <button
          onClick={() => scrollGenres("right")}
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-7 h-7 rounded-full bg-[#0F1420] border border-white/20 items-center justify-center text-gray-300 hover:text-white hover:border-[#F59E0B] shadow-lg transition-all cursor-pointer"
          aria-label="Прокрутить жанры вправо"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Dropdowns Row (Чтецы, Длительность, Сортировка) - 100% адаптивно под мобильные */}
      <div className="flex items-center justify-start sm:justify-end gap-2 flex-wrap w-full">
        {/* Narrators Dropdown */}
        {narrators && narrators.length > 1 && (
          <div className="flex-1 sm:flex-initial min-w-[130px] flex items-center gap-1.5 bg-[#0F1420]/80 border border-white/[0.08] px-3 py-2 rounded-xl text-xs text-gray-300 backdrop-blur-md">
            <Mic className="w-3.5 h-3.5 text-[#F59E0B] flex-shrink-0" />
            <select
              value={selectedNarrator}
              onChange={(e) => onNarratorChange?.(e.target.value)}
              className="bg-transparent text-white outline-none cursor-pointer w-full text-xs font-medium"
            >
              <option value="Все" className="bg-[#0F1420]">Все чтецы</option>
              {narrators.filter((n) => n !== "Все").map((n) => (
                <option key={n} value={n} className="bg-[#0F1420]">{n}</option>
              ))}
            </select>
          </div>
        )}

        {/* Duration Dropdown */}
        <div className="flex-1 sm:flex-initial min-w-[130px] flex items-center gap-1.5 bg-[#0F1420]/80 border border-white/[0.08] px-3 py-2 rounded-xl text-xs text-gray-300 backdrop-blur-md">
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#F59E0B] flex-shrink-0" />
          <select
            value={selectedDuration}
            onChange={(e) => onDurationChange(e.target.value)}
            className="bg-transparent text-white outline-none cursor-pointer w-full text-xs font-medium"
          >
            <option value="Все" className="bg-[#0F1420]">Любая длина</option>
            <option value="Короткие (до 3 ч)" className="bg-[#0F1420]">До 3 часов</option>
            <option value="Средние (3–8 ч)" className="bg-[#0F1420]">3–8 часов</option>
            <option value="Лонгриды (8+ ч)" className="bg-[#0F1420]">От 8 часов</option>
          </select>
        </div>

        {/* Sort Dropdown */}
        <div className="flex-1 sm:flex-initial min-w-[130px] flex items-center gap-1.5 bg-[#0F1420]/80 border border-white/[0.08] px-3 py-2 rounded-xl text-xs text-gray-300 backdrop-blur-md">
          <ArrowUpDown className="w-3.5 h-3.5 text-[#F59E0B] flex-shrink-0" />
          <select
            value={selectedSort}
            onChange={(e) => onSortChange(e.target.value)}
            className="bg-transparent text-white outline-none cursor-pointer w-full text-xs font-medium"
          >
            <option value="popular" className="bg-[#0F1420]">По популярности</option>
            <option value="rating" className="bg-[#0F1420]">По рейтингу</option>
            <option value="duration_desc" className="bg-[#0F1420]">Сначала длинные</option>
            <option value="duration_asc" className="bg-[#0F1420]">Сначала короткие</option>
            <option value="year_desc" className="bg-[#0F1420]">По году издания</option>
          </select>
        </div>
      </div>
    </div>
  );
}
