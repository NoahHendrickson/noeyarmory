import { WeaponSearch } from "../components/weapon-search";
import { getSession, isSignedIn } from "../lib/session";

export default async function Home() {
  const session = await getSession();
  return <WeaponSearch signedIn={isSignedIn(session)} />;
}
