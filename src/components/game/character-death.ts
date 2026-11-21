export const characterDeathSeconds = 0.8;

// The caller has already translated to the character's feet and applied avatar scale.
export function applyCharacterDeath(ctx: CanvasRenderingContext2D, age: number, facing: number) {
  const fall = Math.min(1, Math.max(0, age / 0.38));
  const fade = Math.max(0, (age - 0.3) / (characterDeathSeconds - 0.3));
  ctx.globalAlpha *= Math.max(0, 1 - fade);
  ctx.rotate(-facing * fall * fall * Math.PI * 0.48);
}
