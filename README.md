# CreditFlow (Ledgix) — Frontend

A mobile-first **ledger, billing, and AI-assisted credit-recovery** console for
Indian retail and wholesale shops. Built with **React 19 + Vite + TypeScript +
Tailwind CSS v4**.

Features: express billing (dynamic retail/wholesale pricing), inventory with
low-stock alerts, customer ledgers, an outstanding-recovery console, and an
**AI WhatsApp reminder drafter** powered by MiniMax-M3 (served by the
[Ledgix Backend](../Ledgix%20Backend)).

> Accounts and all business data live in the [Ledgix Backend](../Ledgix%20Backend)
> (JWT auth + SQLite). On first run, create an account — the first one becomes the
> shop OWNER. The app starts with no data.

## Run locally

**Prerequisites:** Node.js 18+ (Node 24 recommended).

1. Install dependencies:
   ```bash
   npm install
   ```
2. (Optional) point the app at your backend — copy `.env.example` to `.env.local`
   and set `VITE_API_URL` (defaults to `http://localhost:3001`).
3. Start the dev server:
   ```bash
   npm run dev   # http://localhost:3000
   ```

For the **✨ Draft with AI** feature in the Reminders console, also run the
[Ledgix Backend](../Ledgix%20Backend).

## Scripts

| Script            | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the Vite dev server.           |
| `npm run build`   | Production build to `dist/`.         |
| `npm run preview` | Preview the production build.         |
| `npm run lint`    | Type-check with `tsc --noEmit`.      |
