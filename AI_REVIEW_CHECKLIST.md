# AI Review Checklist

Date: 2026-04-19

## Purpose

Review the RSVP form implementation for regressions before publishing.

## Current Expected Behavior

- The form sends RSVP data to Supabase table `public.invitation_responses`.
- `attendance_status`, `guest_name`, `telephone`, and `email` are required on the page.
- `stay_0710` and `bus_use` are optional on the page.
- If `stay_0710` is not selected, the submitted value should be `記入なし`.
- If `bus_use` is not selected, the submitted value should be `記入なし`.
- The old "save my info" checkbox and browser-side draft saving were removed.
- On submit failure, the sender should see a clear failure message and the entered values should remain.

## Files To Review

- `index.html`
  - RSVP fields and required/optional settings.
  - `stay_0710` and `bus_use` should have no default selected radio.
  - The old `save_info` checkbox should not exist.
- `scripts/main.js`
  - Submitted payload should match the live DB columns.
  - Blank `stay_0710` and `bus_use` should become `記入なし`.
  - Blank `allergy_note` and missing message image should become `なし`.
  - Guest name containing only spaces should be blocked before submit.
  - No `localStorage`, `saveDraft`, or `applyDraft` usage should remain.
- `scripts/supabase-client.js`
  - Supabase client initialization should still return clear errors.
- `scripts/config.js`
  - `supabaseTable` should remain `invitation_responses`.
- `supabase/schema.sql`
  - Schema should reflect the current form fields, not the old full-address form.
- `styles/main.css`
  - Status messages should be visible for pending, success, and error states.

## Expected Submitted Payload

The page should insert these fields:

- `source_url`
- `attendance_status`
- `stay_0710`
- `bus_use`
- `guest_name`
- `telephone`
- `email`
- `allergy_note`
- `companions`
- `save_info`
- `metadata`
- `message_image_url`

## Expected DB Columns

Live DB columns should include:

- `id`
- `created_at`
- `source_url`
- `attendance_status`
- `telephone`
- `email`
- `allergy_note`
- `companions`
- `message_image_url`
- `save_info`
- `metadata`
- `bus_use`
- `stay_0710`
- `guest_name`

## Supabase SQL To Confirm Defaults

Run this in Supabase if defaults have not already been updated:

```sql
alter table public.invitation_responses
  alter column stay_0710 set default '記入なし',
  alter column bus_use set default '記入なし';
```

Use this to confirm columns and defaults:

```sql
select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'invitation_responses'
order by ordinal_position;
```

## Known Items Not Fully Verified Locally

- A real Supabase insert was not run locally to avoid creating a live RSVP row.
- Gmail notification is not implemented.
- `supabase/schema.sql` does not automatically migrate an already-created Supabase table.
- Network requests can still take a long time if the browser connection stalls.

## Local Checks Already Run

- `node --check scripts/main.js`
- `git diff --check`

