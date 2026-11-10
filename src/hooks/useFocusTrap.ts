// src/hooks/useFocusTrap.ts
import { useEffect, RefObject } from "react";

export function useFocusTrap(
  isActive: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onClose?: () => void
) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;

    // Находим все фокусируемые элементы внутри
    const getFocusableElements = () => {
      return Array.from(
        container.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null); // Отфильтровываем невидимые элементы
    };

    const focusableElements = getFocusableElements();
    
    // 1. Фокусируемся на первом элементе при открытии
    if (focusableElements.length > 0) {
      // Небольшая задержка, чтобы дождаться завершения анимации открытия
      setTimeout(() => focusableElements[0]?.focus(), 50);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
        return;
      }

      if (e.key === "Tab") {
        const currentFocusable = getFocusableElements();
        if (currentFocusable.length === 0) return;

        const firstElement = currentFocusable[0];
        const lastElement = currentFocusable[currentFocusable.length - 1];

        // Циклический переход
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    
    // Блокируем скролл фона, пока модалка открыта
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isActive, containerRef, onClose]);
}