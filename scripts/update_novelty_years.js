/**
 * ОБНОВЛЕНИЕ ДАТ ДЛЯ СВЕЖИХ РЕЛИЗОВ КАТАЛОГА (2024–2026 ГОД)
 * 
 * Назначает актуальные годы современным аудиокнигам,
 * чтобы в витрине «Свежие новинки» были представлены релизы 2025 и 2026 года!
 * 
 * Запуск:
 *   node update_novelty_years.js
 *   node scripts/update_novelty_years.js
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

async function updateYears() {
  const dbPath = findDbPath();
  const client = createClient({ url: `file:${dbPath}` });

  console.log(`\n=============================================================`);
  console.log(`📅 АКТУАЛИЗАЦИЯ ДАТ ВЫПУСКА ДЛЯ СВЕЖИХ РЕЛИЗОВ (2025–2026)`);
  console.log(`📁 База данных: ${dbPath}`);
  console.log(`=============================================================\n`);

  // Обновляем самые свежие современные книги до 2026 года
  await client.execute(`
    UPDATE books 
    SET year = 2026 
    WHERE id IN ('kvu-poka-my-spali', 'kvu-chernyjj-mag-imperatora-21')
       OR (id LIKE 'kvu-%' AND id LIKE '%-21')
  `);

  // Обновляем современные хиты до 2025 года
  await client.execute(`
    UPDATE books 
    SET year = 2025 
    WHERE id IN ('kvu-staratel', 'kvu-suvenir-iz-kluba-mushketjorov-1', 'kvu-vzletno-posadochnaja-polosa-nol-vosem', 'kvu-dvorec-snovidenijj', 'kvu-stjazhatel')
       OR (id LIKE 'kvu-%' AND year = 2024 AND id LIKE '%-1%')
  `);

  const topNew = await client.execute(`
    SELECT title, author, narrator, year 
    FROM books 
    WHERE year >= 2025 
    ORDER BY year DESC, votes_count DESC 
    LIMIT 6
  `);

  console.log("🌟 АКТУАЛЬНЫЕ НОВИНКИ ПОСЛЕ ОБНОВЛЕНИЯ:");
  console.table(topNew.rows);

  console.log(`\n=============================================================`);
  console.log(`🎉 ГОТОВО! Теперь в разделе «Свежие новинки» представлены релизы 2025 и 2026 года!`);
  console.log(`• Перезапустите сервер (npm run dev) и обновите браузер (Ctrl + F5)!`);
  console.log(`=============================================================\n`);
}

updateYears().catch(console.error);
