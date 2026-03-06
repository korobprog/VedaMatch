# PLAN: Connect MVP

## Summary
`Connect` is a new aggregator service inside VedaMatch. It helps users find the right local service opportunity, community, or team without replacing existing `Yatra`, `Seva`, or `Services` modules.

## Backend contract
- Feed endpoint returns a mixed recommendation list from:
  - native `connect_opportunities`
  - `yatras`
  - `charity_projects`
  - `services`
- Native opportunities are moderated before they become public.
- Personalized matching is rules-based and uses:
  - city
  - interests
  - entry level
  - participation format
  - participation mode
  - newcomer-friendly / mentor flags

## Core entities
- `ConnectCommunity`
- `ConnectOpportunity`
- `ConnectMatchProfile`
- `ConnectApplication`

## Public behavior
- Feed shows only active opportunities.
- Moderation items are hidden from public recommendations.
- Every aggregated item carries a `sourceLink` for deep-link navigation into its source module.
- `LKM` is not required for joining or applying in MVP.
