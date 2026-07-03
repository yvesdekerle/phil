import { notFound } from "next/navigation";
import { PrepareOfflineButton } from "@/components/offline/prepare-offline-button";
import { createClient } from "@/lib/supabase/server";
import { CoverUpload } from "./cover-upload";
import { TripSettingsForm } from "./settings-form";

export default async function TripSettingsPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: trip } = await supabase.from("trips").select("*").eq("id", tripId).single();

  if (!trip || !user) {
    notFound();
  }

  const { data: me } = await supabase
    .from("trip_participants")
    .select("role")
    .eq("trip_id", tripId)
    .eq("user_id", user.id)
    .single();

  const isOwner = me?.role === "OWNER";
  const canEdit = me?.role === "OWNER" || me?.role === "EDITOR";

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <PrepareOfflineButton tripId={trip.id} />
      {canEdit ? <CoverUpload tripId={trip.id} /> : null}
      <TripSettingsForm
        tripId={trip.id}
        tripName={trip.name}
        isOwner={isOwner}
        isArchived={trip.archived_at !== null}
        canEdit={canEdit}
        defaultValues={{
          name: trip.name,
          destination: trip.destination,
          startDate: trip.start_date,
          endDate: trip.end_date,
          coverImageUrl: trip.cover_image_url ?? "",
          timezone: trip.default_timezone,
        }}
      />
    </div>
  );
}
