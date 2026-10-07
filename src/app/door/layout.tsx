import type { Metadata, Viewport } from "next";

import { BRAND } from "@/lib/brand-colors";

export const metadata: Metadata = {
  manifest: "/door/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Puerta", statusBarStyle: "black-translucent" },
  icons: { apple: "/door/app-icon/192" },
};

export const viewport: Viewport = {
  themeColor: BRAND.ink,
};

export default function DoorLayout({ children }: LayoutProps<"/door">) {
  return children;
}
