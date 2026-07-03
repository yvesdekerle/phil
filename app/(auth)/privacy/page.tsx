import Link from "next/link";

export const metadata = { title: "Confidentialité — Phil" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl text-encre">{title}</h2>
      <div className="mt-2 flex flex-col gap-2 text-sm leading-relaxed text-encre-douce">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <Link href="/" className="text-sm text-encre-douce underline underline-offset-4">
        ← Retour
      </Link>
      <h1 className="mt-4 font-display text-3xl text-encre">Politique de confidentialité</h1>
      <p className="mt-2 text-sm text-encre-douce">
        Phil est un carnet de voyage privé, utilisé par un petit cercle d'amis. Pas de publicité,
        pas de tracking, pas de revente : tes données servent uniquement à organiser vos voyages.
      </p>

      <Section title="Qui est responsable ?">
        <p>
          Yves Dekerle, éditeur de Phil à titre personnel et non commercial. Contact :{" "}
          <a href="mailto:yves.dekerle@gmail.com" className="underline underline-offset-4">
            yves.dekerle@gmail.com
          </a>
          .
        </p>
      </Section>

      <Section title="Quelles données, pour quoi faire ?">
        <p>
          <strong className="text-encre">Compte</strong> — nom, email et avatar transmis par Google
          lors de la connexion. Finalité : t'identifier et t'associer à tes voyages.
        </p>
        <p>
          <strong className="text-encre">Voyages</strong> — événements, documents partagés, idées,
          participations. Finalité : l'organisation collective du voyage.
        </p>
        <p>
          <strong className="text-encre">Coffre</strong> — documents d'identité que tu déposes
          volontairement. Privés par défaut, partagés uniquement sur ta décision explicite, chaque
          consultation étant journalisée (visible dans « Activité de mon coffre »).
        </p>
        <p>
          <strong className="text-encre">Passkeys</strong> — clé publique WebAuthn si tu actives le
          verrou biométrique. Ta biométrie ne quitte jamais ton appareil.
        </p>
      </Section>

      <Section title="Où sont-elles stockées ?">
        <p>
          Base de données et fichiers : Supabase, région <strong>Union européenne</strong> (Irlande,
          eu-west-1). Hébergement de l'application : Vercel. Emails transactionnels : Resend.
        </p>
      </Section>

      <Section title="Combien de temps ?">
        <p>
          Tant que ton compte existe. La suppression de compte efface tes données et tes fichiers ;
          l'historique d'audit de ton coffre est purgé avec ton compte.
        </p>
      </Section>

      <Section title="Tes droits (RGPD)">
        <p>
          Accès, rectification, suppression, portabilité : la suppression et l'export sont
          disponibles directement depuis ton profil. Pour le reste, écris à{" "}
          <a href="mailto:yves.dekerle@gmail.com" className="underline underline-offset-4">
            yves.dekerle@gmail.com
          </a>{" "}
          — réponse rapide garantie, c'est un ami qui gère. En cas de désaccord, tu peux saisir la
          CNIL (cnil.fr).
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          Uniquement des cookies techniques nécessaires à l'authentification et au verrou du coffre.
          Aucun cookie publicitaire ou analytique.
        </p>
      </Section>

      <p className="mt-10 text-xs text-encre-douce">Dernière mise à jour : juillet 2026.</p>
    </main>
  );
}
