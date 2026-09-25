import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

import { missingRequiredEnv } from "./src/lib/required-env";

export default function config(phase: string): NextConfig {
  // En el build de deploy (Vercel, o REQUIRE_ENV=1 en otro host) una variable que
  // falta corta el build. El CI de GitHub buildea sin env y no entra acá.
  if (phase === PHASE_PRODUCTION_BUILD && (process.env.VERCEL || process.env.REQUIRE_ENV === "1")) {
    const missing = missingRequiredEnv();
    if (missing.length > 0) {
      throw new Error(`Faltan variables de entorno para el deploy: ${missing.join(", ")}`);
    }
  }

  return {};
}
