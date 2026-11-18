import assert from "node:assert/strict";
import { test } from "node:test";
import { deploymentBackendOrigin } from "../deployment-config.mjs";

test("local configuration supports proxy and existing direct API settings", () => {
  assert.equal(deploymentBackendOrigin({}), "http://localhost:8000");
  assert.equal(deploymentBackendOrigin({ NEXT_PUBLIC_API_URL: "/api" }), "http://localhost:8000");
  assert.equal(deploymentBackendOrigin({ NEXT_PUBLIC_API_URL: "http://localhost:8000/api" }), "http://localhost:8000");
  assert.equal(deploymentBackendOrigin({ BACKEND_URL: "https://backend.example/", NEXT_PUBLIC_API_URL: "/api" }), "https://backend.example");
});

test("Vercel accepts only a configured public HTTPS backend and same-origin browser API", () => {
  const valid = { VERCEL: "1", BACKEND_URL: "https://game.up.railway.app", NEXT_PUBLIC_API_URL: "/api" };
  assert.equal(deploymentBackendOrigin(valid), valid.BACKEND_URL);
  assert.throws(() => deploymentBackendOrigin({ VERCEL: "1" }), /Set BACKEND_URL/);
  assert.throws(() => deploymentBackendOrigin({ ...valid, NEXT_PUBLIC_API_URL: "http://localhost:8000/api" }), /NEXT_PUBLIC_API_URL/);
  for (const BACKEND_URL of ["http://backend.example", "https://localhost", "https://127.0.0.1", "https://api.railway.internal"]) {
    assert.throws(() => deploymentBackendOrigin({ ...valid, BACKEND_URL }), /public HTTPS/);
  }
});

test("backend URLs reject paths, query strings, unsupported schemes and embedded credentials", () => {
  for (const BACKEND_URL of ["not-a-url", "https://backend.example/api", "https://backend.example?token=x", "https://user:secret@backend.example", "ftp://backend.example"]) {
    assert.throws(() => deploymentBackendOrigin({ BACKEND_URL }), /BACKEND_URL/);
  }
});
