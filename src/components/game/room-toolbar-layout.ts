const actions = [
  { id: "character", label: "Character", width: 104 },
  { id: "shop", label: "Shop", width: 80 },
  { id: "artifacts", label: "Artifacts", width: 104 },
  { id: "inventory", label: "Inventory", width: 104 },
  { id: "team", label: "Team", width: 80 },
  { id: "wish", label: "Wish", width: 80 },
  { id: "wiki", label: "Wiki", width: 80 },
  { id: "pvp", label: "PvP", width: 80 },
  { id: "menu", label: "Menu", width: 88 },
] as const;

export function roomToolbarLayout(width: number) {
  const singleRow = width >= 1060, gap = 8;
  const columns = singleRow ? actions.length : width >= 640 ? 5 : 3;
  const buttonWidth = Math.min(singleRow ? 80 : 88, (width - 32 - gap * (columns - 1)) / columns);
  const totalWidth = buttonWidth * columns + gap * (columns - 1);
  const left = width - 16 - totalWidth;
  return actions.map((action, index) => ({
    ...action, x: left + index % columns * (buttonWidth + gap),
    y: singleRow ? 16 : 128 + Math.floor(index / columns) * 92,
    width: buttonWidth, height: 88,
  }));
}
