import { HomeSearch } from "../../components/home-search";
import { getSession, isSignedIn } from "../../lib/session";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const session = await getSession();
  const { mode } = await searchParams;
  const initialMode = mode === "armor" ? "armor" : "weapon";

  return <HomeSearch signedIn={isSignedIn(session)} initialMode={initialMode} />;
}
