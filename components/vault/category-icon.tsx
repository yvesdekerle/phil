import {
  BedDouble,
  BookUser,
  Car,
  FileText,
  IdCard,
  ShieldCheck,
  Ticket,
  TicketCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocumentCategory } from "@/lib/vault/categories";

const ICONS: Record<DocumentCategory, typeof FileText> = {
  passport: BookUser,
  id_card: IdCard,
  driving_license: Car,
  ticket: Ticket,
  voucher: TicketCheck,
  lodging: BedDouble,
  insurance: ShieldCheck,
  other: FileText,
};

export function CategoryIcon({
  category,
  className,
}: {
  category: DocumentCategory;
  className?: string;
}) {
  const Icon = ICONS[category] ?? FileText;
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-md border border-laiton-clair bg-parchemin text-laiton",
        className,
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
    </span>
  );
}
