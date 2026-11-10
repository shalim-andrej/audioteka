// src/lib/query-client.ts
import { QueryClient } from "@tanstack/react-query";

/**
 * QueryClient с настройками по умолчанию.
 *
 * staleTime: 60_000 — данные «свежие» 1 минуту. В течение этого времени
 *   useQuery не делает повторный запрос.
 * gcTime: 5 * 60_000 — хранить данные в кэше 5 минут после размонтирования.
 * retry: 1 — один повтор при ошибке сети (не заваливать пользователя).
 * refetchOnWindowFocus: false — не обновлять данные при возврате в окно
 *   (для поиска это лишнее, для каталога — можно включить позже).
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}