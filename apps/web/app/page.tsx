import { WeaponSearch } from "../components/weapon-search";

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between p-4 md:px-6">
          <h1 className="text-lg font-bold tracking-tight">noeyarmory</h1>
          <p className="text-muted-foreground hidden text-sm sm:block">
            Destiny 2 weapon &amp; perk search
          </p>
        </div>
      </header>
      <WeaponSearch />
    </div>
  );
}
