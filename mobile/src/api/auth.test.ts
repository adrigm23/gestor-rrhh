import { test } from "node:test";
import assert from "node:assert/strict";
import { ApiError, NetworkError } from "./errors";
import { refresh } from "./auth";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Caso 1 — Refresh correcto: refresh -> HTTP 200.
test("refresh() con HTTP 200 devuelve el resultado parseado", async (t) => {
  const validBody = { accessToken: "at", refreshToken: "rt", expiresIn: 900 };
  t.mock.method(globalThis, "fetch", async () => jsonResponse(200, validBody));

  const result = await refresh("current-refresh-token");

  assert.deepEqual(result, validBody);
});

// Caso 2 — Refresh rechazado: refresh -> HTTP 401.
test("refresh() con HTTP 401 lanza ApiError con status 401", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    jsonResponse(401, { error: { code: "unauthorized", message: "no" } }),
  );

  await assert.rejects(
    () => refresh("token-invalido"),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.ok(!(error instanceof NetworkError));
      assert.equal(error.status, 401);
      return true;
    },
  );
});

// Caso 3 — Sin conexión durante refresh: fetch() lanza.
test("refresh() cuando fetch lanza produce NetworkError (no ApiError)", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new TypeError("Network request failed");
  });

  await assert.rejects(
    () => refresh("cualquier-token"),
    (error: unknown) => {
      assert.ok(error instanceof NetworkError);
      assert.ok(!(error instanceof ApiError));
      return true;
    },
  );
});

// Caso 4 — Error HTTP diferente: refresh -> HTTP 500.
test("refresh() con HTTP 500 lanza ApiError con status 500, no NetworkError", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    jsonResponse(500, { error: { code: "internal_error", message: "oops" } }),
  );

  await assert.rejects(
    () => refresh("token"),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.ok(!(error instanceof NetworkError));
      assert.equal(error.status, 500);
      return true;
    },
  );
});
