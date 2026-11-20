const actions = [
  { id: "character", label: "Character", width: 104 },
  { id: "shop", label: "Shop", width: 80 },
  { id: "artifacts", label: "Artifacts", width: 104 },
  { id: "inventory", label: "Inventory", width: 104 },
  { id: "team", label: "Team", width: 80 },
  { id: "wish", label: "Wish", width: 80 },
  { id: "wiki", label: "Wiki", width: 80 },
  { id: "gathering", label: "Gathering", width: 104 },
  { id: "endless", label: "Endless", width: 88 },
  { id: "pvp", label: "PvP", width: 80 },
  { id: "donation", label: "Support", width: 88 },
  { id: "patch-notes", label: "Patch Notes", width: 104 },
  { id: "menu", label: "Menu", width: 88 },
] as const;

export function roomToolbarLayout(width: number, height = 600) {
  const singleRow = width >= 1560, gap = 8;
  const columns = singleRow ? actions.length : width >= 960 ? 6 : width >= 640 ? 5 : 3;
  const rows = Math.ceil(actions.length / columns);
  const top = width >= 960 ? 16 : 164;
  // Reserve the bottom HUD and fit all toolbar rows on smaller screens.
  const buttonHeight = Math.min(88, Math.max(44, (height - 158 - top - gap * (rows - 1)) / rows));
  const buttonWidth = Math.min(singleRow ? 80 : 88, (width - 32 - gap * (columns - 1)) / columns);
  const totalWidth = buttonWidth * columns + gap * (columns - 1);
  const left = width - 16 - totalWidth;
  return actions.map((action, index) => ({
    ...action, x: left + index % columns * (buttonWidth + gap),
    y: top + Math.floor(index / columns) * (buttonHeight + gap),
    width: buttonWidth, height: buttonHeight,
  }));
}
