# AGENTS.md

## Cursor Cloud specific instructions

### What this project is
This is a **Devvit** app (Reddit Developer Platform) — an interactive "Two truths and one lie"
custom post type. It is a *blocks* app built on `@devvit/public-api@0.11.10`. The entire app lives
in `src/main.tsx` and is configured via `devvit.yaml`. There is no web/server component and no
local database — state is stored in Reddit-hosted Redis at runtime.

### Tooling / environment
- The `devvit` CLI is installed globally at the version matching `@devvit/public-api`
  (`devvit@0.11.10`). npm's global prefix is set to `~/.npm-global`, and `~/.npm-global/bin` is
  added to `PATH` via `~/.bashrc`. If `devvit` is not found on `PATH` in a non-login shell, run
  `export PATH="$HOME/.npm-global/bin:$PATH"`.
- Node is `v22.x`. `npm install` installs the runtime + `typescript` dev dependency.

### Lint / type-check / build
- There is **no** lint config, no test framework, and no `build`/`dev` npm script. The 0.11.10 CLI
  has **no** standalone `build` command — bundling happens inside `devvit playtest` / `devvit upload`.
- Type-checking is the offline validation step. Plain `npx tsc --noEmit` FAILS with
  `Cannot find type definition file for 'vitest/globals'` because the extended base config
  `@devvit/public-api/devvit.tsconfig.json` hardcodes `types: ["vitest/globals"]` (a Devvit test
  convention) and `vitest` is not a dependency here. This is a config artifact, not a source error.
  To type-check just the app source, use a throwaway config that overrides `types` to `[]`, e.g.
  create `tsconfig.check.json` extending `./tsconfig.json` with `"types": []` + `"noEmit": true`
  and run `npx tsc -p tsconfig.check.json` (source currently passes cleanly).

### Running the app
**Do not attempt to run / playtest / upload the app in Cloud Agent sessions.** This is a Devvit
(Reddit) game that only executes on Reddit's cloud via `devvit playtest` / `devvit upload`, which
require interactive Reddit OAuth and a test subreddit. Environment readiness is proven by
dependency install + type-check of `src/`, not by launching the app.

If a human explicitly asks to playtest: `devvit login` then `devvit playtest <subreddit>`
(subreddit must have <200 members and be moderated by the logged-in account). Session tokens live
under `~/.devvit`; there is no token/env-var auth in 0.11.10.
