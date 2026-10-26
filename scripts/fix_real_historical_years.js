/**
 * СКРИПТ УСТАНОВКИ НАСТОЯЩИХ ИСТОРИЧЕСКИХ ГОДОВ КЛАССИКИ
 * 
 * 1. Возвращает классике её подлинные исторические года:
 *    • «Война и мир» (Лев Толстой) ➔ 1869 г.
 *    • «Мастер и Маргарита» (Михаил Булгаков) ➔ 1940 г.
 *    • «Преступление и наказание» (Фёдор Достоевский) ➔ 1866 г.
 *    • «1984» (Джордж Оруэлл) ➔ 1949 г.
 *    • «Собачье сердце» (Михаил Булгаков) ➔ 1925 г.
 *    • «Президиум ЭСМ» (Братья Стругацкие) ➔ 1961 г.
 *    • «Взлетно-посадочная полоса ноль-восемь» (Артур Хейли) ➔ 1958 г.
 *    • «Сувенир из Клуба мушкетёров» (Джеймс Хэдли Чейз) ➔ 1962 г.
 *    • «Пикник на обочине» (Братья Стругацкие) ➔ 1972 г.
 * 2. Убирает классиков из раздела «Новинки» в «Золотой фонд».
 * 3. В «Новинках» остаются только РЕАЛЬНЫЕ современные книги 2025–2026 гг.!
 * 
 * Запуск:
 *   node fix_real_historical_years.js
 *   node scripts/fix_real_historical_years.js
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

async function fixRealYears() {
  const dbPath = findDbPath();
  const client = createClient({ url: `file:${dbPath}` });

  console.log(`\n=============================================================`);
  console.log(`📚 УСТАНОВКА НАСТОЯЩИХ ИСТОРИЧЕСКИХ ДАТ ДЛЯ КЛАССИКИ`);
  console.log(`📁 База данных: ${dbPath}`);
  console.log(`=============================================================\n`);

  const realYears = [
    { title: "Мастер и Маргарита", year: 1940 },
    { title: "Война и мир", year: 1869 },
    { title: "1984", year: 1949 },
    { title: "Преступление и наказание", year: 1866 },
    { title: "Собачье сердце", year: 1925 },
    { title: "Президиум ЭСМ", year: 1961 },
    { title: "Сувенир из «Клуба мушкетёров»", year: 1962 },
    { title: "Взлетно-посадочная полоса ноль-восемь", year: 1958 },
    { title: "Пикник на обочине", year: 1972 },
    { title: "Трудно быть богом", year: 1964 },
    { title: "Приключения Шерлока Холмса", year: 1892 },
    { title: "Детство", year: 1852 },
    { title: "Мертвые души", year: 1842 },
    { title: "Ревизор", year: 1836 },
    { title: "Герой нашего времени", year: 1840 },
    { title: "Отцы и дети", year: 1862 },
    { title: "Поездка в Полесье", year: 1857 },
    { title: "Идиот", year: 1869 },
    { title: "Братья Карамазовы", year: 1880 },
    { title: "Белые ночи", year: 1848 },
    { title: "Горе от ума", year: 1825 },
    { title: "Евгений Онегин", year: 1833 },
    { title: "Капитанская дочка", year: 1836 },
  ];

  for (const c of realYears) {
    await client.execute({
      sql: "UPDATE books SET year = ? WHERE title LIKE ?",
      args: [c.year, "%" + c.title + "%"],
    });
    console.log(`  ✓ ${c.title} ➔ ${c.year} г.`);
  }

  // Обновляем реальные современные новинки 2025-2026 гг.
  await client.execute(`
    UPDATE books SET year = 2026 
    WHERE id IN ('kvu-poka-my-spali', 'kvu-chernyjj-mag-imperatora-21')
  `);
  await client.execute(`
    UPDATE books SET year = 2025 
    WHERE id IN ('kvu-staratel', 'kvu-stjazhatel', 'kvu-dvorec-snovidenijj', 'kvu-kusaka-10')
  `);

  console.log(`\n=============================================================`);
  console.log(`🎉 ГОТОВО! Историческая справедливость восстановлена:`);
  console.log(`• Булгаков — 1940 г., Толстой — 1869 г., Достоевский — 1866 г.`);
  console.log(`• Классика больше не лезет в раздел «Новинки».`);
  console.log(`• В «Новинках» — только свежие релизы 2025–2026 гг.!`);
  console.log(`• Перезапустите сервер (npm run dev) и обновите браузер (Ctrl + F5)!`);
  console.log(`=============================================================\n`);
}

fixRealYears().catch(console.error);
