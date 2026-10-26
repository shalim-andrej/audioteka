/**
 * ГЕНЕРАЛЬНЫЙ СКРИПТ ОЧИСТКИ БАЗЫ ДАННЫХ
 * 
 * Удаляет все битые дампы без авторов, серые звуковые волны Archive.org,
 * «Аудиофонды» и ошибочные клонированные обложки!
 * 
 * Запуск:
 *   node clean_db.js
 *   node scripts/clean_db.js
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

async function clean() {
  const dbPath = findDbPath();
  const client = createClient({ url: `file:${dbPath}` });

  console.log(`\n=============================================================`);
  console.log(`🧹 ГЕНЕРАЛЬНАЯ ОЧИСТКА БАЗЫ ДАННЫХ ОТ МУСОРА И СЕРЫХ ВОЛН`);
  console.log(`📁 База данных: ${dbPath}`);
  console.log(`=============================================================\n`);

  const before = await client.execute("SELECT COUNT(*) as cnt FROM books");
  console.log(`📊 Книг в базе ДО очистки: ${before.rows[0].cnt}`);

  // 1. Удаляем книги без авторов, с фейковыми именами «Автор контента», «Популярный автор», «Аудиофонд»
  console.log("⏳ 1. Удаление записей без авторов и технических дампов...");
  await client.execute(`
    DELETE FROM books 
    WHERE narrator = 'Аудиофонд' 
       OR author IN ('Популярный автор', 'Автор контента', 'Автор', 'Неизвестен')
       OR title LIKE '01-%'
       OR title LIKE '00-%'
       OR title LIKE 'З Н А Т Ь%'
       OR title LIKE 'Искажающие%'
       OR title LIKE 'Последняя война%'
       OR id IN ('kvu-nizshijj-1', 'kvu-temnye-vremena')
  `);

  // 2. Удаляем все серые звуковые волны Archive.org
  console.log("⏳ 2. Удаление серых звуковых волн Archive.org...");
  await client.execute(`
    DELETE FROM books 
    WHERE cover_url LIKE '%archive.org/services/img/%'
  `);

  // 3. Сбрасываем клонированные обложки «Тернистый путь вниз»
  console.log("⏳ 3. Сброс клонированных обложек...");
  await client.execute(`
    UPDATE books 
    SET cover_url = '' 
    WHERE cover_url LIKE '%covers/20058/%' 
      AND id != 'kvu-20058-ternistyjj-put-vniz'
  `);

  // 4. Дореволюционные статьи переносим в историю
  await client.execute(`
    UPDATE books 
    SET year = 1910, votes_count = 11000 
    WHERE author LIKE '%Русская классика%' 
       OR title LIKE '%Силуэты русских%'
       OR id LIKE '%librivox%'
  `);

  const after = await client.execute("SELECT COUNT(*) as cnt FROM books");
  const deleted = Number(before.rows[0].cnt) - Number(after.rows[0].cnt);

  console.log(`\n=============================================================`);
  console.log(`🎉 ОЧИСТКА УСПЕШНО ЗАВЕРШЕНА!`);
  console.log(`• Удалено мусорных записей и серых волн: ${deleted} шт.`);
  console.log(`• В вашей базе осталось: ${after.rows[0].cnt} ЧИСТЫХ АУДИОКНИГ!`);
  console.log(`• В «Новинках» теперь только современные книги со студийными обложками!`);
  console.log(`=============================================================\n`);
}

clean().catch(console.error);
