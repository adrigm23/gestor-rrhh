import { test } from "node:test";
import assert from "node:assert/strict";

function inMemoryAsyncStorage() {
  const store = new Map<string, string>();
  return {
    default: {
      getItem: async (key: string) => store.get(key) ?? null,
      setItem: async (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: async (key: string) => {
        store.delete(key);
      },
    },
  };
}

test("enqueue() añade una acción y getQueueLength() la refleja", async (t) => {
  t.mock.module("@react-native-async-storage/async-storage", {
    defaultExport: inMemoryAsyncStorage().default,
  });
  t.mock.module("../api/fichajes", { namedExports: {} });

  const { enqueue, getQueueLength } = await import("./queue");

  assert.equal(await getQueueLength(), 0);
  await enqueue("toggleFichaje");
  assert.equal(await getQueueLength(), 1);
  await enqueue("togglePausa");
  assert.equal(await getQueueLength(), 2);
});
