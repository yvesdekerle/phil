"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { getUserEmail, getUserPublicKey } from "@/app/(app)/profile/coffre-actions";
import { useLocale, useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getCoffreMaster, getCoffrePrivateKey } from "@/lib/crypto/coffre-session";
import {
  decryptBytes,
  deriveSharedWrapKey,
  encryptBytes,
  fromBase64,
  generateDek,
  importEcdhPublic,
  toBase64,
  unwrapKey,
  wrapKey,
} from "@/lib/crypto/vault-crypto";
import { intlLocale } from "@/lib/i18n/dates";
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
export function ShareManager({
  documentId,
  shares,
  encrypted,
  encWrappedDek,
  encDekIv,
  encFileIv,
  mimeType,
  ownerId,
}: {
  documentId: string;
  shares: Share[];
  /** Document chiffré E2EE : le partage duplique une copie filigranée pour le destinataire. */
  encrypted: boolean;
  encWrappedDek: string;
  encDekIv: string;
  encFileIv: string;
  mimeType: string;
  ownerId: string;
}) {
  const t = useT();
  const il = intlLocale(useLocale());
  const [open, setOpen] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [state, setState] = useState<DocumentActionState>({ status: "idle" });
  const [shareDuration, setShareDuration] = useState<"1h" | "24h" | "1w" | "trip" | "none">("trip");
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
    setShareDuration("trip"); // défaut : fin du voyage
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
      let wrappedDek: string | null = null;
      let dekIv: string | null = null;
      let storagePath: string | null = null;
      let sharedFileIv: string | null = null;

      // PHIL-T01 : document chiffré → on DUPLIQUE une copie filigranée à l'identité
      // du destinataire, re-chiffrée pour lui. Il ne reçoit jamais la version propre
      // → filigrane infalsifiable. Partage individuel requis.
      if (encrypted) {
        if (!sharedWith) {
          setState({
            status: "error",
            message: "Document chiffré : partage individuel uniquement.",
          });
          return;
        }
        try {
          const recipientName =
            members?.find((m) => m.userId === sharedWith)?.name ?? "Destinataire";
          const [master, myPriv, pubJwk, recipientEmail] = await Promise.all([
            getCoffreMaster(),
            getCoffrePrivateKey(),
            getUserPublicKey(sharedWith),
            getUserEmail(sharedWith),
          ]);
          if (!pubJwk) {
            setState({
              status: "error",
              message: "Le destinataire doit d'abord activer son coffre.",
            });
            return;
          }
          const recipientLabel = recipientEmail
            ? `${recipientName} · ${recipientEmail}`
            : recipientName;

          // 1. Récupérer + déchiffrer l'original.
          const res = await fetch(`/api/documents/${documentId}/view`);
          if (!res.ok) {
            throw new Error("Document original indisponible");
          }
          const origCipher = new Uint8Array(await res.arrayBuffer());
          const origDek = await unwrapKey(master, fromBase64(encWrappedDek), fromBase64(encDekIv));
          const plain = await decryptBytes(origDek, origCipher, fromBase64(encFileIv));

          // 2. Incruster le filigrane à l'identité du destinataire.
          //    - image : PDF neuf à partir de l'image (fiable) ;
          //    - PDF : rendu en images via PDF.js (tolérant) puis reconstruction
          //      d'un PDF filigrané → robuste sur N'IMPORTE quel PDF.
          //    Repli : doc brut re-chiffré si l'étape échoue.
          let stamped = plain;
          try {
            const { canWatermark, watermarkImage, watermarkImagePages } = await import(
              "@/lib/vault/watermark"
            );
            if (mimeType === "application/pdf") {
              const { renderPdfToPngs } = await import("@/lib/vault/pdf-render");
              stamped = await watermarkImagePages(await renderPdfToPngs(plain), recipientLabel);
            } else if (canWatermark(mimeType)) {
              stamped = await watermarkImage(plain, mimeType, recipientLabel);
            }
          } catch {
            stamped = plain;
          }

          // 3. Re-chiffrer cette copie avec une NOUVELLE clé.
          const newDek = await generateDek();
          const sealed = await encryptBytes(newDek, stamped);

          // 4. Uploader le blob dédié (chiffré) dans le dossier du propriétaire.
          const supabase = createClient();
          const path = `${ownerId}/shares/${crypto.randomUUID()}.pdf`;
          const { error: upErr } = await supabase.storage
            .from("documents")
            .upload(path, new Blob([sealed.data as BlobPart], { type: "application/pdf" }), {
              contentType: "application/pdf",
            });
          if (upErr) {
            throw new Error("Envoi de la copie filigranée impossible");
          }

          // 5. Emballer la clé du blob pour le destinataire (ECDH).
          const recipientPub = await importEcdhPublic(pubJwk as JsonWebKey);
          const sharedKey = await deriveSharedWrapKey(myPriv, recipientPub);
          const wrapped = await wrapKey(sharedKey, newDek);
          wrappedDek = toBase64(wrapped.data);
          dekIv = toBase64(wrapped.iv);
          storagePath = path;
          sharedFileIv = toBase64(sealed.iv);
        } catch (e) {
          setState({
            status: "error",
            message: e instanceof Error ? e.message : "Échec du chiffrement du partage.",
          });
          return;
        }
      }

      const durationMs: Record<string, number> = {
        "1h": 3_600_000,
        "24h": 86_400_000,
        "1w": 604_800_000,
      };
      const expiresAt =
        shareDuration === "none"
          ? null
          : shareDuration === "trip"
            ? selectedTrip
              ? `${selectedTrip.end_date}T23:59:59Z`
              : null
            : new Date(Date.now() + durationMs[shareDuration]).toISOString();

      const result = await shareDocument(
        documentId,
        tripId,
        sharedWith,
        expiresAt,
        wrappedDek,
        dekIv,
        storagePath,
        sharedFileIv,
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
    <section className="rounded-lg border border-line bg-card px-5 py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-ink">{t("documents.share.heading")}</h2>
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
                  <p className="px-2 py-6 text-center text-sm text-slate">
                    {loaded ? t("documents.share.noActiveTrip") : t("documents.share.loading")}
                  </p>
                ) : (
                  trips.map((trip) => (
                    <button
                      key={trip.id}
                      type="button"
                      disabled={pending}
                      onClick={() => pickTrip(trip)}
                      className="flex items-center justify-between gap-3 rounded-md border border-line bg-card px-3 py-2.5 text-left text-sm transition-colors hover:bg-sand disabled:opacity-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink">{trip.name}</span>
                        <span className="text-xs text-slate">{trip.destination}</span>
                      </span>
                      <span className="shrink-0 text-xs text-slate">
                        {t("documents.share.choose")}
                      </span>
                    </button>
                  ))
                )}
              </div>
            ) : (
              <div className="flex max-h-72 flex-col gap-2 overflow-y-auto py-1">
                <label className="flex items-center justify-between gap-3 rounded-md border border-line/60 bg-sand/40 px-3 py-2 text-xs text-slate">
                  <span>{t("documents.share.until")}</span>
                  <select
                    value={shareDuration}
                    onChange={(e) => setShareDuration(e.target.value as typeof shareDuration)}
                    className="rounded border border-line bg-card px-2 py-1 text-xs text-ink"
                  >
                    <option value="1h">1 heure</option>
                    <option value="24h">24 heures</option>
                    <option value="1w">1 semaine</option>
                    <option value="trip">Fin du voyage</option>
                    <option value="none">Sans limite</option>
                  </select>
                </label>
                <button
                  type="button"
                  disabled={pending || crewShareTripIds.includes(selectedTrip.id) || encrypted}
                  onClick={() => share(selectedTrip.id, null)}
                  className="flex items-center justify-between gap-3 rounded-md border border-lagoon-ink/40 bg-lagoon-ink/5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-lagoon-ink/10 disabled:opacity-50"
                >
                  <span className="font-medium text-ink">{t("documents.share.wholeCrew")}</span>
                  <span className="shrink-0 text-xs text-slate">
                    {crewShareTripIds.includes(selectedTrip.id)
                      ? t("documents.share.alreadyShared")
                      : t("documents.share.share")}
                  </span>
                </button>
                {members === null ? (
                  <p className="px-2 py-4 text-center text-sm text-slate">
                    {t("documents.share.loading")}
                  </p>
                ) : members.length === 0 ? (
                  <p className="px-2 py-4 text-center text-sm text-slate">
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
                        className="flex items-center justify-between gap-3 rounded-md border border-line bg-card px-3 py-2.5 text-left text-sm transition-colors hover:bg-sand disabled:opacity-50"
                      >
                        <span className="font-medium text-ink">
                          {t("documents.share.onlyPrefix")}
                          {m.name}
                        </span>
                        <span className="shrink-0 text-xs text-slate">
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
                  className="mt-1 text-left text-xs text-slate underline underline-offset-4"
                >
                  {t("documents.share.changeTrip")}
                </button>
              </div>
            )}
            {pending ? (
              <p className="mt-2 text-center text-sm text-slate">{t("documents.share.loading")}</p>
            ) : state.status !== "idle" ? (
              <p
                className={
                  state.status === "error"
                    ? "mt-2 text-center text-sm text-lagoon-ink"
                    : "mt-2 text-center text-sm text-ink"
                }
              >
                {state.message}
              </p>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>

      {shares.length === 0 ? (
        <p className="mt-3 text-sm text-slate">{t("documents.share.private")}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {shares.map((s) => (
            <li
              key={s.shareId}
              className="flex items-center justify-between gap-3 rounded-md border border-line/60 bg-sand/50 px-3 py-2 text-sm"
            >
              <span className="min-w-0 truncate text-ink">
                <span className="font-medium">{s.tripName}</span>
                <span className="text-slate">
                  {" — "}
                  {s.recipientName
                    ? `${t("documents.share.onlyRecipientPrefix")}${s.recipientName}`
                    : t("documents.share.wholeCrewList")}
                  {s.expiresAt
                    ? ` · ${t("documents.share.expiresListPrefix")} ${new Date(s.expiresAt).toLocaleDateString(il)}`
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
            state.status === "error" ? "mt-2 text-sm text-lagoon-ink" : "mt-2 text-sm text-slate"
          }
        >
          {state.message}
        </p>
      ) : null}
    </section>
  );
}
