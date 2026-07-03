import Link from "next/link";

export const metadata = { title: "Mentions légales — Phil" };

export default function LegalPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <Link href="/" className="text-sm text-encre-douce underline underline-offset-4">
        ← Retour
      </Link>
      <h1 className="mt-4 font-display text-3xl text-encre">Mentions légales</h1>

      <div className="mt-6 flex flex-col gap-6 text-sm leading-relaxed text-encre-douce">
        <section>
          <h2 className="font-display text-xl text-encre">Éditeur</h2>
          <p className="mt-2">
            Phil est un projet personnel et non commercial édité par Yves Dekerle. Contact :{" "}
            <a href="mailto:yves.dekerle@gmail.com" className="underline underline-offset-4">
              yves.dekerle@gmail.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-encre">Hébergement</h2>
          <p className="mt-2">
            Application : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.
            <br />
            Données et fichiers : Supabase (projet hébergé en Union européenne, Irlande).
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-encre">Accès au service</h2>
          <p className="mt-2">
            Phil est réservé à un cercle privé, sur invitation. Il ne s'agit pas d'un service ouvert
            au public ni d'une offre commerciale.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-encre">Données personnelles</h2>
          <p className="mt-2">
            Voir la{" "}
            <Link href="/privacy" className="underline underline-offset-4">
              politique de confidentialité
            </Link>
            .
          </p>
        </section>
      </div>

      <p className="mt-10 text-xs text-encre-douce">Dernière mise à jour : juillet 2026.</p>
    </main>
  );
}
