import type { Database } from "@/types/database";

export type DocumentCategory = Database["public"]["Enums"]["document_category"];
export type VaultDocument = Database["public"]["Tables"]["documents"]["Row"];

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  passport: "Passeport",
  id_card: "Carte d'identité",
  driving_license: "Permis de conduire",
  ticket: "Billet",
  voucher: "Voucher",
  lodging: "Hébergement",
  insurance: "Assurance",
  other: "Autre",
};

export const CATEGORIES = Object.keys(CATEGORY_LABELS) as DocumentCategory[];

export function isDocumentCategory(value: string): value is DocumentCategory {
  return value in CATEGORY_LABELS;
}
