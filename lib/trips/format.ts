import { format, isSameMonth, isSameYear, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Plage de dates compacte à la française :
 * "5 – 21 nov. 2026", "28 déc. 2026 – 4 janv. 2027", "12 mars 2027".
 */
export function formatDateRange(startDate: string, endDate: string): string {
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  if (startDate === endDate) {
    return format(start, "d MMM yyyy", { locale: fr });
  }
  if (isSameMonth(start, end) && isSameYear(start, end)) {
    return `${format(start, "d", { locale: fr })} – ${format(end, "d MMM yyyy", { locale: fr })}`;
  }
  if (isSameYear(start, end)) {
    return `${format(start, "d MMM", { locale: fr })} – ${format(end, "d MMM yyyy", { locale: fr })}`;
  }
  return `${format(start, "d MMM yyyy", { locale: fr })} – ${format(end, "d MMM yyyy", { locale: fr })}`;
}
