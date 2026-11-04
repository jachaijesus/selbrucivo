# Phase 2 Availability Manual Verification

This project does not currently include an automated test runner. Phase 2 keeps normalization, caching, sorting, deduplication, and URL safety in pure service modules so focused tests can be added later without reshaping the feature.

## Provider Boundary Notes

Open Library and Google Books are the only live Phase 2 providers. They are called from the Vite client because the implemented endpoints do not require committed secrets.

WorldCat and OverDrive are disabled adapter boundaries. They must remain unconfigured until approved API access, credential handling, and likely a server-side boundary exist. They must not produce production holdings, circulation, eligibility, or universal library-card claims.

## Identity

- One saved Book remains one Selbrucivo Material when Open Library and Google Books both return routes.
- Provider records do not create duplicate saved Books.
- Edition association remains stable when a route matches ISBN.

## Matching

- Exact ISBN-13 matches an edition route where provider data includes ISBN-13.
- Exact ISBN-10 matches an edition route where provider data includes ISBN-10.
- Known Open Library provider ID produces a catalog route without replacing Material identity.
- Title and author fallback produces lower-confidence catalog/provider-reported routes.
- Lower-confidence fallback is not displayed as verified borrowing.
- Translation mismatch is not forced onto an edition without ISBN/provider evidence.
- Edition mismatch remains Material-level when evidence is insufficient.

## Providers

- Open Library success returns catalog, open-access, or digital-borrow routes only when provider data supports them.
- Google Books success distinguishes full view, preview, and catalog record.
- One provider failure still shows other provider routes as partial.
- One provider timeout still shows other provider routes as partial.
- Both providers returning routes deduplicates without collapsing different access meanings.
- Both providers returning no routes shows the no-route state.
- WorldCat unconfigured is omitted from student-facing errors.
- OverDrive unconfigured is omitted from student-facing errors.

## Routes

- Full view displays `READ THROUGH PROVIDER`.
- Open access displays `OPEN SOURCE`.
- Preview displays `VIEW PREVIEW`.
- Catalog record displays `VIEW PROVIDER RECORD`.
- Digital borrow appears only when Open Library explicitly reports borrowable access.
- Deduplication preserves different route kinds.
- Ordering places open/full/digital routes before previews and catalog records.
- Edition display appears when a route can be safely associated.

## State

- Loading keeps reading placement, notes, highlights, and citations usable.
- Refreshing keeps existing routes visible where available.
- Partial shows `SOME SOURCES COULD NOT BE CHECKED`.
- Ready shows route list.
- Empty shows `NO CONNECTED ACCESS ROUTE FOUND`.
- Failed shows a general source-check failure without raw technical errors.

## Handoff

- Safe `http:` and `https:` URLs open in a new tab.
- Unsafe URL protocols are rejected.
- New-tab behavior uses `noopener,noreferrer`.
- Same Material remains selected after handoff.
- Scroll position is stored and restored where practical.
- Return language does not imply borrowing, authentication, checkout, or access success.

## Regression

- Search still works.
- Add to Golem still works.
- Shelf persists.
- Current page persists.
- Notes persist.
- Highlights persist.
- Citations persist.
- Return to Pathway Overview works.
- Control Center works.
- Other pathways remain unchanged.
- Login and Threshold remain unchanged.
- Production build passes.
