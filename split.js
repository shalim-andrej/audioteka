const fs = require('fs');

const INPUT_FILE = 'books_import.sql';
const CHUNK_SIZE = 500; // По 500 записей (чтобы точно пролезло в phpPgAdmin)

if (!fs.existsSync(INPUT_FILE)) {
  console.error(`❌ Файл ${INPUT_FILE} не найден!`);
  process.exit(1);
}

const content = fs.readFileSync(INPUT_FILE, 'utf8');
const statements = content.split(';\n').filter(s => s.trim() !== '');
const totalChunks = Math.ceil(statements.length / CHUNK_SIZE);

console.log(`Всего записей: ${statements.length}. Будет создано файлов: ${totalChunks}`);

for (let i = 0; i < totalChunks; i++) {
  const chunk = statements.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE).map(s => s + ';').join('\n');
  const fileName = `import_part_${i + 1}.sql`;
  fs.writeFileSync(fileName, chunk, 'utf8');
  console.log(`✅ Создан ${fileName}`);
}

console.log('🎉 Готово! Теперь загрузи эти файлы в public_html и импортируй через phpPgAdmin.');