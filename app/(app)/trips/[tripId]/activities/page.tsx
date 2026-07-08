import { redirect } from "next/navigation";

/**
 * PHIL-U07 — L'onglet « À swiper » (pool `trip_activities` séparé) a fusionné
 * dans **Idées** : le swipe façon Tinder/Bumble se fait maintenant sur les idées
 * (« Match tes activités »). On redirige les anciens liens/bookmarks.
 */
export default async function ActivitiesRedirect({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  redirect(`/trips/${tripId}/ideas`);
}
