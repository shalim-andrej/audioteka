"use client";

import React, { useState, useEffect, useCallback, useRef, useTransition } from "react";
import { Audiobook } from "@/lib/types";
import BookCard from "@/components/BookCard";
// ВАЖНО: обычные статические импорты.
// Раньше здесь был dynamic(..., { ssr: false }) — компоненты не попадали в HTML,
// появлялись после гидратации и сдвигали сетку книг вниз: CLS 0.272,
// виновник в Lighthouse — "div.grid.grid-cols-2.sm:grid-cols-3...".
import Header from "@/components/Header";
import FilterControls from "./FilterControls";

const PAGE_SIZE = 12;
const SEARCH_DEBOUNCE_MS = 300;

interface HomeClientProps {
  /** Книги, отрендеренные на сервере (первая страница) */
  initialBooks: Audiobook[];
  /** Сколько всего книг в базе — для кнопки «Показать ещё» */
  totalBooks: number;
}

export default function HomeClient({ initialBooks, totalBooks }: HomeClientProps) {
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);

  const [books, setBooks] = useState<Audiobook[]>(initialBooks);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string>("Все");
  const [sortBy, setSortBy] = useState("popular");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialBooks.length < totalBooks);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const abortRef = useRef<AbortController | null>(null);
  // true, пока показываем серверную первую страницу без фильтров
  const isInitialState = useRef(true);

  // Дебаунс поиска: не дёргаем API на каждый символ
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const fetchPage = useCallback(
    async (targetPage: number, mode: "replace" | "append") => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (mode === "replace") setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (selectedGenre !== "Все") params.set("genre", selectedGenre);
        if (sortBy) params.set("sort", sortBy);
        params.set("page", String(targetPage));
        params.set("limit", String(PAGE_SIZE));

        const res = await fetch(`/api/audiobooks?${params.toString()}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        if (!data.success || !Array.isArray(data.items)) {
          throw new Error("Некорректный ответ API");
        }

        const items: Audiobook[] = data.items;

        if (mode === "append") {
          setBooks((prev) => {
            const seen = new Set(prev.map((b) => b.id));
            return [...prev, ...items.filter((b) => !seen.has(b.id))];
          });
        } else {
          setBooks(items);
        }

        setHasMore(items.length === PAGE_SIZE && targetPage * PAGE_SIZE < (data.total ?? 0));
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        console.error(err);
        setError("Не удалось загрузить книги. Попробуйте ещё раз.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [debouncedSearch, selectedGenre, sortBy]
  );

  // Реакция на смену фильтров/поиска — один запрос, первая страница
  useEffect(() => {
    if (isInitialState.current) {
      isInitialState.current = false;
      // первая загрузка: сервер уже отдал книги, если фильтры не менялись
      if (!debouncedSearch && selectedGenre === "Все" && sortBy === "popular") return;
    }
    setPage(1);
    startTransition(() => {
      void fetchPage(1, "replace");
    });
  }, [debouncedSearch, selectedGenre, sortBy, fetchPage]);

  // Догрузка следующей страницы
  useEffect(() => {
    if (page > 1) void fetchPage(page, "append");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearchChange = useCallback((q: string) => setSearchQuery(q), []);

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) setPage((p) => p + 1);
  }, [loading, hasMore]);

  return (
    <div>
      <Header
        onOpenFavorites={() => setIsFavoritesOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
      />

      <FilterControls
        selectedGenre={selectedGenre}
        onGenreChange={setSelectedGenre}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {error && (
        <div
          role="alert"
          className="p-4 mb-6 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm"
        >
          {error}
        </div>
      )}

      {loading && books.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[2/3] bg-white/[0.04] rounded-2xl mb-2" />
              <div className="h-3 bg-white/[0.04] rounded w-3/4 mb-1" />
              <div className="h-2 bg-white/[0.04] rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-bold text-gray-300 mb-2">Ничего не найдено</p>
          <p className="text-sm">Попробуйте изменить фильтры или поисковый запрос.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {/* priority первой СТРОКИ, а не одной карточки: на мобильном
                первый экран — это две обложки в ряд, и вторая, будучи
                lazy, приходила к 4.9 s и становилась LCP-элементом. */}
            {books.map((book, index) => (
              <BookCard key={book.id} book={book} index={index} priority={index < 2} />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center mt-8">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loading}
                className="min-h-[48px] px-6 py-3 rounded-xl bg-[#F59E0B] hover:bg-[#EA580C] text-[#06080D] font-black text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 shadow-lg shadow-[#F59E0B]/20"
              >
                {loading ? "Загрузка…" : "Показать ещё"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
