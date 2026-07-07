"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useTransition } from "react";
import {
  addTripPlace,
  deleteTripPlace,
  type PlaceState,
} from "@/app/(app)/trips/[tripId]/map/actions";
import { PLACE_CATEGORIES } from "@/app/(app)/trips/[tripId]/map/place-constants";
import { useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type TripPlace = {
  id: string;
  name: string;
  category: string;
  note: string | null;
  created_by: string;
};

/** PHIL-S02 : commerces repérés (supermarchés, pharmacies…) épinglés sur la carte. */
export function TripPlaces({
  tripId,
  places,
  myId,
  isOwner,
}: {
  tripId: string;
  places: TripPlace[];
  myId: string;
  isOwner: boolean;
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState<PlaceState, FormData>(addTripPlace, {
    status: "idle",
  });
  const [busy, startTransition] = useTransition();

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-laiton-clair bg-papier px-4 py-3">
      <div>
        <h2 className="text-sm font-medium text-encre">{t("places.title")}</h2>
        <p className="text-xs text-encre-douce">{t("places.intro")}</p>
      </div>

      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="tripId" value={tripId} />
        <Input
          name="name"
          placeholder={t("places.namePlaceholder")}
          required
          maxLength={200}
          className="h-8 min-w-40 flex-1 text-sm"
        />
        <select
          name="category"
          defaultValue="SUPERMARKET"
          className="h-8 rounded border border-laiton-clair bg-papier px-2 text-sm text-encre"
          aria-label={t("places.categoryAria")}
        >
          {PLACE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(`places.cat.${c}`)}
            </option>
          ))}
        </select>
        <Input
          name="address"
          placeholder={t("places.addressPlaceholder")}
          required
          maxLength={300}
          className="h-8 min-w-48 flex-1 text-sm"
        />
        <Input
          name="note"
          placeholder={t("places.notePlaceholder")}
          maxLength={300}
          className="h-8 w-40 text-sm"
        />
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? t("places.adding") : t("places.add")}
        </Button>
      </form>
      {state.status === "error" ? <p className="text-xs text-bordeaux">{state.message}</p> : null}

      {places.length === 0 ? (
        <p className="text-xs text-encre-douce">{t("places.empty")}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {places.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-2 rounded-md border border-laiton-clair/60 px-3 py-1.5 text-sm"
            >
              <span className="min-w-0 flex-1">
                <span className="text-encre">{p.name}</span>
                <span className="ml-1.5 rounded-full bg-laiton/15 px-1.5 py-0.5 text-[0.65rem] text-laiton">
                  {t(`places.cat.${p.category}`)}
                </span>
                {p.note ? <span className="ml-1.5 text-xs text-encre-douce">{p.note}</span> : null}
              </span>
              {p.created_by === myId || isOwner ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => startTransition(() => deleteTripPlace(tripId, p.id))}
                  className="text-encre-douce hover:text-bordeaux"
                  aria-label={t("places.delete")}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
