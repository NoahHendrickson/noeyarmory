import type { ReactNode } from "react";
import Link from "next/link";

import { getOwnedWeapons } from "../../../lib/bungie-profile";
import { getSession, isSignedIn } from "../../../lib/session";
import { VaultView } from "../../../components/vault-view";
import type { VaultWeapon } from "../../../lib/vault-types";

export const dynamic = "force-dynamic";

function Header({ rightSlot }: { rightSlot?: ReactNode }) {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-7xl items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))] md:px-6">
        <Link href="/" className="text-lg font-bold tracking-tight">
          noeyarmory
        </Link>
        <nav className="flex items-center gap-4 text-sm">{rightSlot}</nav>
      </div>
    </header>
  );
}

export default async function VaultPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  const { error } = await searchParams;

  if (!isSignedIn(session)) {
    return (
      <div className="min-h-screen">
        <Header
          rightSlot={
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              Search
            </Link>
          }
        />
        <div className="mx-auto max-w-md space-y-4 p-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Your vault</h1>
          <p className="text-muted-foreground text-sm">
            Sign in with Bungie to search the weapons you own — and the exact rolls you have.
          </p>
          {error && (
            <p className="text-destructive text-sm">Sign-in failed ({error}). Please try again.</p>
          )}
          <a
            href="/api/auth/login"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center rounded-md px-4 text-sm font-medium"
          >
            Sign in with Bungie
          </a>
        </div>
      </div>
    );
  }

  let weapons: VaultWeapon[] = [];
  let loadError: string | undefined;
  try {
    const owned = await getOwnedWeapons(session);
    weapons = owned.map((o) => ({
      instanceId: o.instanceId,
      hash: o.weapon.hash,
      name: o.weapon.name,
      icon: o.weapon.icon,
      watermark: o.weapon.watermark,
      type: o.weapon.type,
      element: o.weapon.element,
      ammo: o.weapon.ammo,
      rarity: o.weapon.rarity,
      frame: o.weapon.frame,
      craftable: o.weapon.craftable,
      rolledPerks: o.rolledPerks.map((p) => ({ hash: p.hash, name: p.name, icon: p.icon })),
    }));
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load your profile.";
    console.error("[vault] failed to load profile:", e);
  }

  return (
    <div className="min-h-screen">
      <Header
        rightSlot={
          <>
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              Search
            </Link>
            {session.bungieName && (
              <span className="text-muted-foreground hidden sm:inline">{session.bungieName}</span>
            )}
            <a href="/api/auth/logout" className="text-muted-foreground hover:text-foreground">
              Sign out
            </a>
          </>
        }
      />
      {loadError ? (
        <div className="mx-auto max-w-md space-y-2 p-8 text-center">
          <p className="text-destructive text-sm">Couldn&apos;t load your vault.</p>
          <p className="text-muted-foreground text-xs">{loadError}</p>
          <a href="/api/auth/logout" className="text-muted-foreground block text-xs underline">
            Sign out and try again
          </a>
        </div>
      ) : (
        <VaultView weapons={weapons} />
      )}
    </div>
  );
}
