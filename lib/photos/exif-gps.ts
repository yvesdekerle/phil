/**
 * Extraction GPS EXIF (PHIL-Q12) — parseur minimal maison, zéro dépendance :
 * segment APP1 des JPEG → IFD GPS → latitude/longitude en degrés décimaux.
 * Best-effort : tout fichier illisible ou sans position renvoie null.
 */

export async function extractGps(file: File): Promise<{ lat: number; lng: number } | null> {
  if (file.type !== "image/jpeg") {
    return null; // PNG/WebP ne portent quasiment jamais de GPS EXIF
  }
  try {
    const view = new DataView(await file.slice(0, 256 * 1024).arrayBuffer());
    if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) {
      return null;
    }
    let offset = 2;
    while (offset + 4 < view.byteLength) {
      const marker = view.getUint16(offset);
      if ((marker & 0xff00) !== 0xff00) {
        return null;
      }
      const size = view.getUint16(offset + 2);
      if (marker === 0xffe1 && offset + 10 < view.byteLength) {
        // "Exif\0\0"
        if (view.getUint32(offset + 4) === 0x45786966 && view.getUint16(offset + 8) === 0) {
          return parseTiff(view, offset + 10);
        }
      }
      if (marker === 0xffda) {
        return null; // début des données image : plus d'EXIF possible
      }
      offset += 2 + size;
    }
    return null;
  } catch {
    return null;
  }
}

function parseTiff(view: DataView, tiff: number): { lat: number; lng: number } | null {
  const little = view.getUint16(tiff) === 0x4949;
  const u16 = (o: number) => view.getUint16(tiff + o, little);
  const u32 = (o: number) => view.getUint32(tiff + o, little);
  if (u16(2) !== 42) {
    return null;
  }

  // IFD0 : chercher le pointeur vers l'IFD GPS (tag 0x8825)
  const ifd0 = u32(4);
  let gpsIfd = 0;
  const count0 = u16(ifd0);
  for (let i = 0; i < count0; i++) {
    const entry = ifd0 + 2 + i * 12;
    if (u16(entry) === 0x8825) {
      gpsIfd = u32(entry + 8);
    }
  }
  if (!gpsIfd) {
    return null;
  }

  // Trois rationnels (deg, min, sec) à un offset absolu du TIFF
  const dms = (valOffset: number): number => {
    let total = 0;
    for (let k = 0; k < 3; k++) {
      const num = u32(valOffset + k * 8);
      const den = u32(valOffset + k * 8 + 4);
      total += (den ? num / den : 0) / 60 ** k;
    }
    return total;
  };

  let latRef = "N";
  let lngRef = "E";
  let lat: number | undefined;
  let lng: number | undefined;
  const gpsCount = u16(gpsIfd);
  for (let i = 0; i < gpsCount; i++) {
    const entry = gpsIfd + 2 + i * 12;
    const tag = u16(entry);
    if (tag === 1) {
      latRef = String.fromCharCode(view.getUint8(tiff + entry + 8));
    } else if (tag === 2) {
      lat = dms(u32(entry + 8));
    } else if (tag === 3) {
      lngRef = String.fromCharCode(view.getUint8(tiff + entry + 8));
    } else if (tag === 4) {
      lng = dms(u32(entry + 8));
    }
  }
  if (lat === undefined || lng === undefined || (lat === 0 && lng === 0)) {
    return null;
  }
  return { lat: latRef === "S" ? -lat : lat, lng: lngRef === "W" ? -lng : lng };
}
