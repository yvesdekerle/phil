"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useT } from "@/components/i18n/provider";
import { cn } from "@/lib/utils";
import { toggleEventParticipant } from "./actions";

export type EventParticipantOption = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  isIn: boolean;
  canToggle: boolean;
};

/** Participants optionnels d'un événement (PHIL-F11) : puces cliquables. */
export function EventParticipants({
  tripId,
  eventId,
  options,
}: {
  tripId: string;
  eventId: string;
  options: EventParticipantOption[];
}) {
  const t = useT();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const count = options.filter((o) => o.isIn).length;

  function toggle(option: EventParticipantOption) {
    if (!option.canToggle || pending) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await toggleEventParticipant(tripId, eventId, option.userId, !option.isIn);
      if (result.status === "error") {
        setError(result.message ?? t("events.participants.updateError"));
      } else {
        router.refresh();
      }
    });
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-ink">{t("events.participants.heading")}</h2>
        <span className="text-xs text-slate">
          {count === 0
            ? t("events.participants.allGroup")
            : `${count} ${count > 1 ? t("events.participants.signedUpPlural") : t("events.participants.signedUpSingular")}`}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.userId}
            type="button"
            disabled={!option.canToggle || pending}
            onClick={() => toggle(option)}
            title={
              option.canToggle
                ? option.isIn
                  ? t("events.participants.remove")
                  : t("events.participants.add")
                : t("events.participants.onlyCaptains")
            }
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
              option.isIn
                ? "border-lagoon-ink bg-lagoon-ink/10 text-ink"
                : "border-line bg-card text-slate",
              option.canToggle ? "hover:border-line" : "cursor-default opacity-70",
            )}
          >
            {option.avatarUrl ? (
              <Image
                src={option.avatarUrl}
                alt=""
                width={20}
                height={20}
                className="rounded-full border border-line"
              />
            ) : (
              <span className="flex size-5 items-center justify-center rounded-full border border-line bg-sand text-[0.6rem] text-mist">
                {option.name.charAt(0).toUpperCase()}
              </span>
            )}
            {option.name}
            <span className={cn("text-xs", option.isIn ? "text-lagoon-ink" : "text-line")}>
              {option.isIn ? "✓" : "+"}
            </span>
          </button>
        ))}
      </div>
      {error ? <p className="text-xs text-lagoon-ink">{error}</p> : null}
    </section>
  );
}
