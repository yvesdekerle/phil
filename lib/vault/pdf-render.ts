"use client";

import * as pdfjs from "pdfjs-dist";

// PDF.js a besoin d'un worker. On le résout via l'URL du module (bundlé par
// Turbopack). NAVIGATEUR UNIQUEMENT (canvas + worker).
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

/**
 * Rend chaque page d'un PDF en PNG via PDF.js (le renderer tolérant, qui ouvre
 * n'importe quel PDF). Sert à filigraner de façon ROBUSTE : on convertit en
 * images puis on reconstruit un PDF filigrané (voir `watermarkImagePages`).
 */
export async function renderPdfToPngs(pdfBytes: Uint8Array, scale = 2): Promise<Uint8Array[]> {
  const loadingTask = pdfjs.getDocument({ data: pdfBytes as Uint8Array<ArrayBuffer> });
  const doc = await loadingTask.promise;
  const pages: Uint8Array[] = [];
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Canvas indisponible");
      }
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) {
        throw new Error("Rendu de page impossible");
      }
      pages.push(new Uint8Array(await blob.arrayBuffer()));
      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    await loadingTask.destroy();
  }
  return pages;
}
