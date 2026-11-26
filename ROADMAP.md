# DealHunter roadmap

## Phase 1 — Foundation

- Watchlist CRUD and explicit tracking state
- Search candidates through an explicit mock or live provider
- Resilient local persistence, settings, metrics, and Chrome MV3 packaging

## Later phases (not implemented)

- **Candidate matching and confidence:** normalize catalog identity, variants, specifications, and
  condition with explainable evidence. Keep uncertain candidates visible and make confidence
  auditable instead of relying on title heuristics.
- **Target-price evaluation:** define whether shipping and payment method participate in thresholds,
  preserve the original advertised value, and distinguish an unknown total from a qualifying one.
- **Monitoring and notifications:** introduce a durable scheduler, idempotent jobs, deduplication,
  retry/backoff, notification preferences, and delivery audit records. Chrome MV3 service workers
  alone are not a reliable server-side scheduler.
- **Price history and analytics:** add an authenticated database, retention policy, source
  timestamps, currency provenance, and anomaly handling before calculating drops or trends.
- **Discount authenticity:** retain observations long enough to compare a claimed original price
  with evidence; do not infer authenticity from one provider response.

These items require product rules, privacy decisions, operational ownership, and additional tests.
No placeholder implementation for them exists in Phase 1.
