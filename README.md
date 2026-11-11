IdleOn workspace frontend built with Next.js, TypeScript, and shadcn/ui.

The 2D canvas playground is at `/game`, also linked from the dashboard. Click the
scene and use A/D or arrow keys to move, and Space/W/up arrow to jump. On-screen
buttons support touch. Pause/resume and reset are available above the canvas.
The playground runs locally without the backend; it does not save progress.
Scene rendering and the animation loop live in `src/components/game/game-canvas.tsx`.

Run `npm.cmd run dev` here and in `../idleon-be` in separate terminals.
Visit http://localhost:3000/login. Development account: `admin` / `Admin123!`.
Successful login opens `/dashboard`; sign out clears the server session.
The API URL defaults to http://localhost:4000/api. Set `NEXT_PUBLIC_API_URL` in
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

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

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
