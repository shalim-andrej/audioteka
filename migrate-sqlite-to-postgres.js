"use strict";

const { Pool } = require("pg");
const Database = require("better-sqlite3");

const pgPool = new Pool({
  host: process.env.PGHOST || "pg4.sweb.ru",
  port: Number(process.env.PGPORT) || 5433,
  user: process.env.PGUSER || "xn217xnp1a",
  password: process.env.PGPASSWORD || "AudioPass2026",
  database: process.env.PGDATABASE || "xn217xnpla",
  ssl: false, // sweb.ru обычно не требует SSL для подключения изнутри РФ
});

const sqlite = new Database("./audiobooks.db", { readonly: true });

async function migrate() {
  // Получаем список всех таблиц из SQLite
  const tables = sqlite
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    )
    .all();

  console.log(`Найдено таблиц: ${tables.length}`);

  for (const { name: tableName } of tables) {
    console.log(`\n▶ Мигрируем таблицу: ${tableName}`);

    // Читаем все строки из SQLite
    const rows = sqlite.prepare(`SELECT * FROM "${tableName}"`).all();

    if (rows.length === 0) {
      console.log(`  Пустая таблица, пропускаем`);
      continue;
    }

    // Имена колонок
    const columns = Object.keys(rows[0]);
    const colList = columns.map((c) => `"${c}"`).join(", ");
    const placeholders = columns.map(() => "?").join(", ");

    // Вставляем по одной строке (можно пакетами, если строк много)
    for (const row of rows) {
      const values = columns.map((c) => row[c]);
      await pgPool.query(
        `INSERT INTO "${tableName}" (${colList}) VALUES (${placeholders})`,
        values
      );
    }

    console.log(`  Перенесено строк: ${rows.length}`);
  }

  await pgPool.end();
  sqlite.close();
  console.log("\n✅ Миграция завершена");
}

migrate().catch((err) => {
  console.error("Ошибка миграции:", err);
  process.exit(1);
});