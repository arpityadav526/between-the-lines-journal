# Between the lines

A small bilingual personal journal built with Next.js App Router, TypeScript, Tailwind, Drizzle and Postgres. Visitors leave a nickname, read German, and answer a question to reveal English through an organic ink animation. There are no visitor accounts.

## Setup

Use Node.js 22+ and a Neon Postgres database (or another standard Postgres instance).

```sh
npm ci
cp .env.example .env.local
npm run secrets
```

Set `DATABASE_URL` in `.env.local` to the pooled Neon connection URL with TLS enabled (`sslmode=require`). `npm run secrets` fills missing secrets without printing or replacing them. Keep a secure backup of these values.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres URL; use a separate database for local/preview testing when real content exists |
| `CONTENT_KEY` | Exactly 64 hexadecimal characters: 32 random AES key bytes |
| `SESSION_SECRET` | At least 32 random characters; signs visitor and separate admin JWTs |
| `ADMIN_TOKEN` | At least 32 random characters; password for `/admin` |
| `IP_SALT` | At least 32 random characters; secret salt for SHA-256 IP hashing |

Nothing uses `NEXT_PUBLIC_` secrets. `.env*` files are ignored except the empty example. Changing `CONTENT_KEY` requires re-encrypting/reseeding all content; losing it makes existing text unreadable. Changing `SESSION_SECRET` invalidates all sessions. Changing `ADMIN_TOKEN` changes the password; rotate `SESSION_SECRET` too if existing admin cookies must be invalidated immediately.

```sh
npm run db:migrate
npm run seed
npm run dev
```

Open http://localhost:3000. The initial six chapters are placeholders. Their answer is `placeholder`. This answer is deliberately public and must be replaced before adding personal text.

## Your private content

```sh
cp content/sections.example.json content/sections.local.json
```

Edit only `content/sections.local.json`. Keep `id` stable; array order determines chapter order. Each entry contains `title`, `question`, `answers` (one or more), `text_de`, `text_en`, optional `hint`, and optional `allow_typo` (default false). Use `\n\n` for paragraph breaks.

```sh
npm run seed
```

The seeder loads `.env.local` and uses the local content file if present, otherwise the example. It validates all content before writing, encrypts both texts with AES-256-GCM, creates salted scrypt hashes, and updates everything in a single transaction. Sections removed from the JSON are removed from the database with their associated logs. **Reseeding revokes all existing unlocks for seeded sections**, so replacing placeholders never gives earlier demo visitors automatic access to your real text. Existing signed cookies do not override this revocation.

Both private content and environment files are gitignored, and `content/` is excluded from Vercel uploads. Never paste personal content into source files, issues, commits, or this README. Questions and titles are intentionally shown to registered visitors; they are not private once served. The repository contains only placeholder questions and answers.

## Flow and security

- `POST /api/register { name }`: Unicode letters/numbers and a small set of name punctuation, normalized and sanitized, 2–30 characters. Stores ID, name, timestamps, salted IP hash, and a truncated user-agent. Never stores raw IPs or submitted answers.
- Visitor cookie: signed HS256 JWT, httpOnly, SameSite=Strict, Secure in production, 30-day expiry, contains visitor ID and unlocked section IDs. The database remains authoritative to prevent stale-cookie and simultaneous-tab issues. Removing the cookie means leaving a name again; nicknames are not verified identities.
- `GET /api/sections`: requires registration; returns only IDs, order, title, question, optional hint, and unlock flags. No story bodies or answer hashes.
- `GET /api/sections/:id/preview`: registration required; returns only decrypted German. Up to 40 preview requests per visitor per 10 minutes.
- `POST /api/unlock { sectionId, answer? }`: for a locked section, an answer is required. On success returns English and updates the cookie. For already-unlocked sections, omit the answer to retrieve English and log a revisit. No separate public English endpoint exists.
- Answer normalization: Unicode NFC, trim, lowercase, ä→ae/ö→oe/ü→ue/ß→ss, remove other diacritics, strip punctuation/symbols, collapse whitespace. Exact hashes are compared using constant-time digest comparison. Multiple accepted answers have independent salts.
- Optional one-typo acceptance uses Levenshtein distance ≤1, only for accepted normalized answers longer than five characters. Transpositions count as two edits. Hashes cannot support edit-distance matching directly, so enabling this option additionally stores the normalized accepted answers **encrypted with AES-GCM**, bound to the section. Leave it disabled if you want hash-only answer storage.
- Failed attempts: a rolling 10-minute window, 5 wrong attempts per visitor+section. Postgres transaction advisory locks serialize guesses, so concurrent requests cannot bypass the budget. Cooldowns return HTTP 429 and `Retry-After`; failed answers themselves are not recorded.
- A Postgres atomic upsert limits each IP hash to 120 API requests per 10 minutes; registration also allows 10/hour per IP hash and admin login 5/15 minutes. Counters are shared across Vercel instances. Outside Vercel, forwarding headers are untrusted and all requests share a `local` bucket; configure a trusted proxy before deploying elsewhere.
- English is fetched only after successful unlocking (or a verified prior unlock). It is never in page props, initial HTML, public JS, German previews, or section lists. API responses use `private, no-store`. AES-GCM authenticates each value with section+language context and fresh 12-byte nonces.
- All JSON mutations enforce same-origin requests and 4 KiB request-body limits. Zod validates inputs. Security headers include CSP, HSTS, frame denial, nosniff, no-referrer, and noindex. CSP allows inline Next.js bootstrap scripts/styles; no third-party scripts or analytics are included.

**Privacy model:** this is an answer-gated translation, not a confidential sharing system. Anyone who registers can read/copy/translate German, and successful readers can share English. Use it for friends as intended; a known answer is not identity verification. The UI explains visit/attempt recording. Host infrastructure may maintain its own request logs independently of application storage.

## Ink reveal

`src/components/InkReveal.tsx` blooms a hand-shaped SVG blot with turbulence/displacement from the page center, covers and fades German, then dries away as English lines/paragraphs stagger into view (~2.1 seconds). Language toggling replays a shorter version (~1.15 seconds). The expensive filter is confined to the blot and removed on smaller screens, retaining the irregular path and transform/opacity animation. Reduced-motion users get an immediate swap. Fonts are self-hosted Lora; paper texture is inline SVG noise with no image downloads. No other decorative animations run.

## Admin

Visit `/admin` directly; it is not linked publicly. Enter `ADMIN_TOKEN` from your private env file. Admin sessions use a different cookie/audience and expire after eight hours. The dashboard shows totals, latest 200 visitors, first/last seen, opened chapters, and the latest 100 failed attempts. It never shows attempted answers or IP hashes. Sign out with “Close the desk.”

For retention, periodically delete old visitors (related reads, attempts and unlocks cascade) and expired `rate_limits` rows through your database console. Choose a retention period appropriate for your friends. No automatic visitor deletion is enabled.

## Tests

```sh
npm run build
npm run typecheck
npm test
```

The test suite runs real route handlers against a disposable PGlite Postgres engine with the production SQL schema; cookies are mocked at Next.js's adapter boundary. It tests normalization, optional typo acceptance, AES-GCM tampering/context binding, shared rate limits, concurrent wrong guesses, cooldown expiry, registration sanitization, forged sessions, origin/body-size checks, admin isolation, English denial before unlock, and revisit logging. After building, it also scans generated public assets and HTML for seeded English.

For real browser tests, run the app against an **example-only test database**, then:

```sh
npx playwright install chromium
npm run test:e2e
# or TEST_BASE_URL=https://your-example-deployment.vercel.app npm run test:e2e
```

These mobile browser tests create two QA visitors and cover registration, German-only responses (including HTML/JS/API), wrong answers, English reveal, language toggling, reload persistence, cookie flags, reduced motion and horizontal overflow. They expect the example question/answer and must not be run against real personal content without adapting the fixtures.

## Public GitHub repository

https://github.com/arpityadav526/between-the-lines-journal

If setting up your own copy:

```sh
gh auth login
gh repo create between-the-lines-journal --public --source=. --remote=origin --push
```

## Production on Vercel

The app uses standard Node.js functions and pooled Postgres transactions. Vercel is the intended host; no Render-specific service is needed.

```sh
vercel login
vercel link --yes --project between-the-lines
vercel integration add neon --name between-the-lines-db --environment production --no-env-pull --non-interactive
```

If the CLI reports `integration_terms_acceptance_required`, open its verification URL, accept Neon’s terms, then repeat the integration command. Choose the free plan when offered. Provision a separate database for previews; do not give preview deployments access to your personal production database.

Retrieve the database variables to an ignored file without overwriting your generated local secrets:

```sh
vercel env pull .env.vercel-production --environment=production --yes
```

Copy its `DATABASE_URL` into `.env.local` privately. Verify all five required variables are populated. Add the four app secrets to Vercel using stdin (the script never prints their values):

```sh
npm run env:push
```

This helper adds production values once and refuses to overwrite existing keys. If they already exist, inspect `vercel env ls production` and skip it. For intentional rotation use `vercel env update ADMIN_TOKEN production` interactively and set the same value in `.env.local`.

Seed the production database (confirm `.env.local` points to the intended database first):

```sh
npm run db:migrate
npm run seed
npm run build
npm test
vercel deploy --prod --yes
```

Content edits need a seed, not a code redeploy. Secret changes require a new deployment. Save the production URL printed by Vercel and verify registration, a wrong answer, a correct reveal, a reload, and `/admin`. Do not consider a deployment with missing `DATABASE_URL` operational.

## Before sharing personal pages

- [ ] Put real German/English text, questions, and private answers in `content/sections.local.json`.
- [ ] Confirm all five production env vars; preserve a secure copy of `CONTENT_KEY`.
- [ ] Run `npm run seed` against production; it revokes demo unlocks.
- [ ] Replace `ADMIN_TOKEN` with your own strong random secret, update Vercel, and redeploy.
- [ ] Remove QA visitors if you do not want them in the dashboard.
- [ ] Keep the local content file and env files out of Git.
