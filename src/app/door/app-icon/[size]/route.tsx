import { ImageResponse } from "next/og";

import { BRAND } from "@/lib/brand-colors";

const SIZES = new Set([192, 512]);

/** Íconos de la app de puerta (los pide el manifest de /door). El punto verde del logo. */
export async function GET(_request: Request, { params }: RouteContext<"/door/app-icon/[size]">) {
  const size = Number((await params).size);
  if (!SIZES.has(size)) return new Response(null, { status: 404 });

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BRAND.ink,
      }}
    >
      {/* 50%: queda dentro de la zona segura de los íconos "maskable" de Android. */}
      <div
        style={{
          width: size * 0.5,
          height: size * 0.5,
          borderRadius: "50%",
          background: BRAND.green,
          border: `${Math.round(size * 0.03)}px solid ${BRAND.paper}`,
        }}
      />
    </div>,
    { width: size, height: size },
  );
}
