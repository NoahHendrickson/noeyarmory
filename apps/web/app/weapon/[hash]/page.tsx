import { WeaponDetail } from "../../../components/weapon-detail";
import { getWeaponByHash } from "../../../lib/weapon-index-server";

export default async function WeaponPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  const numHash = Number(hash);

  let initialWeapon: Awaited<ReturnType<typeof getWeaponByHash>>;
  try {
    initialWeapon = getWeaponByHash(numHash);
  } catch {
    initialWeapon = undefined;
  }

  return <WeaponDetail hash={numHash} initialWeapon={initialWeapon} />;
}
