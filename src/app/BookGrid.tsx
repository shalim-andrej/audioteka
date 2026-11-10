// src/app/BookGrid.tsx
// СЕРВЕРНЫЙ КОМПОНЕНТ (без "use client").
// Асинхронный — стримится через <Suspense> в page.tsx.

import { Audiobook } from "@/lib/types";
import { getBooksFromDb } from "@/lib/db-service";
import CatalogShell from "@/components/CatalogShell";
import InfiniteGrid from "@/components/InfiniteGrid";

const PAGE_SIZE = 12;

const CARD_FIELDS = [
  "id",
  "title",
  "author",
  "narrator",
  "series",
  "genre",
  "year",
  "rating",
  "votesCount",
  "durationSeconds",
  "durationFormatted",
  "coverUrl",
  "coverFile",
  "listenUrl",
  "litresId",
  "isbn",
  "source",
  "isFeatured",
] as const satisfies readonly (keyof Audiobook)[];

function toCardBook(book: Audiobook): Audiobook {
  const lean: Record<string, unknown> = {};
  for (const key of CARD_FIELDS) {
    const value = book[key];
    if (value !== undefined) lean[key] = value;
  }
  lean.description = "";
  lean.shortDescription = "";
  lean.chapters = [];
  return lean as unknown as Audiobook;
}

interface BookGridProps {
  genre: string;
  sort: string;
  search: string;
  limit: number;
  pageNumber: number;
}

/**
 * Асинхронный серверный компонент — грузит карточки каталога.
 * Стримится через <Suspense> в page.tsx: пользователь видит заголовок
 * и счётчик сразу, а сетку — по мере готовности.
 */
export default async function BookGrid({
  genre,
  sort,
  search,
  limit,
  pageNumber,
}: BookGridProps) {
  const result = await getBooksFromDb({
    sort,
    genre: genre === "Все" ? undefined : genre,
    search: search || undefined,
    limit,
    page: 1,
  });

  const initialBooks = (result.items ?? []).map(toCardBook);
  const totalBooks = result.total || 0;

  return (
    <CatalogShell
      selectedGenre={genre}
      sortBy={sort}
      searchQuery={search || undefined}
    >
      {initialBooks.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-bold text-gray-300 mb-2">
            {search ? "По запросу ничего не найдено" : "Ничего не найдено"}
          </p>
          <p className="text-sm">
            {search
              ? "Попробуйте другое слово или сократите запрос."
              : "Попробуйте изменить фильтры или поисковый запрос."}
          </p>
        </div>
      ) : (
        <InfiniteGrid
          initialBooks={initialBooks}
          totalBooks={totalBooks}
          initialPage={pageNumber}
          pageSize={PAGE_SIZE}
          genre={genre}
          sort={sort}
        />
      )}
    </CatalogShell>
  );
}