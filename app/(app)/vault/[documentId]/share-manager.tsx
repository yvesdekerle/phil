"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { type DocumentActionState, shareDocument, unshareDocument } from "./actions";

type Share = {
  shareId: string;
  tripId: string;
  tripName: string;
  recipientName: string | null; // null = tout l'équipage
  expiresAt: string | null; // N05 : partage à durée limitée
  tripEndDate: string | null;
};
type Trip = { id: string; name: string; destination: string; end_date: string };
type Member = { userId: string; name: string };

/**
 * Partages d'un document du coffre (PHIL-E05 + E09) :
 * étape 1 choisir le voyage, étape 2 choisir l'audience
 * (tout l'équipage, ou une personne précise).
 */
export function ShareManager({ documentId, shares }: { documentId: string; shares: Share[] }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [state, setState] = useState<DocumentActionState>({ status: "idle" });
  const [shareUntil, setShareUntil] = useState<string>(""); // "" = permanent
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("trips")
      .select("id, name, destination, end_date")
      .is("archived_at", null)
      .order("start_date", { ascending: true });
    setTrips((data ?? []) as Trip[]);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (open && !loaded) {
      void load();
    }
    if (!open) {
      setSelectedTrip(null);
      setMembers(null);
    }
  }, [open, loaded, load]);

  async function pickTrip(trip: Trip) {
    setSelectedTrip(trip);
    setShareUntil(trip.end_date); // défaut N05 : fin du voyage
    setMembers(null);
    const supabase = createClient();
    const [{ data }, { data: auth }] = await Promise.all([
      supabase
        .from("trip_participants")
        .select("user_id, profiles!trip_participants_user_id_fkey(display_name)")
        .eq("trip_id", trip.id)
        .order("joined_at", { ascending: true }),
      supabase.auth.getUser(),
    ]);
    const myId = auth.user?.id;
    setMembers(
      (data ?? [])
        .filter((m) => m.user_id !== myId)
        .map((m) => ({
          userId: m.user_id,
          name: m.profiles?.display_name ?? t("documents.share.memberFallback"),
        })),
    );
  }

  function share(tripId: string, sharedWith: string | null) {
    startTransition(async () => {
      const result = await shareDocument(
        documentId,
        tripId,
        sharedWith,
        shareUntil ? `${shareUntil}T23:59:59Z` : null,
      );
      setState(result);
      if (result.status === "success") {
        setOpen(false);
      }
    });
  }

  function unshare(shareId: string) {
    startTransition(async () => {
      setState(await unshareDocument(documentId, shareId));
    });
  }

  const crewShareTripIds = shares.filter((s) => !s.recipientName).map((s) => s.tripId);

  return (
    <section className="rounded-lg border border-laiton-clair bg-papier px-5 py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-encre">{t("documents.share.heading")}</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              {t("documents.share.shareButton")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedTrip
                  ? `${selectedTrip.name}${t("documents.share.withWhoSuffix")}`
                  : t("documents.share.dialogTitleDefault")}
              </DialogTitle>
              <DialogDescription>
                {selectedTrip
                  ? t("documents.share.dialogDescStep2")
                  : t("documents.share.dialogDescStep1")}
              </DialogDescription>
            </DialogHeader>

            {!selectedTrip ? (
              <div className="flex max-h-72 flex-col gap-2 overflow-y-auto py-1">
                {trips.length === 0 ? (
                  <p className="px-2 py-6 text-center text-sm text-encre-douce">
                    {loaded ? t("documents.share.noActiveTrip") : t("documents.share.loading")}
                  </p>
                ) : (
                  trips.map((trip) => (
                    <button
                      key={trip.id}
                      type="button"
                      disabled={pending}
                      onClick={() => pickTrip(trip)}
                      className="flex items-center justify-between gap-3 rounded-md border border-laiton-clair bg-papier px-3 py-2.5 text-left text-sm transition-colors hover:bg-parchemin disabled:opacity-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-encre">{trip.name}</span>
                        <span className="text-xs text-encre-douce">{trip.destination}</span>
                      </span>
                      <span className="shrink-0 text-xs text-encre-douce">
                        {t("documents.share.choose")}
                      </span>
                    </button>
                  ))
                )}
              </div>
            ) : (
              <div className="flex max-h-72 flex-col gap-2 overflow-y-auto py-1">
                <label className="flex items-center justify-between gap-3 rounded-md border border-laiton-clair/60 bg-parchemin/40 px-3 py-2 text-xs text-encre-douce">
                  <span>
                    {t("documents.share.until")}{" "}
                    <span className="text-encre">{t("documents.share.untilHint")}</span>
                  </span>
                  <input
                    type="date"
                    value={shareUntil}
                    onChange={(e) => setShareUntil(e.target.value)}
                    className="rounded border border-laiton-clair bg-papier px-2 py-1 text-xs text-encre"
                  />
                </label>
                <button
                  type="button"
                  disabled={pending || crewShareTripIds.includes(selectedTrip.id)}
                  onClick={() => share(selectedTrip.id, null)}
                  className="flex items-center justify-between gap-3 rounded-md border border-bordeaux/40 bg-bordeaux/5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-bordeaux/10 disabled:opacity-50"
                >
                  <span className="font-medium text-encre">{t("documents.share.wholeCrew")}</span>
                  <span className="shrink-0 text-xs text-encre-douce">
                    {crewShareTripIds.includes(selectedTrip.id)
                      ? t("documents.share.alreadyShared")
                      : t("documents.share.share")}
                  </span>
                </button>
                {members === null ? (
                  <p className="px-2 py-4 text-center text-sm text-encre-douce">
                    {t("documents.share.loading")}
                  </p>
                ) : members.length === 0 ? (
                  <p className="px-2 py-4 text-center text-sm text-encre-douce">
                    {t("documents.share.noOneAboard")}
                  </p>
                ) : (
                  members.map((m) => {
                    const already = shares.some(
                      (s) => s.tripId === selectedTrip.id && s.recipientName === m.name,
                    );
                    return (
                      <button
                        key={m.userId}
                        type="button"
                        disabled={pending || already}
                        onClick={() => share(selectedTrip.id, m.userId)}
                        className="flex items-center justify-between gap-3 rounded-md border border-laiton-clair bg-papier px-3 py-2.5 text-left text-sm transition-colors hover:bg-parchemin disabled:opacity-50"
                      >
                        <span className="font-medium text-encre">
                          {t("documents.share.onlyPrefix")}
                          {m.name}
                        </span>
                        <span className="shrink-0 text-xs text-encre-douce">
                          {already
                            ? t("documents.share.alreadyShared")
                            : t("documents.share.share")}
                        </span>
                      </button>
                    );
                  })
                )}
                <button
                  type="button"
                  onClick={() => setSelectedTrip(null)}
                  className="mt-1 text-left text-xs text-encre-douce underline underline-offset-4"
                >
                  {t("documents.share.changeTrip")}
                </button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {shares.length === 0 ? (
        <p className="mt-3 text-sm text-encre-douce">{t("documents.share.private")}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {shares.map((s) => (
            <li
              key={s.shareId}
              className="flex items-center justify-between gap-3 rounded-md border border-laiton-clair/60 bg-parchemin/50 px-3 py-2 text-sm"
            >
              <span className="min-w-0 truncate text-encre">
                <span className="font-medium">{s.tripName}</span>
                <span className="text-encre-douce">
                  {" — "}
                  {s.recipientName
                    ? `${t("documents.share.onlyRecipientPrefix")}${s.recipientName}`
                    : t("documents.share.wholeCrewList")}
                  {s.expiresAt
                    ? ` · ${t("documents.share.expiresListPrefix")} ${new Date(s.expiresAt).toLocaleDateString("fr-FR")}`
                    : ""}
                </span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => unshare(s.shareId)}
              >
                {t("documents.share.remove")}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {state.status !== "idle" ? (
        <p
          className={
            state.status === "error"
              ? "mt-2 text-sm text-bordeaux"
              : "mt-2 text-sm text-encre-douce"
          }
        >
          {state.message}
        </p>
      ) : null}
    </section>
  );
}
