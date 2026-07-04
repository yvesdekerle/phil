import type { Database } from "@/types/database";

export type DocumentCategory = Database["public"]["Enums"]["document_category"];
export type VaultDocument = Database["public"]["Tables"]["documents"]["Row"];

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  passport: "Passeport",
  id_card: "Carte d'identité",
  driving_license: "Permis de conduire",
  health_card: "Carte Vitale",
  european_health_card: "Carte européenne d'assurance maladie",
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

/**
 * PHIL-L03 (option A) — le coffre est réservé aux documents personnels
 * réutilisables ; billets, vouchers et hébergements appartiennent au groupe
 * et vivent dans les documents du voyage.
 */
export const VAULT_CATEGORIES: DocumentCategory[] = [
  "passport",
  "id_card",
  "driving_license",
  "health_card",
  "european_health_card",
  "insurance",
  "other",
];

export const TRIP_CATEGORIES: DocumentCategory[] = [
  "ticket",
  "voucher",
  "lodging",
  "insurance",
  "other",
];
