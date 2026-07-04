"use client";

import { parse } from "mrz";

export type MrzResult = {
  documentNumber: string | null;
  expirationDate: string | null; // yyyy-MM-dd
  valid: boolean;
};

/**
 * Lecture de la bande MRZ d'un passeport (PHIL-N04), 100 % dans le
 * navigateur (tesseract.js auto-hébergé — la CSP interdit les CDN).
 * Les sommes de contrôle MRZ valident la lecture : une lecture douteuse
 * est rejetée plutôt que de pré-remplir des valeurs fausses.
 */
export async function recognizeMrz(file: File): Promise<MrzResult | null> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    workerPath: "/ocr/worker.min.js",
    corePath: "/ocr/tesseract-core-simd-lstm.wasm.js",
    langPath: "/ocr",
  });
  try {
    await worker.setParameters({
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<",
    });
    const {
      data: { text },
    } = await worker.recognize(file);

    // Bande TD3 : deux lignes de 44 caractères
    const lines = text
      .split("\n")
      .map((l) => l.replace(/\s/g, ""))
      .filter((l) => l.length >= 40 && /[A-Z0-9<]{40,}/.test(l))
      .map((l) => l.slice(0, 44).padEnd(44, "<"));
    if (lines.length < 2) {
      return null;
    }

    for (let i = 0; i + 1 < lines.length; i++) {
      try {
        const result = parse([lines[i], lines[i + 1]]);
        const exp = result.fields.expirationDate; // YYMMDD
        if (result.fields.documentNumber || exp) {
          return {
            documentNumber: result.fields.documentNumber ?? null,
            expirationDate: exp
              ? `20${exp.slice(0, 2)}-${exp.slice(2, 4)}-${exp.slice(4, 6)}`
              : null,
            // les checksums numéro + date doivent être bons
            valid: result.details
              .filter((d) => ["documentNumber", "expirationDate"].includes(d.field ?? ""))
              .every((d) => d.valid),
          };
        }
      } catch {
        // paire suivante
      }
    }
    return null;
  } finally {
    await worker.terminate();
  }
}
