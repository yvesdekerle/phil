export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
] as const;

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 Mo

const EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/heic": "heic",
  "image/heif": "heif",
};

export function isAllowedMimeType(type: string): boolean {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(type);
}

export function extensionFor(mimeType: string): string {
  return EXTENSIONS[mimeType] ?? "bin";
}

export function validateFile(file: File): string | null {
  if (!isAllowedMimeType(file.type)) {
    return "Format non accepté — PDF, JPG, PNG ou HEIC uniquement.";
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "Fichier trop lourd : 10 Mo maximum.";
  }
  return null;
}
