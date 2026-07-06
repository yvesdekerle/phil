import { type Locale as DateFnsLocale, format, isSameMonth, isSameYear, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Plage de dates compacte, localisée (PHIL-Q37) :
 * FR "5 – 21 nov. 2026" · EN "5 – 21 Nov 2026".
 */
export function formatDateRange(
  startDate: string,
  endDate: string,
  locale: DateFnsLocale = fr,
): string {
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  if (startDate === endDate) {
    return format(start, "d MMM yyyy", { locale });
  }
  if (isSameMonth(start, end) && isSameYear(start, end)) {
    return `${format(start, "d", { locale })} – ${format(end, "d MMM yyyy", { locale })}`;
  }
  if (isSameYear(start, end)) {
    return `${format(start, "d MMM", { locale })} – ${format(end, "d MMM yyyy", { locale })}`;
  }
  return `${format(start, "d MMM yyyy", { locale })} – ${format(end, "d MMM yyyy", { locale })}`;
}
