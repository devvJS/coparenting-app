# Testing

This file documents the seeded test fixtures used during local and preview development. The seed lives at `supabase/seed.sql` and is applied automatically by `supabase db reset` (or any equivalent reseed command in your Supabase workflow).

## Test accounts

Both accounts use the same password.

| Role        | Email                  | Password        | User ID (UUID)                          |
|-------------|------------------------|-----------------|-----------------------------------------|
| Co-parent A | `parent.a@example.com` | `Password123!`  | `11111111-1111-1111-1111-111111111111`  |
| Co-parent B | `parent.b@example.com` | `Password123!`  | `22222222-2222-2222-2222-222222222222`  |

Both users are members of the same household (`aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa` — "The Demo Family") and share one child:

| Child         | UUID                                    | Notes                                    |
|---------------|-----------------------------------------|------------------------------------------|
| Riley Demo    | `cccccccc-cccc-cccc-cccc-cccccccccccc`  | DOB 2018-06-15; sample medical/school   |

Seed data also includes:

- **3 events** — soccer practice, pediatrician checkup, school field trip (all linked to Riley).
- **1 custody schedule** — weekly Mon/Tue/Wed with Parent A.
- **3 messages** — first two read, the most recent unread (so unread-count UI has something to render).

## Resetting the seed

```bash
# wipes the DB and re-applies migrations + seed
supabase db reset

# or, against a remote project
supabase db reset --linked
```

## Verifying RLS

A quick smoke test in the SQL editor (run as one of the seeded users via `set local request.jwt.claim.sub = '...'` or by signing in through the client):

```sql
-- As parent.a@example.com → should return one row
select id, name from public.households;

-- As an unrelated user → should return zero rows
select id, name from public.households;
```

Same expectation holds for `children`, `events`, `messages`, `documents`, `notifications`: every read is implicitly scoped by `is_household_member()`.

> **⚠️ These credentials are for local/preview environments only.** Do not seed `Password123!` accounts into production.
