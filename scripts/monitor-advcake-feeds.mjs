// Monitor feed metadata only: never change the catalog database.
import { mkdir, writeFile, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
const pass = process.env.ADVCAKE_API_PASS;
if (!pass) { console.error('ADVCAKE_API_PASS is not set'); process.exit(1); }
try {
  const summaries = [];
  for (const kind of ['feeds', 'common-feeds']) {
    const u = new URL(`https://api.advcake.ru/${kind}`);
    u.search = new URLSearchParams({pass, offer_id:'957', limit:'100', offset:'0', type:'json'}).toString();
    const r = await fetch(u, {signal: AbortSignal.timeout(25000), redirect:'error'});
    if (!r.ok) throw new Error('request error');
    const data = await r.json();
    if (data.success !== true || !Array.isArray(data.data) || data.data.length >= 100) throw new Error('invalid or incomplete');
    for (const f of data.data) {
      if (Number(f.offer_id) !== 957) continue;
      summaries.push({kind, id: String(f.id ?? f.feed_id ?? ''), count: Number(f.products_count) || 0, lastDownload: String(f.last_download || '')});
    }
  }
  const promotions = resolve(process.env.ADVCAKE_PROMOTIONS_FILE || './data/advcake-promotions.json');
  const target = resolve(dirname(promotions), 'advcake-feeds-monitor.json');
  const temp = `${target}.${process.pid}.tmp`;
  await mkdir(dirname(target), {recursive:true});
  await writeFile(temp, JSON.stringify({checkedAt:new Date().toISOString(), feeds:summaries}, null, 2), {mode:0o600});
  await rename(temp, target);
  console.log(`Feed metadata checked: ${summaries.length}`);
} catch { console.error('Feed check failed; previous monitor data preserved.'); process.exitCode = 1; }
