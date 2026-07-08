"use client";

import { Printer } from "lucide-react";
import { useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";

/**
 * Bouton « Télécharger en PDF » (PHIL-U06). Le PDF vient de la MÊME source que
 * la page web : l'impression du navigateur (`window.print()`), cadrée par le CSS
 * `@media print`. L'utilisateur choisit « Enregistrer en PDF » dans la boîte
 * d'impression — zéro dépendance serveur, fidèle au rendu HTML.
 */
export function PrintGuideButton() {
  const t = useT();
  return (
    <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
      <Printer aria-hidden="true" />
      {t("guide.print")}
    </Button>
  );
}
