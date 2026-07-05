"use client";

import Link from "next/link";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import { categoryLabel, type DocumentCategory } from "@/lib/vault/categories";

type PickableDocument = {
  id: string;
  file_name: string;
  category: DocumentCategory;
  scope: "VAULT" | "TRIP";
};

type Props = {
  tripId: string;
  attachedIds: string[];
  onAttach: (documentId: string) => Promise<{ status: string; message?: string }>;
};

export function DocumentPicker({ tripId, attachedIds, onAttach }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [tripDocs, setTripDocs] = useState<PickableDocument[]>([]);
  const [vaultDocs, setVaultDocs] = useState<PickableDocument[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: userData }, { data: visible }] = await Promise.all([
      supabase.auth.getUser(),
      // RLS : renvoie mes docs + ceux visibles via le voyage
      supabase
        .from("documents")
        .select("id, file_name, category, scope, trip_id, owner_id")
        .is("deleted_at", null)
        .order("uploaded_at", { ascending: false }),
    ]);
    const userId = userData.user?.id;
    const docs = visible ?? [];
    setTripDocs(
      docs.filter((d) => d.scope === "TRIP" && d.trip_id === tripId) as PickableDocument[],
    );
    setVaultDocs(
      docs.filter((d) => d.scope === "VAULT" && d.owner_id === userId) as PickableDocument[],
    );
    setLoaded(true);
  }, [tripId]);

  useEffect(() => {
    if (open && !loaded) {
      void load();
    }
  }, [open, loaded, load]);

  function attach(documentId: string) {
    setError(null);
    startTransition(async () => {
      const result = await onAttach(documentId);
      if (result.status === "error") {
        setError(result.message ?? t("documents.picker.genericError"));
      } else {
        setOpen(false);
      }
    });
  }

  const renderList = (docs: PickableDocument[], emptyHint: string, vaultHint: boolean) => (
    <div className="flex max-h-72 flex-col gap-2 overflow-y-auto py-1">
      {docs.length === 0 ? (
        <p className="px-2 py-6 text-center text-sm text-encre-douce">{emptyHint}</p>
      ) : (
        docs.map((doc) => {
          const alreadyAttached = attachedIds.includes(doc.id);
          return (
            <button
              key={doc.id}
              type="button"
              disabled={pending || alreadyAttached}
              onClick={() => attach(doc.id)}
              className="flex items-center justify-between gap-3 rounded-md border border-laiton-clair bg-papier px-3 py-2.5 text-left text-sm transition-colors hover:bg-parchemin disabled:opacity-50"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-encre">{doc.file_name}</span>
                <span className="text-xs text-encre-douce">{categoryLabel(t, doc.category)}</span>
              </span>
              <span className="shrink-0 text-xs text-encre-douce">
                {alreadyAttached
                  ? t("documents.picker.alreadyAttached")
                  : vaultHint
                    ? t("documents.picker.attachShare")
                    : t("documents.picker.attachOne")}
              </span>
            </button>
          );
        })
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">{t("documents.picker.attach")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("documents.picker.attach")}</DialogTitle>
          <DialogDescription>{t("documents.picker.dialogDesc")}</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="trip">
          <TabsList className="w-full">
            <TabsTrigger value="trip" className="flex-1">
              {t("documents.picker.tabTrip")}
            </TabsTrigger>
            <TabsTrigger value="vault" className="flex-1">
              {t("documents.picker.tabVault")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="trip">
            {renderList(tripDocs, t("documents.picker.emptyTrip"), false)}
          </TabsContent>
          <TabsContent value="vault">
            {renderList(vaultDocs, t("documents.picker.emptyVault"), true)}
            <p className="px-1 pt-1 text-xs text-encre-douce">
              {t("documents.picker.vaultNote")}{" "}
              <Link href="/vault/new" className="underline underline-offset-4">
                {t("documents.picker.addToVault")}
              </Link>
            </p>
          </TabsContent>
        </Tabs>
        {error ? <p className="text-sm text-bordeaux">{error}</p> : null}
      </DialogContent>
    </Dialog>
  );
}
