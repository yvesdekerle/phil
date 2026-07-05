"use client";

import { Printer } from "lucide-react";
import { useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  const t = useT();
  return (
    <Button type="button" variant="outline" onClick={() => window.print()} className="print:hidden">
      <Printer aria-hidden="true" /> {t("emergency.print")}
    </Button>
  );
}
