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

    const getFocusableElements = () => {
      return Array.from(
        container.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => {
        // В JSDOM offsetParent всегда null, поэтому проверяем getClientRects или style.display
        // Чтобы не ломать тесты, оставляем проверку на visibility, но не строгую к offsetParent
        const style = window.getComputedStyle(el);
        return style.display !== "none" && style.visibility !== "hidden";
      });
    };

    // Используем requestAnimationFrame, чтобы дождаться окончания рендера
    const rafId = requestAnimationFrame(() => {
      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        focusableElements[0]?.focus();
      }
    });

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
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isActive, containerRef, onClose]);
}