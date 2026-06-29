import Link from "next/link";
import type { ReactNode } from "react";

export function WeaponDetailSearchSkeleton() {
  return (
    <div className="min-h-10 rounded-[14px] border border-border/50 bg-muted/20" />
  );
}

export function WeaponDetailHeaderChrome({ searchSlot }: { searchSlot: ReactNode }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background px-[max(1rem,env(safe-area-inset-right))] py-2 pl-[max(1rem,env(safe-area-inset-left))]">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-2 sm:grid-cols-[1fr_minmax(0,28rem)_1fr] sm:items-center">
        <Link
          href="/"
          className="font-pixel justify-self-center text-sm font-bold sm:justify-self-start sm:text-left"
        >
          moonfang armory
        </Link>
        <div className="min-w-0 sm:col-start-2 sm:row-start-1">{searchSlot}</div>
      </div>
    </header>
  );
}

export function WeaponDetailPageLayout({
  searchSlot,
  children,
}: {
  searchSlot: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <WeaponDetailHeaderChrome searchSlot={searchSlot} />
      {children}
    </div>
  );
}
