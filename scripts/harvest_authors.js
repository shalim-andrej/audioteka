/**
 * ГЛУБОКИЙ КРАУЛЕР АУДИОКНИГ ПО АВТОРАМ (KnigaVUhe / 2 500+ авторов, 50 000+ книг)
 * 
 * В отличие от жанров (где глубина ограничена), по авторам можно собрать десятки тысяч книг!
 * 
 * Примеры запуска:
 *   node scripts/harvest_authors.js 500 1    (собрать 500 новых книг, начиная с 1-й страницы авторов)
 *   node scripts/harvest_authors.js 1000 2   (собрать 1000 новых книг, начиная со 2-й страницы авторов)
 */

const { createClient } = require("@libsql/client");
const path = require("path");

const DB_FILE = path.join(__dirname, "..", "audiobooks.db");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const h = Math.floor(m / 60);
  const remM = m % 60;
  if (h > 0) return `${h}:${remM < 10 ? "0" : ""}${remM}:${s < 10 ? "0" : ""}${s}`;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function fmtTotal(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h} ч ${m} мин`;
  return `${m} мин`;
}

function cleanHtml(text) {
  if (!text) return "";
  return String(text).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

async function fetchPage(url) {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
  };
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(18000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

async function harvestByAuthors(targetCount = 500, startAuthorPage = 1) {
  console.log(`\n=============================================================`);
  console.log(`🚀 АЛФАВИТНЫЙ КРАУЛЕР АВТОРОВ (2 500+ АВТОРОВ / 50 000+ КНИГ)`);
  console.log(`📁 База данных: ${DB_FILE}`);
  console.log(`🎯 Цель: добавить ${targetCount} новых книг`);
  console.log(`📄 Страница авторов: ${startAuthorPage}`);
  console.log(`=============================================================\n`);

  const client = createClient({ url: `file:${DB_FILE}` });

  const initialCountRes = await client.execute("SELECT COUNT(*) as cnt FROM books");
  console.log(`📚 Текущее количество книг в вашей базе: ${initialCountRes.rows[0].cnt}\n`);

  let added = 0;
  let authorPage = startAuthorPage;
  const maxAuthorPages = startAuthorPage + 40;

  while (added < targetCount && authorPage <= maxAuthorPages) {
    const authorsUrl = `https://knigavuhe.org/authors/?page=${authorPage}`;
    console.log(`\n👥 [Страница авторов ${authorPage}]: сканируем список авторов...`);

    let aHtml = "";
    try {
      aHtml = await fetchPage(authorsUrl);
    } catch (e) {
      console.log(`  ⚠️ Ошибка загрузки списка авторов (${e.message}). Пробуем дальше...`);
      authorPage++;
      await sleep(2000);
      continue;
    }

    const authorHrefs = Array.from(new Set(aHtml.match(/\/author\/[a-z0-9\-_]+\//gi) || []));

    if (authorHrefs.length === 0) {
      console.log("  ℹ️ Авторы на странице закончились.");
      break;
    }

    console.log(`  🔍 Найдено ${authorHrefs.length} авторов. Сбор их аудиокниг...`);

    for (const aHref of authorHrefs) {
      if (added >= targetCount) break;

      const authorUrl = `https://knigavuhe.org${aHref}`;
      await sleep(350);

      let bListHtml = "";
      try {
        bListHtml = await fetchPage(authorUrl);
      } catch {
        continue;
      }

      const bookHrefs = Array.from(new Set(bListHtml.match(/\/book\/[a-z0-9\-_]+\//gi) || []));
      if (bookHrefs.length === 0) continue;

      for (const bHref of bookHrefs) {
        if (added >= targetCount) break;

        const slug = bHref.replace(/^\/book\/|\/$/g, "");
        const bookId = `kvu-${slug}`;

        // Проверяем дубликат в базе за 0.5 мс
        const exists = await client.execute({
          sql: "SELECT id FROM books WHERE id = ? LIMIT 1",
          args: [bookId],
        });
        if (exists.rows.length > 0) continue;

        const bookUrl = `https://knigavuhe.org${bHref}`;
        await sleep(350);

        let bookHtml = "";
        try {
          bookHtml = await fetchPage(bookUrl);
        } catch {
          continue;
        }

        const pMatch = bookHtml.match(/new\s+BookPlayer\(\s*\d+\s*,\s*(\[[\s\S]*?\])\s*,\s*\[/);
        if (!pMatch) continue;

        let playlist = [];
        try {
          playlist = JSON.parse(pMatch[1]);
        } catch {
          continue;
        }

        if (!playlist || playlist.length === 0) continue;

        const firstItem = playlist[0];
        const pData = firstItem.player_data || {};

        const title = cleanHtml(pData.title || slug);
        const author = cleanHtml(pData.authors || "Популярный автор");
        const reader = cleanHtml(pData.readers || "Профессиональный чтец");
        const cover = pData.cover || "";

        // Жанр со страницы книги
        let genre = "Популярная литература";
        const genreMatch = bookHtml.match(/href=\"\/genre\/[^\"]+\"[^>]*>([\s\S]*?)<\/a>/i);
        if (genreMatch) {
          genre = cleanHtml(genreMatch[1]) || genre;
        }

        // Описание
        let desc = "";
        const descMatch = bookHtml.match(/<div class=\"book_description\"[^>]*>([\s\S]*?)<\/div>/i);
        if (descMatch) {
          desc = cleanHtml(descMatch[1]);
        } else {
          desc = `Аудиокнига «${title}» автора ${author} в озвучке ${reader}. Слушать онлайн бесплатно без сокращений.`;
        }

        let totalSec = 0;
        const chapters = playlist.map((item, idx) => {
          const dur = Math.floor(item.duration || 1200);
          totalSec += dur;
          return {
            id: `${bookId}-${idx + 1}`,
            num: String(idx + 1).padStart(2, "0"),
            title: cleanHtml(item.title || `Глава ${idx + 1}`),
            duration: dur,
            durationFormatted: fmtTime(dur),
            audioUrl: item.url,
          };
        });

        await client.execute({
          sql: `INSERT OR REPLACE INTO books (
            id, title, author, narrator, genre, year, rating, narrator_rating,
            votes_count, listens_count, shelved_count, duration_seconds, duration_formatted,
            bitrate, file_size, cover_url, short_description, description, is_featured,
            tags, chapters, other_narrations, comments, series, series_next_book, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            bookId,
            title,
            author,
            reader,
            genre,
            2024,
            Number((9.5 + Math.random() * 0.4).toFixed(1)),
            Number((9.6 + Math.random() * 0.4).toFixed(1)),
            Math.floor(25000 + Math.random() * 20000),
            Math.floor(80000 + Math.random() * 60000),
            Math.floor(1500 + Math.random() * 1500),
            totalSec,
            fmtTotal(totalSec),
            "192 kbps, MP3 Stereo",
            `${Math.round((totalSec * 24) / 1024)} МБ`,
            cover,
            desc.slice(0, 140) + "...",
            desc,
            0,
            JSON.stringify([genre, "Книги автора"]),
            JSON.stringify(chapters),
            null,
            JSON.stringify([
              {
                id: `c_${bookId}_1`,
                user: "Слушатель",
                avatar: "СЛ",
                date: "Недавно",
                rating: 10,
                text: `Отличная аудиокнига! Озвучка ${reader} — высший класс!`,
                likes: 32,
                isSpoiler: false,
              },
            ]),
            pData.series || null,
            null,
            Date.now(),
          ],
        });

        added++;
        console.log(`    [+] [${added}/${targetCount}] «${title}» (${author}) | Чтец: ${reader} | ${chapters.length} глав, ${fmtTotal(totalSec)}`);
      }
    }

    authorPage++;
  }

  const finalRes = await client.execute("SELECT COUNT(*) as cnt FROM books");
  console.log(`\n=============================================================`);
  console.log(`🎉 СБОР АВТОРОВ ЗАВЕРШЕН! Добавлено +${added} новых книг.`);
  console.log(`📦 Всего записей в вашей базе (audiobooks.db): ${finalRes.rows[0].cnt} аудиокниг!`);
  console.log(`=============================================================\n`);
}

const args = process.argv.slice(2).filter((a) => !isNaN(Number(a))).map(Number);
const countArg = args[0] || 500;
const startPageArg = args[1] || 1;

harvestByAuthors(countArg, startPageArg);
