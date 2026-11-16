"use client";

import React from "react";
import { Headphones, Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import type { Audiobook } from "@/lib/types";

function formatTime(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
}

export default function LitresAudioPlayer({ book }: { book: Audiobook }) {
  const { currentBook, isPlaying, currentTime, duration, playbackError, playBook, togglePlay, seek, skipTime } = usePlayer();
  const active = currentBook?.id === book.id;
  const time = active ? currentTime : 0;
  const length = active ? duration : 0;

  const handlePlay = () => {
    if (active) togglePlay();
    else playBook(book, 0);
  };
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F59E0B]/15 text-[#F59E0B]"><Headphones className="h-5 w-5" aria-hidden="true" /></span>
        <div><p className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">Аудиофрагмент</p><p className="mt-1 text-sm text-gray-400">{active && isPlaying ? "Воспроизводится" : "Готов к прослушиванию"}</p></div>
      </div>
      <div>
        <input type="range" min={0} max={length || 0} step="0.1" value={Math.min(time, length || 0)} onChange={e => seek(Number(e.target.value))} disabled={!active || !length} aria-label="Перемотка фрагмента" className="h-2 w-full accent-[#F59E0B]" />
        <div className="mt-2 flex justify-between font-mono text-xs text-gray-400"><span>{formatTime(time)}</span><span>{length ? formatTime(length) : "—:—"}</span></div>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => active && skipTime(-15)} disabled={!active} aria-label="Назад на 15 секунд" className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-gray-300 disabled:opacity-40"><RotateCcw className="h-4 w-4" /></button>
        <button type="button" onClick={handlePlay} className="flex min-h-[44px] items-center gap-2 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#EA580C] px-5 text-sm font-bold text-[#0B0E16] disabled:opacity-50">{active && isPlaying ? <><Pause className="h-4 w-4 fill-current" />Пауза</> : <><Play className="h-4 w-4 fill-current" />Слушать фрагмент</>}</button>
        <button type="button" onClick={() => active && skipTime(15)} disabled={!active} aria-label="Вперёд на 15 секунд" className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-gray-300 disabled:opacity-40"><RotateCw className="h-4 w-4" /></button>
      </div>
      {playbackError && <p role="alert" className="text-sm text-red-400">{playbackError}</p>}
    </div>
  );
}
