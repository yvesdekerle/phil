import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { type ExtractedReservation, importEnabled } from "@/lib/import/reservation";
import { createClient } from "@/lib/supabase/server";
import { dismissDraft } from "./actions";
import { ImportClient } from "./import-client";

/** Import d'une confirmation de réservation (PHIL-O01, brouillons email PHIL-P02). */
export default async function ImportReservationPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ draft?: string }>;
}) {
  const { tripId } = await params;
  const { draft: draftId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const [{ data: trip }, { data: drafts }] = await Promise.all([
    supabase.from("trips").select("default_timezone").eq("id", tripId).single(),
    supabase
      .from("import_drafts")
      .select("id, sender, subject, file_name, extracted, created_at")
      .eq("trip_id", tripId)
      .eq("status", "PENDING")
      .order("created_at", { ascending: false }),
  ]);
  if (!trip) {
    notFound();
  }

  const activeDraft = draftId ? (drafts ?? []).find((d) => d.id === draftId) : undefined;

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
      {(drafts ?? []).length > 0 && !activeDraft ? (
        <section className="rounded-lg border border-laiton bg-laiton/5 px-4 py-3">
          <h2 className="mb-2 text-sm font-medium text-encre">
            Reçues par email — à valider ({(drafts ?? []).length})
          </h2>
          <ul className="flex flex-col gap-2">
            {(drafts ?? []).map((d) => {
              const extracted = d.extracted as ExtractedReservation;
              return (
                <li key={d.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="min-w-0 flex-1 truncate text-encre">
                    {extracted?.title ?? d.subject ?? "Réservation"}
                    <span className="ml-1.5 text-xs text-encre-douce">de {d.sender}</span>
                  </span>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/trips/${tripId}/events/import?draft=${d.id}`}>Vérifier</Link>
                  </Button>
                  <form action={dismissDraft.bind(null, tripId, d.id)}>
                    <Button type="submit" size="sm" variant="ghost">
                      Écarter
                    </Button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {importEnabled() ? (
        <ImportClient
          tripId={tripId}
          userId={user.id}
          defaultTimezone={trip.default_timezone}
          draft={
            activeDraft
              ? {
                  id: activeDraft.id,
                  extracted: activeDraft.extracted as ExtractedReservation,
                  fileName: activeDraft.file_name,
                }
              : undefined
          }
        />
      ) : (
        <p className="rounded-lg border border-dashed border-laiton-clair bg-papier/60 px-4 py-8 text-center text-sm text-encre-douce">
          L&apos;import n&apos;est pas configuré sur cet environnement (clé GEMINI_API_KEY absente).
        </p>
      )}
    </div>
  );
}
