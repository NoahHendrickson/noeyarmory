import {
  WeaponDetailPageLayout,
  WeaponDetailSearchSkeleton,
} from "../../../../components/weapon-detail-header-chrome";
import { WeaponNavigationStatus } from "../../../../components/weapon-navigation-status";

export default function WeaponLoading() {
  return (
    <WeaponDetailPageLayout searchSlot={<WeaponDetailSearchSkeleton />}>
      <main className="mx-auto max-w-5xl p-4 md:p-6">
        <WeaponNavigationStatus />
      </main>
    </WeaponDetailPageLayout>
  );
}
