# Phase 3 Connected Library Accounts Manual Verification

Phase 3 adds a development-safe Connected Library Accounts prototype. It does not connect to live Open Library, Google Books, WorldCat, OverDrive, or Libby patron accounts.

## Feature Gate

The prototype provider is registered only when:

```text
import.meta.env.DEV
```

or:

```text
VITE_ENABLE_LIBRARY_ACCOUNT_PROTOTYPE=true
```

The flag is not a secret and must not contain credentials. Production builds omit prototype connection controls unless explicitly enabled. Stored prototype records are ignored when the prototype feature is disabled.

## Security

- No real library-card numbers, PINs, passwords, OAuth codes, access tokens, refresh tokens, or provider secrets are collected.
- Account state is stored separately under `selbrucivo.library.connectedAccounts.v1`.
- Account handoff is stored separately under `selbrucivo.library.accountHandoff.v1`.
- Material data remains under `selbrucivo.library.materials.v1`.
- Phase 2 external access handoff remains under `selbrucivo.library.accessHandoff.v1`.

## Connection

- Open `Golem -> Connected Libraries`.
- Confirm the prototype notice is visible.
- Confirm no credential fields are rendered.
- Review provider capability summaries.
- Connect the prototype provider.
- Decline the prototype provider.
- Cancel the prototype provider.
- Attempt duplicate connection and confirm it updates the same provider context rather than creating duplicate account rows.

## Statuses

Use `PROTOTYPE REVIEW CONTROLS` to verify:

- Disconnected.
- Connecting where applicable.
- Connected.
- Reauthentication required.
- Authorization declined.
- Connection revoked.
- Card expired.
- Access limited.
- Provider unavailable.
- Configuration required.
- Error fallback where storage or action failure is simulated.

## Route Enrichment

- Save a Book.
- Open the Reading Workspace.
- Confirm Phase 2 routes load.
- Connect the prototype account.
- Confirm routes are enriched with prototype membership context without changing route IDs, access kinds, provider names, or confidence.
- Disconnect the account.
- Confirm public routes remain and account-specific context is removed.
- Confirm catalog records are not converted into borrowing or availability claims.

## P2-V1 Persistence

For one saved Book, establish:

- Relationship: Physical Copy.
- Shelf placement.
- Current page.
- Current chapter.
- One note.
- One highlight.
- One citation.
- One bookmark, where supported.
- One linked Material, where supported.

Then test:

1. Connect prototype account.
2. Refresh Phase 2 access routes.
3. Change to reauthentication-required.
4. Restore connected status.
5. Change to provider-unavailable.
6. Change to access-limited.
7. Disconnect account.
8. Leave the Book.
9. Leave Golem.
10. Return to Golem.
11. Return to the Book.
12. Reload the browser.

Verify student-owned data remains unchanged.

## Storage Robustness

- Malformed account storage returns an empty safe account state.
- Storage unavailable does not alter Material data.
- Account reset does not remove Books.
- Prototype disabled with stored prototype data does not re-render prototype controls.

## Regression

- Books search still works.
- Add to Golem still works.
- Phase 2 Access Routes still work.
- External access handoff still works.
- Library shell remains stable.
- Control Center opens and returns.
- Pathway Overview return works.
- Sphere behavior remains stable.
- Chrysopoeia, FaFo, and Essays pathways remain available.
- Login and Threshold remain unchanged.
- Production build passes.
