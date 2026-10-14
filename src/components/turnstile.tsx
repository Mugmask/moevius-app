"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      language?: string;
      theme?: "light" | "dark" | "auto";
      size?: "normal" | "compact" | "flexible";
      appearance?: "always" | "interaction-only";
    },
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/**
 * Widget de Cloudflare Turnstile. Deja el token en un input oculto
 * `cf-turnstile-response` dentro del form. Sin site key configurada no renderiza
 * nada (el server tampoco lo exige).
 *
 * `resetKey`: cada vez que cambia se pide un token nuevo, porque cada token sirve
 * para un solo intento. `theme`: el del fondo donde va (oscuro por defecto; claro
 * sobre el papel del ticket, si no queda como un parche). `compact`: para lugares
 * angostos (el talón del ticket mide menos que los 300px del widget normal): versión
 * chica y que solo aparece si Cloudflare necesita que la persona haga algo.
 */
export function Turnstile({
  resetKey,
  theme = "dark",
  compact = false,
}: {
  resetKey?: unknown;
  theme?: "light" | "dark";
  compact?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!SITE_KEY || !ready || !ref.current || !window.turnstile) return;
    const id = window.turnstile.render(ref.current, {
      sitekey: SITE_KEY,
      language: "es",
      theme,
      ...(compact && { size: "compact", appearance: "interaction-only" }),
    });
    widgetId.current = id;
    return () => {
      window.turnstile?.remove(id);
      widgetId.current = null;
    };
  }, [ready, theme, compact]);

  useEffect(() => {
    if (widgetId.current) window.turnstile?.reset(widgetId.current);
  }, [resetKey]);

  if (!SITE_KEY) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
      />
      <div ref={ref} />
    </>
  );
}
