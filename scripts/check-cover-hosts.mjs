// scripts/check-cover-hosts.mjs
// Проверка доменов, с которых грузятся обложки.
//
// Зачем: браузер держит вкладку в состоянии «загружается», пока не получит
// ответ по каждой картинке. Если хост обложек мёртв или отвечает медленно,
// страница висит секундами, хотя весь текст уже отрисован.
//
// Запуск для проверки:
//   node .\scripts\check-cover-hosts.mjs
//
// Запуск с очисткой обложек с плохих доменов:
//   node .\scripts\check-cover-hosts.mjs --fix
//
// Скрипт пишет отчёт в cover-hosts-report.txt (UTF-8).

import { createClient } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

const FIX = process.argv.includes("--fix");
const TIMEOUT_MS = 6000;   // сколько ждём ответа от домена
const SLOW_MS = 3000;      // медленнее этого — считаем проблемным

const dbPath = path.join(process.cwd(), "audiobooks.db");
const client = createClient({ url: `file:${dbPath}` });

const out = [];
const say = (line) => {
  out.push(line);
  console.log(line);
};

/** Вытаскивает hostname из URL. Возвращает "" если не получилось. */
function hostOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

/** Проверяет один адрес: статус и время ответа в миллисекундах. */
async function probe(url) {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "user-agent": "Mozilla/5.0 AudioCheck/1.0" },
    });
    // Тело не нужно — сразу закрываем соединение
    try {
      if (res.body) await res.body.cancel();
    } catch {}
    return { ok: res.ok, status: res.status, ms: Date.now() - started };
  } catch (error) {
    const name = error?.name || "";
    return {
      ok: false,
      status: name === "TimeoutError" ? "таймаут" : "ошибка",
      ms: Date.now() - started,
    };
  }
}

async function main() {
  say("=== Проверка доменов обложек ===");
  say(`база: ${dbPath}`);
  say(`таймаут запроса: ${TIMEOUT_MS} мс, «медленно» — больше ${SLOW_MS} мс`);
  say("");

  const res = await client.execute({
    sql: `SELECT cover_url FROM books
          WHERE cover_url IS NOT NULL AND cover_url != '' AND cover_url NOT LIKE 'data:%'`,
    args: [],
  });

  say(`книг с обычной ссылкой на обложку: ${res.rows.length}`);

  // Группируем по домену: на каждый домен хватит одного образца
  const byHost = new Map(); // host -> { count, sample }
  for (const row of res.rows) {
    const url = String(row.cover_url || "");
    const host = hostOf(url);
    if (!host) continue;
    const entry = byHost.get(host);
    if (entry) entry.count += 1;
    else byHost.set(host, { count: 1, sample: url });
  }

  say(`уникальных доменов: ${byHost.size}`);
  say("");

  if (byHost.size === 0) {
    say("обложек с внешних доменов нет — проверять нечего");
    fs.writeFileSync("cover-hosts-report.txt", out.join("\r\n"), "utf8");
    client.close();
    return;
  }

  const badHosts = [];

  for (const [host, info] of byHost) {
    const result = await probe(info.sample);
    const verdict = !result.ok || result.ms > SLOW_MS ? "ПЛОХО" : "ок";
    say(
      `${String(result.ms).padStart(6)} мс  статус ${String(result.status).padEnd(8)} ` +
        `${verdict.padEnd(6)} ${host}  (книг: ${info.count})`
    );
    if (verdict === "ПЛОХО") badHosts.push({ host, count: info.count });
  }

  say("");

  if (badHosts.length === 0) {
    say("Все домены отвечают нормально. Значит задержка не в обложках.");
    fs.writeFileSync("cover-hosts-report.txt", out.join("\r\n"), "utf8");
    console.log("\nотчёт: cover-hosts-report.txt");
    client.close();
    return;
  }

  const totalBad = badHosts.reduce((sum, h) => sum + h.count, 0);
  say(`проблемных доменов: ${badHosts.length}, книг с их обложками: ${totalBad}`);
  for (const h of badHosts) say(`  - ${h.host} (книг: ${h.count})`);
  say("");

  if (!FIX) {
    say("Ничего не менял. Чтобы убрать обложки с этих доменов, запустите:");
    say("  node .\\scripts\\check-cover-hosts.mjs --fix");
  } else {
    say("Убираю обложки с проблемных доменов…");
    let affected = 0;
    for (const h of badHosts) {
      const upd = await client.execute({
        sql: "UPDATE books SET cover_url = '' WHERE cover_url LIKE ?",
        args: [`%${h.host}%`],
      });
      say(`  ${h.host}: обнулено ${upd.rowsAffected}`);
      affected += upd.rowsAffected;
    }
    say("");
    say(`итого обнулено обложек: ${affected}`);
    say("вместо картинки карточка покажет градиент с названием");

    const after = await client.execute({
      sql: "SELECT COUNT(*) AS cnt FROM books WHERE cover_url LIKE '%http%'",
      args: [],
    });
    say(`книг с внешними обложками осталось: ${Number(after.rows[0]?.cnt || 0)}`);
  }

  say("");
  say("=== конец ===");
  fs.writeFileSync("cover-hosts-report.txt", out.join("\r\n"), "utf8");
  console.log("\nотчёт: cover-hosts-report.txt");
  client.close();
}

main().catch((error) => {
  console.error("ошибка:", error);
  process.exit(1);
});