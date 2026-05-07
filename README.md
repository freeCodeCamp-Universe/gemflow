# GemFlow

GemFlow is a game built around a simple loop: sort layered powder vials, complete full single-color vials, and synthesize gems to pass each level.

## Tech Stack

- React 18
- Vite 6
- Tailwind CSS 4
- Motion

## Getting Started

```bash
pnpm install
pnpm dev
```

Open http://localhost:8000 in your browser.

## Production Build

```bash
pnpm build
```

The production bundle is written to `apps/web/dist/` and can be served by any static hosting platform.

## Project Structure

```text
GemFlow/
├─ .gitignore
├─ ATTRIBUTIONS.md
├─ README.md
├─ package.json
├─ pnpm-workspace.yaml
├─ pnpm-lock.yaml
└─ apps/
   └─ web/
      ├─ index.html
      ├─ package.json
      ├─ postcss.config.mjs
      ├─ tsconfig.json
      ├─ vite.config.ts
      └─ src/
         ├─ app/
         │  ├─ App.tsx
         │  ├─ components/
         │  ├─ types/
         │  └─ utils/
         ├─ main.tsx
         └─ styles/
```
