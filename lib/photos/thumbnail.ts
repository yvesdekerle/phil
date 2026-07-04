/**
 * Vignette côté client (PHIL-O10) — la transformation d'images Supabase est
 * réservée aux plans payants, donc on génère la miniature dans le navigateur.
 * La grille ne charge que les vignettes (~50-150 Ko) ; l'original ne se
 * télécharge qu'à l'ouverture.
 */
const THUMB_MAX_PX = 480;

export async function makeThumbnail(file: File): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, THUMB_MAX_PX / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.72);
    });
  } catch {
    return null; // pas de vignette = la grille chargera l'original
  }
}
