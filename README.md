# MAGNET demo

Interactive, responsive demo of MAGNET: a client workspace (Overview, Grow, Inbox, Lead Flows, Leads, Planner, Settings) and a separate admin workspace (Operations, Clients, Activity, Support).

All data is fictional and lives in the browser (localStorage). Nothing is sent to Instagram or any other service. Use **Demo workspace** (top right) to simulate states or reset the demo.

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
```

`npm run build` type-checks and builds to `dist/`.

## Five-minute walkthrough

1. Entry → **Open client demo** → Overview
2. **Grow**: review a suggested source, pause/resume the campaign
3. **Lead Flows → Free guide**: simulate a MAGNET comment (Chris Ortega), try a duplicate event
4. **Inbox**: open Chris, **Generate reply**, edit, send; confirm the lead suggestion
5. **Leads**: Chris is in Qualified
6. **Create content idea** in Inbox → schedule it in **Planner**
7. **Admin**: pause the client campaign with a reason, check **Activity** and the client's Grow page

## Structure

- `src/seed.ts` – fictional starting data
- `src/store.tsx` – shared state, persistence, reset, toasts, AI auto-reply queue, hash router
- `src/flowEngine.ts` – keyword matching, conflicts, de-duplication, test simulator, live demo events, activation and publishing
- `src/screens/` – client screens, `src/admin/` – admin screens
