"use client";

import React from "react";
import { SlidersHorizontal, ArrowUpDown, Mic, X } from "lucide-react";

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
  return (
    <div className="space-y-4 mb-8">
      {/* Active Search Filter Badge (если пользователь ищет в шапке) */}
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

      {/* Filter Chips & Controls Row (Уровень Apple Books / LitRes) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Genre Chips Horizontal Scroll */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {genres.map((genre) => {
            const isActive = selectedGenre === genre;
            return (
              <button
                key={genre}
                onClick={() => onGenreChange(genre)}
                className={`text-xs md:text-sm font-bold px-4 py-2.5 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-[#06080D] shadow-md shadow-[#F59E0B]/25 scale-[1.02]"
                    : "bg-[#0F1420]/80 text-gray-300 hover:bg-white/[0.08] hover:text-white border border-white/[0.08]"
                }`}
              >
                {genre}
              </button>
            );
          })}
        </div>

        {/* Dropdowns: Narrator, Duration & Sort */}
        <div className="flex items-center gap-2.5 self-end lg:self-auto flex-wrap">
          {/* Narrators Filter Dropdown */}
          {narrators && narrators.length > 1 && (
            <div className="flex items-center gap-1.5 bg-[#0F1420]/80 border border-white/[0.08] px-3.5 py-2 rounded-xl text-xs md:text-sm text-gray-300 backdrop-blur-md">
              <Mic className="w-3.5 h-3.5 text-[#F59E0B]" />
              <select
                value={selectedNarrator}
                onChange={(e) => onNarratorChange?.(e.target.value)}
                className="bg-transparent text-white outline-none cursor-pointer pr-1 text-xs md:text-sm font-medium"
              >
                <option value="Все" className="bg-[#0F1420]">Все чтецы</option>
                {narrators.filter((n) => n !== "Все").map((n) => (
                  <option key={n} value={n} className="bg-[#0F1420]">{n}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-[#0F1420]/80 border border-white/[0.08] px-3.5 py-2 rounded-xl text-xs md:text-sm text-gray-300 backdrop-blur-md">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#F59E0B]" />
            <select
              value={selectedDuration}
              onChange={(e) => onDurationChange(e.target.value)}
              className="bg-transparent text-white outline-none cursor-pointer pr-1 text-xs md:text-sm font-medium"
            >
              <option value="Все" className="bg-[#0F1420]">Любая длительность</option>
              <option value="Короткие (до 3 ч)" className="bg-[#0F1420]">Короткие (до 3 ч)</option>
              <option value="Средние (3–8 ч)" className="bg-[#0F1420]">Средние (3–8 ч)</option>
              <option value="Лонгриды (8+ ч)" className="bg-[#0F1420]">Лонгриды (8+ ч)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-[#0F1420]/80 border border-white/[0.08] px-3.5 py-2 rounded-xl text-xs md:text-sm text-gray-300 backdrop-blur-md">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#F59E0B]" />
            <select
              value={selectedSort}
              onChange={(e) => onSortChange(e.target.value)}
              className="bg-transparent text-white outline-none cursor-pointer pr-1 text-xs md:text-sm font-medium"
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
    </div>
  );
}
