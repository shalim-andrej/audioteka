"use client";
import { reachMetrikaGoal } from '@/components/YandexMetrika';
export default function PromotionLink({ url, id }: { url: string; id: string }) {
  return <a href={url} target="_blank" rel="noopener noreferrer sponsored" onClick={() => reachMetrikaGoal('litres_promotion_click', { promotion_id: id })} className="mt-5 inline-block rounded-xl bg-amber-500 px-4 py-3 font-bold text-black">Подробнее на Литрес</a>;
}
