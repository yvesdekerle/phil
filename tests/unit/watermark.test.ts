import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { canWatermark, watermarkImage, watermarkPdf } from "@/lib/vault/watermark";

// PNG 1×1 transparent minimal (base64), suffisant pour embedPng.
const TINY_PNG = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  ),
  (c) => c.charCodeAt(0),
);

async function pdfHeader(bytes: Uint8Array): Promise<string> {
  return new TextDecoder().decode(bytes.slice(0, 5));
}

describe("canWatermark", () => {
  it("accepte PDF, JPEG et PNG", () => {
    expect(canWatermark("application/pdf")).toBe(true);
    expect(canWatermark("image/jpeg")).toBe(true);
    expect(canWatermark("image/png")).toBe(true);
  });

  it("refuse HEIC et les types inconnus", () => {
    expect(canWatermark("image/heic")).toBe(false);
    expect(canWatermark("image/gif")).toBe(false);
    expect(canWatermark("application/octet-stream")).toBe(false);
  });
});

describe("watermarkPdf", () => {
  it("produit un PDF valide en préservant le nombre de pages", async () => {
    const src = await PDFDocument.create();
    src.addPage([200, 200]);
    src.addPage([200, 200]);
    const input = await src.save();

    const out = await watermarkPdf(input, "voyageur@phil");

    expect(await pdfHeader(out)).toBe("%PDF-");
    const reloaded = await PDFDocument.load(out);
    expect(reloaded.getPageCount()).toBe(2);
  });
});

describe("watermarkImage", () => {
  it("convertit une image PNG en PDF filigrané", async () => {
    const out = await watermarkImage(TINY_PNG, "image/png", "voyageur@phil");
    expect(await pdfHeader(out)).toBe("%PDF-");
    const reloaded = await PDFDocument.load(out);
    expect(reloaded.getPageCount()).toBe(1);
  });
});
