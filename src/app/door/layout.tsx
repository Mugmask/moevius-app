import type { Metadata, Viewport } from "next";

import { BRAND } from "@/lib/brand-colors";

export const metadata: Metadata = {
  manifest: "/door/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Puerta", statusBarStyle: "black-translucent" },
  icons: { apple: "/brand/m-blob-192.png" },
};

export const viewport: Viewport = {
  themeColor: BRAND.night,
};

export default function DoorLayout({ children }: LayoutProps<"/door">) {
  return children;
}
