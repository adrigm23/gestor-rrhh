import * as Location from "expo-location";

// Fase 2.20 (geolocalización en fichaje, solo registro/auditoría): igual
// que fichaje-geo-form.tsx en la web — best-effort, nunca bloquea ni lanza.
// Si el permiso está denegado, el GPS tarda, o cualquier otra cosa falla,
// se resuelve a undefined y el fichaje se manda sin ubicación.
const TIMEOUT_MS = 8000;

export async function getBestEffortLocation(): Promise<
  { latitude: number; longitude: number } | undefined
> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) return undefined;

    const timeout = new Promise<undefined>((resolve) => {
      setTimeout(() => resolve(undefined), TIMEOUT_MS);
    });

    const position = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      timeout,
    ]);
    if (!position) return undefined;

    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } catch {
    return undefined;
  }
}
