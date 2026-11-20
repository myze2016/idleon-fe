import { weaponDetails, type AccountProgress, type WeaponType } from "@/lib/character";
import { drawMenuInfo } from "./menu-button";
import { drawCharacterInfoPortrait, drawWeaponTypeIcon } from "./character-info-icons";

/** Shared account identity and progression block for room and adventure HUDs. */
export function drawPlayerInfo(ctx: CanvasRenderingContext2D, { x, y, width, height = 100, name, weapon, progression }: {
  x: number; y: number; width: number; height?: number; name: string; weapon?: WeaponType; progression: AccountProgress;
}) {
  ctx.save();
  drawMenuInfo(ctx, x, y, width, height);
  const small = width < 200, left = x + 12, inner = width - 24, identityX = weapon ? left + 34 : left;
  const text = (value: string, tx: number, ty: number, size: number, bold = false, maxWidth = inner) => {
    ctx.font = `${bold ? "600 " : ""}${size}px system-ui`;
    ctx.fillStyle = bold ? "#43311f" : "#66513b";
    ctx.fillText(value, tx, ty, Math.max(10, maxWidth));
  };
  if (weapon) {
    drawCharacterInfoPortrait(ctx, weapon, left, y + 12, 28);
    drawWeaponTypeIcon(ctx, weapon, identityX, y + 31, 13);
  }
  text(name, identityX, y + 25, small ? 13 : 17, true, x + width - 12 - identityX);
  if (weapon) text(weaponDetails(weapon).label, identityX + 16, y + 42, small ? 10 : 11, false, x + width - 28 - identityX);
  text(`Account Lv. ${progression.level}`, left, y + 61, small ? 11 : 12, true);
  text(`EXP: ${progression.exp.toLocaleString()}/${progression.expToNextLevel.toLocaleString()}`, left, y + 78, small ? 10 : 11);
  ctx.fillStyle = "#8d7455"; ctx.fillRect(left, y + 86, inner, 5);
  const ratio = Math.max(0, Math.min(1, progression.exp / Math.max(1, progression.expToNextLevel)));
  ctx.fillStyle = "#8c6231"; ctx.fillRect(left, y + 86, inner * ratio, 5);
  ctx.restore();
}
