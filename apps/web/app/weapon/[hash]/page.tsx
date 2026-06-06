import { WeaponDetail } from "../../../components/weapon-detail";

export default async function WeaponPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  return <WeaponDetail hash={Number(hash)} />;
}
