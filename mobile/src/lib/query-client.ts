import { QueryClient } from "@tanstack/react-query";

// Instancia única a nivel de módulo: la usa el QueryClientProvider raíz
// (_layout.tsx) y también código fuera del árbol de React que necesite
// limpiar caché — p. ej. auth-store.ts al cerrar sesión, para que cambiar
// de cuenta sin recargar la app no muestre datos de la sesión anterior.
export const queryClient = new QueryClient();
