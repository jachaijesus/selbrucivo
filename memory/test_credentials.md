# Selbrucivo — Test Credentials

## Curator (admin)
- Username: `admin`
- Password: `admin123`
- Portal route: `/admin/login` → `/admin/dashboard`

## Demo user (seeded, onboarded in Tampa, FL)
- Username: `testuser`
- Password: `password123`
- Guild: Illustrator
- Local library: Tampa, FL, USA
- Login route: `/auth/login`

## Notes
- New users go through `/auth/register` then `/onboarding` (Guild + Place selection).
- The seed script (`backend/seed.py`) creates 8 approved artworks and 1 pending artwork for moderation queue.
- Re-run seed: `cd /app/backend && python seed.py` (this deletes the testuser and reseeds).
