import "server-only";

import { createClient } from "@supabase/supabase-js";

import { serverEnv } from "@/lib/env.server";

import type { Database } from "./database.types";
import { publicEnv } from "./env";

/**
 * Cliente con la secret key: se saltea RLS. Solo para Server Actions y Route Handlers
 * que ya validaron quién llama (o que no tienen usuario, como el webhook de MP).
 */
export function createAdminClient() {
  return createClient<Database>(publicEnv.supabaseUrl, serverEnv.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
