# Decision Log

This log summarizes currently approved architectural decisions relevant to the read-only handoff.

## Repository And Delivery

- The root Vite app is the current Selbrucivo prototype.
- The archived Emergent.ai first iteration is historical reference only.
- Handoff preparation must not commit, push, branch, publish, or modify GitHub remote state without team approval.

## Client-Only Boundary

- The app remains a Vite client-only prototype.
- No backend is introduced in the current phase.
- No provider secrets, OAuth secrets, patron credentials, access tokens, refresh tokens, or callback codes are stored in client code.
- Credential-dependent integrations require a future approved server-side boundary.

## Domain Separation

Selbrucivo maintains separation among:

- Student identity
- Connected Library Account
- Provider authorization
- Access Route
- Book Material
- Student Relationship

A connected account must not replace student identity, own notes, create Book identity, erase relationships, imply universal access, or become required for Library use.

## Book Discovery Versus Availability

- Book discovery identifies Book Materials and editions.
- Availability routing identifies legitimate external access possibilities.
- `materialSearch.ts` may support discovery, but it is not the trusted source for live availability.
- Prototype availability sources were removed from discovery normalization for the trusted Phase 2 path.

## Phase 2 Availability Providers

Live public providers:

- Open Library
- Google Books

Disabled boundaries:

- WorldCat
- OverDrive / Libby

WorldCat and OverDrive / Libby do not fabricate holdings, circulation status, eligibility, or patron access.

## Access Route Semantics

Access route kinds remain distinct:

- `open-access`
- `full-view`
- `preview`
- `digital-borrow`
- `physical-holding`
- `interlibrary-request`
- `institution-access`
- `catalog-record`

Preview is not borrowing. Catalog presence is not immediate access. Unknown availability is not promoted to confirmed access.

## Phase 2 Route Presentation

Access Routes are shown only inside a saved Book workspace and remain visually subordinate to Book identity and the student relationship.

Routes may be grouped for readability by:

- READ
- PREVIEW
- LIBRARY ACCESS
- REFERENCE

Grouping is presentation-only and does not merge routes or change route identity.

## Phase 3 Prototype Provider

The only simulated account provider is:

```text
selbrucivo-library-prototype
Selbrucivo Library Connection Prototype
```

Required visible label:

```text
PROTOTYPE CONNECTION
This is not a live library account.
No real credentials are collected.
```

It is always mocked and must never claim live membership, live eligibility, checkout, holds, loans, or real card status.

## Prototype Feature Gate

The prototype provider is enabled only when:

```ts
import.meta.env.DEV ||
import.meta.env.VITE_ENABLE_LIBRARY_ACCOUNT_PROTOTYPE === "true"
```

Production builds must not expose prototype connection controls unless explicitly enabled. Stored prototype records must not make prototype UI reappear when the feature is disabled.

## Public Provider Account Treatment

- Open Library is a public access source; account connection is not required.
- Google Books is a public book source; a Google account is not treated as a library membership.
- Neither provider has a live connected-library-account flow in this prototype.

## Disabled Provider Account Treatment

- WorldCat is unconfigured and server-dependent.
- OverDrive / Libby is unconfigured and server-dependent.
- Disabled providers should not appear as broken student-facing account providers.

## Connected Account Storage

Connected account storage is separate from Material and availability storage.

Approved keys:

```text
selbrucivo.library.connectedAccounts.v1
selbrucivo.library.accountHandoff.v1
```

Storage contains only normalized, non-sensitive prototype state. Malformed storage falls back to an empty safe state.

## Route Enrichment

Account route enrichment happens after Phase 2 availability normalization, deduplication, and stable route identity assignment.

Enrichment may add prototype context, but must not:

- mutate provider adapter output
- change route IDs
- change provider confidence
- convert one access kind into another
- duplicate routes
- promote unknown availability into confirmed access

## Consent And Disconnection

Connection requires an explicit consent screen and collects no credentials.

Disconnection requires confirmation and removes only account-specific relationship state. It preserves Books, notes, highlights, citations, shelf placement, reading placement, bookmarks, linked Materials, and public access routes.

## Future Architecture Requirements

Future live provider work will require:

- provider approvals
- credential storage outside the browser bundle
- server-side authorization boundary
- secure callback handling
- token lifecycle management
- provider-specific privacy and retention decisions
