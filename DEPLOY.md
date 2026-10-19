# Deploying Pampanga GrantConnect

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
- [ ] Placeholder listings replaced with verified provider data
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

---

## Running it day to day

```bash
npm run server     # the API
npm run dev        # the front end, proxying /api to the API
```

Or one command if you add a script that runs both concurrently.

## Local-only alternative

If every user is on the same office network, you can skip all of this: run the
Node server on one machine, keep SQLite, and put it behind the office router.
No Supabase, no hosting bill, no cross-origin problem, and backup is copying one
file. For a single-office deployment that is genuinely the better answer.
