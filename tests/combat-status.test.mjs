import assert from "node:assert/strict";
import { test } from "node:test";
import { activeCombatStatuses } from "../src/lib/combat-status.ts";

test("overlapping status visuals expire at their own deadlines without another battle event", () => {
  const ends = { stun: 3, freeze: 4, shield: 5, speed: 6, bleed: null };
  assert.deepEqual(activeCombatStatuses(ends, 2.9), ["stun", "freeze", "shield", "speed", "bleed"]);
  assert.deepEqual(activeCombatStatuses(ends, 4), ["shield", "speed", "bleed"]);
  assert.deepEqual(activeCombatStatuses(ends, 6), ["bleed"]);
  assert.deepEqual(activeCombatStatuses(null, 6, 31), []);
});

test("older playback with only status flags still shows effects", () => {
  assert.deepEqual(activeCombatStatuses(undefined, 0, 5), ["poison", "stun"]);
});
