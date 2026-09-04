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

// Dos acciones encoladas, ambas se reproducen con éxito, en orden, y la
// cola queda vacía al terminar.
test("drainQueue(): reproduce en orden y vacía la cola cuando todo tiene éxito", async (t) => {
  const storage = inMemoryAsyncStorage();
  t.mock.module("@react-native-async-storage/async-storage", { defaultExport: storage });

  const callOrder: string[] = [];
  t.mock.module("../api/fichajes", {
    namedExports: {
      toggleFichaje: async () => {
        callOrder.push("toggleFichaje");
        return { outcome: "started" };
      },
      togglePausa: async () => {
        callOrder.push("togglePausa");
        return { outcome: "started" };
      },
    },
  });

  const { enqueue, drainQueue, getQueueLength } = await import("./queue");
  await enqueue("toggleFichaje");
  await enqueue("togglePausa");

  await drainQueue();

  assert.deepEqual(callOrder, ["toggleFichaje", "togglePausa"]);
  assert.equal(await getQueueLength(), 0);
});
