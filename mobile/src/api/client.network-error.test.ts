import { test } from "node:test";
import assert from "node:assert/strict";
import { NetworkError } from "./errors";

// Caso 3 aplicado a client.ts: un NetworkError durante el refresh no debe
// disparar logout, debe propagarse tal cual.
//
// Nota: cada escenario de mock.module() para este módulo vive en su propio
// archivo — Node cachea `./client` en la primera importación dinámica
// dentro del proceso, así que dos tests con mocks distintos del mismo
// módulo en el mismo archivo reutilizarían el primer mock (comprobado
// empíricamente).
test("apiRequest: NetworkError durante el refresh NO dispara logout y se propaga", async (t) => {
  let sessionExpiredCalled = false;

  t.mock.module("../auth/token-manager", {
    namedExports: {
      loadTokens: async () => ({ accessToken: "old-access", refreshToken: "rt" }),
      saveTokens: async () => {},
    },
  });
  t.mock.module("./auth", {
    namedExports: {
      refresh: async () => {
        throw new NetworkError("sin conexión");
      },
    },
  });

  const { apiRequest, setSessionExpiredHandler } = await import("./client");
  setSessionExpiredHandler(() => {
    sessionExpiredCalled = true;
  });

  t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 401 }));

  await assert.rejects(
    () => apiRequest("/api/mobile/v1/fichajes/status"),
    (error: unknown) => {
      assert.ok(error instanceof NetworkError);
      return true;
    },
  );

  assert.equal(sessionExpiredCalled, false, "NetworkError no debe disparar logout");
});
