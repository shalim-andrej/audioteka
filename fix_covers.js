/**
 * СКРИПТ ИСПРАВЛЕНИЯ КЛОНИРОВАННЫХ ОБЛОЖЕК
 * 
 * Устанавливает для каждой книги её РЕАЛЬНУЮ уникальную обложку
 * и удаляет дубликат в витрине «Главные хиты»!
 * 
 * Запуск:
 *   node fix_covers.js
 *   node scripts/fix_covers.js
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

async function fixCovers() {
  const dbPath = findDbPath();
  const client = createClient({ url: `file:${dbPath}` });

  console.log(`\n=============================================================`);
  console.log(`🎨 ИСПРАВЛЕНИЕ КЛОНИРОВАННЫХ ОБЛОЖЕК НА РЕАЛЬНЫЕ АРТЫ`);
  console.log(`📁 База данных: ${dbPath}`);
  console.log(`=============================================================\n`);

  // 1. Удаляем дублирующий алиас
  await client.execute("DELETE FROM books WHERE id = 'kvu-temnye-vremena'");
  console.log("🗑️  Удалён дубликат «Изгой. Тёмные времена»");

  // 2. Устанавливаем настоящие индивидуальные обложки
  const updates = [
    {
      id: "kvu-tjomnye-vremena",
      title: "Изгой. Тёмные времена",
      cover: "https://s5.knigavuhe.org/1/covers/16307/1-3.jpg?v=2",
    },
    {
      id: "kvu-20058-ternistyjj-put-vniz",
      title: "Герои Озёрного Края. Тернистый путь вниз",
      cover: "https://s5.knigavuhe.org/1/covers/20058/1-3.jpg?v=2",
    },
    {
      id: "kvu-20354-samyjj-strashnyjj-zver-1",
      title: "Самый страшный зверь",
      cover: "https://s5.knigavuhe.org/1/covers/20354/1-3.jpg?v=2",
    },
    {
      id: "kvu-vozvrashhenie-nizvergnutogo-1",
      title: "Возвращение низвергнутого",
      cover: "https://s5.knigavuhe.org/1/covers/16441/1-3.jpg?v=2",
    },
    {
      id: "kvu-krepost-nadezhdy",
      title: "Изгой. Крепость надежды",
      cover: "https://s5.knigavuhe.org/1/covers/1290/3-1.jpg?v=2",
    },
    {
      id: "kvu-gospodstvo-klana-nespjashhikh",
      title: "Господство Клана Неспящих",
      cover: "https://s5.knigavuhe.org/1/covers/8881/2-3.jpg?v=2",
    },
    {
      id: "kvu-nizshijj-1",
      title: "Низший. Книга 1",
      cover: "https://s5.knigavuhe.org/1/covers/21849/1-1.jpg?v=2",
    },
    {
      id: "kvu-azy-masterstva",
      title: "Азы мастерства",
      cover: "https://s5.knigavuhe.org/1/covers/18478/1-3.jpg?v=2",
    },
  ];

  for (const u of updates) {
    await client.execute({
      sql: "UPDATE books SET cover_url = ? WHERE id = ?",
      args: [u.cover, u.id],
    });
    console.log(`  🖼️  «${u.title}» ➔ Установлена оригинальная обложка!`);
  }

  console.log(`\n=============================================================`);
  console.log(`🎉 ВСЕ ОБЛОЖКИ ИСПРАВЛЕНЫ!`);
  console.log(`• Никаких клонов одной и той же картинки!`);
  console.log(`• У каждой книги свой оригинальный авторский арт.`);
  console.log(`• Перезапустите сервер (npm run dev) и обновите браузер (Ctrl + F5)!`);
  console.log(`=============================================================\n`);
}

fixCovers().catch(console.error);
