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
  const columns = width >= 640 ? 4 : 3;
  const equalWidth = Math.min(104, (width - 32 - gap * (columns - 1)) / columns);
  const totalWidth = actions.reduce((sum, action) => sum + action.width, 0) + gap * (actions.length - 1);
  let x = width - 16 - totalWidth;
  return actions.map((action, index) => {
    const buttonWidth = singleRow ? action.width : equalWidth;
    const left = singleRow ? x : width - 16 - (equalWidth * columns + gap * (columns - 1)) + index % columns * (equalWidth + gap);
    x += buttonWidth + gap;
    return { ...action, x: left, y: singleRow ? 16 : 128 + Math.floor(index / columns) * 54, width: buttonWidth, height: 46 };
  });
}
