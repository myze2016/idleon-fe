import assert from "node:assert/strict";
import { test } from "node:test";
import { recordDamage } from "../src/lib/battle-damage.ts";

const empty = () => ["Kent", "Jeffrey"].map((name) => ({ id: name, name, basic: 0, skill: 0, dot: 0, total: 0 }));
const step = (characterId, kind, damage, actor = "team") => ({ characterId, kind, damage, actor });

test("Damage spread accumulates basic, skill, and status damage for the correct character", () => {
  let rows = empty();
  rows = recordDamage(rows, step("Kent", "attack", 10), 100);
  rows = recordDamage(rows, step("Kent", "skill", 30), 90);
  rows = recordDamage(rows, step("Jeffrey", "bleed", 15), 60);
  rows = recordDamage(rows, step("Jeffrey", "poison", 5), 45);
  assert.deepEqual(rows.map(({ basic, skill, dot, total }) => [basic, skill, dot, total]), [[10, 30, 0, 40], [0, 0, 20, 20]]);
});

test("Damage spread excludes overkill, enemy damage, healing, mana, and unknown sources", () => {
  const rows = recordDamage(empty(), step("Kent", "skill", 9999), 12);
  assert.equal(rows[0].total, 12);
  assert.strictEqual(recordDamage(rows, step("Kent", "attack", 20, "enemy"), 100), rows);
  assert.strictEqual(recordDamage(rows, step("Kent", "heal", 0), 100), rows);
  assert.strictEqual(recordDamage(rows, step("Kent", "mana", 0), 100), rows);
  assert.strictEqual(recordDamage(rows, step("missing", "attack", 20), 100), rows);
  assert.strictEqual(recordDamage(rows, step("Kent", "attack", 20), 0), rows);
});
