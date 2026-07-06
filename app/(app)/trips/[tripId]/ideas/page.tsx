import Link from "next/link";
import { redirect } from "next/navigation";
import { IdeaCard } from "@/components/ideas/idea-card";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { SearchForm } from "@/components/search-form";
import { Button } from "@/components/ui/button";
import { getT } from "@/lib/i18n/server";
import type { IdeaWithMeta } from "@/lib/ideas/types";
import { fuzzyMatch } from "@/lib/search/fuzzy";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function TripIdeasPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ sort?: string; tag?: string; dismissed?: string; q?: string }>;
}) {
  const { tripId } = await params;
  const { sort, tag, dismissed, q } = await searchParams;
  const sortBy = sort === "recent" ? "recent" : "votes";
  const showDismissed = dismissed === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const t = await getT();

  const [{ data: ideasData }, { data: me }] = await Promise.all([
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
  ]);

  const canPropose = me?.role === "OWNER" || me?.role === "EDITOR";

  let ideas: IdeaWithMeta[] = (ideasData ?? []).map((row) => {
    const votes = (row.idea_votes ?? []) as { user_id: string }[];
    return {
      ...row,
      voteCount: votes.length,
      hasVoted: votes.some((v) => v.user_id === user.id),
      creatorName: row.profiles?.display_name ?? t("ideas.travelerFallback"),
      scheduledEvent: row.trip_events ?? null,
    };
  });

  const allTags = [...new Set(ideas.flatMap((i) => i.tags))].sort();
  if (tag) {
    ideas = ideas.filter((i) => i.tags.includes(tag));
  }
  // PHIL-Q22 : recherche tolérante (accents, petites fautes)
  if (q?.trim()) {
    ideas = ideas.filter((i) =>
      fuzzyMatch(`${i.title} ${i.description ?? ""} ${i.location_name ?? ""}`, q),
    );
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
      {/* PHIL-Q03 : votes en direct */}
      <RealtimeRefresh tables={["idea_votes"]} />
      <div className="flex items-center justify-between">
        <p className="text-sm text-encre-douce">{t("ideas.intro")}</p>
        {canPropose ? (
          <Button asChild>
            <Link href={`/trips/${tripId}/ideas/new`}>{t("ideas.propose")}</Link>
          </Button>
        ) : null}
      </div>

      <SearchForm
        action={`/trips/${tripId}/ideas`}
        q={q}
        placeholder={t("ideas.searchPlaceholder")}
        hidden={{ sort, tag, dismissed }}
      />

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
          {t("ideas.sortVotes")}
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
          {t("ideas.sortRecent")}
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
          {showDismissed ? t("ideas.backToIdeas") : t("ideas.seeDismissed")}
        </Link>
      </div>

      {ideas.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-laiton-clair bg-papier/60 px-6 py-14 text-center">
          <p className="font-display text-xl text-encre italic">{t("ideas.emptyTitle")}</p>
          <p className="max-w-sm text-sm text-encre-douce">{t("ideas.emptyBody")}</p>
          {canPropose ? (
            <Button asChild className="mt-1">
              <Link href={`/trips/${tripId}/ideas/new`}>{t("ideas.propose")}</Link>
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
