import { Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { IdeaCard } from "@/components/ideas/idea-card";
import type { MapMarker } from "@/components/map/trip-map";
import { TripMapLazy } from "@/components/map/trip-map-lazy";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { SearchForm } from "@/components/search-form";
import { Button } from "@/components/ui/button";
import { FilterSelect } from "@/components/ui/filter-select";
import { haversineKm } from "@/lib/geo/distance";
import { formatMinutes, getTravelMinutes } from "@/lib/geo/travel-time";
import { getT } from "@/lib/i18n/server";
import type { IdeaWithMeta } from "@/lib/ideas/types";
import { fuzzyMatch } from "@/lib/search/fuzzy";
import { createClient } from "@/lib/supabase/server";
import { palette } from "@/lib/ui/colors";
import { cn } from "@/lib/utils";

export default async function TripIdeasPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{
    sort?: string;
    tag?: string;
    dismissed?: string;
    q?: string;
    lodging?: string;
  }>;
}) {
  const { tripId } = await params;
  const { sort, tag, dismissed, q, lodging } = await searchParams;
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

  const [{ data: ideasData }, { data: me }, { data: lodgings }, { count: crewCount }] =
    await Promise.all([
      supabase
        .from("trip_ideas")
        .select(
          "*, profiles!trip_ideas_created_by_fkey(display_name), idea_votes(user_id, verdict), trip_events!trip_ideas_scheduled_event_id_fkey(id, starts_at, timezone)",
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
        .from("trip_events")
        .select("id, title, location_lat, location_lng")
        .eq("trip_id", tripId)
        .eq("type", "LODGING")
        .not("location_lat", "is", null)
        .order("starts_at", { ascending: true }),
      supabase
        .from("trip_participants")
        .select("user_id", { count: "exact", head: true })
        .eq("trip_id", tripId),
    ]);

  const crewSize = crewCount ?? 1;
  const canPropose = me?.role === "OWNER" || me?.role === "EDITOR";

  // PHIL-U07 : nombre d'idées du pool que je n'ai pas encore swipées (pour le CTA).
  const toSwipeCount = (ideasData ?? []).filter(
    (i) => i.status === "POOL" && !(i.idea_votes ?? []).some((v) => v.user_id === user.id),
  ).length;

  // PHIL-Q37c : carte des idées géolocalisées + logements, distances depuis le logement choisi
  const locatedIdeas = (ideasData ?? []).filter(
    (i) => i.location_lat != null && i.location_lng != null,
  );
  const selectedLodging =
    (lodgings ?? []).find((l) => l.id === lodging) ?? (lodgings ?? [])[0] ?? null;
  const distanceFrom = selectedLodging
    ? {
        lat: selectedLodging.location_lat as number,
        lng: selectedLodging.location_lng as number,
        label: selectedLodging.title,
      }
    : null;

  // Distance à vol d'oiseau + temps de trajet (OSRM) depuis le logement choisi
  const distances = new Map<string, { text: string; title: string }>();
  if (selectedLodging) {
    const a = {
      lat: selectedLodging.location_lat as number,
      lng: selectedLodging.location_lng as number,
    };
    const legs = await Promise.all(
      locatedIdeas.map(async (i) => {
        const b = { lat: i.location_lat as number, lng: i.location_lng as number };
        const km = haversineKm(a, b);
        if (km < 0.3) return null;
        const minutes = await getTravelMinutes(a, b);
        const text = `≈ ${km.toFixed(km < 10 ? 1 : 0)} km${
          minutes !== null && minutes >= 3 ? ` · ${formatMinutes(minutes)}` : ""
        }`;
        return { id: i.id, text };
      }),
    );
    const title = t("ideas.distanceFrom").replace("{name}", selectedLodging.title);
    for (const leg of legs) {
      if (leg) distances.set(leg.id, { text: leg.text, title });
    }
  }

  const mapMarkers: MapMarker[] = [
    ...(lodgings ?? []).map(
      (l): MapMarker => ({
        id: l.id,
        lat: l.location_lat as number,
        lng: l.location_lng as number,
        title: l.title,
        subtitle: t("map.lodging"),
        color: palette.lagoon,
        house: true,
      }),
    ),
    ...locatedIdeas.map(
      (i): MapMarker => ({
        id: i.id,
        lat: i.location_lat as number,
        lng: i.location_lng as number,
        title: i.title,
        subtitle: i.location_name ?? undefined,
        color: palette.lagoonInk,
      }),
    ),
  ];

  let ideas: IdeaWithMeta[] = (ideasData ?? []).map((row) => {
    const votes = (row.idea_votes ?? []) as { user_id: string; verdict: string }[];
    let supers = 0;
    let likes = 0;
    let maybes = 0;
    let nos = 0;
    for (const v of votes) {
      if (v.verdict === "SUPER") supers += 1;
      else if (v.verdict === "YES") likes += 1;
      else if (v.verdict === "MAYBE") maybes += 1;
      else nos += 1;
    }
    const positives = supers + likes;
    return {
      ...row,
      voteCount: positives,
      hasVoted: votes.some((v) => v.user_id === user.id),
      supers,
      likes,
      maybes,
      nos,
      isMatch: crewSize > 0 && votes.length === crewSize && positives === crewSize,
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
    if (lodging) p.set("lodging", lodging);
    const qs = p.toString();
    return `/trips/${tripId}/ideas${qs ? `?${qs}` : ""}`;
  };
  const lodgingHref = (id: string) => {
    const p = new URLSearchParams();
    if (sortBy === "recent") p.set("sort", "recent");
    if (tag) p.set("tag", tag);
    if (showDismissed) p.set("dismissed", "1");
    if (q) p.set("q", q);
    p.set("lodging", id);
    return `/trips/${tripId}/ideas?${p.toString()}`;
  };

  return (
    <div className="flex flex-col gap-5">
      {/* PHIL-Q03 : votes en direct */}
      <RealtimeRefresh tables={["idea_votes"]} />

      {(lodgings ?? []).length > 1 && selectedLodging ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate">{t("ideas.distancesLabel")}</span>
          <FilterSelect
            value={selectedLodging.id}
            ariaLabel={t("ideas.lodgingFilter")}
            options={(lodgings ?? []).map((l) => ({
              value: l.id,
              label: l.title,
              href: lodgingHref(l.id),
            }))}
          />
        </div>
      ) : null}

      {mapMarkers.length > 0 ? (
        <TripMapLazy markers={mapMarkers} distanceFrom={distanceFrom} heightClass="h-[24rem]" />
      ) : null}

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate">{t("ideas.intro")}</p>
        {canPropose ? (
          <Button asChild>
            <Link href={`/trips/${tripId}/ideas/new`}>{t("ideas.propose")}</Link>
          </Button>
        ) : null}
      </div>

      {/* PHIL-U07 : lance le swipe façon Tinder/Bumble sur les idées du voyage. */}
      <Link
        href={`/trips/${tripId}/ideas/match`}
        className="group flex items-center justify-between gap-3 rounded-xl border border-lagoon-ink/30 bg-gradient-to-br from-lagoon-ink/10 to-mist/10 px-4 py-3.5 transition-colors hover:border-lagoon-ink/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mist"
      >
        <span className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-lagoon-ink text-card">
            <Sparkles className="size-5" aria-hidden="true" />
          </span>
          <span className="flex flex-col">
            <span className="font-sans text-lg text-ink">{t("ideas.match.cta")}</span>
            <span className="text-xs text-slate">
              {toSwipeCount > 0
                ? t("ideas.match.ctaCount").replace("{n}", String(toSwipeCount))
                : t("ideas.match.ctaDone")}
            </span>
          </span>
        </span>
        <span className="shrink-0 font-sans text-2xl text-lagoon-ink transition-transform group-hover:translate-x-0.5">
          →
        </span>
      </Link>

      <SearchForm
        action={`/trips/${tripId}/ideas`}
        q={q}
        placeholder={t("ideas.searchPlaceholder")}
        hidden={{ sort, tag, dismissed, lodging }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={filterHref(null, tag ?? null)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            sortBy === "votes"
              ? "border-lagoon-ink bg-lagoon-ink text-card"
              : "border-line bg-card text-slate hover:text-ink",
          )}
        >
          {t("ideas.sortVotes")}
        </Link>
        <Link
          href={filterHref("recent", tag ?? null)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            sortBy === "recent"
              ? "border-lagoon-ink bg-lagoon-ink text-card"
              : "border-line bg-card text-slate hover:text-ink",
          )}
        >
          {t("ideas.sortRecent")}
        </Link>
        {allTags.length > 0 ? <span className="mx-1 text-line">·</span> : null}
        {allTags.map((t) => (
          <Link
            key={t}
            href={filterHref(sortBy === "recent" ? "recent" : null, tag === t ? null : t)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              tag === t
                ? "border-line bg-citron text-card"
                : "border-line bg-card text-slate hover:text-ink",
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
              ? "border-ink bg-ink text-card"
              : "border-line bg-card text-slate hover:text-ink",
          )}
        >
          {showDismissed ? t("ideas.backToIdeas") : t("ideas.seeDismissed")}
        </Link>
      </div>

      {ideas.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line bg-card/60 px-6 py-14 text-center">
          <p className="font-sans text-xl text-ink italic">{t("ideas.emptyTitle")}</p>
          <p className="max-w-sm text-sm text-slate">{t("ideas.emptyBody")}</p>
          {canPropose ? (
            <Button asChild className="mt-1">
              <Link href={`/trips/${tripId}/ideas/new`}>{t("ideas.propose")}</Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {ideas.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              tripId={tripId}
              canPlan={canPropose}
              distance={distances.get(idea.id) ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
