// migrate-v2.js
const { createClient } = require('@libsql/client');
const postgres = require('postgres');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const localDb = createClient({ url: `file:${path.join(process.cwd(), 'audiobooks.db')}` });

// Создаем подключение к PostgreSQL
// Параметр ssl: 'require' говорит драйверу использовать защищенное соединение, как того требует SpaceWeb
const sql = postgres({
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT),
  username: process.env.PGUSER, // В этом драйвере поле называется username
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: 'require', 
  max: 10, // Максимум одновременных соединений
});

async function migrate() {
  console.log('1. Читаем локальную базу SQLite...');
  const result = await localDb.execute('SELECT * FROM books');
  const books = result.rows;
  console.log(`✅ Найдено ${books.length} книг.`);

  console.log('2. Подключаемся к PostgreSQL...');
  try {
    await sql`SELECT NOW()`;
    console.log('✅ Подключение успешно!');
  } catch (err) {
    console.error('❌ Ошибка подключения:', err.message);
    if (err.message.includes('password authentication failed')) {
        console.error('👉 Проблема с паролем. Убедитесь, что в .env.local нет лишних символов.');
    }
    process.exit(1);
  }

  console.log('3. Заливаем данные (это займет время)...');
  let added = 0;
  
  for (const book of books) {
    const cleanBook = { ...book };
    // Чистим пустые строки для числовых полей
    ['year', 'votes_count', 'listens_count', 'shelved_count', 'duration_seconds', 'is_featured', 'created_at', 'rating', 'narrator_rating'].forEach(field => {
      if (cleanBook[field] === "" || cleanBook[field] === undefined) cleanBook[field] = null;
    });

    try {
      // Используем шаблонные строки для безопасной вставки
      await sql`
        INSERT INTO books ${sql(cleanBook)}
        ON CONFLICT (id) DO NOTHING
      `;
      added++;
    } catch (e) {
      // Показываем только первые ошибки
      if (added < 5) console.error('Ошибка вставки:', e.message);
    }
  }
  
  console.log(`\n🎉 Готово! Перенесено ${added} книг.`);
  await sql.end();
}

migrate().catch((err) => {
  console.error('Критическая ошибка:', err);
  process.exit(1);
});