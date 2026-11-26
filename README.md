# DealHunter

DealHunter Brasil is a Phase 1 Chrome extension foundation for organizing products and manually
searching candidate offers in BRL. It includes a compact popup, a full React/Vite MV3 dashboard, a
localhost API, and shared runtime-validated domain contracts.

> Phase 1 does **not** perform product matching, target-price evaluation, notifications, scheduled
> checks, or price history. The tracking toggle is explicit organizational state only.

## Requirements

- Node.js 20+
- npm 10+
- Chrome or Chromium for loading the extension

## Setup

```bash
npm install
cp .env.example .env
npm run dev:api
```

In another terminal:

```bash
npm run dev
```

The API binds only to `127.0.0.1:8787`. It uses strictly fictional/simulated listings by default and
labels all responses `Simulado`. To use live Google Shopping results, set
`SEARCH_PROVIDER=serpapi` and
`SERPAPI_API_KEY` in the API process environment. Live provider errors are returned as errors; the
API never silently falls back to mock results.

The extension's provider mode must match the server's `SEARCH_PROVIDER`. Country and currency are
fixed to Brazil/BRL in Phase 1. Search remains explicitly manual.

## Load the Chrome extension

1. Run `npm run build`.
2. Open `chrome://extensions`, enable Developer mode, and choose **Load unpacked**.
3. Select `apps/extension/dist`.
4. Start the API with `npm run dev:api`, open the popup, and use Search.

The unpacked extension requests only local storage and the default `localhost:8787` origin. Other
localhost/loopback origins are declared as optional host permissions; Chrome must grant the
relevant origin before a customized API URL can be fetched.

## SerpApi implementation evidence and limits

The provider follows SerpApi's official
[Google Shopping API documentation](https://serpapi.com/google-shopping-api), verified on
2026-11-26:

- `engine=google_shopping`, `q`, `google_domain`, `gl`, and `hl` are documented request parameters.
- DealHunter sends `google_domain=google.com.br`, `gl=br`, and `hl=pt-BR`.
- Official response examples expose `shopping_results[].product_link`, `source`, `thumbnail`,
  `product_id`, and numeric `extracted_price`; the normalizer uses those fields.
- The Google Shopping endpoint does **not** document a `currency` request parameter. DealHunter
  therefore does not invent or send one. It labels normalized amounts as BRL because the request is
  localized to Google Brazil; users must still verify currency and checkout totals at the retailer.
- Shipping fields are not guaranteed. Missing shipping is represented as unknown, and the UI does
  not present an unreliable total.

Provider responses are raw candidates, not verified matches. Variant, condition, availability,
advertised price, original price, shipping, currency, and final checkout total can be incomplete or
wrong. Always verify the retailer page.

The documented request/response contract and normalizer were verified against the official page,
but no `SERPAPI_API_KEY` was available in this environment. A real paid/live request is therefore
**not credential-verified**; mock mode and automated provider-normalization tests are verified.

## Architecture and security decisions

The shared package contains only runtime schemas, domain types, fixtures, and pure CRUD helpers.
The extension talks to the local API and persists versioned state through a Chrome Storage adapter
(with localStorage for browser development). The API chooses exactly one provider at startup,
validates every request, normalizes provider output, applies a one-minute cache and per-IP request
limit, and maps timeout/network/upstream failures without exposing credentials.

The API deliberately has no authentication and binds to `127.0.0.1`; it is not intended for public
internet deployment. CORS is allowlisted, request bodies and search sizes are bounded, and the
SerpApi key exists only in the server process. The extension has no content scripts, remote code,
site-reading permissions, background schedule, or API-key UI.

## Commands

| Command                | Purpose                                   |
| ---------------------- | ----------------------------------------- |
| `npm run dev`          | Run the extension Vite development server |
| `npm run dev:api`      | Run the API with reload                   |
| `npm test`             | Run all Vitest tests                      |
| `npm run typecheck`    | Strict TypeScript checks                  |
| `npm run lint`         | ESLint                                    |
| `npm run build`        | Build all workspaces                      |
| `npm run format:check` | Check Prettier formatting                 |

## Structure

- `apps/extension` — separate popup/full dashboard experiences, MV3 service worker, and resilient
  storage adapters
- `apps/api` — localhost Express API and explicit mock/SerpApi providers
- `packages/shared` — Zod schemas, types, defaults, and fictional fixtures

Provider keys remain server-side. There is intentionally no API key input in extension settings.
Persistence includes products, preferences, provider/theme selection, cached results and
timestamps. Invalid or outdated persisted versions are discarded safely and restored to defaults.

## Troubleshooting

- **API unavailable:** start `npm run dev:api`, verify `http://127.0.0.1:8787/health`, and use the
  same URL in extension settings.
- **Provider-mode conflict (HTTP 409):** the extension setting must match `SEARCH_PROVIDER` on the
  server. This safety check prevents an accidental mock fallback.
- **Chrome blocks a custom local URL:** the manifest grants `localhost:8787` by default. Grant the
  optional loopback origin or rebuild with the precise development host permission.
- **Live startup fails:** `SEARCH_PROVIDER=serpapi` requires `SERPAPI_API_KEY` in the API process.
- **Old/invalid local state disappears:** Phase 1 intentionally recovers incompatible persisted
  schemas to safe fictional defaults rather than attempting an unsafe migration.

## Known Phase 1 limitations

Searches are manual and provider results are raw candidates. Stored specs, preferred condition, and
target price are not evaluated. There is no matching, incompatible/refurbished rejection,
confidence, best-deal claim, notification, deduplication, schedule, history, price-drop analysis, or
discount-authenticity logic. See [ROADMAP.md](ROADMAP.md) for technical considerations only.
