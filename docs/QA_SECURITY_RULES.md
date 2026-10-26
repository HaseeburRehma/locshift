# LokShift — Project Rules & Release Checklist

Applies to the webapp (`locshift`) and the mobile app (`locshift-mobile`).
A task is **not done** until every box in section 3 is ticked and the
"break it" pass in section 4 has been run and written up.

## 1. Project rules

### Data & environments
1. Production Supabase holds the client's real data. **No attack, fuzz or
   load traffic against production.** Those run against a separate test
   Supabase project (URL/keys in `.env.test.local`, never committed).
2. The service-role key is read only by server code. It never appears in
   logs, test output, client bundles or `EXPO_PUBLIC_*` variables.
3. Migrations are applied by the project owner; code changes stay
   uncommitted until the owner says to commit.

### Security model
4. RLS is the real security boundary — the mobile app talks to PostgREST
   directly, so every API-route check must also hold at the database level.
5. API routes authenticate with `getUser()` (never `getSession()`), then
   check **role and organisation of the target** before any service-role
   query. Use `getApiCaller()` from `lib/supabase/api-auth.ts`.
6. Never spread a request body into an insert/update (`{...body}`).
   Whitelist columns explicitly.
7. Redirect targets (`next`, `redirectTo`, links in notifications) must be
   relative paths starting with a single `/`. Never build URLs from the
   `Origin`/`Host` request headers; use `NEXT_PUBLIC_SITE_URL`.
8. Public (unauthenticated) endpoints need a rate limit and must not reveal
   whether an account exists.
9. Storage buckets holding personal or chat data are private and scoped by
   organisation + user in the path.
10. Error responses never contain stack traces, SQL or internal messages.

### Correctness
11. Shared pure modules (`lib/time/*`, `lib/spesen.ts`, `lib/reports/*`,
    `lib/plans/{week,notify}.ts`, `lib/special-payments.ts`,
    `lib/personnel/documents.ts`, `lib/operational-locations/parse.ts`,
    `lib/times/entry-status.ts`) are byte-identical in both repos —
    `scripts/check-shared.sh` must pass.
12. `net_hours` comes only from the DB trigger. Day keys via `localDateKey`,
    instants via `toInstantIso` (Europe/Berlin), never
    `toISOString().slice(0,10)`.
13. Every bug fix comes with a test that failed before the fix.

## 2. Test layers

| Layer | Tool | Runs against | Command |
|---|---|---|---|
| Unit | Vitest | pure modules, no network | `pnpm test` |
| Integration | Vitest + mocked Supabase | API route handlers | `pnpm test:int` |
| RLS / DB | Vitest + real client | **test** Supabase project only | `pnpm test:rls` |
| End-to-end | Playwright | local dev server + test project | `pnpm test:e2e` |
| Load | k6 / autocannon | **test** project + preview deploy | `pnpm test:load` |

## 3. Definition of done (every task)

- [ ] Typecheck passes in both repos (`tsc --noEmit`)
- [ ] Lint passes
- [ ] Unit tests pass; new logic has new tests
- [ ] Integration tests pass for every touched API route
- [ ] E2E happy path for the touched feature passes (desktop + mobile viewport)
- [ ] Shared modules identical in both repos
- [ ] No new `{...body}` spreads, `getSession()` auth checks, or unvalidated redirects
- [ ] Migration (if any) is idempotent and handed over, not applied
- [ ] Nothing committed without the owner's go-ahead

## 4. "Break it" pass (every task, against the test project)

Write down what was tried and the result — "done" alone is not a report.

**Access control**
- [ ] Unauthenticated request to every touched route → 401
- [ ] Employee calls admin/dispatcher-only actions → 403 / RLS denial
- [ ] Employee reads or edits another employee's rows (IDOR via id swap)
- [ ] Cross-organisation access with a second test org
- [ ] Inactive user's still-valid token is rejected
- [ ] Employee self-approves, back-dates a submitted entry, or edits protected profile fields

**Input**
- [ ] Missing / wrong-type / oversized fields, unicode, HTML/script in text fields (PDF + email output too)
- [ ] Redirect parameters: `//evil.com`, `@evil.com`, `https://evil.com`, `/\evil.com`
- [ ] Time edge cases: overnight shift, DST change nights, end before start, negative break, 0-hour submit

**Concurrency & load**
- [ ] Same action fired twice in parallel (double clock-in, double approve, double submit)
- [ ] 50 concurrent users for 2 minutes on the touched reads/writes: p95 latency, error rate, no duplicate rows
- [ ] Rate limits actually trigger (and reset)

**Output**
- [ ] Report: what was attacked, what held, what broke, what was fixed, which tests now cover it
