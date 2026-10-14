import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { LOGO_PATH, VIEW_BOX } from "@/components/logo";
import { BRAND } from "@/lib/brand-colors";
import { editionOf, getFeaturedEvent } from "@/lib/events";

/**
 * La vista previa al compartir el link (WhatsApp, Instagram, X): la home en chico. El logo
 * líquido sobre la noche violeta y abajo el talón de papel que asoma de la máquina, con la
 * edición, la fecha y el lugar de la próxima fiesta. Se genera con cada pedido: lee la
 * fecha destacada de la DB.
 */
export const alt = "Moevius: entradas para la próxima fiesta";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Hex de los tokens de globals.css (la imagen no lee variables CSS).
const PAPER = "#f6f3ed";
const INK = "#110f0e";
const HIGHLIGHTER = "#fcee28";
const AURA = "#6036e2";

const [display, mono] = await Promise.all([
  readFile(join(process.cwd(), "assets/fonts/archivo-condensed-extrabold.ttf")),
  readFile(join(process.cwd(), "assets/fonts/geist-mono-bold.ttf")),
]);

export default async function Image() {
  const event = await getFeaturedEvent();
  const edition = event ? editionOf(event.title) : null;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        backgroundColor: BRAND.night,
        backgroundImage: `radial-gradient(circle at 20% 90%, ${AURA}99, transparent 55%), radial-gradient(circle at 50% 25%, #ff6a1c40, transparent 45%)`,
        paddingTop: 56,
      }}
    >
      <LiquidLogo width={860} />

      {event && edition ? (
        <div
          style={{
            marginTop: 44,
            width: 780,
            display: "flex",
            flexDirection: "column",
            backgroundColor: PAPER,
            color: INK,
            padding: "30px 44px 34px",
            boxShadow: "0 24px 40px rgba(0,0,0,0.55)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <div
              style={{
                display: "flex",
                fontFamily: "Archivo",
                fontSize: 104,
                lineHeight: 0.85,
                textTransform: "uppercase",
                padding: "0 10px",
                backgroundImage: `linear-gradient(transparent 48%, ${HIGHLIGHTER} 48%, ${HIGHLIGHTER} 92%, transparent 92%)`,
              }}
            >
              {edition}
            </div>
            <Barcode seed={event.slug} />
          </div>
          <div
            style={{
              marginTop: 22,
              display: "flex",
              alignItems: "center",
              gap: 18,
              fontFamily: "Geist Mono",
              fontSize: 30,
              letterSpacing: 5,
              textTransform: "uppercase",
            }}
          >
            <span>
              {event.day} {event.month.slice(0, 3)}
            </span>
            <span style={{ flex: 1, borderTop: `4px dashed ${INK}` }} />
            <span>{event.venue}</span>
          </div>
        </div>
      ) : (
        <div
          style={{
            marginTop: 56,
            display: "flex",
            fontFamily: "Geist Mono",
            fontSize: 34,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: BRAND.bone,
          }}
        >
          Próxima edición · a confirmar
        </div>
      )}
    </div>,
    {
      ...size,
      fonts: [
        { name: "Archivo", data: display, style: "normal", weight: 800 },
        { name: "Geist Mono", data: mono, style: "normal", weight: 700 },
      ],
    },
  );
}

/** El logo líquido de la home, quieto: manchas de color recortadas con la forma del logo. */
function LiquidLogo({ width }: { width: number }) {
  const blobs: [number, number, number, number, string][] = [
    [300, 300, 260, 140, "#ffd23f"],
    [900, 280, 300, 130, "#ffd23f"],
    [1500, 320, 220, 140, "#ffd23f"],
    [560, 420, 240, 150, "#ff2a2a"],
    [1180, 420, 260, 150, "#ff2a2a"],
    [230, 580, 180, 110, "#3b2cff"],
    [620, 560, 200, 110, "#3b2cff"],
    [1300, 590, 220, 100, "#a12cff"],
    [1560, 520, 160, 120, "#3b2cff"],
  ];
  return (
    <svg viewBox={VIEW_BOX} width={width} height={Math.round((width * 377) / 1402)}>
      <defs>
        <clipPath id="logo">
          <path fillRule="evenodd" d={LOGO_PATH} />
        </clipPath>
        {blobs.map(([, , , , color], i) => (
          <radialGradient key={i} id={`b${i}`}>
            <stop offset="0" stopColor={color} />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </radialGradient>
        ))}
      </defs>
      <g clipPath="url(#logo)">
        <rect x="186" y="233" width="1402" height="377" fill="#ff6a1c" />
        {blobs.map(([cx, cy, rx, ry], i) => (
          <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#b${i})`} />
        ))}
      </g>
    </svg>
  );
}

/** Código de barras decorativo: mismo seed, mismas barras (como `Barcode` de la web). */
function Barcode({ seed }: { seed: string }) {
  let state = [...seed].reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 7);
  const bars: { x: number; width: number }[] = [];
  let x = 0;
  while (x < 240) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    const width = 1 + (state % 3);
    if (state % 3 !== 0) bars.push({ x, width });
    x += width + 1 + ((state >> 4) % 2);
  }
  return (
    <svg viewBox="0 0 240 40" preserveAspectRatio="none" width={320} height={92}>
      {bars.map((bar) => (
        <rect key={bar.x} x={bar.x} y={0} width={bar.width} height={40} fill={INK} />
      ))}
    </svg>
  );
}
