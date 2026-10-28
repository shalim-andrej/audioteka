"use client";

import React, { useState, useEffect } from "react";
import { Download, X, CheckCircle2, Smartphone, Monitor, Sparkles, ShieldCheck, ArrowDownCircle } from "lucide-react";
import { reachMetrikaGoal } from "@/components/YandexMetrika";

interface InstallPwaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InstallPwaModal({ isOpen, onClose }: InstallPwaModalProps) {
  const [isStandalone, setIsStandalone] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    const ua = window.navigator.userAgent.toLowerCase();
    setIsMobile(/android|iphone|ipad|ipod|mobile/.test(ua));
  }, [isOpen]);

  const handleDownloadApk = () => {
    reachMetrikaGoal("pwa_install_click", { type: "apk_download" });
    // Прямое скачивание нативного APK-файла для Android
    const link = document.createElement("a");
    link.href = "/audioteka-pro.apk";
    link.download = "audioteka-pro.apk";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleWebInstall = async () => {
    reachMetrikaGoal("pwa_install_click", { type: "web_install" });
    const prompt = (window as any).__pwa_install_prompt;
    if (prompt) {
      try {
        await prompt.prompt();
        const { outcome } = await prompt.userChoice;
        if (outcome === "accepted") {
          setTimeout(onClose, 2000);
        }
      } catch (e) {
        console.warn(e);
      }
    } else {
      // Если браузер перехватил установку (например, Яндекс Браузер на Android), скачиваем APK напрямую!
      handleDownloadApk();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm sm:max-w-md bg-gradient-to-b from-[#131C31] via-[#0E1524] to-[#080B11] border border-white/15 rounded-3xl p-5 sm:p-6 shadow-2xl overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#F59E0B]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer z-10"
          aria-label="Закрыть"
        >
          <X className="w-5 h-5" />
        </button>

        {/* App Identity Banner */}
        <div className="flex items-center gap-3.5 mb-5 pr-6">
          <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-[#F59E0B]/40 shadow-xl shadow-[#F59E0B]/25 flex-shrink-0 bg-[#080B11]">
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
            <h3 className="text-lg font-bold text-white truncate">Аудиотека PRO</h3>
            <p className="text-[11px] text-gray-400">Слушайте в фоне с выключенным экраном</p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Quick Benefits */}
          <div className="grid grid-cols-2 gap-2 text-left">
            <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
              <div className="text-xs font-bold text-white mb-0.5">🎧 В фоне</div>
              <div className="text-[10px] text-gray-400">Экран заблокирован — звук играет</div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
              <div className="text-xs font-bold text-white mb-0.5">⚡️ На рабочем столе</div>
              <div className="text-[10px] text-gray-400">Запуск в 1 клик с главного экрана</div>
            </div>
          </div>

          {/* 1. DIRECT NATIVE APK DOWNLOAD (FOR ANDROID) */}
          <button
            onClick={handleDownloadApk}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-[#F59E0B] via-[#EA580C] to-[#D97706] hover:brightness-110 active:scale-98 text-[#06080D] font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xl shadow-[#F59E0B]/25"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>Скачать APK на телефон (Android)</span>
          </button>

          {/* 2. DIRECT WEB INSTALL (FOR PC / CHROME / PWA) */}
          <button
            onClick={handleWebInstall}
            className="w-full py-2.5 px-3 bg-white/10 hover:bg-white/15 active:scale-98 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer border border-white/10"
          >
            <Monitor className="w-4 h-4 text-[#F59E0B]" />
            <span>Установить в браузер (ПК / Windows)</span>
          </button>

          {/* Micro-hint */}
          <div className="text-[11px] text-gray-400 text-center leading-relaxed pt-1">
            {isMobile ? (
              <span>
                Файл <b className="text-white">audioteka-pro.apk</b> скачается за 1 секунду. Нажмите «Открыть» ➔ «Установить» — и ярлык появится на рабочем столе телефона.
              </span>
            ) : (
              <span>
                На компьютере ярлык можно создать перетаскиванием значка замочка из адресной строки на рабочий стол.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
