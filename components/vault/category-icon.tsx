import {
  BedDouble,
  BookUser,
  Car,
  FileText,
  HeartPulse,
  IdCard,
  ShieldCheck,
  Stethoscope,
  Ticket,
  TicketCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocumentCategory } from "@/lib/vault/categories";

const ICONS: Record<DocumentCategory, typeof FileText> = {
  passport: BookUser,
  id_card: IdCard,
  driving_license: Car,
  health_card: HeartPulse,
  european_health_card: Stethoscope,
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
        "flex size-10 shrink-0 items-center justify-center rounded-md border border-line bg-sand text-mist",
        className,
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
    </span>
  );
}
