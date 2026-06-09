import { NewArmorPage } from "../../../../components/new-armor-page";
import { loadNewArmorIndex } from "../../../../lib/new-armor-index-server";

export default function ArmorNewPage() {
  let index: ReturnType<typeof loadNewArmorIndex> | undefined;

  try {
    index = loadNewArmorIndex();
  } catch {
    index = undefined;
  }

  return <NewArmorPage index={index} />;
}
