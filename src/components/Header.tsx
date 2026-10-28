"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Download
} from "lucide-react";
import InstallPwaModal from "@/components/InstallPwaModal";
import { usePlayer } from "@/context/PlayerContext";
import { AUDIOBOOKS } from "@/lib/audiobook-data";
import { Audiobook } from "@/lib/types";
import { reachMetrikaGoal } from "@/components/YandexMetrika";

interface HeaderProps {
  onOpenFavorites: () => void;
  onRandomBook?: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}

export default function Header({
  onOpenFavorites,
  onRandomBook,
  searchQuery: propSearchQuery,
  onSearchChange: propOnSearchChange,
}: HeaderProps) {
  const router = useRouter();
  const { favorites, isPlaying, history, currentBook, playBook } = usePlayer();
  const [isMounted, setIsMounted] = useState(false);

  // Local search query state
  const [localSearch, setLocalSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isPwaModalOpen, setIsPwaModalOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const catalogRef = useRef<HTMLDivElement>(null);

  const activeSearch = propSearchQuery !== undefined ? propSearchQuery : localSearch;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
      if (
        catalogRef.current &&
        !catalogRef.current.contains(e.target as Node)
      ) {
        setIsCatalogOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search results state (searches all 52,400+ books in PostgreSQL database)
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
    const debounceTimer = setTimeout(() => {
      reachMetrikaGoal("search", { query: q });
      fetch(`/api/audiobooks?search=${encodeURIComponent(q)}&limit=5`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.items) {
            setMatchingBooks(data.items);
          } else {
            setMatchingBooks([]);
          }
          setIsSearching(false);
        })
        .catch(() => {
          const filtered = AUDIOBOOKS.filter(
            (b) =>
              b.title.toLowerCase().includes(q.toLowerCase()) ||
              b.author.toLowerCase().includes(q.toLowerCase()) ||
              b.narrator.toLowerCase().includes(q.toLowerCase())
          ).slice(0, 5);
          setMatchingBooks(filtered);
          setIsSearching(false);
        });
    }, 200);

    return () => clearTimeout(debounceTimer);
  }, [activeSearch]);

  const handleInputChange = (val: string) => {
    if (propOnSearchChange) {
      propOnSearchChange(val);
    } else {
      setLocalSearch(val);
    }
    setIsDropdownOpen(val.trim().length > 0);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSearch.trim()) return;
    setIsDropdownOpen(false);
    if (propOnSearchChange) {
      propOnSearchChange(activeSearch.trim());
    }
    router.push(`/?search=${encodeURIComponent(activeSearch.trim())}`);
  };

  // Find last listened book for continue banner
  const lastItem = useMemo(() => {
    if (!history || history.length === 0) return null;
    const top = history[0];
    const b = AUDIOBOOKS.find((item) => item.id === top.bookId);
    if (!b) return null;
    const chIdx = top.chapterIndex ?? 0;
    const ch = b.chapters[chIdx] || b.chapters[0];
    const m = Math.floor(top.progressSec / 60);
    const s = Math.floor(top.progressSec % 60);
    return {
      book: b,
      chapterIndex: chIdx,
      chapterTitle: ch ? ch.title : "Глава 1",
      timeFormatted: `${m}:${s < 10 ? "0" : ""}${s}`,
      progressSec: top.progressSec,
    };
  }, [history]);

  const handleResumeLast = () => {
    if (lastItem) {
      playBook(lastItem.book, lastItem.chapterIndex, lastItem.progressSec);
    }
  };

  // Common Search Input Component
  const renderSearchForm = () => (
    <form onSubmit={handleSearchSubmit} className="relative w-full">
      <button
        type="submit"
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#F59E0B] transition-colors cursor-pointer z-10"
        title="Найти"
      >
        <Search className="w-4 h-4" />
      </button>
      <input
        type="text"
        value={activeSearch}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleSearchSubmit(e);
          }
        }}
        onFocus={() => {
          if (activeSearch.trim()) setIsDropdownOpen(true);
        }}
        placeholder="Поиск по 52 000+ аудиокнигам, авторам..."
        className="w-full pl-10 pr-9 py-2 sm:py-2.5 bg-white/[0.06] hover:bg-white/[0.09] focus:bg-[#0F1420] text-white rounded-xl border border-white/[0.1] focus:border-[#F59E0B] outline-none text-xs sm:text-sm placeholder:text-gray-500 transition-all shadow-inner focus:shadow-[0_0_20px_rgba(245,158,11,0.2)]"
      />
      {activeSearch && (
        <button
          type="button"
          onClick={() => {
            handleInputChange("");
            setIsDropdownOpen(false);
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </form>
  );

  return (
    <header className="sticky top-0 z-40 bg-[#06080D]/95 backdrop-blur-2xl border-b border-white/[0.08] px-3 sm:px-6 py-2.5 sm:py-3 transition-all overflow-visible">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4">
        
        {/* ROW 1: Logo & Controls (100% width on mobile, no horizontal overflow!) */}
        <div className="flex items-center justify-between gap-2 w-full sm:w-auto">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group flex-shrink-0">
            <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#F59E0B] via-[#D97706] to-[#B45309] flex items-center justify-center shadow-lg shadow-[#F59E0B]/25 group-hover:scale-105 transition-all duration-300">
              <Headphones className="w-4 h-4 sm:w-5 sm:h-5 text-[#06080D]" />
              {isPlaying && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 sm:h-3 sm:w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-full w-full bg-emerald-500"></span>
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

          {/* Action Buttons Group on Mobile (Каталог, Приложение, Полка) */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 sm:hidden">
            {/* Catalog Button Mobile */}
            <div ref={catalogRef} className="relative">
              <button
                onClick={() => setIsCatalogOpen(!isCatalogOpen)}
                className="flex items-center gap-1 text-[11px] font-bold text-gray-300 px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 transition-all cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>Каталог</span>
              </button>

              {isCatalogOpen && (
                <div className="absolute top-full right-0 mt-2 w-60 bg-[#0F1420] border border-white/15 rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-2xl">
                  <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400 border-b border-white/[0.06] mb-1">
                    Жанры
                  </div>
                  {[
                    { name: "Все аудиокниги", param: "Все", icon: "📚" },
                    { name: "Фантастика", param: "Фантастика", icon: "🚀" },
                    { name: "Детективы", param: "Детективы", icon: "🕵️" },
                    { name: "Мистика", param: "Ужасы и мистика", icon: "👻" },
                    { name: "Психология", param: "Психология", icon: "🧠" },
                    { name: "Классика", param: "Классика", icon: "📖" },
                  ].map((item) => (
                    <Link
                      key={item.param}
                      href={item.param === "Все" ? "/" : `/?genre=${encodeURIComponent(item.param)}`}
                      onClick={() => setIsCatalogOpen(false)}
                      className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-200 hover:bg-white/[0.08] hover:text-[#F59E0B]"
                    >
                      <span>{item.icon} {item.name}</span>
                      <ArrowRight className="w-3 h-3 text-gray-500" />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Clear, explicit Install App Button on Mobile */}
            <button
              onClick={() => setIsPwaModalOpen(true)}
              className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-[#F59E0B]/20 to-[#EA580C]/20 text-[#F59E0B] border border-[#F59E0B]/40 active:scale-95 shadow-sm cursor-pointer"
              title="Установить официальное приложение Аудиотека PRO"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Установить</span>
            </button>

            {/* Favorites Button Mobile */}
            <button
              onClick={onOpenFavorites}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.05] text-gray-200 border border-white/10 active:scale-95 relative cursor-pointer"
              title="Моя полка"
            >
              <Heart className={`w-3.5 h-3.5 ${isMounted && favorites.length > 0 ? "fill-[#EF4444] text-[#EF4444]" : "text-gray-300"}`} />
              {isMounted && favorites.length > 0 && (
                <span className="bg-[#EF4444] text-white text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center">
                  {favorites.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ROW 2 on Desktop / Center element: SEARCH BAR */}
        <div ref={searchContainerRef} className="relative w-full sm:flex-1 sm:max-w-md sm:mx-auto">
          {renderSearchForm()}

          {/* Live Search Instant Dropdown */}
          {isDropdownOpen && activeSearch.trim().length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#0F1420] border border-white/15 rounded-2xl shadow-2xl overflow-hidden z-50 backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 duration-150 max-h-[70vh] overflow-y-auto">
              {matchingBooks.length > 0 ? (
                <div className="p-1.5 divide-y divide-white/[0.05]">
                  <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Быстрые результаты
                  </div>
                  {matchingBooks.map((b) => (
                    <Link
                      key={b.id}
                      href={`/book/${b.id}`}
                      onClick={() => {
                        setIsDropdownOpen(false);
                        handleInputChange("");
                      }}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.06] transition-colors group"
                    >
                      <div className="relative w-8 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-gray-950 border border-white/10 flex items-center justify-center">
                        <img
                          src={b.coverUrl || `/api/cover?title=${encodeURIComponent(b.title)}&author=${encodeURIComponent(b.author)}`}
                          alt={b.title}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `/api/cover?title=${encodeURIComponent(b.title)}&author=${encodeURIComponent(b.author)}`;
                          }}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-white group-hover:text-[#F59E0B] transition-colors truncate">
                          {b.title}
                        </h4>
                        <p className="text-[11px] text-[#F59E0B] truncate">{b.author}</p>
                        <span className="text-[10px] text-gray-400 block truncate">🎙 {b.narrator}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-[#F59E0B] flex-shrink-0 pr-1">
                        <Star className="w-3 h-3 fill-current" />
                        <span>{b.rating}</span>
                      </div>
                    </Link>
                  ))}
                  <button
                    onClick={handleSearchSubmit}
                    className="w-full text-center py-2 text-xs font-bold text-[#F59E0B] hover:bg-white/[0.04] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Все результаты по запросу «{activeSearch}»</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-gray-400">
                  {isSearching ? "Поиск среди 52 000+ книг..." : `Ничего не нашлось по запросу «${activeSearch}».`}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls on Desktop (hidden on mobile, because they are inside Row 1 on mobile) */}
        <div className="hidden sm:flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Resume Listening */}
          {isMounted && lastItem && (!currentBook || !isPlaying) && (
            <button
              onClick={handleResumeLast}
              className="hidden xl:flex items-center gap-1.5 bg-[#101726]/80 hover:bg-[#162035] border border-white/10 px-3 py-1.5 rounded-xl text-xs text-white transition-all cursor-pointer"
              title={`Продолжить: ${lastItem.book.title}`}
            >
              <Play className="w-3 h-3 fill-[#F59E0B] text-[#F59E0B]" />
              <span className="text-gray-300 truncate max-w-[110px]">{lastItem.book.title}</span>
              <span className="text-gray-500 font-mono text-[10px]">({lastItem.timeFormatted})</span>
            </button>
          )}

          {/* Desktop Catalog Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsCatalogOpen(!isCatalogOpen)}
              className="flex items-center gap-1.5 text-xs font-bold text-gray-300 hover:text-white px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-[#F59E0B]/40 transition-all cursor-pointer"
            >
              <Compass className="w-4 h-4 text-[#F59E0B]" />
              <span>Каталог</span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isCatalogOpen ? "rotate-180" : ""}`} />
            </button>

            {isCatalogOpen && (
              <div className="absolute top-full right-0 mt-2 w-64 bg-[#0F1420] border border-white/15 rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-2xl">
                <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400 border-b border-white/[0.06] mb-1">
                  Разделы каталога
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
                    onClick={() => setIsCatalogOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-gray-200 hover:bg-white/[0.08] hover:text-[#F59E0B] transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <span>{item.icon}</span>
                      <span>{item.name}</span>
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-500" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {onRandomBook && (
            <button
              onClick={onRandomBook}
              className="hidden md:flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-200 border border-white/[0.08] hover:border-[#F59E0B]/40 transition-all active:scale-95 shadow-sm cursor-pointer"
              title="Случайная книга"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Мне повезёт</span>
            </button>
          )}

          {/* Desktop Install App Button */}
          <button
            onClick={() => setIsPwaModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-gradient-to-r from-[#F59E0B]/15 to-[#EA580C]/15 hover:from-[#F59E0B]/25 hover:to-[#EA580C]/25 text-[#F59E0B] border border-[#F59E0B]/30 transition-all active:scale-95 shadow-sm cursor-pointer"
            title="Установить приложение Аудиотека PRO"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Приложение</span>
          </button>

          {/* Desktop Favorites */}
          <button
            onClick={onOpenFavorites}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-200 border border-white/[0.08] hover:border-red-500/30 transition-all active:scale-95 relative cursor-pointer"
            title="Моя полка и закладки"
          >
            <Heart className={`w-4 h-4 transition-transform ${isMounted && favorites.length > 0 ? "fill-[#EF4444] text-[#EF4444] scale-110" : "text-gray-300"}`} />
            <span className="text-xs font-bold">Моя полка</span>
            {isMounted && favorites.length > 0 && (
              <span className="bg-[#EF4444] text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-md shadow-red-500/30">
                {favorites.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* PWA Install Modal with Interactive Guides */}
      <InstallPwaModal isOpen={isPwaModalOpen} onClose={() => setIsPwaModalOpen(false)} />
    </header>
  );
}
