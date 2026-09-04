import { test } from "node:test";
import assert from "node:assert/strict";
import { ApiError } from "../api/errors";

// Un 401 real durante el refresh en bootstrap sigue siendo un rechazo de
// sesión: se mantiene el comportamiento actual de limpiar los tokens.
test("bootstrapSession: ApiError(401) sí limpia los tokens (comportamiento existente)", async (t) => {
  let clearTokensCallCount = 0;

  t.mock.module("./token-manager", {
    namedExports: {
      loadTokens: async () => ({ accessToken: "stored-at", refreshToken: "stored-rt" }),
      saveTokens: async () => {},
      clearTokens: async () => {
        clearTokensCallCount += 1;
      },
    },
  });
  t.mock.module("../api/auth", {
    namedExports: {
      refresh: async () => {
        throw new ApiError(401, "refresh token inválido");
      },
    },
  });

  const { bootstrapSession } = await import("./bootstrap");
  const result = await bootstrapSession();

  assert.deepEqual(result, { authenticated: false, user: null });
  assert.equal(clearTokensCallCount, 1, "un 401 real sí debe limpiar los tokens, como antes");
});
