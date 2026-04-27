-- Phase 2 seed data.
-- Two co-parents, one shared household, one child, sample events, one custody
-- schedule, and a few messages. Idempotent: re-running drops and recreates
-- everything inside fixed UUIDs.
--
-- Test credentials are documented in /TESTING.md at the repo root.

-- Fixed UUIDs so re-running is idempotent and tests can hard-code them.
-- parent_a:  11111111-1111-1111-1111-111111111111  (parent.a@example.com)
-- parent_b:  22222222-2222-2222-2222-222222222222  (parent.b@example.com)
-- household: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
-- child:     cccccccc-cccc-cccc-cccc-cccccccccccc

-- ---------------------------------------------------------------------------
-- Reset (in dependency order). All public-schema tables cascade through
-- household_id, so deleting the household is enough.
-- ---------------------------------------------------------------------------
delete from public.households where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
delete from auth.identities where user_id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
);
delete from auth.users where id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
);

-- ---------------------------------------------------------------------------
-- Auth users. Password for both accounts is "Password123!".
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated', 'authenticated',
    'parent.a@example.com',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Alex Parent A"}',
    now(), now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated', 'authenticated',
    'parent.b@example.com',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Sam Parent B"}',
    now(), now(),
    '', '', '', ''
  );

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
values
  (
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    jsonb_build_object(
      'sub', '11111111-1111-1111-1111-111111111111',
      'email', 'parent.a@example.com',
      'email_verified', true
    ),
    'email',
    now(), now(), now()
  ),
  (
    gen_random_uuid(),
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    jsonb_build_object(
      'sub', '22222222-2222-2222-2222-222222222222',
      'email', 'parent.b@example.com',
      'email_verified', true
    ),
    'email',
    now(), now(), now()
  );

-- ---------------------------------------------------------------------------
-- Profiles. (The auto-insert trigger lands in Phase 3; until then, seed by hand.)
-- ---------------------------------------------------------------------------
insert into public.profiles (id, display_name, email, avatar_url)
values
  ('11111111-1111-1111-1111-111111111111', 'Alex Parent A', 'parent.a@example.com', null),
  ('22222222-2222-2222-2222-222222222222', 'Sam Parent B',  'parent.b@example.com', null);

-- ---------------------------------------------------------------------------
-- Household + members.
-- ---------------------------------------------------------------------------
insert into public.households (id, name)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'The Demo Family');

insert into public.household_members (household_id, user_id, role)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'co_parent_a'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'co_parent_b');

-- ---------------------------------------------------------------------------
-- Child.
-- ---------------------------------------------------------------------------
insert into public.children (
  id, household_id, first_name, last_name, date_of_birth,
  medical_notes, school_info, emergency_contacts
)
values (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Riley', 'Demo', '2018-06-15',
  'No known allergies. Annual physical due in October.',
  'Maple Elementary — 1st grade, Ms. Carter. Pickup 3:15pm.',
  jsonb_build_array(
    jsonb_build_object(
      'name', 'Grandma Jo',
      'relationship', 'Grandparent',
      'phone', '+1-555-0100',
      'email', 'jo@example.com'
    ),
    jsonb_build_object(
      'name', 'Dr. Patel',
      'relationship', 'Pediatrician',
      'phone', '+1-555-0199',
      'email', 'office@maplepeds.example.com'
    )
  )
);

-- ---------------------------------------------------------------------------
-- Sample events.
-- ---------------------------------------------------------------------------
insert into public.events (
  household_id, created_by, title, description,
  start_time, end_time, event_type, child_id
)
values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'Soccer practice',
    'Cleats + water bottle.',
    now() + interval '2 days' + time '17:00',
    now() + interval '2 days' + time '18:30',
    'activity',
    'cccccccc-cccc-cccc-cccc-cccccccccccc'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '22222222-2222-2222-2222-222222222222',
    'Pediatrician checkup',
    'Annual physical with Dr. Patel.',
    now() + interval '10 days' + time '09:30',
    now() + interval '10 days' + time '10:15',
    'medical',
    'cccccccc-cccc-cccc-cccc-cccccccccccc'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'School field trip',
    'Permission slip due Friday.',
    now() + interval '14 days' + time '08:00',
    now() + interval '14 days' + time '15:00',
    'school',
    'cccccccc-cccc-cccc-cccc-cccccccccccc'
  );

-- ---------------------------------------------------------------------------
-- Custody schedule (alternating week pattern stored as plain text RRULE).
-- ---------------------------------------------------------------------------
insert into public.custody_schedules (
  household_id, child_id, parent_id,
  start_date, end_date, recurrence_rule
)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '11111111-1111-1111-1111-111111111111',
  current_date,
  current_date + interval '7 days',
  'FREQ=WEEKLY;BYDAY=MO,TU,WE'
);

-- ---------------------------------------------------------------------------
-- Sample messages.
-- ---------------------------------------------------------------------------
insert into public.messages (household_id, sender_id, content, created_at, read_at)
values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'Picked up Riley from school — homework done before practice.',
    now() - interval '2 hours',
    now() - interval '90 minutes'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '22222222-2222-2222-2222-222222222222',
    'Thanks! I''ll handle pediatrician appt next week.',
    now() - interval '85 minutes',
    now() - interval '60 minutes'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'Field trip permission slip is in the backpack — please sign tonight.',
    now() - interval '10 minutes',
    null
  );
