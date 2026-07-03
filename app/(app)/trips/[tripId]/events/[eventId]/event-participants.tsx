"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
        setError(result.message ?? "Impossible de mettre à jour.");
      } else {
        router.refresh();
      }
    });
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-encre">Qui est de la partie ?</h2>
        <span className="text-xs text-encre-douce">
          {count === 0
            ? "Tout le groupe (personne d'inscrit)"
            : `${count} inscrit${count > 1 ? "s" : ""}`}
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
                  ? "Retirer de l'événement"
                  : "Inscrire à l'événement"
                : "Seuls les capitaines/éditeurs peuvent inscrire les autres"
            }
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
              option.isIn
                ? "border-bordeaux bg-bordeaux/10 text-encre"
                : "border-laiton-clair bg-papier text-encre-douce",
              option.canToggle ? "hover:border-laiton" : "cursor-default opacity-70",
            )}
          >
            {option.avatarUrl ? (
              <Image
                src={option.avatarUrl}
                alt=""
                width={20}
                height={20}
                className="rounded-full border border-laiton-clair"
              />
            ) : (
              <span className="flex size-5 items-center justify-center rounded-full border border-laiton-clair bg-parchemin text-[0.6rem] text-laiton">
                {option.name.charAt(0).toUpperCase()}
              </span>
            )}
            {option.name}
            <span className={cn("text-xs", option.isIn ? "text-bordeaux" : "text-laiton-clair")}>
              {option.isIn ? "✓" : "+"}
            </span>
          </button>
        ))}
      </div>
      {error ? <p className="text-xs text-bordeaux">{error}</p> : null}
    </section>
  );
}
