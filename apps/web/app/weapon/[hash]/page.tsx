import { WeaponDetail } from "../../../components/weapon-detail";
import { getWeaponDoc } from "../../../lib/weapon-index-server";

export default async function WeaponPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  const numHash = Number(hash);

  let initialWeapon: Awaited<ReturnType<typeof getWeaponDoc>>;
  try {
    initialWeapon = getWeaponDoc(numHash);
  } catch {
    initialWeapon = undefined;
  }

  return <WeaponDetail hash={numHash} initialWeapon={initialWeapon} />;
}
