// Auditoría de seguridad (Fase 2.19): antes esta comprobación no existía, y
// client.ts/auth.ts duplicaban el mismo fallback a localhost cada uno por su
// lado. Un build de producción sin EXPO_PUBLIC_API_URL definida (o definida
// por error con http:// en vez de https://) mandaría credenciales y tokens
// en claro sin que nada lo impidiera — esto lo convierte en un fallo ruidoso
// en vez de una fuga silenciosa. __DEV__ es la constante global que expone
// React Native/Expo (no depende de process.env), así que sigue permitiendo
// http://localhost en desarrollo sin tocar nada más.
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3912";

// __DEV__ solo existe en el runtime de React Native/Expo — fuera de él (los
// tests de mobile corren con tsx --test sobre Node puro, sin ese runtime)
// no está definida. Se trata como "no es producción" en ese caso: aquí no
// hay forma de que un valor http:// llegue a un usuario real.
const isReactNativeDev = typeof __DEV__ !== "undefined" && __DEV__;
const isReactNativeRuntime = typeof __DEV__ !== "undefined";

if (isReactNativeRuntime && !isReactNativeDev && !BASE_URL.startsWith("https://")) {
  throw new Error("EXPO_PUBLIC_API_URL debe usar https:// en producción (valor actual: " + BASE_URL + ")");
}
