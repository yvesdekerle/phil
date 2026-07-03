import Image from "next/image";
import { notFound } from "next/navigation";
import { TripTabs } from "@/components/trips/trip-tabs";
import { createClient } from "@/lib/supabase/server";
import { formatDateRange } from "@/lib/trips/format";
import { TRIP_STATUS_LABELS, tripStatus } from "@/lib/trips/status";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  en_cours: "bg-bordeaux text-papier",
  a_venir: "bg-laiton text-papier",
  passe: "bg-encre-douce/15 text-encre-douce",
  archive: "bg-encre-douce/15 text-encre-douce",
};

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const supabase = await createClient();
  const { data: trip } = await supabase.from("trips").select("*").eq("id", tripId).single();

  if (!trip) {
    // RLS : voyage inexistant ou visiteur non participant — même réponse.
    notFound();
  }

  const status = tripStatus(trip);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
      <header className="overflow-hidden rounded-lg border border-laiton-clair bg-papier">
        <div className="relative h-40 bg-encre sm:h-52">
          {trip.cover_image_url ? (
            <Image
              src={trip.cover_image_url}
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="font-display text-6xl text-laiton italic">
                {trip.destination.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3 px-5 py-4">
          <div>
            <h1 className="font-display text-3xl text-encre">{trip.name}</h1>
            <p className="mt-1 text-sm text-encre-douce">
              {trip.destination} · {formatDateRange(trip.start_date, trip.end_date)}
            </p>
          </div>
          <span className={cn("rounded-full px-3 py-1 text-xs font-medium", STATUS_STYLES[status])}>
            {TRIP_STATUS_LABELS[status]}
          </span>
        </div>
        <div className="border-t border-laiton-clair/60 px-5">
          <TripTabs tripId={trip.id} />
        </div>
      </header>

      <div className="py-6">{children}</div>
    </main>
  );
}
