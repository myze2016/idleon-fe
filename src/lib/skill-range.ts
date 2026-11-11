const rangedSkills = ["Shackle", "Fireball", "Inferno", "Mass Inferno", "Throw Spear", "Long Shot"];

export function isRangedSkill(label?: string) {
  return !!label && rangedSkills.some((name) => label === name || label.startsWith(`Casting ${name}`) || label.startsWith(`${name} ·`));
}
