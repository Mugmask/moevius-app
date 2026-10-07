import "server-only";

/**
 * Staging y producción comparten la base. Producción muestra y vende solo fechas
 * reales; todo lo demás (staging, previews, `next dev`, un build local) solo fechas
 * de prueba (`events.is_test`). `create_order` también lo exige, así que una compra de
 * prueba nunca puede ocupar cupo de una fecha real.
 */
export const TEST_MODE = process.env.VERCEL_ENV !== "production";
