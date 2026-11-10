import Link from "next/link";
import { Suspense } from "react";
import { Audiobook } from "@/lib/types";
import { getBooksFromDb } from "@/lib/db-service";
import BookCard from "@/components/BookCard";
import WeeklyBookBanner from "@/components/WeeklyBookBanner";
import HeaderIsland from "@/components/HeaderIsland";
import ScrollToTop from "@/components/ScrollToTop";
import BookGrid from "./BookGrid";
import { pickWeeklyBook } from "@/lib/weekly";

export const revalidate = 300;

const PAGE_SIZE = 12;
const POPULAR_COUNT = 5;
const WEEKLY_POOL_SIZE = 24;

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

const SORT_VALUES = ["popular", "newest", "rating", "duration"] as const;
type SortValue = (typeof SORT_VALUES)[number];

interface HomePageProps {
  searchParams: Promise<{
    genre?: string;
    sort?: string;
    page?: string;
    search?: string;
  }>;
}

/**
 * Скелетон для сетки карточек.
 * Показывается, пока BookGrid не готов (Suspense fallback).
 */
function CatalogSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="animate-pulse" aria-hidden="true">
          <div className="aspect-[2/3] bg-white/[0.04] rounded-2xl mb-2" />
          <div className="h-3 bg-white/[0.04] rounded w-3/4 mb-1" />
          <div className="h-2 bg-white/[0.04] rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const sp = await searchParams;

  const genre = sp.genre && sp.genre.length > 0 ? sp.genre : "Все";
  const sort: SortValue = SORT_VALUES.includes(sp.sort as SortValue)
    ? (sp.sort as SortValue)
    : "popular";

  const search = sp.search?.trim() || "";

  const requestedPage = Number.parseInt(sp.page ?? "1", 10);
  const pageNumber = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const limit = PAGE_SIZE * pageNumber;
  const showPromo = genre === "Все" && !search;

  /*
   * Параллельно запрашиваем:
   *   1. Быстрый COUNT(*) для заголовка (totalBooks).
   *   2. Топ для «Популярного» и книги недели (если showPromo).
   * Каталог (карточки) грузится отдельно — внутри BookGrid, стримится.
   */
  const [countResult, topResult] = await Promise.all([
    getBooksFromDb({
      sort,
      genre: genre === "Все" ? undefined : genre,
      search: search || undefined,
      limit: 0, // ← только счётчик, без карточек
      page: 1,
    }),
    showPromo
      ? getBooksFromDb({
          sort: "popular",
          limit: WEEKLY_POOL_SIZE,
          skipCount: true,
        })
      : Promise.resolve({ items: [], total: 0 }),
  ]);

  const totalBooks = countResult.total || 0;

  let weeklyBookRaw: Audiobook | null = null;
  let popularBooks: Audiobook[] = [];

  if (showPromo) {
    const topBooks = topResult.items ?? [];
    weeklyBookRaw = pickWeeklyBook(topBooks);
    popularBooks = topBooks.slice(0, POPULAR_COUNT).map(toCardBook);
  }

  const weeklyBookCard = weeklyBookRaw ? toCardBook(weeklyBookRaw) : null;

  const headerCount = search || genre !== "Все" ? undefined : totalBooks;

  return (
    <div className="min-h-screen bg-[#06080D] text-white">
      {/*
        Единственный h1 на странице — семантический якорь.
        Визуально скрыт (sr-only), но в DOM для скринридеров и SEO.
        Все остальные заголовки — h2 (секции) и h3 (карточки).
      */}
      <h1 className="sr-only">Аудиотека PRO — каталог аудиокниг</h1>

      <HeaderIsland totalBooks={headerCount} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {weeklyBookRaw && weeklyBookCard && (
          <WeeklyBookBanner book={weeklyBookRaw} playerBook={weeklyBookCard} />
        )}

        {popularBooks.length > 0 && (
          <section className="mb-10">
            <h2 className="font-serif text-2xl font-bold text-white mb-4 flex items-center gap-2">
              Популярное
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {popularBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </section>
        )}

        {(search || genre !== "Все") && (
          <Link
            href="/"
            className="inline-flex items-center gap-2 min-h-[44px] mb-4 text-sm font-bold text-[#F59E0B] hover:text-[#EA580C] transition-colors"
          >
            <span aria-hidden="true">←</span> На главную
          </Link>
        )}

        <div className="mb-8">
          {/* h2, не h1: h1 уже есть (sr-only) выше */}
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white mb-2">
            {search ? `Поиск: ${search}` : "Каталог произведений"}
          </h2>
          <p className="text-gray-400 text-sm">
            {search
              ? `Найдено ${totalBooks.toLocaleString("ru-RU")} книг.`
              : totalBooks > 0
                ? `${totalBooks.toLocaleString("ru-RU")} произведений в каталоге. Слушайте на Литрес.`
                : "Каталог пополняется."}
          </p>
        </div>

        {/*
          Настоящий стриминг: BookGrid — асинхронный серверный компонент.
          Он не рендерится до готовности, показывается скелетон.
          Заголовок и счётчик видны сразу (они не ждут BookGrid).
        */}
        <Suspense fallback={<CatalogSkeleton />}>
          <BookGrid
            genre={genre}
            sort={sort}
            search={search}
            limit={limit}
            pageNumber={pageNumber}
          />
        </Suspense>
      </main>

      <ScrollToTop />
    </div>
  );
}