// Contrato compartido por token-storage.ts (nativo) y token-storage.web.ts
// (web) — sin imports en tiempo de ejecución, para que ninguna de las dos
// variantes de plataforma dependa de la otra.
export interface TokenStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  deleteItem(key: string): Promise<void>;
}
