import { redirect } from "next/navigation";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { MiamClient } from "./miam-client";

/** Onglet Miam (PHIL-S01) : repas planifiés + liste de courses partagée. */
export default async function MiamPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const t = await getT();

  const [{ data: meals }, { data: shopping }, { data: members }, { data: me }, { data: trip }] =
    await Promise.all([
      supabase
        .from("trip_meals")
        .select("id, day, slot, title, cook_ids, notes, created_by")
        .eq("trip_id", tripId)
        .order("day", { ascending: true }),
      supabase
        .from("shopping_items")
        .select("id, label, quantity, checked, checked_by, created_by")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: true }),
      supabase
        .from("trip_participants")
        .select("user_id, profiles!trip_participants_user_id_fkey(display_name)")
        .eq("trip_id", tripId),
      supabase
        .from("trip_participants")
        .select("role")
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .single(),
      supabase.from("trips").select("start_date, end_date").eq("id", tripId).single(),
    ]);

  const memberList = (members ?? [])
    .map((m) => ({
      userId: m.user_id,
      name: m.profiles?.display_name ?? t("miam.travelerFallback"),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));

  return (
    <div className="flex flex-col gap-5">
      <RealtimeRefresh tables={["trip_meals", "shopping_items"]} />
      <MiamClient
        tripId={tripId}
        meals={meals ?? []}
        shopping={shopping ?? []}
        members={memberList}
        myId={user.id}
        isOwner={me?.role === "OWNER"}
        startDate={trip?.start_date ?? null}
        endDate={trip?.end_date ?? null}
      />
    </div>
  );
}
