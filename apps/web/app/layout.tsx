import type { Metadata } from "next";

import "@fontsource-variable/geist";
import { AppShell } from "../components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "noeyarmory",
  description: "Search Destiny 2 weapons by perks, rolls, and attributes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-background text-foreground min-h-screen antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
