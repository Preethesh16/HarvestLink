# HarvestLink frontend implementation

- Fresh React 19 + TypeScript + Vite frontend; no source reused from reference projects.
- Reviewed Inception hero screenshot for cream/green visual organization. Custom forest sidebar, typography, harvest cards, participant switching and low-poly procedural farm.
- React Three Fiber illustration is lazy loaded, caps pixel ratio, uses reduced-motion demand rendering and WebGL/error fallback. No model downloads or orbit controls; decorative scene does not capture mobile navigation.
- All mutations go through backend role-scoped APIs. Forms cover profile, harvest, private policy and CSV validation/import. Restaurant CSV supports atomic replacement via explicit checkbox.
- Forecast view shows method, consumption chart, projected shortage, order-by date, expiry waste, recommended requirement and optional held-out model evaluation.
- Negotiation view exposes actual structured rounds, scoped offers and explicit farmer selection. Buyer confirms agreement; simulated payment and delivery actions follow backend statuses.
- Dated market source and demonstration labels avoid claiming fixture data is live. No API credentials in frontend. Local role switching is a demonstration, not authentication.
- Vite proxy forwards `/api` to port 8000. `npm run build` passes TypeScript and production bundling. Main bundle roughly 257KB uncompressed; lazy R3F/Three scene roughly 906KB produces a bundle-size advisory.
- Parent task owns end-to-end verification, screenshots/video, repository documentation and root milestone updates.

## Final interaction polish

- Added Prettier and `npm run format`; formatted all frontend source and Vite configuration.
- Dialogs trap keyboard focus, close on Escape when idle, return focus to their trigger and prevent dismissal during a mutation.
- Pending mutations show action-specific progress outside dialogs, lock role switching, and prevent duplicate requests. State fetches ignore stale role/request responses.
- Sidebar identity derives from current profile. Offer counts/cards include active unexpired offers only; event journal preserves negotiation history.
- Negotiation harvest selector supports multiple listings; offers resolve actual crop and explicitly label seeded nearby distances. Farmer harvest-card negotiation selects that harvest.
- Market reference refresh calls the existing backend endpoint with source/error feedback.
- Production build passes after polish.
