"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import {
  Headphones,
  Heart,
  Sparkles,
  Compass,
  Play,
  Search,
  X,
  Star,
  ArrowRight,
  ChevronDown,
  Download,
  Smartphone,
} from "lucide-react";
import { usePlayerUi } from "@/context/PlayerContext";
import { useFavoritesStore } from "@/store/favorites";
import { Audiobook } from "@/lib/types";
import { reachMetrikaGoal } from "@/components/YandexMetrika";

const InstallPwaModal = dynamic(() => import("@/components/InstallPwaModal"), {
  ssr: false,
});

interface HeaderProps {
  onOpenFavorites: () => void;
  onRandomBook?: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  totalBooks?: number;
}

export default function Header({
  onOpenFavorites,
  onRandomBook,
  searchQuery: propSearchQuery,
  onSearchChange: propOnSearchChange,
  totalBooks,
}: HeaderProps) {
  const { currentBookId, isPlaying, history, playBook } = usePlayerUi();
  const favorites = useFavoritesStore((state) => state.favorites);

  const [isMounted, setIsMounted] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isPwaModalOpen, setIsPwaModalOpen] = useState(false);

  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const catalogRef = useRef<HTMLDivElement>(null);

  const activeSearch = propSearchQuery !== undefined ? propSearchQuery : localSearch;

  const searchPlaceholder = totalBooks
    ? `Поиск по ${totalBooks.toLocaleString("ru-RU")} книгам, авторам...`
    : "Поиск по каталогу, авторам...";

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as { standalone?: boolean }).standalone === true;
      setIsStandalone(standalone);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideDesktop = desktopSearchRef.current?.contains(target);
      const insideMobile = mobileSearchRef.current?.contains(target);
      if (!insideDesktop && !insideMobile) setIsDropdownOpen(false);
      if (catalogRef.current && !catalogRef.current.contains(target)) setIsCatalogOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [matchingBooks, setMatchingBooks] = useState<Audiobook[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const q = activeSearch.trim();
    if (!q) {
      setMatchingBooks([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const controller = new AbortController();

    const debounceTimer = setTimeout(() => {
      reachMetrikaGoal("search", { query: q });
      fetch(`/api/audiobooks?search=${encodeURIComponent(q)}&limit=5`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.items)) setMatchingBooks(data.items);
          else setMatchingBooks([]);
          setIsSearching(false);
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setMatchingBooks([]);
          setIsSearching(false);
        });
    }, 200);

    return () => {
      clearTimeout(debounceTimer);
      controller.abort();
    };
  }, [activeSearch]);

  const handleInputChange = (val: string) => {
    if (propOnSearchChange) propOnSearchChange(val);
    else setLocalSearch(val);
    setIsDropdownOpen(val.trim().length > 0);
  };

  const submitSearch = () => {
    const q = activeSearch.trim();
    if (!q) return;
    setIsDropdownOpen(false);
    if (propOnSearchChange) propOnSearchChange(q);
    window.location.assign(`/?search=${encodeURIComponent(q)}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitSearch();
  };

  const [lastItem, setLastItem] = useState<{
    book: Audiobook;
    chapterIndex: number;
    chapterTitle: string;
    timeFormatted: string;
    progressSec: number;
  } | null>(null);

  useEffect(() => {
    if (!history || history.length === 0) {
      setLastItem(null);
      return;
    }
    const top = history[0];
    let cancelled = false;

    fetch(`/api/audiobooks/${top.bookId}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success && data.item) {
          const b: Audiobook = data.item;
          const chapters = b.chapters ?? [];
          const chIdx = top.chapterIndex ?? 0;
          const ch = chapters[chIdx] || chapters[0];
          const m = Math.floor(top.progressSec / 60);
          const s = Math.floor(top.progressSec % 60);
          setLastItem({
            book: b,
            chapterIndex: chIdx,
            chapterTitle: ch ? ch.title : "Глава 1",
            timeFormatted: `${m}:${s < 10 ? "0" : ""}${s}`,
            progressSec: top.progressSec,
          });
        } else {
          setLastItem(null);
        }
      })
      .catch(() => {
        if (!cancelled) setLastItem(null);
      });

    return () => {
      cancelled = true;
    };
  }, [history]);

  const handleResumeLast = () => {
    if (lastItem) playBook(lastItem.book, lastItem.chapterIndex, lastItem.progressSec);
  };

  const renderSearchForm = () => (
    <form onSubmit={handleSearchSubmit} className="relative w-full" role="search">
      <button
        type="submit"
        aria-label="Найти"
        className="absolute left-1 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] grid place-items-center text-gray-400 hover:text-[#F59E0B] transition-colors cursor-pointer z-10"
      >
        <Search className="w-4 h-4" aria-hidden="true" />
      </button>
      <input
        type="search"
        value={activeSearch}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSearchSubmit(e);
        }}
        onFocus={() => {
          if (activeSearch.trim()) setIsDropdownOpen(true);
        }}
        placeholder={searchPlaceholder}
        aria-label="Поиск книг"
        className="w-full pl-10 pr-10 py-2 sm:py-2.5 bg-white/[0.06] hover:bg-white/[0.09] focus:bg-[#0F1420] text-white rounded-xl border border-white/[0.1] focus:border-[#F59E0B] outline-none text-xs sm:text-sm placeholder:text-gray-400 transition-all shadow-inner focus:shadow-[0_0_20px_rgba(245,158,11,0.2)]"
      />
      {activeSearch && (
        <button
          type="button"
          aria-label="Очистить поиск"
          onClick={() => {
            handleInputChange("");
            setIsDropdownOpen(false);
          }}
          className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] grid place-items-center text-gray-400 hover:text-white rounded-full transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      )}
    </form>
  );

  const searchResultsList = (compact: boolean) => (
    <div className={compact ? "p-1.5" : "p-1.5 divide-y divide-white/[0.05]"}>
      {!compact && (
        <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-gray-300">
          Быстрые результаты
        </div>
      )}
      {matchingBooks.map((b) => {
        const coverSrc =
          b.coverUrl ||
          `/api/cover?title=${encodeURIComponent(b.title)}&author=${encodeURIComponent(b.author)}`;
        return (
          <Link
            key={b.id}
            href={`/book/${b.id}`}
            prefetch={false}
            onClick={() => {
              setIsDropdownOpen(false);
              handleInputChange("");
            }}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.06] transition-colors group"
          >
            <div className="relative w-8 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-gray-950 border border-white/10">
              <Image src={coverSrc} alt="" fill sizes="32px" className="object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-white group-hover:text-[#F59E0B] transition-colors truncate">
                {b.title}
              </h4>
              <p className="text-[11px] text-[#F59E0B] truncate">{b.author}</p>
              <span className="text-[10px] text-gray-300 block truncate">🎙 {b.narrator}</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-[#F59E0B] flex-shrink-0 pr-1">
              <Star className="w-3 h-3 fill-current" aria-hidden="true" />
              <span>{b.rating}</span>
            </div>
          </Link>
        );
      })}
      <button
        type="button"
        onClick={submitSearch}
        className="w-full min-h-[40px] text-center py-2 text-xs font-bold text-[#F59E0B] hover:bg-white/[0.04] transition-colors flex items-center justify-center gap-1 cursor-pointer"
      >
        <span>Все результаты по запросу «{activeSearch}»</span>
        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </div>
  );

  const emptySearchState = () => (
    <div className="p-6 text-center text-xs text-gray-300">
      {isSearching ? "Идёт поиск..." : `Ничего не нашлось по запросу «${activeSearch}».`}
    </div>
  );

  return (
    <header className="sticky top-0 z-40 bg-[#06080D] border-b border-white/[0.08] px-3 sm:px-6 py-2.5 w-full">
      <div className="max-w-7xl mx-auto flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3 w-full">
          <Link href="/" prefetch={false} className="flex items-center gap-2 group flex-shrink-0">
            <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#F59E0B] via-[#D97706] to-[#B45309] flex items-center justify-center shadow-lg shadow-[#F59E0B]/25 group-hover:scale-105 transition-all duration-300">
              <Headphones className="w-4 h-4 sm:w-5 sm:h-5 text-[#06080D]" aria-hidden="true" />
              {isPlaying && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 sm:h-3 sm:w-3" aria-hidden="true">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-full w-full bg-emerald-500" />
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className="font-serif text-lg sm:text-2xl font-bold tracking-tight text-white group-hover:text-[#F59E0B] transition-colors">
                  АУДИОТЕКА
                </span>
                <span className="text-[9px] sm:text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full bg-gradient-to-r from-[#F59E0B]/20 to-[#D97706]/20 text-[#F59E0B] border border-[#F59E0B]/30 tracking-widest">
                  PRO
                </span>
              </div>
            </div>
          </Link>

          <div ref={desktopSearchRef} className="hidden sm:block relative flex-1 max-w-md mx-4">
            {renderSearchForm()}

            {isDropdownOpen && activeSearch.trim().length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#0F1420] border border-white/15 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-[70vh] overflow-y-auto">
                {matchingBooks.length > 0 ? searchResultsList(false) : emptySearchState()}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
            {isMounted && lastItem && (!currentBookId || !isPlaying) && (
              <button
                type="button"
                onClick={handleResumeLast}
                title={`Продолжить: ${lastItem.book.title}`}
                className="hidden xl:flex items-center gap-1.5 bg-[#101726]/80 hover:bg-[#162035] border border-white/10 px-3 py-2 rounded-xl text-xs text-white transition-all cursor-pointer"
              >
                <Play className="w-3 h-3 fill-[#F59E0B] text-[#F59E0B]" aria-hidden="true" />
                <span className="text-gray-200 truncate max-w-[100px]">{lastItem.book.title}</span>
              </button>
            )}

            <div ref={catalogRef} className="relative">
              <button
                type="button"
                onClick={() => setIsCatalogOpen(!isCatalogOpen)}
                aria-expanded={isCatalogOpen}
                aria-label="Каталог по жанрам"
                className="flex items-center gap-1 text-xs font-bold text-gray-200 hover:text-white px-2.5 sm:px-3 min-h-[40px] rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-[#F59E0B]/40 transition-all cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F59E0B]" aria-hidden="true" />
                <span>Каталог</span>
                <ChevronDown
                  className={`w-3 h-3 text-gray-300 transition-transform ${isCatalogOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>

              {isCatalogOpen && (
                <div className="absolute top-full right-0 mt-2 w-60 bg-[#0F1420] border border-white/15 rounded-2xl shadow-2xl p-2 z-50">
                  <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-gray-300 border-b border-white/[0.06] mb-1">
                    Жанры каталога
                  </div>
                  {[
                    { name: "Все аудиокниги", param: "Все", icon: "📚" },
                    { name: "Фантастика и фэнтези", param: "Фантастика", icon: "🚀" },
                    { name: "Детективы и триллеры", param: "Детективы", icon: "🕵️" },
                    { name: "Ужасы и мистика", param: "Ужасы и мистика", icon: "👻" },
                    { name: "Психология и бизнес", param: "Психология", icon: "🧠" },
                    { name: "Золотая классика", param: "Классика", icon: "📖" },
                    { name: "Для детей и сказки", param: "Для детей", icon: "🎈" },
                  ].map((item) => (
                    <Link
                      key={item.param}
                      href={item.param === "Все" ? "/" : `/?genre=${encodeURIComponent(item.param)}`}
                      prefetch={false}
                      onClick={() => setIsCatalogOpen(false)}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-gray-200 hover:bg-white/[0.08] hover:text-[#F59E0B] min-h-[40px]"
                    >
                      <span>
                        {item.icon} {item.name}
                      </span>
                      <ArrowRight className="w-3 h-3 text-gray-400" aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {onRandomBook && (
              <button
                type="button"
                onClick={onRandomBook}
                className="hidden md:flex items-center gap-1.5 text-xs font-bold px-3 min-h-[40px] rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-200 border border-white/[0.08] hover:border-[#F59E0B]/40 transition-all cursor-pointer"
                title="Случайная книга"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" aria-hidden="true" />
                <span>Мне повезёт</span>
              </button>
            )}

            {!isStandalone && (
              <button
                type="button"
                onClick={() => setIsPwaModalOpen(true)}
                className="hidden sm:flex items-center gap-1.5 text-xs font-bold px-3 min-h-[40px] rounded-xl bg-gradient-to-r from-[#F59E0B]/15 to-[#EA580C]/15 hover:from-[#F59E0B]/25 hover:to-[#EA580C]/25 text-[#F59E0B] border border-[#F59E0B]/35 transition-all active:scale-95 shadow-sm cursor-pointer whitespace-nowrap"
                title="Установить приложение"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Установить приложение</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenFavorites}
              aria-label="Моя полка и закладки"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 min-h-[40px] rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-200 border border-white/[0.08] hover:border-red-500/30 transition-all active:scale-95 relative cursor-pointer"
            >
              <Heart
                className={`w-4 h-4 transition-transform ${
                  isMounted && favorites.length > 0
                    ? "fill-[#EF4444] text-[#EF4444] scale-110"
                    : "text-gray-200"
                }`}
                aria-hidden="true"
              />
              <span className="text-xs font-bold hidden sm:inline">Моя полка</span>
              {isMounted && favorites.length > 0 && (
                <span className="bg-[#EF4444] text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {favorites.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div ref={mobileSearchRef} className="block sm:hidden relative w-full pt-0.5">
          {renderSearchForm()}

          {isDropdownOpen && activeSearch.trim().length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#0F1420] border border-white/15 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-[60vh] overflow-y-auto">
              {matchingBooks.length > 0 ? searchResultsList(true) : emptySearchState()}
            </div>
          )}
        </div>

        {!isStandalone && (
          <div className="block sm:hidden w-full pt-0.5">
            <button
              type="button"
              onClick={() => setIsPwaModalOpen(true)}
              className="w-full min-h-[44px] py-2 px-3 rounded-xl bg-gradient-to-r from-[#F59E0B]/20 via-[#EA580C]/20 to-[#D97706]/20 border border-[#F59E0B]/40 text-[#F59E0B] flex items-center justify-center gap-2 text-xs font-extrabold tracking-wide active:scale-95 transition-all shadow-sm cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Установить приложение «Аудиотека PRO»</span>
              <ArrowRight className="w-3 h-3 ml-auto opacity-70" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {isPwaModalOpen && (
        <InstallPwaModal isOpen={isPwaModalOpen} onClose={() => setIsPwaModalOpen(false)} />
      )}
    </header>
  );
}
