import NetInfo from "@react-native-community/netinfo";
import { drainQueue } from "./queue";
import { useOfflineQueueStore } from "../store/offline-queue-store";

let listenerStarted = false;

/**
 * Arranca (una sola vez) el listener que drena la cola offline al detectar
 * conexión. `previousIsOnline` empieza en `null` a propósito: el primer
 * evento que NetInfo entrega siempre es el estado actual en el momento de
 * suscribirse, así que si la app arranca ya online con una cola pendiente
 * de una sesión anterior (se cerró estando offline), también se drena aquí
 * — no hace falta esperar a una transición real offline→online.
 */
export function startOfflineQueueListener(): void {
  if (listenerStarted) return;
  listenerStarted = true;

  // Refleja de inmediato cualquier acción que hubiera quedado pendiente de
  // una sesión anterior, antes incluso de que llegue el primer evento de
  // NetInfo.
  void useOfflineQueueStore.getState().refreshPendingCount();

  let previousIsOnline: boolean | null = null;

  NetInfo.addEventListener((state) => {
    const isOnline = state.isConnected === true && state.isInternetReachable !== false;
    useOfflineQueueStore.getState().setOnline(isOnline);

    const cameOnline = isOnline && previousIsOnline !== true;
    previousIsOnline = isOnline;

    if (cameOnline) {
      void drainQueue().finally(() => {
        void useOfflineQueueStore.getState().refreshPendingCount();
      });
    }
  });
}
