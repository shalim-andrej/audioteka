"use client";

import React, { useState, useEffect } from "react";
import { Download, X, Smartphone, CheckCircle2, Share, PlusSquare, Sparkles, ShieldCheck } from "lucide-react";
import { reachMetrikaGoal } from "@/components/YandexMetrika";

interface InstallPwaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InstallPwaModal({ isOpen, onClose }: InstallPwaModalProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Проверка, установлено ли уже приложение
    if (typeof window !== "undefined") {
      const isRunningStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
      setIsStandalone(isRunningStandalone);

      // Проверка iOS
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
      setIsIos(isIosDevice);

      // Перехват нативного PWA события установки для Chrome / Edge / Android
      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstall);
      window.addEventListener("appinstalled", () => {
        setInstalled(true);
        reachMetrikaGoal("pwa_installed");
      });

      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    reachMetrikaGoal("pwa_install_click");
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setInstalled(true);
        setDeferredPrompt(null);
        setTimeout(onClose, 2000);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#111A2E] via-[#0E1524] to-[#080B11] border border-white/15 rounded-3xl p-6 shadow-2xl overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#F59E0B]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#F59E0B] to-[#EA580C] flex items-center justify-center text-[#06080D] shadow-lg shadow-[#F59E0B]/20">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#F59E0B] flex items-center gap-1">
              <Sparkles className="w-3 h-3 fill-current" />
              Мобильное приложение
            </span>
            <h3 className="text-lg font-bold text-white">Аудиотека PRO</h3>
          </div>
        </div>

        {isStandalone || installed ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h4 className="text-base font-bold text-white">Приложение уже установлено!</h4>
            <p className="text-xs text-gray-400 max-w-xs mx-auto">
              Вы используете нативное приложение «Аудиотека PRO». Приятного прослушивания!
            </p>
          </div>
        ) : isIos ? (
          // Инструкция для iPhone / iPad (Safari)
          <div className="space-y-4">
            <p className="text-xs text-gray-300 leading-relaxed">
              Установите веб-приложение на ваш iPhone или iPad без App Store за 3 простых шага:
            </p>

            <div className="space-y-2.5 bg-black/40 rounded-2xl p-4 border border-white/10 text-xs">
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] font-bold flex items-center justify-center text-[11px] flex-shrink-0 mt-0.5">
                  1
                </span>
                <span className="text-gray-300">
                  Нажмите кнопку <b className="text-white">«Поделиться»</b> <Share className="w-3.5 h-3.5 inline mx-1 text-blue-400" /> в нижней панели Safari.
                </span>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] font-bold flex items-center justify-center text-[11px] flex-shrink-0 mt-0.5">
                  2
                </span>
                <span className="text-gray-300">
                  Прокрутите меню вниз и выберите <b className="text-white">«На экран „Домой“»</b> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-[#F59E0B]" />.
                </span>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] font-bold flex items-center justify-center text-[11px] flex-shrink-0 mt-0.5">
                  3
                </span>
                <span className="text-gray-300">
                  Нажмите <b className="text-white">«Добавить»</b> в правом верхнем углу — готово!
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 px-3 py-2 rounded-xl">
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <span>Работает в фоновом режиме даже при выключенном экране!</span>
            </div>
          </div>
        ) : (
          // Android / Chrome / Edge / Yandex Browser
          <div className="space-y-4">
            <p className="text-xs text-gray-300 leading-relaxed">
              Установите официальное приложение «Аудиотека PRO» на ваше устройство для максимального комфорта:
            </p>

            <ul className="space-y-2 text-xs text-gray-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Быстрый запуск с рабочего стола без адресной строки</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Управление воспроизведением с экрана блокировки и смарт-часов</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Мгновенный доступ к закладкам и «Моей полке»</span>
              </li>
            </ul>

            <button
              onClick={handleInstallClick}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#F59E0B] to-[#EA580C] text-[#06080D] font-extrabold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer shadow-xl shadow-[#F59E0B]/25 mt-2"
            >
              <Download className="w-4 h-4" />
              <span>Установить приложение</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
