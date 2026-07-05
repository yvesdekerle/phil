"use client";

import { useState, useTransition } from "react";
import { PlaceInput } from "@/components/geo/place-input";
import { useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type CreateIdeaState, createIdea } from "./actions";

export function IdeaForm({ tripId }: { tripId: string }) {
  const t = useT();
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
        <Label htmlFor="title">{t("ideas.fTitle")}</Label>
        <Input id="title" name="title" placeholder={t("ideas.fTitlePlaceholder")} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">{t("ideas.fDescription")}</Label>
        <Input
          id="description"
          name="description"
          placeholder={t("ideas.fDescriptionPlaceholder")}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="locationName">{t("ideas.fLocation")}</Label>
          <PlaceInput
            id="locationName"
            name="locationName"
            placeholder={t("ideas.fLocationPlaceholder")}
            maxLength={150}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="externalUrl">{t("ideas.fExternalUrl")}</Label>
          <Input id="externalUrl" name="externalUrl" type="url" placeholder="https://…" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="durationMinutes">{t("ideas.fDuration")}</Label>
          <Input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            min={5}
            placeholder="90"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="cost">{t("ideas.fCost")}</Label>
          <Input id="cost" name="cost" type="number" min={0} step="0.01" placeholder="20" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="costCurrency">{t("ideas.fCurrency")}</Label>
          <Input id="costCurrency" name="costCurrency" placeholder="EUR" maxLength={3} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="tags">{t("ideas.fTags")}</Label>
        <Input id="tags" name="tags" placeholder={t("ideas.fTagsPlaceholder")} />
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? t("ideas.submitting") : t("ideas.submit")}
        </Button>
        {state.status === "error" ? <p className="text-sm text-bordeaux">{state.message}</p> : null}
      </div>
    </form>
  );
}
