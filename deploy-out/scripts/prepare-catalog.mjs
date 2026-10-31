// scripts/prepare-catalog.mjs
// Разовый скрипт подготовки локальной базы к быстрым запросам.
// Запуск: node scripts/prepare-catalog.mjs
//
// Что делает:
// 1. Добавляет колонку clean (0/1) — результат «санитарных» проверок.
//    Раньше они выполнялись внутри каждого запроса и заставляли SQLite
//    читать колонку chapters (десятки килобайт на строку), то есть
//    прогонять все 636 МБ базы на каждый показ страницы.
// 2. Заполняет clean один раз.
// 3. Строит индексы под сортировки и фильтр по жанру.
// 4. Обновляет статистику для планировщика.

import { createClient } from "@libsql/client";
import path from "node:path";

const dbPath = path.join(process.cwd(), "audiobooks.db");
const client = createClient({ url: `file:${dbPath}` });

const log = (msg) => console.log(`[prepare] ${msg}`);

async function columnExists(name) {
  const res = await client.execute("PRAGMA table_info(books)");
  return res.rows.some((row) => String(row.name) === name);
}

async function main() {
  const startedAt = Date.now();

  if (!(await columnExists("clean"))) {
    log("добавляю колонку clean…");
    await client.execute("ALTER TABLE books ADD COLUMN clean INTEGER NOT NULL DEFAULT 1");
    log("размечаю мусорные записи (один раз, может занять до минуты)…");
    const t0 = Date.now();
    const res = await client.execute(`
      UPDATE books SET clean = 0
      WHERE narrator = 'Аудиофонд'
         OR author IN ('Популярный автор', 'Автор контента', 'Автор', 'Неизвестен', 'Русская классика')
         OR cover_url LIKE '%archive.org/services/img/%'
         OR title LIKE '01-%'
         OR title LIKE '00-%'
         OR title LIKE 'З Н А Т Ь%'
         OR title LIKE 'Скажущие%'
         OR title LIKE 'Последняя война%'
         OR (chapters IS NOT NULL AND (chapters LIKE '%litres.ru/audiotrial%' OR chapters LIKE '%/audiotrial/%'))
    `);
    log(`разметка готова за ${Date.now() - t0} мс, затронуто строк: ${res.rowsAffected}`);
  } else {
    log("колонка clean уже есть — пропускаю разметку");
  }

  log("строю индексы…");
  const indexes = [
    // сортировки каталога
    "CREATE INDEX IF NOT EXISTS idx_clean_votes ON books(clean, votes_count DESC)",
    "CREATE INDEX IF NOT EXISTS idx_clean_rating ON books(clean, rating DESC)",
    "CREATE INDEX IF NOT EXISTS idx_clean_created ON books(clean, created_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_clean_duration ON books(clean, duration_seconds DESC)",
    // ВАЖНО: фильтр по жанру. Без этого индекса COUNT(*) с условием по жанру
    // читал всю таблицу (636 МБ) — из-за этого карточка открывалась 10 секунд.
    "CREATE INDEX IF NOT EXISTS idx_clean_genre ON books(clean, genre)",
  ];
  for (const sql of indexes) {
    const t = Date.now();
    await client.execute(sql);
    log(`  ${sql.match(/idx_\w+/)[0]} — ${Date.now() - t} мс`);
  }

  log("обновляю статистику…");
  await client.execute("PRAGMA optimize");

  log(`готово за ${((Date.now() - startedAt) / 1000).toFixed(1)} с`);
  client.close();
}

main().catch((error) => {
  console.error("[prepare] ошибка:", error);
  process.exit(1);
});