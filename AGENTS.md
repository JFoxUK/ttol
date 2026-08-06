# AGENTS.md

## Cursor Cloud specific instructions

### What this project is
This is a **Devvit** app (Reddit Developer Platform) — an interactive "Two truths and one lie"
custom post type. It has been migrated to **Devvit Web**:
- `devvit.json` is the source of truth for app config.
- `src/server/` contains the Hono + Devvit server runtime.
- `src/client/` contains the inline splash and expanded game web entrypoints.
- `src/shared/` contains shared API/types.

There is still no standalone local database — runtime state is stored in Reddit-hosted Redis.

### Tooling / environment
- The `devvit` CLI is installed globally at the app/tooling version (`devvit@0.13.11`). npm's
  global prefix is set to `~/.npm-global`, and `~/.npm-global/bin` is
  added to `PATH` via `~/.bashrc`. If `devvit` is not found on `PATH` in a non-login shell, run
  `export PATH="$HOME/.npm-global/bin:$PATH"`.
- Node is `v22.x`. `npm install` installs the full client/server toolchain (Vite, React, Hono,
  Devvit Web packages, ESLint, TypeScript).

### Lint / type-check / build
- Use the package scripts:
  - `npm run test:types`
  - `npm run build`
  - `npm run lint`
- The current repo includes a small local type shim for `@devvit/web/client` because the runtime
  exports work for Vite/build, but the package typings do not currently expose the `context` and
  `requestExpandedMode` symbols cleanly through the aggregate entrypoint in this repo setup.

### Running the app
This app still executes on Reddit's cloud via `devvit playtest` / `devvit upload`, but it now uses
modern Devvit Web structure. In Cloud Agent sessions, offline validation is:
- `npm run test:types`
- `npm run build`
- `npm run lint`

The app's test / install subreddit is **[r/ttaal](https://www.reddit.com/r/ttaal)**. If a human
explicitly asks to playtest: `devvit login` then `npm run dev` (which maps to `devvit playtest ttaal`).
Session tokens live under `~/.devvit`.
