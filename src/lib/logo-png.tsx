import "server-only";

import { ImageResponse } from "next/og";

import { LOGO_PATH, VIEW_BOX } from "@/components/logo";

/** 2x del ancho con el que se muestra en el mail (280px), para pantallas densas. */
const WIDTH = 560;
const HEIGHT = Math.round((WIDTH * 377) / 1402);

/**
 * El logo como PNG con fondo transparente, para los mails: los clientes de mail no
 * muestran SVG (Gmail lo saca). Va adjunto inline, como los QR. Se genera una vez por
 * color y queda en memoria: es siempre la misma imagen.
 */
export function logoPng(color: string) {
  let png = cache.get(color);
  if (!png) {
    png = renderLogo(color);
    // Si falla, que el próximo mail lo vuelva a intentar.
    png.catch(() => cache.delete(color));
    cache.set(color, png);
  }
  return png;
}

const cache = new Map<string, Promise<Buffer>>();

async function renderLogo(color: string) {
  const image = new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%" }}>
      <svg viewBox={VIEW_BOX} width={WIDTH} height={HEIGHT}>
        <path fillRule="evenodd" d={LOGO_PATH} fill={color} />
      </svg>
    </div>,
    { width: WIDTH, height: HEIGHT },
  );
  return Buffer.from(await image.arrayBuffer());
}
