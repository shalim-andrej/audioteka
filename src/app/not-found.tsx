"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Headphones, ArrowLeft, Compass, Search } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FavoritesDrawer from "@/components/FavoritesDrawer";

export default function NotFound() {
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#06080D] text-white flex flex-col justify-between">
      <Header onOpenFavorites={() => setIsFavoritesOpen(true)} />
      <FavoritesDrawer isOpen={isFavoritesOpen} onClose={() => setIsFavoritesOpen(false)} allBooks={[]} />

      <main className="max-w-2xl mx-auto px-4 py-20 text-center space-y-6 flex-1 flex flex-col items-center justify-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#F59E0B] to-[#EA580C] flex items-center justify-center text-[#06080D] shadow-2xl shadow-[#F59E0B]/30 mx-auto">
          <Headphones className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-black uppercase tracking-widest text-[#F59E0B] px-3 py-1 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/20">
            Ошибка 404
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-white tracking-tight">
            Аудиокнига не найдена
          </h1>
          <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed pt-1">
            Возможно, ссылка устарела или произведение было временно снято с публикации по требованию правообладателя (ст. 1253.1 ГК РФ).
          </p>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#EA580C] text-[#06080D] font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#F59E0B]/20"
          >
            <Compass className="w-4 h-4" />
            <span>Перейти в каталог</span>
          </Link>

          <Link
            href="/faq"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 font-bold text-xs uppercase tracking-wider transition-all"
          >
            Вопросы и ответы (FAQ)
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
