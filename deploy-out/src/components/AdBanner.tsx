"use client";

import React from "react";
import { Sparkles, ExternalLink } from "lucide-react";
import { reachMetrikaGoal } from "@/components/YandexMetrika";

interface AdBannerProps {
  type?: "native_max" | "rsya_slot" | "vip_promo";
  className?: string;
}

export default function AdBanner({ type = "native_max", className = "" }: AdBannerProps) {
  const handlePartnerClick = () => {
    reachMetrikaGoal("partner_channel_click", { channel: "yandex_sales" });
  };

  if (type === "native_max") {
    return (
      // ✅ Резервируем МЕСТО по фактическому размеру контента:
      // мобильный: p-5 (40) + 3 строки текста (~90) + кнопка (44) + gap-4 (16) + запас = ~280px
      // десктоп: p-6 (48) + текст в одну строку (~80) + запас = ~160px
      <div className="w-full min-h-[280px] sm:min-h-[160px]">
        <aside
          aria-label="Реклама"
          className={`my-8 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#111A2E] via-[#0E1524] to-[#0A0E17] border border-white/15 relative overflow-hidden shadow-xl ${className}`}
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#F59E0B]/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-[#F59E0B] font-black flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 fill-current" />
                Партнёр проекта • Яндекс Продажи
              </span>
              <h4 className="text-base sm:text-lg font-bold text-white">
                Находки маркетплейсов и реальные скидки без обмана
              </h4>
              <p className="text-xs text-gray-400 max-w-xl">
                Отслеживаем аномалии цен на гаджеты, рабочий сетап и аудио-технику. Без нарисованных ценников.
              </p>
            </div>

            <a
              href="https://max.ru/id591002056026_biz"
              target="_blank"
              rel="noopener noreferrer"
              onClick={handlePartnerClick}
              className="px-5 py-2.5 bg-gradient-to-r from-[#F59E0B] to-[#EA580C] text-[#06080D] font-extrabold text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-lg shadow-[#F59E0B]/20 flex-shrink-0"
            >
              <span>В канал «Яндекс продажи»</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </aside>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[100px]">
      <aside
        aria-label="Реклама"
        className={`my-6 p-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center text-xs text-gray-500 ${className}`}
      >
        <span className="text-[10px] uppercase tracking-wider block mb-1">Рекламный блок РСЯ</span>
        <div className="text-gray-400 font-medium">
          Белая контекстная реклама Яндекса (подключается через Яндекс Дистрибуцию)
        </div>
      </aside>
    </div>
  );
}