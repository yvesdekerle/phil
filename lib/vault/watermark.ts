import { degrees, PDFDocument, rgb, StandardFonts } from "pdf-lib";

/**
 * Filigrane dynamique (PHIL-E06) : diagonales répétées avec l'identité du
 * visualiseur, l'horodatage et la mention de confidentialité.
 * Cible : < 200 ms par document.
 */

const WATERMARK_COLOR = rgb(0.43, 0.12, 0.18); // bordeaux Phil
const WATERMARK_OPACITY = 0.2;

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
  const fontSize = 12;
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  const stepX = textWidth + 70;
  const stepY = 85;

  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    // Tuile TOUTE la page (quinconce), texte en diagonale → filigrane bien visible.
    let row = 0;
    for (let y = -stepY; y < height + stepY; y += stepY) {
      const shift = (row % 2) * (stepX / 2);
      for (let x = -stepX; x < width + stepX; x += stepX) {
        page.drawText(text, {
          x: x + shift,
          y,
          size: fontSize,
          font,
          color: WATERMARK_COLOR,
          opacity: WATERMARK_OPACITY,
          rotate: degrees(30),
        });
      }
      row++;
    }
  }
}

/** Applique le filigrane à un PDF existant. */
export async function watermarkPdf(pdfBytes: Uint8Array, viewer: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  await applyWatermark(pdf, watermarkLines(viewer));
  // useObjectStreams:false → structure PDF classique, mieux acceptée par les
  // lecteurs (le défaut avec object streams était refusé sur certains PDF).
  return pdf.save({ useObjectStreams: false });
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
  return pdf.save({ useObjectStreams: false });
}

/** Le filigrane sait-il traiter ce type ? (HEIC : non pris en charge en v1.) */
export function canWatermark(mimeType: string): boolean {
  return mimeType === "application/pdf" || mimeType === "image/jpeg" || mimeType === "image/png";
}
