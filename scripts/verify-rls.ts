/**
 * PHIL-B12 — Vérification manuelle des politiques RLS.
 *
 * Simule deux utilisateurs jetables et vérifie les règles de partage critiques
 * de CLAUDE.md sur trips, trip_participants, trip_events, documents et
 * document_shares. Les users et données de test sont supprimés à la fin.
 *
 * Usage :
 *   npm run verify:rls        (ou npx tsx scripts/verify-rls.ts)
 *
 * À lancer obligatoirement après toute migration touchant aux politiques RLS,
 * et avant tout déploiement d'une évolution du modèle documents/partage.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

for (const line of readFileSync(join(process.cwd(), ".env.local"), "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i > 0 && !process.env[line.slice(0, i)]) {
    process.env[line.slice(0, i)] = line.slice(i + 1);
  }
}

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!BASE || !SVC || !ANON) {
  console.error("Variables Supabase manquantes (.env.local).");
  process.exit(1);
}

const PASSWORD = "verify-rls-Phil!42";
const admin = { apikey: SVC, Authorization: `Bearer ${SVC}`, "Content-Type": "application/json" };

let failures = 0;
let total = 0;

function check(label: string, ok: boolean): void {
  total++;
  console.log(`${ok ? "  ✓" : "  ✗ ÉCHEC"} ${label}`);
  if (!ok) failures++;
}

function section(title: string): void {
  console.log(`\n— ${title}`);
}

async function createUser(email: string): Promise<string> {
  const r = await fetch(`${BASE}/auth/v1/admin/users`, {
    method: "POST",
    headers: admin,
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true }),
  });
  const j = (await r.json()) as { id?: string };
  if (!r.ok || !j.id) throw new Error(`createUser ${email}: ${JSON.stringify(j)}`);
  return j.id;
}

async function deleteUser(id: string): Promise<void> {
  await fetch(`${BASE}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: admin });
}

async function signIn(email: string): Promise<string> {
  const r = await fetch(`${BASE}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON as string, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const j = (await r.json()) as { access_token?: string };
  if (!j.access_token) throw new Error(`signIn ${email}`);
  return j.access_token;
}

function as(jwt: string): Record<string, string> {
  return {
    apikey: ANON as string,
    Authorization: `Bearer ${jwt}`,
    "Content-Type": "application/json",
  };
}

async function rows(path: string, jwt: string): Promise<unknown[]> {
  const r = await fetch(`${BASE}/rest/v1/${path}`, { headers: as(jwt) });
  return (await r.json()) as unknown[];
}

async function main(): Promise<void> {
  console.log("Vérification RLS — création des users de test…");
  const idA = await createUser("verify-rls-a@phil-app.test");
  const idB = await createUser("verify-rls-b@phil-app.test");
  const jwtA = await signIn("verify-rls-a@phil-app.test");
  const jwtB = await signIn("verify-rls-b@phil-app.test");

  try {
    // ================= trips & trip_participants =================
    section("Voyages et participants (B09)");

    const tripX = crypto.randomUUID(); // voyage de A (B sera invité)
    const tripY = crypto.randomUUID(); // second voyage de A (B jamais invité)

    let r = await fetch(`${BASE}/rest/v1/trips`, {
      method: "POST",
      headers: { ...as(jwtA), Prefer: "return=minimal" },
      body: JSON.stringify([
        {
          id: tripX,
          name: "X",
          destination: "D",
          start_date: "2026-08-01",
          end_date: "2026-08-02",
          created_by: idA,
        },
        {
          id: tripY,
          name: "Y",
          destination: "D",
          start_date: "2026-09-01",
          end_date: "2026-09-02",
          created_by: idA,
        },
      ]),
    });
    check("A crée deux voyages (insert + trigger OWNER)", r.status === 201);

    r = await fetch(`${BASE}/rest/v1/trips`, {
      method: "POST",
      headers: as(jwtA),
      body: JSON.stringify({
        name: "Z",
        destination: "D",
        start_date: "2026-08-01",
        end_date: "2026-08-02",
        created_by: idB,
      }),
    });
    check("A ne peut pas créer un voyage au nom de B", r.status === 401 || r.status === 403);

    check("B ne voit aucun voyage", (await rows("trips?select=id", jwtB)).length === 0);

    r = await fetch(`${BASE}/rest/v1/trip_participants`, {
      method: "POST",
      headers: as(jwtB),
      body: JSON.stringify({ trip_id: tripX, user_id: idB, role: "OWNER" }),
    });
    check("B ne peut pas s'auto-inviter", r.status === 401 || r.status === 403);

    r = await fetch(`${BASE}/rest/v1/trip_participants`, {
      method: "POST",
      headers: as(jwtA),
      body: JSON.stringify({ trip_id: tripX, user_id: idB, role: "VIEWER" }),
    });
    check("A (OWNER) invite B en VIEWER sur X", r.status === 201);

    check(
      "Cas critique 2 : B invité sur X ne voit pas Y",
      (await rows("trips?select=id", jwtB)).length === 1,
    );

    r = await fetch(`${BASE}/rest/v1/trips?id=eq.${tripX}`, {
      method: "PATCH",
      headers: { ...as(jwtB), Prefer: "return=representation" },
      body: JSON.stringify({ name: "PIRATE" }),
    });
    check("B (VIEWER) ne peut pas modifier X", ((await r.json()) as unknown[]).length === 0);

    r = await fetch(`${BASE}/rest/v1/trips?id=eq.${tripX}`, {
      method: "DELETE",
      headers: { ...as(jwtB), Prefer: "return=representation" },
    });
    check("B (VIEWER) ne peut pas supprimer X", ((await r.json()) as unknown[]).length === 0);

    // ================= trip_events =================
    section("Événements (B11)");

    const eventA = crypto.randomUUID();
    r = await fetch(`${BASE}/rest/v1/trip_events`, {
      method: "POST",
      headers: { ...as(jwtA), Prefer: "return=minimal" },
      body: JSON.stringify({
        id: eventA,
        trip_id: tripX,
        type: "ACTIVITY",
        title: "Plongée",
        starts_at: "2026-08-01T09:00:00Z",
        timezone: "Indian/Mauritius",
        created_by: idA,
      }),
    });
    check("A (OWNER) crée un événement", r.status === 201);

    check("B (VIEWER) voit l'événement", (await rows("trip_events?select=id", jwtB)).length === 1);

    r = await fetch(`${BASE}/rest/v1/trip_events`, {
      method: "POST",
      headers: as(jwtB),
      body: JSON.stringify({
        trip_id: tripX,
        type: "ACTIVITY",
        title: "P",
        starts_at: "2026-08-01T10:00:00Z",
        timezone: "UTC",
        created_by: idB,
      }),
    });
    check("B (VIEWER) ne peut pas créer d'événement", r.status === 401 || r.status === 403);

    await fetch(`${BASE}/rest/v1/trip_participants?trip_id=eq.${tripX}&user_id=eq.${idB}`, {
      method: "PATCH",
      headers: as(jwtA),
      body: JSON.stringify({ role: "EDITOR" }),
    });

    const eventB = crypto.randomUUID();
    r = await fetch(`${BASE}/rest/v1/trip_events`, {
      method: "POST",
      headers: { ...as(jwtB), Prefer: "return=minimal" },
      body: JSON.stringify({
        id: eventB,
        trip_id: tripX,
        type: "LODGING",
        title: "Hôtel",
        starts_at: "2026-08-01T14:00:00Z",
        timezone: "UTC",
        created_by: idB,
      }),
    });
    check("B (EDITOR) crée un événement", r.status === 201);

    r = await fetch(`${BASE}/rest/v1/trip_events?id=eq.${eventA}`, {
      method: "DELETE",
      headers: { ...as(jwtB), Prefer: "return=representation" },
    });
    check(
      "B (EDITOR) ne peut pas supprimer l'événement de A",
      ((await r.json()) as unknown[]).length === 0,
    );

    r = await fetch(`${BASE}/rest/v1/trip_events?id=eq.${eventB}`, {
      method: "DELETE",
      headers: { ...as(jwtB), Prefer: "return=representation" },
    });
    check("B (EDITOR) supprime son propre événement", ((await r.json()) as unknown[]).length === 1);

    // ================= documents & document_shares =================
    section("Documents et partage (B10) — règles critiques");

    // B repasse VIEWER pour tester les droits minimaux
    await fetch(`${BASE}/rest/v1/trip_participants?trip_id=eq.${tripX}&user_id=eq.${idB}`, {
      method: "PATCH",
      headers: as(jwtA),
      body: JSON.stringify({ role: "VIEWER" }),
    });

    const vaultDoc = crypto.randomUUID();
    r = await fetch(`${BASE}/rest/v1/documents`, {
      method: "POST",
      headers: { ...as(jwtA), Prefer: "return=minimal" },
      body: JSON.stringify({
        id: vaultDoc,
        owner_id: idA,
        scope: "VAULT",
        file_name: "passeport.pdf",
        mime_type: "application/pdf",
        size_bytes: 1000,
        storage_path: `verify/${vaultDoc}.pdf`,
        category: "passport",
      }),
    });
    check("A crée un doc VAULT", r.status === 201);

    check(
      "Cas critique 1 : B ne voit pas le coffre de A",
      (await rows("documents?select=id", jwtB)).length === 0,
    );

    r = await fetch(`${BASE}/rest/v1/document_shares`, {
      method: "POST",
      headers: as(jwtB),
      body: JSON.stringify({ document_id: vaultDoc, trip_id: tripX, shared_by: idB }),
    });
    check("B ne peut pas partager le doc de A", r.status === 401 || r.status === 403);

    r = await fetch(`${BASE}/rest/v1/document_shares`, {
      method: "POST",
      headers: as(jwtA),
      body: JSON.stringify({ document_id: vaultDoc, trip_id: tripX, shared_by: idA }),
    });
    check("A partage son doc VAULT vers X", r.status === 201);

    check("B voit le doc partagé", (await rows("documents?select=id", jwtB)).length === 1);

    r = await fetch(`${BASE}/rest/v1/documents?id=eq.${vaultDoc}`, {
      method: "PATCH",
      headers: { ...as(jwtB), Prefer: "return=representation" },
      body: JSON.stringify({ file_name: "pirate.pdf" }),
    });
    check(
      "Règle 5 : B ne peut pas modifier le doc de A",
      ((await r.json()) as unknown[]).length === 0,
    );

    r = await fetch(`${BASE}/rest/v1/document_shares?document_id=eq.${vaultDoc}`, {
      method: "DELETE",
      headers: { ...as(jwtA), Prefer: "return=representation" },
    });
    check("A retire le partage", ((await r.json()) as unknown[]).length === 1);

    check(
      "Cas critique 3 : le doc redevient invisible après retrait du partage",
      (await rows("documents?select=id", jwtB)).length === 0,
    );

    // ================= partage ciblé (E09) =================
    section("Partage ciblé (E09)");

    // Troisième participant C, EDITOR de X, pour vérifier l'étanchéité
    const idC = await createUser("verify-rls-c@phil-app.test");
    const jwtC = await signIn("verify-rls-c@phil-app.test");
    try {
      await fetch(`${BASE}/rest/v1/trip_participants`, {
        method: "POST",
        headers: admin,
        body: JSON.stringify({ trip_id: tripX, user_id: idC, role: "EDITOR" }),
      });

      r = await fetch(`${BASE}/rest/v1/document_shares`, {
        method: "POST",
        headers: as(jwtA),
        body: JSON.stringify({
          document_id: vaultDoc,
          trip_id: tripX,
          shared_by: idA,
          shared_with: idB,
        }),
      });
      check("A partage son doc VAULT ciblé vers B", r.status === 201);
      check(
        "E09 : B (destinataire) voit le doc ciblé",
        (await rows("documents?select=id", jwtB)).length === 1,
      );
      check(
        "E09 : C (autre participant) ne voit PAS le doc ciblé",
        (await rows("documents?select=id", jwtC)).length === 0,
      );
      check(
        "E09 : C ne voit même pas la ligne de partage ciblée",
        (await rows(`document_shares?select=id&document_id=eq.${vaultDoc}`, jwtC)).length === 0,
      );

      // Partage équipage en parallèle, puis retrait du ciblé : l'équipage tient
      await fetch(`${BASE}/rest/v1/document_shares`, {
        method: "POST",
        headers: as(jwtA),
        body: JSON.stringify({ document_id: vaultDoc, trip_id: tripX, shared_by: idA }),
      });
      r = await fetch(
        `${BASE}/rest/v1/document_shares?document_id=eq.${vaultDoc}&shared_with=eq.${idB}`,
        { method: "DELETE", headers: { ...as(jwtA), Prefer: "return=representation" } },
      );
      check("A retire le partage ciblé", ((await r.json()) as unknown[]).length === 1);
      check(
        "E09 : le partage équipage parallèle survit (B et C voient)",
        (await rows("documents?select=id", jwtB)).length === 1 &&
          (await rows("documents?select=id", jwtC)).length === 1,
      );
      await fetch(`${BASE}/rest/v1/document_shares?document_id=eq.${vaultDoc}`, {
        method: "DELETE",
        headers: as(jwtA),
      });
    } finally {
      await deleteUser(idC);
    }

    const tripDoc = crypto.randomUUID();
    await fetch(`${BASE}/rest/v1/documents`, {
      method: "POST",
      headers: { ...as(jwtA), Prefer: "return=minimal" },
      body: JSON.stringify({
        id: tripDoc,
        owner_id: idA,
        scope: "TRIP",
        trip_id: tripX,
        file_name: "billets.pdf",
        mime_type: "application/pdf",
        size_bytes: 1000,
        storage_path: `verify/${tripDoc}.pdf`,
        category: "ticket",
      }),
    });
    check(
      "Règle 2 : B (participant) voit le doc TRIP",
      (await rows("documents?select=id&scope=eq.TRIP", jwtB)).length === 1,
    );

    r = await fetch(`${BASE}/rest/v1/documents`, {
      method: "POST",
      headers: as(jwtB),
      body: JSON.stringify({
        owner_id: idB,
        scope: "TRIP",
        trip_id: tripX,
        file_name: "x.pdf",
        mime_type: "application/pdf",
        size_bytes: 1,
        storage_path: `verify/x-${idB}.pdf`,
      }),
    });
    check("B (VIEWER) ne peut pas uploader dans le voyage", r.status === 401 || r.status === 403);

    // ================= nettoyage =================
    await fetch(`${BASE}/rest/v1/documents?id=eq.${vaultDoc}`, {
      method: "DELETE",
      headers: as(jwtA),
    });
    await fetch(`${BASE}/rest/v1/trips?id=in.(${tripX},${tripY})`, {
      method: "DELETE",
      headers: as(jwtA),
    });
  } finally {
    await deleteUser(idA);
    await deleteUser(idB);
    console.log("\nUsers et données de test supprimés.");
  }

  if (failures > 0) {
    console.error(`\n✗ ${failures}/${total} vérification(s) EN ÉCHEC — ne pas déployer.`);
    process.exit(1);
  }
  console.log(`\n✓ RLS : ${total}/${total} vérifications passent.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
