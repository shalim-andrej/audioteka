"use client";

import React, { useState, useEffect } from "react";
import { Download, X, CheckCircle2, Share, PlusSquare, ShieldCheck, Sparkles, HelpCircle, ArrowUpRight, Smartphone, Info } from "lucide-react";
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
  const [showManualGuide, setShowManualGuide] = useState(false);
  const [deviceTab, setDeviceTab] = useState<"android" | "ios">("android");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isRunningStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isRunningStandalone);

      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
      setIsIos(isIosDevice);
      setDeviceTab(isIosDevice ? "ios" : "android");

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
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          setInstalled(true);
          setDeferredPrompt(null);
          setTimeout(onClose, 2500);
          return;
        }
      } catch (err) {
        console.warn("PWA prompt error:", err);
      }
    }

    // Если нативный диалог недоступен браузером (Яндекс Браузер, Safari, ин-апп вебвью), показываем визуальную пошаговую инструкцию
    setShowManualGuide(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#131C31] via-[#0E1524] to-[#080B11] border border-white/15 rounded-3xl p-5 sm:p-6 shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#F59E0B]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer z-10"
          aria-label="Закрыть"
        >
          <X className="w-4 h-4" />
        </button>

        {/* App Identity Banner */}
        <div className="flex items-center gap-3.5 mb-5 pr-8">
          <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-[#F59E0B]/40 shadow-xl shadow-[#F59E0B]/20 flex-shrink-0 bg-[#080B11]">
            <img
              src="/icon-192.png"
              alt="Иконка приложения Аудиотека PRO"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#F59E0B] flex items-center gap-1">
              <Sparkles className="w-3 h-3 fill-current" />
              Официальное веб-приложение
            </span>
            <h3 className="text-lg font-bold text-white truncate">Аудиотека PRO</h3>
            <p className="text-[11px] text-gray-400">PWA • Без App Store и Google Play • 1 МБ</p>
          </div>
        </div>

        {/* Content */}
        {isStandalone || installed ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-white">Приложение установлено!</h4>
            <p className="text-xs text-gray-300 max-w-xs mx-auto">
              Иконка «Аудиотека PRO» теперь на вашем рабочем столе. Вы можете слушать аудиокниги в фоне при заблокированном экране.
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Quick Benefits */}
            <div className="grid grid-cols-2 gap-2 text-left">
              <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                <div className="text-[11px] font-bold text-white flex items-center gap-1.5 mb-0.5">
                  <span className="text-[#F59E0B]">🎧</span> Фоновый звук
                </div>
                <div className="text-[10px] text-gray-400">Играет с выключенным экраном</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                <div className="text-[11px] font-bold text-white flex items-center gap-1.5 mb-0.5">
                  <span className="text-[#F59E0B]">⚡️</span> Запуск в 1 клик
                </div>
                <div className="text-[10px] text-gray-400">Прямо с экрана «Домой»</div>
              </div>
            </div>

            {/* Device Switcher Tabs */}
            <div className="flex rounded-xl bg-black/40 p-1 border border-white/10">
              <button
                onClick={() => {
                  setDeviceTab("android");
                  setShowManualGuide(false);
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  deviceTab === "android"
                    ? "bg-[#F59E0B] text-[#06080D] shadow-md"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Android / Компьютер
              </button>
              <button
                onClick={() => {
                  setDeviceTab("ios");
                  setShowManualGuide(true);
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  deviceTab === "ios"
                    ? "bg-[#F59E0B] text-[#06080D] shadow-md"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                iPhone / iPad (iOS)
              </button>
            </div>

            {deviceTab === "android" ? (
              <div className="space-y-3">
                {/* Main Action Button for Android/Chrome */}
                <button
                  onClick={handleInstallClick}
                  className="w-full py-3 px-4 bg-gradient-to-r from-[#F59E0B] to-[#EA580C] hover:from-[#FBBF24] hover:to-[#F97316] text-[#06080D] font-extrabold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-lg shadow-[#F59E0B]/25"
                >
                  <Download className="w-4 h-4" />
                  <span>Установить на рабочий стол</span>
                </button>

                {/* If prompt wasn't triggered automatically or user needs manual guide */}
                {(!deferredPrompt || showManualGuide) && (
                  <div className="bg-black/50 border border-[#F59E0B]/30 rounded-2xl p-3.5 space-y-2 text-xs animate-in fade-in">
                    <div className="flex items-center gap-1.5 text-[#F59E0B] font-bold text-[11px] uppercase tracking-wide">
                      <Info className="w-3.5 h-3.5" />
                      <span>Установка через меню браузера (10 секунд):</span>
                    </div>
                    <ol className="space-y-2 text-gray-300 pl-1">
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                          1
                        </span>
                        <span>
                          Нажмите на <b className="text-white">меню браузера [⋮]</b> (три точки в правом верхнем или нижнем углу).
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                          2
                        </span>
                        <span>
                          Выберите пункт <b className="text-white">«Установить приложение»</b> или <b className="text-white">«Добавить на главный экран»</b>.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                          3
                        </span>
                        <span>
                          Нажмите <b className="text-white">«Установить»</b>. Иконка появится рядом с остальными приложениями!
                        </span>
                      </li>
                    </ol>
                  </div>
                )}
              </div>
            ) : (
              /* iOS Safari Guide */
              <div className="space-y-3">
                <div className="bg-black/50 border border-white/10 rounded-2xl p-3.5 space-y-2 text-xs">
                  <div className="text-[11px] font-bold text-[#F59E0B] uppercase tracking-wide">
                    Установка в Safari (iPhone / iPad):
                  </div>
                  <ol className="space-y-2.5 text-gray-300">
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                        1
                      </span>
                      <span>
                        Нажмите кнопку <b className="text-white">«Поделиться»</b> (квадрат со стрелкой <Share className="w-3.5 h-3.5 inline mx-1 text-blue-400" />) в нижней панели Safari.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                        2
                      </span>
                      <span>
                        Прокрутите меню вниз и выберите <b className="text-white">«На экран „Домой“»</b> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-[#F59E0B]" />.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                        3
                      </span>
                      <span>
                        Нажмите <b className="text-white">«Добавить»</b> в правом верхнем углу — готово!
                      </span>
                    </li>
                  </ol>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-[11px] text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 px-3 py-2 rounded-xl">
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <span>Безопасно: не требует разрешений и паролей, работает автономно.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
