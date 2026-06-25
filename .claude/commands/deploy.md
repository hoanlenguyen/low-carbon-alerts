# /deploy

Build and push the current branch to trigger a Cloudflare Pages deploy.

## Steps

1. Run typecheck to catch errors before pushing:
   ```bash
   npm run typecheck
   ```

2. Commit any pending changes, then push to `main`:
   ```bash
   git push origin main
   ```

3. Monitor the deploy at: https://github.com/hoanlenguyen/low-carbon-alerts/actions

4. Once the deploy finishes, if this push included a **schema change**, apply the production migration:
   ```bash
   pnpm db:migrate:remote
   ```

> The Cloudflare Pages project is `low-carbon-alerts`. Deploy outputs to `dist/` (Nitro `cloudflare-pages` preset).
