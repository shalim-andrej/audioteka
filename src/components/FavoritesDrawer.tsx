"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, Heart, History, Play, Trash2, Bookmark as BookmarkIcon, Clock } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { useFavoritesStore } from "@/store/favorites";
import { Audiobook } from "@/lib/types";

interface FavoritesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FavoritesDrawer({
  isOpen,
  onClose,
}: FavoritesDrawerProps) {
  const [activeTab, setActiveTab] = useState<"favorites" | "history" | "bookmarks">("favorites");
  const { history, bookmarks, playBook, removeBookmark, jumpToBookmark } = usePlayer();
  
  const favorites = useFavoritesStore((state) => state.favorites);
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);

  // Загружаем книги для избранного
  const [favoriteBooks, setFavoriteBooks] = useState<Audiobook[]>([]);
  useEffect(() => {
    if (favorites.length === 0) {
      setFavoriteBooks([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/audiobooks?ids=${favorites.join(",")}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success && data.items) setFavoriteBooks(data.items);
        else setFavoriteBooks([]);
      })
      .catch(() => {
        if (!cancelled) setFavoriteBooks([]);
      });
    return () => { cancelled = true; };
  }, [favorites]);

  // Загружаем книги для истории
  const [historyBooks, setHistoryBooks] = useState<Audiobook[]>([]);
  useEffect(() => {
    if (history.length === 0) {
      setHistoryBooks([]);
      return;
    }
    const ids = [...new Set(history.map((h) => h.bookId))];
    let cancelled = false;
    fetch(`/api/audiobooks?ids=${ids.join(",")}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success && data.items) setHistoryBooks(data.items);
        else setHistoryBooks([]);
      })
      .catch(() => {
        if (!cancelled) setHistoryBooks([]);
      });
    return () => { cancelled = true; };
  }, [history]);

  // Загружаем книги для закладок
  const [bookmarkBooks, setBookmarkBooks] = useState<Audiobook[]>([]);
  useEffect(() => {
    if (bookmarks.length === 0) {
      setBookmarkBooks([]);
      return;
    }
    const ids = [...new Set(bookmarks.map((b) => b.bookId))];
    let cancelled = false;
    fetch(`/api/audiobooks?ids=${ids.join(",")}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success && data.items) setBookmarkBooks(data.items);
        else setBookmarkBooks([]);
      })
      .catch(() => {
        if (!cancelled) setBookmarkBooks([]);
      });
    return () => { cancelled = true; };
  }, [bookmarks]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[#0C101B] border-l border-white/10 h-full flex flex-col p-6 z-10 shadow-2xl shadow-black">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div>
            <h2 className="font-serif text-2xl font-bold text-white flex items-center gap-2">
              Моя библиотека
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Полка, история и сохранённые закладки</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-1.5 my-4 p-1 bg-[#06080D] rounded-2xl border border-white/5">
          <button
            onClick={() => setActiveTab("favorites")}
            className={`flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "favorites"
                ? "bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-[#06080D] shadow"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Heart className="w-3 h-3" />
            <span>Полка ({favorites.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "history"
                ? "bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-[#06080D] shadow"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <History className="w-3 h-3" />
            <span>История ({history.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("bookmarks")}
            className={`flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "bookmarks"
                ? "bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-[#06080D] shadow"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <BookmarkIcon className="w-3 h-3" />
            <span>Закладки ({bookmarks.length})</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {activeTab === "favorites" && (
            favoriteBooks.length === 0 ? (
              <div className="text-center py-24 text-gray-400 space-y-3">
                <Heart className="w-14 h-14 text-gray-700 mx-auto stroke-1" />
                <p className="text-sm font-semibold text-gray-300">Ваша полка пока пуста</p>
                <p className="text-xs text-gray-500 max-w-xs mx-auto">
                  Нажимайте на сердечко у любой книги в каталоге, чтобы сохранить её в свою библиотеку.
                </p>
              </div>
            ) : (
              favoriteBooks.map((book) => (
                <div
                  key={book.id}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-[#111726]/60 border border-white/5 hover:border-[#F59E0B]/40 transition-all group"
                >
                  <div className="relative w-12 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-900 border border-white/10 shadow">
                    <Image
                      src={book.coverUrl}
                      alt={book.title}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/book/${book.id}`}
                      onClick={onClose}
                      className="font-serif text-sm font-bold text-white hover:text-[#F59E0B] truncate block leading-snug"
                    >
                      {book.title}
                    </Link>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{book.author}</p>
                    <span className="text-[10px] text-[#F59E0B] font-bold block mt-1">
                      ★ {book.rating} • {book.durationFormatted}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        playBook(book, 0);
                        onClose();
                      }}
                      className="p-2.5 rounded-xl bg-[#F59E0B] text-[#06080D] hover:scale-105 active:scale-95 transition-transform cursor-pointer shadow-md shadow-[#F59E0B]/20"
                      title="Слушать"
                    >
                      <Play className="w-4 h-4 fill-current translate-x-0.5" />
                    </button>
                    <button
                      onClick={() => toggleFavorite(book.id)}
                      className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                      title="Удалить из полки"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )
          )}

          {activeTab === "history" && (
            history.length === 0 ? (
              <div className="text-center py-24 text-gray-400 space-y-3">
                <History className="w-14 h-14 text-gray-700 mx-auto stroke-1" />
                <p className="text-sm font-semibold text-gray-300">История прослушиваний пуста</p>
                <p className="text-xs text-gray-500 max-w-xs mx-auto">
                  Здесь будут сохраняться книги, которые вы слушали, с возможностью продолжить с той же секунды.
                </p>
              </div>
            ) : (
              history.map((item) => {
                const book = historyBooks.find((b) => b.id === item.bookId);
                if (!book) return null;
                const mins = Math.floor(item.progressSec / 60);

                return (
                  <div
                    key={item.bookId}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-[#111726]/60 border border-white/5 hover:border-white/10 transition-all"
                  >
                    <div className="relative w-12 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-900 border border-white/10 shadow">
                      <Image
                        src={book.coverUrl}
                        alt={book.title}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-serif text-sm font-bold text-white truncate leading-snug">
                        {book.title}
                      </h4>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{book.author}</p>
                      <span className="text-[10px] text-[#F59E0B] font-black uppercase tracking-wider block mt-1">
                        Остановились на {mins} мин.
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        playBook(book, item.chapterIndex || 0, item.progressSec);
                        onClose();
                      }}
                      className="p-2.5 rounded-xl bg-[#F59E0B] text-[#06080D] hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                      title="Продолжить слушать"
                    >
                      <Play className="w-4 h-4 fill-current translate-x-0.5" />
                    </button>
                  </div>
                );
              })
            )
          )}

          {activeTab === "bookmarks" && (
            bookmarks.length === 0 ? (
              <div className="text-center py-24 text-gray-400 space-y-3">
                <BookmarkIcon className="w-14 h-14 text-gray-700 mx-auto stroke-1" />
                <p className="text-sm font-semibold text-gray-300">Закладок пока нет</p>
                <p className="text-xs text-gray-500 max-w-xs mx-auto">
                  Нажимайте на значок закладки в плеере во время прослушивания, чтобы сохранить важный момент книги.
                </p>
              </div>
            ) : (
              bookmarks.map((bm) => {
                const book = bookmarkBooks.find((b) => b.id === bm.bookId);
                if (!book) return null;
                return (
                  <div
                    key={bm.id}
                    className="p-3.5 rounded-2xl bg-[#111726]/80 border border-white/5 hover:border-[#F59E0B]/30 transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{bm.bookTitle}</h4>
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">{bm.chapterTitle}</p>
                      </div>
                      <button
                        onClick={() => removeBookmark(bm.id)}
                        className="text-gray-500 hover:text-red-400 p-1 transition-colors cursor-pointer"
                        title="Удалить закладку"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-white/5">
                      <span className="text-[11px] font-mono font-bold text-[#F59E0B] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {bm.timeFormatted}
                      </span>

                      <button
                        onClick={() => {
                          jumpToBookmark(bm, bookmarkBooks);
                          onClose();
                        }}
                        className="px-3 py-1 bg-[#F59E0B] text-[#06080D] font-black text-[10px] uppercase rounded-lg flex items-center gap-1 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                        Перейти
                      </button>
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>
      </div>
    </div>
  );
}