"use client";

import { Lock, Sparkles, Star } from "lucide-react";
import { useT } from "@/components/i18n/provider";
import type { ParticipantProgress } from "@/lib/activities/consensus";
import { cn } from "@/lib/utils";

export interface ConsensusActivity {
  activityId: string;
  title: string;
  supers: number;
  likes: number;
  nos: number;
}

/**
 * Consensus de groupe (PHIL-U04 Phase 2) : progression de l'équipage (toujours
 * visible) + **révélation différée** des matchs et du classement (`meDone`,
 * anti-biais — on ne dévoile le verdict du groupe qu'une fois qu'on a soi-même
 * tout tranché). Les matchs sont les activités où *tout l'équipage* a dit
 * oui/coup de cœur : la valeur que Yallah n'agrège jamais.
 */
export function ActivityConsensus({
  progress,
  matches,
  ranking,
  meDone,
  remaining,
}: {
  progress: ParticipantProgress[];
  matches: ConsensusActivity[];
  ranking: ConsensusActivity[];
  meDone: boolean;
  remaining: number;
}) {
  const t = useT();

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-encre">{t("activities.progressTitle")}</h2>
        <ul className="flex flex-col gap-2">
          {progress.map((p) => {
            const pct = p.total > 0 ? Math.round((p.voted / p.total) * 100) : 0;
            return (
              <li key={p.userId} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-sm text-encre">{p.name}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-laiton-clair/50">
                  <span
                    className={cn(
                      "block h-full rounded-full transition-[width] duration-500",
                      p.done ? "bg-vert" : "bg-laiton",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span
                  className={cn(
                    "w-14 shrink-0 text-right text-xs tabular-nums",
                    p.done ? "text-vert" : "text-encre-douce",
                  )}
                >
                  {p.done ? t("activities.progressDone") : `${p.voted}/${p.total}`}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {meDone ? (
        <>
          <section className="flex flex-col gap-2">
            <h2 className="flex items-center gap-1.5 text-sm font-medium text-encre">
              <Sparkles className="size-4 text-vert" aria-hidden="true" />
              {t("activities.matchesTitle")}
            </h2>
            {matches.length === 0 ? (
              <p className="text-sm text-encre-douce">{t("activities.matchesEmpty")}</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {matches.map((m) => (
                  <li
                    key={m.activityId}
                    className="flex items-center justify-between gap-3 rounded-lg border border-vert/30 bg-vert/5 px-4 py-2.5"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Sparkles className="size-4 shrink-0 text-vert" aria-hidden="true" />
                      <span className="truncate text-sm font-medium text-encre">{m.title}</span>
                    </span>
                    {m.supers > 0 ? (
                      <span className="flex shrink-0 items-center gap-1 text-xs text-laiton">
                        <Star className="size-3.5 fill-laiton" aria-hidden="true" />
                        {m.supers}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-encre">{t("activities.consensusTitle")}</h2>
            {ranking.length === 0 ? (
              <p className="text-sm text-encre-douce">{t("activities.consensusEmpty")}</p>
            ) : (
              <ol className="flex flex-col gap-1.5">
                {ranking.map((r, i) => (
                  <li
                    key={r.activityId}
                    className="flex items-center justify-between gap-3 rounded-lg border border-laiton-clair bg-papier px-4 py-2"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="font-display text-laiton">{i + 1}</span>
                      <span className="truncate text-sm text-encre">{r.title}</span>
                    </span>
                    <span className="shrink-0 text-xs text-encre-douce">
                      {t("activities.votesSummary")
                        .replace("{supers}", String(r.supers))
                        .replace("{likes}", String(r.likes))
                        .replace("{nos}", String(r.nos))}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-laiton-clair bg-papier/60 px-4 py-8 text-center">
          <Lock className="size-5 text-laiton" aria-hidden="true" />
          <p className="text-sm font-medium text-encre">{t("activities.revealLocked")}</p>
          <p className="text-xs text-encre-douce">
            {t("activities.revealRemaining").replace("{n}", String(remaining))}
          </p>
        </div>
      )}
    </div>
  );
}
