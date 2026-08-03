# ZapTable

**Scan. Order. Eat. - order from your phone's browser, no app.**

> _Status: early development / building the MVP_

---

## What is ZapTable?

ZapTable is a no-download web app for dine-in restaurants.

A restaurant gets set up in minutes by **uploading their existing menu - a PDF or even a
photo** - and ZapTable turns it into a clean digital menu automatically. Guests **scan a
QR code at the table, the menu opens right in their phone browser** (no app, no login),
and they order and pay. Orders land on a simple dashboard for the kitchen.

No app store. No clunky kiosks. No paper menus. Just scan and order.

---

## The two flows

### Restaurant admin - setup (one-time)

1. **Sign up** and create the business (name, address, currency).
2. **Upload the menu** - drop in a PDF or snap a photo. ZapTable reads it and builds the
   digital menu (categories, items, prices) automatically. The admin can review and tweak.
3. **Set the number of tables** - ZapTable generates a unique QR code per table.
4. **Print the QR codes** (table tents / stickers) - download as a PDF.
5. **Watch orders come in** on a simple live dashboard.

### Guest - order (every visit)

1. **Scan the table QR** with the phone camera.
2. The **menu opens instantly in the browser** - no app, no sign-up.
3. **Browse -> add to cart -> place the order.**
4. **Pay** from the phone (card / Apple Pay / Google Pay).
5. See a **simple order-status screen** (received -> preparing -> ready).

---

## Core MVP features

- **Menu from a PDF or photo** - upload once, get a digital menu (items, prices, categories).
- **Business + table setup** - quick onboarding, auto-generated QR codes per table.
- **QR codes, ready to print** - downloadable as a PDF.
- **No-app guest ordering** - opens instantly in any mobile browser, no login.
- **Cart + checkout** - add items, place the order, pay.
- **Payments** - Stripe (cards, Apple/Google Pay) for global payouts.
- **Admin orders view** - see incoming orders in real time.
- **Order status for the guest** - received -> preparing -> ready.

---

## Tech (high level)

- **Frontend:** Next.js (PWA) - loads instantly in the browser, works on any phone.
- **Menu reading:** Claude vision turns the uploaded PDF/photo into a structured menu.
- **Database & auth:** **Supabase** (Postgres + Supabase Auth, multi-tenant with RLS).
- **Backend API:** **AWS Lambda** + API Gateway (trusted-backend, service-role).
- **Payments:** Stripe - multi-currency. **Funds settle directly into the restaurant's account**; ZapTable is a flat-fee SaaS.
- **QR codes:** generated per table, exported as a printable PDF.

> The multi-tenant SaaS architecture (Supabase + AWS), data model, settings, and the
> phased migration plan live in **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

---

## Pricing

A simple, predictable **flat monthly subscription** - no per-order cut.

| Tier | For | Price |
| --- | --- | --- |
| **Lite** | Small cafes, food trucks, stalls | $49 per month |
| **Pro** | Casual restaurants, busy bars | $129 per month |
| **Enterprise** | Multi-location chains, food courts | Custom |

---

## Where it's headed (later - not in the MVP)

These are the differentiators we'll layer on once the simple core is solid:

- **Live queue** - "X orders ahead, ~Y min," with kitchen-load-aware throttling.
- **Conversational AI ordering** - recommendations from the menu.
- **Group cart + split bill** - many phones, one shared table cart, pay your own items.
- **Real-time stock toggles** - flip an item "sold out" and it updates on every phone.
- **Analytics** - best-sellers, average ticket, peak hours.
- **Multi-location** management.

---

## Getting started

The demo app runs locally with zero setup (in-memory data):

```bash
npm install
npm run dev        # -> http://localhost:3000
```

Add `ANTHROPIC_API_KEY` to `.env.local` for real menu reading from photos/PDFs.

**Going to production (Supabase + AWS):** see **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**
- run the SQL in `supabase/migrations/`, deploy `infra/` with AWS SAM, and follow the
phased roadmap.
