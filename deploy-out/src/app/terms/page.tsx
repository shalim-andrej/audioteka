"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Shield, Scale, FileText, CheckCircle2, AlertTriangle, Mail } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function TermsPage() {
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
              Правовая база РФ
            </span>
            <h1 className="font-serif text-3xl sm:text-5xl font-bold text-white mt-3">
              Пользовательское соглашение
            </h1>
            <p className="text-gray-400 text-sm mt-2">
              Редакция от 26 октября 2026 года • Сервис «Аудиотека PRO» (audioteka-pro.ru)
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#0F1420]/70 border border-white/10 space-y-4 text-xs sm:text-sm text-gray-300 leading-relaxed">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-[#F59E0B]" />
              1. Статус информационного посредника (ст. 1253.1 ГК РФ)
            </h2>
            <p>
              1.1. Веб-платформа «Аудиотека PRO» (доступная по адресу <b>audioteka-pro.ru</b> и в мобильном приложении) выступает исключительно в качестве <b>некоммерческого информационного посредника</b> в соответствии со статьёй 1253.1 Гражданского кодекса Российской Федерации.
            </p>
            <p>
              1.2. Администрация сервиса не осуществляет первичное создание или загрузку аудиофайлов на собственные серверы. Аудиопотоки и метаданные агрегируются автоматически из открытых общедоступных сетевых источников и цифровых архивов сети Интернет.
            </p>
            <p>
              1.3. Сервис не вносит изменений в аудиоматериалы после их публикации в открытых источниках и не осуществляет платную продажу аудиокниг.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#0F1420]/70 border border-white/10 space-y-4 text-xs sm:text-sm text-gray-300 leading-relaxed">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              2. Ознакомительный характер использования
            </h2>
            <p>
              2.1. Все аудиокниги, размещённые на сайте, предоставляются пользователям <b>исключительно в ознакомительных, культурно-просветительских и учебных целях</b> для личного некоммерческого прослушивания.
            </p>
            <p>
              2.2. Любое коммерческое использование, тиражирование, продажа, ретрансляция или использование аудиоматериалов в предпринимательской деятельности без письменного согласия законных правообладателей строго запрещены.
            </p>
            <p>
              2.3. Сервис рекомендует пользователям приобретать лицензионные копии книг и поддерживать авторов и чтецов на официальных издательских платформах.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#0F1420]/70 border border-white/10 space-y-4 text-xs sm:text-sm text-gray-300 leading-relaxed">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-400" />
              3. Регламент защиты прав авторов и удаления за 24 часа
            </h2>
            <p>
              3.1. В полном соответствии с п. 3 ст. 1253.1 ГК РФ, администрация сервиса незамедлительно принимает меры по пресечению нарушений интеллектуальных прав при получении мотивированного заявления от правообладателя или его уполномоченного представителя.
            </p>
            <p>
              3.2. Официальный адрес электронной почты для направления заявлений правообладателей:
              <br />
              <a href="mailto:audioteka.ru@yandex.ru" className="text-[#F59E0B] font-bold font-mono text-sm underline pt-1 inline-block">
                audioteka.ru@yandex.ru
              </a>
            </p>
            <p>
              3.3. Также обращение может быть отправлено через специальную онлайн-форму на странице <Link href="/copyright" className="text-[#F59E0B] underline font-bold">Правообладателям (DMCA)</Link>.
            </p>
            <p>
              3.4. Срок рассмотрения заявления и прекращения доступа к спорному материалу составляет <b>не более 24 часов</b> с момента получения подтверждающих документов.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#0F1420]/70 border border-white/10 space-y-3 text-xs sm:text-sm text-gray-400 leading-relaxed">
            <h2 className="text-sm sm:text-base font-bold text-white">4. Контактная информация</h2>
            <p>
              По общим вопросам, сотрудничеству и предложениям: <b className="text-white">audioteka.ru@yandex.ru</b>
            </p>
            <p>
              Официальный сайт проекта: <b className="text-[#F59E0B]">https://audioteka-pro.ru</b>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
