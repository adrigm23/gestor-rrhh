import { test } from "node:test";
import assert from "node:assert/strict";
import { NetworkError } from "../api/errors";

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

// Si la primera acción vuelve a fallar por NetworkError, el drenado se
// detiene ahí mismo — ninguna acción se pierde ni se salta, la cola queda
// intacta (2 elementos) para el próximo intento.
test("drainQueue(): NetworkError detiene el drenado sin perder ni saltar acciones", async (t) => {
  const storage = inMemoryAsyncStorage();
  t.mock.module("@react-native-async-storage/async-storage", { defaultExport: storage });

  let togglePausaCalled = false;
  t.mock.module("../api/fichajes", {
    namedExports: {
      toggleFichaje: async () => {
        throw new NetworkError("sin conexión");
      },
      togglePausa: async () => {
        togglePausaCalled = true;
        return { outcome: "started" };
      },
    },
  });

  const { enqueue, drainQueue, getQueueLength } = await import("./queue");
  await enqueue("toggleFichaje");
  await enqueue("togglePausa");

  await drainQueue();

  assert.equal(togglePausaCalled, false, "no debe intentar la segunda acción tras el NetworkError");
  assert.equal(await getQueueLength(), 2, "ambas acciones deben seguir encoladas");
});
