export type PerkCommitSource = "filter" | "build";

export function trackPerkCommit(perkName: string, source: PerkCommitSource) {
  void fetch("/api/events/perk-commit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ perkName, source }),
    keepalive: true,
  });
}
