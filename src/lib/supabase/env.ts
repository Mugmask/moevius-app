export function required(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}. Revisá tu .env.local`);
  }
  return value;
}

/**
 * Getters y no constantes: se validan al usarse, no al importar el módulo, así el
 * build (que importa las rutas sin env) no explota. Las `NEXT_PUBLIC_*` se leen
 * con el nombre literal para que Next las inline en el bundle del cliente.
 */
export const publicEnv = {
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  get supabasePublishableKey() {
    return required(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    );
  },
  /** Public Key de Mercado Pago: la usa el Wallet Brick en el navegador. */
  get mpPublicKey() {
    return required("NEXT_PUBLIC_MP_PUBLIC_KEY", process.env.NEXT_PUBLIC_MP_PUBLIC_KEY);
  },
  /** URL pública del sitio, sin barra final. La usan MP (back_urls, webhook) y los mails. */
  get siteUrl() {
    return required("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL).replace(/\/$/, "");
  },
};
