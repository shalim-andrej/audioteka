// src/components/FilterControls.tsx
"use client";

import React, { memo } from "react";

interface FilterControlsProps {
  selectedGenre: string;
  onGenreChange: (genre: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
}

const genres = [
  "Все",
  "Фантастика",
  "Детективы",
  "Ужасы и мистика",
  "Психология",
  "Классика",
  "Для детей",
];

function FilterControls({ selectedGenre, onGenreChange, sortBy, onSortChange }: FilterControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <div role="group" aria-label="Фильтр по жанру" className="flex flex-wrap gap-1.5">
        {genres.map((g) => {
          const active = selectedGenre === g;
          return (
            <button
              key={g}
              type="button"
              onClick={() => onGenreChange(g)}
              aria-pressed={active}
              className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                active
                  ? "bg-[#F59E0B] text-[#06080D] border-[#F59E0B]"
                  : "bg-white/[0.04] text-gray-200 border-white/[0.08] hover:bg-white/[0.08]"
              }`}
            >
              {g}
            </button>
          );
        })}
      </div>

      {/* Явный label для скринридера: Lighthouse ругался «select without label» */}
      <label htmlFor="sort-select" className="sr-only">
        Сортировка книг
      </label>
      <select
        id="sort-select"
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value)}
        aria-label="Сортировка книг"
        className="ml-auto min-h-[44px] bg-[#0F1420] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-200 outline-none focus:border-[#F59E0B] cursor-pointer"
      >
        <option value="popular">По популярности</option>
        <option value="newest">Новинки</option>
        <option value="rating">По рейтингу</option>
        <option value="duration">По длительности</option>
      </select>
    </div>
  );
}

export default memo(FilterControls);
