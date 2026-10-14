import type { Metadata, Viewport } from "next";
import { Archivo, Geist, Geist_Mono, Permanent_Marker } from "next/font/google";
import { BRAND } from "@/lib/brand-colors";
import { TEST_MODE } from "@/lib/environment";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Titulares: grotesca variable con eje de ancho. Los títulos grandes van expandidos
// (`font-stretch-expanded`) y las listas largas condensadas, como en un afiche suizo.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

// Letra de marcador para las notas a mano sobre el ticket (ver `doodles.tsx`).
const permanentMarker = Permanent_Marker({
  variable: "--font-permanent-marker",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Moevius",
  description: "Ticketera para eventos",
};

// La barra del navegador toma el color del fondo; `cover` deja usar toda la pantalla
// en iPhone (las barras fijas respetan `env(safe-area-inset-*)`).
export const viewport: Viewport = {
  themeColor: BRAND.night,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${archivo.variable} ${permanentMarker.variable} h-full antialiased`}
    >
      {/* Las manchas de luz se pasan del borde a propósito: el recorte evita que eso
          se convierta en scroll horizontal. */}
      <body className="flex min-h-full flex-col overflow-x-clip">
        {/* Staging comparte base con producción pero vende solo fechas de prueba con
            credenciales de prueba de MP: que nadie lo confunda con la tienda real. */}
        {TEST_MODE && (
          <p className="bg-accent text-accent-foreground label-mono px-4 py-1.5 text-center">
            Entorno de prueba · las fechas y los pagos no son reales
          </p>
        )}
        {children}
      </body>
    </html>
  );
}
