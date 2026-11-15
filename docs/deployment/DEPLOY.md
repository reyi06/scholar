# Deploying Scholar

**This is not one thing you upload.** There are three parts, and they run in
three different places:

| Part | What it is | Where it runs |
| --- | --- | --- |
| **Front end** | `dist/` — static HTML, JS, CSS | A static host (Netlify, Vercel, Cloudflare Pages) |
| **API** | `server/index.ts` — a long-lived Node process | A Node host (Render, Railway, Fly.io, a VPS) |
| **Database** | PostgreSQL | Supabase |

Skip the API and every visitor gets their **own private copy** in browser
storage — the site looks like it works, but no application a student submits is
visible to any administrator.

---

## Before you start

The front end must actually call the API, or the deployment is a facade. That
requires `VITE_API_BASE_URL` to be set **at build time** and the client wired to
honour it.

- [ ] Client wired to the API
- [ ] Test-account buttons removed from the login screen
- [ ] Every listing reconfirmed with its provider for the current intake
- [ ] Privacy notice published (student records, Data Privacy Act)

---

## Recommended shape

**Same domain for both.** Serve the API under `/api` on the same hostname as the
front end. This matters more than it looks — see "The cookie problem" below.

```
https://your-domain.example/          → static front end
https://your-domain.example/api/*     → proxied to the Node API
```

Two ways to get that:

1. **One VPS** running the Node server, which serves `dist/` *and* `/api`. One
   machine, one process, one TLS certificate. Simplest to reason about, and the
   cheapest at this scale.
2. **Static host + Node host**, with the static host proxying `/api/*` to the
   Node service.

---

## The cookie problem

Sessions are `httpOnly` cookies. In development the Vite proxy makes the API
same-origin, so cookies just work.

**In production, if the front end is on `your-domain.example` and the API is on
`api.your-domain.example`, that is cross-site.** A `SameSite=Lax` cookie — what
the server sets today — will **not** be sent. Sign-in will appear to succeed and
then every subsequent request will be unauthenticated.

Two fixes, in order of preference:

1. **Proxy `/api` so both are the same origin.** Keeps cookies first-party and
   needs no server change. This is why the recommended shape above exists.
2. **Go cross-site deliberately:** change the cookie to
   `SameSite=None; Secure`, add CORS with `Access-Control-Allow-Credentials:
   true` and an explicit origin allowlist, and require HTTPS everywhere. More
   moving parts, more ways to get it subtly wrong.

---

## Steps

### 1. Supabase

1. Create a project. Choose a region close to Pampanga — Singapore is the
   nearest for most providers.
2. **Project Settings → Database → Connection string → URI.** Use the *direct*
   connection (port 5432), not the transaction pooler: the API is a long-lived
   process, so pgbouncer only adds complexity.
3. Save it as `DATABASE_URL`.

### 2. Database schema

From your machine, pointed at the production database:

```bash
DATABASE_URL="postgresql://…" npx prisma migrate deploy
DATABASE_URL="postgresql://…" npm run db:seed     # remove once real data replaces the seed
```

`migrate deploy` applies committed migrations and never prompts. Do **not** use
`migrate dev` against production — it can reset the database.

### 3. The API

Deploy `server/` to a Node host with a start command of `npm run server`.

Environment:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Supabase connection string |
| `API_PORT` | Usually supplied by the host (`PORT`); adapt if so |

Requirements:

- **A long-lived process**, not serverless functions. Sessions live in the
  database so they survive restarts, but the service worker and Prisma's
  connection pool both assume a stable process.
- **HTTPS**, or the browser will refuse to set a `Secure` cookie.
- **A persistent disk or none at all** — the API holds no local state, so it
  needs no volume.

### 4. The front end

Build with both variables set. This is where the domain gets baked in:

```bash
VITE_API_BASE_URL=/api \
SITE_URL=https://your-domain.example \
npm run build
```

- `VITE_API_BASE_URL` is compiled into the bundle. Changing it requires a rebuild.
- `SITE_URL` writes canonical links, Open Graph tags and `sitemap.xml`. Get it
  wrong and search engines and Facebook previews will point at `example.com`.

Upload `dist/` to the static host.

### 5. Proxy the API

Add a rewrite so `/api/*` reaches the Node service. On Vercel:

```json
{ "source": "/api/(.*)", "destination": "https://your-api-host/api/$1" }
```

On Netlify, in `public/_redirects` **above** the SPA fallback:

```
/api/*  https://your-api-host/api/:splat  200
/*      /index.html                       200
```

Order matters: the API rule must come first, or the SPA fallback swallows it.

### 6. DNS and TLS

Point the domain at the static host. Issue a certificate for the API hostname
too if you went cross-site. Verify with:

```bash
curl -i https://your-domain.example/api/health      # {"ok":true,...}
curl -s https://your-domain.example/api/scholarships | head -c 200
```

---

## After deploying

- **Check the session actually persists.** Sign in, then reload. If you are
  signed out, it is the cookie problem above.
- **Check a deep link.** Open `/scholarships/<id>` directly and reload — should
  be the prerendered page, not a 404.
- **Check a shared link preview.** Paste a listing URL into a Facebook message
  composer; you should get a title, description and image.
- **Expect a stale service worker on the first deploy after a change.** The
  cached shell updates on the next load. Users may need one refresh.
- **Set up backups.** Supabase has daily backups on the free tier and
  point-in-time recovery on paid plans. Student records under the Data Privacy
  Act are not something to leave to chance.

### Verification codes: email and text

One-time codes go out through a seam, not a hard-coded provider. Both are set by
environment variable and both default to `console`, which prints the message to
the server log so a demonstration can read the code off the screen.

| Variable | Default | Meaning |
|---|---|---|
| `MAIL_TRANSPORT` | `console` | Email. `resend` sends through Resend; any other value must have an adapter in `server/mailer.ts` |
| `SMS_TRANSPORT` | `console` | Text. Any other value must have an adapter in `server/sms.ts` |
| `RESEND_API_KEY` | empty | Required by `MAIL_TRANSPORT=resend`. Sending-only, restricted to the domain |
| `MAIL_FROM` | empty | Required by `MAIL_TRANSPORT=resend`. An address on the verified domain |

A name without an adapter is a loud failure, not a silent one: the request fails
and the browser is told nothing was sent, because a student waiting for a code
that never arrived is the worst outcome of a half-finished integration.

**Resend** is wired and needs only the two variables above. The adapter POSTs to
`https://api.resend.com/emails` with `from`, `to`, `subject` and `text`, and
throws on any non-2xx answer so the interface never reports a delivery that did
not happen. Create the key at `resend.com/api-keys` as a sending-only key
restricted to the sending domain, then:

1. Add the domain in Resend and copy its DNS records into the domain's DNS host.
   A subdomain such as `mail.example.com` keeps the site's own records untouched.
2. Wait for the domain to read **Verified** in Resend. Until it does, set
   `MAIL_FROM=onboarding@resend.dev`, which only delivers to the account owner's
   own address.
3. Set `MAIL_TRANSPORT=resend`, `RESEND_API_KEY` and `MAIL_FROM`, restart the
   API, and request a code through the real flow. The reply from
   `/auth/otp/request` reports `delivery: "email"` only when Resend accepted the
   message.

The playit hostname is not a domain this project controls, so Resend needs a
domain you own. `runarine.click` is still on registrar `client hold`, so it
cannot be verified until that is lifted.

To wire a provider: implement `MailTransport` or `SmsTransport` (`send` plus a
`delivery` label), return it from `mailTransport()` / `smsTransport()` for your
configured name, and set the credentials as environment variables. Nothing in
the routes or the interface changes, because both read `delivery` back and
report where the message actually went.

Numbers are stored as the student typed them and normalised to E.164
(`+639171234567`) at send time. `normalisePhone` accepts `09…`, `+639…` and
`639…`, and returns null for anything that is not a Philippine mobile number, so
a landline or a short number is refused before it reaches a gateway.

---

## Running it day to day

```bash
npm run server     # the API
npm run dev        # the front end, proxying /api to the API
```

Or one command if you add a script that runs both concurrently.

## Local-only alternative

If every user is on the same office network, you can skip the hosted setup: run
the Node server on one machine, keep PostgreSQL alongside it, and put it behind
the office router. No Supabase, no hosting bill, no cross-origin problem — and
backup is `pg_dump` to a file on a schedule. For a single-office deployment that
is genuinely the better answer.

## One process behind a tunnel

When the site has to be reachable from the internet but stays on your own
machine, a tunnel gives you one hostname pointing at one local port. The default
split — static host for `dist/`, separate Node process for `/api` — does not fit,
because a tunnel cannot route two ports on one hostname.

Two options:

1. **Let the API serve both.** A ~90-line static handler in front of the router
   does it: `/api/*` stays with the router, everything else comes from `dist/`
   with `index.html` as the SPA fallback, and the CSP from `vite.config.ts` is
   applied to HTML responses. `@prisma/client` still never reaches the browser,
   and sessions stay same-origin, so the `Secure; SameSite=Lax` cookie works
   unchanged. This is what the local release does.
2. **Put a reverse proxy in front** (Caddy, nginx) and point the tunnel at it.

Whatever the tunnel provider, check two things before trusting it:

- **Does it forward the client address?** If every request arrives from
  `127.0.0.1`, `TRUST_PROXY` is either lying or useless, and the per-address
  login throttle will lock out every user after 20 wrong passwords. Confirm by
  logging the value once, not by reading the documentation.
- **Does it terminate TLS?** If it passes the handshake through, your origin must
  speak HTTPS with a certificate the browser trusts — which you cannot obtain for
  a hostname you do not control.
