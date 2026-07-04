import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { areUuids } from "@/lib/validation";

/**
 * Sert une photo du voyage (PHIL-O10) — `?thumb=1` pour la vignette.
 * Le droit d'accès est porté par la RLS (équipage du voyage), le blob est lu
 * via service role : le bucket photos n'a aucune policy de lecture.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!areUuids(id)) {
    return Response.json({ error: "Identifiant invalide" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Authentification requise" }, { status: 401 });
  }

  const { data: photo } = await supabase
    .from("trip_photos")
    .select("storage_path, thumb_path")
    .eq("id", id)
    .single();
  if (!photo) {
    return Response.json({ error: "Photo introuvable" }, { status: 404 });
  }

  const wantThumb = new URL(request.url).searchParams.get("thumb") === "1";
  const path = wantThumb && photo.thumb_path ? photo.thumb_path : photo.storage_path;

  const admin = createAdminClient();
  const { data: blob, error } = await admin.storage.from("photos").download(path);
  if (error || !blob) {
    return Response.json({ error: "Fichier indisponible" }, { status: 502 });
  }

  const ext = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
  const contentType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

  return new Response(blob, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": "inline",
    },
  });
}
