// src/app/book/[id]/page.tsx
// СЕРВЕРНЫЙ КОМПОНЕНТ. Отдаёт готовый HTML: обложка, заголовок, описание,
// оглавление, похожие книги. В браузер уходят только маленькие островки.
//
// Почему так: раньше вся страница была одним клиентским компонентом на 1000+
// строк, и браузер должен был «оживить» её целиком. Lighthouse показывал
// TBT 2 460 мс — почти 2,5 секунды браузер не отвечал на клики.
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Headphones,
  MessageSquare,
  Mic,
  Layers,
  Sparkles,
} from "lucide-react";

import { getBookByIdFromDb, getBooksFromDb } from "@/lib/db-service";
import BookCard from "@/components/BookCard";
import BookShell from "./BookShell";
import { BookActions, NarrationsList } from "./BookActions";
import BookRating from "./BookRating";
import { BookPlayerPanel, ChapterQuickList, ChaptersTab } from "./BookPlayer";
import type { PlayableBook, SlimChapter } from "./BookPlayer";
import CommentsTab from "./CommentsTab";

export const revalidate = 300;

const SITE_NAME = "АУДИОТЕКА PRO";

type TabKey = "about" | "chapters" | "narrations" | "comments";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const book = await getBookByIdFromDb(id);

  if (!book) return { title: `Аудиокнига не найдена | ${SITE_NAME}` };

  const title = `${book.title} — ${book.author} | ${SITE_NAME}`;
  const description =
    book.shortDescription ||
    book.description?.slice(0, 160) ||
    `Аудиокнига «${book.title}» автора ${book.author}: описание, чтец, длительность и переход к прослушиванию.`;

  return {
    title,
    description,
    alternates: { canonical: `/book/${book.id}` },
    openGraph: {
      type: "book",
      title,
      description,
      images: book.coverUrl ? [{ url: book.coverUrl }] : [],
    },
  };
}

export default async function BookDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: tabParam } = await searchParams;

  const book = await getBookByIdFromDb(id);
  if (!book) notFound();

  const tab: TabKey =
    tabParam === "chapters" || tabParam === "narrations" || tabParam === "comments"
      ? tabParam
      : "about";

  // Похожие книги по первому жанру. skipCount — общее число нигде не выводится,
  // а COUNT(*) с фильтром по жанру читает всю таблицу.
  const primaryGenre = (book.genre || "").split("&")[0].trim();
  let relatedBooks: Awaited<ReturnType<typeof getBooksFromDb>>["items"] = [];
  if (primaryGenre) {
    try {
      const rel = await getBooksFromDb({ genre: primaryGenre, limit: 6, skipCount: true });
      relatedBooks = rel.items.filter((b) => b.id !== book.id).slice(0, 5);
    } catch {
      relatedBooks = [];
    }
  }

  const chapters = book.chapters ?? [];
  const totalSeconds = Number(book.durationSeconds) || 0;
  const durationHours = Math.floor(totalSeconds / 3600);
  const durationMins = Math.floor((totalSeconds % 3600) / 60);

  /*
   * Облегчённая книга для клиентских островков: БЕЗ массива глав.
   * PlayerContext догрузит главы сам при нажатии play.
   */
  const playable: PlayableBook = {
    id: book.id,
    title: book.title,
    author: book.author,
    narrator: book.narrator,
    coverUrl: book.coverUrl,
    listenUrl: book.listenUrl,
    chapters: [],
  };

  const slimChapters: SlimChapter[] = chapters.map((c) => ({
    id: c.id,
    num: c.num,
    title: c.title,
    durationFormatted: c.durationFormatted,
    startTime: c.startTime,
    audioUrl: c.audioUrl,
  }));

  const comments = book.comments ?? [];

  // ---- JSON-LD (без выдуманных значений: рейтинг только если он реальный) ----
  const ratingValue = Number(book.rating);
  const ratingCount = Number(book.votesCount);
  const hasRating = ratingValue > 0 && ratingCount > 0;

  const bookJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Audiobook",
    name: book.title,
    author: { "@type": "Person", name: book.author },
    ...(book.narrator ? { readBy: { "@type": "Person", name: book.narrator } } : {}),
    ...(book.coverUrl ? { image: book.coverUrl } : {}),
    ...(book.isbn ? { isbn: book.isbn } : {}),
    ...(book.description ? { description: book.description.slice(0, 250) } : {}),
    ...(totalSeconds > 0 ? { duration: `PT${durationHours}H${durationMins}M` } : {}),
    inLanguage: "ru",
    ...(book.listenUrl ? { url: book.listenUrl, sameAs: book.listenUrl } : {}),
    ...(hasRating
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue, bestRating: 5, ratingCount } }
      : {}),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Каталог", item: "/" },
      ...(primaryGenre ? [{ "@type": "ListItem", position: 2, name: primaryGenre }] : []),
      {
        "@type": "ListItem",
        position: primaryGenre ? 3 : 2,
        name: book.title,
        item: `/book/${book.id}`,
      },
    ],
  };

  const tabHref = (key: TabKey) => (key === "about" ? `/book/${book.id}` : `/book/${book.id}?tab=${key}`);

  const tabClass = (key: TabKey) =>
    `px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
      tab === key
        ? "bg-[#F59E0B] text-[#06080D] shadow-md shadow-[#F59E0B]/20"
        : "bg-white/[0.04] text-gray-300 hover:text-white hover:bg-white/[0.08]"
    }`;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(bookJsonLd).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c") }}
      />

      <BookShell>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 min-h-[44px] mb-3 text-sm font-bold text-[#F59E0B] hover:text-[#EA580C] transition-colors"
          >
            <span aria-hidden="true">←</span> На главную
          </Link>

          <nav className="flex items-center gap-2 text-xs text-gray-400 mb-6 flex-wrap">
            <Link href="/" className="hover:text-[#F59E0B] transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              Главная
            </Link>
            <span>/</span>
            <span className="text-gray-500">Жанр:</span>
            <Link href={`/?genre=${encodeURIComponent(book.genre)}`} className="hover:text-[#F59E0B] transition-colors">{book.genre}</Link>
            <span>/</span>
            <span className="text-gray-500">Автор:</span>
            <span className="text-gray-300 font-medium">{book.author}</span>
            <span>/</span>
            <span className="text-[#F59E0B] font-semibold truncate max-w-[260px]">{book.title}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-[330px_1fr] gap-8 lg:gap-12 items-start mb-14">
            {/* ---------- ЛЕВАЯ КОЛОНКА (сервер) ---------- */}
            <div className="flex flex-col space-y-6">
              <div className="relative w-full max-w-[330px] mx-auto lg:mx-0 aspect-[2/3] rounded-3xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] border border-white/15 bg-[#0F1420] group">
                {book.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={book.coverUrl}
                    alt={book.title}
                    className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-[#1B2233] via-[#121722] to-[#0B0E16]" />
                )}
                <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white/15 via-white/5 to-transparent pointer-events-none" />
                <div className="absolute top-4 left-4 bg-black/70 px-3 py-1 rounded-full border border-white/10 text-[10px] font-bold text-[#F59E0B] tracking-wider uppercase">
                  {book.isFeatured ? "★ Выбор редакции" : "Аудиокнига PRO"}
                </div>
              </div>

              <BookActions bookId={book.id} title={book.title} />

              <BookRating
                rating={book.rating}
                narratorRating={book.narratorRating ?? 0}
                narrator={book.narrator}
                              bookId={book.id}
              />

              <div className="w-full max-w-[330px] mx-auto lg:mx-0 p-5 rounded-2xl bg-[#0F1420]/60 border border-white/[0.08] space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-white/[0.08] pb-2">
                  Технические данные
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Время звучания:</span>
                    <span className="font-semibold text-white">{book.durationFormatted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Битрейт аудио:</span>
                    <span className="font-semibold text-white">{book.bitrate || "192 kbps, MP3 Stereo"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Размер архива:</span>
                    <span className="font-semibold text-white">{book.fileSize || "480 МБ"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Год издания:</span>
                    <span className="font-semibold text-white">{book.year} г.</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Язык:</span>
                    <span className="font-semibold text-emerald-400">Русский (полный)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">На полках:</span>
                    <span className="font-semibold text-[#F59E0B]">
                      {book.shelvedCount
                        ? book.shelvedCount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")
                        : "3 820"}{" "}
                      читателей
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ---------- ПРАВАЯ КОЛОНКА ---------- */}
            <div className="space-y-8">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30">
                    {book.genre}
                  </span>
                  {book.series && (
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      {book.series}
                    </span>
                  )}
                  {book.tags?.map((t: string) => (
                    <span
                      key={t}
                      className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-white/[0.04] text-gray-400 border border-white/[0.06]"
                    >
                      #{t}
                    </span>
                  ))}
                </div>

                <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-[1.1]">
                  {book.title}
                </h1>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Автор:</span>
                    <span className="text-[#F59E0B] font-bold text-base hover:underline cursor-pointer">{book.author}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Читает:</span>
                    <span className="text-white font-bold flex items-center gap-1 text-base">
                      <Mic className="w-4 h-4 text-[#F59E0B]" />
                      {book.narrator}
                    </span>
                  </div>
                </div>
              </div>

              <BookPlayerPanel
                book={playable}
                firstChapterTitle={chapters[0]?.title || book.title}
                chaptersCount={chapters.length}
                durationFormatted={chapters[0]?.durationFormatted || book.durationFormatted}
              />

              {/* Вкладки — обычные ссылки: переключение без клиентского кода */}
              <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3 overflow-x-auto scrollbar-none">
                <Link href={tabHref("about")} prefetch={false} className={tabClass("about")}>
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>О книге и сюжет</span>
                </Link>
                <Link href={tabHref("chapters")} prefetch={false} className={tabClass("chapters")}>
                  <Headphones className="w-3.5 h-3.5" />
                  <span>Оглавление ({chapters.length})</span>
                </Link>
                {book.otherNarrations && book.otherNarrations.length > 0 && (
                  <Link href={tabHref("narrations")} prefetch={false} className={tabClass("narrations")}>
                    <Mic className="w-3.5 h-3.5" />
                    <span>Озвучки ({book.otherNarrations.length})</span>
                  </Link>
                )}
                <Link href={tabHref("comments")} prefetch={false} className={tabClass("comments")}>
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Отзывы ({comments.length})</span>
                </Link>
              </div>

              {tab === "about" && (
                <div className="space-y-6">
                  {book.seriesNextBook && (
                    <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-[#0F1420] to-[#0F1420] border border-blue-500/20 flex items-center justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">Продолжение цикла</span>
                        <h4 className="text-base font-bold text-white mt-0.5">{book.seriesNextBook.title}</h4>
                        <p className="text-xs text-gray-400">{book.seriesNextBook.subtitle || "Следующая книга серии"}</p>
                      </div>
                      <Link
                        href={`/book/${book.seriesNextBook.id}`}
                        prefetch={false}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors flex-shrink-0 cursor-pointer shadow-lg shadow-blue-500/20"
                      >
                        <span>Слушать далее</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  )}

                  <div className="space-y-3">
                    <h3 className="font-serif text-2xl font-bold text-white flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-[#F59E0B]" />
                      Аннотация и сюжет
                    </h3>
                    <div className="p-6 rounded-2xl bg-[#0F1420]/80 border border-white/[0.08] text-gray-300 text-sm sm:text-base leading-relaxed space-y-4">
                      <p>{book.description}</p>
                      {book.shortDescription && (
                        <div className="p-4 rounded-xl bg-white/[0.02] border-l-4 border-[#F59E0B] text-xs sm:text-sm text-gray-300 italic">
                          «{book.shortDescription}»
                        </div>
                      )}
                    </div>
                  </div>

                  {chapters.length > 0 && (
                    <div className="p-5 rounded-2xl bg-[#0F1420]/60 border border-white/[0.08] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                          <Headphones className="w-3.5 h-3.5 text-[#F59E0B]" />
                          Главы произведения ({chapters.length})
                        </span>
                        <Link href={tabHref("chapters")} prefetch={false} className="text-xs text-[#F59E0B] hover:underline font-bold cursor-pointer">
                          Открыть все {chapters.length} глав →
                        </Link>
                      </div>

                      <ChapterQuickList book={playable} chapters={slimChapters.slice(0, 4)} />
                    </div>
                  )}
                </div>
              )}

              {tab === "chapters" && (
                <ChaptersTab
                  book={playable}
                  chapters={slimChapters}
                  durationFormatted={book.durationFormatted}
                />
              )}

              {tab === "narrations" && book.otherNarrations && (
                <div className="space-y-4">
                  <h3 className="font-serif text-2xl font-bold text-white flex items-center gap-2">
                    <Mic className="w-5 h-5 text-[#F59E0B]" />
                    Другие озвучки этой книги
                  </h3>
                  <NarrationsList narrations={book.otherNarrations} />
                </div>
              )}

              {tab === "comments" && <CommentsTab initialComments={comments} />}

              {relatedBooks.length > 0 && (
                <section className="pt-8 border-t border-white/[0.08]">
                  <h3 className="font-serif text-2xl font-bold text-white mb-5 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#F59E0B]" />
                    С этой книгой также слушают
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {relatedBooks.map((relBook) => (
                      <BookCard key={relBook.id} book={relBook} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </main>
      </BookShell>
    </>
  );
}
