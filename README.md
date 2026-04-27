# coparenting-app

> A coparenting application to help joint custody parents monitor and stay up to date with any children involved.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 (CSS-first `@theme` configuration)
- Supabase (Auth, Postgres, Storage, Realtime)
- shadcn/ui + Radix primitives
- next-themes for dark/light mode

## Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in Supabase keys
npm run dev
```

The app runs at http://localhost:3000.

## Design system

Quiet Harbor — a calm, grounding palette suited to a co-parenting context.
Light/dark tokens are defined as CSS custom properties in `src/app/globals.css`
and surfaced as Tailwind utilities via the `@theme inline` directive.

---

_built with groundup ⚒️_
