"use client";

import { Zap } from "lucide-react";
import { useActionState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type QuickAddState, quickAddEvent } from "./quick-add-actions";

/** Ajout rapide (PHIL-Q01) : titre + jour, le reste s'enrichit après. */
export function QuickAdd({ tripId, defaultDate }: { tripId: string; defaultDate: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState<QuickAddState, FormData>(
    async (prev, formData) => {
      const result = await quickAddEvent(prev, formData);
      if (result.status === "idle") {
        formRef.current?.reset();
      }
      return result;
    },
    { status: "idle" },
  );

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-wrap items-center gap-2 rounded-lg border border-laiton-clair/60 bg-papier px-3 py-2"
    >
      <Zap className="size-4 shrink-0 text-laiton" aria-hidden="true" />
      <input type="hidden" name="tripId" value={tripId} />
      <Input
        name="title"
        placeholder="Ajout rapide : snorkeling, resto du soir…"
        required
        maxLength={150}
        className="h-8 min-w-40 flex-1 text-sm"
        aria-label="Titre de l'activité"
      />
      <Input
        name="date"
        type="date"
        defaultValue={defaultDate}
        required
        className="h-8 w-36 text-sm"
        aria-label="Jour"
      />
      <Input name="time" type="time" className="h-8 w-24 text-sm" aria-label="Heure (optionnel)" />
      <Button type="submit" size="sm" variant="outline">
        Ajouter
      </Button>
      {state.status === "error" ? (
        <p className="w-full text-xs text-bordeaux">{state.message}</p>
      ) : null}
    </form>
  );
}
