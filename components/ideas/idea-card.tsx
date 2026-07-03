import { CalendarPlus, Clock, Coins, ExternalLink, MapPin } from "lucide-react";
import Link from "next/link";
import { formatInTimezone } from "@/lib/events/datetime";
import type { IdeaWithMeta } from "@/lib/ideas/types";
import { cn } from "@/lib/utils";
import { VoteButton } from "./vote-button";

export function IdeaCard({
  idea,
  tripId,
  canPlan,
}: {
  idea: IdeaWithMeta;
  tripId: string;
  canPlan: boolean;
}) {
  return (
    <article
      className={cn(
        "flex flex-col gap-2.5 rounded-lg border border-laiton-clair bg-papier px-4 py-3.5",
        idea.status === "SCHEDULED" && "opacity-80",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="flex flex-wrap items-center gap-2 text-sm font-medium text-encre">
            {idea.title}
            {idea.status === "SCHEDULED" ? (
              idea.scheduledEvent ? (
                <Link
                  href={`/trips/${tripId}/events/${idea.scheduledEvent.id}`}
                  className="rounded-full bg-laiton px-2 py-0.5 text-[0.65rem] font-medium text-papier uppercase hover:bg-laiton/80"
                >
                  Planifié le{" "}
                  {formatInTimezone(
                    idea.scheduledEvent.starts_at,
                    idea.scheduledEvent.timezone,
                    "d MMM",
                  )}
                </Link>
              ) : (
                <span className="rounded-full bg-laiton px-2 py-0.5 text-[0.65rem] font-medium text-papier uppercase">
                  Planifié
                </span>
              )
            ) : null}
          </h3>
          {idea.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-encre-douce">{idea.description}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {canPlan && idea.status === "POOL" ? (
            <Link
              href={`/trips/${tripId}/events/new?ideaId=${idea.id}`}
              className="flex items-center gap-1.5 rounded-full border border-laiton-clair bg-papier px-3 py-1.5 text-sm font-medium text-encre-douce transition-colors hover:text-encre focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laiton"
            >
              <CalendarPlus className="size-4" aria-hidden="true" />
              Planifier
            </Link>
          ) : null}
          <VoteButton
            tripId={tripId}
            ideaId={idea.id}
            count={idea.voteCount}
            hasVoted={idea.hasVoted}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-encre-douce">
        {idea.location_name ? (
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" aria-hidden="true" /> {idea.location_name}
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
            className="inline-flex items-center gap-1 text-bordeaux underline underline-offset-4"
          >
            <ExternalLink className="size-3.5" aria-hidden="true" /> Lien
          </a>
        ) : null}
        <span className="ml-auto">proposé par {idea.creatorName}</span>
      </div>

      {idea.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {idea.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-parchemin px-2 py-0.5 text-xs text-encre-douce"
            >
              #{tag}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}
