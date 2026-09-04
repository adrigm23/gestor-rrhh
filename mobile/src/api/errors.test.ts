import { test } from "node:test";
import assert from "node:assert/strict";
import { ApiError, NetworkError } from "./errors";

test("NetworkError es un Error con name correcto", () => {
  const error = new NetworkError();
  assert.ok(error instanceof Error);
  assert.equal(error.name, "NetworkError");
});

test("NetworkError preserva la causa original", () => {
  const original = new TypeError("fetch failed");
  const error = new NetworkError("mensaje", { cause: original });
  assert.equal(error.cause, original);
});

test("ApiError es un Error con name y status correctos", () => {
  const error = new ApiError(401);
  assert.ok(error instanceof Error);
  assert.equal(error.name, "ApiError");
  assert.equal(error.status, 401);
});

test("ApiError con status distinto conserva ese status", () => {
  const error = new ApiError(500);
  assert.equal(error.status, 500);
});

test("NetworkError y ApiError son tipos distintos", () => {
  const network = new NetworkError();
  const api = new ApiError(401);
  assert.ok(!(network instanceof ApiError));
  assert.ok(!(api instanceof NetworkError));
});
