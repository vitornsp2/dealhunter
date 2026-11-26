# Agent guide

## Before changing code

- Read the relevant implementation, tests, and package conventions before editing.
- Explain any architecture change that crosses workspace boundaries.
- Keep changes focused; do not perform unrelated refactors.
- Prefer existing patterns and minimal dependencies. Add only stable, compatible packages that are
  necessary for the requested behavior.

## Architecture

- `packages/shared` owns provider-independent domain and transport schemas.
- `apps/api` owns credentials, provider calls, normalization, caching, and HTTP error mapping.
- `apps/extension` owns React UI and storage adapters; it must not import server implementation
  details.
- Keep domain rules independent of React, Chrome APIs, and providers.
- Provider selection is explicit. Never silently replace a failed live search with mock data.

## TypeScript, tests, and errors

- Keep TypeScript strict. Do not add `any`, unsafe casts, or weaken compiler/lint settings to bypass
  an error.
- Validate persistence, API inputs, and provider output at runtime with Zod.
- Add or update tests with behavior changes. Never delete or weaken a test merely to make CI pass.
- Return actionable, non-secret errors. Distinguish invalid input, timeout, rate limit, network, and
  upstream failures where possible.
- Before handoff run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.

## Security and privacy

- Never put provider credentials in extension code, browser storage, fixtures, logs, or UI.
- Keep MV3 permissions and backend CORS origins minimal. Do not add remote executable code.
- The API binds to loopback by default. Treat any network exposure or authentication as a separate
  product/security decision.

## UI

- Preserve the compact commercial SaaS style, accessible labels/focus states, responsive layouts,
  meaningful loading/empty/error states, and dark/light/system themes.
- Candidate offers must remain labeled as raw candidates. Never describe one as a verified match
  or best deal, and never imply an unknown shipping cost is zero.

## Scope

- Phase 1 stores requested specs, preferred condition, and target price as user input only.
- Do not implement matching, spec/model validation, condition rejection, confidence, target-price
  evaluation, best-deal ranking, notifications, deduplication, scheduling, history, price drops, or
  discount-authenticity logic without an explicit future-phase instruction.
- Do not add placeholder business logic or tests for roadmap behavior.
