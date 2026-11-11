export function battleHudLayout(width: number, height: number) {
  const compact = height < 480 || width < 640;
  const tight = width < 640 && height < 360;
  const pad = tight ? 6 : compact ? 10 : 16, gap = tight ? 4 : compact ? 6 : 8;
  const buttonHeight = tight ? 28 : compact ? 34 : 48;
  const buttonWidth = compact ? 78 : 104, returnWidth = compact ? 110 : 132;
  const toolbarWidth = buttonWidth * 3 + returnWidth + gap * 3;
  const singleRow = width >= toolbarWidth + 170 + pad * 3;
  const nameWidth = Math.max(90, Math.min(compact ? 210 : 260, singleRow ? width - toolbarWidth - pad * 3 : width - returnWidth - pad * 3));
  const nameHeight = tight ? 54 : compact ? 68 : 88;
  const rowY = singleRow ? pad : pad + nameHeight + gap;
  const navWidth = singleRow ? buttonWidth : Math.min(buttonWidth, (width - pad * 2 - gap * 2) / 3);
  const startX = singleRow ? width - pad - toolbarWidth : width - pad - (navWidth * 3 + gap * 2);
  const controls = (["Character", "Shop", "Artifacts"] as const).map((label, index) => ({ label, x: startX + index * (navWidth + gap), y: rowY, width: navWidth, height: buttonHeight }));
  const returnButton = { x: width - pad - returnWidth, y: pad, width: returnWidth, height: buttonHeight };
  const progressHeight = tight ? 46 : compact ? 64 : 110, progressY = height - pad - progressHeight;
  const logY = singleRow ? pad + nameHeight + gap : rowY + buttonHeight + gap;
  const rowGap = tight ? 2 : compact ? 4 : 6;
  const rowHeight = Math.max(8, Math.min(compact ? 26 : 38, (progressY - gap - logY - rowGap * 4) / 5));
  return { compact, pad, gap, nameWidth, nameHeight, controls, returnButton, progressHeight, progressY,
    logY, rowGap, rowHeight, fontSize: compact ? 11 : 13 };
}
