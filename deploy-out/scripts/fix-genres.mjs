// scripts/fix-genres.mjs
// Переводит жанры LibriVox на русские категории, которые есть в фильтрах сайта.
//
// Было: genre = "Myths, Legends & Fairy Tales" — такой жанр фильтр не найдёт.
// Стало: genre = "Для детей", а исходный английский жанр остаётся в tags.
//
// Запуск (сервер остановить):
//   node .\scripts\fix-genres.mjs

import { createClient } from "@libsql/client";
import path from "node:path";

const dbPath = path.join(process.cwd(), "audiobooks.db");
const client = createClient({ url: `file:${dbPath}` });

// Соответствие жанров LibriVox нашим категориям.
// Категории взяты из тех, что уже есть в FilterControls.
const MAP = [
  [/fairy tale|children|myths, legends|juvenile/i, "Для детей"],
  [/science fiction|fantasy|horror|ghost/i, "Фантастика"],
  [/detective|crime|mystery|thriller/i, "Детективы"],
  [/supernatural|occult|gothic/i, "Ужасы и мистика"],
  [/psycholog|philosoph|self-help|social science|religion|education/i, "Психология"],
  [/fiction|poetry|romance|satire|humor|short stor|short works|essay|biograph|memoir|war|histor|travel|literary|antholog|narrative|comedy|single author|published|non-fiction|early modern/i, "Классика"],
];

function mapGenre(tags, fallback) {
  const text = [...tags, fallback].join(" | ");
  for (const [pattern, russian] of MAP) {
    if (pattern.test(text)) return russian;
  }
  return "Классика";
}

const rows = (await client.execute("SELECT id, title, genre, tags FROM books")).rows;

console.log(`=== Перевод жанров: ${rows.length} книг ===`);
console.log();

const before = {};
const after = {};
let updated = 0;

for (const row of rows) {
  const oldGenre = String(row.genre || "");
  let tags = [];
  try {
    tags = JSON.parse(String(row.tags || "[]"));
  } catch {}
  if (!Array.isArray(tags)) tags = [];

  const newGenre = mapGenre(tags.map(String), oldGenre);

  before[oldGenre] = (before[oldGenre] || 0) + 1;
  after[newGenre] = (after[newGenre] || 0) + 1;

  if (newGenre !== oldGenre) {
    await client.execute({
      sql: "UPDATE books SET genre = ? WHERE id = ?",
      args: [newGenre, row.id],
    });
    updated += 1;
  }
}

console.log("было (английские жанры LibriVox):");
for (const [g, c] of Object.entries(before).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(c).padStart(3)}  ${g}`);
}

console.log();
console.log("стало (категории сайта):");
for (const [g, c] of Object.entries(after).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(c).padStart(3)}  ${g}`);
}

console.log();
console.log(`обновлено записей: ${updated}`);
console.log();
console.log("Проверить: npm start, затем нажать жанр в фильтрах.");

client.close();