"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
type Cat = {id:string; name:string; parentId:string | null};
export default function CategoryPicker({onChoose}: {onChoose:() => void}) {
  const [items,setItems] = useState<Cat[]>([]);
  const [query,setQuery] = useState('');
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState(false);
  useEffect(() => { const controller = new AbortController(); fetch('/api/categories',{signal:controller.signal,cache:'no-store'}).then(r=>{if (!r.ok) throw Error();return r.json()}).then(data=>{if(!Array.isArray(data.categories)) throw Error();setItems(data.categories);setLoading(false)}).catch(e=>{if(e.name!=='AbortError'){setError(true);setLoading(false)}});return ()=>controller.abort(); },[]);
  const found = items.filter(x=>x.name.toLocaleLowerCase('ru').includes(query.trim().toLocaleLowerCase('ru')));
  return <div className="space-y-2">
    <label htmlFor="category-search" className="block px-2 text-xs text-gray-300">Категории Литрес</label>
    <input id="category-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Поиск категории" className="w-full rounded-lg border border-white/15 bg-[#111827] px-3 py-2 text-sm text-white" />
    <div className="max-h-[45vh] overflow-y-auto">
      {loading ? <p className="p-2 text-xs text-gray-400">Загрузка…</p> : error ? <p className="p-2 text-xs text-gray-400">Не удалось загрузить категории.</p> : found.length === 0 ? <p className="p-2 text-xs text-gray-400">Категорий не найдено.</p> : found.slice(0,100).map(c=><Link key={c.id} href={`/category/${encodeURIComponent(c.id)}`} prefetch={false} onClick={onChoose} className="block rounded-lg px-3 py-2 text-xs text-gray-200 hover:bg-white/10">{c.name}</Link>)}
      {found.length > 100 && <p className="p-2 text-xs text-gray-400">Показаны первые 100 из {found.length}; уточните поиск.</p>}
    </div>
  </div>;
}
