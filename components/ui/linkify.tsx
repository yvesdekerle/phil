/**
 * Rend cliquables les URLs d'un texte libre (PHIL-P14) — découpage par
 * regex et rendu React : aucun HTML injecté, pas de risque XSS.
 */
const URL_PATTERN = /(https?:\/\/[^\s<>"']+)/g;

export function Linkify({ text }: { text: string }) {
  const parts = text.split(URL_PATTERN);
  return (
    <>
      {parts.map((part, i) =>
        part.match(/^https?:\/\//) ? (
          <a
            // biome-ignore lint/suspicious/noArrayIndexKey: texte statique, ordre stable
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-lagoon-ink underline underline-offset-2 hover:opacity-80"
          >
            {part}
          </a>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: texte statique, ordre stable
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}
