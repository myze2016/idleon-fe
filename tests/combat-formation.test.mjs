import assert from "node:assert/strict";
import { test } from "node:test";
import { adventureFormation, combatEncounterDistance, combatRangedRange, combatVisibleDistance, interpolateCameraTravel, projectBattlefieldParty, projectCombatGap, projectEnemyX, projectParty } from "../src/components/game/adventure-formation.ts";

test("battle camera uses the same scale and range spacing with one or two formations", () => {
  for (const [width, height] of [[320, 600], [640, 560], [1200, 760]]) {
    const adventure = adventureFormation(width, height, 6);
    const arena = adventureFormation(width, height, 6, 6);
    assert.equal(adventure.avatarScale, arena.avatarScale);
    assert.equal(projectCombatGap(70, adventure), projectCombatGap(70, arena));
    assert.equal(projectCombatGap(combatEncounterDistance, adventure), projectCombatGap(combatEncounterDistance, arena));
    assert.equal(projectCombatGap(-70, arena), -arena.contactReach);
    const openingGap = projectCombatGap(combatEncounterDistance, arena);
    assert.ok(openingGap > projectCombatGap(combatRangedRange, arena));
    assert.ok(openingGap + arena.spacing * 10 < width);
  }
});

test("melee can appear ahead of ranged allies and overlapping fighters remain visible", () => {
  const formation = adventureFormation(640, 560, 3);
  const party = projectParty([120, 720, 720], () => true, formation);
  assert.equal(party.frontWorld, 720);
  assert.equal(party.screen[1], party.frontScreen);
  assert.ok(party.screen[0] >= 16 && party.screen[0] < party.screen[2] && party.screen[2] < party.screen[1]);
});

test("ranged camera anchor holds its slot while melee advances", () => {
  const formation = adventureFormation(640, 560, 2);
  const anchor = { width: 640, slot: 1 };
  const before = projectParty([264, 200], () => true, formation, anchor);
  const after = projectParty([900, 200], () => true, formation, anchor);
  assert.equal(before.screen[1], formation.home(1));
  assert.equal(after.screen[1], before.screen[1]);
  assert.ok(after.screen[0] > before.screen[0] && after.screen[0] < 640);
});

test("battle scroll follows shared travel frames and stays still during engagement", () => {
  assert.equal(interpolateCameraTravel(undefined, undefined, 0.5), undefined);
  assert.equal(interpolateCameraTravel(undefined, 12, 0.5), 6);
  assert.equal(interpolateCameraTravel(20, 20, 0.75), 20);
  assert.equal(interpolateCameraTravel(20, 32, 0.5), 26);
  assert.equal(interpolateCameraTravel(32, undefined, 1), 32);
});

test("a planted fighter stays on the same pixel while melee closes in", () => {
  const width = 640, formation = adventureFormation(width, 560, 2);
  const before = projectBattlefieldParty([300, 240], () => true, 300, width, formation);
  const after = projectBattlefieldParty([750, 240], () => true, 300, width, formation);
  assert.equal(before[1], after[1]);
  assert.ok(after[0] > before[0] && after[0] < width);
});

test("opponents spawn beyond the right edge and reach the screen before attack range", () => {
  for (const [width, height] of [[320, 600], [640, 560], [1200, 760]]) {
    for (const count of [1, 6]) {
      const formation = adventureFormation(width, height, count, count);
      const front = formation.home(0);
      const x = gap => projectEnemyX(gap, front, width, formation);
      assert.ok(x(combatEncounterDistance) >= width + 56 - 1e-9);
      assert.equal(x(combatVisibleDistance), width);
      assert.ok(x(combatRangedRange) < width);

      const entryStep = x(combatVisibleDistance) - x(combatVisibleDistance - 12);
      const rangedStep = x(combatRangedRange) - x(combatRangedRange - 12);
      assert.ok(Math.abs(entryStep - rangedStep) < 1e-9, "screen speed should stay constant during approach");
      assert.ok(x(combatVisibleDistance + 12) - x(combatVisibleDistance) < entryStep + 0.25);
    }
  }
});
