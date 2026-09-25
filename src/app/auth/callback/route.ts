import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/** Destino del magic link: canjea el `code` (PKCE) por la sesión y redirige. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/admin";
  // Solo rutas internas: evita usar el callback como open redirect.
  const destino = next.startsWith("/") && !next.startsWith("//") ? next : "/admin";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${destino}`);
    console.error("exchangeCodeForSession", error);
  }

  return NextResponse.redirect(`${origin}/admin/login?error=link`);
}
