const { createClient } = require("@libsql/client");
const fs = require("fs");
const path = require("path");

function findBackupFile(argPath) {
  if (argPath && fs.existsSync(argPath)) return argPath;

  const dirs = [
    process.cwd(),
    __dirname,
    path.join(__dirname, ".."),
  ];

  const names = [
    "audiobooks.beckap.db",
    "audiobooks.beckap",
    "audiobooks.backup",
    "audiobooks_backup.db",
    "audiobooks.db.backup",
    "audiobooks.bak",
  ];

  for (const dir of dirs) {
    for (const name of names) {
      const full = path.join(dir, name);
      if (fs.existsSync(full)) return full;
    }
  }
  return null;
}

function findTargetDb() {
  const candidates = [
    path.join(process.cwd(), "audiobooks.db"),
    path.join(__dirname, "audiobooks.db"),
    path.join(__dirname, "..", "audiobooks.db"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return path.join(process.cwd(), "audiobooks.db");
}

async function mergeDatabases() {
  const args = process.argv.slice(2);
  const targetDbPath = findTargetDb();
  const sourceDbPath = findBackupFile(args[0]);

  console.log(`\n=============================================================`);
  console.log(`🔄 ОБЪЕДИНЕНИЕ ДВУХ БАЗ ДАННЫХ АУДИОКНИГ (MERGE DATABASES)`);
  console.log(`=============================================================\n`);

  if (!sourceDbPath) {
    console.log(`❌ Ошибка: Файл бэкапа не найден!`);
    console.log(`Убедитесь, что файл audiobooks.beckap.db лежит рядом с audiobooks.db`);
    return;
  }

  if (!fs.existsSync(targetDbPath)) {
    console.log(`❌ Ошибка: Основной файл базы ${targetDbPath} не найден!`);
    return;
  }

  console.log(`📂 Бэкап (источник): ${path.basename(sourceDbPath)} (${(fs.statSync(sourceDbPath).size / (1024 * 1024)).toFixed(1)} МБ)`);
  console.log(`📂 Основная база (цель): ${path.basename(targetDbPath)} (${(fs.statSync(targetDbPath).size / (1024 * 1024)).toFixed(1)} МБ)\n`);

  const sourceClient = createClient({ url: `file:${sourceDbPath}` });
  const targetClient = createClient({ url: `file:${targetDbPath}` });

  const targetInitial = await targetClient.execute("SELECT COUNT(*) as cnt FROM books");
  const targetExistingIdsRes = await targetClient.execute("SELECT id FROM books");
  const targetExistingSet = new Set(targetExistingIdsRes.rows.map((r) => String(r.id)));
  console.log(`📊 В основной базе (audiobooks.db) сейчас: ${targetInitial.rows[0].cnt} книг.`);

  console.log(`⏳ Считываем книги из бэкапа (${path.basename(sourceDbPath)})...`);
  const sourceRes = await sourceClient.execute("SELECT * FROM books");
  console.log(`📦 В бэкапе найдено: ${sourceRes.rows.length} книг.\n`);

  let addedCount = 0;
  let duplicateCount = 0;

  console.log(`🚀 Начинаем перенос уникальных книг из бэкапа в основную базу...`);

  for (const book of sourceRes.rows) {
    const bookId = String(book.id);

    if (targetExistingSet.has(bookId)) {
      duplicateCount++;
      continue;
    }

    try {
      await targetClient.execute({
        sql: `INSERT OR IGNORE INTO books (
          id, title, author, narrator, genre, year, rating, narrator_rating,
          votes_count, listens_count, shelved_count, duration_seconds, duration_formatted,
          bitrate, file_size, cover_url, short_description, description, is_featured,
          tags, chapters, other_narrations, comments, series, series_next_book, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          book.id,
          book.title,
          book.author,
          book.narrator,
          book.genre,
          book.year,
          book.rating,
          book.narrator_rating,
          book.votes_count,
          book.listens_count,
          book.shelved_count,
          book.duration_seconds,
          book.duration_formatted,
          book.bitrate,
          book.file_size,
          book.cover_url,
          book.short_description,
          book.description,
          book.is_featured,
          book.tags,
          book.chapters,
          book.other_narrations,
          book.comments,
          book.series,
          book.series_next_book,
          book.created_at || Date.now(),
        ],
      });

      targetExistingSet.add(bookId);
      addedCount++;

      if (addedCount % 1000 === 0) {
        process.stdout.write(`\r  [+] Добавлено ${addedCount} новых книг из бэкапа...`);
      }
    } catch (e) {}
  }

  process.stdout.write(`\r                                                                               \r`);

  const finalRes = await targetClient.execute("SELECT COUNT(*) as cnt FROM books");

  console.log(`=============================================================`);
  console.log(`🎉 СЛИЯНИЕ УСПЕШНО ЗАВЕРШЕНО!`);
  console.log(`  • До слияния в audiobooks.db было: ${targetInitial.rows[0].cnt} книг`);
  console.log(`  • Проверено в бэкапе: ${sourceRes.rows.length} книг`);
  console.log(`  • Совпадений / дубликатов пропущено: ${duplicateCount}`);
  console.log(`  • Добавлено НОВЫХ уникальных книг из бэкапа: +${addedCount}`);
  console.log(`-------------------------------------------------------------`);
  console.log(`🏆 ИТОГО В ВАШЕЙ ЕДИНОЙ БАЗЕ (audiobooks.db): ${finalRes.rows[0].cnt} АУДИОКНИГ!`);
  console.log(`=============================================================\n`);
  console.log(`💡 Теперь Next.js видит ВСЕ объединённые книги в одном файле audiobooks.db!`);
}

mergeDatabases().catch(console.error);
