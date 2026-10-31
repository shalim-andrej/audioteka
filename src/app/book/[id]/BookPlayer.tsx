// src/app/book/[id]/BookPlayer.tsx
// КЛИЕНТСКИЕ ОСТРОВКИ, связанные с плеером:
//   BookPlayerPanel — кнопка play, прогресс, скорость, таймер сна
//   ChapterQuickList — четыре главы в блоке «О книге»
//   ChaptersTab — полное оглавление с поиском
//
// ВАЖНО: в браузер передаётся НЕ вся книга, а облегчённый объект PlayableBook
// без массива глав. Главы PlayerContext подтянет сам через /api/audiobooks/<id>
// в момент нажатия play. Именно лишний массив глав (до 363 записей) и раздувал
// клиентский код страницы.
"use client";

import React, { useState } from "react";
import { Play, Pause, RotateCcw, RotateCw, Clock, Radio, Headphones, Download } from "lucide-react";
import type { Audiobook } from "@/lib/types";
import { usePlayer } from "@/context/PlayerContext";

/** Облегчённая книга: всё нужное для запуска воспроизведения, без глав. */
export type PlayableBook = {
  id: string;
  title: string;
  author: string;
  narrator: string;
  coverUrl?: string;
  listenUrl?: string;
  chapters: [];
};

export type SlimChapter = {
  id: string;
  num?: string;
  title: string;
  durationFormatted: string;
  startTime?: number;
  audioUrl: string;
};

function formatSec(sec: number) {
  if (!sec || isNaN(sec)) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export function BookPlayerPanel({
  book,
  firstChapterTitle,
  chaptersCount,
  durationFormatted,
}: {
  book: PlayableBook;
  firstChapterTitle: string;
  chaptersCount: number;
  durationFormatted: string;
}) {
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
    sleepTimer,
    setSleep,
  } = usePlayer();

  const isThisBookActive = currentBook?.id === book.id;
  const isThisBookPlaying = isThisBookActive && isPlaying;

  /*
   * playBook ждёт Audiobook, а здесь облегчённый объект без глав.
   * PlayerContext увидит пустой chapters и сам загрузит полную книгу
   * из /api/audiobooks/<id> перед стартом. Приведение типа безопасно:
   * недостающее поле догружается внутри playBook.
   */
  const start = (chapterIndex = 0, startTime?: number) =>
    playBook(book as unknown as Audiobook, chapterIndex, startTime);

  return (
    <div className="p-6 rounded-3xl bg-gradient-to-b from-[#131A29] to-[#0A0E17] border border-white/15 shadow-2xl relative overflow-hidden">
      {/* blur-3xl убран: размытие 320 px ощутимо грузит отрисовку на слабых машинах */}
      <div className="relative z-10 space-y-5">
        <div className="flex items-center justify-between">
          <div className="min-w-0 pr-4">
            <span className="text-[10px] uppercase tracking-wider text-[#F59E0B] font-black flex items-center gap-1.5 mb-1">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              {isThisBookActive
                ? `Сейчас играет трек ${(currentChapterIndex ?? 0) + 1} из ${chaptersCount}`
                : "Готово к прослушиванию"}
            </span>
            <h3 className="text-base sm:text-lg font-bold text-white truncate">
              {isThisBookActive && currentBook?.chapters[currentChapterIndex ?? 0]?.title
                ? currentBook.chapters[currentChapterIndex ?? 0].title
                : firstChapterTitle}
            </h3>
          </div>

          {sleepTimer !== null && (
            <div className="bg-[#F59E0B]/20 border border-[#F59E0B]/40 px-3 py-1 rounded-full text-xs font-bold text-[#F59E0B] flex items-center gap-1.5 flex-shrink-0">
              <Clock className="w-3.5 h-3.5" />
              <span>Сон: {sleepTimer}м</span>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <div
            className="relative w-full h-2.5 bg-white/10 rounded-full overflow-hidden cursor-pointer group"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const percent = (e.clientX - rect.left) / rect.width;
              if (duration) seek(percent * duration);
            }}
          >
            <div
              className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-[#F59E0B] via-[#EA580C] to-[#F59E0B] rounded-full transition-all duration-100"
              style={{ width: isThisBookActive && duration ? `${(currentTime / duration) * 100}%` : "0%" }}
            />
          </div>
          <div className="flex justify-between text-xs font-mono text-gray-400">
            <span>{isThisBookActive ? formatSec(currentTime) : "00:00"}</span>
            <span>{isThisBookActive && duration ? formatSec(duration) : durationFormatted}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { if (isThisBookActive) skipTime(-15); }}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
              title="Перемотка назад на 15 сек"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => { if (isThisBookActive) togglePlay(); else start(0); }}
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
              onClick={() => { if (isThisBookActive) skipTime(15); }}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
              title="Перемотка вперед на 15 сек"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
              {[0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                <button
                  key={rate}
                  onClick={() => setRate(rate)}
                  className={`px-2 py-1 rounded-lg font-bold transition-all ${
                    playbackRate === rate ? "bg-[#F59E0B] text-[#06080D]" : "text-gray-400 hover:text-white"
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
              <span className="text-[10px] text-gray-400 px-1 font-bold">Сон:</span>
              {[null, 15, 30, 45, 60].map((min) => (
                <button
                  key={min ?? "off"}
                  onClick={() => setSleep(min)}
                  className={`px-2 py-1 rounded-lg font-bold transition-all ${
                    sleepTimer === min ? "bg-[#F59E0B] text-[#06080D]" : "text-gray-400 hover:text-white"
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
  );
}

export function ChapterQuickList({
  book,
  chapters,
}: {
  book: PlayableBook;
  chapters: SlimChapter[];
}) {
  const { playBook } = usePlayer();
  const start = (chapterIndex: number, startTime?: number) =>
    playBook(book as unknown as Audiobook, chapterIndex, startTime);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {chapters.map((ch, idx) => (
        <div
          key={ch.id}
          onClick={() => start(idx, ch.startTime)}
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
  );
}

export function ChaptersTab({
  book,
  chapters,
  durationFormatted,
}: {
  book: PlayableBook;
  chapters: SlimChapter[];
  durationFormatted: string;
}) {
  const [chapterSearch, setChapterSearch] = useState("");
  const { currentBook, currentChapterIndex, isPlaying, playBook, togglePlay } = usePlayer();

  const isThisBookActive = currentBook?.id === book.id;
  const query = chapterSearch.trim().toLowerCase();
  const visible = chapters
    .map((ch, idx) => ({ ch, idx }))
    .filter(({ ch }) => !query || ch.title.toLowerCase().includes(query));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-2xl font-bold text-white flex items-center gap-2">
            <Headphones className="w-5 h-5 text-[#F59E0B]" />
            Оглавление ({chapters.length} глав)
          </h3>
          <p className="text-xs text-gray-400">Общее время: {durationFormatted} • Студийная запись</p>
        </div>

        {chapters.length > 8 && (
          <input
            type="text"
            value={chapterSearch}
            onChange={(e) => setChapterSearch(e.target.value)}
            placeholder="Быстрый поиск главы..."
            className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-xs outline-none focus:border-[#F59E0B] w-full sm:w-56"
          />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[560px] overflow-y-auto pr-1">
        {visible.map(({ ch, idx }) => {
          const isCurrentChapter = isThisBookActive && currentChapterIndex === idx;

          return (
            <div
              key={ch.id}
              onClick={() => {
                if (isCurrentChapter) togglePlay();
                else playBook(book as unknown as Audiobook, idx, ch.startTime);
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
                    isCurrentChapter ? "bg-[#F59E0B] text-[#06080D]" : "bg-white/[0.06] text-gray-400"
                  }`}
                >
                  {isCurrentChapter && isPlaying ? (
                    <Pause className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
                  )}
                </div>

                <div className="min-w-0">
                  <p className={`text-xs font-semibold truncate ${isCurrentChapter ? "text-[#F59E0B]" : "text-white"}`}>
                    {ch.title}
                  </p>
                  <span className="text-[10px] text-gray-500 block font-mono">
                    Часть {ch.num || idx + 1}
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
  );
}
