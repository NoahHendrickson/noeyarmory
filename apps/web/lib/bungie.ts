export const BUNGIE_ORIGIN = "https://www.bungie.net";

/** Resolve a manifest icon path to a full URL. */
export function bungieIcon(path?: string): string | undefined {
  if (!path) return undefined;
  return path.startsWith("http") ? path : `${BUNGIE_ORIGIN}${path}`;
}

/** Ring color per rarity tier (Destiny-ish). */
export const RARITY_RING: Record<string, string> = {
  Exotic: "ring-yellow-400/70",
  Legendary: "ring-purple-400/60",
  Rare: "ring-blue-400/60",
  Uncommon: "ring-green-400/60",
  Common: "ring-zinc-400/50",
};

/** Text color per damage element. */
export const ELEMENT_COLOR: Record<string, string> = {
  Solar: "text-orange-400",
  Arc: "text-cyan-300",
  Void: "text-purple-400",
  Stasis: "text-blue-400",
  Strand: "text-emerald-400",
  Kinetic: "text-zinc-300",
};
