"use client";

import React, { useState, useMemo, useEffect, Suspense, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import HeroBanner from "@/components/HeroBanner";
import SearchAndFilters from "@/components/SearchAndFilters";
import BookCard from "@/components/BookCard";
import FavoritesDrawer from "@/components/FavoritesDrawer";
import AdBanner from "@/components/AdBanner";
import Footer from "@/components/Footer";
import { Audiobook } from "@/lib/types";
import { usePlayer } from "@/context/PlayerContext";
import { reachMetrikaGoal } from "@/components/YandexMetrika";
import {
  Compass,
  Flame,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ArrowUp,
  BookMarked
} from "lucide-react";

const TOP_GENRES = [
  "Все",
  "Фантастика",
  "Детективы",
  "Ужасы и мистика",
  "Психология",
  "Классика",
  "Для детей",
];

function HomePageContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [selectedGenre, setSelectedGenre] = useState("Все");
  const [selectedNarrator, setSelectedNarrator] = useState("Все");
  const [selectedDuration, setSelectedDuration] = useState("Все");
  const [selectedSort, setSelectedSort] = useState("popular");
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);

  // Dynamic books from SQLite Database API
  const [books, setBooks] = useState<Audiobook[]>([]);
  const [totalBooksCount, setTotalBooksCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Showcase rows from DB
  const [topWeekly, setTopWeekly] = useState<Audiobook[]>([]);
  const [newArrivals, setNewArrivals] = useState<Audiobook[]>([]);
  const [topScifi, setTopScifi] = useState<Audiobook[]>([]);
  const [topDetectives, setTopDetectives] = useState<Audiobook[]>([]);
  const [narratorsList, setNarratorsList] = useState<string[]>(["Все"]);

  const [showScrollTop, setShowScrollTop] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const activeFetchAbortRef = useRef<AbortController | null>(null);

  const { playBook } = usePlayer();

  // 1. Debounce Search Input (350ms): Предотвращает мигание, скачки и гонку запросов
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sync with searchParams if navigated from Header on another page
  useEffect(() => {
    const q = searchParams.get("search");
    if (q !== null) {
      setSearchQuery(q);
      setDebouncedSearch(q);
    }
  }, [searchParams]);

  // Floating Back to Top Button visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch initial showcases from Database с гарантией разных авторов в каждом ряду
  useEffect(() => {
    const filterDistinct = (items: Audiobook[], count: number = 5, isNewArrivals: boolean = false) => {
      const seen = new Set<string>();
      return items
        .filter((b) => {
          const auth = (b.author || "").toLowerCase().trim();
          const title = (b.title || "").toLowerCase().trim();
          const id = (b.id || "").toLowerCase();

          // Для раздела новинок отсекаем старые архивные дампы с черными звуковыми волнами
          if (!auth || auth === "русская классика" || auth === "классика" || auth === "неизвестен") {
            if (isNewArrivals) return false;
          }
          if (title.startsWith("силуэты русских") || title.startsWith("01-") || title.startsWith("00-") || title.startsWith("аудиокнига") || title.startsWith("общение челябинск")) {
            if (isNewArrivals) return false;
          }
          if (id.startsWith("01-") || id.startsWith("00-") || id.includes("librivox")) {
            if (isNewArrivals) return false;
          }
          if (seen.has(auth)) return false;
          seen.add(auth);
          return true;
        })
        .slice(0, count);
    };

    fetch("/api/audiobooks?limit=25&sort=popular")
      .then((res) => res.json())
      .then((data) => {
        if (data.items) setTopWeekly(filterDistinct(data.items, 5, false));
      })
      .catch(() => {});

    fetch("/api/audiobooks?limit=25&sort=year_desc")
      .then((res) => res.json())
      .then((data) => {
        if (data.items) setNewArrivals(filterDistinct(data.items, 5, true));
      })
      .catch(() => {});

    fetch("/api/audiobooks?genre=Фантастика&limit=25&sort=popular")
      .then((res) => res.json())
      .then((data) => {
        if (data.items) setTopScifi(filterDistinct(data.items, 5, false));
      })
      .catch(() => {});

    fetch("/api/audiobooks?genre=Детектив&limit=25&sort=popular")
      .then((res) => res.json())
      .then((data) => {
        if (data.items) setTopDetectives(filterDistinct(data.items, 5, false));
      })
      .catch(() => {});
  }, []);

  // Primary Query: Fetch page 1 when Debounced Search, Genre, Narrator or Sort changes
  useEffect(() => {
    // Отменяем предыдущий незавершённый запрос, чтобы не было гонки (Race Condition)
    if (activeFetchAbortRef.current) {
      activeFetchAbortRef.current.abort();
    }
    const abortController = new AbortController();
    activeFetchAbortRef.current = abortController;

    setIsLoading(true);
    setCurrentPage(1);
    setHasMore(true);
    // При смене поискового запроса сразу очищаем старые карточки главной страницы
    setBooks([]);

    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("limit", "20");
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    if (selectedGenre !== "Все") params.set("genre", selectedGenre);
    if (selectedNarrator !== "Все") params.set("narrator", selectedNarrator);
    if (selectedSort) params.set("sort", selectedSort);

    fetch(`/api/audiobooks?${params.toString()}`, { signal: abortController.signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.items) {
          setBooks(data.items);
          setTotalBooksCount(data.total || data.items.length);
          setHasMore(data.items.length < (data.total || 0) && data.items.length >= 20);

          if (data.items.length > 0) {
            const nSet = new Set(["Все"]);
            data.items.forEach((b: Audiobook) => {
              if (b.narrator) nSet.add(b.narrator);
            });
            setNarratorsList(Array.from(nSet));
          }
        } else {
          setBooks([]);
          setTotalBooksCount(0);
          setHasMore(false);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Error loading books from DB API:", err);
          setIsLoading(false);
        }
      });

    return () => {
      abortController.abort();
    };
  }, [debouncedSearch, selectedGenre, selectedNarrator, selectedSort]);

  // Infinite Scroll IntersectionObserver (работает стабильно и на главной, и в категориях!)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading && !isLoadingMore && hasMore) {
          setIsLoadingMore(true);
          const nextPage = currentPage + 1;

          const params = new URLSearchParams();
          params.set("page", String(nextPage));
          params.set("limit", "20");
          if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
          if (selectedGenre !== "Все") params.set("genre", selectedGenre);
          if (selectedNarrator !== "Все") params.set("narrator", selectedNarrator);
          if (selectedSort) params.set("sort", selectedSort);

          fetch(`/api/audiobooks?${params.toString()}`)
            .then((res) => res.json())
            .then((data) => {
              if (data.items && data.items.length > 0) {
                setBooks((prev) => {
                  const existingIds = new Set(prev.map((b) => b.id));
                  const newUnique = data.items.filter((b: Audiobook) => !existingIds.has(b.id));
                  const updated = [...prev, ...newUnique];
                  if (updated.length >= (data.total || 0) || data.items.length < 20) {
                    setHasMore(false);
                  }
                  return updated;
                });
                setCurrentPage(nextPage);
              } else {
                setHasMore(false);
              }
              setIsLoadingMore(false);
            })
            .catch(() => {
              setIsLoadingMore(false);
            });
        }
      },
      { rootMargin: "400px" }
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) observer.observe(currentSentinel);
    return () => {
      if (currentSentinel) observer.unobserve(currentSentinel);
    };
  }, [currentPage, isLoading, isLoadingMore, hasMore, debouncedSearch, selectedGenre, selectedNarrator, selectedSort]);

  const handleRandomBook = () => {
    if (books.length > 0) {
      const randomIndex = Math.floor(Math.random() * books.length);
      playBook(books[randomIndex], 0);
    }
  };

  const isFrontpageDefault = searchQuery === "" && selectedGenre === "Все" && selectedNarrator === "Все";

  return (
    <div className="min-h-screen bg-[#06080D] text-white flex flex-col justify-between">
      <div>
        <Header
          onOpenFavorites={() => setIsFavoritesOpen(true)}
          onRandomBook={handleRandomBook}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-12">
          {/* TOP GENRES QUICK NAVIGATION (Всегда на виду в самом верху главной!) */}
          <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {TOP_GENRES.map((genre) => {
              const isActive = selectedGenre === genre;
              return (
                <button
                  key={genre}
                  onClick={() => {
                    setSelectedGenre(genre);
                    reachMetrikaGoal("genre_select", { genre });
                    if (genre !== "Все") {
                      window.scrollTo({ top: 380, behavior: "smooth" });
                    }
                  }}
                  className={`text-xs md:text-sm font-bold px-4 py-2.5 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? "bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-[#06080D] shadow-md shadow-[#F59E0B]/25 scale-[1.02]"
                      : "bg-[#0F1420]/80 text-gray-300 hover:bg-white/[0.08] hover:text-white border border-white/[0.08]"
                  }`}
                >
                  {genre === "Все"
                    ? "📚 Все аудиокниги"
                    : genre === "Фантастика"
                    ? "🚀 Фантастика"
                    : genre === "Детективы"
                    ? "🕵️ Детективы"
                    : genre === "Ужасы и мистика"
                    ? "👻 Ужасы"
                    : genre === "Психология"
                    ? "🧠 Психология"
                    : genre === "Классика"
                    ? "📖 Классика"
                    : "🎈 Для детей"}
                </button>
              );
            })}
          </div>

          {/* 1. HERO BANNER: Auto-rotating Book of the Week from Database */}
          {isFrontpageDefault && topWeekly.length > 0 && (
            <HeroBanner allBooks={topWeekly} />
          )}

          {/* 2. STATS & BADGE (Live total from SQLite database!) */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#F59E0B] mb-1">
                <Flame className="w-4 h-4 fill-[#F59E0B]" />
                Национальная библиотека аудиокниг
              </div>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-white tracking-tight">
                {searchQuery
                  ? `Поиск: «${searchQuery}»`
                  : selectedGenre !== "Все"
                  ? `Раздел: ${selectedGenre}`
                  : "Каталог произведений из базы"}
              </h2>
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-lg">
                <ShieldCheck className="w-3.5 h-3.5" /> Без VPN в РФ
              </span>
              <span>
                В базе SQLite: <b className="text-white">{totalBooksCount > 0 ? totalBooksCount : "33 000+"}</b> • Показано: <b className="text-[#F59E0B]">{books.length}</b>
              </span>
            </div>
          </div>

          {/* 3. CLEAN COMPACT TOP GENRES + SEARCH & FILTERS */}
          <SearchAndFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedGenre={selectedGenre}
            onGenreChange={(g) => {
              setSelectedGenre(g);
              reachMetrikaGoal("genre_select", { genre: g });
              // Сброс скролла наверх каталога при смене жанра
              window.scrollTo({ top: 380, behavior: "smooth" });
            }}
            selectedNarrator={selectedNarrator}
            onNarratorChange={setSelectedNarrator}
            selectedDuration={selectedDuration}
            onDurationChange={setSelectedDuration}
            selectedSort={selectedSort}
            onSortChange={setSelectedSort}
            genres={TOP_GENRES}
            narrators={narratorsList}
          />

          {/* 4. CURATED SHOWCASE ROWS (Только когда пользователь на главной без активного поиска) */}
          {isFrontpageDefault && (
            <div className="space-y-12 my-10">
              {/* Row 1: Топ недели */}
              {topWeekly.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-2xl font-bold text-white flex items-center gap-2">
                      <Flame className="w-5 h-5 text-[#F59E0B] fill-[#F59E0B]" />
                      Топ недели • Самое прослушиваемое
                    </h3>
                    <button onClick={() => setSelectedSort("popular")} className="text-xs text-[#F59E0B] font-bold hover:underline flex items-center gap-1 cursor-pointer">
                      Смотреть весь топ <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {topWeekly.map((b) => (
                      <BookCard key={b.id} book={b} />
                    ))}
                  </div>
                </section>
              )}

              {/* NATIVE AD BANNER */}
              <AdBanner type="native_max" />

              {/* Row 2: Свежие новинки каталога */}
              {newArrivals.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-2xl font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-emerald-400" />
                      Свежие новинки • Новые поступления
                    </h3>
                    <button onClick={() => setSelectedSort("year_desc")} className="text-xs text-emerald-400 font-bold hover:underline flex items-center gap-1 cursor-pointer">
                      Все новинки <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {newArrivals.map((b) => (
                      <BookCard key={b.id} book={b} />
                    ))}
                  </div>
                </section>
              )}

              {/* Row 3: Фантастика и фэнтези */}
              {topScifi.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-2xl font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-blue-400" />
                      Фантастика и Сталкер • Главные хиты
                    </h3>
                    <button onClick={() => setSelectedGenre("Фантастика")} className="text-xs text-blue-400 font-bold hover:underline flex items-center gap-1 cursor-pointer">
                      Все книги раздела <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {topScifi.map((b) => (
                      <BookCard key={b.id} book={b} />
                    ))}
                  </div>
                </section>
              )}

              {/* Row 4: Детективы и триллеры */}
              {topDetectives.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-2xl font-bold text-white flex items-center gap-2">
                      <Compass className="w-5 h-5 text-[#F59E0B]" />
                      Остросюжетные детективы и расследования
                    </h3>
                    <button onClick={() => setSelectedGenre("Детективы")} className="text-xs text-[#F59E0B] font-bold hover:underline flex items-center gap-1 cursor-pointer">
                      Все детективы <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {topDetectives.map((b) => (
                      <BookCard key={b.id} book={b} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* 5. MAIN CATALOG GRID FROM SQLITE DATABASE */}
          <div className="mt-8">
            {isFrontpageDefault && (
              <h3 className="font-serif text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <BookMarked className="w-5 h-5 text-[#F59E0B]" />
                Все аудиокниги из базы данных
              </h3>
            )}

            {isLoading && books.length === 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="animate-pulse bg-[#0F1420]/80 rounded-2xl h-80 border border-white/5 p-3 flex flex-col justify-between">
                    <div className="w-full h-48 bg-white/5 rounded-xl mb-3" />
                    <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-white/5 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : books.length === 0 ? (
              <div className="text-center py-20 bg-[#0F1420]/80 backdrop-blur-xl rounded-3xl border border-white/[0.08] p-8 max-w-lg mx-auto shadow-2xl">
                <Compass className="w-14 h-14 text-[#F59E0B] mx-auto mb-3 stroke-1 animate-spin" style={{ animationDuration: "16s" }} />
                <h3 className="font-serif text-2xl font-bold text-white mb-2">
                  Ничего не нашлось по запросу «{searchQuery}»
                </h3>
                <p className="text-sm text-gray-400 mb-6">
                  Попробуйте изменить запрос или сбросить фильтры.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedGenre("Все");
                    setSelectedNarrator("Все");
                    setSelectedDuration("Все");
                  }}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-[#06080D] font-black text-xs uppercase tracking-wider hover:scale-105 active:scale-95 transition-transform cursor-pointer shadow-lg shadow-[#F59E0B]/20"
                >
                  Сбросить все фильтры
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                  {books.map((book, idx) => (
                    <BookCard key={`${book.id}-${idx}`} book={book} />
                  ))}
                </div>

                {/* Modern Infinite Scroll Sentinel (Работает и на главной, и в категориях!) */}
                {hasMore && (
                  <div
                    ref={sentinelRef}
                    className="py-12 flex flex-col items-center justify-center gap-2.5 text-xs text-gray-400"
                  >
                    <div className="w-8 h-8 rounded-full border-2 border-[#F59E0B] border-t-transparent animate-spin" />
                    <span className="font-bold tracking-wider text-[11px] uppercase text-[#F59E0B]/90">
                      Подгружаем следующие аудиокниги... ({books.length} из {totalBooksCount})
                    </span>
                  </div>
                )}

                {!hasMore && books.length > 0 && (
                  <div className="text-center py-12 text-xs text-gray-500 font-medium border-t border-white/[0.05] mt-10">
                    Вы просмотрели все {totalBooksCount} аудиокниг раздела
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        <FavoritesDrawer
          isOpen={isFavoritesOpen}
          onClose={() => setIsFavoritesOpen(false)}
          allBooks={books}
        />
      </div>

      <Footer />

      {/* Floating Back to Top Button */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-28 right-5 sm:right-8 z-40 p-3.5 rounded-2xl bg-[#0F1420]/90 hover:bg-[#1A2234] backdrop-blur-2xl border border-white/20 hover:border-[#F59E0B] text-white hover:text-[#F59E0B] shadow-[0_10px_30px_rgba(0,0,0,0.8)] hover:scale-110 active:scale-95 transition-all cursor-pointer group"
          title="Прокрутить наверх"
          aria-label="Прокрутить наверх"
        >
          <ArrowUp className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#06080D]" />}>
      <HomePageContent />
    </Suspense>
  );
}
