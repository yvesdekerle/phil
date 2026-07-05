import Image from "next/image";
import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { FriendInvite } from "./friend-invite";

type Friend = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  sharedTrips: string[];
};

/** Carnet d'amis (PHIL-D08) : compagnons extraits des voyages partagés. */
export default async function FriendsPage() {
  const t = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const [{ data: trips }, { data: myRoles }] = await Promise.all([
    supabase
      .from("trips")
      .select(
        "id, name, start_date, trip_participants(user_id, role, profiles!trip_participants_user_id_fkey(display_name, avatar_url))",
      )
      .order("start_date", { ascending: false }),
    supabase.from("trip_participants").select("trip_id, role").eq("user_id", user.id),
  ]);

  const friends = new Map<string, Friend>();
  for (const trip of trips ?? []) {
    for (const p of trip.trip_participants) {
      if (p.user_id === user.id) {
        continue;
      }
      const entry = friends.get(p.user_id) ?? {
        userId: p.user_id,
        name: p.profiles?.display_name ?? t("friends.travelerFallback"),
        avatarUrl: p.profiles?.avatar_url ?? null,
        sharedTrips: [],
      };
      entry.sharedTrips.push(trip.name);
      friends.set(p.user_id, entry);
    }
  }
  const friendList = [...friends.values()].sort(
    (a, b) => b.sharedTrips.length - a.sharedTrips.length,
  );

  const editableTripIds = new Set(
    (myRoles ?? []).filter((r) => r.role === "OWNER" || r.role === "EDITOR").map((r) => r.trip_id),
  );
  const invitableTrips = (trips ?? [])
    .filter((tr) => editableTripIds.has(tr.id))
    .map((tr) => ({ id: tr.id, name: tr.name }));

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="font-display text-3xl text-encre">{t("friends.title")}</h1>
      <p className="mt-1 mb-6 text-sm text-encre-douce">{t("friends.subtitle")}</p>

      {friendList.length === 0 ? (
        <div className="rounded-lg border border-dashed border-laiton-clair bg-papier/60 px-6 py-14 text-center">
          <p className="font-display text-xl text-encre italic">{t("friends.emptyTitle")}</p>
          <p className="mt-2 text-sm text-encre-douce">{t("friends.emptyBody")}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {friendList.map((friend) => (
            <li
              key={friend.userId}
              className="flex flex-wrap items-center gap-4 rounded-lg border border-laiton-clair bg-papier px-4 py-3"
            >
              {friend.avatarUrl ? (
                <Image
                  src={friend.avatarUrl}
                  alt=""
                  width={40}
                  height={40}
                  className="rounded-full border border-laiton-clair"
                />
              ) : (
                <span className="flex size-10 items-center justify-center rounded-full border border-laiton-clair bg-parchemin font-display text-laiton">
                  {friend.name.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-encre">{friend.name}</span>
                <span className="block truncate text-xs text-encre-douce">
                  {friend.sharedTrips.length}{" "}
                  {friend.sharedTrips.length > 1 ? t("friends.tripsWord") : t("friends.tripWord")}{" "}
                  {t("friends.together")} · {friend.sharedTrips.slice(0, 2).join(", ")}
                  {friend.sharedTrips.length > 2 ? "…" : ""}
                </span>
              </span>
              <FriendInvite friendUserId={friend.userId} trips={invitableTrips} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
