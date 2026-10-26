"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, HelpCircle, Headphones, ShieldCheck, Smartphone, Moon } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const FAQS = [
  {
    q: "Нужен ли VPN для прослушивания аудиокниг в России?",
    a: "Нет, абсолютно не нужен. Все аудиопотоки и обложки на сайте проксируются через наши отказоустойчивые сервера и работают напрямую у любых российских интернет-провайдеров и мобильных операторов (МТС, Билайн, Мегафон, Ростелеком, Tele2).",
  },
  {
    q: "Как слушать аудиокниги с заблокированного экрана или смарт-часов?",
    a: "Наш плеер полностью поддерживает стандарт MediaSession API. Когда вы запускаете любую главу, на экране блокировки вашего смартфона (iOS и Android), а также на умных часах и мультимедиа-системе автомобиля (CarPlay / Android Auto) появляется постер книги, название главы и кнопки быстрой перемотки ±15 секунд.",
  },
  {
    q: "Как работает таймер сна «До конца главы»?",
    a: "В меню таймера сна в плеере выберите пункт «Конец главы 🌙». Плеер доиграет текущую главу до последней фразы, а за 15–20 секунд до остановки плавно снизит громкость от 100% до нуля (эффект Fade Out), чтобы резкая тишина не разбудила вас.",
  },
  {
    q: "Можно ли скачать MP3 главу для прослушивания без интернета?",
    a: "Да. Рядом с каждой главой в оглавлении книги, а также на панели плеера есть кнопка со стрелкой «📥 Скачать MP3». Вы можете сохранить трек на флешку или в память телефона для поездок в метро или перелётов в самолёте.",
  },
  {
    q: "Что такое режим «Чёткий голос» (Voice Clarity Boost)?",
    a: "Это программный фильтр частот человеческой речи. Он мягко срезает низкочастотный гул и слегка поднимает диапазон 1–3 кГц, благодаря чему голос чтеца звучит чётко и разборчиво даже в шумном вагоне поезда или на ветреной улице.",
  },
  {
    q: "Сохраняется ли место остановки, если я закрою браузер?",
    a: "Да. Место остановки (глава и точная секунда) автоматически сохраняется в локальной памяти вашего устройства. Когда вы вернётесь на сайт, в самом верху шапки появится кнопка «Продолжить слушать» с названием книги и сохранённым временем.",
  },
];

export default function FaqPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-[#06080D] text-white flex flex-col justify-between">
      <Header onOpenFavorites={() => {}} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-[#F59E0B] mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Вернуться на главную
        </Link>

        <div className="space-y-8">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-[#F59E0B] px-3 py-1 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/20">
              База знаний
            </span>
            <h1 className="font-serif text-3xl sm:text-5xl font-bold text-white mt-3">
              Часто задаваемые вопросы (FAQ)
            </h1>
            <p className="text-gray-400 text-sm mt-2">
              Всё о возможностях плеера, качестве звука, оффлайн-доступе и управлении библиотекой.
            </p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openIdx === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-white/10 bg-[#0F1420]/70 overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenIdx(isOpen ? null : idx)}
                    className="w-full text-left p-5 flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-white hover:text-[#F59E0B] transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-[#F59E0B] transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-gray-300 leading-relaxed border-t border-white/[0.04]">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
