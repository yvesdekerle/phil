import Link from "next/link";
import { notFound } from "next/navigation";
import { PrepareOfflineButton } from "@/components/offline/prepare-offline-button";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { CalendarFeed } from "./calendar-feed";
import { CoverPosition } from "./cover-position";
import { CoverUpload } from "./cover-upload";
import { EmailAliasCard } from "./email-alias";
import { PublicShareCard } from "./public-share";
import { TripSettingsForm } from "./settings-form";

export default async function TripSettingsPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const t = await getT();
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
    .select("role, calendar_token")
    .eq("trip_id", tripId)
    .eq("user_id", user.id)
    .single();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const calendarUrl = me
    ? `${baseUrl}/api/trips/${tripId}/calendar.ics?token=${me.calendar_token}`
    : null;

  const isOwner = me?.role === "OWNER";
  const canEdit = me?.role === "OWNER" || me?.role === "EDITOR";

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <PrepareOfflineButton tripId={trip.id} />
      <p className="text-sm">
        <Link
          href="/conseils"
          className="text-encre-douce underline underline-offset-4 hover:text-encre"
        >
          {t("settings.tipsLink")}
        </Link>
      </p>
      {calendarUrl ? <CalendarFeed url={calendarUrl} /> : null}
      {canEdit ? (
        <EmailAliasCard
          tripId={trip.id}
          alias={trip.email_alias}
          domain={process.env.NEXT_PUBLIC_INBOUND_EMAIL_DOMAIN ?? null}
        />
      ) : null}
      {isOwner ? (
        <PublicShareCard tripId={trip.id} token={trip.public_token} baseUrl={baseUrl} />
      ) : null}
      {canEdit ? <CoverUpload tripId={trip.id} /> : null}
      {canEdit && trip.cover_image_url ? (
        <CoverPosition tripId={trip.id} src={trip.cover_image_url} />
      ) : null}
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
          whatsappGroupUrl: trip.whatsapp_group_url ?? "",
          currencyPrimary: trip.currency_primary,
          currencySecondary: trip.currency_secondary ?? "",
          timezone: trip.default_timezone,
        }}
      />
    </div>
  );
}
