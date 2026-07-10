# Jeu de données exemple — Voyage « Île Maurice 2026 »

> Données **fictives** et cohérentes pour peupler les maquettes de la refonte design de Phil
> (à utiliser avec les prompts Fable 5). Aucune donnée réelle. Version lisible ici ;
> version structurée : `donnees-exemple-maurice.json` (même dossier).

## Le voyage

| Champ | Valeur |
|---|---|
| Nom | **Maurice 2026** |
| Destination | Île Maurice |
| Dates | **5 → 21 novembre 2026** (16 jours) |
| Fuseau | Indian/Mauritius (UTC+4) |
| Monnaie | EUR (secondaire : MUR — roupie mauricienne) |
| Statut | À venir |
| Capitaine | Yves |

## Équipage (9 participants)

| Prénom | Rôle | Note |
|---|---|---|
| **Yves** | Capitaine (OWNER) | organisateur, a avancé la villa |
| Amélie | Éditeur | gère les courses |
| Karim | Éditeur | a réservé la voiture |
| Léa | Éditeur | a réservé le catamaran |
| Sarah | Éditeur | — |
| Nadia | Éditeur | — |
| Thomas | Lecteur | — |
| Julien | Lecteur | — |
| Marc | Lecteur | rejoint 2 jours plus tard |

## Calendrier — événements

| # | Type | Titre | Début (local) | Fin (local) | Lieu | Détails |
|---|---|---|---|---|---|---|
| 1 | ✈️ Transport | Vol Paris → Maurice | 5 nov. 22:10 (Paris) | 6 nov. 12:35 | CDG → SSR | Air Mauritius MK015, réf. **T7K2QP** |
| 2 | 🚐 Transport | Transfert aéroport → villa | 6 nov. 13:15 | 6 nov. 14:00 | SSR → Tamarin | minibus privé |
| 3 | 🏠 Hébergement | Villa Tamarin | 6 nov. 15:00 (check-in) | 20 nov. 11:00 (check-out) | Tamarin | Booking, 9 voyageurs, réf. **BK-88213** |
| 4 | 🤿 Activité | Plongée au Morne | 8 nov. 09:00 | 8 nov. 12:00 | Le Morne | club de plongée, 60 €/pers |
| 5 | 🛍️ Activité | Marché de Port-Louis | 10 nov. 10:00 | 10 nov. 13:00 | Port-Louis | — |
| 6 | ⛵ Activité | Catamaran île aux Cerfs | 12 nov. 08:30 | 12 nov. 17:00 | Trou d'Eau Douce | 450 € (groupe), déjeuner inclus |
| 7 | 🥾 Activité | Rando Black River Gorges | 15 nov. 08:00 | 15 nov. 14:00 | Black River | prévoir eau + chaussures |
| 8 | 🍹 Activité | Dégustation rhum Chamarel | 17 nov. 15:00 | 17 nov. 17:00 | Chamarel | — |
| 9 | ✈️ Transport | Vol Maurice → Paris | 20 nov. 21:40 | 21 nov. 06:15 (Paris) | SSR → CDG | Air Mauritius MK014, réf. **T7K2QP** |

> Note timeline : l'hébergement (#3) court sur **14 nuits** ; les vols aller/retour débordent d'un jour (fuseau). Idéal pour tester la vue **timeline multi-jours**.

## Carte — étapes (style Polarsteps, ordre chronologique)

| Étape | Lieu | Coord. (lat, lng) | Icône |
|---|---|---|---|
| 1 | Aéroport SSR | -20.430, 57.683 | ✈️ |
| 2 | 🏠 Villa Tamarin | -20.325, 57.371 | maison |
| 3 | Le Morne | -20.456, 57.311 | 🤿 |
| 4 | Port-Louis | -20.161, 57.498 | 🛍️ |
| 5 | Île aux Cerfs | -20.273, 57.803 | ⛵ |
| 6 | Black River Gorges | -20.418, 57.443 | 🥾 |
| 7 | Chamarel | -20.446, 57.376 | 🍹 |

Commerces repérés (POI hors tracé) : **Super U Tamarin** (-20.331, 57.376) « ouvert 8h-20h » · **Pharmacie Flic en Flac** (-20.274, 57.365).

## La Bourse — budget & équilibres

**Dépenses** (partagées entre les 9, part = **556,67 €/pers**) :

| Dépense | Payé par | Montant | Réparti |
|---|---|---|---|
| Acompte villa | Yves | 3 600 € | 9 parts |
| Location voiture (2 sem.) | Karim | 720 € | 9 parts |
| Courses (1ère semaine) | Amélie | 240 € | 9 parts |
| Catamaran île aux Cerfs | Léa | 450 € | 9 parts |
| **Total** | | **5 010 €** | |

**Équilibres** (positif = on lui doit) :

| Personne | A payé | Solde |
|---|---|---|
| **Yves** | 3 600 € | **+3 043,33 €** |
| Karim | 720 € | +163,33 € |
| Léa | 450 € | −106,67 € |
| Amélie | 240 € | −316,67 € |
| Sarah | 0 € | −556,67 € |
| Nadia | 0 € | −556,67 € |
| Thomas | 0 € | −556,67 € |
| Julien | 0 € | −556,67 € |
| Marc | 0 € | −556,67 € |

**Règlements suggérés** (qui doit à qui) : Sarah → Yves 556,67 € · Nadia → Yves 556,67 € · Thomas → Yves 556,67 € · Julien → Yves 556,67 € · Marc → Yves 163,33 € puis → Karim… (le solveur minimise le nombre de virements).

## Idées (pool, avec votes façon swipe ⭐/❤️/👎)

| Idée | Lieu | ~Coût | ⭐ Vaut le coup | ❤️ Optionnel | 👎 Non | Statut |
|---|---|---|---|---|---|---|
| Cascade de Chamarel | Chamarel | gratuit | 6 | 2 | 0 | **Match** |
| Kitesurf à Le Morne | Le Morne | 80 € | 3 | 2 | 3 | pool |
| Observation des dauphins | Tamarin | 45 € | 5 | 3 | 0 | pool |
| Jardin de Pamplemousses | Pamplemousses | 10 € | 2 | 4 | 1 | pool |

## Candidats hébergement (avant de choisir la villa)

| Candidat | Prix | Check-in → out | Score votes | Statut |
|---|---|---|---|---|
| **Villa Tamarin** | 3 600 € / 14 nuits | 6 → 20 nov. | +9 | ✅ Choisi |
| Résidence Flic en Flac | 4 100 € | 6 → 20 nov. | +2 | rejeté |
| Hôtel Belle Mare (demi-pension) | 6 800 € | 6 → 20 nov. | −3 | rejeté |

## Valise (checklist par catégorie)

- **Documents** : Passeport ✅ · e-billet d'avion ✅ · Attestation d'assurance ○ · Permis de conduire international ○
- **Vêtements** : Maillots (×2) ○ · Crème solaire SPF50 ✅ · Casquette ○ · Tenue légère ○
- **Santé** : Anti-moustique ○ · Trousse à pharmacie ✅ · Médicaments perso ○
- **Divers** : Adaptateur (type G, UK) ○ · Masque + tuba ○ · Batterie externe ✅

*(✅ = coché, ○ = à faire)*

## Miam (repas & courses)

**Repas planifiés**
| Jour | Créneau | Plat | Cuisinier |
|---|---|---|---|
| 6 nov. | Dîner | BBQ d'arrivée | Karim |
| 8 nov. | Dîner | Curry mauricien | Léa |
| 11 nov. | Déjeuner | Salades + fruits | Amélie |

**Liste de courses (partagée)** : Riz (5 kg) ○ · Poulet ○ · Légumes ✅ · Rhum arrangé ○ · Eau (pack ×6) ✅ · Épices curry ○ · Charbon BBQ ○

## Sondage en cours

**« Quelle activité le mercredi 12 ? »** (clôture 11 nov.) — choix simple
- ⛵ Catamaran île aux Cerfs — **6 voix** (Yves, Amélie, Karim, Léa, Sarah, Nadia)
- 🥾 Rando Black River — 2 voix (Thomas, Julien)
- 🏖️ Journée plage farniente — 1 voix (Marc)

## Photos (grille + carte via GPS)

| Légende | Auteur | Position | 
|---|---|---|
| Coucher de soleil au Morne | Léa | -20.456, 57.311 |
| Plage de Flic en Flac | Sarah | -20.274, 57.365 |
| Marché de Port-Louis | Amélie | -20.161, 57.498 |
| Le catamaran | Yves | (sans GPS) |

## Coffre (documents personnels de Yves — écran coffre)

> Le contenu réel est **chiffré** (E2EE) : n'affiche que des **métadonnées** + un cadenas. Le numéro se déchiffre côté propriétaire uniquement.

| Document | Catégorie | Expire | Numéro | Partagé |
|---|---|---|---|---|
| Passeport | Pièce d'identité | 2029-03-14 | •••• (déchiffré : 19FG4****) | privé |
| Carte d'identité | Pièce d'identité | 2031-08-01 | •••• | privé |
| Permis de conduire | Permis | 2033-12-20 | •••• | prêté à « Maurice 2026 » (Karim seul) |
| Attestation assurance voyage | Assurance | 2026-11-30 | — | partagé au voyage |

États « à part » à illustrer : coffre **verrouillé** (avant Face ID) vs **déverrouillé**, filigrane sur un document ouvert, badge « expire bientôt » sur l'assurance.

## Micro-copie (esprit Phil / Fogg — exemples)

- État vide voyages : *« Phil n'a encore aucun voyage en tête… 80 jours, ça commence par un premier pas. »*
- État vide agenda du jour : *« Aucun événement aujourd'hui — même Phileas prenait des pauses. »*
- Chargement : *« Je prépare ton voyage… »*
- Coffre : *« J'ai bien rangé ton document dans ton coffre. »*
