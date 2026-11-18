# Deploy IdleOn frontend to Vercel

This project is a Next.js app, not a static export. Vercel builds it using Node 22, `npm ci`, and `npm run build` from `vercel.json`. Keep the default output directory. Do not use `npm run dev` or the local port-3020 start command as a Vercel build command.

## Import and configure

1. Commit and push the frontend's deployment files to the repository you will import.
2. In Vercel choose **Add New > Project** and import the frontend GitHub repository. Set Framework Preset to **Next.js**.
3. If the repository contains only the frontend, leave Root Directory at `./`. If your Git repository contains both apps, select `idleon-fe` as Root Directory.
4. Add these environment variables for Production before deploying:

   ```env
   NEXT_PUBLIC_API_URL=/api
   BACKEND_URL=https://YOUR-BACKEND.up.railway.app
   ```

   Use the real public Railway backend origin for `BACKEND_URL`, with no `/api` suffix. Do not use `localhost`, a private `.railway.internal` hostname, or your database URL. The build checks these values on Vercel and reports invalid configuration instead of deploying a broken proxy.

5. Deploy. Changing either variable requires another frontend deployment because Next.js generates the rewrite at build time.

The backend can be deployed first. If you deploy the frontend before the backend starts, the site can build but login and gameplay API calls will not work until the backend is running and reachable.

## Connect Railway and Google login

Once Vercel gives you a production domain, set these variables on the Railway backend:

```env
CORS_ORIGIN=https://YOUR-FRONTEND.vercel.app
GOOGLE_REDIRECT_URI=https://YOUR-FRONTEND.vercel.app/api/auth/google/callback
NODE_ENV=production
TRUST_PROXY_HOPS=1
```

`CORS_ORIGIN` must exactly match the frontend origin, without a trailing slash. Add the exact callback URL to your Google OAuth web application's authorized redirect URIs. Keep the backend's existing `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `SESSION_SECRET` and `DATABASE_URL` in Railway only. Restart/redeploy the backend after changing its variables.

All browser API requests and Google login go through the frontend `/api` rewrite. This keeps the HttpOnly session cookie on the frontend domain and avoids cross-site cookie issues. Do not set `NEXT_PUBLIC_API_URL` to the Railway domain for this deployment. Server-side API calls use the backend origin directly.

For previews, use a dedicated staging backend and an exact allowed frontend domain. Arbitrary Vercel preview origins are not automatically accepted by the production backend. Vercel deployment protection may also require a visitor to sign in to Vercel before reaching a preview or its Google callback.

## Verify after deployment

1. Open `https://YOUR-BACKEND.up.railway.app/api/health` and `https://YOUR-FRONTEND.vercel.app/api/health`. Both should return the API status JSON.
2. Open `/login` on the frontend, sign in, refresh `/dashboard`, and verify the session persists.
3. Check Google sign-in using the new production callback; email-code registration needs the backend's Resend configuration.
4. Open `/game` and confirm character, map, currency and location assets load. Check that API requests use your Vercel origin, not localhost.

Local development continues to use `.env.local`; no local values are copied into Vercel automatically. The provided `.vercelignore` excludes local environment files, caches and private key files from CLI uploads. Do not add any database credentials, private API keys or admin passwords to `NEXT_PUBLIC_` variables.

References: https://vercel.com/docs/frameworks/full-stack/nextjs and https://vercel.com/docs/functions/runtimes/node-js/node-js-versions
