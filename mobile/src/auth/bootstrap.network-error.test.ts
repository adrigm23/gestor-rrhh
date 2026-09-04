import { test } from "node:test";
import assert from "node:assert/strict";
import { NetworkError } from "../api/errors";

// Caso NetworkError + Caso 5 (tokens conservados): si el refresh falla por
// falta de conexión durante el bootstrap, los tokens guardados NO deben
// borrarse — "no puedo comprobarlo ahora" no es lo mismo que "caducó".
test("bootstrapSession: NetworkError conserva los tokens guardados", async (t) => {
  let clearTokensCallCount = 0;
  const storedTokens = { accessToken: "stored-at", refreshToken: "stored-rt" };

  t.mock.module("./token-manager", {
    namedExports: {
      loadTokens: async () => storedTokens,
      saveTokens: async () => {},
      clearTokens: async () => {
        clearTokensCallCount += 1;
      },
    },
  });
  t.mock.module("../api/auth", {
    namedExports: {
      refresh: async () => {
        throw new NetworkError("sin conexión");
      },
    },
  });

  const { bootstrapSession } = await import("./bootstrap");
  const result = await bootstrapSession();

  assert.deepEqual(result, { authenticated: false, user: null });
  assert.equal(clearTokensCallCount, 0, "NetworkError no debe limpiar los tokens guardados");
});
