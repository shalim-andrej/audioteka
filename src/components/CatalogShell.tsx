// src/components/CatalogShell.tsx
"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import FilterControls from "@/components/FilterControls";

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
      if (search) params.set("search", search);

      const qs = params.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [pathname, selectedGenre, sortBy, searchQuery]
  );

  // Сбрасываем isPending, когда сервер прислал новые значения фильтров.
  // Но если пользователь кликнул на уже активный фильтр, selectedGenre не изменится,
  // и isPending останется true. Поэтому мы также сбрасываем его через таймаут
  // как fallback (на случай, если router.push не вызвал перерисовку).
  useEffect(() => {
    setIsPending(false);
  }, [selectedGenre, sortBy, searchQuery]);

  const handleGenreChange = useCallback(
    (genre: string) => {
      // Если жанр уже выбран — не блокируем интерфейс и не делаем лишний push
      if (genre === selectedGenre) return;

      setIsPending(true);
      router.push(buildHref({ genre }), { scroll: false });
    },
    [router, buildHref, selectedGenre]
  );

  const handleSortChange = useCallback(
    (sort: string) => {
      if (sort === sortBy) return;

      setIsPending(true);
      router.push(buildHref({ sort }), { scroll: false });
    },
    [router, buildHref, sortBy]
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