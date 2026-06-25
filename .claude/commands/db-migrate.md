# /db-migrate

Generate and apply a Drizzle migration after a schema change.

## Steps

1. Generate the SQL migration file from the current schema:
   ```bash
   pnpm db:generate
   ```

2. Apply to the **local** D1 database:
   ```bash
   pnpm db:migrate:local
   ```

3. Confirm the migration looks correct by checking the new file in `server/database/migrations/`.

4. After pushing to `main` and the Cloudflare Pages deploy completes, apply to **production**:
   ```bash
   pnpm db:migrate:remote
   ```

> Remote migration requires `wrangler login` in the terminal. Run it in the project directory `D:\work\Nuxt\low-carbon-alerts`.
