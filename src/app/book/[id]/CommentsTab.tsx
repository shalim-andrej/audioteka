// src/app/book/[id]/CommentsTab.tsx
// КЛИЕНТСКИЙ ОСТРОВОК: отзывы. Грузится и гидрируется только когда
// открыта вкладка «Отзывы» (?tab=comments). На обычном просмотре книги
// этого кода в браузере нет.
"use client";

import React, { useState } from "react";
import { MessageSquare, Star, ThumbsUp, ShieldAlert } from "lucide-react";
import type { Comment } from "@/lib/types";

export default function CommentsTab({ initialComments }: { initialComments: Comment[] }) {
  const [commentList, setCommentList] = useState<Comment[]>(initialComments);
  const [newCommentText, setNewCommentText] = useState("");
  const [newCommentAuthor, setNewCommentAuthor] = useState("");
  const [newCommentRating, setNewCommentRating] = useState(10);
  const [newCommentSpoiler, setNewCommentSpoiler] = useState(false);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<string, boolean>>({});

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const newC: Comment = {
      id: "c-" + Date.now(),
      user: newCommentAuthor.trim() || "Слушатель PRO",
      avatar: (newCommentAuthor.trim() || "СП").slice(0, 2).toUpperCase(),
      date: "Сегодня в " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      rating: newCommentRating,
      text: newCommentText.trim(),
      likes: 1,
      isSpoiler: newCommentSpoiler,
    };

    setCommentList([newC, ...commentList]);
    setNewCommentText("");
    setNewCommentSpoiler(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-2xl font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#F59E0B]" />
          Отзывы и комментарии ({commentList.length})
        </h3>
        <span className="text-xs text-gray-400">Обсуждение слушателей</span>
      </div>

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

      <div className="space-y-3">
        {commentList.map((comm) => {
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
                  onClick={() => setRevealedSpoilers((prev) => ({ ...prev, [comm.id]: true }))}
                  className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between cursor-pointer hover:bg-amber-500/20 transition-all"
                >
                  <span className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    Этот комментарий помечен как спойлер. Нажмите, чтобы прочитать.
                  </span>
                  <span className="underline font-bold text-[11px]">Показать</span>
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">{comm.text}</p>
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
  );
}
