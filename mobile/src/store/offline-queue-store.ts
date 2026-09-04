import { create } from "zustand";
import {
  enqueue as enqueueAction,
  getQueueLength,
  type QueuedActionType,
} from "../offline/queue";

// Capa reactiva/integradora únicamente: offline/queue.ts sigue siendo la
// única fuente de verdad de la cola (persistencia + reproducción). Este
// store no guarda ni reimplementa nada de eso, solo refleja su estado para
// que la UI pueda reaccionar.
interface OfflineQueueState {
  pendingCount: number;
  isOnline: boolean;
  enqueue: (type: QueuedActionType) => Promise<void>;
  refreshPendingCount: () => Promise<void>;
  setOnline: (online: boolean) => void;
}

export const useOfflineQueueStore = create<OfflineQueueState>((set, get) => ({
  pendingCount: 0,
  isOnline: true,

  enqueue: async (type) => {
    await enqueueAction(type);
    await get().refreshPendingCount();
  },

  refreshPendingCount: async () => {
    const count = await getQueueLength();
    set({ pendingCount: count });
  },

  setOnline: (online) => {
    set({ isOnline: online });
  },
}));
