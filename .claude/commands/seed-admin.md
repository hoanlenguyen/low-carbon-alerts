# /seed-admin

Create the first admin account on a target environment.

## Local

Make sure `npm run dev` is running, then:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/seed-admin" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"token":"<NUXT_SETUP_TOKEN>","email":"<email>","password":"<password>","name":"<name>"}'
```

## Production

```powershell
Invoke-RestMethod -Uri "https://low-carbon-alerts.pages.dev/api/auth/seed-admin" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"token":"<NUXT_SETUP_TOKEN>","email":"<email>","password":"<password>","name":"<name>"}'
```

A 409 response means the account already exists — that's fine.

## After seeding

Remove `NUXT_SETUP_TOKEN` from Cloudflare Pages → Settings → Environment variables so the endpoint cannot be called again.
