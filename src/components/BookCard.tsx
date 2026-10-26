"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Pause, Heart, Star, Clock, Headphones } from "lucide-react";
import { Audiobook } from "@/lib/types";
import { usePlayer } from "@/context/PlayerContext";

interface BookCardProps {
  book: Audiobook;
}

export default function BookCard({ book }: BookCardProps) {
  const { currentBook, isPlaying, playBook, togglePlay, toggleFavorite, isFavorite } = usePlayer();
  const isThisBookPlaying = currentBook?.id === book.id && isPlaying;
  const isFav = isFavorite(book.id);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentBook?.id === book.id) {
      togglePlay();
    } else {
      playBook(book, 0);
    }
  };

  const handleFavClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(book.id);
  };

  return (
    <div className="group relative glass-panel glass-panel-hover rounded-2xl overflow-hidden transition-all duration-300 flex flex-col">
      {/* Cover Media Container */}
      <Link href={`/book/${book.id}`} className="block relative w-full aspect-[2/3] overflow-hidden bg-gray-950">
        <img
          src={book.coverUrl}
          alt={book.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
        />

        {/* Ambient Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

        {/* Top Floating Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          <span className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg text-[11px] font-bold text-[#F59E0B] border border-white/10 shadow-sm">
            <Star className="w-3 h-3 fill-[#F59E0B]" />
            {book.rating}
          </span>

          <span className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-semibold text-gray-300 border border-white/10 shadow-sm">
            <Clock className="w-2.5 h-2.5 text-gray-400" />
            {book.durationFormatted.split(" ")[0]} ч
          </span>
        </div>

        {/* Heart Favorite Toggle Button */}
        <button
          onClick={handleFavClick}
          className="absolute top-2.5 right-2.5 p-2 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md text-white border border-white/10 transition-transform active:scale-90"
          title={isFav ? "Удалить из полки" : "Добавить в полку"}
        >
          <Heart className={`w-3.5 h-3.5 transition-colors ${isFav ? "fill-[#EF4444] text-[#EF4444]" : "text-white"}`} />
        </button>

        {/* Quick Play/Pause Center Action */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/35 backdrop-blur-[2px]">
          <button
            onClick={handlePlayClick}
            className="w-13 h-13 rounded-full bg-gradient-to-tr from-[#F59E0B] to-[#EA580C] flex items-center justify-center text-[#06080D] shadow-xl shadow-[#F59E0B]/30 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
            title={isThisBookPlaying ? "Пауза" : "Слушать"}
          >
            {isThisBookPlaying ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current translate-x-0.5" />
            )}
          </button>
        </div>

        {/* Animated Soundwave pill when playing */}
        {isThisBookPlaying && (
          <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-[#F59E0B] text-[#06080D] text-[10px] font-black uppercase py-1 px-2.5 rounded-lg text-center backdrop-blur-sm flex items-center justify-center gap-2 shadow-lg">
            <Headphones className="w-3.5 h-3.5" />
            <span>Сейчас играет</span>
          </div>
        )}
      </Link>

      {/* Book Metadata Info */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
            {book.genre.split("&")[0].trim()}
          </span>

          <Link href={`/book/${book.id}`} className="block">
            <h3
              className="font-serif text-lg font-bold text-white group-hover:text-[#F59E0B] transition-colors line-clamp-1 leading-snug"
              title={book.title}
            >
              {book.title}
            </h3>
          </Link>

          <p className="text-xs text-[#F59E0B] font-semibold mt-0.5 line-clamp-1">
            {book.author}
          </p>
        </div>

        <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-gray-400">
          <span className="truncate max-w-[140px] font-medium text-gray-300" title={`Чтец: ${book.narrator}`}>
            🎙️ {book.narrator}
          </span>
          <span className="text-gray-400 font-mono text-[10px] font-bold">
            ⏱ {book.durationFormatted}
          </span>
        </div>
      </div>
    </div>
  );
}
