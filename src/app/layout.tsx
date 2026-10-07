import type { Metadata, Viewport } from "next";
import { Archivo_Black, Geist, Geist_Mono } from "next/font/google";
import { BRAND } from "@/lib/brand-colors";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Los titulares van en una grotesca ultra pesada: es el peso del texto, y no un
// efecto de fondo, lo que carga el diseño.
const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Moevius",
  description: "Ticketera para eventos",
};

// La barra del navegador toma el color del fondo; `cover` deja usar toda la pantalla
// en iPhone (las barras fijas respetan `env(safe-area-inset-*)`).
export const viewport: Viewport = {
  themeColor: BRAND.paper,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${archivoBlack.variable} h-full antialiased`}
    >
      {/* Las piezas rotadas y las calcomanías se pasan del borde a propósito:
          el recorte evita que eso se convierta en scroll horizontal. */}
      <body className="flex min-h-full flex-col overflow-x-hidden">{children}</body>
    </html>
  );
}
