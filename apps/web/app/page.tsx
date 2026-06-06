import Link from "next/link";

import { WeaponSearch } from "../components/weapon-search";

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between p-4 md:px-6">
          <Link href="/" className="text-lg font-bold tracking-tight">
            noeyarmory
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/vault" className="text-muted-foreground hover:text-foreground">
              My Vault
            </Link>
          </nav>
        </div>
      </header>
      <WeaponSearch />
    </div>
  );
}
