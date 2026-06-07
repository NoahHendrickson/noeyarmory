export type WeaponViewSource = "search" | "direct" | "popular";

export function trackWeaponView(weaponHash: number, source: WeaponViewSource) {
  void fetch("/api/events/weapon-view", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ weaponHash, source }),
    keepalive: true,
  });
}
