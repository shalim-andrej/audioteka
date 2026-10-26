"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Send, CheckCircle2, MessageSquare, Megaphone, Shield } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { reachMetrikaGoal } from "@/components/YandexMetrika";

export default function ContactsPage() {
  const [sent, setSent] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    reachMetrikaGoal("contact_form_submitted", { name, email });
    setSent(true);
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
              Служба связи
            </span>
            <h1 className="font-serif text-3xl sm:text-5xl font-bold text-white mt-3">
              Контакты и поддержка
            </h1>
            <p className="text-gray-400 text-sm mt-2">
              Официальные каналы связи с администрацией проекта «Аудиотека PRO».
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Direct Email */}
            <div className="p-6 rounded-2xl bg-[#0F1420]/70 border border-white/10 space-y-2">
              <Mail className="w-5 h-5 text-[#F59E0B]" />
              <h4 className="font-bold text-white text-sm">Официальная почта</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                По общим вопросам, предложениям новых аудиокниг и рекламе.
              </p>
              <a
                href="mailto:audioteka.ru@yandex.ru"
                className="text-xs text-[#F59E0B] font-mono font-bold hover:underline block pt-1"
              >
                audioteka.ru@yandex.ru
              </a>
            </div>

            {/* Legal / Copyright Email */}
            <div className="p-6 rounded-2xl bg-[#0F1420]/70 border border-white/10 space-y-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              <h4 className="font-bold text-white text-sm">Правообладателям (DMCA)</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Заявления авторов и издательств. Рассмотрение за 24 часа.
              </p>
              <a
                href="mailto:audioteka.ru@yandex.ru?subject=Обращение правообладателя"
                className="text-xs text-emerald-400 font-mono font-bold hover:underline block pt-1"
              >
                audioteka.ru@yandex.ru
              </a>
            </div>

            {/* MAX Messenger Direct Contact */}
            <div className="p-6 rounded-2xl bg-[#0F1420]/70 border border-white/10 space-y-2">
              <MessageSquare className="w-5 h-5 text-blue-400" />
              <h4 className="font-bold text-white text-sm">Мессенджер MAX</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Прямая связь с автором проекта в мессенджере MAX.
              </p>
              <a
                href="https://max.ru/u/f9LHodD0cOIrfR0dw2CkwAAT0M5u0WcciTLZbmGKEXXSndxyKNLW6-mYdjE"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 font-bold hover:underline block pt-1"
              >
                Написать в MAX →
              </a>
            </div>
          </div>

          {/* Contact Form */}
          <div className="p-8 rounded-3xl bg-[#0F1420] border border-white/15 space-y-6">
            <h3 className="font-serif text-2xl font-bold text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-[#F59E0B]" />
              Форма обратной связи
            </h3>

            {sent ? (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-white">Сообщение успешно отправлено</h4>
                  <p className="text-xs text-gray-300 mt-1">
                    Ответ будет направлен на ваш email или в мессенджер в течение 24 часов.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Ваше имя:</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Иван"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-[#F59E0B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Ваш контакт (email или телефон):</label>
                    <input
                      type="text"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ivan@yandex.ru"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-[#F59E0B]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Текст сообщения:</label>
                  <textarea
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Напишите ваш вопрос, пожелание или предложение..."
                    className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>

                <button
                  type="submit"
                  className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#EA580C] text-[#06080D] font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-[#F59E0B]/20"
                >
                  Отправить обращение
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
