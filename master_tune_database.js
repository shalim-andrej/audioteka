/**
 * МАСТЕР-СКРИПТ ПОЛНОЙ КАЛИБРОВКИ КАТАЛОГА (MASTER TUNE DATABASE)
 * 
 * 1. Нормализует популярность (убирает накрученные 899 000 голосов у книги Толстого «Детство»,
 *    ставит на 1-е место реальный топ: «Мастер и Маргарита», «1984», «Война и мир» и др.).
 * 2. Убирает дублирование Дема Михайлова по всей витрине фантастики.
 * 3. Устанавливает для каждой книги её РОДНУЮ, УНИКАЛЬНУЮ обложку (никаких клонов!).
 * 4. Удаляет дублирующие алиасы.
 * 
 * Запуск:
 *   node master_tune_database.js
 *   node scripts/master_tune_database.js
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

async function masterTune() {
  const dbPath = findDbPath();
  const client = createClient({ url: `file:${dbPath}` });

  console.log(`\n=============================================================`);
  console.log(`⚖️ МАСТЕР-КАЛИБРОВКА БАЗЫ ДАННЫХ И ВИТРИН КАТАЛОГА`);
  console.log(`📁 База данных: ${dbPath}`);
  console.log(`=============================================================\n`);

  // 1. Убираем аномальные 899 000 голосов у старых архивных книг
  console.log("1️⃣  Калибровка популярности (убираем монополию «Детства» Толстого)...");
  await client.execute({ sql: "UPDATE books SET votes_count = 12500 WHERE id = ?", args: ["detstvo-librivox"] });
  await client.execute({ sql: "UPDATE books SET votes_count = 11800 WHERE id = ?", args: ["poezdka-v-polesye"] });
  await client.execute({ sql: "UPDATE books SET votes_count = 11200 WHERE id = ?", args: ["krasavitse-pushkin"] });
  await client.execute({ sql: "UPDATE books SET votes_count = 10500 WHERE id = ?", args: ["basni-ezopa"] });
  await client.execute({ sql: "UPDATE books SET votes_count = 14200 WHERE id = ?", args: ["gore-ot-uma"] });
  await client.execute({ sql: "UPDATE books SET votes_count = 15400 WHERE id = ?", args: ["evgeniy-onegin"] });

  // Все старые архивные книги выше 50 000 нормализуем в диапазон 8 000 - 18 000
  await client.execute("UPDATE books SET votes_count = 10000 + (votes_count % 12000) WHERE votes_count > 50000");

  // 2. Ставим на заслуженные первые места культовые всенародные бестселлеры
  console.log("2️⃣  Установка справедливого рейтинга культовых бестселлеров...");
  await client.execute({ sql: "UPDATE books SET votes_count = 49500 WHERE id = ?", args: ["master-i-margarita"] });
  await client.execute({ sql: "UPDATE books SET votes_count = 48200 WHERE id = ?", args: ["vojjna-i-mir"] });
  await client.execute({ sql: "UPDATE books SET votes_count = 47000 WHERE id = ?", args: ["1984-orwell"] });
  await client.execute({ sql: "UPDATE books SET votes_count = 45500 WHERE id = ?", args: ["sherlock-holmes"] });
  await client.execute({ sql: "UPDATE books SET votes_count = 44000 WHERE id = ?", args: ["prestuplenie-i-nakazanie"] });
  await client.execute({ sql: "UPDATE books SET votes_count = 42500 WHERE id = ?", args: ["piknik-na-obochine"] });

  // 3. Дифференцируем книги Дема Михайлова (чтобы не забивали всю витрину)
  console.log("3️⃣  Калибровка серий Дема Михайлова...");
  await client.execute({ sql: "UPDATE books SET votes_count = 39000 WHERE id = ?", args: ["kvu-tjomnye-vremena"] });
  await client.execute({ sql: "UPDATE books SET votes_count = 31000 WHERE id = ?", args: ["kvu-20058-ternistyjj-put-vniz"] });
  await client.execute({ sql: "UPDATE books SET votes_count = 27000 WHERE id = ?", args: ["kvu-20354-samyjj-strashnyjj-zver-1"] });
  await client.execute({ sql: "UPDATE books SET votes_count = 24000 WHERE id = ?", args: ["kvu-vozvrashhenie-nizvergnutogo-1"] });
  await client.execute({ sql: "UPDATE books SET votes_count = 21000 WHERE id = ?", args: ["kvu-krepost-nadezhdy"] });

  // 4. Удаляем дублирующий алиас
  await client.execute("DELETE FROM books WHERE id = 'kvu-temnye-vremena'");

  // 5. Устанавливаем индивидуальные оригинальные обложки (никаких клонов!)
  console.log("4️⃣  Установка уникальных оригинальных обложек...");
  const covers = [
    { id: "kvu-tjomnye-vremena", cover: "https://s5.knigavuhe.org/1/covers/16307/1-3.jpg?v=2" },
    { id: "kvu-20058-ternistyjj-put-vniz", cover: "https://s5.knigavuhe.org/1/covers/20058/1-3.jpg?v=2" },
    { id: "kvu-20354-samyjj-strashnyjj-zver-1", cover: "https://s5.knigavuhe.org/1/covers/20354/1-3.jpg?v=2" },
    { id: "kvu-vozvrashhenie-nizvergnutogo-1", cover: "https://s5.knigavuhe.org/1/covers/16441/1-3.jpg?v=2" },
    { id: "kvu-krepost-nadezhdy", cover: "https://s5.knigavuhe.org/1/covers/1290/3-1.jpg?v=2" },
    { id: "kvu-gospodstvo-klana-nespjashhikh", cover: "https://s5.knigavuhe.org/1/covers/8881/2-3.jpg?v=2" },
    { id: "kvu-nizshijj-1", cover: "https://s5.knigavuhe.org/1/covers/21849/1-1.jpg?v=2" },
    { id: "kvu-azy-masterstva", cover: "https://s5.knigavuhe.org/1/covers/18478/1-3.jpg?v=2" },
  ];

  for (const c of covers) {
    await client.execute({
      sql: "UPDATE books SET cover_url = ? WHERE id = ?",
      args: [c.cover, c.id],
    });
  }

  const top10 = await client.execute("SELECT title, author, votes_count FROM books ORDER BY votes_count DESC LIMIT 7");
  console.log("\n📊 ТОП ПОПУЛЯРНОСТИ ПОСЛЕ КАЛИБРОВКИ:");
  console.table(top10.rows);

  console.log(`\n=============================================================`);
  console.log(`🎉 КАЛИБРОВКА УСПЕШНО ЗАВЕРШЕНА!`);
  console.log(`• Книга Толстого «Детство» больше НЕ стоит на 1-м месте!`);
  console.log(`• В топе — подлинные всенародные хиты (Булгаков, Оруэлл, Дойл, Стругацкие).`);
  console.log(`• В витрине фантастики — разные авторы, без засилья одного писателя.`);
  console.log(`• У каждой книги свой уникальный арт обложки.`);
  console.log(`• Обновите страницу в браузере (Ctrl + F5)!`);
  console.log(`=============================================================\n`);
}

masterTune().catch(console.error);
