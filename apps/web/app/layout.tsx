import type { Metadata, Viewport } from "next";
import Script from "next/script";

import "@fontsource-variable/geist";
import "@fontsource/silkscreen/400.css";
import "@fontsource/silkscreen/700.css";
import "./globals.css";

import { MicrosoftClarity } from "../components/microsoft-clarity";
import { weaponIndexPreloadScript } from "../lib/generated-data-client";

export const metadata: Metadata = {
  title: "MF Armory",
  description: "Search Destiny 2 weapons by perks, rolls, and attributes.",
  icons: {
    icon: "/moonfang.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-background text-foreground min-h-screen">
        <Script id="weapon-index-preload" strategy="beforeInteractive">
          {weaponIndexPreloadScript()}
        </Script>
        <MicrosoftClarity />
        {children}
      </body>
    </html>
  );
}
