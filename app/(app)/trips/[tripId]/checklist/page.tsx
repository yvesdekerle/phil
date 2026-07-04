import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChecklistClient, type ChecklistItem } from "./checklist-client";

/** Checklist partagée du voyage (PHIL-N11). */
export default async function ChecklistPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const [{ data: items }, { data: members }, { data: me }] = await Promise.all([
    supabase
      .from("checklist_items")
      .select("id, section, title, done, assigned_to, created_by")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: true }),
    supabase
      .from("trip_participants")
      .select("user_id, profiles!trip_participants_user_id_fkey(display_name)")
      .eq("trip_id", tripId)
      .order("joined_at", { ascending: true }),
    supabase
      .from("trip_participants")
      .select("role")
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .single(),
  ]);

  return (
    <ChecklistClient
      tripId={tripId}
      items={(items ?? []) as ChecklistItem[]}
      members={(members ?? []).map((m) => ({
        userId: m.user_id,
        name: m.profiles?.display_name ?? "Voyageur",
      }))}
      myId={user.id}
      isOwner={me?.role === "OWNER"}
    />
  );
}
