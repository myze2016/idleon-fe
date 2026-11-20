import { drawStatusArt } from "./skill-effect-art";

function drawBattleLabel(ctx: CanvasRenderingContext2D, label: string, y: number, color: string) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "600 10px system-ui";
  ctx.lineJoin = "round";
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#211b16";
  ctx.fillStyle = color;
  ctx.strokeText(label, 0, y, 88);
  ctx.fillText(label, 0, y, 88);
  ctx.restore();
}

type FighterHud = {
  name: string; hp: number; maxHp: number; mp?: number; maxMp?: number;
  enemy?: boolean; skill?: string; castProgress?: number; statuses?: number;
};

export function drawFighterHud(ctx: CanvasRenderingContext2D, x: number, ground: number, avatarScale: number, headY: number, fighter: FighterHud) {
  const scale = Math.max(0.8, Math.min(1.25, avatarScale));
  ctx.save();
  ctx.translate(x, ground);
  ctx.scale(scale, scale);
  const gaugeY = (headY - ground) / scale - 18;
  function bar(y: number, height: number, fraction: number, color: string) {
    ctx.fillStyle = "#29221d";
    ctx.fillRect(-24, y, 48, height);
    ctx.fillStyle = color;
    ctx.fillRect(-23, y + 1, 46 * Math.max(0, Math.min(1, fraction)), height - 2);
  }
  bar(gaugeY, 6, fighter.hp / fighter.maxHp, fighter.enemy ? "#d8786f" : "#8ac377");
  if (fighter.maxMp && fighter.mp !== undefined) {
    bar(gaugeY + 8, 4, fighter.mp / fighter.maxMp, "#70acd3");
  }
  if (fighter.castProgress !== undefined) bar(gaugeY + 14, 3, fighter.castProgress, "#f0d68a");
  if (fighter.skill) drawBattleLabel(ctx, fighter.skill, gaugeY - 4, "#ffe68f");
  drawBattleLabel(ctx, fighter.name, 13, "#fff5df");
  if (fighter.statuses) drawStatusArt(ctx, fighter.statuses, 24);
  ctx.restore();
}
