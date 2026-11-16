// Синхронизация только подтверждённых акций. БД сайта не открывает.
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const accepted = new Map([
  ['pr42462', 'Скидка 20% на весь каталог Литрес'],
  ['pr42463', 'Скидка 50% на год Литрес Подписки'],
]);
const password = process.env.ADVCAKE_API_PASS;
if (!password) { console.error('Не задан ADVCAKE_API_PASS.'); process.exit(1); }
const target = resolve(process.env.ADVCAKE_PROMOTIONS_FILE || './data/advcake-promotions.json');
const endpoint = new URL('https://api.advcake.ru/promotions');
endpoint.search = new URLSearchParams({ pass: password, offer_id: '957', limit: '100', offset: '0', type: 'json' }).toString();
try {
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(25000), redirect: 'error' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const result = await response.json();
  if (result.success !== true || !Array.isArray(result.data) || result.data.length >= 100) throw new Error('Неполный или неверный ответ API');
  const records = [];
  for (const x of result.data) {
    if (Number(x.offer_id) !== 957 || !accepted.has(x.id) || x.title !== accepted.get(x.id) || x.active !== true || x.status !== 'active' || x.has_disposable_promocodes !== false) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(x.date_start || '') || !/^\d{4}-\d{2}-\d{2}$/.test(x.date_end || '') || x.date_start > x.date_end) continue;
    if (typeof x.ad_marking !== 'string' || !x.ad_marking.includes('erid:')) continue;
    const landing = (Array.isArray(x.landings) ? x.landings : []).find(l => {
      try { const u = new URL(l.link); return u.protocol === 'https:' && !u.username && !u.password && ['litres.ru','www.litres.ru'].includes(u.hostname) && !!u.searchParams.get('erid'); } catch { return false; }
    });
    if (!landing) continue;
    records.push({ id: x.id, title: x.title, start: x.date_start, end: x.date_end, url: landing.link, marking: x.ad_marking.slice(0, 500), description: typeof x.description === 'string' ? x.description.slice(0, 1000) : '' });
  }
  // Monitoring is private and does not automatically publish unknown terms.
  const candidates = result.data.filter(x => Number(x.offer_id) === 957 && !accepted.has(x.id)).map(x => ({id: String(x.id), title: String(x.title || '').slice(0, 200), start: x.date_start, end: x.date_end, active: x.active === true}));
  await mkdir(dirname(target), { recursive: true });
  const tmp = `${target}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify({ updatedAt: new Date().toISOString(), promotions: records }, null, 2), { mode: 0o600 });
  const monitor = resolve(dirname(target), 'advcake-review.json');
  const monitorTmp = `${monitor}.${process.pid}.tmp`;
  await writeFile(monitorTmp, JSON.stringify({ updatedAt: new Date().toISOString(), candidates }, null, 2), { mode: 0o600 });
  await rename(monitorTmp, monitor);
  await rename(tmp, target);
  console.log(`Обновлено предложений: ${records.length}; на проверку: ${candidates.length}.`);
} catch (error) {
  // Не выводим error.message: он может содержать URL с секретом.
  console.error('Ошибка обновления AdvCake; предыдущие данные не изменены.');
  process.exitCode = 1;
}
