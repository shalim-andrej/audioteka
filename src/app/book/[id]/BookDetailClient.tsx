"use client";

import React, { use, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Play,
  Pause,
  ArrowLeft,
  ArrowRight,
  Heart,
  Star,
  Clock,
  Mic,
  Calendar,
  Share2,
  CheckCircle2,
  Headphones,
  BookOpen,
  Download,
  Bookmark,
  Volume2,
  RotateCcw,
  RotateCw,
  ThumbsUp,
  MessageSquare,
  Sparkles,
  ShieldAlert,
  ChevronDown,
  Layers,
  Radio,
  HardDrive
} from "lucide-react";
import { AUDIOBOOKS } from "@/lib/audiobook-data";
import { Audiobook, Chapter, OtherNarration, Comment } from "@/lib/types";
import { usePlayer } from "@/context/PlayerContext";
import BookCard from "@/components/BookCard";
import Header from "@/components/Header";
import FavoritesDrawer from "@/components/FavoritesDrawer";
import { reachMetrikaGoal } from "@/components/YandexMetrika";

interface BookDetailClientProps {
  book: Audiobook;
  initialRelatedBooks?: Audiobook[];
}

export default function BookDetailClient({
  book,
  initialRelatedBooks = [],
}: BookDetailClientProps) {
  const [activeTab, setActiveTab] = useState<"about" | "chapters" | "narrations" | "comments">("about");
  const [chapterSearch, setChapterSearch] = useState("");
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [userNarratorRating, setUserNarratorRating] = useState<number | null>(null);
  const [hoverNarratorRating, setHoverNarratorRating] = useState<number | null>(null);
  const [shelfStatus, setShelfStatus] = useState<string>("default");
  const [isShelfMenuOpen, setIsShelfMenuOpen] = useState(false);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<string, boolean>>({});

  const [relatedBooks, setRelatedBooks] = useState<Audiobook[]>(initialRelatedBooks);
  const [commentList, setCommentList] = useState(book.comments || []);
  const [newCommentText, setNewCommentText] = useState("");
  const [newCommentAuthor, setNewCommentAuthor] = useState("");
  const [newCommentRating, setNewCommentRating] = useState(10);
  const [newCommentSpoiler, setNewCommentSpoiler] = useState(false);

  const {
    currentBook,
    currentChapterIndex,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    playBook,
    togglePlay,
    seek,
    skipTime,
    setRate,
    toggleFavorite,
    isFavorite,
    sleepTimer,
    setSleep,
  } = usePlayer();

  // Auto-resume from URL parameters (?ch=0&t=120)
  useEffect(() => {
    if (typeof window !== "undefined" && book) {
      const sp = new URLSearchParams(window.location.search);
      const chParam = sp.get("ch");
      const tParam = sp.get("t");
      if (chParam !== null || tParam !== null) {
        const chIdx = chParam ? Number(chParam) : 0;
        const timeSec = tParam ? Number(tParam) : 0;
        playBook(book, chIdx, timeSec);
      }
    }
  }, [book.id]);

  const isFav = isFavorite(book.id);
  const isThisBookPlaying = currentBook?.id === book.id && isPlaying;
  const isThisBookActive = currentBook?.id === book.id;

  const handleShare = () => {
    if (typeof window !== "undefined" && navigator.clipboard) {
      const url = currentBook?.id === book?.id && currentTime > 5
        ? `${window.location.origin}/book/${book.id}?ch=${currentChapterIndex}&t=${Math.floor(currentTime)}`
        : window.location.href;
      navigator.clipboard.writeText(url);
      setCopied(true);
      reachMetrikaGoal("share_book", { bookId: book.id, title: book.title });
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const newC = {
      id: "c-" + Date.now(),
      user: newCommentAuthor.trim() || "Слушатель PRO",
      avatar: (newCommentAuthor.trim() || "СП").slice(0, 2).toUpperCase(),
      date: "Сегодня в " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      rating: newCommentRating,
      text: newCommentText.trim(),
      likes: 1,
      isSpoiler: newCommentSpoiler,
    };

    setCommentList([newC, ...commentList]);
    setNewCommentText("");
    setNewCommentSpoiler(false);
  };

  const toggleSpoiler = (commentId: string) => {
    setRevealedSpoilers(prev => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  const formatSec = (sec: number) => {
    if (!sec || isNaN(sec)) return "00:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="min-h-screen bg-[#06080D] text-white">
      <Header onOpenFavorites={() => setIsFavoritesOpen(true)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Breadcrumb (KnigaVUhe standard) */}
        <nav className="flex items-center gap-2 text-xs text-gray-400 mb-6 flex-wrap">
          <Link href="/" className="hover:text-[#F59E0B] transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            Главная
          </Link>
          <span>/</span>
          <span className="text-gray-500">Жанр:</span>
          <Link href="/" className="hover:text-[#F59E0B] transition-colors">
            {book.genre}
          </Link>
          <span>/</span>
          <span className="text-gray-500">Автор:</span>
          <span className="text-gray-300 font-medium">{book.author}</span>
          <span>/</span>
          <span className="text-[#F59E0B] font-semibold truncate max-w-[260px]">{book.title}</span>
        </nav>

        {/* Top Book Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[330px_1fr] gap-8 lg:gap-12 items-start mb-14">
          
          {/* Left Column: Big Book Cover, Shelf, Rating, Specs */}
          <div className="flex flex-col space-y-6">
            {/* Book Cover Container with 3D depth */}
            <div className="relative w-full max-w-[330px] mx-auto lg:mx-0 aspect-[2/3] rounded-3xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] border border-white/15 bg-[#0F1420] group flex items-center justify-center">
              <img
                src={book.coverUrl || `/api/cover?title=${encodeURIComponent(book.title)}&author=${encodeURIComponent(book.author)}`}
                alt={book.title}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `/api/cover?title=${encodeURIComponent(book.title)}&author=${encodeURIComponent(book.author)}`;
                }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                loading="eager"
              />

              {/* Spine shine effect */}
              <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white/15 via-white/5 to-transparent pointer-events-none" />

              {/* Corner badge */}
              <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[10px] font-bold text-[#F59E0B] tracking-wider uppercase">
                {book.isFeatured ? "★ Выбор редакции" : "Аудиокнига PRO"}
              </div>

              {/* Status banner when listening */}
              {isThisBookPlaying && (
                <div className="absolute bottom-4 inset-x-4 bg-[#F59E0B] text-[#06080D] font-extrabold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-[#F59E0B]/30 animate-pulse">
                  <Headphones className="w-4 h-4" />
                  <span>Слушаете сейчас</span>
                </div>
              )}
            </div>

            {/* Shelf & Favorite Action Group */}
            <div className="w-full max-w-[330px] mx-auto lg:mx-0 space-y-3">
              {/* Primary Knigavuhe-style "На полку" Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsShelfMenuOpen(!isShelfMenuOpen)}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#182030] to-[#121824] hover:from-[#1F293D] hover:to-[#161F2E] border border-white/15 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-between shadow-lg transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-[#F59E0B]" />
                    {shelfStatus === "default" && "На полку"}
                    {shelfStatus === "want" && "📌 В планах послушать"}
                    {shelfStatus === "listening" && "🎧 Слушаю сейчас"}
                    {shelfStatus === "done" && "✅ Уже прослушано"}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isShelfMenuOpen ? "rotate-180" : ""}`} />
                </button>

                {isShelfMenuOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#0F1420] border border-white/15 rounded-xl shadow-2xl p-1.5 z-30 space-y-1 backdrop-blur-xl">
                    <button
                      onClick={() => { setShelfStatus("want"); setIsShelfMenuOpen(false); }}
                      className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-white/10 flex items-center gap-2.5 text-gray-200"
                    >
                      <span>📌</span> Хочу послушать
                    </button>
                    <button
                      onClick={() => { setShelfStatus("listening"); setIsShelfMenuOpen(false); }}
                      className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-white/10 flex items-center gap-2.5 text-gray-200"
                    >
                      <span>🎧</span> Слушаю сейчас
                    </button>
                    <button
                      onClick={() => { setShelfStatus("done"); setIsShelfMenuOpen(false); }}
                      className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-white/10 flex items-center gap-2.5 text-gray-200"
                    >
                      <span>✅</span> Уже прослушано
                    </button>
                  </div>
                )}
              </div>

              {/* Secondary Buttons: Fav & Share */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => toggleFavorite(book.id)}
                  className={`py-3 px-4 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    isFav
                      ? "bg-[#EF4444]/20 border-[#EF4444] text-[#EF4444]"
                      : "bg-[#0F1420] border-white/10 text-gray-300 hover:text-white hover:border-white/20"
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isFav ? "fill-current" : ""}`} />
                  {isFav ? "В избранном" : "В избранное"}
                </button>

                <button
                  onClick={handleShare}
                  className="py-3 px-4 rounded-xl bg-[#0F1420] border border-white/10 text-gray-300 hover:text-white hover:border-white/20 font-bold text-xs flex items-center justify-center gap-2 transition-all relative cursor-pointer"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                  <span>{copied ? "Ссылка скопирована!" : "Поделиться"}</span>
                </button>
              </div>
            </div>

            {/* KnigaVUhe Rating & Stats Card: Dual Rating (Книга / Чтец) */}
            <div className="w-full max-w-[330px] mx-auto lg:mx-0 p-5 rounded-2xl bg-[#0F1420]/90 border border-white/10 space-y-4">
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-white/[0.08]">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block">📖 Сюжет</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-2xl font-black text-white">{book.rating}</span>
                    <span className="text-xs text-gray-400 font-semibold">/10</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[#F59E0B] font-bold block">🎙 Чтец</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-2xl font-black text-[#F59E0B]">{book.narratorRating || 9.8}</span>
                    <span className="text-xs text-gray-400 font-semibold">/10</span>
                  </div>
                </div>
              </div>

              {/* 10-Star Interactive Rating for Book */}
              <div>
                <span className="text-[10px] text-gray-400 font-semibold block mb-1">Оценка книги (сюжет):</span>
                <div className="flex items-center justify-between">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => setUserRating(star)}
                      className="p-0.5 hover:scale-125 transition-transform"
                      title={`Оценить сюжет на ${star} из 10`}
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          (hoverRating !== null ? star <= hoverRating : userRating !== null && star <= userRating)
                            ? "fill-[#F59E0B] text-[#F59E0B]"
                            : "text-gray-600"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* 10-Star Interactive Rating for Narrator */}
              <div>
                <span className="text-[10px] text-gray-400 font-semibold block mb-1">Оценка чтеца ({book.narrator}):</span>
                <div className="flex items-center justify-between">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverNarratorRating(star)}
                      onMouseLeave={() => setHoverNarratorRating(null)}
                      onClick={() => setUserNarratorRating(star)}
                      className="p-0.5 hover:scale-125 transition-transform"
                      title={`Оценить чтеца на ${star} из 10`}
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          (hoverNarratorRating !== null ? star <= hoverNarratorRating : userNarratorRating !== null && star <= userNarratorRating)
                            ? "fill-[#38BDF8] text-[#38BDF8]"
                            : "text-gray-600"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {(userRating || userNarratorRating) && (
                <p className="text-[11px] text-emerald-400 font-bold text-center pt-1">
                  Спасибо! Ваш отзыв учтён в рейтинге.
                </p>
              )}
            </div>

            {/* Technical Specifications (KnigaVUhe Style) */}
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
                  <span className="font-semibold text-[#F59E0B]" suppressHydrationWarning>
                    {book.shelvedCount ? book.shelvedCount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") : "3 820"} читателей
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Title, Series, Dedicated In-Page Player, Chapters, Other Narrations, Annotation, Comments */}
          <div className="space-y-8">
            {/* Header info */}
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

            {/* DEDICATED IN-PAGE AUDIO PLAYER (KnigaVUhe Style) */}
            <div className="p-6 rounded-3xl bg-gradient-to-b from-[#131A29] to-[#0A0E17] border border-white/15 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-[#F59E0B]/5 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 space-y-5">
                {/* Player Top row: Track Title & Status */}
                <div className="flex items-center justify-between">
                  <div className="min-w-0 pr-4">
                    <span className="text-[10px] uppercase tracking-wider text-[#F59E0B] font-black flex items-center gap-1.5 mb-1">
                      <Radio className="w-3.5 h-3.5 animate-pulse" />
                      {isThisBookActive
                        ? `Сейчас играет трек ${(currentChapterIndex ?? 0) + 1} из ${book.chapters.length}`
                        : "Готово к прослушиванию"}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-white truncate">
                      {isThisBookActive && currentBook?.chapters[currentChapterIndex ?? 0]?.title
                        ? currentBook.chapters[currentChapterIndex ?? 0].title
                        : book.chapters[0].title}
                    </h3>
                  </div>

                  {/* Sleep Timer Indicator */}
                  {sleepTimer !== null && (
                    <div className="bg-[#F59E0B]/20 border border-[#F59E0B]/40 px-3 py-1 rounded-full text-xs font-bold text-[#F59E0B] flex items-center gap-1.5 flex-shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Сон: {sleepTimer}м</span>
                    </div>
                  )}
                </div>

                {/* Progress Scrubber Bar */}
                <div className="space-y-1.5">
                  <div className="relative w-full h-2.5 bg-white/10 rounded-full overflow-hidden cursor-pointer group"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickX = e.clientX - rect.left;
                      const percent = clickX / rect.width;
                      if (duration) seek(percent * duration);
                    }}
                  >
                    <div
                      className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-[#F59E0B] via-[#EA580C] to-[#F59E0B] rounded-full transition-all duration-100"
                      style={{
                        width: isThisBookActive && duration ? `${(currentTime / duration) * 100}%` : "0%",
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs font-mono text-gray-400">
                    <span>{isThisBookActive ? formatSec(currentTime) : "00:00"}</span>
                    <span>{isThisBookActive && duration ? formatSec(duration) : (book.chapters[0]?.durationFormatted || book.durationFormatted || "00:00")}</span>
                  </div>
                </div>

                {/* Controls Bar: Big Play, Rewind/Forward, Speed, Sleep */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                  {/* Left: Playback controls */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        if (isThisBookActive) skipTime(-15);
                      }}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
                      title="Перемотка назад на 15 сек"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        if (isThisBookActive) {
                          togglePlay();
                        } else {
                          playBook(book, 0);
                        }
                      }}
                      className="py-3 px-6 rounded-2xl bg-gradient-to-r from-[#F59E0B] via-[#EA580C] to-[#C2410C] text-[#06080D] font-black text-xs uppercase tracking-wider flex items-center gap-2.5 shadow-xl shadow-[#F59E0B]/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    >
                      {isThisBookPlaying ? (
                        <>
                          <Pause className="w-5 h-5 fill-current" />
                          <span>Пауза</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-5 h-5 fill-current translate-x-0.5" />
                          <span>Слушать онлайн</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        if (isThisBookActive) skipTime(15);
                      }}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
                      title="Перемотка вперед на 15 сек"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Right: Knigavuhe-style Speed & Timer controls */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Speed Selector Chips */}
                    <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
                      {[0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => setRate(rate)}
                          className={`px-2 py-1 rounded-lg font-bold transition-all ${
                            playbackRate === rate
                              ? "bg-[#F59E0B] text-[#06080D]"
                              : "text-gray-400 hover:text-white"
                          }`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>

                    {/* Sleep Timer Selector */}
                    <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
                      <span className="text-[10px] text-gray-400 px-1 font-bold">Сон:</span>
                      {[null, 15, 30, 45, 60].map((min) => (
                        <button
                          key={min ?? "off"}
                          onClick={() => setSleep(min)}
                          className={`px-2 py-1 rounded-lg font-bold transition-all ${
                            sleepTimer === min
                              ? "bg-[#F59E0B] text-[#06080D]"
                              : "text-gray-400 hover:text-white"
                          }`}
                        >
                          {min ? `${min}м` : "Выкл"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* LOGICAL TAB NAVIGATION (О книге и сюжет | Оглавление | Озвучки | Отзывы) */}
            <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setActiveTab("about")}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "about"
                    ? "bg-[#F59E0B] text-[#06080D] shadow-md shadow-[#F59E0B]/20"
                    : "bg-white/[0.04] text-gray-300 hover:text-white hover:bg-white/[0.08]"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>О книге и сюжет</span>
              </button>

              <button
                onClick={() => setActiveTab("chapters")}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "chapters"
                    ? "bg-[#F59E0B] text-[#06080D] shadow-md shadow-[#F59E0B]/20"
                    : "bg-white/[0.04] text-gray-300 hover:text-white hover:bg-white/[0.08]"
                }`}
              >
                <Headphones className="w-3.5 h-3.5" />
                <span>Оглавление ({book.chapters.length})</span>
              </button>

              {book.otherNarrations && book.otherNarrations.length > 0 && (
                <button
                  onClick={() => setActiveTab("narrations")}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === "narrations"
                      ? "bg-[#F59E0B] text-[#06080D] shadow-md shadow-[#F59E0B]/20"
                      : "bg-white/[0.04] text-gray-300 hover:text-white hover:bg-white/[0.08]"
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Озвучки ({book.otherNarrations.length})</span>
                </button>
              )}

              <button
                onClick={() => setActiveTab("comments")}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "comments"
                    ? "bg-[#F59E0B] text-[#06080D] shadow-md shadow-[#F59E0B]/20"
                    : "bg-white/[0.04] text-gray-300 hover:text-white hover:bg-white/[0.08]"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Отзывы ({commentList.length})</span>
              </button>
            </div>

            {/* TAB 1: ABOUT & ANNOTATION (Сразу под плеером!) */}
            {activeTab === "about" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* NEXT BOOK IN SERIES */}
                {book.seriesNextBook && (
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-[#0F1420] to-[#0F1420] border border-blue-500/20 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">Продолжение цикла</span>
                      <h4 className="text-base font-bold text-white mt-0.5">{book.seriesNextBook.title}</h4>
                      <p className="text-xs text-gray-400">{book.seriesNextBook.subtitle || "Следующая книга серии"}</p>
                    </div>
                    <Link
                      href={`/book/${book.seriesNextBook.id}`}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors flex-shrink-0 cursor-pointer shadow-lg shadow-blue-500/20"
                    >
                      <span>Слушать далее</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}

                {/* DESCRIPTION & ANNOTATION */}
                <div className="space-y-3">
                  <h3 className="font-serif text-2xl font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-[#F59E0B]" />
                    Аннотация и сюжет
                  </h3>
                  <div className="p-6 rounded-2xl bg-[#0F1420]/80 border border-white/[0.08] text-gray-300 text-sm sm:text-base leading-relaxed space-y-4">
                    <p>{book.description}</p>
                    <div className="p-4 rounded-xl bg-white/[0.02] border-l-4 border-[#F59E0B] text-xs sm:text-sm text-gray-300 italic">
                      «{book.shortDescription}»
                    </div>
                  </div>
                </div>

                {/* COMPACT CHAPTERS PREVIEW (Первые 4 главы + кнопка "Все главы") */}
                <div className="p-5 rounded-2xl bg-[#0F1420]/60 border border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <Headphones className="w-3.5 h-3.5 text-[#F59E0B]" />
                      Главы произведения ({book.chapters.length})
                    </span>
                    <button
                      onClick={() => setActiveTab("chapters")}
                      className="text-xs text-[#F59E0B] hover:underline font-bold cursor-pointer"
                    >
                      Открыть все {book.chapters.length} глав →
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {book.chapters.slice(0, 4).map((ch: Chapter, idx: number) => (
                      <div
                        key={ch.id}
                        onClick={() => playBook(book, idx, ch.startTime)}
                        className="p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] flex items-center justify-between text-xs cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-gray-500 font-mono text-[10px]">{ch.num || idx + 1}</span>
                          <span className="font-semibold text-gray-200 truncate">{ch.title}</span>
                        </div>
                        <span className="text-[10px] font-mono text-gray-400 ml-2">{ch.durationFormatted}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: COMPACT 2-COLUMN CHAPTERS LIST */}
            {activeTab === "chapters" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-serif text-2xl font-bold text-white flex items-center gap-2">
                      <Headphones className="w-5 h-5 text-[#F59E0B]" />
                      Оглавление ({book.chapters.length} глав)
                    </h3>
                    <p className="text-xs text-gray-400">Общее время: {book.durationFormatted} • Студийная запись</p>
                  </div>

                  {/* Quick Chapter Search */}
                  {book.chapters.length > 8 && (
                    <input
                      type="text"
                      value={chapterSearch}
                      onChange={(e) => setChapterSearch(e.target.value)}
                      placeholder="Быстрый поиск главы..."
                      className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-xs outline-none focus:border-[#F59E0B] w-full sm:w-56"
                    />
                  )}
                </div>

                {/* 2-Column Dense Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[560px] overflow-y-auto pr-1">
                  {book.chapters
                    .filter((ch: Chapter) => !chapterSearch || ch.title.toLowerCase().includes(chapterSearch.toLowerCase()))
                    .map((ch: Chapter) => {
                      const realIdx = book.chapters.findIndex((c: Chapter) => c.id === ch.id);
                      const isCurrentChapter =
                        isThisBookActive && currentChapterIndex === realIdx;

                      return (
                        <div
                          key={ch.id}
                          onClick={() => {
                            if (isCurrentChapter) {
                              togglePlay();
                            } else {
                              playBook(book, realIdx, ch.startTime);
                            }
                          }}
                          className={`p-2.5 sm:p-3 rounded-xl border flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                            isCurrentChapter
                              ? "bg-[#F59E0B]/15 border-[#F59E0B] text-white shadow-md shadow-[#F59E0B]/10"
                              : "bg-[#0F1420]/70 border-white/[0.06] text-gray-300 hover:bg-[#141C2E] hover:border-white/20"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-xs ${
                                isCurrentChapter
                                  ? "bg-[#F59E0B] text-[#06080D]"
                                  : "bg-white/[0.06] text-gray-400"
                              }`}
                            >
                              {isCurrentChapter && isPlaying ? (
                                <Pause className="w-3.5 h-3.5 fill-current" />
                              ) : (
                                <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className={`text-xs font-semibold truncate ${
                                isCurrentChapter ? "text-[#F59E0B]" : "text-white"
                              }`}>
                                {ch.title}
                              </p>
                              <span className="text-[10px] text-gray-500 block font-mono">
                                Часть {ch.num || realIdx + 1}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[11px] font-mono text-gray-400 bg-black/40 px-2 py-0.5 rounded">
                              {ch.durationFormatted}
                            </span>
                            <a
                              href={ch.audioUrl}
                              download={`${book.title} - ${ch.title}.mp3`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 text-gray-500 hover:text-[#F59E0B] rounded transition-colors cursor-pointer"
                              title="Скачать MP3"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* TAB 3: OTHER NARRATIONS */}
            {activeTab === "narrations" && book.otherNarrations && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h3 className="font-serif text-2xl font-bold text-white flex items-center gap-2">
                  <Mic className="w-5 h-5 text-[#F59E0B]" />
                  Другие озвучки этой книги
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {book.otherNarrations.map((on: OtherNarration, i: number) => (
                    <div
                      key={i}
                      className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                        on.active
                          ? "bg-[#F59E0B]/10 border-[#F59E0B]/50 text-white"
                          : "bg-white/[0.02] border-white/10 text-gray-300 hover:bg-white/[0.05]"
                      }`}
                    >
                      <div>
                        <p className="font-bold text-sm text-white">{on.narrator}</p>
                        <span className="text-[11px] text-gray-400">{on.duration} • ★ {on.rating}</span>
                      </div>
                      <div>
                        {on.active ? (
                          <span className="text-[10px] bg-[#F59E0B] text-[#06080D] font-extrabold px-2.5 py-1 rounded-md">Текущая</span>
                        ) : (
                          <button
                            onClick={() => alert(`Переключение на озвучку: ${on.narrator}`)}
                            className="text-[11px] bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-lg transition-colors cursor-pointer font-bold"
                          >
                            Слушать
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: REVIEWS & COMMENTS */}
            {activeTab === "comments" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-2xl font-bold text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-[#F59E0B]" />
                    Отзывы и комментарии ({commentList.length})
                  </h3>
                  <span className="text-xs text-gray-400">Обсуждение слушателей</span>
                </div>

                {/* Add Comment Form */}
                <form onSubmit={handleAddComment} className="p-5 rounded-2xl bg-[#0F1420] border border-white/10 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                    Оставить отзыв об аудиокниге
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={newCommentAuthor}
                      onChange={(e) => setNewCommentAuthor(e.target.value)}
                      placeholder="Ваше имя (или никнейм)"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-[#F59E0B]"
                    />

                    <div className="flex items-center justify-between bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-xs">
                      <span className="text-gray-400">Ваша оценка:</span>
                      <select
                        value={newCommentRating}
                        onChange={(e) => setNewCommentRating(Number(e.target.value))}
                        className="bg-transparent text-[#F59E0B] font-bold focus:outline-none cursor-pointer"
                      >
                        <option value={10}>10 / 10 ★ Шедевр</option>
                        <option value={9}>9 / 10 ★ Отлично</option>
                        <option value={8}>8 / 10 ★ Очень хорошо</option>
                        <option value={7}>7 / 10 ★ Хорошо</option>
                      </select>
                    </div>
                  </div>

                  <textarea
                    rows={3}
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Поделитесь впечатлением от озвучки, книги и атмосферы..."
                    className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-xs sm:text-sm focus:outline-none focus:border-[#F59E0B]"
                  />

                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={newCommentSpoiler}
                        onChange={(e) => setNewCommentSpoiler(e.target.checked)}
                        className="rounded accent-[#F59E0B]"
                      />
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                      <span>Содержит спойлер сюжета</span>
                    </label>

                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#EA580C] text-[#06080D] font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-[#F59E0B]/20"
                    >
                      Отправить отзыв
                    </button>
                  </div>
                </form>

                {/* Comments List */}
                <div className="space-y-3">
                  {commentList.map((comm: Comment) => {
                    const isHidden = comm.isSpoiler && !revealedSpoilers[comm.id];

                    return (
                      <div key={comm.id} className="p-4 sm:p-5 rounded-2xl bg-[#0F1420]/60 border border-white/[0.06] space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#F59E0B] to-[#EA580C] text-[#06080D] font-black text-xs flex items-center justify-center">
                              {comm.avatar}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-white block">{comm.user}</span>
                              <span className="text-[10px] text-gray-500">{comm.date}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-lg border border-white/5">
                            <Star className="w-3 h-3 text-[#F59E0B] fill-[#F59E0B]" />
                            <span className="text-xs font-bold text-white">{comm.rating}</span>
                          </div>
                        </div>

                        {isHidden ? (
                          <div
                            onClick={() => toggleSpoiler(comm.id)}
                            className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between cursor-pointer hover:bg-amber-500/20 transition-all"
                          >
                            <span className="flex items-center gap-2">
                              <ShieldAlert className="w-4 h-4 text-amber-400" />
                              Этот комментарий помечен как спойлер. Нажмите, чтобы прочитать.
                            </span>
                            <span className="underline font-bold text-[11px]">Показать</span>
                          </div>
                        ) : (
                          <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                            {comm.text}
                          </p>
                        )}

                        <div className="flex items-center justify-end gap-3 text-xs text-gray-400 pt-1">
                          <button className="flex items-center gap-1 hover:text-[#F59E0B] transition-colors cursor-pointer">
                            <ThumbsUp className="w-3.5 h-3.5" />
                            <span>{comm.likes}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* RECOMMENDATIONS (С этой книгой также слушают) */}
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

      <FavoritesDrawer
        isOpen={isFavoritesOpen}
        onClose={() => setIsFavoritesOpen(false)}
        allBooks={AUDIOBOOKS}
      />
    </div>
  );
}
