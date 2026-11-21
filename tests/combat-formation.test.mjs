import assert from "node:assert/strict";
import { test } from "node:test";
import { adventureFormation, BattlefieldFraming, battlefieldHasOpponent, battlefieldView, combatEncounterDistance, combatRangedRange, interpolateCameraTravel, PartyMotion, projectCombatGap, regroupProgress, victoryRegroupSeconds } from "../src/components/game/adventure-formation.ts";

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
  const positions = [120, 720, 720];
  const view = battlefieldView(720, positions, 640, formation);
  const screen = view.party(positions, () => true, true);
  assert.equal(screen[1], view.project(720));
  assert.ok(screen[0] >= 24 && screen[0] < screen[2] && screen[2] < screen[1]);
});

test("ranged camera anchor holds its slot while melee advances", () => {
  const formation = adventureFormation(640, 560, 2);
  const project = positions => battlefieldView(200, positions, 640, formation).party(positions, () => true, true);
  const before = project([264, 200]), after = project([900, 200]);
  assert.equal(before[1], formation.leadingX);
  assert.equal(after[1], before[1]);
  assert.ok(after[0] > before[0] && after[0] < 640);
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
  const project = positions => battlefieldView(300, positions, width, formation).party(positions, () => true, true);
  const before = project([300, 240]), after = project([750, 240]);
  assert.equal(before[1], after[1]);
  assert.ok(after[0] > before[0] && after[0] < width);
});

test("crossing fighters keep continuous screen positions during regrouping", () => {
  const width = 640, formation = adventureFormation(width, 560, 2);
  const project = positions => battlefieldView(300, positions, width, formation).party(positions, () => true, true);
  const before = project([300, 299.99]);
  const overlap = project([300, 300]);
  const after = project([300, 300.01]);
  assert.ok(overlap[0] - overlap[1] >= 5);
  before.forEach((x, slot) => assert.ok(Math.abs(x - after[slot]) < 0.1));
});

test("victory regroup starts at the last position and settles at home", () => {
  assert.equal(regroupProgress(0), 0);
  assert.equal(regroupProgress(victoryRegroupSeconds / 2), 0.5);
  assert.equal(regroupProgress(victoryRegroupSeconds), 1);
  assert.equal(regroupProgress(victoryRegroupSeconds + 1), 1);
});

test("a new enemy interrupts regrouping at the last displayed position", () => {
  for (const waitsForPlayback of [false, true]) {
    const motion = new PartyMotion();
    const fighters = [{ id: "front", x: 400, home: 200 }, { id: "rear", x: 330, home: 140 }];
    assert.deepEqual(motion.update("combat", 0, 640, fighters).map(fighter => fighter.x), [400, 330]);
    assert.deepEqual(motion.update("regroup", 1, 640, fighters).map(fighter => fighter.x), [400, 330]);
    const returning = motion.update("regroup", 1 + victoryRegroupSeconds / 2, 640, fighters);
    assert.ok(returning.every(fighter => fighter.direction === -1));
    const midRegroup = returning.map(fighter => fighter.x);
    const expected = [300, 235];
    midRegroup.forEach((x, index) => assert.ok(Math.abs(x - expected[index]) < 1e-8));
    const resumed = [{ ...fighters[0], x: 350 }, { ...fighters[1], x: 220 }];
    if (waitsForPlayback) {
      assert.deepEqual(motion.update("hold", 1.7, 640, resumed).map(fighter => fighter.x), midRegroup);
      assert.deepEqual(motion.update("hold", 2.8, 640, resumed).map(fighter => fighter.x), midRegroup);
    }
    assert.deepEqual(motion.update("combat", 3, 640, resumed).map(fighter => fighter.x), midRegroup);
    for (let frame = 1; frame <= 30; frame++) motion.update("combat", 3 + frame / 60, 640, resumed);
    assert.deepEqual(motion.update("combat", 3.51, 640, resumed).map(fighter => fighter.x), [350, 220]);
  }
});

test("re-engaging a distant target keeps a walking pace on narrow and wide screens", () => {
  for (const width of [320, 640, 1200]) {
    const motion = new PartyMotion();
    const fighter = { id: "melee", x: width * 0.85, home: width * 0.2 };
    const frame = (phase, time) => motion.update(phase, time, width, [fighter])[0];
    const home = frame("regroup", 0).x;
    assert.equal(frame("combat", 1).x, home);
    let previous = home;
    for (let index = 1; index <= 27; index++) {
      const current = frame("combat", 1 + index / 60);
      assert.ok(current.x - previous <= 120 * Math.max(1, width / combatRangedRange) / 60 + 1e-8);
      previous = current.x;
    }
    assert.ok(previous < fighter.x);
    const afterPause = frame("combat", 2);
    assert.ok(afterPause.x - previous <= 120 * Math.max(1, width / combatRangedRange) * 0.05 + 1e-8);
  }
});

test("a ranged attacker is inside the frame at maximum range, even when the party is spread out", () => {
  for (const [width, height] of [[320, 600], [640, 560], [1200, 760]]) {
    for (const count of [1, 6]) {
      const formation = adventureFormation(width, height, count, count);
      const positions = [1600, 0, -400], view = battlefieldView(0, positions, width, formation);
      const hostile = positions[0] + combatRangedRange;
      assert.ok(battlefieldHasOpponent(positions, [hostile]));
      assert.ok(!battlefieldHasOpponent(positions, [hostile + 1]));
      assert.ok(view.project(hostile) <= width - 24);
      assert.ok(view.party(positions, () => true, true).every(x => x >= 24 && x <= width - 24));
      const opening = battlefieldView(0, [0], width, formation);
      assert.ok(opening.project(combatEncounterDistance) > width);
    }
  }
});

test("enemies keep their screen positions on the death frame as camera bounds settle", () => {
  const width = 640, formation = adventureFormation(width, 560, 3);
  for (const { survivors, newCamera, enemy } of [
    { survivors: [-600, 100], newCamera: 100, enemy: 800 },
    { survivors: [100, 650], newCamera: 450, enemy: 50 },
  ]) {
    const framing = new BattlefieldFraming();
    const before = framing.view(300, [-600, 100, 650], width, formation, 0).project(enemy);
    const onDeath = framing.view(newCamera, survivors, width, formation, 0).project(enemy);
    assert.equal(onDeath, before);
    let previous = onDeath;
    for (let frame = 1; frame <= 180; frame++) {
      const view = framing.view(newCamera, survivors, width, formation, frame / 60);
      const current = view.project(enemy);
      assert.ok(Math.abs(current - previous) < 6);
      assert.ok(view.project(Math.max(...survivors) + combatRangedRange) < width);
      previous = current;
    }
    assert.equal(previous, battlefieldView(newCamera, survivors, width, formation).project(enemy));
  }
});
