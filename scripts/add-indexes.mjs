// scripts/add-indexes.mjs
// Создаёт индекс по жанру — из-за его отсутствия запрос «похожие книги»
// читал всю базу (636 МБ) и занимал 15 секунд.
//
// Замеряет запрос до и после, чтобы результат был виден числами.
//
// Запуск (сервер остановить, Ctrl+C):
//   node .\scripts\add-indexes.mjs
//
// Отчёт пишется в add-indexes-report.txt (UTF-8).

import { createClient } from "@libsql/client";
import path from "node:path";
import fs from "node:fs";

const dbPath = path.join(process.cwd(), "audiobooks.db");
const client = createClient({ url: `file:${dbPath}` });

const GENRE = "%шедевры литературы%";

const FIELDS = `id, title, author, narrator, genre, year, rating,
  votes_count, duration_seconds, duration_formatted,
  cover_url, short_description, is_featured, created_at`;

const RELATED_SQL = `SELECT ${FIELDS} FROM books
  WHERE clean = 1 AND (genre LIKE ? OR genre LIKE ? OR genre LIKE ?)
  ORDER BY votes_count DESC LIMIT 6`;

const RELATED_ARGS = [GENRE, "%Шедевры литературы%", GENRE];

const out = [];
const say = (line = "") => {
  out.push(line);
  console.log(line);
};
const ms = (n) => `${Math.round(n)} мс`;

async function timeQuery(sql, args, runs = 3) {
  const times = [];
  let rows = 0;
  for (let i = 0; i < runs; i += 1) {
    const started = performance.now();
    const res = await client.execute({ sql, args });
    times.push(performance.now() - started);
    rows = res.rows.length;
  }
  times.sort((a, b) => a - b);
  return { min: times[0], max: times[times.length - 1], rows };
}

async function main() {
  say("=== Индекс по жанру ===");
  say(`база: ${dbPath}`);
  say();

  say("--- 1. Как сейчас (первый запрос может быть долгим) ---");
  const before = await timeQuery(RELATED_SQL, RELATED_ARGS, 1);
  say(`  похожие книги: ${ms(before.min)}, строк: ${before.rows}`);

  const planBefore = await client.execute({
    sql: `EXPLAIN QUERY PLAN ${RELATED_SQL}`,
    args: RELATED_ARGS,
  });
  for (const row of planBefore.rows) say(`  план: ${row.detail}`);
  say();

  say("--- 2. Создаю индекс (может занять до минуты) ---");
  const startedIndex = performance.now();
  await client.execute(
    "CREATE INDEX IF NOT EXISTS idx_genre_votes ON books(genre, votes_count DESC);"
  );
  say(`  индекс создан за ${ms(performance.now() - startedIndex)}`);

  const startedAnalyze = performance.now();
  await client.execute("ANALYZE;");
  say(`  статистика посчитана за ${ms(performance.now() - startedAnalyze)}`);
  say();

  say("--- 3. План и время после индекса ---");
  const planAfter = await client.execute({
    sql: `EXPLAIN QUERY PLAN ${RELATED_SQL}`,
    args: RELATED_ARGS,
  });
  for (const row of planAfter.rows) say(`  план: ${row.detail}`);

  const after = await timeQuery(RELATED_SQL, RELATED_ARGS, 3);
  say(`  похожие книги: быстрейший ${ms(after.min)}, долгий ${ms(after.max)}, строк: ${after.rows}`);
  say();

  say("--- 4. Каталог и страница книги, для контроля ---");
  const catalog = await timeQuery(
    `SELECT ${FIELDS} FROM books WHERE clean = 1 ORDER BY votes_count DESC LIMIT 24`,
    [],
    2
  );
  say(`  каталог: ${ms(catalog.min)}, строк: ${catalog.rows}`);

  const page = await timeQuery("SELECT * FROM books WHERE id = ? LIMIT 1", ["kvu-177-master-i-margarita"], 2);
  say(`  страница книги: ${ms(page.min)}, строк: ${page.rows}`);
  say();

  const speedup = before.min / Math.max(after.min, 1);
  say(`=== ускорение: в ${speedup.toFixed(0)} раз ===`);

  fs.writeFileSync("add-indexes-report.txt", out.join("\r\n"), "utf8");
  console.log("\nотчёт: add-indexes-report.txt");
  client.close();
}

main().catch((error) => {
  console.error("ошибка:", error);
  process.exit(1);
});