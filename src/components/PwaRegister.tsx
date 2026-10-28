"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    __pwa_install_prompt?: any;
    __pwa_is_installed?: boolean;
  }
}

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Регистрация Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          // SW активен
        })
        .catch((err) => {
          console.warn("SW register err:", err);
        });
    }

    // Ранний перехват нативного PWA события установки
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      window.__pwa_install_prompt = e;
      window.dispatchEvent(new CustomEvent("pwa_prompt_available"));
    };

    const handleAppInstalled = () => {
      window.__pwa_is_installed = true;
      window.__pwa_install_prompt = null;
      window.dispatchEvent(new CustomEvent("pwa_installed_event"));
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  return null;
}
