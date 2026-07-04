# Phil — Toutes les fonctionnalités

> Carnet de voyage collaboratif avec coffre-fort d'identité, pour un cercle d'amis.
> État au 4 juillet 2026 (vagues 1 à 5). Les fonctionnalités marquées 🔑 attendent une configuration (clé ou domaine) pour être actives.

---

## 1. Comptes & profil

- **Connexion Google (SSO)** — pas de mot de passe à gérer, création de compte au premier login.
- **Profil** : nom affiché, langue, fuseau horaire par défaut, **contact WhatsApp** (numéro → lien wa.me cliquable, ou @pseudo), visible des co-voyageurs uniquement.
- **Préférences de notification** : 4 interrupteurs (invitations, expirations de documents, rappels J-1, alerte météo) + activation des push par appareil.
- **RGPD** : export complet de ses données personnelles + suppression de compte.

## 2. Voyages & équipage

- **Créer un voyage** : nom, destination (géocodée automatiquement), dates, fuseau, image de couverture, au choix **vierge ou depuis un template** (Roadtrip, Vacances chill, Ski) qui pré-remplit idées et valise.
- **Rôles** : Capitaine (OWNER), Éditeur, Lecteur — appliqués en base (Row Level Security), pas seulement à l'écran.
- **Inviter par email** : invitation avec lien à durée limitée (email Resend + lien copiable pour WhatsApp).
- **Tes compagnons de route** : les amis de tes voyages passés s'invitent **en un tap** depuis la page Participants.
- **Carnet d'amis** : tous tes co-voyageurs, ré-invitables sur n'importe quel voyage.
- **Groupe WhatsApp du voyage** : lien enregistré dans les Paramètres, bouton sur la page Participants (la discussion reste sur WhatsApp, choix assumé).
- **Devises du voyage** : une principale (affichée en gros) + une secondaire (en petit dessous), conversion automatique quotidienne (166 devises, dont la roupie mauricienne).
- **Archivage** et suppression (Capitaine).

## 3. Calendrier & événements

- **Trois types d'événements** : Transport (mode, trajet, compagnie, référence), Hébergement (check-in/out, plateforme, voyageurs), Activité (durée, coût, lien).
- **Ajout rapide ⚡** : titre + jour (+ heure), l'activité est créée en 2 secondes, enrichissable ensuite.
- **Fuseaux horaires sérieux** : chaque événement porte son fuseau IANA, tout est stocké en UTC, affiché en heure locale explicite.
- **Vues** : liste par jour, **vue jour heure par heure**, timeline du voyage.
- **Mode "Aujourd'hui"** (pendant le voyage) : événement en cours, prochain départ avec compte à rebours, météo du jour, temps de route vers le prochain RDV.
- **Fiche événement** : détails, bouton Itinéraire (Google Maps), **lien externe** (compagnie, réservation), documents attachés, participants inscrits (qui est de la plongée ?), **liste "à emporter"**, **notes de l'équipage**.
- **Participants par événement** : optionnel — vide = tout le groupe, sinon la liste des inscrits.
- **Notes de l'équipage** : fil de notes sous chaque événement ("le resto est fermé le lundi"), liens cliquables.
- **Temps de trajet** : "≈ 35 min de route" entre les événements consécutifs de la journée (OSRM).
- **Ordre de visite malin** : si réordonner les activités du jour économise vraiment des kilomètres, Phil le suggère (indicatif, rien ne bouge tout seul).
- **Autocomplétion de lieu** : suggestions en tapant (activités, hébergements, idées) → coordonnées propres pour la carte et les trajets.
- **Export iCal** : flux personnel par voyage à abonner dans Google/Apple Calendar (jeton par participant).

## 4. Import de réservations

- **Par fichier** 🔑 (clé Gemini) : dépose le PDF ou des captures de ta confirmation Booking/SNCF/compagnie → formulaire pré-rempli à vérifier → événement créé + confirmation rangée dans les documents et attachée. Rien n'est créé sans ta validation.
- **Par email** 🔑 (domaine à configurer) : chaque voyage a son **adresse d'import** (Paramètres) ; les confirmations transférées arrivent en "à valider" sur la page Importer. Seuls les emails des participants sont acceptés. *(Un brouillon de démo est déjà en attente sur Maurice 2026 pour tester l'écran sans clé.)*

## 5. Coffre-fort d'identité (privé)

- **Documents personnels** : passeport, CNI, permis, assurance — privés par défaut, jamais visibles des autres.
- **Verrou biométrique** : passkey (Face ID / Touch ID) exigée pour ouvrir le coffre, session de déverrouillage courte.
- **OCR du passeport** : la bande MRZ est lue à l'upload (dans le navigateur, rien n'est envoyé à un tiers) et pré-remplit numéro + date d'expiration — uniquement si les sommes de contrôle passent.
- **Contrôle de validité** : avertissement sur le voyage si un passeport expire avant la fin ou moins de 6 mois après le retour.
- **Filigrane dynamique** : chaque consultation d'un document du coffre est marquée à l'email du lecteur (PDF).
- **Partage explicite** : vers l'équipage d'un voyage ou vers des personnes précises, avec **échéance** (par défaut : la fin du voyage), révocable.
- **Alertes d'expiration** : email 6 mois avant l'expiration d'un document.
- **Journal d'accès** : qui a vu quoi, quand — consultable dans le coffre.

## 6. Documents du voyage (partagés)

- Billets, vouchers, hébergements, assurances — visibles de **tout l'équipage** dès l'upload.
- Attachables aux événements (le voucher sur la fiche du catamaran).
- Consultation via API authentifiée uniquement (jamais d'URL publique longue durée).

## 7. Idées, sondages & décisions

- **Pool d'idées** : titre, description (liens cliquables), lieu géocodé, durée/coût estimés, tags, lien externe. Tri par votes ou date, filtre par tag.
- **Votes +1** sur les idées, **conversion en événement planifié** en un clic (l'idée garde le lien vers l'événement).
- **Sondages éclair** : "resto ce soir ?" — 2 à 5 options, vote en un tap, résultats en direct, clôture. Notification push à l'ouverture.
- **Hébergements candidats** : plusieurs options pour un même créneau (lien, prix, notes), **avis pondérés** ("Vaut le coup" +2 / "Optionnel" +1 / "Plutôt non" −1) avec commentaires et score ; le Capitaine tranche → l'élu devient l'événement Hébergement du calendrier. Plusieurs choix possibles (groupe > capacité d'un logement).
- **Temps réel** : votes et sondages se mettent à jour sans recharger la page.

## 8. Valise (checklist partagée)

- **Trois sections** : avant le départ / à emporter / sur place. Items cochables, **assignables** ("Enceinte — Amelie"), barre de progression.
- **"À emporter" par activité** : "snorkeling → maillot" — visible sur la fiche de l'activité ET dans la Valise avec un badge.
- **Phil te souffle** : suggestions automatiques d'après la **météo prévue** (pluie → k-way), les **activités planifiées** (rando → chaussures) et la durée du séjour — à ajouter d'un tap.
- Pré-remplie par les templates de voyage.

## 9. Budget partagé

- **Équilibre (le "tricount")** : dépenses avec payeur et bénéficiaires (par défaut : les inscrits de l'événement, sinon tout le groupe), soldes par personne, **règlements simplifiés** ("Yves doit 42 € à Amelie") et bouton **"Marquer comme réglé"**.
- **Suivi des dépenses** : répartition par **catégorie** (transport, logement, activités, restos, courses) et par phase **avant / pendant / après**, en double lecture "le voyage" et "mes dépenses".
- **Multi-devises** : chaque dépense garde sa devise (8 400 MUR de courses), tout est converti et affiché en devise principale + secondaire en dessous.
- Dépense **rattachable à un événement** (elle en hérite la catégorie), date de dépense distincte de la date de saisie.
- **Export CSV** (format Excel français), mise à jour **en temps réel**.

## 10. Photos

- **Galerie par voyage** avec **quota strict** (40 photos/voyage — qualité d'origine conservée, c'est le nombre qui est limité, pas la qualité).
- **Vignettes générées dans le navigateur** : la grille est légère, l'original ne se charge qu'à l'ouverture.
- **Visionneuse plein écran** : flèches, clavier, légendes.
- Légende et rattachement à un événement, suppression par l'auteur ou le Capitaine.
- Servies par API authentifiée (bucket privé).

## 11. Journal de bord & souvenirs

- **Journal par jour** : quelques lignes par voyageur, visibles de l'équipage, dans la vue jour. La matière première du futur PDF souvenir.
- **Stats de l'explorateur** (page personnelle) : voyages, jours de voyage, destinations, activités, **km parcourus** ("tu as bouclé 0,8 % d'un tour du monde"), photos, pages de journal.
- **Mappemonde des pays visités** : pays en couleur (4 teintes Phil) / à visiter en parchemin, clic pour cocher, suggestions automatiques d'après tes voyages passés.
- **Médailles de l'explorateur** : 14 badges esprit Jules Verne (Passepartout, Phileas, Cinq semaines en ballon, Daguerréotypiste…) avec progression — calculés en direct, sans classement entre amis.

## 12. Cartes & géographie

- **Carte du programme** : les événements épinglés (couleur par type), tracé chronologique, filtre par jour, distances depuis l'hébergement.
- **Carte des idées** : toutes les idées géolocalisées pour juger les distances.
- Fond OpenStreetMap, géocodage Nominatim automatique + autocomplétion Photon à la saisie.

## 13. Météo

- **Encart semaine** sur le calendrier du voyage (jusqu'à 16 jours de prévision, heure de la destination).
- **Météo du jour** dans la vue jour et le mode Aujourd'hui.
- **Alerte de la veille** : pluie annoncée demain sur un voyage en cours → notification push le soir.

## 14. Notifications & emails

- **Push (PWA installée)** : invitation reçue, sondage ouvert, rappels **J-1** des événements (inscrits ou tout le groupe), alerte météo, alerte passeport — chacune débrayable.
- **Emails (Resend)** : invitation à un voyage, alerte d'expiration de document. 🔑 *Envoi limité à ton adresse tant qu'aucun domaine n'est vérifié — le lien copiable prend le relais.*

## 15. Partage vers l'extérieur

- **Page publique en lecture seule** (façon Polarsteps) : lien révocable montrant nom, dates, **itinéraire et carte** — jamais les documents, le budget, les fiches d'urgence ni les notes. Pour les parents restés au port.
- **Flux iCal** par participant (agenda personnel).
- **Fiches d'urgence** : par voyageur (contacts, assurance, groupe sanguin, allergies), partagées à l'équipage, **imprimables** (le papier survit aux téléphones noyés).

## 16. Hors ligne & mobile

- **PWA installable** (iOS/Android), icône sur l'écran d'accueil.
- **Lecture offline** : les données du voyage et les documents marqués se consultent sans réseau ("Préparer pour le hors-ligne" dans les Paramètres), resynchronisation au retour du réseau.

## 17. Sécurité (transverse)

- **Row Level Security** sur toutes les tables : les règles d'accès vivent dans la base, pas dans le code — vérifiées par un script dédié (30 contrôles).
- Validation **Zod** de toutes les entrées, aucune clé secrète côté client, headers de sécurité, filigrane + journal d'accès sur le coffre.
- Politique de confidentialité, mentions légales, consentement cookies.

---

## Configuration en attente (côté Yves)

| Quoi | Pour activer | Où |
|---|---|---|
| Clé `GEMINI_API_KEY` | Import de réservations par fichier | aistudio.google.com/apikey → `.env.local` + Vercel |
| Domaine + `INBOUND_EMAIL_SECRET` | Import par email (adresse du voyage) | Resend inbound ou Cloudflare Email Routing |
| Domaine vérifié Resend | Emails d'invitation à tout le monde | Dashboard Resend |
| Passkey en production | Coffre sur phil-phi-nine.vercel.app | Profil → Sécurité du coffre |

## Comptes de démo

Le voyage **Maurice 2026** (5 → 21 novembre, Tamarin puis Blue Bay) est peuplé avec l'équipage complet — Amelie, Alexandre, Audrey, Adé, Mathieu, Quentin, Chloé, Julie (comptes `@phil-demo.test`) — et des données dans toutes les fonctionnalités ci-dessus. Pour régénérer : `npx tsx scripts/seed-demo-maurice.ts`.
