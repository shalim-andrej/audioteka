const fs = require('fs');
const INPUT_FILE = 'books_import.sql';
const CHUNK_SIZE = 50; // 50 записей

const content = fs.readFileSync(INPUT_FILE, 'utf8');
const statements = content.split(';\n').filter(s => s.trim() !== '');
const totalChunks = Math.ceil(statements.length / CHUNK_SIZE);

for (let i = 0; i < totalChunks; i++) {
  const chunk = statements.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE).map(s => s + ';').join('\n');
  fs.writeFileSync(`import_part_${i + 1}.sql`, chunk, 'utf8');
  console.log(`✅ import_part_${i + 1}.sql`);
}