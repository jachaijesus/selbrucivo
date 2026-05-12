# Selbrucivo — PRD

## Original Problem Statement (Phase 2 Restructure)
Selbrucivo is a **location-based creative library** for **Animation, Illustration, and Graphic Design**. It is the academia of self — contemplative, archival, anti-engagement. The product should feel like a digital museum or living archive, NOT a social platform. Users belong to a **Local Library** (their city) and a **Guild** (one of three vocations). When a city reaches 3,000 members with 1,000 per guild, it joins the **Global Library** network and its works become visible to other global cities.

## Hard Constraints (forbidden by user)
- No likes, comments, followers, reposts, DMs, reactions, engagement ranks, public popularity metrics.
- No XP, coins, streaks, or gamification.
- No aggressive notifications or algorithmic loops.

## Architecture Decisions (this build)
- **Lockscreen experience** is simulated by in-app **Ambient Mode** (fullscreen, horizontally-swipeable, cinematic). True OS lockscreen control is impossible cross-platform; deferred to future native research.
- **Image storage**: base64 in MongoDB for now. Schema is structured so an object-storage migration is non-breaking (just a `image_storage_kind` field can be added later).
- **Auth**: JWT username/password only (Emergent Google login deferred).
- **Codebase**: Phase 1 transformed in place — wallpapers/timezones/classes removed; auth & admin foundation retained.

## Tech Stack
- Backend: FastAPI + Motor (MongoDB) + Pillow (portrait validation) + bcrypt + PyJWT
- Frontend: Expo Router (React Native + RN Web), expo-image, expo-location, axios, AsyncStorage
- DB collections: `users`, `local_libraries`, `artworks`, `admin_users`

## Data Models (key fields)
- `users`: { _id, username, password_hash, guild, city, region, country, library_id, latitude, longitude, onboarded, created_at }
- `local_libraries`: { _id, slug, city, region, country, member_count, guild_counts: {illustrator, animator, designer}, is_global, created_at, promoted_at }
- `artworks`: { _id, uploader_id, creator_name, guild, library_id, city, region, country, title, description, tags, image_base64, image_mime, width, height, status (pending|approved|rejected), uploaded_at, approved_at, reviewed_by, reject_reason }
- `admin_users`: { _id, username, password_hash }

## Implemented (Phase 2 P0) — Feb 2026
- ✅ JWT auth (register/login) + `/auth/me` returning guild + library
- ✅ Onboarding: guild picker (3 options) + place capture (expo-location with manual fallback) + ceremony screen
- ✅ Local Library auto-creation, member/guild counter increments, idempotent for same user
- ✅ Global library promotion check (3,000 / 1,000 per guild threshold)
- ✅ Artwork upload with Pillow-enforced portrait validation (min 720×1280, aspect ≤ 9:16)
- ✅ Artwork feed (`scope=local|global`, optional `guild` filter)
- ✅ Ambient Mode: fullscreen horizontal FlatList with tap-to-toggle overlay, scope/guild chips
- ✅ Library tab: member counts, progress bars to global, network stats
- ✅ Profile: own uploads with status badges (archived/pending/withheld), logout
- ✅ Admin moderation: pending queue, approve, reject with reason
- ✅ Observational metrics endpoint (no engagement metrics)
- ✅ Seed script: testuser/password123 in Tampa with 8 approved + 1 pending artwork
- ✅ Fixed critical bug: `ensure_local_library` was stripping `_id` for existing libraries; repeat onboarders ended up with `library_id=None`. Now returns the full doc with `id` populated.

## Visual Language System (Feb 2026)
A central design language extracted from the user's Phase 1 visual-direction board:
- **Tokens**: `/app/frontend/theme.ts` — palette (ink, paper, parchment, coral accent, gunsmoke), type scale (display serif + sans + mono catalog labels), 9-step spacing.
- **Web fonts**: `/app/frontend/app/+html.tsx` injects Google Fonts (EB Garamond, DM Sans, JetBrains Mono).
- **Motion**: `/app/frontend/utils/motion.tsx` — `FadeIn` (atmospheric entrance), `Fader` (controlled opacity for the ambient overlay).
- **Ambient Mode** overlay now auto-fades after 4s and re-reveals on tap (cinematic viewing environment, not feed).
- **Ceremony** screen is a coral editorial placard (museum acquisition card).
- **Onboarding guild picker** uses roman numerals + serif labels (exhibition list).
- **Library / Profile / Login / Register** all use editorial type hierarchy (serif italic display + mono catalog labels + sans body) and hairline rules.

## Ceremonial Onboarding Walkthrough (Feb 2026)
Seven-folio first-time-user experience replacing the prior two-step flow. Each folio is its own route with `fol. n / vii` catalog marks and slow `FadeIn` staggers.
- **fol. i** — `/` Welcome (italic Garamond wordmark, "The Academia of Self.", "A living archive for Animation, Illustration, and Graphic Design.", ENTER CTA). Auto-redirects authed/onboarded users past it.
- **fol. ii** — `/onboarding/philosophy` ("Observe slowly. Contribute intentionally. Browse ambiently." in coral italic; manifesto body)
- **fol. iii** — `/onboarding/guild` (roman-numeral exhibition list, coral selection underline; guild stored locally)
- **fol. iv** — `/onboarding/place` (allow-location + manual city/region/country; submits `/api/auth/onboarding`)
- **fol. v** — `/onboarding/ceremony` (coral museum placard: "You are now connected to ⟨Guild⟩ ⟨City, Country⟩")
- **fol. vi** — `/onboarding/ambient` (live preview window with drifting crossfade between the user's local works + 3 em-dash explanations)
- **fol. vii** — `/onboarding/contribute` (two equal CTAs: Inscribe / Browse — contribution is welcomed, never demanded)
- Final transition into `/(tabs)/ambient`.

Routing: register/login with `onboarded=false` → `/onboarding` (router gate) → philosophy. Hard-refresh resilience: gate checks `auth/me` and forwards onboarded users to ambient.

## Verified
- Backend pytest: 34/34 pass (auth, onboarding, admin, portrait validation, feed scopes, moderation round-trip, metrics, absence of engagement endpoints)
- Multi-user Boston onboarding: member_count correctly increments to 2, guild_counts split correctly
- Frontend smoke: login → ambient with seeded artworks; library/profile/upload/admin screens render

## Endpoints
- `POST /api/auth/register` · `POST /api/auth/login` · `GET /api/auth/me` · `POST /api/auth/onboarding`
- `POST /api/admin/auth/login`
- `POST /api/artworks/upload` · `GET /api/artworks/feed` · `GET /api/artworks/mine` · `GET /api/artworks/{id}`
- `GET /api/library/me` · `GET /api/libraries`
- `GET /api/admin/artworks/pending` · `GET /api/admin/artworks` · `POST /api/admin/artworks/{id}/approve` · `POST /api/admin/artworks/{id}/reject`
- `GET /api/metrics/global`

## Backlog (P1+)
- Archive grid view (browse approved works by guild / time)
- Creator attribution page (works grouped by creator_name within a library)
- Single-artwork detail screen with metadata
- Library directory browser (list other cities, view global ones)
- Native upload (expo-image-picker / expo-document-picker) — current upload is web-file-input only
- Object storage migration (e.g., Emergent-managed) once base64 strains MongoDB
- Background refresh + Live Activities for actual lockscreen presence (native code required)
- Passive 24h location-presence validation (carried over from Phase 1 backlog, may be re-scoped)
- Admin-curated featured rotations (still archival, not algorithmic)
- Internationalization

## Forbidden List (do NOT implement)
likes · comments · followers · DMs · reactions · public popularity rankings · push spam · gamification

## Test Credentials
See `/app/memory/test_credentials.md`.
