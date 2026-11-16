import Link from 'next/link';
import { getPromotions } from '@/lib/advcake-promotions';
import PromotionLink from '@/app/akcii/PromotionLink';

export default async function PromotionsPanel() {
  const promotions = await getPromotions();
  if (!promotions.length) return null;
  return <section aria-label="Акции Литрес" className="rounded-2xl border border-amber-500/30 bg-[#111724] p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold text-white">Акции Литрес</h2><Link href="/akcii" prefetch={false} className="text-sm text-amber-400">Все предложения →</Link></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">{promotions.map(p => <article key={p.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <h3 className="font-bold text-white">{p.title}</h3>
      <p className="mt-2 text-sm text-gray-300">{p.description}</p>
      <p className="mt-2 text-xs text-gray-400">До {p.end.split('-').reverse().join('.')} включительно. Подробные условия на сайте Литрес.</p>
      <p className="mt-2 break-words text-xs text-gray-400">{p.marking}</p>
      <PromotionLink url={p.url} id={p.id} />
    </article>)}</div>
  </section>;
}
