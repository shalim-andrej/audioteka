/**
 * СКРИПТ ОЧИСТКИ БАЗЫ ДАННЫХ ОТ 20-МИНУТНЫХ ДЕМО-ОБРЕЗКОВ ЛИТРЕС
 * 
 * Удаляет все книги, которые оказались рекламными ознакомительными фрагментами (audiotrial),
 * чтобы в базе остались ТОЛЬКО ПОЛНЫЕ версии аудиокниг!
 * 
 * Запуск:
 *   node scripts/remove_trial_demos.js
 *   node remove_trial_demos.js
 */

const { createClient } = require("@libsql/client");
const path = require("path");
const fs = require("fs");

function findDbPath() {
  const candidates = [
    path.join(process.cwd(), "audiobooks.db"),
    path.join(__dirname, "..", "audiobooks.db"),
    path.join(__dirname, "audiobooks.db"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return path.join(process.cwd(), "audiobooks.db");
}

async function removeDemos() {
  const dbPath = findDbPath();
  const client = createClient({ url: `file:${dbPath}` });

  console.log(`\n=============================================================`);
  console.log(`🧹 ОЧИСТКА БАЗЫ ДАННЫХ ОТ ДЕМО-ФРАГМЕНТОВ ЛИТРЕС (20 МИНУТ)`);
  console.log(`📁 База данных: ${dbPath}`);
  console.log(`=============================================================\n`);

  const countBefore = await client.execute("SELECT COUNT(*) as cnt FROM books");
  console.log(`📊 Всего книг в вашей базе ДО очистки: ${countBefore.rows[0].cnt}`);

  console.log("🔍 Удаление рекламных фрагментов litres.ru/audiotrial...");
  await client.execute(`
    DELETE FROM books 
    WHERE chapters LIKE '%litres.ru/audiotrial%' 
       OR chapters LIKE '%/audiotrial/%'
  `);

  const countAfter = await client.execute("SELECT COUNT(*) as cnt FROM books");
  const removed = Number(countBefore.rows[0].cnt) - Number(countAfter.rows[0].cnt);

  console.log(`\n=============================================================`);
  console.log(`✅ УДАЛЕНО ДЕМО-ОБРЕЗКОВ: ${removed} шт.`);
  console.log(`🏆 ОСТАЛОСЬ ПОЛНЫХ НАСТОЯЩИХ АУДИОКНИГ: ${countAfter.rows[0].cnt} шт.!`);
  console.log(`=============================================================\n`);
  console.log(`💡 Теперь в вашей базе нет ни одного рекламного 20-минутного огрызка Литрес!`);
}

removeDemos().catch(console.error);
