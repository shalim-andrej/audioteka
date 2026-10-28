import { NextResponse } from "next/server";
import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";

export async function POST() {
  try {
    const pool = new Pool({
      host: process.env.PGHOST || "pg4.sweb.ru",
      port: Number(process.env.PGPORT) || 5433,
      user: process.env.PGUSER || "xn217xnp1a",
      password: process.env.PGPASSWORD || "AudioPass2026",
      database: process.env.PGDATABASE || "xn217xnpla",
    });

    const targetDir = "/home/xn217xnp1a/public_html/";

    if (!fs.existsSync(targetDir)) {
      return NextResponse.json(
        { error: `Directory ${targetDir} not found on server` },
        { status: 404 }
      );
    }

    const files = fs
      .readdirSync(targetDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    if (files.length === 0) {
      return NextResponse.json(
        { error: `No .sql files found in ${targetDir}` },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      for (const file of files) {
        const fullPath = path.join(targetDir, file);
        const sql = fs.readFileSync(fullPath, "utf8");
        const statements = sql
          .split(";")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        for (const stmt of statements) {
          await client.query(stmt);
        }
        console.log(`Executed: ${file} (${statements.length} statements)`);
      }
    } finally {
      client.release();
      await pool.end();
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${files.length} files`,
      files,
      dir: targetDir,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}