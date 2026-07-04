/**
 * PHIL-Q08 — Seed démo complet : « Maurice 2026 » (5 → 21 novembre).
 *
 * Peuple le voyage démo avec le vrai séjour (Tamarin puis Blue Bay, 9 adultes)
 * et des données dans TOUTES les fonctionnalités, activités piochées dans le
 * guide personnel d'Yves (yallah/activites-maurice.md).
 *
 * Usage : npx tsx scripts/seed-demo-maurice.ts
 *
 * ⚠️ Réinitialise les données du voyage démo uniquement (événements, idées,
 * budget, photos…) — ne touche à rien d'autre. Les comptes @phil-demo.test
 * sont créés s'ils n'existent pas.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

for (const line of readFileSync(join(process.cwd(), ".env.local"), "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i > 0 && !process.env[line.slice(0, i)]) {
    process.env[line.slice(0, i)] = line.slice(i + 1);
  }
}

import { createClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Database } from "../types/database";

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!BASE || !SVC) {
  console.error("Variables Supabase manquantes (.env.local).");
  process.exit(1);
}
const admin = createClient<Database>(BASE, SVC, { auth: { persistSession: false } });

const TRIP_NAME = "Maurice 2026";
const TZ_MU = "Indian/Mauritius"; // UTC+4 toute l'année
const TZ_PARIS = "Europe/Paris"; // UTC+1 en novembre

/** Instant UTC depuis une heure locale Maurice (UTC+4). */
const mu = (date: string, time: string) =>
  new Date(new Date(`${date}T${time}:00Z`).getTime() - 4 * 3600_000).toISOString();
/** Instant UTC depuis une heure locale Paris en novembre (UTC+1). */
const paris = (date: string, time: string) =>
  new Date(new Date(`${date}T${time}:00Z`).getTime() - 1 * 3600_000).toISOString();

const uuid = () => crypto.randomUUID();

const DEMO_USERS = [
  { key: "amelie", email: "amelie@phil-demo.test", name: "Amelie" },
  { key: "alexandre", email: "alexandre@phil-demo.test", name: "Alexandre" },
  { key: "audrey", email: "audrey@phil-demo.test", name: "Audrey" },
  { key: "ade", email: "ade@phil-demo.test", name: "Adé" },
  { key: "mathieu", email: "mathieu@phil-demo.test", name: "Mathieu" },
  { key: "quentin", email: "quentin@phil-demo.test", name: "Quentin" },
  { key: "chloe", email: "chloe@phil-demo.test", name: "Chloé" },
  { key: "julie", email: "julie@phil-demo.test", name: "Julie" },
] as const;

async function makePdf(title: string, lines: string[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const body = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText("PHIL — document de démonstration", {
    x: 50,
    y: 790,
    size: 10,
    font: body,
    color: rgb(0.43, 0.12, 0.18),
  });
  page.drawText(title, { x: 50, y: 750, size: 20, font, color: rgb(0.12, 0.16, 0.27) });
  lines.forEach((l, i) => {
    page.drawText(l, { x: 50, y: 710 - i * 22, size: 12, font: body, color: rgb(0.2, 0.2, 0.2) });
  });
  return doc.save();
}

async function main() {
  console.log("— Seed démo Maurice 2026 —\n");

  // ————— Voyage démo + utilisateurs —————
  const { data: trip } = await admin.from("trips").select("*").eq("name", TRIP_NAME).single();
  if (!trip) {
    throw new Error(`Voyage "${TRIP_NAME}" introuvable.`);
  }
  const tripId = trip.id;
  const yvesId = trip.created_by;

  const { data: existingUsers } = await admin.auth.admin.listUsers();
  const ids: Record<string, string> = { yves: yvesId };
  for (const u of DEMO_USERS) {
    const existing = existingUsers.users.find((x) => x.email === u.email);
    if (existing) {
      ids[u.key] = existing.id;
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email: u.email,
        password: `demo-${uuid()}`,
        email_confirm: true,
        user_metadata: { display_name: u.name },
      });
      if (error || !data.user) {
        throw new Error(`Création de ${u.email} : ${error?.message}`);
      }
      ids[u.key] = data.user.id;
      console.log(`✓ compte créé : ${u.name}`);
    }
    await admin
      .from("trip_participants")
      .upsert({ trip_id: tripId, user_id: ids[u.key], role: "EDITOR" });
  }
  console.log(`✓ équipage : Yves + ${DEMO_USERS.length} compagnons\n`);

  // WhatsApp sur quelques profils + réglages du voyage
  await admin.from("profiles").update({ whatsapp: "+33 6 11 22 33 44" }).eq("id", ids.alexandre);
  await admin.from("profiles").update({ whatsapp: "@julie.voyage" }).eq("id", ids.julie);
  await admin.from("profiles").update({ whatsapp: "+33 6 55 66 77 88" }).eq("id", ids.amelie);
  await admin
    .from("trips")
    .update({
      destination_lat: -20.28,
      destination_lng: 57.55,
      currency_primary: "EUR",
      currency_secondary: "MUR",
      whatsapp_group_url: "https://chat.whatsapp.com/PhilMaurice2026Demo",
    })
    .eq("id", tripId);

  // ————— Reset des données du voyage démo —————
  const { data: oldPhotos } = await admin
    .from("trip_photos")
    .select("storage_path, thumb_path")
    .eq("trip_id", tripId);
  const photoBlobs = (oldPhotos ?? []).flatMap((p) => [p.storage_path, p.thumb_path]).filter(Boolean) as string[];
  if (photoBlobs.length) {
    await admin.storage.from("photos").remove(photoBlobs);
  }
  const { data: oldDocs } = await admin
    .from("documents")
    .select("storage_path")
    .eq("trip_id", tripId)
    .eq("scope", "TRIP");
  if (oldDocs?.length) {
    await admin.storage.from("documents").remove(oldDocs.map((d) => d.storage_path));
  }
  for (const table of [
    "trip_photos",
    "import_drafts",
    "journal_entries",
    "emergency_sheets",
    "lodging_candidates",
    "polls",
    "checklist_items",
    "expenses",
    "trip_ideas",
    "trip_events",
  ] as const) {
    await admin.from(table).delete().eq("trip_id", tripId);
  }
  await admin.from("documents").delete().eq("trip_id", tripId).eq("scope", "TRIP");
  console.log("✓ anciennes données démo purgées\n");

  // ————— Événements —————
  type Ev = {
    id?: string;
    type: "TRANSPORT" | "LODGING" | "ACTIVITY";
    title: string;
    starts: string;
    ends?: string;
    tz?: string;
    loc?: string;
    addr?: string;
    lat?: number;
    lng?: number;
    notes?: string;
    meta?: Record<string, string | number>;
    only?: string[]; // event_participants (sinon tout l'équipage)
  };

  const volAllerId = uuid();
  const volJulieQuentinId = uuid();
  const catamaranId = uuid();
  const snorkelingId = uuid();
  const morneId = uuid();
  const villaBlueBayId = uuid();

  const events: Ev[] = [
    {
      id: volAllerId,
      type: "TRANSPORT",
      title: "Vol AF 934 Paris → Maurice",
      starts: paris("2026-11-04", "20:05"),
      ends: mu("2026-11-05", "11:35"),
      tz: TZ_PARIS,
      loc: "Paris CDG, Terminal 2E",
      meta: {
        transport_mode: "plane",
        from: "Paris CDG",
        to: "Aéroport SSR (Maurice)",
        carrier: "Air France",
        booking_reference: "AF6KYZ",
        external_url: "https://www.airfrance.fr",
      },
      only: ["yves", "amelie", "alexandre", "audrey", "ade", "mathieu", "chloe"],
    },
    {
      id: volJulieQuentinId,
      type: "TRANSPORT",
      title: "Vol Julie & Quentin — arrivée 9h",
      starts: paris("2026-11-05", "21:30"),
      ends: mu("2026-11-06", "09:00"),
      tz: TZ_PARIS,
      loc: "Paris CDG, Terminal 2E",
      notes: "On vient les chercher à l'aéroport avec les deux voitures.",
      meta: {
        transport_mode: "plane",
        from: "Paris CDG",
        to: "Aéroport SSR (Maurice)",
        carrier: "Air Mauritius",
        booking_reference: "MK015QJ",
        external_url: "https://www.airmauritius.com",
      },
      only: ["julie", "quentin"],
    },
    {
      type: "LODGING",
      title: "Villa Les Filaos — Tamarin",
      starts: mu("2026-11-05", "14:00"),
      ends: mu("2026-11-16", "11:00"),
      loc: "Villa Les Filaos",
      addr: "Chemin des Pêcheurs, Tamarin",
      lat: -20.3253,
      lng: 57.3708,
      notes: "Clés au gardien (M. Ravi). Piscine, 5 chambres. https://www.airbnb.fr/rooms/demo",
      meta: { platform: "airbnb", booking_reference: "HMABC4X2", guests: 9 },
    },
    {
      id: villaBlueBayId,
      type: "LODGING",
      title: "Villa Le Lagon — Blue Bay",
      starts: mu("2026-11-16", "15:00"),
      ends: mu("2026-11-21", "11:00"),
      loc: "Villa Le Lagon",
      addr: "Coastal Road, Blue Bay",
      lat: -20.4436,
      lng: 57.709,
      meta: { platform: "booking", booking_reference: "BK-88213", guests: 9 },
    },
    {
      type: "ACTIVITY",
      title: "Plage et coucher de soleil à Tamarin",
      starts: mu("2026-11-06", "16:00"),
      ends: mu("2026-11-06", "19:00"),
      loc: "Plage de Tamarin",
      lat: -20.3266,
      lng: 57.3705,
      notes: "Tranquille pour l'arrivée de Julie et Quentin le matin même.",
    },
    {
      type: "ACTIVITY",
      title: "Canyoning à Tamarin Falls",
      starts: mu("2026-11-07", "09:00"),
      ends: mu("2026-11-07", "13:00"),
      loc: "Tamarin Falls",
      lat: -20.319,
      lng: 57.399,
      notes:
        "Rappels, toboggans naturels, sauts jusqu'à 10 m — encadrement obligatoire (guide du voyage n°7, 5/5). Bonne condition physique.",
      meta: { cost: 95, cost_currency: "EUR", duration_minutes: 240 },
    },
    {
      type: "ACTIVITY",
      title: "Divali — fête des lumières",
      starts: mu("2026-11-08", "18:30"),
      loc: "Triolet",
      lat: -20.055,
      lng: 57.545,
      notes:
        "Maisons illuminées, partage de gâteaux. Le plus grand temple hindou de l'île (Maheswarnath) est à Triolet — tenue correcte.",
    },
    {
      id: morneId,
      type: "ACTIVITY",
      title: "Randonnée Le Morne Brabant",
      starts: mu("2026-11-09", "06:30"),
      ends: mu("2026-11-09", "11:00"),
      loc: "Le Morne Brabant",
      lat: -20.456,
      lng: 57.311,
      notes:
        "Départ tôt pour éviter la chaleur. Dernière section raide avec guide. Mémorial UNESCO des marrons au sommet.",
      meta: { cost: 45, cost_currency: "EUR", duration_minutes: 270 },
    },
    {
      id: catamaranId,
      type: "ACTIVITY",
      title: "Catamaran dauphins — baie de Tamarin",
      starts: mu("2026-11-10", "08:00"),
      ends: mu("2026-11-10", "14:00"),
      loc: "Ponton de Black River",
      lat: -20.338,
      lng: 57.36,
      notes: "Nage avec les dauphins le matin (souffleurs et long-becs), barbecue à bord.",
      meta: {
        cost: 585,
        cost_currency: "EUR",
        external_url: "https://www.catamarancruisesmauritius.com",
      },
    },
    {
      type: "ACTIVITY",
      title: "Chamarel : Terres des 7 Couleurs + cascade",
      starts: mu("2026-11-11", "10:00"),
      ends: mu("2026-11-11", "13:00"),
      loc: "Chamarel",
      lat: -20.4245,
      lng: 57.374,
      notes: "Cascade de 100 m puis dunes géologiques. Tortues près de l'entrée.",
    },
    {
      type: "ACTIVITY",
      title: "Rhumerie de Chamarel — visite et dégustation",
      starts: mu("2026-11-11", "15:00"),
      ends: mu("2026-11-11", "17:00"),
      loc: "Rhumerie de Chamarel",
      lat: -20.421,
      lng: 57.393,
      notes: "Guide du voyage : incontournable épicurien. Resto L'Alchimiste sur place.",
      meta: { cost: 15, cost_currency: "EUR", external_url: "https://www.rhumeriedechamarel.com" },
    },
    {
      type: "ACTIVITY",
      title: "Pêche au gros depuis Black River",
      starts: mu("2026-11-12", "06:00"),
      ends: mu("2026-11-12", "12:00"),
      loc: "Port de Black River",
      lat: -20.362,
      lng: 57.366,
      notes:
        "Tamarin = port historique de la pêche au gros (marlin bleu, thon jaune). Novembre = bon mois pour le marlin. Bateau à diviser à 9.",
      meta: { cost: 550, cost_currency: "EUR" },
    },
    {
      type: "ACTIVITY",
      title: "Jardin botanique de Pamplemousses",
      starts: mu("2026-11-13", "09:30"),
      ends: mu("2026-11-13", "12:00"),
      loc: "Jardin de Pamplemousses",
      lat: -20.1054,
      lng: 57.5726,
      notes: "Nénuphars géants, palmier talipot. Guide local conseillé à l'entrée.",
    },
    {
      type: "ACTIVITY",
      title: "Déjeuner créole chez Tante Athalie",
      starts: mu("2026-11-13", "12:30"),
      ends: mu("2026-11-13", "14:30"),
      loc: "Pamplemousses",
      lat: -20.096,
      lng: 57.576,
      notes: "Table d'hôte dans une ancienne cour coloniale, cari maison.",
      meta: { cost: 20, cost_currency: "EUR" },
    },
    {
      type: "ACTIVITY",
      title: "Courses hippiques au Champ de Mars",
      starts: mu("2026-11-14", "13:00"),
      ends: mu("2026-11-14", "18:00"),
      loc: "Champ de Mars, Port Louis",
      lat: -20.1638,
      lng: 57.509,
      notes:
        "2e plus vieil hippodrome du monde (1812). Ambiance populaire, paris possibles — samedi de courses.",
    },
    {
      type: "ACTIVITY",
      title: "Marché central de Port Louis + street food",
      starts: mu("2026-11-15", "09:30"),
      ends: mu("2026-11-15", "13:00"),
      loc: "Marché central, Port Louis",
      lat: -20.159,
      lng: 57.5028,
      notes: "Dholl puri, alouda, épices. Négocier avec le sourire.",
    },
    {
      id: snorkelingId,
      type: "ACTIVITY",
      title: "Snorkeling à Blue Bay Marine Park",
      starts: mu("2026-11-17", "09:00"),
      ends: mu("2026-11-17", "12:30"),
      loc: "Blue Bay Marine Park",
      lat: -20.4436,
      lng: 57.7126,
      notes:
        "Parc marin protégé, visibilité 20-30 m, 50+ espèces de coraux (guide du voyage n°1, 5/5). Bateau à fond de verre puis 2 spots.",
      meta: { cost: 30, cost_currency: "EUR" },
    },
    {
      type: "ACTIVITY",
      title: "Île aux Aigrettes — visite guidée",
      starts: mu("2026-11-18", "09:30"),
      ends: mu("2026-11-18", "12:00"),
      loc: "Pointe Jérôme (embarcadère)",
      lat: -20.4203,
      lng: 57.7315,
      notes: "Réserve naturelle : tortues géantes, pigeon rose, ebony forest. Réservation MWF.",
      meta: { cost: 18, cost_currency: "EUR", external_url: "https://www.mauritian-wildlife.org" },
    },
    {
      type: "ACTIVITY",
      title: "Kayak transparent — Île d'Ambre",
      starts: mu("2026-11-19", "08:00"),
      ends: mu("2026-11-19", "12:00"),
      loc: "Île d'Ambre",
      lat: -20.037,
      lng: 57.659,
      notes: "Mangrove, eau peu profonde, faune endémique (guide du voyage n°4, 5/5).",
      meta: { cost: 45, cost_currency: "EUR" },
    },
    {
      type: "ACTIVITY",
      title: "Dîner d'adieu — table d'hôte à Mahébourg",
      starts: mu("2026-11-20", "19:00"),
      loc: "Mahébourg, front de mer",
      lat: -20.4081,
      lng: 57.7,
      notes: "Dernier soir tous ensemble — cari octopus et rougaille.",
    },
    {
      type: "TRANSPORT",
      title: "Vol retour MK 043 Maurice → Paris",
      starts: mu("2026-11-21", "21:50"),
      ends: paris("2026-11-22", "07:15"),
      loc: "Aéroport SSR (Maurice)",
      meta: {
        transport_mode: "plane",
        from: "Aéroport SSR (Maurice)",
        to: "Paris CDG",
        carrier: "Air Mauritius",
        booking_reference: "MK9PLW",
      },
    },
  ];

  for (const e of events) {
    const id = e.id ?? uuid();
    e.id = id;
    const { error } = await admin.from("trip_events").insert({
      id,
      trip_id: tripId,
      type: e.type,
      title: e.title,
      starts_at: e.starts,
      ends_at: e.ends ?? null,
      timezone: e.tz ?? TZ_MU,
      location_name: e.loc ?? null,
      location_address: e.addr ?? null,
      location_lat: e.lat ?? null,
      location_lng: e.lng ?? null,
      notes: e.notes ?? null,
      metadata: e.meta ?? {},
      created_by: yvesId,
    });
    if (error) {
      throw new Error(`Événement "${e.title}" : ${error.message}`);
    }
    if (e.only) {
      await admin
        .from("event_participants")
        .insert(e.only.map((k) => ({ event_id: id, user_id: ids[k] })));
    }
  }
  console.log(`✓ ${events.length} événements (transports, villas, activités du guide)`);

  // ————— Idées (pool) + votes —————
  const ideas = [
    {
      title: "Sous-marin Blue Safari (vrai sous-marin à -35 m)",
      description: "Unique au monde : descente à 35 m, épave du Star Hope. Aucune compétence requise — diplôme remis à la fin ! ~110 €/pers. https://blue-safari.com",
      loc: "Trou aux Biches",
      lat: -20.036,
      lng: 57.545,
      tags: ["mer", "sensations"],
      votes: ["yves", "amelie", "chloe", "mathieu"],
    },
    {
      title: "💎 Snorkeling avec les cachalots (Lokal Adventures)",
      description: "Un des rares spots au monde où c'est légal et encadré. Novembre = transition, à confirmer 48h avant selon les sightings. 150-250 €/pers.",
      loc: "Au large de Tamarin",
      lat: -20.35,
      lng: 57.32,
      tags: ["mer", "pépite", "faune"],
      votes: ["yves", "amelie", "alexandre", "audrey", "quentin", "julie"],
    },
    {
      title: "Plongée à l'Île Ronde — requins (plongeurs confirmés)",
      description: "LE spot avancé : requins gris, raies aigle, visibilité 35-50 m. Open Water minimum — pour Mathieu et Yves seulement ?",
      loc: "Cap Malheureux",
      lat: -19.984,
      lng: 57.614,
      tags: ["mer", "sensations"],
      votes: ["mathieu", "yves"],
    },
    {
      title: "Sortie pêche traditionnelle avec un pêcheur (5h du matin)",
      description: "Embarquer sur une pirogue, pêche au filet, déjeuner du poisson à la maison. 40-70 €/pers.",
      loc: "Tamarin",
      lat: -20.3253,
      lng: 57.3708,
      tags: ["mer", "culture"],
      votes: ["ade", "alexandre", "quentin"],
    },
    {
      title: "Street food tour à Port Louis",
      description: "Dholl puri chez Dewa, gato pima, alouda du marché — le vrai goût de l'île.",
      loc: "Port Louis",
      lat: -20.16,
      lng: 57.5,
      tags: ["gastronomie"],
      votes: ["amelie", "audrey", "chloe", "julie", "yves"],
    },
    {
      title: "Kitesurf initiation au Morne",
      description: "Le spot mythique — lagon plat, vent régulier en novembre. Cours débutant ~90 €.",
      loc: "Le Morne",
      lat: -20.456,
      lng: 57.309,
      tags: ["mer", "sensations"],
      votes: ["quentin", "mathieu"],
    },
    {
      title: "Marché de Flacq (le plus grand de l'île)",
      description: "Mercredi et dimanche. Fruits, épices, souvenirs — sur la route de l'est.",
      loc: "Centre de Flacq",
      lat: -20.19,
      lng: 57.715,
      tags: ["marché"],
      votes: ["ade"],
    },
  ];
  for (const idea of ideas) {
    const ideaId = uuid();
    const { error } = await admin.from("trip_ideas").insert({
      id: ideaId,
      trip_id: tripId,
      title: idea.title,
      description: idea.description,
      location_name: idea.loc,
      location_lat: idea.lat,
      location_lng: idea.lng,
      tags: idea.tags,
      created_by: ids[idea.votes[0]] ?? yvesId,
    });
    if (error) {
      throw new Error(`Idée "${idea.title}" : ${error.message}`);
    }
    await admin
      .from("idea_votes")
      .insert(idea.votes.map((k) => ({ idea_id: ideaId, user_id: ids[k] })));
  }
  console.log(`✓ ${ideas.length} idées avec votes`);

  // ————— Sondages —————
  const poll1 = uuid();
  await admin.from("polls").insert({
    id: poll1,
    trip_id: tripId,
    question: "Premier dîner à Tamarin : créole, chinois ou pizza ?",
    options: ["Table d'hôte créole", "Chinois de Black River", "Pizza au bord de l'eau"],
    created_by: ids.amelie,
  });
  await admin.from("poll_votes").insert([
    { poll_id: poll1, user_id: ids.amelie, option_index: 0 },
    { poll_id: poll1, user_id: ids.alexandre, option_index: 0 },
    { poll_id: poll1, user_id: ids.chloe, option_index: 2 },
    { poll_id: poll1, user_id: ids.mathieu, option_index: 0 },
    { poll_id: poll1, user_id: ids.audrey, option_index: 1 },
  ]);
  const poll2 = uuid();
  await admin.from("polls").insert({
    id: poll2,
    trip_id: tripId,
    question: "On loue quoi pour les 16 jours ?",
    options: ["2 voitures", "1 minibus 9 places"],
    created_by: yvesId,
    closed_at: new Date().toISOString(),
  });
  await admin.from("poll_votes").insert([
    { poll_id: poll2, user_id: yvesId, option_index: 0 },
    { poll_id: poll2, user_id: ids.amelie, option_index: 0 },
    { poll_id: poll2, user_id: ids.quentin, option_index: 1 },
    { poll_id: poll2, user_id: ids.julie, option_index: 0 },
    { poll_id: poll2, user_id: ids.mathieu, option_index: 0 },
  ]);
  console.log("✓ 2 sondages (1 ouvert, 1 clos)");

  // ————— Hébergements candidats + avis pondérés —————
  const candChosen = uuid();
  const candOpen = uuid();
  const candRejected = uuid();
  await admin.from("lodging_candidates").insert([
    {
      id: candChosen,
      trip_id: tripId,
      title: "Villa Le Lagon — Blue Bay",
      url: "https://www.booking.com/hotel/mu/demo-lagon.html",
      price: "1 450 € les 5 nuits",
      notes: "Pieds dans l'eau, kayaks inclus, 5 chambres.",
      check_in: "2026-11-16",
      check_out: "2026-11-21",
      status: "CHOSEN",
      chosen_event_id: villaBlueBayId,
      created_by: yvesId,
    },
    {
      id: candOpen,
      trip_id: tripId,
      title: "Résidence Coral Beach — Pointe d'Esny",
      url: "https://www.airbnb.fr/rooms/demo-coral",
      price: "1 180 € les 5 nuits",
      notes: "Moins cher mais 10 min de route de la plage de Blue Bay.",
      check_in: "2026-11-16",
      check_out: "2026-11-21",
      created_by: ids.mathieu,
    },
    {
      id: candRejected,
      trip_id: tripId,
      title: "Appartements Le Mahébourgeois",
      url: "https://www.airbnb.fr/rooms/demo-mahebourg",
      price: "980 € les 5 nuits",
      notes: "Deux appartements séparés — le groupe serait coupé en deux.",
      check_in: "2026-11-16",
      check_out: "2026-11-21",
      status: "REJECTED",
      created_by: ids.audrey,
    },
  ]);
  await admin.from("candidate_votes").insert([
    { candidate_id: candChosen, user_id: yvesId, rating: 2, comment: "Le lagon au réveil, on ne va pas se mentir." },
    { candidate_id: candChosen, user_id: ids.amelie, rating: 2, comment: null },
    { candidate_id: candChosen, user_id: ids.julie, rating: 2, comment: "Les kayaks inclus font la différence." },
    { candidate_id: candChosen, user_id: ids.mathieu, rating: 1, comment: "Un peu cher mais ok." },
    { candidate_id: candOpen, user_id: ids.mathieu, rating: 2, comment: "270 € d'écart quand même !" },
    { candidate_id: candOpen, user_id: ids.amelie, rating: 1, comment: null },
    { candidate_id: candOpen, user_id: ids.chloe, rating: -1, comment: "Sans vue mer, bof pour la dernière semaine." },
    { candidate_id: candRejected, user_id: ids.audrey, rating: -1, comment: "Coupés en deux appartements, non." },
  ]);
  console.log("✓ 3 hébergements candidats (retenu / en lice / écarté) + avis pondérés");

  // ————— Valise (checklist) + à-emporter par activité —————
  await admin.from("checklist_items").insert([
    { trip_id: tripId, section: "avant_depart", title: "Vérifier les passeports (6 mois après le retour)", done: true, created_by: yvesId },
    { trip_id: tripId, section: "avant_depart", title: "Réserver le canyoning (encadrement obligatoire)", done: true, assigned_to: ids.mathieu, created_by: ids.mathieu },
    { trip_id: tripId, section: "avant_depart", title: "Confirmer le catamaran 48h avant", assigned_to: ids.alexandre, created_by: yvesId },
    { trip_id: tripId, section: "a_emporter", title: "Adaptateurs prise (type UK)", assigned_to: ids.audrey, created_by: ids.audrey },
    { trip_id: tripId, section: "a_emporter", title: "Trousse à pharmacie du groupe", assigned_to: ids.chloe, created_by: ids.amelie, done: true },
    { trip_id: tripId, section: "a_emporter", title: "Enceinte bluetooth", assigned_to: ids.amelie, created_by: ids.quentin },
    { trip_id: tripId, section: "sur_place", title: "Récupérer les 2 voitures de location à l'aéroport", assigned_to: yvesId, created_by: yvesId },
    { trip_id: tripId, section: "sur_place", title: "Acheter des cartes SIM locales (my.t ou Emtel)", created_by: ids.ade },
    // À emporter rattachés à une activité (PHIL-O05)
    { trip_id: tripId, section: "a_emporter", title: "Masques et tubas (ou location sur place)", event_id: snorkelingId, created_by: ids.amelie },
    { trip_id: tripId, section: "a_emporter", title: "Crème solaire reef-safe", event_id: snorkelingId, done: true, created_by: ids.chloe },
    { trip_id: tripId, section: "a_emporter", title: "Chaussures de marche", event_id: morneId, created_by: yvesId },
    { trip_id: tripId, section: "a_emporter", title: "2L d'eau par personne", event_id: morneId, created_by: ids.mathieu },
  ]);
  console.log("✓ valise : 12 items (dont 4 rattachés au snorkeling et au Morne)");

  // ————— Budget : dépenses, catégories, devises, remboursement —————
  const everyone = ["yves", ...DEMO_USERS.map((u) => u.key)];
  const addExpense = async (e: {
    title: string;
    amount: number;
    currency?: string;
    paidBy: string;
    category: string;
    spentOn: string;
    eventId?: string;
    beneficiaries?: string[];
    isSettlement?: boolean;
  }) => {
    const id = uuid();
    const { error } = await admin.from("expenses").insert({
      id,
      trip_id: tripId,
      title: e.title,
      amount: e.amount,
      currency: e.currency ?? "EUR",
      paid_by: ids[e.paidBy],
      category: e.category,
      spent_on: e.spentOn,
      event_id: e.eventId ?? null,
      is_settlement: e.isSettlement ?? false,
      created_by: ids[e.paidBy],
    });
    if (error) {
      throw new Error(`Dépense "${e.title}" : ${error.message}`);
    }
    await admin
      .from("expense_beneficiaries")
      .insert((e.beneficiaries ?? everyone).map((k) => ({ expense_id: id, user_id: ids[k] })));
  };
  await addExpense({ title: "Vols Paris–Maurice (x7)", amount: 5530, category: "transport", paidBy: "yves", spentOn: "2026-06-12", beneficiaries: ["yves", "amelie", "alexandre", "audrey", "ade", "mathieu", "chloe"] });
  await addExpense({ title: "Vols Julie & Quentin", amount: 1640, category: "transport", paidBy: "quentin", spentOn: "2026-06-20", beneficiaries: ["quentin", "julie"] });
  await addExpense({ title: "Villa Les Filaos — 11 nuits", amount: 3300, category: "logement", paidBy: "mathieu", spentOn: "2026-07-01" });
  await addExpense({ title: "Acompte villa Blue Bay", amount: 725, category: "logement", paidBy: "audrey", spentOn: "2026-07-02" });
  await addExpense({ title: "Location 2 voitures (16 jours)", amount: 1240, category: "transport", paidBy: "yves", spentOn: "2026-11-05" });
  await addExpense({ title: "Catamaran dauphins (bateau privatisé)", amount: 585, category: "activite", paidBy: "alexandre", spentOn: "2026-11-10", eventId: catamaranId });
  await addExpense({ title: "Courses Super U Tamarin", amount: 8400, currency: "MUR", paidBy: "amelie", category: "courses", spentOn: "2026-11-06" });
  await addExpense({ title: "Street food Divali", amount: 3150, currency: "MUR", paidBy: "quentin", category: "resto", spentOn: "2026-11-08" });
  await addExpense({ title: "Dégustation rhumerie", amount: 135, category: "resto", paidBy: "ade", spentOn: "2026-11-11" });
  // Remboursement déjà réglé (PHIL-P04)
  await addExpense({ title: "Remboursement", amount: 650, category: "autre", paidBy: "julie", spentOn: "2026-07-03", beneficiaries: ["yves"], isSettlement: true });
  console.log("✓ budget : 9 dépenses (EUR + MUR, 5 catégories) + 1 remboursement");

  // ————— Journal de bord —————
  await admin.from("journal_entries").insert([
    {
      trip_id: tripId,
      day: "2026-11-05",
      author_id: yvesId,
      body: "Atterrissage sous le soleil. La villa est encore plus belle que sur les photos — premier rhum arrangé sur la terrasse en regardant la baie de Tamarin. Les 80 jours peuvent commencer.",
    },
    {
      trip_id: tripId,
      day: "2026-11-05",
      author_id: ids.amelie,
      body: "Le gardien nous a accueillis avec des letchis du jardin. Chambre avec vue sur la montagne du Rempart !",
    },
    {
      trip_id: tripId,
      day: "2026-11-06",
      author_id: ids.julie,
      body: "Arrivés à 9h pile avec Quentin, récupérés par Yves à l'aéroport. Sieste, plage, coucher de soleil — on rattrape déjà le niveau de bronzage des autres.",
    },
  ]);
  console.log("✓ journal de bord : 3 entrées");

  // ————— Notes d'équipage sur les événements —————
  await admin.from("event_notes").insert([
    {
      event_id: catamaranId,
      author_id: ids.alexandre,
      body: "Confirmé par l'opérateur : RDV 7h45 au ponton de Black River, prévoir crème solaire et serviettes. Le barbecue est inclus. https://www.catamarancruisesmauritius.com",
    },
    {
      event_id: catamaranId,
      author_id: ids.chloe,
      body: "J'ai le mal de mer — quelqu'un a des cachets ?",
    },
    {
      event_id: morneId,
      author_id: ids.mathieu,
      body: "Le guide dit départ 6h30 max, après il fait trop chaud sur la paroi. Réveil 5h45 ⏰",
    },
  ]);
  console.log("✓ notes d'équipage : 3 notes");

  // ————— Fiches d'urgence —————
  await admin.from("emergency_sheets").insert([
    {
      trip_id: tripId,
      user_id: yvesId,
      emergency_contacts: "Marie Dekerle (sœur) — +33 6 98 76 54 32",
      insurance_policy: "Visa Premier n° VP-2298-441",
      insurance_phone: "+33 1 42 99 82 81 (assisteur 24/7)",
      blood_group: "O+",
      allergies: null,
      notes: "Ambassade de France à Port Louis : +230 202 0100",
    },
    {
      trip_id: tripId,
      user_id: ids.amelie,
      emergency_contacts: "Paul Martin (père) — +33 6 12 21 12 21",
      insurance_policy: "Chapka Cap Assistance CA-77120",
      insurance_phone: "+33 1 74 85 50 50",
      blood_group: "A-",
      allergies: "Pénicilline",
      notes: null,
    },
    {
      trip_id: tripId,
      user_id: ids.julie,
      emergency_contacts: "Quentin (sur place) — +33 6 44 55 66 77",
      insurance_policy: "AVI International n° 448-JL",
      insurance_phone: "+33 1 44 63 51 00",
      blood_group: null,
      allergies: "Arachides (épipen dans la trousse)",
      notes: null,
    },
  ]);
  console.log("✓ fiches d'urgence : 3 remplies");

  // ————— Documents PDF (générés) + rattachements —————
  const docs: { title: string; lines: string[]; category: string; fileName: string; eventId?: string }[] = [
    {
      title: "Billets d'avion — groupe (x7)",
      lines: ["Air France AF 934 - 4 nov 2026, 20h05", "Paris CDG - Maurice SSR", "Dossier : AF6KYZ", "Passagers : Yves, Amelie, Alexandre, Audrey, Ade, Mathieu, Chloe"],
      category: "ticket",
      fileName: "billets-avion-groupe.pdf",
      eventId: volAllerId,
    },
    {
      title: "Voucher catamaran dauphins",
      lines: ["Catamaran Cruises Mauritius", "10 nov 2026 — 8h00, ponton de Black River", "9 personnes — bateau privatisé", "Référence : CCM-2026-1187"],
      category: "voucher",
      fileName: "voucher-catamaran.pdf",
      eventId: catamaranId,
    },
    {
      title: "Assurance voyage groupe",
      lines: ["Contrat multirisque voyage", "Du 4 au 22 novembre 2026 — 9 assurés", "Police n° AXA-TRV-90112", "Assistance 24/7 : +33 1 55 92 40 00"],
      category: "insurance",
      fileName: "assurance-voyage-groupe.pdf",
    },
  ];
  for (const d of docs) {
    const documentId = uuid();
    const bytes = await makePdf(d.title, d.lines);
    const storagePath = `${yvesId}/${documentId}.pdf`;
    const { error: upErr } = await admin.storage
      .from("documents")
      .upload(storagePath, bytes, { contentType: "application/pdf" });
    if (upErr) {
      throw new Error(`Upload ${d.fileName} : ${upErr.message}`);
    }
    const { error } = await admin.from("documents").insert({
      id: documentId,
      owner_id: yvesId,
      scope: "TRIP",
      trip_id: tripId,
      file_name: d.fileName,
      mime_type: "application/pdf",
      size_bytes: bytes.byteLength,
      storage_path: storagePath,
      category: d.category as "ticket",
      metadata: {},
    });
    if (error) {
      throw new Error(`Document ${d.fileName} : ${error.message}`);
    }
    if (d.eventId) {
      await admin.from("event_documents").insert({ event_id: d.eventId, document_id: documentId });
    }
  }
  console.log("✓ 3 documents PDF (billets, voucher, assurance) attachés aux événements");

  // ————— Photos (basse qualité, décision O10) —————
  const photoDefs = [
    { seed: "maurice-lagon", caption: "Le lagon depuis la villa", by: "yves", eventId: null },
    { seed: "maurice-morne", caption: "Sommet du Morne — ça valait le réveil", by: "mathieu", eventId: morneId },
    { seed: "maurice-dauphins", caption: "Ils étaient une vingtaine autour du bateau 🐬", by: "alexandre", eventId: catamaranId },
    { seed: "maurice-chamarel", caption: "Terres des 7 couleurs", by: "amelie", eventId: null },
    { seed: "maurice-plage", caption: "Tamarin au couchant", by: "julie", eventId: null },
    { seed: "maurice-marche", caption: "Le marché de Port Louis, dholl puri en main", by: "chloe", eventId: null },
  ];
  let photosOk = 0;
  for (const p of photoDefs) {
    try {
      const [full, thumb] = await Promise.all([
        fetch(`https://picsum.photos/seed/${p.seed}/640/480.jpg`).then((r) => r.arrayBuffer()),
        fetch(`https://picsum.photos/seed/${p.seed}/320/240.jpg`).then((r) => r.arrayBuffer()),
      ]);
      const photoId = uuid();
      const uploader = ids[p.by];
      const mainPath = `${uploader}/${photoId}.jpg`;
      const thumbPath = `${uploader}/${photoId}_thumb.jpg`;
      await admin.storage.from("photos").upload(mainPath, full, { contentType: "image/jpeg" });
      await admin.storage.from("photos").upload(thumbPath, thumb, { contentType: "image/jpeg" });
      const { error } = await admin.from("trip_photos").insert({
        id: photoId,
        trip_id: tripId,
        uploaded_by: uploader,
        storage_path: mainPath,
        thumb_path: thumbPath,
        size_bytes: full.byteLength,
        caption: p.caption,
        event_id: p.eventId,
      });
      if (!error) {
        photosOk++;
      }
    } catch {
      // réseau indisponible : la démo photos restera vide, non bloquant
    }
  }
  console.log(`✓ photos : ${photosOk}/${photoDefs.length} (basse qualité, décision O10)`);

  // ————— Brouillon d'import reçu "par email" (PHIL-P02) —————
  await admin.from("import_drafts").insert({
    trip_id: tripId,
    sender: "yves.dekerle@gmail.com",
    subject: "Fwd: Confirmation Blue Safari Submarine",
    extracted: {
      kind: "ACTIVITY",
      title: "Sous-marin Blue Safari — plongée à -35 m",
      startsAtLocal: "2026-11-18T14:00",
      endsAtLocal: "2026-11-18T16:00",
      timezone: "Indian/Mauritius",
      locationName: "Trou aux Biches",
      locationAddress: null,
      from: null,
      to: null,
      transportMode: null,
      carrier: "Blue Safari",
      bookingReference: "BS-77821",
      notes: "2 sous-marins réservés (10 places), diplôme remis à la fin.",
    },
  });
  console.log("✓ 1 réservation reçue par email, en attente de validation");

  // ————— Pays visités d'Yves (carte Explorateur) —————
  await admin.from("visited_countries").upsert(
    ["FRA", "ESP", "ITA", "PRT", "GRC", "MAR"].map((code) => ({
      user_id: yvesId,
      country_code: code,
    })),
  );
  console.log("✓ 6 pays visités pré-cochés sur ta mappemonde (modifiables d'un clic)");
}

main()
  .then(() => console.log("\n— Seed terminé —"))
  .catch((e) => {
    console.error("\n✗ Échec :", e.message);
    process.exit(1);
  });
