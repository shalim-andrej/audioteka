"use client";

import React, { useState } from "react";
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
  Download,
  Share2,
  Check
} from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";

export default function AudioPlayerBar() {
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
    toggleFavorite,
    isFavorite,
    closePlayer,
    toggleVoiceBoost,
    addBookmark,
  } = usePlayer();

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
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/book/${currentBook.id}?ch=${currentChapterIndex}&t=${Math.floor(currentTime)}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const speedOptions = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <aside aria-label="Аудиоплеер" className="fixed bottom-0 left-0 right-0 z-50 p-2 sm:p-4 pointer-events-none">
      <div className="max-w-6xl mx-auto pointer-events-auto relative rounded-3xl bg-[#0B0F19]/95 backdrop-blur-3xl border border-white/[0.14] shadow-[0_20px_60px_rgba(0,0,0,0.9)] px-4 sm:px-7 py-3 transition-all">
        {/* Top Scrubber Line */}
        <div
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
          {/* Left Block: Book Cover & Titles */}
          <div className="flex items-center gap-3 min-w-0 w-[200px] sm:w-[280px]">
            <Link
              href={`/book/${currentBook.id}`}
              className="relative w-12 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-950 border border-white/10 group shadow-md flex items-center justify-center"
            >
              <img
                src={currentBook.coverUrl || `/api/cover?title=${encodeURIComponent(currentBook.title)}&author=${encodeURIComponent(currentBook.author)}`}
                alt={currentBook.title}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `/api/cover?title=${encodeURIComponent(currentBook.title)}&author=${encodeURIComponent(currentBook.author)}`;
                }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                loading="eager"
              />
            </Link>

            <div className="min-w-0 flex-1">
              <Link href={`/book/${currentBook.id}`} className="hover:underline block">
                <h4 className="font-serif text-sm font-bold text-white truncate leading-snug">
                  {currentBook.title}
                </h4>
              </Link>
              <p className="text-[11px] text-[#F59E0B] font-semibold truncate">
                {currentBook.author}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isPlaying && (
                  <div className="flex items-center gap-0.5 h-3 flex-shrink-0">
                    <span className="equalizer-bar !w-[2px] !h-2.5" />
                    <span className="equalizer-bar !w-[2px] !h-3.5" />
                    <span className="equalizer-bar !w-[2px] !h-2" />
                  </div>
                )}
                <p className="text-[10px] text-gray-400 truncate">
                  {currentChapter.title}
                </p>
              </div>
            </div>

            <button
              onClick={() => toggleFavorite(currentBook.id)}
              className="hidden sm:block p-1.5 text-gray-400 hover:text-white transition-colors cursor-pointer"
              title={isFav ? "В избранном" : "Добавить в избранное"}
            >
              <Heart className={`w-4 h-4 ${isFav ? "fill-[#EF4444] text-[#EF4444]" : ""}`} />
            </button>
          </div>

          {/* Center Block: Controls & Time Slider */}
          <div className="flex-1 max-w-lg flex flex-col items-center gap-1">
            {/* Playback Button Group */}
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={prevChapter}
                disabled={currentChapterIndex === 0 && currentTime <= 5}
                className="p-1.5 text-gray-300 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
                title="Предыдущая глава ([)"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={() => skipTime(-15)}
                className="p-1.5 text-gray-300 hover:text-white transition-colors relative cursor-pointer"
                title="Перемотка назад на 15 сек (←)"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 text-[8px] font-black text-gray-400">15</span>
              </button>

              <button
                onClick={togglePlay}
                className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#F59E0B] via-[#EA580C] to-[#C2410C] flex items-center justify-center text-[#06080D] shadow-lg shadow-[#F59E0B]/30 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                title={isPlaying ? "Пауза (Пробел)" : "Воспроизведение (Пробел)"}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current translate-x-0.5" />
                )}
              </button>

              <button
                onClick={() => skipTime(15)}
                className="p-1.5 text-gray-300 hover:text-white transition-colors relative cursor-pointer"
                title="Перемотка вперед на 15 сек (→)"
              >
                <RotateCw className="w-4 h-4" />
                <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 text-[8px] font-black text-gray-400">15</span>
              </button>

              <button
                onClick={nextChapter}
                disabled={currentChapterIndex >= currentBook.chapters.length - 1}
                className="p-1.5 text-gray-300 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
                title="Следующая глава (])"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Time Indicators and Slider */}
            <div className="w-full flex items-center gap-2.5 text-[11px] font-mono font-medium text-gray-400">
              <span className="w-9 text-right text-gray-300">{formatSec(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={(e) => seek(Number(e.target.value))}
                className="flex-1 h-1 bg-white/10 rounded-lg outline-none cursor-pointer accent-[#F59E0B]"
              />
              <span className="w-9 text-gray-500">{formatSec(duration)}</span>
            </div>
          </div>

          {/* Right Block: Speed, Sleep, Voice Boost, Bookmarks, Volume, Close */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Speed Pill Toggle */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSpeedMenu(!showSpeedMenu);
                  setShowSleepMenu(false);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-black text-gray-200 border border-white/[0.08] transition-colors cursor-pointer"
                title="Скорость речи"
              >
                {playbackRate}x
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-12 right-0 bg-[#0F1420] border border-white/10 rounded-2xl p-2 shadow-2xl flex flex-col gap-1 z-50">
                  <span className="text-[10px] font-black text-gray-400 px-2 py-1 uppercase tracking-wider">Скорость</span>
                  {speedOptions.map((rate) => (
                    <button
                      key={rate}
                      onClick={() => {
                        setRate(rate);
                        setShowSpeedMenu(false);
                      }}
                      className={`text-xs px-3 py-1.5 rounded-lg text-left transition-colors font-bold cursor-pointer ${
                        playbackRate === rate ? "bg-[#F59E0B] text-[#06080D]" : "text-gray-300 hover:bg-white/10"
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sleep Timer with "End of Chapter" & Fade Out */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => {
                  setShowSleepMenu(!showSleepMenu);
                  setShowSpeedMenu(false);
                }}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  sleepMode !== null
                    ? "bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B]"
                    : "bg-white/[0.05] border-white/[0.08] text-gray-300 hover:text-white"
                }`}
                title={sleepMode === "chapter" ? "Сон: в конце главы" : sleepTimer ? `Сон: ${sleepTimer}м` : "Таймер сна"}
              >
                <Moon className="w-4 h-4" />
              </button>

              {showSleepMenu && (
                <div className="absolute bottom-12 right-0 bg-[#0F1420] border border-white/10 rounded-2xl p-2.5 shadow-2xl flex flex-col gap-1 z-50 min-w-[170px]">
                  <span className="text-[10px] font-black text-gray-400 px-2 py-1 uppercase tracking-wider">Таймер сна (с затуханием)</span>
                  <button
                    onClick={() => { setSleep(null); setShowSleepMenu(false); }}
                    className={`text-xs px-3 py-1.5 rounded-lg text-left font-bold cursor-pointer ${
                      sleepMode === null ? "bg-[#F59E0B] text-[#06080D]" : "text-gray-300 hover:bg-white/10"
                    }`}
                  >
                    Выключен
                  </button>
                  <button
                    onClick={() => { setSleep(null, "chapter"); setShowSleepMenu(false); }}
                    className={`text-xs px-3 py-1.5 rounded-lg text-left font-bold cursor-pointer flex items-center justify-between ${
                      sleepMode === "chapter" ? "bg-[#F59E0B] text-[#06080D]" : "text-[#F59E0B] hover:bg-white/10"
                    }`}
                  >
                    <span>До конца главы 🌙</span>
                  </button>
                  {[15, 30, 45, 60].map((min) => (
                    <button
                      key={min}
                      onClick={() => { setSleep(min, "minutes"); setShowSleepMenu(false); }}
                      className={`text-xs px-3 py-1.5 rounded-lg text-left font-bold cursor-pointer ${
                        sleepMode === "minutes" && sleepTimer === min ? "bg-[#F59E0B] text-[#06080D]" : "text-gray-300 hover:bg-white/10"
                      }`}
                    >
                      {min} минут
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Voice Clarity Boost Button */}
            <button
              onClick={toggleVoiceBoost}
              className={`p-2 rounded-xl border transition-all cursor-pointer hidden md:flex items-center gap-1 text-[11px] font-bold ${
                isVoiceBoost
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-sm shadow-emerald-500/20"
                  : "bg-white/[0.05] border-white/[0.08] text-gray-400 hover:text-white"
              }`}
              title="Режим «Чёткий голос» — усиление частот речи для прослушивания в шумных местах"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{isVoiceBoost ? "Голос +" : "Четкость"}</span>
            </button>

            {/* Bookmark Current Moment Button */}
            <button
              onClick={handleAddBookmark}
              className={`p-2 rounded-xl border transition-colors cursor-pointer relative ${
                bookmarkSaved
                  ? "bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B]"
                  : "bg-white/[0.05] border-white/[0.08] text-gray-400 hover:text-white"
              }`}
              title="Поставить закладку на этом моменте"
            >
              {bookmarkSaved ? <Check className="w-4 h-4 text-emerald-400" /> : <Bookmark className="w-4 h-4" />}
              {bookmarkSaved && (
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-0.5 rounded shadow whitespace-nowrap">
                  Сохранено!
                </span>
              )}
            </button>

            {/* Share Timestamp Link */}
            <button
              onClick={handleShareTimestamp}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-gray-400 hover:text-white border border-white/[0.08] transition-colors relative cursor-pointer hidden sm:block"
              title="Поделиться моментом с точной секундой"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              {copiedLink && (
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-0.5 rounded shadow whitespace-nowrap">
                  Ссылка скопирована!
                </span>
              )}
            </button>

            {/* Download Current MP3 Track */}
            <a
              href={currentChapter.audioUrl}
              download={`${currentBook.title} - ${currentChapter.title}.mp3`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-gray-400 hover:text-white border border-white/[0.08] transition-colors cursor-pointer hidden lg:block"
              title="Скачать MP3 файл текущей главы"
            >
              <Download className="w-4 h-4" />
            </a>

            {/* Volume Control */}
            <div className="hidden md:flex items-center gap-1.5">
              <button
                onClick={toggleMute}
                className="p-1.5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                title={isMuted ? "Включить звук (M)" : "Выключить звук (M)"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>

              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => setVol(Number(e.target.value))}
                className="w-16 h-1 bg-white/10 rounded cursor-pointer accent-[#F59E0B]"
              />
            </div>

            {/* Chapters / Tracklist Link */}
            <Link
              href={`/book/${currentBook.id}`}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-gray-300 hover:text-white border border-white/[0.08] transition-colors"
              title="Список всех глав"
            >
              <ListMusic className="w-4 h-4" />
            </Link>

            {/* Close / Dismiss Player Button */}
            <button
              onClick={closePlayer}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-white/[0.08] hover:border-red-500/30 transition-all cursor-pointer ml-0.5"
              title="Закрыть плеер"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
