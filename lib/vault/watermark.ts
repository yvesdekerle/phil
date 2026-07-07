import { degrees, PDFDocument, rgb, StandardFonts } from "pdf-lib";

/**
 * Filigrane dynamique (PHIL-E06) : diagonales répétées avec l'identité du
 * visualiseur, l'horodatage et la mention de confidentialité.
 * Cible : < 200 ms par document.
 */

const WATERMARK_COLOR = rgb(0.43, 0.12, 0.18); // bordeaux Phil
const WATERMARK_OPACITY = 0.18;

function watermarkLines(viewer: string): string {
  const timestamp = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date());
  return `Phil · vu par ${viewer} · ${timestamp} UTC`;
}

async function applyWatermark(pdf: PDFDocument, text: string): Promise<void> {
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontSize = 14;
  const textWidth = font.widthOfTextAtSize(text, fontSize);

  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    const diagonal = Math.hypot(width, height);
    // Répétition le long de la diagonale pour couvrir toute la page.
    const step = textWidth + 120;
    const count = Math.max(2, Math.ceil(diagonal / step) + 1);
    for (let i = 0; i < count; i++) {
      const offset = i * step - diagonal / 3;
      page.drawText(text, {
        x: offset * Math.SQRT1_2,
        y: offset * Math.SQRT1_2,
        size: fontSize,
        font,
        color: WATERMARK_COLOR,
        opacity: WATERMARK_OPACITY,
        rotate: degrees(45),
      });
    }
  }
}

/** Applique le filigrane à un PDF existant. */
export async function watermarkPdf(pdfBytes: Uint8Array, viewer: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  await applyWatermark(pdf, watermarkLines(viewer));
  return pdf.save();
}

/** Convertit une image JPG/PNG en PDF pleine page, puis filigrane. */
export async function watermarkImage(
  imageBytes: Uint8Array,
  mimeType: string,
  viewer: string,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const image =
    mimeType === "image/png" ? await pdf.embedPng(imageBytes) : await pdf.embedJpg(imageBytes);
  const page = pdf.addPage([image.width, image.height]);
  page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  await applyWatermark(pdf, watermarkLines(viewer));
  return pdf.save();
}

/** Le filigrane sait-il traiter ce type ? (HEIC : non pris en charge en v1.) */
export function canWatermark(mimeType: string): boolean {
  return mimeType === "application/pdf" || mimeType === "image/jpeg" || mimeType === "image/png";
}
