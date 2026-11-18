import type { CSSProperties } from "react";

export const infoBoxSkins = [
  { name: "Classic", top: "#efdfb8", bottom: "#d7bc8c", border: "#805b35", inset: "#b38a5288", shadow: "#38231255", active: "#805523" },
  { name: "Verdant", top: "#e6eed5", bottom: "#adc9a9", border: "#47755a", inset: "#7ca584aa", shadow: "#234a3655", active: "#284e37" },
  { name: "Sapphire", top: "#e8effb", bottom: "#b3c7e5", border: "#486b9b", inset: "#86a6cfaa", shadow: "#243c6655", active: "#294873" },
  { name: "Royal Gold", top: "#fff3c9", bottom: "#e7c476", border: "#986723", inset: "#d1a247cc", shadow: "#72501955", active: "#754a10" },
] as const;

export const donationTiers = [
  { tier: 1, name: "Supporter", minimumAmount: 10, skin: "Verdant" },
  { tier: 2, name: "Backer", minimumAmount: 50, skin: "Sapphire" },
  { tier: 3, name: "Patron", minimumAmount: 100, skin: "Royal Gold" },
] as const;

export function infoBoxSkin(tier: number) { return infoBoxSkins[tier] ?? infoBoxSkins[0]; }
export function infoBoxStyle(tier: number): CSSProperties {
  const skin = infoBoxSkin(tier);
  return { "--info-top": skin.top, "--info-bottom": skin.bottom, "--info-border": skin.border, "--info-inset": skin.inset, "--info-shadow": skin.shadow } as CSSProperties;
}
