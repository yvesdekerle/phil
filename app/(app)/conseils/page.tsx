import {
  Banknote,
  CloudDownload,
  FileCheck,
  HeartPulse,
  Landmark,
  Plane,
  Smartphone,
  Wifi,
} from "lucide-react";
import Link from "next/link";

const SECTIONS: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  tips: string[];
}[] = [
  {
    icon: CloudDownload,
    title: "Cartes & navigation",
    tips: [
      "Télécharge la carte Google Maps de ta destination en hors-ligne AVANT le départ (Profil → Cartes hors connexion) — le GPS fonctionne sans réseau, pas le chargement des cartes.",
      "Dans Phil, utilise « Tout préparer (documents inclus) » dans les Paramètres du voyage : le programme et les billets restent consultables sans connexion.",
      "Repère à l'avance le trajet aéroport → hébergement : c'est celui qu'on fait fatigué.",
    ],
  },
  {
    icon: Smartphone,
    title: "Téléphone & connexion",
    tips: [
      "Prends une e-SIM locale (Airalo, Holafly, ou l'opérateur local) — souvent 10-20 € pour le séjour, activable avant de partir.",
      "Vérifie que ton téléphone est désimlocké si tu préfères une carte SIM physique sur place.",
      "Désactive les données en itinérance AVANT d'atterrir si tu n'as pas de forfait adapté.",
      "Le groupe WhatsApp du voyage se renseigne dans les Paramètres — tout le monde le retrouve depuis la page Participants.",
    ],
  },
  {
    icon: FileCheck,
    title: "Papiers",
    tips: [
      "Passeport : beaucoup de pays exigent 6 mois de validité APRÈS la date de retour — Phil te prévient si un passeport du groupe pose problème.",
      "Range une copie de tes papiers dans le coffre Phil : consultable partout, filigranée à chaque ouverture, partageable au voyage en cas de besoin.",
      "Vérifie visa / autorisation d'entrée (même électronique) et imprime les fiches d'urgence du voyage — le papier survit aux téléphones noyés.",
    ],
  },
  {
    icon: Banknote,
    title: "Argent",
    tips: [
      "Préviens ta banque du voyage pour éviter le blocage de carte au premier retrait.",
      "Retire en monnaie locale plutôt que de payer le change à l'aéroport ; refuse la « conversion dynamique » (payer en euros à l'étranger coûte plus cher).",
      "Renseigne la devise locale en devise secondaire du voyage : tous les montants du budget s'afficheront dans les deux.",
    ],
  },
  {
    icon: HeartPulse,
    title: "Santé",
    tips: [
      "Vérifie tes vaccins 6 à 8 semaines avant le départ (certains demandent plusieurs injections) — l'item « Vaccins à jour » t'attend dans la Valise.",
      "Emporte une petite pharmacie : anti-diarrhéique, paracétamol, pansements, répulsif moustiques, cachets contre le mal de mer si sortie bateau.",
      "Remplis ta fiche d'urgence dans Phil (groupe sanguin, allergies, assisteur) — l'équipage y a accès en cas de pépin.",
    ],
  },
  {
    icon: Plane,
    title: "Vol & bagages",
    tips: [
      "Enregistre-toi en ligne dès l'ouverture (24-48h avant) et garde les billets dans les Documents du voyage.",
      "Dans le bagage cabine : une tenue de rechange, les médicaments, chargeur et batterie — les soutes égarent des valises.",
      "Pèse ta valise avant de partir ; garde de la place pour le retour.",
    ],
  },
  {
    icon: Landmark,
    title: "Sur place",
    tips: [
      "Note l'adresse de l'hébergement en langue locale (capture d'écran) pour les taxis.",
      "Le numéro de l'ambassade de France est sur les fiches d'urgence — ajoute-le si ce n'est pas fait.",
      "Adaptateur de prise : vérifie le type de prise du pays (l'île Maurice est en prises anglaises type G).",
    ],
  },
  {
    icon: Wifi,
    title: "Dans Phil, avant de partir",
    tips: [
      "Installe Phil sur ton téléphone (Ajouter à l'écran d'accueil) et active les notifications : rappels J-1, alerte météo de la veille.",
      "« Tout préparer (documents inclus) » dans les Paramètres du voyage pour le mode hors-ligne.",
      "Vérifie que chacun a rempli sa fiche d'urgence et coché sa valise.",
    ],
  },
];

/** Conseils de voyage (PHIL-Q17) — le carnet de bord du voyageur prévoyant. */
export default function ConseilsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="font-display text-3xl text-encre">Conseils de voyage</h1>
      <p className="mt-1 mb-6 text-sm text-encre-douce">
        Ce que Phileas vérifiait avant chaque départ — à parcourir une fois, à cocher pour de vrai
        dans la Valise de ton voyage.
      </p>

      <div className="flex flex-col gap-4">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <section
              key={section.title}
              className="rounded-lg border border-laiton-clair bg-papier px-5 py-4"
            >
              <h2 className="mb-2 flex items-center gap-2 text-sm font-medium text-encre">
                <Icon className="size-4 text-laiton" aria-hidden="true" />
                {section.title}
              </h2>
              <ul className="flex flex-col gap-1.5">
                {section.tips.map((tip) => (
                  <li key={tip} className="flex gap-2 text-sm text-encre-douce">
                    <span className="text-laiton">—</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <p className="mt-6 text-sm text-encre-douce">
        <Link href="/trips" className="underline underline-offset-4 hover:text-encre">
          ← Retour aux voyages
        </Link>
      </p>
    </main>
  );
}
