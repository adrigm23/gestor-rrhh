import { test } from "node:test";
import assert from "node:assert/strict";
import { ApiError } from "./errors";

// Un 401 real del refresh (ApiError) debe seguir disparando el
// comportamiento de logout existente, sin cambios.
test("apiRequest: 401 real del refresh (ApiError) SÍ dispara logout", async (t) => {
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
        throw new ApiError(401, "refresh token inválido");
      },
    },
  });

  const { apiRequest, setSessionExpiredHandler } = await import("./client");
  setSessionExpiredHandler(() => {
    sessionExpiredCalled = true;
  });

  t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 401 }));

  await assert.rejects(() => apiRequest("/api/mobile/v1/fichajes/status"));

  assert.equal(sessionExpiredCalled, true, "un 401 real del refresh sí debe disparar logout");
});
