// src/components/InfiniteGrid.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Audiobook } from "@/lib/types";
import BookCard from "@/components/BookCard";

/**
 * Бесконечная прокрутка каталога.
 *
 * Первая страница приходит с сервера уже готовой разметкой (LCP и SEO цели).
 * Следующие догружаются, когда до низа остаётся ~600 px.
 *
 * Номер загруженной страницы пишется в адрес через history.replaceState
 * (не push — чтобы не засорять историю). Благодаря этому при возврате
 * с карточки книги сервер отдаёт столько же книг, и браузер восстанавливает
 * прокрутку на том же месте.
 */
interface InfiniteGridProps {
  initialBooks: Audiobook[];
  totalBooks: number;
  initialPage: number;
  pageSize: number;
  genre: string;
  sort: string;
}

const GRID_CLASS = "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4";

export default function InfiniteGrid({
  initialBooks,
  totalBooks,
  initialPage,
  pageSize,
  genre,
  sort,
}: InfiniteGridProps) {
  const [books, setBooks] = useState<Audiobook[]>(initialBooks);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(initialPage * pageSize >= totalBooks);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // ref, чтобы observer не «выстрелил» дважды за одну прокрутку
  const loadingRef = useRef(false);

  /*
   * ИСПРАВЛЕНИЕ «фильтры не переключаются».
   *
   * useState(initialBooks) запоминает первый пропс навсегда. Когда меняется
   * категория или сортировка, сервер присылает новый initialBooks, но
   * состояние остаётся старым — и сетка не обновляется до перезагрузки.
   *
   * Здесь мы сбрасываем состояние в момент смены фильтра. Ключ filterKey
   * зависит только от genre и sort: он меняется ровно тогда, когда сервер
   * должен был прислать другую выборку.
   */
  const filterKey = `${genre}|${sort}`;

  useEffect(() => {
    setBooks(initialBooks);
    setPage(initialPage);
    setDone(initialPage * pageSize >= totalBooks);
    loadingRef.current = false;
    // initialBooks, initialPage и totalBooks меняются вместе с filterKey,
    // поэтому в зависимостях достаточно его одного
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || done) return;
    loadingRef.current = true;
    setLoading(true);

    const nextPage = page + 1;

    try {
      const params = new URLSearchParams();
      if (genre && genre !== "Все") params.set("genre", genre);
      if (sort) params.set("sort", sort);
      params.set("page", String(nextPage));
      params.set("limit", String(pageSize));

      const res = await fetch(`/api/audiobooks?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const items: Audiobook[] = Array.isArray(data.items) ? data.items : [];

      setBooks((prev) => {
        const seen = new Set(prev.map((b) => b.id));
        return [...prev, ...items.filter((b) => !seen.has(b.id))];
      });

      setPage(nextPage);

      const total = typeof data.total === "number" ? data.total : totalBooks;
      setDone(items.length < pageSize || nextPage * pageSize >= total);

      // Фиксируем страницу в адресе — для возврата назад на то же место
      try {
        const url = new URL(window.location.href);
        if (nextPage > 1) url.searchParams.set("page", String(nextPage));
        else url.searchParams.delete("page");
        window.history.replaceState({ ...window.history.state }, "", url.toString());
      } catch {
        /* history может быть недоступен — не критично */
      }
    } catch (error) {
      console.error("Не удалось догрузить книги:", error);
      setDone(true);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [page, done, pageSize, genre, sort, totalBooks]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    // Браузеры без IntersectionObserver: остаётся кнопка «Загрузить ещё»
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      // 600px — начинаем грузить до того, как пользователь увидит низ
      { rootMargin: "600px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div>
      <div className={GRID_CLASS}>
        {/* priority первой СТРОКИ: на мобильном это две обложки,
            и вторая, будучи lazy, приходила к 4.9 s и становилась LCP. */}
        {books.map((book, index) => (
          <BookCard key={book.id} book={book} index={index} priority={index < 2} />
        ))}

        {loading &&
          Array.from({ length: 5 }).map((_, i) => (
            <div key={`skeleton-${i}`} className="animate-pulse" aria-hidden="true">
              <div className="aspect-[2/3] bg-white/[0.04] rounded-2xl mb-2" />
              <div className="h-3 bg-white/[0.04] rounded w-3/4 mb-1" />
              <div className="h-2 bg-white/[0.04] rounded w-1/2" />
            </div>
          ))}
      </div>

      {/* Точка, приближение к которой запускает загрузку */}
      <div ref={sentinelRef} className="h-px w-full" aria-hidden="true" />

      {/*
        Кнопка нужна для клавиатуры и скринридеров: бесконечная прокрутка
        им недоступна. Мыши и тачу она не видна — показывается только
        при попадании фокуса.
      */}
      {!done && (
        <button
          type="button"
          onClick={() => void loadMore()}
          className="sr-only focus:not-sr-only focus:mx-auto focus:mt-6 focus:block focus:min-h-[44px] focus:px-6 focus:py-3 focus:rounded-xl focus:bg-[#F59E0B] focus:text-[#06080D] focus:font-bold"
        >
          Загрузить ещё книги
        </button>
      )}

      {done && books.length > 0 && (
        <p className="text-center text-xs text-gray-500 mt-10">
          Это все книги по выбранному фильтру
        </p>
      )}

      <div aria-live="polite" className="sr-only">
        {loading ? "Загружаем ещё книги" : ""}
      </div>
    </div>
  );
}