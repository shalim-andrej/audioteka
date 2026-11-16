import Link from 'next/link';
import PromotionLink from './PromotionLink';
import { getPromotions } from '@/lib/advcake-promotions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Акции Литрес — Аудиотека PRO', description: 'Актуальные партнёрские предложения Литрес.' };

export default async function PromotionsPage() {
  const promotions = await getPromotions();
  return <main className="mx-auto max-w-4xl px-4 py-10 text-gray-100">
    <Link href="/" className="text-amber-400">← На главную</Link>
    <h1 className="mt-6 text-3xl font-bold">Акции Литрес</h1>
    <p className="mt-3 text-sm text-gray-400">Партнёрские предложения. Условия уточняйте на странице Литрес.</p>
    {promotions.length === 0 ? <p className="mt-8 text-gray-400">Сейчас нет подтверждённых актуальных предложений.</p> :
      <div className="mt-8 grid gap-4 sm:grid-cols-2">{promotions.map(p => <article key={p.id} className="rounded-2xl border border-white/15 bg-white/[0.03] p-5">
        <h2 className="text-lg font-bold">{p.title}</h2>
        <p className="mt-3 text-sm text-gray-300">{p.description}</p>
        <p className="mt-3 text-xs text-gray-400">Период: {p.start.split('-').reverse().join('.')} — {p.end.split('-').reverse().join('.')} включительно.</p>
        <p className="mt-3 break-words text-xs text-gray-400">{p.marking}</p>
        <PromotionLink url={p.url} id={p.id} />
      </article>)}</div>}
  </main>;
}
