/**
 * Météo Open-Meteo (PHIL-O02) — API gratuite, sans clé, usage non commercial.
 * Prévisions quotidiennes jusqu'à 16 jours, cache Next d'une heure pour
 * rester très en dessous des limites (10 000 appels/jour).
 */

export type DailyForecast = {
  /** Jour local de la destination (YYYY-MM-DD). */
  date: string;
  /** Code temps WMO. */
  code: number;
  tMin: number;
  tMax: number;
  /** Probabilité max de précipitations sur la journée (%), si fournie. */
  precipProb: number | null;
};

export async function getDailyForecast(
  lat: number,
  lng: number,
  timezone: string,
): Promise<DailyForecast[]> {
  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}` +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
    `&forecast_days=16&timezone=${encodeURIComponent(timezone)}`;
  try {
    const r = await fetch(url, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) {
      return [];
    }
    const json = (await r.json()) as {
      daily?: {
        time: string[];
        weather_code: number[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_probability_max: (number | null)[];
      };
    };
    const d = json.daily;
    if (!d?.time) {
      return [];
    }
    return d.time.map((date, i) => ({
      date,
      code: d.weather_code[i] ?? 0,
      tMin: Math.round(d.temperature_2m_min[i] ?? 0),
      tMax: Math.round(d.temperature_2m_max[i] ?? 0),
      precipProb: d.precipitation_probability_max[i] ?? null,
    }));
  } catch {
    return []; // la météo ne doit jamais casser une page
  }
}

/** Libellé français d'un code temps WMO. */
export function weatherLabel(code: number): string {
  if (code === 0) return "Grand soleil";
  if (code <= 2) return "Éclaircies";
  if (code === 3) return "Couvert";
  if (code <= 48) return "Brouillard";
  if (code <= 57) return "Bruine";
  if (code <= 67) return "Pluie";
  if (code <= 77) return "Neige";
  if (code <= 82) return "Averses";
  if (code <= 86) return "Averses de neige";
  return "Orage";
}

/** Journée à considérer comme pluvieuse (alerte O03 et pictos). */
export function isRainy(code: number): boolean {
  return (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
}
