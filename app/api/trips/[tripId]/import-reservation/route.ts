import { extractReservation, importEnabled } from "@/lib/import/reservation";
import { createClient } from "@/lib/supabase/server";
import { areUuids } from "@/lib/validation";

const ALLOWED_MIMES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_TOTAL_BYTES = 4 * 1024 * 1024; // limite requête Vercel ~4,5 Mo

/**
 * Analyse d'une confirmation de réservation (PHIL-O01) : PDF ou captures
 * d'écran → champs d'événement pré-remplis. Aucune écriture ici — la création
 * se fait ensuite via la server action, après validation par l'utilisateur.
 */
export async function POST(request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  if (!areUuids(tripId)) {
    return Response.json({ error: "Identifiant invalide" }, { status: 400 });
  }
  if (!importEnabled()) {
    return Response.json(
      { error: "Import indisponible — clé GEMINI_API_KEY non configurée." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Authentification requise" }, { status: 401 });
  }
  const { data: me } = await supabase
    .from("trip_participants")
    .select("role")
    .eq("trip_id", tripId)
    .eq("user_id", user.id)
    .single();
  if (!me || (me.role !== "OWNER" && me.role !== "EDITOR")) {
    return Response.json(
      { error: "Il faut être capitaine ou éditeur du voyage." },
      { status: 403 },
    );
  }

  const formData = await request.formData();
  const rawFiles = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (rawFiles.length === 0 || rawFiles.length > 5) {
    return Response.json({ error: "Envoie 1 à 5 fichiers." }, { status: 400 });
  }
  let total = 0;
  const files: { bytes: Uint8Array; mimeType: string }[] = [];
  for (const f of rawFiles) {
    if (!ALLOWED_MIMES.includes(f.type)) {
      return Response.json({ error: `${f.name} : PDF ou image uniquement.` }, { status: 400 });
    }
    total += f.size;
    if (total > MAX_TOTAL_BYTES) {
      return Response.json({ error: "Fichiers trop lourds (4 Mo max au total)." }, { status: 400 });
    }
    files.push({ bytes: new Uint8Array(await f.arrayBuffer()), mimeType: f.type });
  }

  const extracted = await extractReservation(files);
  if (!extracted) {
    return Response.json(
      { error: "Je n'ai pas réussi à lire cette confirmation — saisis l'événement à la main." },
      { status: 422 },
    );
  }
  return Response.json({ extracted });
}
