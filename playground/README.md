# rrulejs playground

Interactive demo for [`@spiandorello/rrulejs`](https://www.npmjs.com/package/@spiandorello/rrulejs), inspired by [`jkbrzt.github.io/rrule`](https://jkbrzt.github.io/rrule).

Built with Vite + React + Tailwind v4. Imports the library directly from the parent repo's `src/` via a path alias, so any local edits are reflected immediately.

## Develop

```sh
cd playground
yarn install          # only deps for the playground itself
yarn dev              # http://localhost:5173
```

## Build

```sh
yarn build            # outputs to playground/dist/
yarn preview          # serve the production build locally
```

For a deployment under a sub-path (e.g. GitHub Pages at `/rrule/`), set `BASE_PATH`:

```sh
BASE_PATH=/rrule/ yarn build
```

The deployed site is published to GitHub Pages by `.github/workflows/gh-pages.yml` on every push to `main`.

## URL state

The current RRULE is encoded in the URL hash (`#r=...`). Sharing the page link shares the rule.

## Not published to npm

The `playground/` folder is **never** included in the npm tarball — the library's `package.json` whitelists only `dist/` and `README.md` under `files`. Consumers of `@spiandorello/rrulejs` see zero added weight from this demo.
