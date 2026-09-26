import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  /*
   * Solo las rutas con sesión (staff). Los compradores nunca se loguean: refrescar
   * la sesión en la landing o el checkout era un viaje a Supabase Auth por visita
   * sin ningún beneficio.
   */
  matcher: ["/admin/:path*", "/door/:path*"],
};
