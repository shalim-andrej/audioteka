import 'server-only';
import { getDb, initDb } from '@/lib/db';
export type Category = { id: string; parentId: string | null; name: string };
export async function getCategories(): Promise<Category[]> {
  try {
    await initDb();
    const r = await getDb().execute('SELECT id, parent_id, name FROM litres_categories ORDER BY name');
    return r.rows.map(row => ({id:String(row.id), parentId:row.parent_id == null ? null : String(row.parent_id), name:String(row.name)}));
  } catch { return []; }
}
