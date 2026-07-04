import Link from "next/link";
import { redirect } from "next/navigation";
import { IdeaCard } from "@/components/ideas/idea-card";
import { type Poll, PollsSection } from "@/components/ideas/polls-section";
import { Button } from "@/components/ui/button";
import type { IdeaWithMeta } from "@/lib/ideas/types";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function TripIdeasPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ sort?: string; tag?: string; dismissed?: string }>;
}) {
  const { tripId } = await params;
  const { sort, tag, dismissed } = await searchParams;
  const sortBy = sort === "recent" ? "recent" : "votes";
  const showDismissed = dismissed === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const [{ data: ideasData }, { data: me }, { data: pollsData }] = await Promise.all([
    supabase
      .from("trip_ideas")
      .select(
        "*, profiles!trip_ideas_created_by_fkey(display_name), idea_votes(user_id), trip_events!trip_ideas_scheduled_event_id_fkey(id, starts_at, timezone)",
      )
      .eq("trip_id", tripId)
      .in("status", showDismissed ? ["DISMISSED"] : ["POOL", "SCHEDULED"])
      .order("created_at", { ascending: false }),
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
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const polls: Poll[] = (pollsData ?? []).map((p) => ({
    id: p.id,
    question: p.question,
    options: p.options,
    closed_at: p.closed_at,
    created_by: p.created_by,
    votes: p.poll_votes ?? [],
  }));

  const canPropose = me?.role === "OWNER" || me?.role === "EDITOR";

  let ideas: IdeaWithMeta[] = (ideasData ?? []).map((row) => {
    const votes = (row.idea_votes ?? []) as { user_id: string }[];
    return {
      ...row,
      voteCount: votes.length,
      hasVoted: votes.some((v) => v.user_id === user.id),
      creatorName: row.profiles?.display_name ?? "Voyageur",
      scheduledEvent: row.trip_events ?? null,
    };
  });

  const allTags = [...new Set(ideas.flatMap((i) => i.tags))].sort();
  if (tag) {
    ideas = ideas.filter((i) => i.tags.includes(tag));
  }
  if (sortBy === "votes") {
    ideas = [...ideas].sort((a, b) => b.voteCount - a.voteCount);
  }

  const filterHref = (s: string | null, t: string | null, d = showDismissed) => {
    const p = new URLSearchParams();
    if (s && s !== "votes") p.set("sort", s);
    if (t) p.set("tag", t);
    if (d) p.set("dismissed", "1");
    const qs = p.toString();
    return `/trips/${tripId}/ideas${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-5">
      <PollsSection tripId={tripId} polls={polls} myId={user.id} isOwner={me?.role === "OWNER"} />
      <div className="flex items-center justify-between">
        <p className="text-sm text-encre-douce">
          Le carnet d'envies du groupe — on propose, on vote, on planifie.
        </p>
        {canPropose ? (
          <Button asChild>
            <Link href={`/trips/${tripId}/ideas/new`}>Proposer une idée</Link>
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={filterHref(null, tag ?? null)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            sortBy === "votes"
              ? "border-bordeaux bg-bordeaux text-papier"
              : "border-laiton-clair bg-papier text-encre-douce hover:text-encre",
          )}
        >
          Les plus votées
        </Link>
        <Link
          href={filterHref("recent", tag ?? null)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            sortBy === "recent"
              ? "border-bordeaux bg-bordeaux text-papier"
              : "border-laiton-clair bg-papier text-encre-douce hover:text-encre",
          )}
        >
          Les plus récentes
        </Link>
        {allTags.length > 0 ? <span className="mx-1 text-laiton-clair">·</span> : null}
        {allTags.map((t) => (
          <Link
            key={t}
            href={filterHref(sortBy === "recent" ? "recent" : null, tag === t ? null : t)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              tag === t
                ? "border-laiton bg-laiton text-papier"
                : "border-laiton-clair bg-papier text-encre-douce hover:text-encre",
            )}
          >
            #{t}
          </Link>
        ))}
        <span className="flex-1" />
        <Link
          href={filterHref(sortBy === "recent" ? "recent" : null, tag ?? null, !showDismissed)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            showDismissed
              ? "border-encre bg-encre text-papier"
              : "border-laiton-clair bg-papier text-encre-douce hover:text-encre",
          )}
        >
          {showDismissed ? "← Retour aux idées" : "Voir les écartées"}
        </Link>
      </div>

      {ideas.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-laiton-clair bg-papier/60 px-6 py-14 text-center">
          <p className="font-display text-xl text-encre italic">Aucune idée pour l'instant</p>
          <p className="max-w-sm text-sm text-encre-douce">
            Plongée, marché local, resto de bord de mer : propose, le groupe votera.
          </p>
          {canPropose ? (
            <Button asChild className="mt-1">
              <Link href={`/trips/${tripId}/ideas/new`}>Proposer une idée</Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {ideas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} tripId={tripId} canPlan={canPropose} />
          ))}
        </div>
      )}
    </div>
  );
}
