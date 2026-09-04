import { test } from "node:test";
import assert from "node:assert/strict";

function inMemoryAsyncStorage() {
  const store = new Map<string, string>();
  return {
    getItem: async (key: string) => store.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: async (key: string) => {
      store.delete(key);
    },
  };
}

test("useOfflineQueueStore: enqueue() delega en offline/queue.ts y refleja pendingCount", async (t) => {
  t.mock.module("@react-native-async-storage/async-storage", {
    defaultExport: inMemoryAsyncStorage(),
  });
  t.mock.module("../api/fichajes", { namedExports: {} });

  const { useOfflineQueueStore } = await import("./offline-queue-store");
  useOfflineQueueStore.setState({ pendingCount: 0, isOnline: true });

  assert.equal(useOfflineQueueStore.getState().pendingCount, 0);

  await useOfflineQueueStore.getState().enqueue("toggleFichaje");
  assert.equal(useOfflineQueueStore.getState().pendingCount, 1);

  await useOfflineQueueStore.getState().enqueue("togglePausa");
  assert.equal(useOfflineQueueStore.getState().pendingCount, 2);
});

test("useOfflineQueueStore: setOnline() actualiza isOnline sin tocar la cola", async (t) => {
  t.mock.module("@react-native-async-storage/async-storage", {
    defaultExport: inMemoryAsyncStorage(),
  });
  t.mock.module("../api/fichajes", { namedExports: {} });

  const { useOfflineQueueStore } = await import("./offline-queue-store");
  useOfflineQueueStore.setState({ pendingCount: 0, isOnline: true });

  useOfflineQueueStore.getState().setOnline(false);
  assert.equal(useOfflineQueueStore.getState().isOnline, false);
  assert.equal(useOfflineQueueStore.getState().pendingCount, 0, "setOnline no debe tocar pendingCount");

  useOfflineQueueStore.getState().setOnline(true);
  assert.equal(useOfflineQueueStore.getState().isOnline, true);
});
