import { z } from "zod";

const uuidSchema = z.string().uuid();

/** Garde d'entrée pour les identifiants passés bruts aux actions (PHIL-J03). */
export function areUuids(...values: string[]): boolean {
  return values.every((v) => uuidSchema.safeParse(v).success);
}
