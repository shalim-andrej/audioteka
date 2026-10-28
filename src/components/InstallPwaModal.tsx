"use client";

import React, { useState, useEffect } from "react";
import { Download, X, CheckCircle2, Share, PlusSquare, ShieldCheck, Sparkles, Monitor, Smartphone, Apple, ExternalLink } from "lucide-react";
import { reachMetrikaGoal } from "@/components/YandexMetrika";

interface InstallPwaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InstallPwaModal({ isOpen, onClose }: InstallPwaModalProps) {
  const [hasNativePrompt, setHasNativePrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [deviceTab, setDeviceTab] = useState<"desktop" | "android" | "ios">("desktop");

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Проверка, запущено ли уже в режиме приложения
    const isRunningStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isRunningStandalone);

    // Авто-определение типа устройства пользователя
    const ua = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setDeviceTab("ios");
    } else if (/android/.test(ua)) {
      setDeviceTab("android");
    } else {
      setDeviceTab("desktop");
    }

    // Проверка наличия нативного промпта
    if ((window as any).__pwa_install_prompt) {
      setHasNativePrompt(true);
    }

    const onPromptAvailable = () => setHasNativePrompt(true);
    const onAppInstalled = () => {
      setInstalled(true);
      setHasNativePrompt(false);
      reachMetrikaGoal("pwa_installed");
    };

    window.addEventListener("pwa_prompt_available", onPromptAvailable);
    window.addEventListener("pwa_installed_event", onAppInstalled);

    return () => {
      window.removeEventListener("pwa_prompt_available", onPromptAvailable);
      window.removeEventListener("pwa_installed_event", onAppInstalled);
    };
  }, [isOpen]);

  const handleInstallClick = async () => {
    reachMetrikaGoal("pwa_install_click");

    const prompt = (window as any).__pwa_install_prompt;
    if (prompt) {
      try {
        await prompt.prompt();
        const { outcome } = await prompt.userChoice;
        if (outcome === "accepted") {
          setInstalled(true);
          (window as any).__pwa_install_prompt = null;
          setHasNativePrompt(false);
          setTimeout(onClose, 2500);
          return;
        }
      } catch (err) {
        console.warn("Prompt execution failed:", err);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#131C31] via-[#0E1524] to-[#080B11] border border-white/15 rounded-3xl p-5 sm:p-7 shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#F59E0B]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer z-10"
          aria-label="Закрыть"
        >
          <X className="w-5 h-5" />
        </button>

        {/* App Identity Banner */}
        <div className="flex items-center gap-4 mb-5 pr-8">
          <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-[#F59E0B]/40 shadow-xl shadow-[#F59E0B]/20 flex-shrink-0 bg-[#080B11]">
            <img
              src="/icon-192.png"
              alt="Иконка приложения Аудиотека PRO"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#F59E0B] flex items-center gap-1">
              <Sparkles className="w-3 h-3 fill-current" />
              Официальное приложение
            </span>
            <h3 className="text-xl font-bold text-white truncate">Аудиотека PRO</h3>
            <p className="text-xs text-gray-400">Быстрый запуск • Фоновый звук • Без рекламы</p>
          </div>
        </div>

        {/* Content */}
        {isStandalone || installed ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-lg font-bold text-white">Приложение установлено!</h4>
            <p className="text-xs text-gray-300 max-w-xs mx-auto">
              Ярлык «Аудиотека PRO» теперь доступен на вашем рабочем столе. Приятного прослушивания в фоне!
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Закрыть окно
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Quick Benefits */}
            <div className="grid grid-cols-2 gap-2 text-left">
              <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                <div className="text-xs font-bold text-white flex items-center gap-1.5 mb-1">
                  <span className="text-[#F59E0B]">🎧</span> Фоновый звук
                </div>
                <div className="text-[11px] text-gray-400 leading-tight">Играет при выключенном экране телефона</div>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                <div className="text-xs font-bold text-white flex items-center gap-1.5 mb-1">
                  <span className="text-[#F59E0B]">⚡️</span> В один клик
                </div>
                <div className="text-[11px] text-gray-400 leading-tight">Без браузерных рамок, как отдельная программа</div>
              </div>
            </div>

            {/* ONE-CLICK INSTALL BUTTON (IF NATIVE PROMPT IS AVAILABLE) */}
            {hasNativePrompt && (
              <button
                onClick={handleInstallClick}
                className="w-full py-3.5 px-5 bg-gradient-to-r from-[#F59E0B] via-[#EA580C] to-[#D97706] hover:brightness-110 text-[#06080D] font-extrabold text-sm uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-xl shadow-[#F59E0B]/25"
              >
                <Download className="w-5 h-5 stroke-[2.5]" />
                <span>Установить приложение на устройство</span>
              </button>
            )}

            {/* Device Switcher Tabs */}
            <div className="flex rounded-xl bg-black/50 p-1 border border-white/10">
              <button
                onClick={() => setDeviceTab("desktop")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  deviceTab === "desktop"
                    ? "bg-[#F59E0B] text-[#06080D] shadow-md"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Компьютер (ПК)</span>
              </button>
              <button
                onClick={() => setDeviceTab("android")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  deviceTab === "android"
                    ? "bg-[#F59E0B] text-[#06080D] shadow-md"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Android</span>
              </button>
              <button
                onClick={() => setDeviceTab("ios")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  deviceTab === "ios"
                    ? "bg-[#F59E0B] text-[#06080D] shadow-md"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Apple className="w-3.5 h-3.5" />
                <span>iPhone / iPad</span>
              </button>
            </div>

            {/* Tab 1: DESKTOP (ПК / Ноутбук) */}
            {deviceTab === "desktop" && (
              <div className="bg-black/50 border border-white/10 rounded-2xl p-4 space-y-3 text-xs">
                <div className="text-xs font-bold text-[#F59E0B] uppercase tracking-wide">
                  Как установить на компьютер (Windows / Mac):
                </div>
                <ol className="space-y-3 text-gray-300">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] font-bold flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      <b>В адресной строке браузера</b> (вверху справа, рядом со звёздочкой закладок) нажмите на иконку <b className="text-white">«Установить приложение»</b> (значок монитора со стрелкой или знак <b>⊕</b>).
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] font-bold flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      Или нажмите <b>меню браузера [⋮]</b> (три точки в правом верхнем углу) ➔ выберите <b className="text-white">«Установить приложение Аудиотека PRO...»</b>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] font-bold flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      Нажмите <b className="text-white">«Установить»</b>. Программа появится на рабочем столе и в меню «Пуск»!
                    </span>
                  </li>
                </ol>
              </div>
            )}

            {/* Tab 2: ANDROID */}
            {deviceTab === "android" && (
              <div className="bg-black/50 border border-white/10 rounded-2xl p-4 space-y-3 text-xs">
                <div className="text-xs font-bold text-[#F59E0B] uppercase tracking-wide">
                  Как установить на Android (Chrome / Яндекс Браузер):
                </div>
                <ol className="space-y-3 text-gray-300">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] font-bold flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      Нажмите на кнопку меню браузера <b className="text-white">[⋮] (три точки)</b> в правом верхнем или нижнем углу экрана.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] font-bold flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      Выберите пункт <b className="text-white">«Установить приложение»</b> или <b className="text-white">«Добавить на главный экран»</b>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] font-bold flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      Подтвердите установку. Иконка с золотыми наушниками появится на главном экране рядом со всеми играми и приложениями.
                    </span>
                  </li>
                </ol>
              </div>
            )}

            {/* Tab 3: iOS (iPhone / Safari) */}
            {deviceTab === "ios" && (
              <div className="bg-black/50 border border-white/10 rounded-2xl p-4 space-y-3 text-xs">
                <div className="text-xs font-bold text-[#F59E0B] uppercase tracking-wide">
                  Как установить на iPhone / iPad (Safari):
                </div>
                <ol className="space-y-3 text-gray-300">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] font-bold flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      Нажмите кнопку <b className="text-white">«Поделиться»</b> (квадрат со стрелкой <Share className="w-3.5 h-3.5 inline mx-1 text-blue-400" />) в нижней панели Safari.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] font-bold flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      Прокрутите список вниз и нажмите <b className="text-white">«На экран „Домой“»</b> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-[#F59E0B]" />.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] font-bold flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      Нажмите <b className="text-white">«Добавить»</b> в правом верхнем углу.
                    </span>
                  </li>
                </ol>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 px-3.5 py-2.5 rounded-xl">
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <span>Безопасно: PWA не запрашивает личные данные и не засоряет память.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
