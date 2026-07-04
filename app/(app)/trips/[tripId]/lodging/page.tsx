import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type Candidate, LodgingClient } from "./lodging-client";

/** Hébergements candidats (PHIL-L01) : comparer, puis trancher. */
export default async function LodgingCandidatesPage({
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

  const [{ data: candidates }, { data: me }] = await Promise.all([
    supabase
      .from("lodging_candidates")
      .select(
        "id, title, url, price, notes, check_in, check_out, status, created_by, profiles!lodging_candidates_created_by_fkey(display_name)",
      )
      .eq("trip_id", tripId)
      .order("check_in", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("trip_participants")
      .select("role")
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .single(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          href={`/trips/${tripId}/ideas`}
          className="text-sm text-encre-douce underline underline-offset-4 hover:text-encre"
        >
          ← Retour aux idées
        </Link>
        <h1 className="mt-2 font-display text-2xl text-encre">Hébergements candidats</h1>
        <p className="mt-1 text-sm text-encre-douce">
          Plusieurs options pour un même créneau — on compare, on vote, puis le capitaine tranche et
          l&apos;élu rejoint le calendrier.
        </p>
      </div>
      <LodgingClient
        tripId={tripId}
        candidates={(candidates ?? []).map(
          (c): Candidate => ({
            id: c.id,
            title: c.title,
            url: c.url,
            price: c.price,
            notes: c.notes,
            checkIn: c.check_in,
            checkOut: c.check_out,
            status: c.status as Candidate["status"],
            createdBy: c.created_by,
            authorName: c.profiles?.display_name ?? "Voyageur",
          }),
        )}
        myId={user.id}
        role={me?.role ?? "VIEWER"}
      />
    </div>
  );
}
