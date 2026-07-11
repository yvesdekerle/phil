import {
  CalendarPlus,
  Car,
  Clock,
  Coins,
  ExternalLink,
  Heart,
  MapPin,
  Sparkles,
  Star,
  ThumbsDown,
} from "lucide-react";
import Link from "next/link";
import { Linkify } from "@/components/ui/linkify";
import { formatInTimezone } from "@/lib/events/datetime";
import { getT } from "@/lib/i18n/server";
import type { IdeaWithMeta } from "@/lib/ideas/types";
import { cn } from "@/lib/utils";
import { DismissButton } from "./dismiss-button";

export async function IdeaCard({
  idea,
  tripId,
  canPlan,
  distance,
}: {
  idea: IdeaWithMeta;
  tripId: string;
  canPlan: boolean;
  /** Distance/temps depuis le logement de référence (PHIL-Q37c). */
  distance?: { text: string; title: string } | null;
}) {
  const t = await getT();
  return (
    <article
      className={cn(
        "flex flex-col gap-2.5 rounded-lg border border-line bg-card px-4 py-3.5",
        idea.status === "SCHEDULED" && "opacity-80",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
            {idea.title}
            {idea.status === "SCHEDULED" ? (
              idea.scheduledEvent ? (
                <Link
                  href={`/trips/${tripId}/events/${idea.scheduledEvent.id}`}
                  className="rounded-full bg-citron px-2 py-0.5 text-[0.65rem] font-medium text-card uppercase hover:bg-citron/80"
                >
                  {t("ideas.scheduledOn")}{" "}
                  {formatInTimezone(
                    idea.scheduledEvent.starts_at,
                    idea.scheduledEvent.timezone,
                    "d MMM",
                  )}
                </Link>
              ) : (
                <span className="rounded-full bg-citron px-2 py-0.5 text-[0.65rem] font-medium text-card uppercase">
                  {t("ideas.scheduled")}
                </span>
              )
            ) : null}
          </h3>
          {idea.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-slate">
              <Linkify text={idea.description} />
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {canPlan && idea.status === "POOL" ? (
            <Link
              href={`/trips/${tripId}/events/new?ideaId=${idea.id}`}
              className="flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-sm font-medium text-slate transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mist"
            >
              <CalendarPlus className="size-4" aria-hidden="true" />
              {t("ideas.plan")}
            </Link>
          ) : null}
          {canPlan && idea.status !== "SCHEDULED" ? (
            <DismissButton
              tripId={tripId}
              ideaId={idea.id}
              dismissed={idea.status === "DISMISSED"}
            />
          ) : null}
          {/* PHIL-U07 : compteurs du swipe (le vote se fait dans « Match tes activités »). */}
          <div className="flex shrink-0 items-center gap-2.5 text-sm">
            {idea.isMatch ? (
              <span className="flex items-center gap-1 rounded-full bg-lagoon/15 px-2 py-1 text-xs font-medium text-lagoon">
                <Sparkles className="size-3.5" aria-hidden="true" /> {t("ideas.match.badge")}
              </span>
            ) : null}
            {idea.supers > 0 ? (
              <span
                className="flex items-center gap-1 text-ink-deep"
                title={t("ideas.match.super")}
              >
                <Star className="size-4 fill-current" aria-hidden="true" /> {idea.supers}
              </span>
            ) : null}
            <span className="flex items-center gap-1 text-lagoon" title={t("ideas.match.yes")}>
              <Heart className="size-4 fill-current" aria-hidden="true" /> {idea.likes}
            </span>
            {idea.nos > 0 ? (
              <span className="flex items-center gap-1 text-lagoon-ink" title={t("ideas.match.no")}>
                <ThumbsDown className="size-4" aria-hidden="true" /> {idea.nos}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate">
        {idea.location_name ? (
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" aria-hidden="true" /> {idea.location_name}
          </span>
        ) : null}
        {distance ? (
          <span className="inline-flex items-center gap-1" title={distance.title}>
            <Car className="size-3.5" aria-hidden="true" /> {distance.text}
          </span>
        ) : null}
        {idea.estimated_duration_minutes ? (
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden="true" /> {idea.estimated_duration_minutes} min
          </span>
        ) : null}
        {idea.estimated_cost ? (
          <span className="inline-flex items-center gap-1">
            <Coins className="size-3.5" aria-hidden="true" /> {idea.estimated_cost}{" "}
            {idea.cost_currency ?? "EUR"}
          </span>
        ) : null}
        {idea.external_url ? (
          <a
            href={idea.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-lagoon-ink underline underline-offset-4"
          >
            <ExternalLink className="size-3.5" aria-hidden="true" /> {t("ideas.link")}
          </a>
        ) : null}
        <span className="ml-auto">
          {t("ideas.proposedBy")} {idea.creatorName}
        </span>
      </div>

      {idea.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {idea.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-sand px-2 py-0.5 text-xs text-slate">
              #{tag}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}
