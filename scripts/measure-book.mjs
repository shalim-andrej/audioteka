// scripts/measure-book.mjs
// Замер скорости страницы книги — прямо на сервере, без браузера.
//
// Отвечает на три вопроса:
//   1. сколько сервер собирает страницу книги (обычный запрос);
//   2. сколько он отдаёт её в режиме _rsc (именно так браузер просит её при клике);
//   3. что будет, если попросить двадцать страниц одновременно —
//      то есть проверить версию про очередь.
//
// Запуск (сервер должен работать):
//   node .\scripts\measure-book.mjs
//
// Отчёт пишется в measure-book-report.txt (UTF-8).

import fs from "node:fs";

const BASE = "http://localhost:3000";
const BOOK_ID = process.argv[2] || "kvu-177-master-i-margarita";
const PARALLEL = 20;

const out = [];
const say = (line = "") => {
  out.push(line);
  console.log(line);
};

const ms = (n) => `${Math.round(n)} мс`;

/** Один замер: сколько milliseconds от отправки до последнего байта. */
async function once(url, withRsc = false) {
  const started = performance.now();
  try {
    const res = await fetch(url, {
      headers: withRsc ? { RSC: "1" } : {},
      signal: AbortSignal.timeout(120000),
    });
    const body = await res.text();
    return { ms: performance.now() - started, size: body.length, status: res.status };
  } catch (error) {
    return { ms: performance.now() - started, size: 0, status: String(error?.name || "ошибка") };
  }
}

/** Собирает id книг прямо из html каталога. */
function extractIds(html) {
  const ids = new Set();
  const re = /\/book\/([A-Za-z0-9_%.-]+)/g;
  let match;
  while ((match = re.exec(html)) !== null) {
    const id = match[1];
    if (id && !id.startsWith("_")) ids.add(decodeURIComponent(id));
  }
  return Array.from(ids);
}

async function main() {
  say("=== Замер страницы книги ===");
  say(`сервер: ${BASE}`);
  say(`книга:  ${BOOK_ID}`);
  say();

  const pageUrl = `${BASE}/book/${encodeURIComponent(BOOK_ID)}`;

  say("--- 1. Обычная страница, три раза подряд ---");
  for (let i = 1; i <= 3; i += 1) {
    const r = await once(pageUrl);
    say(`  попытка ${i}: статус ${r.status}, ${String(r.size).padStart(7)} байт, ${ms(r.ms)}`);
  }
  say();

  say("--- 2. Версия _rsc (как при клике по карточке), три раза ---");
  for (let i = 1; i <= 3; i += 1) {
    const r = await once(`${pageUrl}?_rsc=probe${i}`, true);
    say(`  попытка ${i}: статус ${r.status}, ${String(r.size).padStart(7)} байт, ${ms(r.ms)}`);
  }
  say();

  say("--- 3. Очередь: сколько стоит один клик, пока грузится каталог ---");
  const catalog = await once(`${BASE}/`);
  say(`  каталог: ${String(catalog.size).padStart(7)} байт, ${ms(catalog.ms)}`);

  const html = await (await fetch(`${BASE}/`)).text();
  const ids = extractIds(html).filter((id) => id !== BOOK_ID).slice(0, PARALLEL);
  say(`  id книг из каталога для параллельного запроса: ${ids.length}`);

  if (ids.length > 0) {
    const startedParallel = performance.now();
    const results = await Promise.all(ids.map((id) => once(`${BASE}/book/${encodeURIComponent(id)}`)));
    const total = performance.now() - startedParallel;
    const times = results.map((r) => Math.round(r.ms)).sort((a, b) => a - b);
    const slowest = times[times.length - 1];
    const median = times[Math.floor(times.length / 2)];
    say(`  все ${ids.length} страниц вместе: ${ms(total)}`);
    say(`  самая быстрая: ${ms(times[0])}, средняя: ${ms(median)}, самая долгая: ${ms(slowest)}`);
  }
  say();

  say("=== конец ===");
  fs.writeFileSync("measure-book-report.txt", out.join("\r\n"), "utf8");
  console.log("\nотчёт: measure-book-report.txt");
}

main().catch((error) => {
  console.error("ошибка:", error);
  process.exit(1);
});