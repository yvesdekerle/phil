"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cancelInvitation, createInvitation, type InviteState } from "./actions";

type PendingInvitation = {
  id: string;
  invited_email: string;
  role: string;
  token: string;
};

export function InviteSection({
  tripId,
  pending,
  baseUrl,
}: {
  tripId: string;
  pending: PendingInvitation[];
  baseUrl: string;
}) {
  const [role, setRole] = useState("EDITOR");
  const [state, setState] = useState<InviteState>({ status: "idle" });
  const [copied, setCopied] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("tripId", tripId);
    formData.set("role", role);
    startTransition(async () => {
      const result = await createInvitation({ status: "idle" }, formData);
      setState(result);
      if (result.status === "success") {
        form.reset();
      }
    });
  }

  async function copy(url: string, key: string) {
    await navigator.clipboard.writeText(url);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-laiton-clair bg-papier px-5 py-4">
      <h2 className="text-sm font-medium text-encre">Inviter un compagnon de route</h2>

      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-52 flex-1 flex-col gap-2">
          <Label htmlFor="email">Adresse email</Label>
          <Input id="email" name="email" type="email" placeholder="ami@exemple.fr" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="role">Rôle</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger id="role" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EDITOR">Éditeur</SelectItem>
              <SelectItem value="VIEWER">Lecteur</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Phil rédige…" : "Inviter"}
        </Button>
      </form>

      {state.status !== "idle" ? (
        <div className="flex flex-wrap items-center gap-3">
          <p
            className={
              state.status === "error" ? "text-sm text-bordeaux" : "text-sm text-encre-douce"
            }
          >
            {state.message}
          </p>
          {state.inviteUrl ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => state.inviteUrl && copy(state.inviteUrl, "new")}
            >
              {copied === "new" ? "Copié !" : "Copier le lien"}
            </Button>
          ) : null}
        </div>
      ) : null}

      {pending.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {pending.map((inv) => {
            const url = `${baseUrl}/invitations/${inv.token}`;
            return (
              <li
                key={inv.id}
                className="flex flex-wrap items-center gap-2 rounded-md border border-laiton-clair/60 bg-parchemin/50 px-3 py-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate text-encre">
                  {inv.invited_email}{" "}
                  <span className="text-xs text-encre-douce">
                    ({inv.role === "EDITOR" ? "éditeur" : "lecteur"} · en attente)
                  </span>
                </span>
                <Button type="button" variant="ghost" size="sm" onClick={() => copy(url, inv.id)}>
                  {copied === inv.id ? "Copié !" : "Copier le lien"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      await cancelInvitation(tripId, inv.id);
                    })
                  }
                >
                  Annuler
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
