"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type CreateIdeaState, createIdea } from "./actions";

export function IdeaForm({ tripId }: { tripId: string }) {
  const [state, setState] = useState<CreateIdeaState>({ status: "idle" });
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("tripId", tripId);
    startTransition(async () => {
      setState(await createIdea({ status: "idle" }, formData));
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Titre</Label>
        <Input id="title" name="title" placeholder="Balade au marché de Port-Louis" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description (optionnel)</Label>
        <Input
          id="description"
          name="description"
          placeholder="Le matin tôt pour les fruits et le street food…"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="locationName">Lieu (optionnel)</Label>
          <Input id="locationName" name="locationName" placeholder="Port-Louis" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="externalUrl">Lien externe (optionnel)</Label>
          <Input id="externalUrl" name="externalUrl" type="url" placeholder="https://…" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="durationMinutes">Durée en minutes (opt.)</Label>
          <Input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            min={5}
            placeholder="90"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="cost">Coût estimé (opt.)</Label>
          <Input id="cost" name="cost" type="number" min={0} step="0.01" placeholder="20" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="costCurrency">Devise</Label>
          <Input id="costCurrency" name="costCurrency" placeholder="EUR" maxLength={3} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="tags">Tags (séparés par des virgules, optionnel)</Label>
        <Input id="tags" name="tags" placeholder="plage, food, gratuit" />
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Phil l'ajoute au carnet…" : "Proposer l'idée"}
        </Button>
        {state.status === "error" ? <p className="text-sm text-bordeaux">{state.message}</p> : null}
      </div>
    </form>
  );
}
