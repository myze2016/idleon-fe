IdleOn workspace frontend built with Next.js, TypeScript, and shadcn/ui.

TanStack Query manages session requests, login, and logout through `src/lib/auth.ts`.
Shared character queries and creation mutations are in `src/lib/character-api.ts`.
The dashboard displays the saved character and links to creation or the game.
Its provider is in `src/components/providers.tsx`. Zustand manages the room's menu
and Pause state in `src/components/game/game-store.tsx`, with a fresh store each
time the game page mounts. Animation and player movement stay in canvas refs.

The single-screen room is at `/game`, also linked from the dashboard. Use WASD or
arrow keys to move, or click/tap the floor to walk. The character name is drawn
at the top left and the Menu button at the top right, inside the canvas. Opening
Menu pauses movement and opens a centered canvas panel with Dashboard and Delete
account. Delete account resets the saved character and team, then returns to
character creation while keeping the login account. X or Escape closes the menu.
Entering `/game` requires signing in. New players choose a character name and one
of 11 weapon types; returning players load their saved character from the API.
Character name and weapon are saved in MariaDB through the Prisma-backed API.
Run the backend migrations and seed first (see `../idleon-be/README.md`).
Room position resets when you leave; your saved character is kept.
Scene rendering and the animation loop live in `src/components/game/room-canvas.tsx`.

Start launches an endless side-scrolling expedition in the selected Meadow or
Forest. The team automatically walks right while layered scenery scrolls left.
Front slots lead Back slots. An empty team uses the free starter in Front 1.
Return to room or Escape ends the expedition and keeps the team and location
selection. Distance resets for each expedition; hidden tabs pause progression.
The expedition renderer is `src/components/game/expedition-canvas.tsx` and uses
bounded procedural scenery instead of accumulating terrain objects.
Battles keep the starter character's name, account level, EXP progress bar, gold,
and a Character button visible inside the canvas. Character opens the full roster
and stats without leaving the expedition. Its overlay pauses local movement,
spawning, and battle playback; closing it resumes the same expedition state.

Forest randomly spawns a Coco Klan Warrior or Slinger walking toward the team.
The team stops for automatic combat, plays the server's attack timeline, and
continues after victory. Slinger encounters stop at ranged distance and show
sling projectiles. Health bars show combat damage. Team defeat returns to the
room; HP and MP persist between battles throughout an expedition; returning to the room and starting a new expedition restores them. Each regular defeated enemy awards 10 database-saved gold,
shown at the bottom left in both the expedition and the room. Meadow randomly
spawns Boar (40 HP), Slime (40 HP), and Plant (50 HP), each with 5 ATK and a
10-gold reward. Each type has its own canvas appearance and uses the same combat flow.

Monsters spawn every 1–15 seconds, including during regular battles: exactly 1 in Meadow and a random 1–2 in Forest, with equal chances for either Forest wave size. Bosses spawn alone and pause further spawning while on screen.
Multiple monsters can approach or wait on screen. Ready monsters fight in groups
after the current battle finishes; each has its own HP and attack timing, and
Inferno hits all living enemies in the group. The canvas removes defeated groups.
Meadow shows progress toward a saved random 38–45-monster boss threshold. Mutant
Boar is drawn larger with a Boss label and awards 80 gold.
Defeating the boss starts a new cycle; returning to the room resets both location counters to zero and rolls fresh boss targets on the next expedition.
Forest has its own independent 38–45-kill boss cycle and progress indicator.
Coco Klan Chief has 500 HP, 40 ATK, 10 DEF, ranged attacks, and rewards 20 gold.
Its larger crowned sprite uses ranged attack effects. Neither boss directly grants wishes.

Every defeated monster also awards 1 account EXP. The room shows account level,
current EXP toward the next level, and a progress bar next to gold. Level starts
at 1, with requirements doubling each level: 10, 20, 40, 80 EXP, etc. Each level
gained awards 100 wish currency and displays a level-up message during combat.
Progression belongs to the account and is shared
by the whole roster; wishing and changing the team do not reset it.

Wish opens a full-screen canvas with the database balance and reward result.
Creating a starter grants 100 wish currency; each wish costs 100 and adds a random
weapon-type character to the saved roster. Character and Team both use the full
owned roster. Wishes exclude types already owned, including the starter. The Wish
screen shows collection progress and disables wishing once all 11 types are owned.
Team assignments identify characters by database ID.
Selecting a card in Character opens its full-screen canvas base-stat view. In the
team picker, selecting a card still assigns it directly to the chosen slot.
The stats screen also shows Attack (Melee/Ranged), Skill 1, and Skill 2 with actual
descriptions, resource costs, casting times, and cooldowns. Skill 2 can be unlocked for that character using 1,000 account gold;
the updated gold balance and unlock status are saved on the backend. The details
canvas scrolls on shorter screens to keep all stats and abilities accessible.
Attack and spell timing is shown in seconds. Speed reduces both using
`base / (1 + Speed/100)`; all spells default to a 1-second base cast time.
Battle playback uses the backend's timestamps rather than a fixed animation delay.
Available skills trigger automatically. Combat displays HP/MP bars, cast progress,
skill labels, poison, healing, blocks, projectiles, and critical-hit text. Buffs,
stuns, passives, and resource consumption are resolved by the backend.

Run `npm.cmd run dev` here and in `../idleon-be` in separate terminals.
Visit http://localhost:3020/login. Development account: `admin` / `Admin123!`.
Successful login opens `/game` directly. New players see character creation drawn
on the canvas; saved characters enter their room immediately. The name field and keyboard
controls use native accessible inputs over the canvas. `/dashboard` remains available.
The API URL defaults to http://localhost:8020/api. Set `NEXT_PUBLIC_API_URL` in
`.env.local` if needed (see `.env.example`). Use `localhost` for both applications.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3020](http://localhost:3020) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

Team assignments save to the database before updating the displayed slot. All six slots restore when reopening the game or logging back in, and returning to the room preserves the saved formation. Failed saves show an error and allow retrying the character selection.

Shop lists seven +5 stat artifacts, each priced at 500 gold. Purchased copies appear in Artifacts with their equipment status. Open Character, select a character, then select its Artifact slot to equip, replace, or unequip one owned copy. Each character has one slot; each copy can equip one character. Inventory and equipment persist in the database. Character stats include artifact bonuses; battle HUD updates without resetting expedition progress. Equipment changes apply to the next resolved battle.

Character stats has a repeatable Upgrade option below the Artifact slot. Each purchase costs 1,000 gold and shows its class bonus and current upgrade count. Upgrades are permanent and save per character, stack with artifacts, and update combat stats and speed timing. Changes during battle apply to the next resolved battle.

Character skill descriptions show active damage formulas such as (40 + current ATK) or (20 + current Magic). Passive and non-damaging skill effects keep their configured values.

All non-battle canvas screens share ResponsiveCanvasFrame. Short windows scale the canvas and matching native controls together, with scrolling for content that needs more space. Nested screens inherit scaling to avoid shrinking twice. The six-slot team remains horizontal and scrolls on narrow windows; character roster pagination reserves space for navigation. Room controls have extra vertical space on narrow screens. Stats, shop, inventory, and creation retain scrolling access to all controls.
