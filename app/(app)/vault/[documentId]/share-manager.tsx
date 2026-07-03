"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
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

type Share = { tripId: string; tripName: string };
type Trip = { id: string; name: string; destination: string };

export function ShareManager({ documentId, shares }: { documentId: string; shares: Share[] }) {
  const [open, setOpen] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [state, setState] = useState<DocumentActionState>({ status: "idle" });
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("trips")
      .select("id, name, destination")
      .is("archived_at", null)
      .order("start_date", { ascending: true });
    setTrips((data ?? []) as Trip[]);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (open && !loaded) {
      void load();
    }
  }, [open, loaded, load]);

  const sharedTripIds = shares.map((s) => s.tripId);

  function share(tripId: string) {
    startTransition(async () => {
      const result = await shareDocument(documentId, tripId);
      setState(result);
      if (result.status === "success") {
        setOpen(false);
      }
    });
  }

  function unshare(tripId: string) {
    startTransition(async () => {
      setState(await unshareDocument(documentId, tripId));
    });
  }

  return (
    <section className="rounded-lg border border-laiton-clair bg-papier px-5 py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-encre">Partages</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              Partager avec un voyage
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Partager avec un voyage</DialogTitle>
              <DialogDescription>
                Le document restera dans ton coffre, mais les participants du voyage choisi pourront
                le consulter.
              </DialogDescription>
            </DialogHeader>
            <div className="flex max-h-72 flex-col gap-2 overflow-y-auto py-1">
              {trips.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-encre-douce">
                  {loaded ? "Aucun voyage actif." : "Chargement…"}
                </p>
              ) : (
                trips.map((trip) => {
                  const alreadyShared = sharedTripIds.includes(trip.id);
                  return (
                    <button
                      key={trip.id}
                      type="button"
                      disabled={pending || alreadyShared}
                      onClick={() => share(trip.id)}
                      className="flex items-center justify-between gap-3 rounded-md border border-laiton-clair bg-papier px-3 py-2.5 text-left text-sm transition-colors hover:bg-parchemin disabled:opacity-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-encre">{trip.name}</span>
                        <span className="text-xs text-encre-douce">{trip.destination}</span>
                      </span>
                      <span className="shrink-0 text-xs text-encre-douce">
                        {alreadyShared ? "Déjà partagé" : "Partager"}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {shares.length === 0 ? (
        <p className="mt-3 text-sm text-encre-douce">Privé — toi seul peux voir ce document.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {shares.map((s) => (
            <li
              key={s.tripId}
              className="flex items-center justify-between gap-3 rounded-md border border-laiton-clair/60 bg-parchemin/50 px-3 py-2 text-sm"
            >
              <span className="text-encre">
                Partagé avec : <span className="font-medium">{s.tripName}</span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => unshare(s.tripId)}
              >
                Retirer
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
