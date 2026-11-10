// src/components/InstallPwaModal.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Sparkles, CheckCircle2, Smartphone } from "lucide-react";
import { reachMetrikaGoal } from "@/components/YandexMetrika";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface InstallPwaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InstallPwaModal({ isOpen, onClose }: InstallPwaModalProps) {
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);
  const [showGenericHint, setShowGenericHint] = useState(false);
  
  const modalRef = useRef<HTMLDivElement>(null);

  // Подключаем наш хук
  useFocusTrap(isOpen, modalRef, onClose);

  useEffect(() => {
    if (!isOpen) {
      setInstalled(false);
      setBusy(false);
      setShowIosHint(false);
      setShowGenericHint(false);
    }
  }, [isOpen]);

  const handleInstall = async () => {
    reachMetrikaGoal("pwa_install_click");

    if (window.__pwa_is_installed) {
      setInstalled(true);
      setTimeout(() => onClose(), 1500);
      return;
    }

    const promptEvent = window.__pwa_install_prompt as
      | BeforeInstallPromptEvent
      | undefined;

    if (promptEvent && typeof promptEvent.prompt === "function") {
      setBusy(true);
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === "accepted") {
          setInstalled(true);
          setTimeout(() => onClose(), 2000);
        } else {
          setBusy(false);
        }
      } catch (err) {
        console.warn("[pwa] prompt failed:", err);
        setShowGenericHint(true);
        setBusy(false);
      }
      window.__pwa_install_prompt = undefined;
      return;
    }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      setShowIosHint(true);
      return;
    }

    setShowGenericHint(true);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md"
            onClick={onClose}
            aria-hidden="true" // Скрываем от скринридеров
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: "spring", stiffness: 320, damping: 28, mass: 0.8 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-3 sm:p-4 pointer-events-none"
          >
            {/* 
              Обертка для Focus Trap. 
              role="dialog" и aria-modal="true" говорят скринридерам, что это модалка.
            */}
            <div
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="pwa-modal-title"
              className="relative w-full max-w-sm bg-gradient-to-b from-[#131C31] via-[#0E1524] to-[#080B11] border border-white/15 rounded-3xl p-5 sm:p-6 shadow-2xl overflow-hidden pointer-events-auto"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#F59E0B]/15 rounded-full blur-3xl pointer-events-none" />

              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer z-10"
                aria-label="Закрыть"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3.5 mb-5 pr-6">
                <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-[#F59E0B]/40 shadow-xl shadow-[#F59E0B]/25 flex-shrink-0 bg-[#080B11]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/icon-192.png"
                    alt="Иконка приложения Аудиотека PRO"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#F59E0B] flex items-center gap-1">
                    <Sparkles className="w-3 h-3 fill-current" />
                    Добавить на главный экран
                  </span>
                  <h3 id="pwa-modal-title" className="text-lg font-bold text-white truncate">
                    Аудиотека PRO
                  </h3>
                  <p className="text-[11px] text-gray-400">Работает как обычное приложение</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-left">
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                    <div className="text-xs font-bold text-white mb-0.5">🎧 В фоне</div>
                    <div className="text-[10px] text-gray-400">Экран заблокирован — звук играет</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                    <div className="text-xs font-bold text-white mb-0.5">⚡️ Без браузера</div>
                    <div className="text-[10px] text-gray-400">Открывается в отдельном окне</div>
                  </div>
                </div>

                <button
                  onClick={handleInstall}
                  disabled={busy || installed}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-[#F59E0B] via-[#EA580C] to-[#D97706] hover:brightness-110 active:scale-98 disabled:opacity-70 text-[#06080D] font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xl shadow-[#F59E0B]/25"
                >
                  {installed ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-[#06080D]" />
                      <span>Установлено</span>
                    </>
                  ) : busy ? (
                    <>
                      <Smartphone className="w-4 h-4 stroke-[2.5]" />
                      <span>Устанавливаем...</span>
                    </>
                  ) : (
                    <>
                      <Smartphone className="w-4 h-4 stroke-[2.5]" />
                      <span>Установить на главный экран</span>
                    </>
                  )}
                </button>

                {showIosHint && (
                  <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[11px] text-gray-300 leading-relaxed">
                    <div className="font-bold text-white mb-1">Инструкция для iPhone / iPad</div>
                    1. Откройте сайт в <b className="text-white">Safari</b>.<br />
                    2. Нажмите <b className="text-white">«Поделиться»</b>.<br />
                    3. Выберите <b className="text-white">«На экран «Домой»»</b>.
                  </div>
                )}

                {showGenericHint && (
                  <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[11px] text-gray-300 leading-relaxed">
                    Браузер не поддерживает установку в один клик. Откройте меню браузера
                    (⋮) и выберите <b className="text-white">«Установить приложение»</b> или{" "}
                    <b className="text-white">«Добавить на главный экран»</b>.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}