import type { TokenStorage } from "./types";

// expo-secure-store no tiene implementación real en web (su módulo nativo
// exporta {} — ver diagnóstico de la incidencia de pantalla en blanco).
// localStorage no es almacenamiento seguro — aceptable aquí porque web es
// únicamente una vista previa de desarrollo, no una plataforma de destino
// de esta app (el destino real es Android/iOS, que usan token-storage.ts).
// Las guardas `typeof window === "undefined"` cubren el renderizado
// estático de Expo Router para web, que ejecuta en un contexto sin DOM.
export const tokenStorage: TokenStorage = {
  async getItem(key) {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  },
  async setItem(key, value) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  },
  async deleteItem(key) {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
  },
};
