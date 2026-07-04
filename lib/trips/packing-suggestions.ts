import { type DailyForecast, isRainy } from "@/lib/weather/open-meteo";

/**
 * Valise intelligente (PHIL-P06) — suggestions contextuelles par règles
 * locales (pas de LLM) : météo prévue, activités planifiées, durée du séjour.
 */

export type PackingSuggestion = { title: string; reason: string };

const ACTIVITY_RULES: { pattern: RegExp; items: string[]; reason: string }[] = [
  {
    pattern: /snorkel|plong[ée]e|plage|baignade|lagon|piscine|surf/i,
    items: ["Maillot de bain", "Serviette de plage"],
    reason: "il y a de l'eau au programme",
  },
  {
    pattern: /rando|randonn[ée]e|trek|volcan|sentier|marche/i,
    items: ["Chaussures de marche"],
    reason: "une marche est prévue",
  },
  {
    pattern: /bateau|catamaran|croisi[èe]re|ferry|voilier/i,
    items: ["Coupe-vent", "Cachets contre le mal de mer"],
    reason: "une sortie en mer est prévue",
  },
  {
    pattern: /ski|snowboard|raquettes/i,
    items: ["Gants de ski", "Masque de ski"],
    reason: "on part sur la neige",
  },
  {
    pattern: /v[ée]lo|vtt|cyclo/i,
    items: ["Casque de vélo"],
    reason: "une sortie à vélo est prévue",
  },
];

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function suggestPackingItems(input: {
  forecast: DailyForecast[];
  eventTitles: string[];
  nights: number;
  existingTitles: string[];
}): PackingSuggestion[] {
  const suggestions: PackingSuggestion[] = [];
  const add = (title: string, reason: string) => {
    if (!suggestions.some((s) => s.title === title)) {
      suggestions.push({ title, reason });
    }
  };

  const days = input.forecast;
  if (days.some((d) => isRainy(d.code) || (d.precipProb ?? 0) >= 50)) {
    add("K-way ou parapluie", "de la pluie est annoncée");
  }
  if (days.some((d) => d.tMax >= 28)) {
    add("Crème solaire", "il va faire chaud");
    add("Casquette ou chapeau", "il va faire chaud");
  }
  if (days.some((d) => d.tMax >= 22)) {
    add("Lunettes de soleil", "le soleil sera de la partie");
  }
  if (days.some((d) => d.tMin <= 5)) {
    add("Bonnet et gants", "les matinées seront froides");
    add("Pull chaud", "les matinées seront froides");
  }

  const allTitles = input.eventTitles.join(" · ");
  for (const rule of ACTIVITY_RULES) {
    if (rule.pattern.test(allTitles)) {
      for (const item of rule.items) {
        add(item, rule.reason);
      }
    }
  }

  if (input.nights >= 7) {
    add("Lessive de voyage", "plus d'une semaine sur place");
  }

  // Déduplication contre la Valise existante (souple : inclusions dans les deux sens)
  const existing = input.existingTitles.map(normalize);
  return suggestions.filter((s) => {
    const n = normalize(s.title);
    return !existing.some((e) => e.includes(n) || n.includes(e));
  });
}
