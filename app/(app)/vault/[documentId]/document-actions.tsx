"use client";

import { useEffect, useState, useTransition } from "react";
import { useT } from "@/components/i18n/provider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCoffreMaster } from "@/lib/crypto/coffre-session";
import { decryptBytes, encryptBytes, fromBase64, toBase64 } from "@/lib/crypto/vault-crypto";
import { categoryLabel, type DocumentCategory, VAULT_CATEGORIES } from "@/lib/vault/categories";
import { type DocumentActionState, deleteDocument, updateDocument } from "./actions";

type Props = {
  documentId: string;
  fileName: string;
  category: DocumentCategory;
  expiresAt: string;
  // PHIL-R10 : n° de pièce chiffré E2EE (doc chiffré) ou en clair (legacy).
  encrypted: boolean;
  encDocumentNumber: string;
  encDocumentNumberIv: string;
  documentNumber: string;
};

export function DocumentActions({ documentId, ...defaults }: Props) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [fileName, setFileName] = useState(defaults.fileName);
  const [category, setCategory] = useState<DocumentCategory>(defaults.category);
  const [expiresAt, setExpiresAt] = useState(defaults.expiresAt);
  const [documentNumber, setDocumentNumber] = useState(defaults.documentNumber);
  const [numberLoaded, setNumberLoaded] = useState(false);
  const [state, setState] = useState<DocumentActionState>({ status: "idle" });
  const [pending, startTransition] = useTransition();

  // PHIL-R10 : à l'ouverture de l'édition d'un doc chiffré, déchiffre le n° pour
  // préremplir (la maîtresse est déjà déverrouillée par la porte du coffre).
  useEffect(() => {
    if (!editing || numberLoaded || !defaults.encrypted || !defaults.encDocumentNumber) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const master = await getCoffreMaster();
        const clear = await decryptBytes(
          master,
          fromBase64(defaults.encDocumentNumber),
          fromBase64(defaults.encDocumentNumberIv),
        );
        if (!cancelled) {
          setDocumentNumber(new TextDecoder().decode(clear));
          setNumberLoaded(true);
        }
      } catch {
        // Déchiffrement impossible → on laisse le champ vide.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    editing,
    numberLoaded,
    defaults.encrypted,
    defaults.encDocumentNumber,
    defaults.encDocumentNumberIv,
  ]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const formData = new FormData();
      formData.set("documentId", documentId);
      formData.set("fileName", fileName);
      formData.set("category", category);
      formData.set("expiresAt", expiresAt);
      if (defaults.encrypted) {
        formData.set("encrypted", "1");
        const n = documentNumber.trim();
        if (n) {
          try {
            const master = await getCoffreMaster();
            const enc = await encryptBytes(master, new TextEncoder().encode(n));
            formData.set("encDocumentNumber", toBase64(enc.data));
            formData.set("encDocumentNumberIv", toBase64(enc.iv));
          } catch {
            setState({ status: "error", message: t("documents.msg.updateFailed") });
            return;
          }
        }
      } else {
        formData.set("documentNumber", documentNumber);
      }
      const result = await updateDocument({ status: "idle" }, formData);
      setState(result);
      if (result.status === "success") {
        setEditing(false);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" onClick={() => setEditing((v) => !v)}>
          {editing ? t("documents.actions.close") : t("documents.actions.edit")}
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="destructive" disabled={pending}>
              {t("documents.actions.delete")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("documents.actions.confirmDeleteOpen")}
                {defaults.fileName}
                {t("documents.actions.confirmDeleteClose")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("documents.actions.confirmDeleteBody")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("documents.actions.keepDocument")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  startTransition(async () => {
                    setState(await deleteDocument(documentId));
                  })
                }
              >
                {t("documents.actions.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {state.status !== "idle" ? (
          <p
            className={
              state.status === "error" ? "text-sm text-bordeaux" : "text-sm text-encre-douce"
            }
          >
            {state.message}
          </p>
        ) : null}
      </div>

      {editing ? (
        <Card>
          <CardContent>
            <form onSubmit={submit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="fileName">{t("documents.actions.fileName")}</Label>
                <Input
                  id="fileName"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="category">{t("documents.actions.category")}</Label>
                  <Select
                    value={category}
                    onValueChange={(v) => setCategory(v as DocumentCategory)}
                  >
                    <SelectTrigger id="category" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VAULT_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {categoryLabel(t, c)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="expiresAt">{t("documents.actions.expiry")}</Label>
                  <Input
                    id="expiresAt"
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="documentNumber">{t("documents.actions.documentNumber")}</Label>
                <Input
                  id="documentNumber"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                />
              </div>
              <div>
                <Button type="submit" disabled={pending}>
                  {pending ? t("documents.actions.saving") : t("documents.actions.save")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
