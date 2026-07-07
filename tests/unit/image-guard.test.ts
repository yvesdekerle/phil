import { describe, expect, it } from "vitest";
import { imageContentType, isBlockedIp, sniffImageType } from "@/lib/trips/image-guard";

describe("isBlockedIp — garde SSRF sur l'IP cible", () => {
  it("bloque les plages privées / loopback / link-local IPv4", () => {
    for (const ip of [
      "127.0.0.1", // loopback
      "10.0.0.5", // privé
      "172.16.0.1", // privé (borne basse)
      "172.31.255.255", // privé (borne haute)
      "192.168.1.1", // privé
      "169.254.169.254", // metadata cloud (AWS/GCP)
      "0.0.0.0", // « ce réseau »
      "100.64.0.1", // CGNAT
      "224.0.0.1", // multicast
    ]) {
      expect(isBlockedIp(ip), ip).toBe(true);
    }
  });

  it("autorise les IPv4 publiques", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "93.184.216.34", "172.15.0.1", "172.32.0.1"]) {
      expect(isBlockedIp(ip), ip).toBe(false);
    }
  });

  it("bloque loopback / ULA / link-local IPv6 et l'IPv4-mapped interne", () => {
    for (const ip of ["::1", "::", "fc00::1", "fd12:3456::1", "fe80::1", "::ffff:127.0.0.1"]) {
      expect(isBlockedIp(ip), ip).toBe(true);
    }
  });

  it("autorise une IPv6 publique et l'IPv4-mapped publique", () => {
    expect(isBlockedIp("2606:4700:4700::1111")).toBe(false);
    expect(isBlockedIp("::ffff:8.8.8.8")).toBe(false);
  });

  it("bloque par prudence ce qui n'est pas une IP", () => {
    expect(isBlockedIp("pas-une-ip")).toBe(true);
    expect(isBlockedIp("")).toBe(true);
    expect(isBlockedIp("999.999.999.999")).toBe(true);
  });
});

describe("sniffImageType — validation par magic bytes", () => {
  it("reconnaît un en-tête JPEG", () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]))).toBe("jpg");
  });

  it("reconnaît un en-tête PNG", () => {
    expect(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(
      "png",
    );
  });

  it("reconnaît un conteneur WebP (RIFF…WEBP)", () => {
    const webp = new Uint8Array(12);
    webp.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
    webp.set([0x57, 0x45, 0x42, 0x50], 8); // WEBP
    expect(sniffImageType(webp)).toBe("webp");
  });

  it("rejette du HTML/SVG servi en image (pas de magic bytes image)", () => {
    const html = new TextEncoder().encode("<!doctype html><svg>…");
    expect(sniffImageType(html)).toBeNull();
  });

  it("rejette un RIFF qui n'est pas du WebP (ex. WAV)", () => {
    const wav = new Uint8Array(12);
    wav.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
    wav.set([0x57, 0x41, 0x56, 0x45], 8); // WAVE
    expect(sniffImageType(wav)).toBeNull();
  });

  it("rejette une entrée trop courte", () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8]))).toBeNull();
  });
});

describe("imageContentType", () => {
  it("mappe chaque extension au bon type MIME", () => {
    expect(imageContentType("jpg")).toBe("image/jpeg");
    expect(imageContentType("png")).toBe("image/png");
    expect(imageContentType("webp")).toBe("image/webp");
  });
});
