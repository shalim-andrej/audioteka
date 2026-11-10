// src/components/ClientAudioPlayer.tsx
"use client";

import dynamic from "next/dynamic";

/**
 * Клиентская обёртка над плеером.
 *
 * Зачем обёртка:
 *  - AudioPlayerBar — клиентский компонент (хуки, Web Audio API, localStorage).
 *  - Через dynamic + ssr: false он не попадает в серверный HTML,
 *    не гидрируется на старте и не блокирует главный поток.
 *  - Это часть оптимизации TBT: без плеера первый рендер быстрее.
 *
 * Плеер монтируется после гидратации, но визуально всё равно появляется
 * только при наличии трека (currentBook === null → ничего не рендерит).
 */
const AudioPlayerBar = dynamic(() => import("@/components/AudioPlayerBar"), {
  ssr: false,
});

export default function ClientAudioPlayer() {
  return <AudioPlayerBar />;
}