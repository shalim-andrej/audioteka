import Link from "next/link";
import { Audiobook } from "@/lib/types";
import { getBooksFromDb } from "@/lib/db-service";
import CatalogShell from "@/components/CatalogShell";
import InfiniteGrid from "@/components/InfiniteGrid";
import BookCard from "@/components/BookCard";
import WeeklyBookBanner from "@/components/WeeklyBookBanner";
import HeaderIsland from "@/components/HeaderIsland";
import ScrollToTop from "@/components/ScrollToTop";
import { pickWeeklyBook } from "@/lib/weekly";

export const revalidate = 300;

/** Размер страницы для догрузки. Сетка одна, поэтому число не влияет на вёрстку. */
const PAGE_SIZE = 12;

/** Сколько книг показываем в блоке «Популярное». */
const POPULAR_COUNT = 5;

/**
 * Сколько книг тянем для выбора «книги недели».
 * Пул шире, чем блок «Популярное», чтобы ротация была заметной.
 */
const WEEKLY_POOL_SIZE = 24;

/**
 * Поля, которые нужны карточке.
 * Главы, полные описания и комментарии в браузер не уходят.
 */
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

export default async function HomePage({ searchParams }: HomePageProps) {
  const sp = await searchParams;

  const genre = sp.genre && sp.genre.length > 0 ? sp.genre : "Все";
  const sort: SortValue = SORT_VALUES.includes(sp.sort as SortValue)
    ? (sp.sort as SortValue)
    : "popular";

  const search = sp.search?.trim() || "";

  const requestedPage = Number.parseInt(sp.page ?? "1", 10);
  const pageNumber = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  /*
   * Отдаём всё, что пользователь уже догрузил прокруткой: первые
   * pageNumber * PAGE_SIZE книг. Это нужно для возврата назад — сервер
   * отрисует столько же карточек, и браузер восстановит позицию скролла.
   */
  const limit = PAGE_SIZE * pageNumber;

  const result = await getBooksFromDb({
    sort,
    genre: genre === "Все" ? undefined : genre,
    search: search || undefined,
    limit,
    page: 1,
  });

  const totalBooks = result.total || 0;
  const initialBooks = (result.items ?? []).map(toCardBook);

  /*
   * Баннер и «Популярное» показываем только на несфильтрованном каталоге:
   * когда человек выбрал жанр или ищет, ему нужна выдача, а не промо-блок.
   * Проверяем жанр и поиск, но НЕ номер страницы — иначе баннер исчезал бы
   * после прокрутки и возврата с карточки книги.
   */
  const showPromo = genre === "Все" && !search;

  let weeklyBookRaw: Audiobook | null = null;
  let popularBooks: Audiobook[] = [];

  if (showPromo) {
    // Один запрос на оба блока: топ по популярности.
    // skipCount — общее число здесь не нужно, а COUNT(*) по всей таблице дорогой.
    const topResult = await getBooksFromDb({
      sort: "popular",
      limit: WEEKLY_POOL_SIZE,
      skipCount: true,
    });

    const topBooks = topResult.items ?? [];
    weeklyBookRaw = pickWeeklyBook(topBooks);
    popularBooks = topBooks.slice(0, POPULAR_COUNT).map(toCardBook);
  }

  /*
   * В баннере два разных объекта:
   *   weeklyBookRaw  — с описанием и рейтингом, для серверной разметки;
   *   weeklyBookCard — обрезанный, его получает клиентский островок с кнопкой play.
   */
  const weeklyBookCard = weeklyBookRaw ? toCardBook(weeklyBookRaw) : null;

  /*
   * Число для подписи в поле поиска.
   * На странице поиска totalBooks — это количество найденных книг (166),
   * и «Поиск по 166 книгам» вводило в заблуждение. Подпись про размер
   * каталога имеет смысл только на чистом каталоге.
   */
  const headerCount = search || genre !== "Все" ? undefined : totalBooks;

  return (
    <div className="min-h-screen bg-[#06080D] text-white">
      {/*
        Шапка стоит здесь — до баннера и до заголовка каталога.
        Раньше её рисовал CatalogShell, и она попадала в середину страницы:
        между «Каталог произведений» и фильтрами.
      */}
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

        {/*
          Возврат на главную.
          На странице поиска и при выбранном жанре человек мог уйти только
          через логотип. Теперь есть явная ссылка нормального размера
          (44 px по высоте — требование к размеру цели нажатия).
        */}
        {(search || genre !== "Все") && (
          <Link
            href="/"
            className="inline-flex items-center gap-2 min-h-[44px] mb-4 text-sm font-bold text-[#F59E0B] hover:text-[#EA580C] transition-colors"
          >
            <span aria-hidden="true">←</span> На главную
          </Link>
        )}

        <div className="mb-8">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white mb-2">
            {search ? `Поиск: ${search}` : "Каталог произведений"}
          </h1>
          <p className="text-gray-400 text-sm">
            {search
              ? `Найдено ${totalBooks.toLocaleString("ru-RU")} книг.`
              : totalBooks > 0
                ? `${totalBooks.toLocaleString("ru-RU")} произведений в каталоге. Слушайте на Литрес.`
                : "Каталог пополняется."}
          </p>
        </div>

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
      </main>

      {/* Кнопка «Наверх»: появляется после 700 px прокрутки */}
      <ScrollToTop />
    </div>
  );
}