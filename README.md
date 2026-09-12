# Flight Finder Plus

Build the requested Flight Price Notifier v1: public dark purple landing page, email/password sign-up/sign-in/sign-out backed by a Supabase project you own, and protected /app placeholder dashboard. Do not create custom database tables; use only default auth users. Follow the attached Lovable and Supabase best-practice guidance.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a8f5874d-0a4c-41fc-a6e6-11ae0aad5f16).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

This project connects to a Supabase project you own. Set `VITE_SUPABASE_URL`
and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env` (see `.env` for the current
values) before running locally.

## Deployment

This is a static Vite + React single-page app. `npm run build` outputs a
static site to `dist/`, ready to host anywhere that serves static files
(e.g. Vercel). `vercel.json` includes a SPA rewrite so deep links like `/app`
resolve to `index.html` and are handled client-side by React Router.

When deploying to Vercel, add `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY` as Environment Variables in the Vercel
project settings (Project → Settings → Environment Variables) with the same
values as `.env` — Vercel does not read the committed `.env` file for its
own builds.
