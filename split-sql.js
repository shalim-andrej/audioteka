// split-sql.js
const fs = require('fs');
const INPUT_FILE = 'books_import.sql';
const CHUNK_SIZE = 5000;

async function splitFile() {
  console.log(`Читаем файл ${INPUT_FILE}...`);
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ Ошибка: Файл ${INPUT_FILE} не найден!`);
    return;
  }
  const content = fs.readFileSync(INPUT_FILE, 'utf8');
  const statements = content.split(';\n').filter(stmt => stmt.trim() !== '');
  const totalChunks = Math.ceil(statements.length / CHUNK_SIZE);
  
  console.log(`Всего запросов: ${statements.length}. Будет создано файлов: ${totalChunks}`);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = start + CHUNK_SIZE;
    const chunk = statements.slice(start, end).map(stmt => stmt + ';').join('\n');
    const fileName = `import_part_${i + 1}.sql`;
    fs.writeFileSync(fileName, chunk, 'utf8');
    console.log(`✅ Создан файл: ${fileName}`);
  }
  console.log('🎉 Готово!');
}
splitFile().catch(console.error);