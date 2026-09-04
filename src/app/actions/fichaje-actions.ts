// src/actions/fichaje-actions.ts
"use server";

import { auth } from "../api/auth/auth";
import { revalidatePath } from "next/cache";
import { sanitizeString } from "../utils/input";
import { fichajeService } from "../../services/fichaje";
import type { FichajeCoordinates } from "../../services/fichaje";

const parseCoord = (value: FormDataEntryValue | null) => {
  const sanitized = sanitizeString(value, { maxLength: 32 });
  if (!sanitized) return null;
  const parsed = Number.parseFloat(sanitized.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};

const parseCoords = (formData?: FormData): FichajeCoordinates | undefined => {
  const latitude = parseCoord(formData?.get("latitud") ?? null);
  const longitude = parseCoord(formData?.get("longitud") ?? null);
  if (latitude === null || longitude === null) return undefined;
  return { latitude, longitude };
};

export async function toggleFichaje(formData?: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("No autorizado");
  }

  const userId = session.user.id;
  const coords = parseCoords(formData);

  const result = await fichajeService.toggleFichaje(userId, coords);

  if (result.outcome === "blocked-by-leave") {
    return;
  }

  revalidatePath("/dashboard");
}

export async function togglePausa() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("No autorizado");
  }

  const userId = session.user.id;

  const result = await fichajeService.togglePausa(userId);

  if (result.outcome === "blocked-by-leave") {
    return;
  }

  revalidatePath("/dashboard");
}
