import { test } from "node:test";
import assert from "node:assert/strict";
import { ApiError } from "../api/errors";

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

// Un rechazo real del servidor (ApiError, no NetworkError) para una acción
// concreta se descarta — reintentarla indefinidamente no cambiaría el
// resultado — y el drenado continúa con el resto.
test("drainQueue(): ApiError descarta esa acción y continúa con las demás", async (t) => {
  const storage = inMemoryAsyncStorage();
  t.mock.module("@react-native-async-storage/async-storage", { defaultExport: storage });

  let togglePausaCalled = false;
  t.mock.module("../api/fichajes", {
    namedExports: {
      toggleFichaje: async () => {
        throw new ApiError(500, "error del servidor");
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

  assert.equal(togglePausaCalled, true, "sí debe continuar con la segunda acción");
  assert.equal(await getQueueLength(), 0, "la acción con ApiError se descarta, no queda encolada");
});
