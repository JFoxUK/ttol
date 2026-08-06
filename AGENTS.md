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

### Running the app (requires Reddit credentials — external dependency)
Devvit apps do **not** run locally standalone; they run on Reddit's cloud. To run/develop:
1. `devvit login` — interactive Reddit OAuth (opens a browser; `--copy-paste` for a code flow).
2. `devvit playtest <subreddit>` — uploads the app and hot-reloads on save. The subreddit must be a
   test subreddit with **<200 members** that the logged-in account moderates.
`devvit playtest` and `devvit upload` both prompt for OAuth immediately if not logged in, so a
Reddit account + test subreddit are hard prerequisites for any real run. There is no token/env-var
auth in 0.11.10; the session token is stored under `~/.devvit`.
