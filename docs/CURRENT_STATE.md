# Current State

Prepared for read-only architecture handoff on 2026-07-14.

This branch is a read-only architecture-review snapshot. It is not the production version of Selbrucivo, it contains work-in-progress and unmerged prototype features, and the public application is not yet deployed. Localhost URLs are for local development only and are not accessible to outside reviewers. Screenshots represent the interface on July 14, 2026. No repository changes should be treated as approved for `main` merely because they appear in this branch.

## Repository

- Repository path: `/Users/jachai/Documents/selbrucivo/build-selbrucivo-s-first-interactive-sphere`
- Active branch: `main`
- Review branch: `review/selbrucivo-notion-handoff-2026-07-14`
- GitHub remote: `origin https://github.com/jachaijesus/selbrucivo.git`
- Handoff mode: read-only architecture review
- Remote mutation status: no commit, push, branch creation, pull request, or publication performed

## Build

Production build command:

```sh
pnpm build
```

Latest local result during handoff preparation:

```text
tsc --noEmit && vite build
64 modules transformed
dist/index.html
dist/assets/*.css
dist/assets/*.js
build completed successfully
```

The Codex desktop shell needed the bundled Node runtime on `PATH`; the project scripts themselves remain unchanged.

## Local Environment And Secrets

- No `.env*` files were present during inspection.
- No `.pem`, `.key`, `.crt`, `id_rsa*`, or `credentials*` files were found at shallow project depth.
- No provider credentials are required for the current client-only prototype.
- `.env.example` documents the non-secret prototype feature flag only.

The active app includes a development-safe feature flag:

```text
VITE_ENABLE_LIBRARY_ACCOUNT_PROTOTYPE=true
```

This flag enables a mocked prototype provider in production builds only when explicitly set. It must not carry secrets.

## Application Shape

The root app is the current canonical Selbrucivo prototype. The archive at `archive/emergent-ai-first-iteration/` is historical and should not be merged into current architecture without a separate migration decision.

Primary areas:

- `src/components/` contains the React UI surfaces.
- `src/domain/` contains Selbrucivo domain structures.
- `src/services/materialSearch.ts` handles Book discovery.
- `src/services/availability/` handles Phase 2 external availability routing.
- `src/services/libraryAccounts/` handles Phase 3 Connected Library Account prototype state.

## Current User-Facing Capabilities

- Threshold and Login prototype entry
- Interactive Sphere orientation
- Pathway Overview
- Golem pathway environment shell
- Books search and Add to Golem
- Saved Book workspace
- Student Book relationship controls
- Current page and chapter tracking
- Notes, highlights, citations, and relationship objects
- Access Routes inside saved Book workspaces
- Connected Libraries section inside Golem
- Minimal Control Center navigation entry to Library Connections

The active pathway IDs are `chrysopoeia`, `golem`, `fafo`, and `essays`. Materials saved with the previous `archive`, `library`, and `train-station` pathway IDs are migrated on load.

## Phase 2 Availability

Availability routing is separate from discovery.

Live public providers:

- Open Library
- Google Books

Disabled boundaries:

- WorldCat
- OverDrive / Libby

The client-only app does not expose provider secrets. WorldCat and OverDrive / Libby remain future integrations requiring approved credentials and likely a server-side boundary.

## Phase 3 Connected Library Accounts

Connected Library Accounts are development-safe only.

Prototype provider:

- Provider id: `selbrucivo-library-prototype`
- Provider name: `Selbrucivo Library Connection Prototype`
- Visible label: `PROTOTYPE CONNECTION`
- Mocked status: always `isMocked: true`

Public/non-account providers:

- Open Library: public access source, no account connection
- Google Books: public book source, no library-membership connection

Disabled/server-boundary providers:

- WorldCat
- OverDrive / Libby

## Persistence Boundaries

Material and relationship persistence remain separate from account state.

Material storage:

```text
selbrucivo.library.materials.v1
```

Phase 2 access handoff:

```text
selbrucivo.library.accessHandoff.v1
```

Phase 3 connected accounts:

```text
selbrucivo.library.connectedAccounts.v1
```

Phase 3 account handoff:

```text
selbrucivo.library.accountHandoff.v1
```

## Screenshots

Current screenshots for handoff review:

- `docs/screenshots/desktop-current.png`
- `docs/screenshots/mobile-current.png`

## Known Review Notes

- Automated tests are not configured.
- Manual verification matrices are documented under `docs/`.
- Browser smoke verification covered local load, Library entry, Connected Libraries visibility, prototype connection flow, and production build success.
- A complete field-by-field saved Book persistence pass should be repeated by the handoff reviewer before any production decision.

## Handoff Scope

This handoff is for read-only architecture review by Claude through GitHub after team authorization. It is not a release request.
