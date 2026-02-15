/**
 * Cliente Supabase para uso no BROWSER (Client Components).
 * Singleton — uma única instância é criada e reutilizada.
 * Evita memory leaks por múltiplas conexões WebSocket.
 */
import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return client;
}
