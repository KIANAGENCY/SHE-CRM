import test from "node:test";
import assert from "node:assert/strict";
import { seed } from "../src/data.js";
import { fromRows, toRows } from "../src/cloud.js";

test("la conversión de Supabase conserva los datos esenciales del CRM", () => {
  const original = seed();
  const workspaceId = "11111111-1111-1111-1111-111111111111";
  const restored = fromRows(toRows(original, workspaceId), "Dirección");

  assert.equal(restored.role, "Dirección");
  assert.equal(restored.clients.length, original.clients.length);
  assert.deepEqual(restored.clients[0], original.clients[0]);
  assert.deepEqual(restored.opportunities[0], original.opportunities[0]);
  assert.deepEqual(restored.products[0], original.products[0]);
  assert.deepEqual(restored.orders[0], {
    ...original.orders[0],
    quoteId: null,
    delivered: null,
  });
  assert.deepEqual(restored.samples[0], original.samples[0]);
  assert.deepEqual(restored.conversations[0], original.conversations[0]);
});

test("las filas siempre quedan aisladas por espacio de trabajo", () => {
  const workspaceId = "22222222-2222-2222-2222-222222222222";
  const rows = toRows(seed(), workspaceId);

  for (const collection of Object.values(rows)) {
    assert.ok(collection.every((row) => row.workspace_id === workspaceId));
  }
});
