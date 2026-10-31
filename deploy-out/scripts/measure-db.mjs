// scripts/measure-db.mjs
// Замер запросов к базе напрямую — без сервера и браузера.
//
// Проверяет три запроса: страницу книги, похожие книги и каталог.
// Каждый — сначала в одиночку, потом двенадцать раз одновременно.
// Показывает план выполнения: читает ли запрос всю таблицу.
//
// Запуск:
//   node .\scripts\measure-db.mjs
//
// Отчёт пишется в measure-db-report.txt (UTF-8).

import { createClient } from "@libsql/client";
import path from "node:path";
import fs from "node:fs";

const dbPath = path.join(process.cwd(), "audiobooks.db");
const client = createClient({ url: `file:${dbPath}` });

const BOOK_ID = "kvu-177-master-i-margarita";
const PARALLEL = 12;

const out = [];
const say = (line = "") => {
  out.push(line);
  console.log(line);
};
const ms = (n) => `${Math.round(n)} мс`;

const FIELDS = `id, title, author, narrator, genre, year, rating,
  votes_count, duration_seconds, duration_formatted,
  cover_url, short_description, is_featured, created_at`;

const QUERIES = {
  "страница книги": {
    sql: "SELECT * FROM books WHERE id = ? LIMIT 1",
    args: [BOOK_ID],
  },
  "похожие книги": {
    sql: `SELECT ${FIELDS} FROM books
          WHERE clean = 1 AND (genre LIKE ? OR genre LIKE ? OR genre LIKE ?)
          ORDER BY votes_count DESC LIMIT 6`,
    args: ["%шедевры литературы%", "%Шедевры литературы%", "%шедевры литературы%"],
  },
  "каталог": {
    sql: `SELECT ${FIELDS} FROM books
          WHERE clean = 1
          ORDER BY votes_count DESC LIMIT 24`,
    args: [],
  },
};

async function timed(query) {
  const started = performance.now();
  const res = await client.execute({ sql: query.sql, args: query.args });
  return { ms: performance.now() - started, rows: res.rows.length };
}

async function main() {
  say("=== Замер запросов к базе ===");
  say(`база: ${dbPath}`);
  say(`файл: ${(fs.statSync(dbPath).size / 1024 / 1024).toFixed(0)} МБ`);
  say();

  for (const [name, query] of Object.entries(QUERIES)) {
    say(`--- ${name} ---`);

    const plan = await client.execute({ sql: `EXPLAIN QUERY PLAN ${query.sql}`, args: query.args });
    for (const row of plan.rows) {
      say(`  план: ${row.detail}`);
    }

    const single = await timed(query);
    say(`  в одиночку: ${ms(single.ms)}, строк: ${single.rows}`);

    const started = performance.now();
    const parallel = await Promise.all(Array.from({ length: PARALLEL }, () => timed(query)));
    const total = performance.now() - started;
    const times = parallel.map((r) => Math.round(r.ms)).sort((a, b) => a - b);
    say(
      `  ${PARALLEL} одновременно: все вместе ${ms(total)}, ` +
        `быстрейший ${ms(times[0])}, средний ${ms(times[Math.floor(times.length / 2)])}, ` +
        `долгий ${ms(times[times.length - 1])}`
    );
    say();
  }

  say("=== конец ===");
  fs.writeFileSync("measure-db-report.txt", out.join("\r\n"), "utf8");
  console.log("\nотчёт: measure-db-report.txt");
  client.close();
}

main().catch((error) => {
  console.error("ошибка:", error);
  process.exit(1);
});