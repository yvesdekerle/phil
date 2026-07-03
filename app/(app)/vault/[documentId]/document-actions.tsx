"use client";

import { useState, useTransition } from "react";
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
import { CATEGORIES, CATEGORY_LABELS, type DocumentCategory } from "@/lib/vault/categories";
import { type DocumentActionState, deleteDocument, updateDocument } from "./actions";

type Props = {
  documentId: string;
  fileName: string;
  category: DocumentCategory;
  expiresAt: string;
  documentNumber: string;
};

export function DocumentActions({ documentId, ...defaults }: Props) {
  const [editing, setEditing] = useState(false);
  const [fileName, setFileName] = useState(defaults.fileName);
  const [category, setCategory] = useState<DocumentCategory>(defaults.category);
  const [expiresAt, setExpiresAt] = useState(defaults.expiresAt);
  const [documentNumber, setDocumentNumber] = useState(defaults.documentNumber);
  const [state, setState] = useState<DocumentActionState>({ status: "idle" });
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const formData = new FormData();
    formData.set("documentId", documentId);
    formData.set("fileName", fileName);
    formData.set("category", category);
    formData.set("expiresAt", expiresAt);
    formData.set("documentNumber", documentNumber);
    startTransition(async () => {
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
          {editing ? "Fermer" : "Modifier"}
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="destructive" disabled={pending}>
              Supprimer
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer « {defaults.fileName} » ?</AlertDialogTitle>
              <AlertDialogDescription>
                Le document quittera ton coffre et ne sera plus accessible — la suppression est
                consignée dans le registre de bord.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Garder le document</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  startTransition(async () => {
                    setState(await deleteDocument(documentId));
                  })
                }
              >
                Supprimer
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
                <Label htmlFor="fileName">Nom du document</Label>
                <Input
                  id="fileName"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="category">Catégorie</Label>
                  <Select
                    value={category}
                    onValueChange={(v) => setCategory(v as DocumentCategory)}
                  >
                    <SelectTrigger id="category" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {CATEGORY_LABELS[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="expiresAt">Expiration</Label>
                  <Input
                    id="expiresAt"
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="documentNumber">Numéro du document</Label>
                <Input
                  id="documentNumber"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                />
              </div>
              <div>
                <Button type="submit" disabled={pending}>
                  {pending ? "Enregistrement…" : "Enregistrer"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
