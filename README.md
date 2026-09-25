# 517 Industries Website

Complete source package for the 517 Industries website.

## Requirements

- Node.js 22.13 or newer
- pnpm 11.25 or newer

If pnpm is not installed, enable it with:

```bash
corepack enable
corepack prepare pnpm@11.25.0 --activate
```

## Run locally

From this folder:

```bash
pnpm install
pnpm dev
```

Open the local address shown in the terminal, normally `http://localhost:3000`.

## Production build

```bash
pnpm build
pnpm start
```

## Main files

- `app/page.tsx`: text, navigation, and page sections
- `app/globals.css`: typography, spacing, colors, and responsive layouts
- `components/scroll-ridges.tsx`: ridge animation, pause control, and reduced motion
- `components/ridge-field.ts`: contour geometry and colors
- `components/site-motion.tsx`: reveal motion
- `public/assets/517-wordmark.svg`: approved vector logo
- `app/layout.tsx`: page title, description, and favicon

The dependency lockfile is included so the site installs with the same package versions used for the deployed build. Generated folders such as `node_modules`, `dist`, and `.next` are intentionally excluded and will be recreated by the commands above.

Install with the pinned package manager (`package.json` `packageManager` is `pnpm@11.25.0`). Node.js must be 22.13 or newer; this repo’s Pages workflow uses Node 22.14.0.

```bash
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install --frozen-lockfile
```

## Production deploy

`next.config.ts` sets `output: "export"`. `pnpm build` writes a static site to `dist/client` (HTML, CSS, JS, and `public/` assets). GitHub Pages serves that folder. It does not run the Cloudflare Worker.

Pushing to `main` runs `.github/workflows/pages.yml`, which installs with pnpm 11.25, builds, copies `CNAME` and `.nojekyll` into `dist/client`, and deploys that directory with the GitHub Pages actions. Pull requests run the same install and build without deploying.

`pnpm start` still boots the local Wrangler preview from `dist/server`. That preview is not what `517industries.com` serves.

### What points 517industries.com here

- GitHub Pages is enabled on this repository and deploys from the workflow above. The custom domain on the Pages site is `517industries.com` (`www.517industries.com` is on the same certificate).
- `CNAME` in the repo root is `517industries.com`. The workflow copies it into the published folder so a deploy keeps the custom domain.
- DNS is hosted on Cloudflare (`novalee.ns.cloudflare.com`, `titan.ns.cloudflare.com`). The apex and `www` are proxied by Cloudflare and already origin-point at GitHub Pages. Merging this change does not require a DNS edit.

The page copy and marks come from this package: the approved vector wordmark at `public/assets/517-wordmark.svg`, the Foundry palette, and the topographic ridge background. Older `public/assets/517_*.svg` files remain in the package and are not the header mark. There is no LU_06 mark. The footer shows `hello@517industries.com` and `Texas, USA`. Do not add a Frisco location or a Gmail address.

### Cloudflare Workers later

No Cloudflare API token is configured for this repo, and this change does not deploy a Worker. `.openai/hosting.json` leaves D1 and R2 unset. Stay on GitHub Pages until a Worker is actually published.

To move the domain later:

1. Authenticate Wrangler (`pnpm exec wrangler login`, or set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`).
2. Build, then deploy the worker config the build writes: `pnpm exec wrangler deploy --config dist/server/wrangler.json`. The generated worker name is `site-creator-vinext-starter`. Attach `517industries.com` and `www.517industries.com` as Worker custom domains, or connect the repo in Cloudflare Workers Builds.
3. In the Cloudflare DNS dashboard, point `517industries.com` and `www` at that Worker and remove the GitHub Pages origin. Until that cutover, leave the current proxied GitHub Pages records alone.
4. Disable the GitHub Pages workflow so Pages and the Worker do not both claim the domain.
