# Farmer-to-restaurant marketplace: implementation plan

Status: planning only; no application has been implemented.

## Demo emphasis and purchase entry points

The farmer journey is the primary product story. Restaurant onboarding, forecasting and purchasing explain why buyers join and return.

Support two entry points into the same negotiation workflow: a farmer publishes available harvest for eligible buyers to discover; or a restaurant reviews a low-stock forecast, approves a suggested purchase requirement and finds matching farmer listings. Restaurant purchasing must be visibly demonstrated, not represented only as background competing bids.

Both farmer and restaurant owners configure their own agents' private limits and preferences before negotiation. Agents may propose terms within those limits; the farmer retains the final buyer-selection decision.

External services belong behind replaceable backend adapters. Keep any negotiation-model and government-data API credentials server-side in environment configuration, never in browser code, seeded records or logs. Document required configuration during implementation. A local Chronos-2 inference setup does not inherently need a hosted forecasting API key. Missing external credentials must produce an explicit unavailable state or a clearly labelled simulation, rather than block the entire demo.

## Product and scope

Build a fresh PS 1.2 prototype connecting farmers with restaurant buyers. Agents negotiate using private owner-configured constraints; the farmer explicitly selects the buyer. Simulate payment protection without moving money.

Primary demonstration: one farmer, three restaurants, one tomato lot. The farmer interface supports additional produce listings, but the scripted negotiation focuses on one lot. One restaurant wins the selected quantity; unsold stock remains available. Splitting a lot among several winners is deferred.

The brochure prohibits old-project reuse. Use Inception as visual and architectural inspiration, with a new implementation. Preserve its useful separation of participant workspaces and an inspectable activity view. Use agricultural greens, warm neutral surfaces, clear typography, and produce imagery; keep the farmer's main journey simple.

## End-to-end demonstration

1. Farmer creates a profile with language, location and collection details.
2. Farmer lists tomatoes with variety, declared grade, quantity in kg, harvest date, availability window, photos and pickup terms. Future harvests must be distinguished from available stock; demo uses available stock.
3. Farmer privately sets minimum acceptable price, minimum order quantity and payment/pickup conditions. These never appear to restaurant agents.
4. A dated government mandi comparison appears alongside the listing. Missing, stale or incompatible references are labelled rather than silently substituted.
5. Restaurant A sees a low-stock warning. A consumption forecast and batch inventory projection explain the recommended quantity and required delivery date. Restaurants B and C have independent requirements and budgets.
6. Eligible restaurants submit offers through their own scoped agents. Eligibility checks crop, grade, quantity, delivery window and service radius. Each restaurant's maximum budget stays private.
7. A bounded negotiation window allows counteroffers. Offers specify unit price, quantity, pickup time, transport responsibility, payment terms and validity. Each buyer-approved negotiation policy authorizes these provisional offers; submitting an offer does not debit funds.
8. Farmer sees current offers side by side, including gross amount and explicitly estimated deductions. Recommendation is advisory. For the initial demo all buyers collect, making transport responsibility unambiguous.
9. Farmer explicitly selects an offer. The buyer confirms the exact agreement version, available inventory and terms are revalidated, and stock is reserved atomically. Changed terms require new confirmation.
10. Buyer funds the simulated order before a deadline. Timeout/cancellation releases the reservation. Show a funded simulation label, pickup, receipt and simulated settlement. Payment release uses explicit receipt confirmation in the happy-path demo.

Seed separate buyer budgets. Do not build a wallet product; show each order's simulated funded amount. No payment credentials or real money.

## Screens

| Screen | Main purpose |
| --- | --- |
| Landing / demo role chooser | Explain value and enter farmer or restaurant workspace; demo switching is not production authentication |
| Farmer onboarding and harvest listing | Create profile, list produce, configure private negotiation rules |
| Farmer dashboard | Available harvest, dated price references, offers awaiting selection, confirmed orders |
| Restaurant dashboard | Stock by ingredient/batch, projected shortage, suggested purchase, private buying limits |
| Offer comparison | Compare three buyers and let farmer choose; show why offers qualify |
| Negotiation activity | Inspect submitted offers, counteroffers, rejected actions and stop reasons; avoid fabricated agent chatter |
| Order detail | Exact agreement, reserved quantity, simulated funding, pickup and receipt progress |

## Forecasting and expiry

Use pretrained Amazon Chronos-2 for consumption forecasting, initially without fine-tuning. A time-series model predicts usage, not stockout dates directly. A separate deterministic inventory projection combines forecasts, batches, estimated usable-until dates, confirmed deliveries and lead times.

Use clearly labelled synthetic restaurant histories for the demonstration, with weekday variation and different usage levels. Track consumption separately from waste; mark stockout days so zero recorded usage is not automatically treated as zero demand. Simulate earliest-usable-until batches being consumed first. Show forecast uncertainty and assumptions. Estimated produce shelf life is not a safety guarantee.

Proposed demo horizon: seven days, with approximately 90 days of seeded daily history. These are implementation choices, not claims of sufficient real-world evidence. Evaluate a held-out period against a weekday seasonal-naive baseline. Synthetic results establish demo behavior, not real restaurant accuracy.

Calculate replenishment from projected usable stock and expected consumption over lead time and the review window. Avoid counting stock expected to deteriorate before use, and avoid ordering quantities unlikely to be consumed during their usable life. Missing history uses explicitly configured demand or a labelled simple estimate; do not silently claim Chronos ran.

## Negotiation design

- One scoped agent per participant; use the same model service if desired, but independent private context and permissions.
- Store limits and executable constraints in validated server-side records. Knowledge-base text can explain preferences but cannot override hard limits.
- Agent outputs structured proposals. Server validates price, budget, quantity, eligibility, round count and offer expiry.
- Proposed maximum: three counteroffer rounds per buyer and a configurable negotiation deadline. Demo controls may advance the simulation clock visibly.
- Offers from different buyers can exceed the lot in aggregate while provisional. Only confirmed reservations consume stock.
- Exclude own minimum price and other buyers' confidential data from agent tool responses. Never invent competing offers.
- Allow no-deal results. Do not lower the farmer's floor automatically because produce is perishable.
- Recommendation considers eligible terms and farmer preferences. Compare both quantity and net unit return; do not rank different quantities by gross value alone.
- No agent may select the winning buyer, confirm for a human, reserve stock directly or release funds.
- If an AI service is unavailable, show the failure or an explicitly labelled rule-based demonstration mode.

## Market data

Primary candidate: data.gov.in Current Daily Price of Various Commodities from Various Markets (Mandi).

Reference dashboard: official e-NAM / AGMARKNET comparison.

Integration spike must verify authenticated access, response fields, units, local crop/market coverage, reporting dates and request limits. A continuously streaming nationwide price API has not been verified. The official resource reports daily prices.

Keep source reporting date separate from retrieval time. Match commodity, variety, grade where available, market and unit. Display min/modal/max where provided; modal is not the arithmetic average. Convert only known units. A benchmark is not a guaranteed sale price or automatic proof of underpayment.

Use cached results with explicit dates. If credentials or service access are unavailable, use a documented dated snapshot or visibly synthetic fixture. Never present fixture data as current API results.

## Proposed technical architecture

- React + TypeScript frontend, with reusable farmer/buyer layouts and a green visual system.
- FastAPI backend for validation, role-scoped commands, negotiation and order transitions.
- SQLite for the local prototype, with transactional reservations and an append-only event history.
- Background forecasting job so model loading does not block normal UI interactions.
- Chronos-2 adapter isolated from inventory calculations.
- Server-side LLM adapter with scoped tools and structured output validation.
- Server-side government price adapter with caching and provenance.
- Polling initially for negotiation updates; add server-sent events only if it materially improves the demo.

Core records: participant, private policy, produce lot, restaurant inventory batch, consumption record, purchase requirement, market quote, negotiation, offer version, agreement, reservation, simulated payment and audit event.

## Implementation order and completion checks

### 1. Foundations and visual shell
Create fresh project, schema, seed/reset command and role-scoped API. Build farmer and restaurant dashboard shells. Inspect Inception visuals as reference without copying its implementation.

Done when: one farmer and three restaurants can enter independent workspaces; private policies remain scoped.

### 2. Listings and price references
Implement onboarding, lot creation, validated units and government-data adapter spike. Add source/date labels and honest offline states.

Done when: farmer can create a harvest and see a compatible benchmark or a clear unavailable state.

### 3. Buyer requirements and forecasting
Implement seeded consumption, inventory batches, Chronos adapter, baseline comparison and expiry-aware stock projection.

Done when: Restaurant A has an explainable shortage and suggested order; an expiring batch changes the recommendation correctly.

### 4. Matching and agent negotiation
Implement eligibility, scoped proposals/counteroffers, hard-limit enforcement, deadlines, comparison and no-deal behavior.

Done when: three buyers generate distinct valid offers, an invalid proposal is rejected, and farmer can inspect the recommendation without automatic selection.

### 5. Confirmation and simulated payments
Implement agreement versioning, buyer confirmation, atomic reservation, funding deadline, simulated funding, pickup, receipt and settlement.

Done when: selected stock cannot be double-reserved; repeated actions do not double-charge or double-settle even in simulation; timeout restores availability.

### 6. Demo polish and submission
Polish green UI, empty/error states, responsive layouts and a deterministic reset. Prepare a short farmer-to-buyer demonstration and architecture diagram. Follow the supplied PPT template when available; brochure asks for one problem statement and a demo of up to four minutes.

Done when: a complete reset-to-order walkthrough runs without editing database state manually, and all simulated/source-derived content is accurately labelled.

## Focused verification

- Reject prices below farmer limits and above buyer-authorized limits.
- Prevent access to another participant's private policies.
- Revalidate current quantity and agreement version at confirmation.
- Prevent concurrent double reservations and repeated state-transition effects.
- Release reservations on simulated funding timeout.
- Exclude unusable inventory and count confirmed arrivals correctly in stock projection.
- Distinguish stale/absent benchmarks and unavailable AI from successful results.
- Exercise one full UI journey and one no-deal journey.

## Deferred scope

Real-money escrow, wallets, production identity verification, multi-stop route optimization, nationwide crop coverage, multi-winner allocation, automated quality certification, complex disputes, guaranteed savings and automatic final purchase decisions.

## Research references

- https://www.data.gov.in/resource/current-daily-price-various-commodities-various-markets-mandi
- https://www.enam.gov.in/web/dashboard/Agm_Enam_ctrl
- https://www.amazon.science/blog/introducing-chronos-2-from-univariate-to-universal-forecasting
- https://www.cashfree.com/docs/api-reference/payments/latest/split/easy-split-overview

## Dependencies to resolve during implementation

Government API access and local coverage; agent model credentials; local Chronos runtime capacity; actual PPT template. These do not block building the initial screens, domain rules and clearly labelled demo fixtures.
