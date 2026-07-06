/**
 * Seed « Islande » (13 → 25 juin 2026) — voyage exemple complet d'Yves & Adélaïde,
 * repris du carnet de bord PDF (tmp/voyages/guide_islande.pdf).
 *
 * Peuple TOUTES les fonctionnalités : itinéraire jour par jour (vols, logements,
 * ~40 activités géolocalisées), budget EUR/ISK, valise, idées, fiche d'urgence.
 *
 * Usage : npx tsx scripts/seed-iceland.ts
 * Re-exécutable : purge le voyage « Islande » d'Yves puis le recrée.
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
import type { Database } from "../types/database";

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!BASE || !SVC) {
  console.error("Variables Supabase manquantes (.env.local).");
  process.exit(1);
}
const admin = createClient<Database>(BASE, SVC, { auth: { persistSession: false } });

const TRIP_NAME = "Islande";
const TZ = "Atlantic/Reykjavik"; // UTC±0 toute l'année
const TZ_PARIS = "Europe/Paris"; // UTC+2 en juin
const uuid = () => crypto.randomUUID();

/** Instant UTC depuis une heure locale Islande (UTC+0 → local = UTC). */
const isl = (date: string, time: string) => new Date(`${date}T${time}:00Z`).toISOString();
/** Instant UTC depuis une heure locale Paris en juin (UTC+2). */
const paris = (date: string, time: string) =>
  new Date(new Date(`${date}T${time}:00Z`).getTime() - 2 * 3600_000).toISOString();

async function main() {
  console.log("— Seed voyage exemple : Islande 2026 —\n");

  // ————— Yves (propriétaire) + Adélaïde (compagne de route) —————
  const { data: maurice } = await admin
    .from("trips")
    .select("created_by")
    .eq("name", "Maurice 2026")
    .single();
  const { data: allUsers } = await admin.auth.admin.listUsers();
  const yvesId =
    maurice?.created_by ?? allUsers.users.find((u) => u.email === "yves.dekerle@gmail.com")?.id;
  if (!yvesId) {
    throw new Error("Compte Yves introuvable (ni via Maurice 2026 ni via l'email).");
  }

  let adelaide = allUsers.users.find((u) => u.email === "adelaide@phil-demo.test");
  if (!adelaide) {
    const { data, error } = await admin.auth.admin.createUser({
      email: "adelaide@phil-demo.test",
      password: `demo-${uuid()}`,
      email_confirm: true,
      user_metadata: { display_name: "Adélaïde" },
    });
    if (error || !data.user) {
      throw new Error(`Création d'Adélaïde : ${error?.message}`);
    }
    adelaide = data.user;
    console.log("✓ compte créé : Adélaïde");
  }
  const adeId = adelaide.id;
  const ids: Record<string, string> = { yves: yvesId, adelaide: adeId };

  // ————— Purge d'un éventuel voyage « Islande » précédent —————
  const { data: existing } = await admin
    .from("trips")
    .select("id")
    .eq("name", TRIP_NAME)
    .eq("created_by", yvesId);
  for (const old of existing ?? []) {
    for (const table of [
      "emergency_sheets",
      "checklist_items",
      "expenses",
      "trip_ideas",
      "trip_events",
    ] as const) {
      await admin.from(table).delete().eq("trip_id", old.id);
    }
    await admin.from("trips").delete().eq("id", old.id);
  }

  // ————— Le voyage —————
  const tripId = uuid();
  const { error: tripErr } = await admin.from("trips").insert({
    id: tripId,
    name: TRIP_NAME,
    destination: "Islande",
    destination_lat: 64.9631,
    destination_lng: -19.0208,
    start_date: "2026-06-13",
    end_date: "2026-06-25",
    default_timezone: TZ,
    cover_image_url:
      "https://images.unsplash.com/photo-1504829857797-ddff29c27927?q=80&w=1600&auto=format",
    created_by: yvesId,
  });
  if (tripErr) {
    throw new Error(`Création du voyage : ${tripErr.message}`);
  }
  // Le trigger on_trip_created ajoute Yves en OWNER ; Adélaïde en EDITOR.
  await admin.from("trip_participants").upsert({ trip_id: tripId, user_id: adeId, role: "EDITOR" });
  await admin
    .from("trips")
    .update({ currency_primary: "EUR", currency_secondary: "ISK" })
    .eq("id", tripId);
  console.log("✓ voyage Islande créé — Yves (OWNER) + Adélaïde (EDITOR)\n");

  // ————— Événements : vols, logements, activités —————
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
  };

  const zodiacId = uuid();
  const glacierId = uuid();

  const events: Ev[] = [
    // — Vols —
    {
      type: "TRANSPORT",
      title: "Vol Transavia TO 7480 · Orly → Keflavík",
      starts: paris("2026-06-13", "22:45"),
      ends: isl("2026-06-14", "00:20"),
      tz: TZ_PARIS,
      loc: "Paris Orly Sud",
      notes:
        "Vol de nuit. Arriver à 21h15 max. Bagages cabine OK pour 13 jours. Transavia ne sert rien gratuitement.",
      meta: {
        transport_mode: "plane",
        from: "Paris Orly (ORY)",
        to: "Keflavík (KEF)",
        carrier: "Transavia",
        booking_reference: "D95L7S",
        external_url: "https://www.transavia.com",
      },
    },
    {
      type: "TRANSPORT",
      title: "Vol EasyJet EJU 4628 · Keflavík → Paris CDG",
      starts: isl("2026-06-25", "17:25"),
      ends: paris("2026-06-25", "22:55"),
      loc: "Aéroport de Keflavík (KEF)",
      notes: "Dépose-bagages 15h25 — 16h45 STRICT. Restitution du CR-V à Lotus avant 14h30.",
      meta: {
        transport_mode: "plane",
        from: "Keflavík (KEF)",
        to: "Paris CDG (T2D)",
        carrier: "EasyJet",
        booking_reference: "KCJD748",
        external_url: "https://www.easyjet.com",
      },
    },

    // — Logements (10 adresses, 12 nuits) —
    {
      type: "LODGING",
      title: "ODDSSON Midtown Hotel — Reykjavík",
      starts: isl("2026-06-14", "02:15"),
      ends: isl("2026-06-14", "09:00"),
      loc: "ODDSSON Midtown Hotel",
      addr: "Grensásvegur 18, 108 Reykjavík",
      lat: 64.1334,
      lng: -21.8919,
      notes:
        "Hôtel *** au cœur de Reykjavík. Réception 24/7 — prévenir de l'arrivée tardive (+354 419 0200). Réf. 5942727680.",
      meta: { platform: "booking", booking_reference: "5942727680", guests: 2 },
    },
    {
      type: "LODGING",
      title: "Móar Cottage — Akranes",
      starts: isl("2026-06-14", "18:45"),
      ends: isl("2026-06-15", "08:00"),
      loc: "Móar Cottage",
      addr: "Móar, route 51, Hvalfjörður",
      lat: 64.3208,
      lng: -22.0734,
      notes:
        "Cottage en bois sur le promontoire, vue Akrafjall. Code porte 6169. Dîner au Bónus d'Akranes.",
      meta: { platform: "airbnb", booking_reference: "6169", guests: 2 },
    },
    {
      type: "LODGING",
      title: "Staðarhóll Guesthouse — Mývatn",
      starts: isl("2026-06-15", "17:00"),
      ends: isl("2026-06-16", "08:15"),
      loc: "Staðarhóll Guesthouse",
      addr: "Grenjaðarstaður, route 853",
      lat: 65.7884,
      lng: -17.5267,
      notes: "Ferme familiale isolée. Code 2070. PAS DE WIFI — télécharger les cartes la veille.",
      meta: { platform: "booking", booking_reference: "2070", guests: 2 },
    },
    {
      type: "LODGING",
      title: "Skúlagarður Country Hotel — plateau nord",
      starts: isl("2026-06-16", "18:30"),
      ends: isl("2026-06-17", "08:00"),
      loc: "Skúlagarður Country Hotel",
      addr: "Garður, Kelduhverfi",
      lat: 66.0411,
      lng: -16.5358,
      notes: "Ancien internat reconverti. Restaurant sur place. Code 4718.",
      meta: { platform: "booking", booking_reference: "4718", guests: 2 },
    },
    {
      type: "LODGING",
      title: "Hjartarstaðir Guesthouse — fjords de l'Est",
      starts: isl("2026-06-17", "18:15"),
      ends: isl("2026-06-18", "08:00"),
      loc: "Hjartarstaðir Guesthouse",
      addr: "Hjartarstaðir, route 944 · 18 km nord d'Egilsstaðir",
      lat: 65.3525,
      lng: -14.4322,
      notes: "Maison de campagne avec hot pot extérieur. La vallée d'Eiðar. Code 7800.",
      meta: { platform: "booking", booking_reference: "7800", guests: 2 },
    },
    {
      type: "LODGING",
      title: "Lækjarhús Farm Holidays — Diamond Beach",
      starts: isl("2026-06-18", "19:30"),
      ends: isl("2026-06-19", "08:30"),
      loc: "Lækjarhús Farm Holidays",
      addr: "Borgarhöfn, route 1",
      lat: 64.2942,
      lng: -15.7919,
      notes:
        "Ferme face au glacier, idéale entre Zodiac et glacier hike. Code 2899. Check-in strict 16h–19h.",
      meta: { platform: "booking", booking_reference: "2899", guests: 2 },
    },
    {
      type: "LODGING",
      title: "Landbrot Guesthouse — Kirkjubæjarklaustur",
      starts: isl("2026-06-19", "18:30"),
      ends: isl("2026-06-20", "08:00"),
      loc: "Landbrot Guesthouse",
      addr: "Landbrot, route 204 · 8 km à l'ouest de Klaustur",
      lat: 63.7644,
      lng: -17.9952,
      notes:
        "Maison d'hôtes dans la lande noire du Skaftáreldahraun. Code 9827. Restaurant Systrakaffi.",
      meta: { platform: "booking", booking_reference: "9827", guests: 2 },
    },
    {
      type: "LODGING",
      title: "Hekla Cabin 3 — Volcano & Glacier View",
      starts: isl("2026-06-20", "18:15"),
      ends: isl("2026-06-21", "08:00"),
      loc: "Hekla Cabin 3",
      addr: "Hekla Cabin, route 26 · 15 min est de Hella",
      lat: 63.8847,
      lng: -20.4942,
      notes: "Cabane bois face au volcan Hekla. Code 0116. Solstice = magique.",
      meta: { platform: "airbnb", booking_reference: "0116", guests: 2 },
    },
    {
      type: "LODGING",
      title: "Úthlíð Cottages — Cercle d'Or",
      starts: isl("2026-06-21", "16:00"),
      ends: isl("2026-06-23", "08:30"),
      loc: "Úthlíð Cottages",
      addr: "Úthlíð, route 37 · Biskupstungur",
      lat: 64.2603,
      lng: -20.5572,
      notes:
        "Hub stratégique pour solstice et Kerlingarfjöll. Bains privatifs 24/24. Check-in sur place.",
      meta: { platform: "booking", booking_reference: "UTHLID", guests: 2 },
    },
    {
      type: "LODGING",
      title: "Ásólfsstaðir-Miðhóll — Þjórsárdalur",
      starts: isl("2026-06-23", "16:30"),
      ends: isl("2026-06-25", "08:00"),
      loc: "Ásólfsstaðir-Miðhóll",
      addr: "Ásólfsstaðir, route 32 · vallée de Þjórsá",
      lat: 64.1639,
      lng: -19.7194,
      notes: "Appartement 2 chambres. Base pour Háifoss/Gjáin et Landmannalaugar. Réglé via Agoda.",
      meta: { platform: "booking", booking_reference: "AGODA", guests: 2 },
    },

    // — J2 · Reykjavík & Seltún —
    {
      type: "ACTIVITY",
      title: "Hallgrímskirkja · beffroi · Harpa · Sun Voyager",
      starts: isl("2026-06-14", "09:30"),
      ends: isl("2026-06-14", "13:30"),
      loc: "Reykjavík",
      lat: 64.1417,
      lng: -21.9266,
      notes:
        "Montée au sommet du beffroi (1 200 ISK, vue 360°). Rue arc-en-ciel Skólavörðustígur, Harpa, Sun Voyager au bord de mer.",
      meta: { cost: 1200, cost_currency: "ISK" },
    },
    {
      type: "ACTIVITY",
      title: "Déjeuner — ROK Restaurant",
      starts: isl("2026-06-14", "13:30"),
      ends: isl("2026-06-14", "15:00"),
      loc: "ROK Restaurant, Reykjavík",
      addr: "Frakkastígur 26 A",
      lat: 64.142,
      lng: -21.9268,
      notes:
        "Face à Hallgrímskirkja. Petites assiettes à partager : agneau, morue, betterave fumée. ~50-70 € à deux.",
      meta: { cost: 60, cost_currency: "EUR" },
    },
    {
      type: "ACTIVITY",
      title: "Seltún — champs géothermaux & lacs sulfureux",
      starts: isl("2026-06-14", "15:30"),
      ends: isl("2026-06-14", "17:30"),
      loc: "Seltún · Krýsuvík",
      lat: 63.894,
      lng: -22.054,
      notes:
        "Boue qui bout, vapeurs jaune-soufre, passerelles en bois. Boucle 45 min. Parking 750 ISK.",
      meta: { cost: 750, cost_currency: "ISK" },
    },

    // — J3 · Vers le grand Nord —
    {
      type: "ACTIVITY",
      title: "Glaumbær — musée des fermes en tourbe",
      starts: isl("2026-06-15", "11:05"),
      ends: isl("2026-06-15", "12:30"),
      loc: "Glaumbær · Skagafjörður",
      lat: 65.596,
      lng: -19.498,
      notes: "Fermes recouvertes de gazon, visite 1h. Café au Áskaffi à côté. Parking 1 800 ISK.",
      meta: { cost: 1800, cost_currency: "ISK" },
    },
    {
      type: "ACTIVITY",
      title: "Akureyri — capitale du Nord",
      starts: isl("2026-06-15", "13:30"),
      ends: isl("2026-06-15", "14:30"),
      loc: "Akureyri",
      lat: 65.6835,
      lng: -18.0878,
      notes:
        "Déjeuner sandwich rapide. Brynja pour une glace, Bláa Kannan pour un café. Disque 90 min gratuit.",
    },
    {
      type: "ACTIVITY",
      title: "Goðafoss — la cascade des dieux",
      starts: isl("2026-06-15", "15:30"),
      ends: isl("2026-06-15", "16:30"),
      loc: "Goðafoss",
      lat: 65.6828,
      lng: -17.55,
      notes:
        "Au Xe siècle, le chef païen Þorgeir y jeta les statues des anciens dieux après la christianisation. Gratuit, WC.",
    },

    // — J4 · Mývatn —
    {
      type: "ACTIVITY",
      title: "Pseudo-cratères Skútustaðir + Dimmuborgir",
      starts: isl("2026-06-16", "08:50"),
      ends: isl("2026-06-16", "11:30"),
      loc: "Skútustaðir · Dimmuborgir",
      lat: 65.5906,
      lng: -16.911,
      notes:
        "Boucle 1h autour des faux cratères, puis sentier Kirkjuhringur 45 min à travers les « châteaux noirs » de lave figée. Gratuit.",
    },
    {
      type: "ACTIVITY",
      title: "Hverfjall — cône volcanique",
      starts: isl("2026-06-16", "12:00"),
      ends: isl("2026-06-16", "13:30"),
      loc: "Hverfjall",
      lat: 65.6017,
      lng: -16.8747,
      notes:
        "Ascension 40 min, panorama 360° sur Mývatn. Déjeuner sandwich au sommet. Parking 1 000 ISK.",
      meta: { cost: 1000, cost_currency: "ISK" },
    },
    {
      type: "ACTIVITY",
      title: "Hverir · champ de soufre + belvédère Víti",
      starts: isl("2026-06-16", "13:45"),
      ends: isl("2026-06-16", "15:30"),
      loc: "Hverir + Krafla",
      lat: 65.6407,
      lng: -16.809,
      notes:
        "Hverir : marmites de boue. Krafla : vue sur le cratère Víti turquoise (320 m). Parkings 1 200 + 800 ISK.",
      meta: { cost: 2000, cost_currency: "ISK" },
    },
    {
      type: "ACTIVITY",
      title: "GeoSea Húsavík — bains marins géothermiques",
      starts: isl("2026-06-16", "16:30"),
      ends: isl("2026-06-16", "18:30"),
      loc: "GeoSea · Húsavík",
      lat: 66.049,
      lng: -17.338,
      notes:
        "Eau de mer chauffée, vue sur Skjálfandi — possibles baleines depuis le bain. Puis dîner à Skúlagarður.",
      meta: { cost: 12400, cost_currency: "ISK" },
    },

    // — J5 · Force brute —
    {
      type: "ACTIVITY",
      title: "Dettifoss — la plus puissante d'Europe",
      starts: isl("2026-06-17", "08:30"),
      ends: isl("2026-06-17", "10:00"),
      loc: "Dettifoss — rive ouest (route 862)",
      lat: 65.8145,
      lng: -16.385,
      notes:
        "193 m³/s qui s'écrasent 44 m plus bas. Rive ouest = route bitume, point de vue plus net. Gratuit.",
    },
    {
      type: "ACTIVITY",
      title: "Stuðlagil — canyon de basalte turquoise",
      starts: isl("2026-06-17", "11:40"),
      ends: isl("2026-06-17", "13:30"),
      loc: "Stuðlagil · route 923",
      lat: 65.109,
      lng: -15.326,
      notes:
        "30 min de marche depuis le parking est. Orgues basaltiques verticales — révélé en 2009 par la baisse du barrage Kárahnjúkar. Parking 1 000 ISK.",
      meta: { cost: 1000, cost_currency: "ISK" },
    },
    {
      type: "ACTIVITY",
      title: "Hengifoss — 118 m de chute, strates rouges",
      starts: isl("2026-06-17", "14:50"),
      ends: isl("2026-06-17", "17:30"),
      loc: "Hengifoss · Lagarfljót",
      lat: 65.077,
      lng: -14.885,
      notes:
        "2h30 aller-retour, dénivelé 250 m. Couches d'argile rouge entre les strates basaltiques. Parking 1 000 ISK.",
      meta: { cost: 1000, cost_currency: "ISK" },
    },

    // — J6 · Côte est & glaciers —
    {
      type: "ACTIVITY",
      title: "Stokksnes · Vestrahorn — sable noir & pic dentelé",
      starts: isl("2026-06-18", "11:00"),
      ends: isl("2026-06-18", "13:00"),
      loc: "Stokksnes · Vestrahorn",
      lat: 64.247,
      lng: -14.967,
      notes:
        "Péage 1 200 ISK au Viking Café — 4×4 conseillé sur les derniers mètres. Marée basse = miroir géant sous le Vestrahorn.",
      meta: { cost: 1200, cost_currency: "ISK" },
    },
    {
      type: "ACTIVITY",
      title: "Diamond Beach + Fjallsárlón",
      starts: isl("2026-06-18", "14:15"),
      ends: isl("2026-06-18", "17:30"),
      loc: "Diamond Beach · Fjallsárlón",
      lat: 64.044,
      lng: -16.176,
      notes:
        "Blocs de glace détachés du glacier sur le sable noir. Préférer le parking côté est (gratuit). Puis Fjallsárlón, lagune plus intime, vue sur le Fjallsjökull.",
    },
    {
      id: zodiacId,
      type: "ACTIVITY",
      title: "Zodiac · Jökulsárlón",
      starts: isl("2026-06-18", "18:10"),
      ends: isl("2026-06-18", "19:25"),
      loc: "Zodiac Tour Jökulsárlón",
      lat: 64.0784,
      lng: -16.2306,
      notes:
        "45 min entre les icebergs millénaires du Vatnajökull. Check-in 18h max au Ice Lagoon Truck (grand parking est). Combinaison + gilet fournis. Réf ICE-T127042699. icelagoon.com",
      meta: { cost: 263.23, cost_currency: "EUR", booking_reference: "ICE-T127042699" },
    },

    // — J7 · Sur le glacier —
    {
      type: "ACTIVITY",
      title: "Múlagljúfur — le canyon secret du Vatnajökull",
      starts: isl("2026-06-19", "09:05"),
      ends: isl("2026-06-19", "11:30"),
      loc: "Múlagljúfur Canyon",
      lat: 63.968,
      lng: -16.42,
      notes:
        "Trail peu connu (2h A/R) qui s'ouvre sur un canyon spectaculaire avec cascade et arche basaltique. Sentier raide — bonnes chaussures. Piste 2 km, parking 1 000 ISK.",
      meta: { cost: 1000, cost_currency: "ISK" },
    },
    {
      id: glacierId,
      type: "ACTIVITY",
      title: "Glacier Discovery · Skaftafell (Falljökull)",
      starts: isl("2026-06-19", "13:15"),
      ends: isl("2026-06-19", "17:00"),
      loc: "Glacier Discovery · Skaftafell",
      addr: "RDV Freysnes Orkan / Shell",
      lat: 63.990591,
      lng: -16.896465,
      notes:
        "3h30 de marche guidée sur la langue glaciaire du Falljökull. Crevasses, moulins, séracs. Crampons + casque + piolet + chaussures fournis. 13h15 IMPÉRATIVE. Réf LGV-T127049569 · +354 894-1317.",
      meta: { cost: 325.9, cost_currency: "EUR", booking_reference: "LGV-T127049569" },
    },

    // — J8 · Côte sud —
    {
      type: "ACTIVITY",
      title: "Fjaðrárgljúfur — canyon palmaresque",
      starts: isl("2026-06-20", "08:15"),
      ends: isl("2026-06-20", "09:15"),
      loc: "Fjaðrárgljúfur",
      lat: 63.771,
      lng: -18.172,
      notes:
        "100 m de profondeur. Sentier en crête 45 min A/R. Arriver tôt pour le site désert. Parking 1 000 ISK.",
      meta: { cost: 1000, cost_currency: "ISK" },
    },
    {
      type: "ACTIVITY",
      title: "Vík + Hálsanefshellir — grotte basaltique",
      starts: isl("2026-06-20", "10:15"),
      ends: isl("2026-06-20", "12:00"),
      loc: "Vík · Reynisfjara",
      lat: 63.403,
      lng: -19.044,
      notes:
        "Pause au café Skool Beans à Vík, puis grotte aux orgues basaltiques à l'ouest de Reynisfjara. ⚠️ sneaker waves. Parking 1 000 ISK.",
      meta: { cost: 1000, cost_currency: "ISK" },
    },
    {
      type: "ACTIVITY",
      title: "Dyrhólaey + Skógafoss — arche, macareux, cascade",
      starts: isl("2026-06-20", "12:20"),
      ends: isl("2026-06-20", "15:30"),
      loc: "Dyrhólaey · Skógafoss",
      lat: 63.532,
      lng: -19.511,
      notes:
        "Dyrhólaey : phare, arche, falaises, macareux (jumelles utiles). Puis Skógafoss — 60 m, 527 marches pour la vue plongeante. Parkings 750 + 1 000 ISK.",
      meta: { cost: 1750, cost_currency: "ISK" },
    },
    {
      type: "ACTIVITY",
      title: "Seljalandsfoss — qu'on traverse par derrière",
      starts: isl("2026-06-20", "16:00"),
      ends: isl("2026-06-20", "18:15"),
      loc: "Seljalandsfoss",
      lat: 63.6156,
      lng: -19.9886,
      notes:
        "On passe derrière la chute (poncho). Crochet par Gljúfrabúi si le temps le permet. Parking 1 000 ISK.",
      meta: { cost: 1000, cost_currency: "ISK" },
    },

    // — J9 · Cercle d'Or · solstice —
    {
      type: "ACTIVITY",
      title: "Þingvellir — faille tectonique & berceau du parlement",
      starts: isl("2026-06-21", "09:20"),
      ends: isl("2026-06-21", "11:30"),
      loc: "Þingvellir",
      lat: 64.2559,
      lng: -21.13,
      notes:
        "Plaques Amérique et Eurasie s'écartent de 2 cm/an. Ancien Alþingi (930), site UNESCO. Boucle 1h30 — gorge Almannagjá, chute Öxarárfoss, faille Silfra. Parking 1 000 ISK.",
      meta: { cost: 1000, cost_currency: "ISK" },
    },
    {
      type: "ACTIVITY",
      title: "Gullfoss — la double chute en escalier · 32 m",
      starts: isl("2026-06-21", "12:20"),
      ends: isl("2026-06-21", "14:00"),
      loc: "Gullfoss",
      lat: 64.3271,
      lng: -20.1199,
      notes:
        "Deux belvédères : le haut pour le panorama, le bas pour les embruns. Plokkfiskur au Gullfoss Kaffi. Gratuit, WC. Photo nocturne au solstice vers 23h30.",
    },
    {
      type: "ACTIVITY",
      title: "Geysir — Strokkur, ponctuel toutes les 6–8 min",
      starts: isl("2026-06-21", "14:15"),
      ends: isl("2026-06-21", "15:45"),
      loc: "Geysir · Strokkur",
      lat: 64.3104,
      lng: -20.3024,
      notes:
        "Strokkur souffle 20-30 m. Position : à 3 m du bassin côté ouest, vent dans le dos. Parking 1 000 ISK.",
      meta: { cost: 1000, cost_currency: "ISK" },
    },

    // — J10 · Kerlingarfjöll · Highlands —
    {
      type: "ACTIVITY",
      title: "Boucle Hveradalshnúkur · Kerlingarfjöll",
      starts: isl("2026-06-22", "11:00"),
      ends: isl("2026-06-22", "15:00"),
      loc: "Hveradalir · Kerlingarfjöll",
      lat: 64.638,
      lng: -19.339,
      notes:
        "F35 + F347 (4×4 obligatoire, vérifier road.is le matin). Boucle 7 km, 3h, +400 m : crête au-dessus de la « vallée des marmites », rhyolites orange & ocre. Pique-nique au sommet. Parking 1 000 ISK.",
      meta: {
        cost: 1000,
        cost_currency: "ISK",
        external_url:
          "https://www.alltrails.com/trail/iceland/southern/kerlingarfjoll-hveradalir-via-hveradalshnukur",
      },
    },

    // — J11 · Kerið · Háifoss · Gjáin —
    {
      type: "ACTIVITY",
      title: "Kerið — cratère volcanique au lac turquoise",
      starts: isl("2026-06-23", "09:05"),
      ends: isl("2026-06-23", "10:00"),
      loc: "Kerið Crater",
      lat: 64.041,
      lng: -20.885,
      notes:
        "Boucle facile autour du cratère (30 min) + descente jusqu'au lac. Roche rouge contrastant avec l'eau turquoise. 700 ISK/pers.",
      meta: { cost: 1400, cost_currency: "ISK" },
    },
    {
      type: "ACTIVITY",
      title: "Háifoss — 122 m de chute, à deux pas du vide",
      starts: isl("2026-06-23", "11:30"),
      ends: isl("2026-06-23", "13:30"),
      loc: "Háifoss · Granni",
      lat: 64.213,
      lng: -19.689,
      notes:
        "Approche par la route 32 puis piste 332 (cabossée mais OK en CR-V à 30 km/h). Sentier court 15 min sur l'arête est. Granni, sa voisine, tombe juste à côté. Pique-nique. Gratuit, 4×4.",
    },
    {
      type: "ACTIVITY",
      title: "Gjáin — cascades multiples dans la mousse",
      starts: isl("2026-06-23", "14:15"),
      ends: isl("2026-06-23", "16:00"),
      loc: "Gjáin",
      lat: 64.187,
      lng: -19.654,
      notes:
        "Petit canyon avec sept cascades, rivière qui serpente entre les blocs basaltiques. On y descend en 5 min. Piste 327. Gratuit.",
    },

    // — J12 · Landmannalaugar · Bláhnúkur —
    {
      type: "ACTIVITY",
      title: "Boucle Bláhnúkur · Brennisteinsalda — la montagne bleue",
      starts: isl("2026-06-24", "10:30"),
      ends: isl("2026-06-24", "15:30"),
      loc: "Landmannalaugar",
      lat: 63.984,
      lng: -19.061,
      notes:
        "Approche par le NORD (F26 → F208 N, pas de gué dangereux). Boucle 8,5 km, +500 m, difficulté ★★. Bláhnúkur (945 m), Brennisteinsalda (rhyolite multicolore), champ de lave Laugahraun. Vérifier la météo.",
      meta: {
        external_url:
          "https://www.alltrails.com/trail/iceland/southern/landmannalaugar-blahnukur-brennisteinsalda",
      },
    },
    {
      type: "ACTIVITY",
      title: "Bain géothermique naturel · Landmannalaugar",
      starts: isl("2026-06-24", "15:30"),
      ends: isl("2026-06-24", "16:30"),
      loc: "Sources chaudes de Landmannalaugar",
      lat: 63.9855,
      lng: -19.064,
      notes:
        "Source à côté du camp — bain dans la rivière chaude (35-40 °C) après 5h de marche. Maillot + sandales obligatoires (passage sur passerelle de bois).",
    },

    // — J13 · Blue Lagoon · dernier souffle —
    {
      type: "ACTIVITY",
      title: "Blue Lagoon — bains laiteux silice",
      starts: isl("2026-06-25", "10:00"),
      ends: isl("2026-06-25", "12:30"),
      loc: "Blue Lagoon · Grindavík",
      lat: 63.8804,
      lng: -22.4495,
      notes:
        "Session pré-réservée. Eau silicate à 38 °C, masque silice inclus. 2h30 de pause bien méritée avant le vol. Vestiaires, douches, casiers fournis.",
      meta: { cost: 300, cost_currency: "EUR" },
    },
    {
      type: "ACTIVITY",
      title: "Hjá Höllu — café cosy, dernier vrai repas chaud",
      starts: isl("2026-06-25", "12:45"),
      ends: isl("2026-06-25", "13:45"),
      loc: "Hjá Höllu · Grindavík",
      addr: "Víkurbraut 62, 240 Grindavík",
      lat: 63.833,
      lng: -22.437,
      notes:
        "Café végétarien à 5 min du Blue Lagoon. Soupes maison, salades généreuses, gâteaux locaux. Bien plus tranquille que le terminal.",
    },
  ];

  for (const e of events) {
    const id = e.id ?? uuid();
    const { error } = await admin.from("trip_events").insert({
      id,
      trip_id: tripId,
      type: e.type,
      title: e.title,
      starts_at: e.starts,
      ends_at: e.ends ?? null,
      timezone: e.tz ?? TZ,
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
  }
  console.log(
    `✓ ${events.length} événements (2 vols, 10 logements, ${events.length - 12} activités)`,
  );

  // ————— Budget : EUR (primaire) + ISK (secondaire), partagé à deux —————
  const both = ["yves", "adelaide"];
  const addExpense = async (e: {
    title: string;
    amount: number;
    currency?: string;
    paidBy?: string;
    category: string;
    spentOn: string;
    eventId?: string;
  }) => {
    const id = uuid();
    const { error } = await admin.from("expenses").insert({
      id,
      trip_id: tripId,
      title: e.title,
      amount: e.amount,
      currency: e.currency ?? "EUR",
      paid_by: ids[e.paidBy ?? "yves"],
      category: e.category,
      spent_on: e.spentOn,
      event_id: e.eventId ?? null,
      is_settlement: false,
      created_by: ids[e.paidBy ?? "yves"],
    });
    if (error) {
      throw new Error(`Dépense "${e.title}" : ${error.message}`);
    }
    await admin
      .from("expense_beneficiaries")
      .insert(both.map((k) => ({ expense_id: id, user_id: ids[k] })));
  };

  // Transports
  await addExpense({
    title: "Vol Transavia TO 7480 · Orly → KEF",
    amount: 477,
    category: "transport",
    spentOn: "2026-04-02",
  });
  await addExpense({
    title: "Vol Transavia — frais de changement",
    amount: 240,
    category: "transport",
    spentOn: "2026-05-10",
  });
  await addExpense({
    title: "Vol EasyJet EJU 4628 · KEF → CDG",
    amount: 246.69,
    category: "transport",
    paidBy: "adelaide",
    spentOn: "2026-04-02",
  });
  await addExpense({
    title: "Voiture Honda CR-V — Lotus (12 j)",
    amount: 2000,
    category: "transport",
    spentOn: "2026-06-14",
  });
  // Logements
  await addExpense({
    title: "Reykjavík — ODDSSON Midtown",
    amount: 177.04,
    category: "logement",
    spentOn: "2026-03-01",
  });
  await addExpense({
    title: "Akranes — Móar Cottage",
    amount: 103.7,
    category: "logement",
    paidBy: "adelaide",
    spentOn: "2026-03-01",
  });
  await addExpense({
    title: "Mývatn — Staðarhóll Guesthouse",
    amount: 103.68,
    category: "logement",
    spentOn: "2026-03-01",
  });
  await addExpense({
    title: "Garður — Skúlagarður Country Hotel",
    amount: 166.46,
    category: "logement",
    spentOn: "2026-03-01",
  });
  await addExpense({
    title: "Eiðar — Hjartarstaðir Guesthouse",
    amount: 222.22,
    category: "logement",
    paidBy: "adelaide",
    spentOn: "2026-03-01",
  });
  await addExpense({
    title: "Borgarhöfn — Lækjarhús Farm",
    amount: 296.51,
    category: "logement",
    spentOn: "2026-03-01",
  });
  await addExpense({
    title: "Klaustur — Landbrot Guesthouse",
    amount: 261.36,
    category: "logement",
    spentOn: "2026-03-01",
  });
  await addExpense({
    title: "Hella — Hekla Cabin 3",
    amount: 200,
    category: "logement",
    paidBy: "adelaide",
    spentOn: "2026-03-01",
  });
  await addExpense({
    title: "Cercle d'Or — Úthlíð Cottages (2 n.)",
    amount: 421,
    category: "logement",
    spentOn: "2026-03-01",
  });
  await addExpense({
    title: "Þjórsárdalur — Ásólfsstaðir-Miðhóll (2 n.)",
    amount: 500,
    category: "logement",
    spentOn: "2026-03-01",
  });
  // Activités & excursions
  await addExpense({
    title: "Zodiac Jökulsárlón",
    amount: 263.23,
    category: "activite",
    spentOn: "2026-05-02",
    eventId: zodiacId,
  });
  await addExpense({
    title: "Glacier Discovery Skaftafell",
    amount: 325.9,
    category: "activite",
    paidBy: "adelaide",
    spentOn: "2026-05-02",
    eventId: glacierId,
  });
  await addExpense({
    title: "Blue Lagoon (2 entrées)",
    amount: 300,
    category: "activite",
    spentOn: "2026-05-05",
  });
  await addExpense({
    title: "GeoSea Húsavík — bains marins (2 pax)",
    amount: 100,
    category: "activite",
    spentOn: "2026-06-16",
  });
  await addExpense({
    title: "Kerið — entrée cratère (2 pax)",
    amount: 9.75,
    category: "activite",
    spentOn: "2026-06-23",
  });
  // Vie sur place (essence & courses en ISK pour le double affichage)
  await addExpense({
    title: "Essence (Orkan / N1 / KEF)",
    amount: 42210,
    currency: "ISK",
    category: "transport",
    spentOn: "2026-06-20",
  });
  await addExpense({
    title: "Courses (Bónus, Krónan, Krambúðin…)",
    amount: 65194,
    currency: "ISK",
    paidBy: "adelaide",
    category: "courses",
    spentOn: "2026-06-17",
  });
  await addExpense({
    title: "Restaurants & cafés",
    amount: 470,
    category: "resto",
    spentOn: "2026-06-19",
  });
  await addExpense({
    title: "Parkings (Parka, EasyPark, Bílastæði)",
    amount: 110,
    category: "autre",
    spentOn: "2026-06-22",
  });
  console.log("✓ budget : 23 dépenses (EUR + ISK, 5 catégories) — total ≈ 7 742 €");

  // ————— Valise (checklist Yves & Adélaïde) —————
  await admin.from("checklist_items").insert([
    // Avant le départ — papiers
    {
      trip_id: tripId,
      section: "avant_depart",
      title: "Cartes d'identité en cours de validité",
      done: true,
      assigned_to: yvesId,
      created_by: yvesId,
    },
    {
      trip_id: tripId,
      section: "avant_depart",
      title: "Permis de conduire (F-roads = 4×4)",
      done: true,
      assigned_to: yvesId,
      created_by: yvesId,
    },
    {
      trip_id: tripId,
      section: "avant_depart",
      title: "Réservations imprimées (vols, voiture, logements)",
      assigned_to: adeId,
      created_by: yvesId,
    },
    {
      trip_id: tripId,
      section: "avant_depart",
      title: "Email confirmation Zodiac + Glacier Discovery",
      done: true,
      assigned_to: yvesId,
      created_by: yvesId,
    },
    {
      trip_id: tripId,
      section: "avant_depart",
      title: "Confirmer assurance GRAVEL + SABLE (Lotus)",
      assigned_to: yvesId,
      created_by: yvesId,
    },
    // À emporter
    {
      trip_id: tripId,
      section: "a_emporter",
      title: "Masque de nuit opaque — soleil de minuit",
      done: true,
      assigned_to: adeId,
      created_by: adeId,
    },
    {
      trip_id: tripId,
      section: "a_emporter",
      title: "Hardshell imperméable Gore-Tex",
      assigned_to: yvesId,
      created_by: yvesId,
    },
    {
      trip_id: tripId,
      section: "a_emporter",
      title: "T-shirts mérinos (manches longues + courtes)",
      assigned_to: adeId,
      created_by: adeId,
    },
    {
      trip_id: tripId,
      section: "a_emporter",
      title: "Chaussures de rando imperméables tige haute",
      assigned_to: yvesId,
      created_by: yvesId,
    },
    {
      trip_id: tripId,
      section: "a_emporter",
      title: "Sandales légères (gué de Landmannalaugar)",
      assigned_to: adeId,
      created_by: yvesId,
    },
    {
      trip_id: tripId,
      section: "a_emporter",
      title: "Maillot de bain (hot pots & bains géothermiques)",
      done: true,
      assigned_to: yvesId,
      created_by: adeId,
    },
    {
      trip_id: tripId,
      section: "a_emporter",
      title: "Power bank 10 000 mAh + câbles",
      assigned_to: yvesId,
      created_by: yvesId,
    },
    {
      trip_id: tripId,
      section: "a_emporter",
      title: "Appareil photo + 2 batteries + carte SD 64 Go",
      assigned_to: adeId,
      created_by: adeId,
    },
    {
      trip_id: tripId,
      section: "a_emporter",
      title: "Crème solaire SPF 50 + stick lèvres",
      assigned_to: adeId,
      created_by: adeId,
    },
    // Sur place
    {
      trip_id: tripId,
      section: "sur_place",
      title: "Télécharger cartes Google Maps offline (Highlands)",
      done: true,
      assigned_to: yvesId,
      created_by: yvesId,
    },
    {
      trip_id: tripId,
      section: "sur_place",
      title: "Faire le plein avant les F-roads (pas de station après F35)",
      assigned_to: yvesId,
      created_by: yvesId,
    },
    {
      trip_id: tripId,
      section: "sur_place",
      title: "Vérifier road.is chaque matin (état des pistes)",
      assigned_to: adeId,
      created_by: yvesId,
    },
  ]);
  console.log("✓ valise : 17 items (papiers, à-emporter, sur place)");

  // ————— Idées (Plans B & pépites du guide) —————
  const ideas = [
    {
      title: "Reykjadalur — rivière chaude (1h de marche)",
      description:
        "Vallée fumante au-dessus de Hveragerði : on se baigne dans une rivière naturellement chaude. Plan B si le F35 vers Kerlingarfjöll est fermé.",
      loc: "Hveragerði",
      lat: 64.019,
      lng: -21.203,
      tags: ["bain", "rando", "gratuit"],
      votes: ["yves", "adelaide"],
    },
    {
      title: "Seljavallalaug — piscine 1923 sous l'Eyjafjallajökull",
      description:
        "Une des plus vieilles piscines d'Islande, cachée dans une vallée près de Skógar. Eau tiède, ambiance hors du temps.",
      loc: "Près de Skógar",
      lat: 63.5665,
      lng: -19.6094,
      tags: ["bain", "pépite"],
      votes: ["adelaide"],
    },
    {
      title: "Fríðheimar — dîner sous serre à tomates",
      description:
        "Restaurant dans une serre géothermique (route 35) : soupe de tomates à volonté, pâtes fraîches. Sur la route du Cercle d'Or.",
      loc: "Reykholt",
      lat: 64.1667,
      lng: -20.2333,
      tags: ["gastronomie"],
      votes: ["yves", "adelaide"],
    },
    {
      title: "Þórsmörk via F249 — vallée entre trois glaciers",
      description:
        "Plan B si Landmannalaugar (F26/F208) est impraticable. Rando du Valahnúkur, panorama sur Eyjafjallajökull et Mýrdalsjökull.",
      loc: "Þórsmörk",
      lat: 63.6833,
      lng: -19.5167,
      tags: ["rando", "plan B"],
      votes: ["yves"],
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
  console.log(`✓ ${ideas.length} idées (Plans B & pépites) avec votes`);

  // ————— Fiche d'urgence (Yves) —————
  await admin.from("emergency_sheets").insert({
    trip_id: tripId,
    user_id: yvesId,
    emergency_contacts: "Marie Dekerle (sœur) — +33 6 98 76 54 32",
    insurance_policy: "Visa Premier n° VP-2298-441",
    insurance_phone: "+33 1 42 99 82 81 (assisteur 24/7)",
    blood_group: "O+",
    allergies: null,
    notes:
      "Urgences Islande : 112 · SafeTravel +354 570 5900 · Lotus Car Rental +354 580 4060 · Ambassade de France à Reykjavík +354 575 9600. Ne jamais traverser un gué seul.",
  });
  console.log("✓ fiche d'urgence : Yves\n");

  console.log("✅ Voyage « Islande » complet — ouvre l'app pour le voir.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
