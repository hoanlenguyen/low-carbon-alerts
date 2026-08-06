# Low Carbon Alerts

A full-stack web app that tracks Finland's real-time electricity grid carbon intensity and notifies users when clean energy windows open. Built to help households and businesses shift flexible loads — EV charging, dishwashers, laundry — to times when the grid is greenest.

---

## Features

- **Live grid data** — carbon intensity, renewable share, and domestic production share, sourced from Fingrid via the Sähköjälki / Flip API
- **48-hour forecast chart** — interactive chart showing history and forecast in Helsinki time, with series switching between CO₂ intensity, renewable share, and domestic production share
- **Push notifications** — browser push alerts when low-carbon windows are detected
- **End-user app** — Home, Alerts, Forecast, and Settings pages for registered users
- **Admin dashboard** — notification management, customer list, and grid forecast view
- **Google OAuth login** — sign in with Google; always prompts account selection
- **Light / Dark / System theme** — per-user appearance preference persisted in the browser

---

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | Nuxt 4 |
| UI | Nuxt UI v3 |
| Database | Cloudflare D1 (SQLite) via Drizzle ORM |
| Auth | `nuxt-auth-utils` + Google OAuth |
| Push | Firebase Cloud Messaging (FCM) |
| Chart | Unovis |
| Data source | [Flip API / Sähköjälki](https://flipapi.net) (Fingrid) |
| Deployment | Cloudflare Pages |

---

## Data Sources

Grid data is fetched from `https://flipapi.net/forecast/latest` with the following series keys:

| Key | Unit | Interpretation |
|---|---|---|
| `consumption_emissions` | gCO₂/kWh | Lower is better |
| `renew_production_share` | % | Higher is better |
| `domestic_production_share` | % | Higher is better |

All timestamps are displayed in **Helsinki time** (`Europe/Helsinki`).

---

## Getting Started

```bash
# Install dependencies
pnpm install

# Start the dev server
pnpm dev
```

Set up your `.env` with:

```env
NUXT_OAUTH_GOOGLE_CLIENT_ID=
NUXT_OAUTH_GOOGLE_CLIENT_SECRET=
NUXT_SESSION_PASSWORD=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

---

## Project Structure

```
app/
├── layouts/          # app (end-user) and admin layouts
├── pages/
│   ├── app/          # Home, Alerts, Forecast, Settings
│   └── admin/        # Dashboard, Notifications, Customers, Grid Forecast
├── components/       # Shared UI components (GridForecastCard, CarbonChart, …)
server/
├── api/
│   ├── grid/         # [series].get.ts — cached Flip API proxy
│   ├── auth/         # Google OAuth, profile, session
│   └── notifications/ # FCM token registration, send
```

---

