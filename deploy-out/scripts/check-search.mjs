// scripts/check-search.mjs
// Проверяет скорость двух вещей:
//   1. страница поиска  /?search=...   — её грузит Enter;
//   2. выпадающий список /api/audiobooks?search=... — он дёргается на каждую букву.
//
// Запускать при работающем npm start, во втором окне терминала:
//   node .\scripts\check-search.mjs
//
// До 300 мс — хорошо. Больше 2000 мс — этот маршрут ещё читает всю базу.

const BASE = "http://localhost:3000";
const QUERIES = ["булгаков", "война", "толстой", "1984"];
const BURST = 6; // столько запросов браузер шлёт почти одновременно при вводе

async function timed(url) {
  const started = performance.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
    const body = await res.text();
    return { ms: performance.now() - started, status: res.status, size: body.length };
  } catch (error) {
    return { ms: performance.now() - started, status: String(error?.name || "ошибка"), size: 0 };
  }
}

const row = (label, r) =>
  `  ${label.padEnd(22)} ${String(Math.round(r.ms)).padStart(6)} мс   статус ${r.status}   ${String(r.size).padStart(7)} байт`;

async function main() {
  console.log("=== Скорость поиска ===");
  console.log(`сервер: ${BASE}`);
  console.log();

  console.log("--- страница поиска (её грузит Enter) ---");
  for (const q of QUERIES) {
    const r = await timed(`${BASE}/?search=${encodeURIComponent(q)}`);
    console.log(row(`«${q}»`, r));
  }
  console.log();

  console.log("--- выпадающий список (его дёргает каждая буква) ---");
  for (const q of QUERIES) {
    const r = await timed(`${BASE}/api/audiobooks?search=${encodeURIComponent(q)}&limit=5`);
    console.log(row(`«${q}»`, r));
  }
  console.log();

  console.log(`--- ${BURST} запросов списка одновременно (как при быстром вводе) ---`);
  const startedBurst = performance.now();
  const burst = await Promise.all(
    Array.from({ length: BURST }, (_, i) =>
      timed(`${BASE}/api/audiobooks?search=${encodeURIComponent(QUERIES[i % QUERIES.length])}&limit=5`)
    )
  );
  const totalBurst = performance.now() - startedBurst;
  const times = burst.map((r) => Math.round(r.ms)).sort((a, b) => a - b);
  console.log(`  все вместе: ${Math.round(totalBurst)} мс`);
  console.log(`  быстрейший: ${times[0]} мс, средний: ${times[Math.floor(times.length / 2)]} мс, долгий: ${times[times.length - 1]} мс`);
  console.log();

  console.log("=== конец ===");
}

main().catch((error) => {
  console.error("ошибка:", error);
  process.exit(1);
});