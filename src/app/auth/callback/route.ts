import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Destino del magic link. Acepta los dos formatos de Supabase:
 * - `code` (PKCE): el link que manda `signInWithOtp`. Solo funciona en el mismo
 *   navegador donde se pidió.
 * - `token_hash` + `type`: el que arma `auth.admin.generateLink` (ver
 *   `scripts/staff-login-link.mjs`). Funciona en cualquier navegador.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/admin";
  // Solo rutas internas: evita usar el callback como open redirect.
  const destination = next.startsWith("/") && !next.startsWith("//") ? next : "/admin";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${destination}`);
    console.error("exchangeCodeForSession", error);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(`${origin}${destination}`);
    console.error("verifyOtp", error);
  }

  return NextResponse.redirect(`${origin}/admin/login?error=link`);
}
