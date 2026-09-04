import { test } from "node:test";
import assert from "node:assert/strict";

// Caso 1 aplicado a bootstrap.ts: refresh correcto -> sesión válida,
// comportamiento actual intacto (no se toca ningún camino de error).
test("bootstrapSession: refresh correcto deja la sesión autenticada", async (t) => {
  let saveTokensCallCount = 0;

  // Access token real con claims válidos (sub/role/passwordMustChange) para
  // que decodeAccessTokenUser() lo acepte — mismo formato que firma el
  // backend, sin verificar firma (no hace falta para este test, bootstrap
  // no verifica la firma tampoco, solo lee los claims).
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ sub: "user-1", role: "EMPLEADO", empresaId: null, passwordMustChange: false }),
  ).toString("base64url");
  const fakeAccessToken = `${header}.${payload}.signature`;

  t.mock.module("./token-manager", {
    namedExports: {
      loadTokens: async () => ({ accessToken: "old-at", refreshToken: "old-rt" }),
      saveTokens: async () => {
        saveTokensCallCount += 1;
      },
      clearTokens: async () => {
        throw new Error("clearTokens no debería llamarse en el camino feliz");
      },
    },
  });
  t.mock.module("../api/auth", {
    namedExports: {
      refresh: async () => ({
        accessToken: fakeAccessToken,
        refreshToken: "new-rt",
        expiresIn: 900,
      }),
    },
  });

  const { bootstrapSession } = await import("./bootstrap");
  const result = await bootstrapSession();

  assert.equal(result.authenticated, true);
  assert.deepEqual(result.user, {
    id: "user-1",
    role: "EMPLEADO",
    empresaId: null,
    passwordMustChange: false,
  });
  assert.equal(saveTokensCallCount, 1);
});
