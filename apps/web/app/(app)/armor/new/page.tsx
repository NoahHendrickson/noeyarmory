import { NewArmorPage } from "../../../../components/new-armor-page";
import { tryLoadNewArmorIndex } from "../../../../lib/new-armor-index-server";

export default function ArmorNewPage() {
  return <NewArmorPage index={tryLoadNewArmorIndex()} />;
}
