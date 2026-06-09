import type { Metadata, Viewport } from "next";
import Script from "next/script";

import "@fontsource-variable/geist";
import "@fontsource/silkscreen/400.css";
import "@fontsource/silkscreen/700.css";
import "./globals.css";

import { MicrosoftClarity } from "../components/microsoft-clarity";
import { DEFAULT_GENERATED_DATA_PATHS, GENERATED_DATA_MANIFEST_PATH } from "../lib/generated-data";

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

const weaponIndexPreloadScript = `(() => {
  const manifestUrl = ${JSON.stringify(GENERATED_DATA_MANIFEST_PATH)};
  const stableWeaponsUrl = ${JSON.stringify(DEFAULT_GENERATED_DATA_PATHS.weapons)};
  const store = globalThis.__noeyarmoryPreloads || (globalThis.__noeyarmoryPreloads = {});
  const fetchJson = (url) => fetch(url, { credentials: "same-origin" }).then((res) => {
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  });
  if (!store.generatedDataManifest) {
    store.generatedDataManifest = fetchJson(manifestUrl).catch(() => null);
  }
  if (!store.weapons) {
    store.weapons = store.generatedDataManifest.then((manifest) => {
      const url = manifest?.files?.weapons?.path || stableWeaponsUrl;
      return fetchJson(url).catch((error) => {
        if (url !== stableWeaponsUrl) return fetchJson(stableWeaponsUrl);
        throw error;
      });
    });
  }
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-background text-foreground min-h-screen">
        <Script id="weapon-index-preload" strategy="beforeInteractive">
          {weaponIndexPreloadScript}
        </Script>
        <MicrosoftClarity />
        {children}
      </body>
    </html>
  );
}
