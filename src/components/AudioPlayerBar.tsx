// src/components/AudioPlayerBar.tsx
"use client";

import React, { memo, useState } from "react";
import Link from "next/link";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Moon,
  ListMusic,
  Heart,
  X,
  Bookmark,
  Sparkles,
  Share2,
  Check,
} from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { useFavoritesStore } from "@/store/favorites";

function AudioPlayerBar() {
  const {
    currentBook,
    currentChapter,
    currentChapterIndex,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    volume,
    isMuted,
    sleepTimer,
    sleepMode,
    isVoiceBoost,
    togglePlay,
    seek,
    skipTime,
    setRate,
    setVol,
    toggleMute,
    nextChapter,
    prevChapter,
    setSleep,
    closePlayer,
    toggleVoiceBoost,
    addBookmark,
  } = usePlayer();

  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
  const isFavorite = useFavoritesStore((state) => state.isFavorite);

  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const [bookmarkSaved, setBookmarkSaved] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!currentBook || !currentChapter) return null;

  const isFav = isFavorite(currentBook.id);

  const formatSec = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleAddBookmark = () => {
    addBookmark();
    setBookmarkSaved(true);
    setTimeout(() => setBookmarkSaved(false), 2000);
  };

  const handleShareTimestamp = () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/book/${currentBook.id}?ch=${currentChapterIndex}&t=${Math.floor(currentTime)}`;
    navigator.clipboard?.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const speedOptions = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const coverSrc =
    currentBook.coverUrl ||
    `/api/cover?title=${encodeURIComponent(currentBook.title)}&author=${encodeURIComponent(currentBook.author)}`;

  return (
    <aside
      aria-label="Аудиоплеер"
      className="fixed bottom-0 left-0 right-0 z-50 p-2 sm:p-4 pointer-events-none pb-[env(safe-area-inset-bottom)]"
    >
      <div className="max-w-6xl mx-auto pointer-events-auto relative rounded-3xl bg-[#0B0F19]/95 backdrop-blur-3xl border border-white/[0.14] shadow-[0_20px_60px_rgba(0,0,0,0.9)] px-4 sm:px-7 py-3 transition-all">
        <div
          role="progressbar"
          aria-label="Прогресс главы"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(currentTime)}
          className="absolute -top-1 left-6 right-6 h-1.5 bg-white/[0.1] rounded-full overflow-hidden cursor-pointer group"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            seek(pct * duration);
          }}
        >
          <div
            className="h-full bg-gradient-to-r from-[#F59E0B] via-[#EA580C] to-[#F59E0B] transition-all relative"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-3 sm:gap-6">
          <div className="flex items-center gap-3 min-w-0 w-[200px] sm:w-[280px]">
            <Link
              href={`/book/${currentBook.id}`}
              prefetch={false}
              className="relative w-12 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-950 border border-white/10 group shadow-md"
            >
              {/* width/height заданы явно: без них контейнер «прыгал» при загрузке */}
              <img
                src={coverSrc}
                alt={currentBook.title}
                width={48}
                height={64}
                decoding="async"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            </Link>

            <div className="min-w-0 flex-1">
              <Link href={`/book/${currentBook.id}`} prefetch={false} className="hover:underline block">
                <h4 className="font-serif text-sm font-bold text-white truncate leading-snug">
                  {currentBook.title}
                </h4>
              </Link>
              <p className="text-[11px] text-[#F59E0B] font-semibold truncate">{currentBook.author}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isPlaying && (
                  <div className="flex items-center gap-0.5 h-3 flex-shrink-0" aria-hidden="true">
                    <span className="equalizer-bar !w-[2px] !h-2.5" />
                    <span className="equalizer-bar !w-[2px] !h-3.5" />
                    <span className="equalizer-bar !w-[2px] !h-2" />
                  </div>
                )}
                <p className="text-[10px] text-gray-300 truncate">{currentChapter.title ?? ""}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => toggleFavorite(currentBook.id)}
              aria-label={isFav ? "Убрать из избранного" : "Добавить в избранное"}
              className="hidden sm:grid place-items-center min-w-[44px] min-h-[44px] text-gray-300 hover:text-white transition-colors cursor-pointer"
            >
              <Heart className={`w-4 h-4 ${isFav ? "fill-[#EF4444] text-[#EF4444]" : ""}`} aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 max-w-lg flex flex-col items-center gap-1">
            <div className="flex items-center gap-1 sm:gap-3">
              <button
                type="button"
                onClick={prevChapter}
                disabled={currentChapterIndex === 0 && currentTime <= 5}
                aria-label="Предыдущая глава"
                className="grid place-items-center min-w-[44px] min-h-[44px] text-gray-200 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
              >
                <SkipBack className="w-4 h-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => skipTime(-15)}
                aria-label="Назад на 15 секунд"
                className="grid place-items-center min-w-[44px] min-h-[44px] text-gray-200 hover:text-white transition-colors cursor-pointer relative"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-black text-gray-300">
                  15
                </span>
              </button>

              <button
                type="button"
                onClick={togglePlay}
                aria-label={isPlaying ? "Пауза" : "Воспроизвести"}
                className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#F59E0B] via-[#EA580C] to-[#C2410C] grid place-items-center text-[#06080D] shadow-lg shadow-[#F59E0B]/30 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" aria-hidden="true" />
                ) : (
                  <Play className="w-5 h-5 fill-current translate-x-0.5" aria-hidden="true" />
                )}
              </button>

              <button
                type="button"
                onClick={() => skipTime(15)}
                aria-label="Вперёд на 15 секунд"
                className="grid place-items-center min-w-[44px] min-h-[44px] text-gray-200 hover:text-white transition-colors cursor-pointer relative"
              >
                <RotateCw className="w-4 h-4" aria-hidden="true" />
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-black text-gray-300">
                  15
                </span>
              </button>

              <button
                type="button"
                onClick={nextChapter}
                disabled={currentChapterIndex >= (currentBook.chapters?.length ?? 0) - 1}
                aria-label="Следующая глава"
                className="grid place-items-center min-w-[44px] min-h-[44px] text-gray-200 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
              >
                <SkipForward className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="w-full flex items-center gap-2.5 text-[11px] font-mono font-medium text-gray-300">
              <span className="w-9 text-right text-gray-200">{formatSec(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={1}
                value={currentTime}
                onChange={(e) => seek(Number(e.target.value))}
                aria-label="Позиция воспроизведения"
                className="flex-1 h-1 bg-white/10 rounded-lg outline-none cursor-pointer accent-[#F59E0B]"
              />
              <span className="w-9 text-gray-300">{formatSec(duration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowSpeedMenu(!showSpeedMenu);
                  setShowSleepMenu(false);
                }}
                aria-label="Скорость воспроизведения"
                aria-expanded={showSpeedMenu}
                className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-black text-gray-100 border border-white/[0.08] transition-colors cursor-pointer"
              >
                {playbackRate}x
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-12 right-0 bg-[#0F1420] border border-white/10 rounded-2xl p-2 shadow-2xl flex flex-col gap-1 z-50">
                  <span className="text-[10px] font-black text-gray-300 px-2 py-1 uppercase tracking-wider">
                    Скорость
                  </span>
                  {speedOptions.map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => {
                        setRate(rate);
                        setShowSpeedMenu(false);
                      }}
                      className={`text-xs px-3 py-2 rounded-lg text-left transition-colors font-bold cursor-pointer ${
                        playbackRate === rate
                          ? "bg-[#F59E0B] text-[#06080D]"
                          : "text-gray-200 hover:bg-white/10"
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => {
                  setShowSleepMenu(!showSleepMenu);
                  setShowSpeedMenu(false);
                }}
                aria-label="Таймер сна"
                aria-expanded={showSleepMenu}
                className={`grid place-items-center min-w-[44px] min-h-[44px] rounded-xl border transition-colors cursor-pointer ${
                  sleepMode !== null
                    ? "bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B]"
                    : "bg-white/[0.05] border-white/[0.08] text-gray-200 hover:text-white"
                }`}
              >
                <Moon className="w-4 h-4" aria-hidden="true" />
              </button>

              {showSleepMenu && (
                <div className="absolute bottom-12 right-0 bg-[#0F1420] border border-white/10 rounded-2xl p-2.5 shadow-2xl flex flex-col gap-1 z-50 min-w-[180px]">
                  <span className="text-[10px] font-black text-gray-300 px-2 py-1 uppercase tracking-wider">
                    Таймер сна
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSleep(null);
                      setShowSleepMenu(false);
                    }}
                    className={`text-xs px-3 py-2 rounded-lg text-left font-bold cursor-pointer ${
                      sleepMode === null ? "bg-[#F59E0B] text-[#06080D]" : "text-gray-200 hover:bg-white/10"
                    }`}
                  >
                    Выключен
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSleep(null, "chapter");
                      setShowSleepMenu(false);
                    }}
                    className={`text-xs px-3 py-2 rounded-lg text-left font-bold cursor-pointer flex items-center justify-between ${
                      sleepMode === "chapter"
                        ? "bg-[#F59E0B] text-[#06080D]"
                        : "text-[#F59E0B] hover:bg-white/10"
                    }`}
                  >
                    <span>До конца главы 🌙</span>
                  </button>
                  {[15, 30, 45, 60].map((min) => (
                    <button
                      key={min}
                      type="button"
                      onClick={() => {
                        setSleep(min, "minutes");
                        setShowSleepMenu(false);
                      }}
                      className={`text-xs px-3 py-2 rounded-lg text-left font-bold cursor-pointer ${
                        sleepMode === "minutes" && sleepTimer === min
                          ? "bg-[#F59E0B] text-[#06080D]"
                          : "text-gray-200 hover:bg-white/10"
                      }`}
                    >
                      {min} минут
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={toggleVoiceBoost}
              aria-pressed={isVoiceBoost}
              aria-label="Режим «Чёткий голос»"
              className={`hidden md:flex items-center justify-center gap-1 min-h-[44px] px-2 rounded-xl border transition-all cursor-pointer text-[11px] font-bold ${
                isVoiceBoost
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                  : "bg-white/[0.05] border-white/[0.08] text-gray-300 hover:text-white"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden lg:inline">{isVoiceBoost ? "Голос +" : "Чёткость"}</span>
            </button>

            <button
              type="button"
              onClick={handleAddBookmark}
              aria-label="Поставить закладку"
              className={`grid place-items-center min-w-[44px] min-h-[44px] rounded-xl border transition-colors cursor-pointer relative ${
                bookmarkSaved
                  ? "bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B]"
                  : "bg-white/[0.05] border-white/[0.08] text-gray-300 hover:text-white"
              }`}
            >
              {bookmarkSaved ? (
                <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              ) : (
                <Bookmark className="w-4 h-4" aria-hidden="true" />
              )}
              {bookmarkSaved && (
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-0.5 rounded shadow whitespace-nowrap">
                  Сохранено
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={handleShareTimestamp}
              aria-label="Скопировать ссылку на этот момент"
              className="hidden sm:grid place-items-center min-w-[44px] min-h-[44px] rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-gray-300 hover:text-white border border-white/[0.08] transition-colors cursor-pointer relative"
            >
              {copiedLink ? (
                <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              ) : (
                <Share2 className="w-4 h-4" aria-hidden="true" />
              )}
              {copiedLink && (
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-0.5 rounded shadow whitespace-nowrap">
                  Скопировано
                </span>
              )}
            </button>

            {/*
              Кнопка «Скачать MP3» удалена намеренно: раздача аудиофайлов
              противоречит переходу на партнёрский каталог Литрес.
              Для легальной модели скачивание не предусмотрено.
            */}

            <div className="hidden md:flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleMute}
                aria-label={isMuted ? "Включить звук" : "Выключить звук"}
                className="grid place-items-center min-w-[44px] min-h-[44px] text-gray-300 hover:text-white transition-colors cursor-pointer"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-400" aria-hidden="true" />
                ) : (
                  <Volume2 className="w-4 h-4" aria-hidden="true" />
                )}
              </button>

              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => setVol(Number(e.target.value))}
                aria-label="Громкость"
                className="w-16 h-1 bg-white/10 rounded cursor-pointer accent-[#F59E0B]"
              />
            </div>

            <Link
              href={`/book/${currentBook.id}`}
              prefetch={false}
              aria-label="Список глав"
              className="grid place-items-center min-w-[44px] min-h-[44px] rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-gray-200 hover:text-white border border-white/[0.08] transition-colors"
            >
              <ListMusic className="w-4 h-4" aria-hidden="true" />
            </Link>

            <button
              type="button"
              onClick={closePlayer}
              aria-label="Закрыть плеер"
              className="grid place-items-center min-w-[44px] min-h-[44px] rounded-xl bg-white/[0.05] hover:bg-red-500/20 text-gray-300 hover:text-red-400 border border-white/[0.08] hover:border-red-500/30 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default memo(AudioPlayerBar);
