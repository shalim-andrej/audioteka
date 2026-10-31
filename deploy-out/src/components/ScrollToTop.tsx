// src/components/ScrollToTop.tsx
"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

/**
 * Кнопка «Наверх».
 *
 * Нужна именно из-за бесконечной прокрутки: после нескольких догрузок
 * страница уходит вниз на тысячи пикселей, и вернуться к шапке и фильтрам
 * мышью уже неудобно.
 *
 * Появляется только после того, как человек прокрутил 700 px, — на первом
 * экране она не мешает. Пока не появилась, компонент не рисует ничего,
 * поэтому вёрстка не сдвигается.
 *
 * Позиция снизу со сдвигом на 104 px: там стоит закреплённая панель плеера,
 * иначе кнопка оказалась бы под ней.
 */
export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;

    /*
     * Слушатель scroll срабатывает очень часто. Без ограничения он вызывает
     * перерисовку на каждый пиксель прокрутки — это заметно на слабых
     * телефонах. requestAnimationFrame сводит всё к одному обновлению на кадр.
     */
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setVisible(window.scrollY > 700);
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const toTop = () => {
    // Уважаем системную настройку «уменьшить движение»
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="Наверх"
      title="Наверх"
      className="fixed right-4 sm:right-6 bottom-[104px] z-40 flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-[#0F1420]/90 text-[#F59E0B] shadow-lg shadow-black/40 backdrop-blur transition-colors hover:bg-[#F59E0B] hover:text-[#06080D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F59E0B]"
    >
      <ArrowUp className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}