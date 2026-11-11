const actions = [
  { id: "character", label: "Character", width: 104 },
  { id: "shop", label: "Shop", width: 80 },
  { id: "artifacts", label: "Artifacts", width: 104 },
  { id: "team", label: "Team", width: 80 },
  { id: "wish", label: "Wish", width: 80 },
  { id: "menu", label: "Menu", width: 88 },
] as const;

export function roomToolbarLayout(width: number) {
  const singleRow = width >= 950, gap = 8;
  const equalWidth = Math.min(104, (width - 48) / 3);
  const totalWidth = actions.reduce((sum, action) => sum + action.width, 0) + gap * 5;
  let x = width - 16 - totalWidth;
  return actions.map((action, index) => {
    const buttonWidth = singleRow ? action.width : equalWidth;
    const left = singleRow ? x : width - 16 - (equalWidth * 3 + gap * 2) + index % 3 * (equalWidth + gap);
    x += buttonWidth + gap;
    return { ...action, x: left, y: singleRow ? 16 : index < 3 ? 128 : 182, width: buttonWidth, height: 46 };
  });
}
