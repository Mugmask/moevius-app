import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "./database.types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";

/**
 * Cliente de Supabase para Server Components, Server Actions y Route Handlers.
 * Siempre crear uno nuevo por request: no compartir la instancia entre requests.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Se llamó desde un Server Component: no se pueden escribir cookies ahí.
          // El refresh de sesión lo hace el proxy, así que es seguro ignorarlo.
        }
      },
    },
  });
}
