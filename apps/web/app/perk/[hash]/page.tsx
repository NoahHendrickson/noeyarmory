import { PerkWeapons } from "../../../components/perk-weapons";

export default async function PerkPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  return <PerkWeapons hash={Number(hash)} />;
}
