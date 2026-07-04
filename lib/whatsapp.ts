/**
 * WhatsApp (PHIL-O06) — lien de contact wa.me.
 * Un numéro de téléphone donne un lien cliquable ; un @username s'affiche
 * tel quel (pas de format de lien public officiel stable pour les usernames).
 */
export function waContactLink(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const digits = value.trim().replace(/[\s.\-()]/g, "");
  if (/^\+?\d{6,15}$/.test(digits)) {
    return `https://wa.me/${digits.replace(/^\+/, "")}`;
  }
  return null;
}
