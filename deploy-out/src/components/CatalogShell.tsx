// src/components/CatalogShell.tsx
"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import FilterControls from "@/app/FilterControls";

/**
 * Тонкая клиентская оболочка каталога: только фильтры и сетка.
 * Выборки данных здесь нет — сетку рендерит InfiniteGrid,
 * данные приходят с сервера.
 *
 * Фильтры меняют URL, сервер перерисовывает страницу и присылает новую сетку.
 * Кнопки «Показать ещё» больше нет: догрузка идёт по прокрутке.
 *
 * Шапку отсюда убрали: она рисуется в page.tsx выше баннера.
 *
 * ВАЖНО про searchQuery.
 * Раньше адрес собирался только из жанра и сортировки, поэтому смена
 * сортировки на странице поиска выбрасывала параметр search — человек
 * оказывался на главной без поиска. Теперь поисковый запрос передаётся
 * в оболочку пропом и сохраняется в адресе при любом фильтре.
 */
interface CatalogShellProps {
  children: React.ReactNode;
  selectedGenre: string;
  sortBy: string;
  searchQuery?: string;
}

export default function CatalogShell({
  children,
  selectedGenre,
  sortBy,
  searchQuery,
}: CatalogShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, setIsPending] = useState(false);

  const buildHref = useCallback(
    (next: { genre?: string; sort?: string }) => {
      const params = new URLSearchParams();
      const genre = next.genre !== undefined ? next.genre : selectedGenre;
      const sort = next.sort !== undefined ? next.sort : sortBy;
      const search = (searchQuery || "").trim();

      if (genre && genre !== "Все") params.set("genre", genre);
      if (sort && sort !== "popular") params.set("sort", sort);
      // поиск переносим всегда — иначе фильтр уводит на главную
      if (search) params.set("search", search);

      const qs = params.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [pathname, selectedGenre, sortBy, searchQuery]
  );

  /*
   * ИСПРАВЛЕНИЕ «сетка застывает после первого клика».
   *
   * Раньше setIsPending(true) вызывался при клике, а сбросить флаг было некому.
   * Сетка оставалась с opacity-60 и pointer-events-none навсегда — выглядело
   * как «фильтр не сработал», хотя данные уже обновились.
   *
   * Теперь флаг снимается, как только сервер прислал новые значения фильтров,
   * то есть когда переход действительно завершён.
   */
  useEffect(() => {
    setIsPending(false);
  }, [selectedGenre, sortBy, searchQuery]);

  const handleGenreChange = useCallback(
    (genre: string) => {
      setIsPending(true);
      // смена фильтра сбрасывает накопленные страницы — начинаем с первой
      router.push(buildHref({ genre }), { scroll: false });
    },
    [router, buildHref]
  );

  const handleSortChange = useCallback(
    (sort: string) => {
      setIsPending(true);
      router.push(buildHref({ sort }), { scroll: false });
    },
    [router, buildHref]
  );

  return (
    <div>
      <FilterControls
        selectedGenre={selectedGenre}
        onGenreChange={handleGenreChange}
        sortBy={sortBy}
        onSortChange={handleSortChange}
      />

      <div
        aria-busy={isPending}
        className={isPending ? "opacity-60 transition-opacity pointer-events-none" : "transition-opacity"}
      >
        {children}
      </div>
    </div>
  );
}