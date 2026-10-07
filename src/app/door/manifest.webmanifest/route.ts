import type { MetadataRoute } from "next";

import { BRAND } from "@/lib/brand-colors";

/**
 * Manifest solo para la puerta: el staff la instala en el celu ("Agregar a inicio") y
 * abre directo el escáner a pantalla completa. No es global a propósito: un comprador
 * que agregue el sitio al inicio no tiene que caer en el login del staff.
 */
export function GET() {
  const manifest: MetadataRoute.Manifest = {
    name: "Moevius Puerta",
    short_name: "Puerta",
    description: "Validá las entradas en la puerta.",
    start_url: "/door",
    scope: "/door",
    display: "standalone",
    orientation: "portrait",
    background_color: BRAND.ink,
    theme_color: BRAND.ink,
    // El mismo ícono sirve de "maskable": el punto está dentro de la zona segura.
    icons: [192, 512].flatMap((size) =>
      (["any", "maskable"] as const).map((purpose) => ({
        src: `/door/app-icon/${size}`,
        sizes: `${size}x${size}`,
        type: "image/png",
        purpose,
      })),
    ),
  };
  return Response.json(manifest, {
    headers: { "content-type": "application/manifest+json" },
  });
}
