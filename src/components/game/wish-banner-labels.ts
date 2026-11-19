import { weaponDetails, type WeaponType } from "@/lib/character";
import { drawCharacterInfoPortrait, drawWeaponTypeIcon } from "./character-info-icons";

export const wishBannerCharacters: Record<"normal" | "special", { name: string; weapon: WeaponType; x: number; y: number }[]> = {
  normal: [
    { name: "Sword and Shield", weapon: "sword-and-shield", x: .33, y: .25 },
    { name: "Bow", weapon: "bow", x: .73, y: .15 },
    { name: "Wand", weapon: "wand", x: .64, y: .42 },
  ],
  special: [
    { name: "Kent", weapon: "glaive", x: .13, y: .09 },
    { name: "Juan", weapon: "ice-staff", x: .44, y: .26 },
    { name: "Jeffrey", weapon: "dual-axe", x: .76, y: .18 },
  ],
};

export function drawWishBannerLabels(ctx: CanvasRenderingContext2D, pool: "normal" | "special",
  artwork: { x: number; y: number; width: number; height: number },
  banner: { x: number; y: number; width: number; height: number }) {
  const compact = banner.width < 600;
  ctx.save(); ctx.textAlign = "center"; ctx.textBaseline = "middle";
  wishBannerCharacters[pool].forEach((character, index) => {
    const width = compact ? (banner.width - 32) / 3 : Math.max(140, Math.min(240, artwork.width * .16));
    const height = compact ? 48 : Math.max(54, Math.min(80, artwork.height * .14));
    const x = compact ? banner.x + 8 + index * (width + 8)
      : Math.max(banner.x + 8, Math.min(banner.x + banner.width - width - 8, artwork.x + artwork.width * character.x - width / 2));
    const y = compact ? banner.y + banner.height - height - 8
      : Math.max(banner.y + 8, Math.min(banner.y + banner.height - height - 8, artwork.y + artwork.height * character.y - height / 2));
    ctx.fillStyle = pool === "special" ? "#15172bbd" : "#fff5dbc7";
    ctx.strokeStyle = pool === "special" ? "#dac285" : "#654a2a";
    ctx.lineWidth = compact ? 1 : 2;
    ctx.beginPath(); ctx.roundRect(x, y, width, height, compact ? 6 : 12); ctx.fill(); ctx.stroke();
    const font = compact ? 11 : Math.max(13, Math.min(21, width * .085));
    const portraitSize = compact ? 18 : Math.min(40, height * .65);
    drawCharacterInfoPortrait(ctx, character.weapon, x + (compact ? 6 : 8), compact ? y + 4 : y + (height - portraitSize) / 2, portraitSize);
    const nameX = x + portraitSize + (compact ? 12 : 16);
    ctx.textAlign = "left";
    ctx.fillStyle = pool === "special" ? "#fff1cc" : "#382511";
    ctx.font = `700 ${font}px system-ui`;
    ctx.fillText(character.name, nameX, y + height * .3, width - (nameX - x) - 6);
    ctx.fillStyle = pool === "special" ? "#d1deff" : "#624a30";
    ctx.font = `500 ${compact ? 9 : font * .76}px system-ui`;
    const weaponX = compact ? x + 8 : nameX, weaponSize = compact ? 12 : 15;
    drawWeaponTypeIcon(ctx, character.weapon, weaponX, y + height * .73 - weaponSize / 2, weaponSize);
    ctx.fillText(weaponDetails(character.weapon).label, weaponX + weaponSize + 5, y + height * .73, width - (weaponX - x) - weaponSize - 11);
  });
  ctx.restore();
}

export function drawWishBannerBorder(ctx: CanvasRenderingContext2D, pool: "normal" | "special", x: number, y: number, width: number, height: number) {
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x, y, width, height, 8);
  ctx.strokeStyle = "#3f2b20"; ctx.lineWidth = 7; ctx.stroke();
  ctx.strokeStyle = pool === "special" ? "#e5c984" : "#ca9a4b"; ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath(); ctx.roundRect(x + 4, y + 4, width - 8, height - 8, 5);
  ctx.strokeStyle = pool === "special" ? "#cbb8ee99" : "#fff0bcaa"; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
}
