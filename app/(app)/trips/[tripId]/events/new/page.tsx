import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import type { EventType } from "@/lib/events/types";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
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
  searchParams: Promise<{ type?: string }>;
}) {
  const { tripId } = await params;
  const { type } = await searchParams;
  const activeType: EventType =
    type === "LODGING" || type === "ACTIVITY" ? (type as EventType) : "TRANSPORT";

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

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
      <Link
        href={`/trips/${tripId}`}
        className="text-sm text-encre-douce underline underline-offset-4 hover:text-encre"
      >
        ← Retour au calendrier
      </Link>
      <h1 className="mt-3 mb-6 text-center font-display text-3xl text-encre">Nouvel événement</h1>

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
            <p className="py-8 text-center text-sm text-encre-douce">
              Le formulaire activité arrive avec PHIL-F06.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
