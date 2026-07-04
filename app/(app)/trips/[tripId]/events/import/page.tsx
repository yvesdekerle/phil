import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { importEnabled } from "@/lib/import/reservation";
import { createClient } from "@/lib/supabase/server";
import { ImportClient } from "./import-client";

/** Import d'une confirmation de réservation (PHIL-O01). */
export default async function ImportReservationPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: trip } = await supabase
    .from("trips")
    .select("default_timezone")
    .eq("id", tripId)
    .single();
  if (!trip) {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <Link
        href={`/trips/${tripId}/events/new`}
        className="text-sm text-encre-douce underline underline-offset-4 hover:text-encre"
      >
        ← Saisie manuelle
      </Link>
      <div>
        <h1 className="font-display text-2xl text-encre">Importer une confirmation</h1>
        <p className="mt-1 text-sm text-encre-douce">
          Dépose le PDF (ou des captures d&apos;écran) de ta réservation — je pré-remplis
          l&apos;événement, tu vérifies, et la confirmation est rangée dans les documents du voyage.
        </p>
      </div>
      {importEnabled() ? (
        <ImportClient tripId={tripId} userId={user.id} defaultTimezone={trip.default_timezone} />
      ) : (
        <p className="rounded-lg border border-dashed border-laiton-clair bg-papier/60 px-4 py-8 text-center text-sm text-encre-douce">
          L&apos;import n&apos;est pas configuré sur cet environnement (clé GEMINI_API_KEY absente).
        </p>
      )}
    </div>
  );
}
