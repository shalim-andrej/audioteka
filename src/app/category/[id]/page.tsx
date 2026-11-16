import Link from 'next/link';
import { notFound } from 'next/navigation';
import HeaderIsland from '@/components/HeaderIsland';
import BookCard from '@/components/BookCard';
import { getCategories } from '@/lib/litres-categories';
import { getBooksFromDb } from '@/lib/db-service';
import PromotionsPanel from '@/components/PromotionsPanel';
export const dynamic = 'force-dynamic';
export default async function CategoryPage({params, searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{page?:string}>}) {
  const {id}=await params;
  if (!/^\d{1,16}$/.test(id)) notFound();
  const category=(await getCategories()).find(c=>c.id===id);
  if(!category) notFound();
  const sp=await searchParams;
  const page=Math.max(1, Math.min(10000, Number.parseInt(sp.page || '1',10) || 1));
  const size=24;
  const {items,total}=await getBooksFromDb({categoryId:id,page,limit:size});
  return <div className="min-h-screen bg-[#06080D] text-white"><HeaderIsland /><main className="mx-auto max-w-7xl px-4 py-8">
    <Link href="/" className="text-sm text-amber-400">← На главную</Link><h1 className="mt-5 text-3xl font-bold">{category.name}</h1>
    <p className="mt-2 text-sm text-gray-400">Книг в категории и подкатегориях: {total.toLocaleString('ru-RU')}</p>
    <div className="my-8"><PromotionsPanel /></div>
    {items.length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">{items.map(book=><BookCard key={book.id} book={book} />)}</div> : <p className="py-8 text-gray-400">В этой категории пока нет книг.</p>}
    <nav className="mt-8 flex gap-4" aria-label="Страницы категории">{page>1 && <Link href={`/category/${id}?page=${page-1}`} className="text-amber-400">← Назад</Link>}<span>Страница {page}</span>{page*size<total && <Link href={`/category/${id}?page=${page+1}`} className="text-amber-400">Далее →</Link>}</nav>
  </main></div>;
}
