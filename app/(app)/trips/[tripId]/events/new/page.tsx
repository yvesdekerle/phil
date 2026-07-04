import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import type { EventType } from "@/lib/events/types";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { ActivityForm } from "./activity-form";
import { LodgingForm } from "./lodging-form";
import { TransportForm } from "./transport-form";

const TYPE_TABS: { type: EventType; label: string }[] = [
  { type: "TRANSPORT", label: "Transport" },
  { type: "LODGING", label: "Hébergement" },
  { type: "ACTIVITY", label: "Activité" },
];

export default async function NewEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ type?: string; ideaId?: string }>;
}) {
  const { tripId } = await params;
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
        className="text-sm text-encre-douce underline underline-offset-4 hover:text-encre"
      >
        ← Retour au calendrier
      </Link>
      <h1 className="mt-3 mb-2 text-center font-display text-3xl text-encre">Nouvel événement</h1>
      <p className="mb-6 text-center text-sm text-encre-douce">
        Tu as la confirmation sous la main ?{" "}
        <Link
          href={`/trips/${tripId}/events/import`}
          className="text-bordeaux underline underline-offset-4"
        >
          Importe-la
        </Link>{" "}
        et je pré-remplis tout.
      </p>

      <div className="mb-6 flex justify-center gap-2">
        {TYPE_TABS.map((tab) => (
          <Link
            key={tab.type}
            href={`/trips/${tripId}/events/new?type=${tab.type}`}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              activeType === tab.type
                ? "border-bordeaux bg-bordeaux text-papier"
                : "border-laiton-clair bg-papier text-encre-douce hover:text-encre",
            )}
          >
            {tab.label}
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
