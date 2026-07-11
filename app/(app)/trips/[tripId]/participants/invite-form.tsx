"use client";

import { useState, useTransition } from "react";
import { useT } from "@/components/i18n/provider";
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
  const t = useT();
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
    <section className="flex flex-col gap-4 rounded-lg border border-line bg-card px-5 py-4">
      <h2 className="text-sm font-medium text-ink">{t("participants.invite.title")}</h2>

      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-52 flex-1 flex-col gap-2">
          <Label htmlFor="email">{t("participants.invite.emailLabel")}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder={t("participants.invite.emailPlaceholder")}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="role">{t("participants.invite.roleLabel")}</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger id="role" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EDITOR">{t("participants.roleEditor")}</SelectItem>
              <SelectItem value="VIEWER">{t("participants.roleViewer")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? t("participants.invite.submitting") : t("participants.invite.submit")}
        </Button>
      </form>

      {state.status !== "idle" ? (
        <div className="flex flex-wrap items-center gap-3">
          <p
            className={state.status === "error" ? "text-sm text-lagoon-ink" : "text-sm text-slate"}
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
              {copied === "new"
                ? t("participants.invite.copied")
                : t("participants.invite.copyLink")}
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
                className="flex flex-wrap items-center gap-2 rounded-md border border-line/60 bg-sand/50 px-3 py-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate text-ink">
                  {inv.invited_email}{" "}
                  <span className="text-xs text-slate">
                    (
                    {inv.role === "EDITOR"
                      ? t("participants.editorLower")
                      : t("participants.viewerLower")}{" "}
                    · {t("participants.invite.pending")})
                  </span>
                </span>
                <Button type="button" variant="ghost" size="sm" onClick={() => copy(url, inv.id)}>
                  {copied === inv.id
                    ? t("participants.invite.copied")
                    : t("participants.invite.copyLink")}
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
                  {t("participants.invite.cancel")}
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
