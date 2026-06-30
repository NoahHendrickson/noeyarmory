import type { Metadata } from "next";

import { WeaponDetail } from "../../../../components/weapon-detail";
import { bungieIcon } from "../../../../lib/bungie";
import { getWeaponDoc } from "../../../../lib/weapon-index-server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ hash: string }>;
}): Promise<Metadata> {
  const { hash } = await params;

  let weapon: Awaited<ReturnType<typeof getWeaponDoc>>;
  try {
    weapon = getWeaponDoc(Number(hash));
  } catch {
    weapon = undefined;
  }

  if (!weapon) return { title: "Weapon — MF Armory" };

  const title = `${weapon.name} — MF Armory`;
  const description =
    weapon.flavor?.trim() ||
    `Every random roll, perk, and stat for ${weapon.name}, a Destiny 2 ${weapon.element} ${weapon.type}.`;
  const image = bungieIcon(weapon.screenshot) ?? bungieIcon(weapon.icon);

  return {
    title,
    description,
    openGraph: { title, description, images: image ? [{ url: image }] : undefined },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

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
