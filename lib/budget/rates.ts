/**
 * Taux de change (PHIL-P01) — open.er-api.com : gratuit sans clé, ~160
 * devises (dont MUR, absente des taux BCE/Frankfurter), mise à jour
 * quotidienne. Cache Next de 12 h ; en cas d'échec, l'affichage retombe
 * sur les montants par devise d'origine.
 */

export type Rates = { base: string; rates: Record<string, number> };

export async function getRates(base: string): Promise<Rates | null> {
  try {
    const r = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`, {
      next: { revalidate: 43_200 },
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) {
      return null;
    }
    const json = (await r.json()) as { result?: string; rates?: Record<string, number> };
    if (json.result !== "success" || !json.rates) {
      return null;
    }
    return { base, rates: json.rates };
  } catch {
    return null;
  }
}

/** Convertit un montant vers la devise de base des taux. Null si taux inconnu. */
export function toBase(amount: number, from: string, rates: Rates): number | null {
  if (from === rates.base) {
    return amount;
  }
  const rate = rates.rates[from];
  return rate ? amount / rate : null;
}

/** Convertit depuis la devise de base vers une autre. Null si taux inconnu. */
export function fromBase(amount: number, to: string, rates: Rates): number | null {
  if (to === rates.base) {
    return amount;
  }
  const rate = rates.rates[to];
  return rate ? amount * rate : null;
}
