"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldAlert, Mail, CheckCircle2, FileText } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { reachMetrikaGoal } from "@/components/YandexMetrika";

export default function CopyrightPage() {
  const [submitted, setSubmitted] = useState(false);
  const [bookTitle, setBookTitle] = useState("");
  const [email, setEmail] = useState("");
  const [proof, setProof] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    reachMetrikaGoal("dmca_claim_submitted", { bookTitle });
    setSubmitted(true);
  };

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
              Юридический раздел
            </span>
            <h1 className="font-serif text-3xl sm:text-5xl font-bold text-white mt-3">
              Правообладателям (DMCA / ст. 1253.1 ГК РФ)
            </h1>
            <p className="text-gray-400 text-sm mt-2">
              Регламент взаимодействия с авторами, издательствами и владельцами исключительных прав.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#0F1420]/80 border border-white/10 space-y-4 text-sm text-gray-300 leading-relaxed">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[#F59E0B]" />
              Статус информационного посредника
            </h3>
            <p>
              Проект <b>«Аудиотека PRO»</b> действует строго в соответствии со <b>статьей 1253.1 Гражданского кодекса Российской Федерации</b> («Особенности ответственности информационного посредника»).
            </p>
            <p>
              Сервис функционирует как поисково-каталогизационная витрина. Все ссылки на аудиопотоки индексируются автоматическими сетевыми краулерами из общедоступных открытых библиотек и архивных серверов сети Интернет. Сервис самостоятельно не занимается производством аудиозаписей и не хранит аудиоматериалы на закрытых серверах.
            </p>
            <p>
              Администрация сервиса безоговорочно уважает интеллектуальную собственность и авторские права писателей, переводчиков, чтецов и издательств.
            </p>
          </div>

          <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
            <h3 className="font-serif text-2xl font-bold text-white">
              Процедура удаления контента (Notice and Takedown)
            </h3>
            <p>
              Если вы являетесь обладателем исключительных прав на литературное или аудиовизуальное произведение (включая права на фонограмму) и ваши права нарушаются размещением ссылки в каталоге, направьте уведомление администрации сервиса.
            </p>
            <p>
              При получении обоснованного обращения мы обязуемся <b>в течение 24 часов заблокировать отображение карточки произведения и удалить ссылки из поисковой выдачи</b> сервиса.
            </p>
          </div>

          {/* Form */}
          <div className="p-8 rounded-3xl bg-[#0F1420] border border-white/15 space-y-6">
            <h3 className="font-serif text-2xl font-bold text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#F59E0B]" />
              Форма подачи заявления правообладателя
            </h3>

            {submitted ? (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-white">Заявление успешно принято в обработку</h4>
                  <p className="text-xs text-gray-300 mt-1">
                    Материал будет проверен юридической службой в течение 24 часов. Подтверждение отправлено на указанный email.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Название книги или ссылка на страницу:</label>
                  <input
                    type="text"
                    required
                    value={bookTitle}
                    onChange={(e) => setBookTitle(e.target.value)}
                    placeholder="Например: Метро 2033 (Дмитрий Глуховский)"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Контактный email правообладателя / представителя:</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="audioteka.ru@yandex.ru"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Документ или подтверждение исключительных прав:</label>
                  <textarea
                    rows={4}
                    required
                    value={proof}
                    onChange={(e) => setProof(e.target.value)}
                    placeholder="Укажите номер договора, свидетельства РАО/РСП или ссылку на официальный реестр..."
                    className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>

                <button
                  type="submit"
                  className="px-8 py-3.5 rounded-xl bg-[#F59E0B] hover:bg-[#EA580C] text-[#06080D] font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-[#F59E0B]/20"
                >
                  Направить официальное уведомление
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
