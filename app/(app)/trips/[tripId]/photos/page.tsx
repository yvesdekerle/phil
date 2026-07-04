import { redirect } from "next/navigation";
import { PHOTOS_PER_TRIP } from "@/lib/photos/limits";
import { createClient } from "@/lib/supabase/server";
import { PhotosClient } from "./photos-client";

/** Galerie photos du voyage (PHIL-O10) — quota strict, originaux conservés. */
export default async function TripPhotosPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const [{ data: photos }, { data: me }, { data: events }] = await Promise.all([
    supabase
      .from("trip_photos")
      .select(
        "id, caption, uploaded_by, size_bytes, thumb_path, event_id, created_at, profiles!trip_photos_uploaded_by_fkey(display_name)",
      )
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false }),
    supabase
      .from("trip_participants")
      .select("role")
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("trip_events")
      .select("id, title")
      .eq("trip_id", tripId)
      .order("starts_at", { ascending: true }),
  ]);

  return (
    <PhotosClient
      tripId={tripId}
      photos={(photos ?? []).map((p) => ({
        id: p.id,
        caption: p.caption,
        uploadedBy: p.uploaded_by,
        uploaderName: p.profiles?.display_name ?? "Voyageur",
        sizeBytes: p.size_bytes,
        hasThumb: p.thumb_path !== null,
        eventId: p.event_id,
      }))}
      events={events ?? []}
      myId={user.id}
      userId={user.id}
      isOwner={me?.role === "OWNER"}
      quota={PHOTOS_PER_TRIP}
    />
  );
}
