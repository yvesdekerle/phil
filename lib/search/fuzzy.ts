/**
 * Recherche tolérante (PHIL-Q22) — "plongée", "plongee" et "plnoge" doivent
 * tous trouver la plongée : accents ignorés, petites fautes admises
 * (distance de Levenshtein 1 pour les mots courts, 2 au-delà).
 */

export function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

function levenshtein(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) {
    return max + 1;
  }
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      rowMin = Math.min(rowMin, curr[j]);
    }
    if (rowMin > max) {
      return max + 1;
    }
    prev = curr;
  }
  return prev[b.length];
}

/** Chaque mot de la requête doit se retrouver (à peu près) dans le texte. */
export function fuzzyMatch(text: string, query: string): boolean {
  const q = normalize(query);
  if (!q) {
    return true;
  }
  const t = normalize(text);
  const words = t.split(/[^a-z0-9]+/).filter(Boolean);
  return q
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .every((token) => {
      if (t.includes(token)) {
        return true;
      }
      const max = token.length <= 3 ? 0 : token.length <= 5 ? 1 : 2;
      return words.some(
        (w) =>
          levenshtein(token, w, max) <= max ||
          // token = début de mot mal tapé ("plnoge" vs "plongee…")
          (w.length > token.length && levenshtein(token, w.slice(0, token.length), max) <= max),
      );
    });
}
