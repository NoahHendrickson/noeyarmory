import { PerkWeapons } from "../../../../components/perk-weapons";
import { getWeaponsForPerkHash } from "../../../../lib/weapon-index-server";

export default async function PerkPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  const numHash = Number(hash);

  let initialPerkName: string | undefined;
  let initialMatches: Awaited<ReturnType<typeof getWeaponsForPerkHash>>["matches"] | undefined;
  try {
    const result = getWeaponsForPerkHash(numHash);
    initialPerkName = result.perkName;
    initialMatches = result.matches;
  } catch {
    initialPerkName = undefined;
    initialMatches = undefined;
  }

  return (
    <PerkWeapons
      hash={numHash}
      initialPerkName={initialPerkName}
      initialMatches={initialMatches}
    />
  );
}
