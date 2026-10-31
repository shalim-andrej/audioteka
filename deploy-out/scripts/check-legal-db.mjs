// scripts/check-legal-db.mjs
// Показывает, что попало в легальную базу, и какие книги собрались неполно.
//
// Запуск:
//   node .\scripts\check-legal-db.mjs

import { createClient } from "@libsql/client";
import path from "node:path";
import fs from "node:fs";

const dbPath = path.join(process.cwd(), "audiobooks.db");
const client = createClient({ url: `file:${dbPath}` });

const res = await client.execute(
  "SELECT id, title, author, narrator, genre, year, duration_seconds, cover_url, chapters FROM books ORDER BY author"
);

const rows = res.rows;
console.log(`=== ${path.basename(dbPath)} ===`);
console.log(`книг: ${rows.length}`);
console.log();

let bad = 0;
for (const row of rows) {
  let chapters = [];
  try {
    chapters = JSON.parse(String(row.chapters || "[]"));
  } catch {}
  const withAudio = chapters.some((c) => c.audioUrl);
  const hasCover = Boolean(String(row.cover_url || "").trim());
  const hours = Math.round((Number(row.duration_seconds) || 0) / 3600);

  if (!withAudio || !hasCover) {
    bad += 1;
    console.log(
      `[неполная] ${String(row.title).slice(0, 42).padEnd(44)} ${String(row.author).slice(0, 22).padEnd(24)} ` +
        `глав: ${String(chapters.length).padStart(3)}, аудио: ${withAudio ? "да" : "НЕТ"}, обложка: ${hasCover ? "да" : "НЕТ"}`
    );
  }
}

console.log();
console.log(`неполных книг: ${bad} из ${rows.length}`);
console.log();
console.log("Первые пять полных, для проверки:");
for (const row of rows.slice(0, 5)) {
  let chapters = [];
  try {
    chapters = JSON.parse(String(row.chapters || "[]"));
  } catch {}
  const hours = Math.round((Number(row.duration_seconds) || 0) / 3600);
  console.log(`  ${String(row.title).slice(0, 40).padEnd(42)} ${String(row.author).slice(0, 20).padEnd(22)} глав: ${String(chapters.length).padStart(3)}, ${hours} ч`);
}

client.close();