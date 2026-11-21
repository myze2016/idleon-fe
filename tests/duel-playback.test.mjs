import assert from "node:assert/strict";
import { test } from "node:test";
import { indexCombatMovement, indexDuelActions, movementSample } from "../src/lib/duel-playback.ts";

test("an attack between movement ticks does not interrupt the position interpolation", () => {
  const first = { kind: "move", at: 0.1, x: [100], hp: [10] };
  const attack = { kind: "attack", at: 0.18, x: [100], hp: [10] };
  const castEnd = { kind: "move", label: "Cast ended", at: 0.19, x: [100], hp: [10] };
  const second = { kind: "move", at: 0.2, x: [112], hp: [10] };
  const { motion } = indexDuelActions([first, attack, castEnd, second]);
  const { previous, next, blend } = movementSample(motion, 0.15);
  assert.equal(previous, first);
  assert.equal(next, second);
  assert.ok(Math.abs(blend - 0.5) < 1e-8);
});

test("movement after a long stop begins on its own tick", () => {
  const frames = [{ at: 0.2 }, { at: 1 }, { at: 1 }];
  assert.equal(movementSample(frames, 0.7).blend, 0);
  assert.equal(movementSample(frames, 0.95).next, frames[2]);
  assert.ok(Math.abs(movementSample(frames, 0.95).blend - 0.5) < 1e-8);
});

test("Expedition uses the same position samples with current and older recordings", () => {
  const opening = { at: 0, x: [100] };
  const first = { at: 0.1, x: [112], kind: "move" };
  const cast = { at: 0.18, x: [112], kind: "cast" };
  const second = { at: 0.2, x: [124], kind: "move" };
  const recording = [opening, first, cast, second];
  const current = indexCombatMovement(recording);
  const legacy = indexCombatMovement(recording.map(({ at, x }) => ({ at, x })));
  assert.deepEqual(current.map(frame => frame.at), [0, 0.1, 0.2]);
  assert.deepEqual(legacy.map(frame => frame.at), current.map(frame => frame.at));
  assert.ok(Math.abs(movementSample(current, 0.15).blend - 0.5) < 1e-8);
});
