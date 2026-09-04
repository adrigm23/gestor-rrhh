import * as SecureStore from "expo-secure-store";
import type { TokenStorage } from "./types";

// Implementación nativa (iOS/Android) — Metro la resuelve automáticamente
// para esas plataformas por convención de nombre; token-storage.web.ts es
// la variante que resuelve para web.
export const tokenStorage: TokenStorage = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  deleteItem: (key) => SecureStore.deleteItemAsync(key),
};
