import { FileUp } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { EventType } from "@/lib/events/types";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { ActivityForm } from "./activity-form";
import { LodgingForm } from "./lodging-form";
import { TransportForm } from "./transport-form";

const TYPE_TABS: EventType[] = ["TRANSPORT", "LODGING", "ACTIVITY"];

export default async function NewEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ type?: string; ideaId?: string }>;
}) {
  const { tripId } = await params;
  const t = await getT();
  const { type, ideaId } = await searchParams;
  const activeType: EventType =
    ideaId || type === "ACTIVITY" ? "ACTIVITY" : type === "LODGING" ? "LODGING" : "TRANSPORT";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: trip } = await supabase
    .from("trips")
    .select("id, name, default_timezone")
    .eq("id", tripId)
    .single();
  if (!trip) {
    notFound();
  }

  // Conversion depuis une idée (PHIL-H04) : formulaire ACTIVITY pré-rempli.
  let prefill: import("./activity-form").ActivityPrefill | undefined;
  if (ideaId) {
    const { data: idea } = await supabase
      .from("trip_ideas")
      .select("*")
      .eq("id", ideaId)
      .eq("trip_id", tripId)
      .single();
    if (idea) {
      prefill = {
        ideaId: idea.id,
        title: idea.title,
        description: idea.description ?? "",
        locationName: idea.location_name ?? "",
        durationMinutes: idea.estimated_duration_minutes
          ? String(idea.estimated_duration_minutes)
          : "",
        cost: idea.estimated_cost !== null ? String(idea.estimated_cost) : "",
        costCurrency: idea.cost_currency ?? "",
        externalUrl: idea.external_url ?? "",
      };
    }
  }

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
      <Link
        href={`/trips/${tripId}`}
        className="text-sm text-slate underline underline-offset-4 hover:text-ink"
      >
        {t("calendar.backToCalendar")}
      </Link>
      <h1 className="mt-3 mb-2 text-center font-sans text-3xl text-ink">{t("events.new.title")}</h1>
      <div className="mb-6 flex flex-col items-center gap-2">
        <p className="text-center text-sm text-slate">{t("events.new.importPrompt")}</p>
        <Link
          href={`/trips/${tripId}/events/import`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          <FileUp aria-hidden="true" />
          {t("events.new.importButton")}
        </Link>
      </div>

      <div className="mb-6 flex justify-center gap-2">
        {TYPE_TABS.map((tabType) => (
          <Link
            key={tabType}
            href={`/trips/${tripId}/events/new?type=${tabType}`}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              activeType === tabType
                ? "border-lagoon-ink bg-lagoon-ink text-card"
                : "border-line bg-card text-slate hover:text-ink",
            )}
          >
            {t(`events.type.${tabType}`)}
          </Link>
        ))}
      </div>

      <Card>
        <CardContent>
          {activeType === "TRANSPORT" ? (
            <TransportForm tripId={trip.id} defaultTimezone={trip.default_timezone} />
          ) : activeType === "LODGING" ? (
            <LodgingForm tripId={trip.id} defaultTimezone={trip.default_timezone} />
          ) : (
            <ActivityForm
              tripId={trip.id}
              defaultTimezone={trip.default_timezone}
              prefill={prefill}
            />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
