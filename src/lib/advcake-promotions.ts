import 'server-only';

export type Promotion = { id: string; title: string; start: string; end: string; url: string; marking: string; description: string };

// Временно скрываем акции: на страницах Литрес нужен промокод,
// а в полученном списке акций привязанные коды не были подтверждены.
export async function getPromotions(): Promise<Promotion[]> {
  return [];
}
