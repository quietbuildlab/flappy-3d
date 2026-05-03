# Deploy to Cloudflare Pages

The repo deploys to **two hosts in parallel** on every push to `main`:

| Host | URL | Build base | Workflow job |
|---|---|---|---|
| GitHub Pages | `https://quietbuildlab.github.io/flappy-3d/` | `/flappy-3d/` | `build` → `deploy` → `lighthouse` |
| Cloudflare Pages | `https://flappy-3d.pages.dev/` | `/` | `deploy-cf` |

Both jobs run from the same workflow (`.github/workflows/deploy.yml`).
The Vite base path is env-controlled via `VITE_BASE` so the same source
produces the right asset URLs for each target.

## One-time setup (~5 min)

You need to do this once. After that the deploy is automatic.

### 1. Create the Cloudflare Pages project

1. Sign in at <https://dash.cloudflare.com/>.
2. Left sidebar → **Workers & Pages** → **Create** → **Pages** tab → **Upload assets** (NOT "Connect to Git" — we're using GitHub Actions for the deploy).
3. Project name: **`flappy-3d`** (must match `--project-name=flappy-3d` in the workflow).
4. You can drop any placeholder file (e.g. an empty `index.html`) just to create the project — the real content arrives via Wrangler from the GitHub Action.
5. After creation you'll see the project URL: `https://flappy-3d.pages.dev/`.

### 2. Generate an API token

1. Top-right avatar → **My Profile** → **API Tokens** → **Create Token**.
2. Scroll to **Custom token** → **Get started**.
3. Name it: `flappy-3d-pages-deploy`.
4. Permissions:
   - **Account** → **Cloudflare Pages** → **Edit**
5. Account Resources: **Include** → **Specific account** → your account.
6. **Continue to summary** → **Create Token**.
7. Copy the token shown on the next page — it's only shown once.

### 3. Find your Cloudflare Account ID

In the dashboard right sidebar (any page), under **Account ID**. Click the copy icon. It's a 32-char hex string.

### 4. Add both as repository secrets

1. GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
2. Add:
   - Name: `CLOUDFLARE_API_TOKEN`, Value: token from step 2.
3. Add another:
   - Name: `CLOUDFLARE_ACCOUNT_ID`, Value: ID from step 3.

### 5. Trigger the first deploy

Push any change to `main` (or use **Actions** → **Deploy** → **Run workflow** from GitHub UI).

Watch the run at GitHub → **Actions**. The `deploy-cf` job should show:
```
Deploying to Cloudflare Pages...
✨ Success! Uploaded N files
🌎 Deployment complete! Take a peek over at https://<hash>.flappy-3d.pages.dev
```

The latest deploy is also reachable at the canonical URL `https://flappy-3d.pages.dev/`.

## Custom domain (optional)

CF dashboard → your project → **Custom domains** → **Set up a custom domain**.
Follow the CNAME instructions. Cloudflare auto-provisions a TLS cert.

## Local development

`npm run dev` works as before. The base path defaults to `/flappy-3d/`
which matches the dev server at `http://localhost:5173/flappy-3d/`.

To preview the CF-style root build locally:
```bash
VITE_BASE=/ npm run build && npx serve dist
```

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `deploy-cf` job fails with `Cloudflare API error: Authentication error` | `CLOUDFLARE_API_TOKEN` secret is wrong or token lacks **Pages:Edit** permission |
| `deploy-cf` job fails with `Project not found` | Project name in workflow (`--project-name=flappy-3d`) doesn't match the name you set in the CF dashboard |
| App loads but assets 404 | `VITE_BASE=/` env var not picked up by the build step — check the **Build for Cloudflare** step output |
| PWA installs with wrong start URL | Same root cause as above — `start_url` in the manifest mirrors `VITE_BASE` |

## Removing this deploy later

If you want to drop CF and keep only GH Pages:
1. Delete the `deploy-cf` job from `.github/workflows/deploy.yml`.
2. Delete the two `CLOUDFLARE_*` repo secrets.
3. (Optionally) Delete the project in the CF dashboard.

The Vite `VITE_BASE` env support can stay — it's harmless when unused.
