import type { Metadata, Viewport } from "next";

import "@fontsource-variable/geist";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}
