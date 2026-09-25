import "server-only";

import { isIP } from "node:net";

import { headers } from "next/headers";

/**
 * IP del cliente según el proxy (Vercel y la mayoría ponen la real primera en
 * `x-forwarded-for`). Si no es una IP válida devuelve null: el límite por IP
 * simplemente no aplica, pero la compra sigue.
 */
export async function getClientIp() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim();
  return isIP(ip) ? ip : null;
}

/**
 * Valida el token de Cloudflare Turnstile. Si `TURNSTILE_SECRET_KEY` no está
 * configurada (ej. en local) no se exige: el widget tampoco se muestra.
 * https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
export async function verifyTurnstile(token: string | null, ip: string | null) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;

  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      cache: "no-store",
    });
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!data.success) console.warn("turnstile rechazado", data["error-codes"]);
    return data.success === true;
  } catch (err) {
    console.error("turnstile", err);
    return false;
  }
}
