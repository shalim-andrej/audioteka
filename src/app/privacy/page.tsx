"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Lock, Eye, Server, Mail } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function PrivacyPage() {
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
            <span className="text-xs font-black uppercase tracking-widest text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              152-ФЗ РФ
            </span>
            <h1 className="font-serif text-3xl sm:text-5xl font-bold text-white mt-3">
              Политика конфиденциальности
            </h1>
            <p className="text-gray-400 text-sm mt-2">
              В отношении обработки персональных данных в соответствии с Федеральным законом РФ № 152-ФЗ
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#0F1420]/70 border border-white/10 space-y-4 text-xs sm:text-sm text-gray-300 leading-relaxed">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              1. Общие положения
            </h2>
            <p>
              1.1. Настоящая Политика конфиденциальности определяет порядок сбора, хранения и защиты персональных данных пользователей сервиса «Аудиотека PRO» (сайт <b>audioteka-pro.ru</b>) в соответствии с требованиями Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных».
            </p>
            <p>
              1.2. Использование сервиса означает безоговорочное согласие пользователя с настоящей Политикой и указанными в ней условиями обработки информации.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#0F1420]/70 border border-white/10 space-y-4 text-xs sm:text-sm text-gray-300 leading-relaxed">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-[#F59E0B]" />
              2. Файлы Cookie и аналитика (Яндекс Метрика)
            </h2>
            <p>
              2.1. Сайт использует технологию файлов Cookie (куки) и аналитический счётчик <b>Яндекс Метрика (№ 113789185)</b> для сбора обезличенных статистических данных: посещаемость страниц, источники переходов, тип устройства и разрешение экрана, клики и тепловые карты взаимодействия (Вебвизор).
            </p>
            <p>
              2.2. Сервис Яндекс Метрика функционирует в строгом соответствии с законодательством РФ, а собираемые данные хранятся на защищённых серверах ООО «ЯНДЕКС» на территории Российской Федерации.
            </p>
            <p>
              2.3. Пользователь может в любой момент отключить сохранение файлов Cookie в настройках своего интернет-браузера.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#0F1420]/70 border border-white/10 space-y-4 text-xs sm:text-sm text-gray-300 leading-relaxed">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-400" />
              3. Персональные данные при обратной связи
            </h2>
            <p>
              3.1. При добровольном заполнении форм обратной связи (на странице контактов или при направлении обращений правообладателей) сервис собирает минимально необходимые данные: имя и адрес электронной почты (email).
            </p>
            <p>
              3.2. Данные используются исключительно для ответа на запрос пользователя и никогда не передаются третьим лицам или рекламным агентствам.
            </p>
            <p>
              3.3. Пользователь имеет право в любой момент потребовать удаления своих персональных данных, направив письмо на официальную почту: <b className="text-white">audioteka.ru@yandex.ru</b>.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#0F1420]/70 border border-white/10 space-y-3 text-xs sm:text-sm text-gray-400 leading-relaxed">
            <h2 className="text-sm sm:text-base font-bold text-white">4. Контактная информация оператора</h2>
            <p>
              Официальная почта: <b className="text-[#F59E0B]">audioteka.ru@yandex.ru</b>
            </p>
            <p>
              Сайт сервиса: <b className="text-white">https://audioteka-pro.ru</b>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
