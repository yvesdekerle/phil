import { redirect } from "next/navigation";
import { type Poll, PollsSection } from "@/components/ideas/polls-section";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

/** Sondages éclair (PHIL-Q37c) — décisions de groupe, sortis de la page Idées. */
export default async function TripPollsPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const t = await getT();

  const [{ data: me }, { data: pollsData }] = await Promise.all([
    supabase
      .from("trip_participants")
      .select("role")
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("polls")
      .select("id, question, options, closed_at, created_by, poll_votes(user_id, option_index)")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false }),
  ]);

  const polls: Poll[] = (pollsData ?? []).map((p) => ({
    id: p.id,
    question: p.question,
    options: p.options,
    closed_at: p.closed_at,
    created_by: p.created_by,
    votes: p.poll_votes ?? [],
  }));

  return (
    <div className="flex flex-col gap-5">
      <RealtimeRefresh tables={["polls", "poll_votes"]} />
      <p className="text-sm text-encre-douce">{t("ideas.pollsIntro")}</p>
      <PollsSection tripId={tripId} polls={polls} myId={user.id} isOwner={me?.role === "OWNER"} />
    </div>
  );
}
