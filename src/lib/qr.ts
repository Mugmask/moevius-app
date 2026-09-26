import "server-only";

import QRCode from "qrcode";

import { publicEnv } from "@/lib/supabase/env";

/**
 * El QR lleva la URL de la entrada y no el código pelado: si alguien lo escanea con
 * la cámara del celu abre su entrada, y el scanner de la puerta saca el código del
 * final de la URL.
 */
export function ticketUrl(code: string) {
  return `${publicEnv.siteUrl}/tickets/${code}`;
}

export function qrSvg(code: string) {
  return QRCode.toString(ticketUrl(code), { type: "svg", margin: 0, errorCorrectionLevel: "M" });
}

export function qrPng(code: string) {
  return QRCode.toBuffer(ticketUrl(code), { width: 480, margin: 2, errorCorrectionLevel: "M" });
}
