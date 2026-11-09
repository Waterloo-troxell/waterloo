# Owner bootstrap

Waterloo has no "first person to sign up becomes owner" logic. The two owners
are written in once per database by one SQL file here, approved by both
owners in a pull request:

- `preview.sql` for the preview database
- `production.sql` for the real one

Each file is one line:

```sql
select public.bootstrap_owners(
  '<Gunner''s user ID>', 'Gunner',
  '<Kaden''s user ID>', 'Kaden'
);
```

**Before approving, each owner checks their own user ID** against the one shown
on their Home or Settings page in that deploy. User IDs are random codes, not
emails, so the public repository does not reveal which accounts own Waterloo.

The deploy workflow runs the file only while the database has no owners. The
database refuses a second run, refuses the same person twice, and refuses
anyone who has not confirmed their email and turned on 2FA. After it runs,
the owners table is locked for good (G1, G2).
