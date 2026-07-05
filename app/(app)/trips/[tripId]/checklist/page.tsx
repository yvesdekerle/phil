import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { ChecklistClient } from "./checklist-client";

/** Valise partagée du voyage (PHIL-N11, onglets/catégories PHIL-Q27). */
export default async function ChecklistPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const t = await getT();

  const [{ data: items }, { data: members }, { data: me }, { data: trip }] = await Promise.all([
    supabase
      .from("checklist_items")
      .select(
        "id, section, title, done, assigned_to, created_by, event_id, due_date, category, trip_events(title)",
      )
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

  return (
    <ChecklistClient
      tripId={tripId}
      items={(items ?? []).map((i) => ({
        ...i,
        eventTitle: i.trip_events?.title ?? null,
      }))}
      members={(members ?? [])
        .map((m) => ({
          userId: m.user_id,
          name: m.profiles?.display_name ?? t("checklist.travelerFallback"),
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "fr"))}
      myId={user.id}
      isOwner={me?.role === "OWNER"}
      nights={
        trip
          ? Math.max(
              1,
              Math.round(
                (new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) /
                  86_400_000,
              ),
            )
          : 7
      }
    />
  );
}
