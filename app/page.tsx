import { DEMO_SLUG, getRestaurant } from "@/lib/db/repo";
import { SaaSLanding } from "@/app/components/SaaSLanding";

export const dynamic = "force-dynamic";

export default async function Home() {
  const demo = await getRestaurant(DEMO_SLUG);
  const firstTable = demo?.tables[0];
  const guestHref = firstTable ? `/r/${DEMO_SLUG}/t/${firstTable.id}` : "#";

  return (
    <SaaSLanding
      demoSlug={DEMO_SLUG}
      demoName={demo?.name ?? "The Demo Cafe"}
      guestHref={guestHref}
      tableLabel={firstTable?.label ?? "1"}
    />
  );
}
