# Selbrucivo Prototype

Selbrucivo is a Vite, React, and TypeScript prototype for an interactive learning sphere. The current approved prototype includes the Golem pathway, Book Material workspaces, Phase 2 external availability routing, and Phase 3 development-safe Connected Library Accounts.

This branch is a read-only architecture-review snapshot for Claude and team review. It is not the production version of Selbrucivo, it contains work-in-progress and unmerged prototype features, and the public application is not yet deployed.

Localhost URLs in this repository are for local development only and are not accessible to outside reviewers. Screenshots represent the interface on July 14, 2026. No repository changes should be treated as approved for `main` merely because they appear in this branch.

## Current Status

- Active branch at handoff preparation: `main`
- Active app location: repository root
- Runtime: client-only Vite app
- Primary source: `src/`
- Documentation: `docs/`
- Historical archive: `archive/emergent-ai-first-iteration/`
- Snapshot branch: `review/selbrucivo-notion-handoff-2026-07-14`
- Snapshot purpose: read-only architecture review, not production release

The archived Emergent.ai iteration is retained for historical reference only. The root app is the current prototype.

## Architecture Summary

The prototype keeps these domains separate:

- Student identity and app session
- Sphere and pathway architecture
- Golem pathway environment shell
- Book Material identity
- Student Book relationship state
- External availability routing
- Connected Library Account prototype state

Book discovery identifies `SphereMaterial` and `BookEdition` records. Availability routing identifies external access possibilities through a dedicated service layer under `src/services/availability/`. Connected Library Accounts are modeled separately under `src/services/libraryAccounts/`.

The active pathway IDs are `chrysopoeia`, `golem`, `fafo`, and `essays`. Legacy saved materials using `archive`, `library`, or `train-station` are migrated when loaded.

## Implemented Prototype Areas

- Sphere orientation and pathway shell
- Login and Threshold prototype entry
- Golem pathway environment
- Book discovery and Add to Golem
- Saved Book workspace
- Student relationship persistence
- Current page and chapter fields
- Notes, highlights, citations, and related relationship objects
- Phase 2 Access Routes using Open Library and Google Books public sources
- Phase 3 Connected Libraries prototype with a clearly labeled non-live provider
- Public provider boundaries for Open Library and Google Books
- Disabled/server-boundary boundaries for WorldCat and OverDrive / Libby

## Non-Goals In Current Prototype

- No production publishing
- No backend
- No provider secrets
- No OAuth flow
- No real patron account connection
- No real loans, holds, checkouts, or library-card validation
- No live WorldCat or OverDrive / Libby integration

## Local Setup

Install dependencies:

```sh
pnpm install
```

Start the local development server:

```sh
pnpm dev
```

The dev server is configured for:

```text
http://127.0.0.1:5173/
```

Build for production:

```sh
pnpm build
```

Preview a production build:

```sh
pnpm preview
```

## Environment Flags

Copy `.env.example` to a local `.env` file only when a local override is needed.

```sh
cp .env.example .env
```

The only documented Phase 3 flag is:

```text
VITE_ENABLE_LIBRARY_ACCOUNT_PROTOTYPE=true
```

The prototype account provider is automatically available during Vite development through `import.meta.env.DEV`. In a production build, it is hidden unless the explicit flag is set to `"true"`. This flag is not a secret and must never contain credentials.

## Local Team Access Bypass

The entry-panel bypass is a local-development convenience flag, not authentication. It must not be used to represent secure login behavior, and it must not contain team credentials.

To activate it for the current local browser origin, open the browser console or local storage inspector while running the Vite dev server and set:

```js
localStorage.setItem('selbrucivo.localAccessBypass', 'true');
```

Reload the page after setting the flag. The flag survives reloads for the same origin until it is removed. Browser storage is origin-scoped, so `http://localhost:5173`, `http://127.0.0.1:5173`, and a production preview URL do not share the same value.

To deactivate it, remove the flag and reload:

```js
localStorage.removeItem('selbrucivo.localAccessBypass');
```

The bypass is guarded by `import.meta.env.DEV`, so it should be tree-shaken out of production builds. Confirm that before any preview handoff by running `pnpm build` and verifying that `dist/` does not contain `selbrucivo.localAccessBypass`.

## Build Verification

The current handoff build command is:

```sh
pnpm build
```

In the Codex desktop runtime, the shell may need a Node path injected if `node` is not on `PATH`.

## Handoff Documents

- [Current State](docs/CURRENT_STATE.md)
- [Decision Log](docs/DECISION_LOG.md)
- [Phase 2 Availability Manual Verification](docs/PHASE_2_AVAILABILITY_MANUAL_VERIFICATION.md)
- [Phase 3 Connected Library Accounts Manual Verification](docs/PHASE_3_CONNECTED_LIBRARY_ACCOUNTS_MANUAL_VERIFICATION.md)

## Screenshots

Current architecture handoff screenshots are stored in:

```text
docs/screenshots/
```

Expected files:

- `desktop-current.png`
- `mobile-current.png`

## GitHub Handoff Boundary

This preparation does not commit, push, create a branch, open a pull request, or modify GitHub remote state. Those steps require explicit team review and authorization.
