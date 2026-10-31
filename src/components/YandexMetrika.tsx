"use client";

import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";

export const METRIKA_COUNTER_ID = 113789185;

/**
 * Отправка событий/целей в Яндекс Метрику
 */
export function reachMetrikaGoal(goalName: string, params?: Record<string, any>) {
  if (typeof window !== "undefined" && (window as any).ym) {
    const id = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID || (window as any).__YM_ID || METRIKA_COUNTER_ID;
    try {
      if (params) {
        (window as any).ym(id, "reachGoal", goalName, params);
      } else {
        (window as any).ym(id, "reachGoal", goalName);
      }
    } catch (e) {
      console.warn("Metrika reachGoal error:", e);
    }
  }
}

/**
 * Отслеживание переходов по страницам (SPA hit)
 */
function MetrikaHitTracker({ counterId }: { counterId: string | number }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ym) {
      const qs = searchParams?.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      try {
        (window as any).ym(counterId, "hit", url);
      } catch (e) {
        // ignore
      }
    }
  }, [pathname, searchParams, counterId]);

  return null;
}

interface YandexMetrikaProps {
  counterId?: string | number;
}

export default function YandexMetrika({ counterId }: YandexMetrikaProps) {
  const ymId = counterId || process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID || METRIKA_COUNTER_ID;

  return (
    <>
      {/* lazyOnload — скрипт загружается ПОСЛЕ отрисовки страницы (не блокирует LCP) */}
      <Script id="yandex-metrika" strategy="lazyOnload">
        {`
          (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
          m[i].l=1*new Date();
          for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
          k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
          (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

          window.__YM_ID = ${ymId};
          ym(${ymId}, "init", {
            clickmap: true,
            trackLinks: true,
            accurateTrackBounce: true,
            webvisor: true,
            trackHash: true,
            ecommerce: "dataLayer"
          });
        `}
      </Script>
      <noscript>
        <div>
          <img
            src={`https://mc.yandex.ru/watch/${ymId}`}
            style={{ position: "absolute", left: "-9999px" }}
            alt=""
          />
        </div>
      </noscript>
      <Suspense fallback={null}>
        <MetrikaHitTracker counterId={ymId} />
      </Suspense>
    </>
  );
}