export function battleHudLayout(width: number, height: number) {
  const compact = height < 480 || width < 640;
  const tight = width < 640 && height < 360;
  const pad = tight ? 6 : compact ? 10 : 16, gap = tight ? 4 : compact ? 6 : 8;
  const buttonHeight = tight ? 56 : compact ? 68 : 88;
  const buttonWidth = compact ? 78 : 104, returnWidth = compact ? 110 : 132;
  const toolbarWidth = buttonWidth * 5 + returnWidth + gap * 5;
  const singleRow = width >= toolbarWidth + 170 + 300 + pad * 3;
  const nameWidth = Math.max(90, Math.min(compact ? 210 : 260, singleRow ? width - toolbarWidth - 300 - pad * 3 : width - returnWidth - pad * 3));
  const nameHeight = tight ? 54 : compact ? 68 : 88;
  const currencyLeft = pad + nameWidth + gap;
  const currencyRight = singleRow ? width - pad - toolbarWidth - gap : width - pad - returnWidth - gap;
  const currenciesBesideName = currencyRight - currencyLeft >= 200;
  const currencyWidth = Math.min(180, ((currenciesBesideName ? currencyRight - currencyLeft : width - pad * 2) - gap) / 2);
  const currencyHeight = currencyWidth / 3;
  const currencyY = currenciesBesideName ? pad + (nameHeight - currencyHeight) / 2 : pad + nameHeight + gap;
  const currencies = (["gold", "wish"] as const).map((kind, index) => ({ kind,
    x: (currenciesBesideName ? currencyLeft : pad) + index * (currencyWidth + gap), y: currencyY, width: currencyWidth, height: currencyHeight }));
  const rowY = singleRow ? pad : currenciesBesideName ? pad + nameHeight + gap : currencyY + currencyHeight + gap;
  const navWidth = singleRow ? buttonWidth : Math.min(buttonWidth, (width - pad * 2 - gap * 4) / 5);
  const startX = singleRow ? width - pad - toolbarWidth : width - pad - (navWidth * 5 + gap * 4);
  const controls = (["Character", "Shop", "Artifacts", "Inventory", "Wiki"] as const).map((label, index) => ({ label, x: startX + index * (navWidth + gap), y: rowY, width: navWidth, height: buttonHeight }));
  const returnButton = { x: width - pad - returnWidth, y: pad, width: returnWidth, height: buttonHeight };
  const progressHeight = tight ? 46 : compact ? 64 : 110, progressY = height - pad - progressHeight;
  const logY = singleRow ? pad + nameHeight + gap : rowY + buttonHeight + gap;
  const rowGap = tight ? 2 : compact ? 4 : 6;
  const rowHeight = Math.max(8, Math.min(compact ? 26 : 38, (progressY - gap - logY - rowGap * 4) / 5));
  return { compact, pad, gap, nameWidth, nameHeight, controls, currencies, returnButton, progressHeight, progressY,
    logY, rowGap, rowHeight, fontSize: compact ? 11 : 13 };
}
