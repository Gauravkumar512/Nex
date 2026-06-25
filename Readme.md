# Nexus — AI-Powered Internship Tracker

A production-grade job application tracker with AI matching and cold email drafting via async queues with real-time SSE streaming. Built project-first to learn OAuth2, JWT auth, PDF parsing, LLM integration, BullMQ, and PostgreSQL at depth.

---

## What This Project Does

- Login with Google OAuth2 — no passwords, refresh token encrypted at rest
- Upload your resume PDF — AI extracts skills, projects, and summary automatically
- Add jobs manually — AI scores each one against your profile (0–100 match)
- Track application status — full audit trail of every status change
- Draft cold emails — BullMQ queues the LLM request, SSE streams the result back in real time

---

## Architecture

```
Every request → generalLimiter (100/min) → errorHandler wraps all routes

POST /auth/google
  → Passport OAuth2 → Google consent screen
  → callback: encrypt refreshToken (AES-256-CBC) → upsert User in PG
  → issue our own JWT access + refresh tokens → set as httpOnly cookies
  → redirect to FRONTEND_URL/dashboard

POST /profile/upload
  → Multer (memoryStorage) → pdf-parse (visible text) + pdf-lib (hyperlink annotations)
  → Claude Sonnet: structured extraction → Profile saved as JSONB in PostgreSQL

POST /jobs
  → Zod validation → Company upsert (composite unique) → Job create
  → Claude Haiku: match score (0-100) + breakdown → Job updated

PATCH /jobs/:id/status
  → Zod enum validation → prisma.$transaction([update job, insert history row])

POST /jobs/:id/draft-email
  → 202 Accepted immediately → BullMQ job pushed to Redis queue

GET /jobs/:id/email-stream
  → SSE headers set → connection registered in memory map by jobId
       ↓
  Worker picks up BullMQ job
  → fetch Job + Profile in parallel (Promise.all)
  → Claude Sonnet drafts email (5-10s)
  → sendSSEEvent(jobId, { subject, body }) → push to waiting connection
  → closeSSEClient(jobId)
```

---

## Why Each Tool Was Chosen

| Tool                         | Job                                 | Why not something else                                                      |
| ---------------------------- | ----------------------------------- | --------------------------------------------------------------------------- |
| PostgreSQL + Prisma          | Source of truth                     | Relational integrity, JSONB for flexible schema, type-safe queries          |
| Google OAuth2 + Passport     | Authentication                      | No password storage. Gives Gmail refresh token for future inbox watching    |
| Node.js crypto (AES-256-CBC) | Encrypt refresh token at rest       | DB breach won't expose Gmail access. Defense in depth.                      |
| JWT (httpOnly cookies)       | Session management                  | Stateless. HttpOnly prevents XSS. SameSite:lax prevents CSRF.               |
| Redis + BullMQ               | Async email drafting                | LLM takes 5-10s — don't block the HTTP response. Retries on failure.        |
| Redis + ioredis (Lua)        | Sliding-window rate limiting        | Atomic count-and-add in one script. Caps AI-endpoint credit burn per user.  |
| SSE                          | Push LLM result to client           | Simpler than WebSockets for one-way server→client push. No extra library.   |
| Claude Sonnet 4.6            | Resume extraction + email drafting  | Best quality for user-visible output and structured extraction              |
| Claude Haiku 4.5             | Match scoring                       | Runs on every job add — cost matters. Fast and cheap for comparison tasks.  |
| pdf-parse                    | PDF text extraction                 | Buffer-based, no filesystem needed                                          |
| pdf-lib                      | PDF hyperlink annotation extraction | pdf-parse only gets visible text. Project GitHub links live in annotations. |
| Multer (memoryStorage)       | File upload                         | Resume processed once and discarded — no filesystem cleanup                 |
| Zod                          | Input validation + TypeScript types | Runtime validation + inferred types from one schema                         |
| Docker Compose               | Local dev                           | PostgreSQL and Redis as containers. No local installs needed.               |

---

## Database Schema

### User

| Column                | Type        | Note                        |
| --------------------- | ----------- | --------------------------- |
| id                    | UUID        | Primary key                 |
| email                 | VARCHAR     | UNIQUE                      |
| name                  | VARCHAR     | From Google profile         |
| googleId              | VARCHAR     | UNIQUE — OAuth identifier   |
| avatarUrl             | TEXT        | Google profile picture (nullable) |
| encryptedRefreshToken | TEXT        | AES-256-CBC encrypted       |
| accessToken           | TEXT        | Google short-lived token    |
| accessTokenExpiry     | TIMESTAMPTZ | For knowing when to refresh |
| createdAt / updatedAt | TIMESTAMPTZ | Auto-managed                |

### Profile (one-to-one with User)

| Column    | Type  | Note                                                           |
| --------- | ----- | -------------------------------------------------------------- |
| resume    | TEXT  | Raw extracted PDF text                                         |
| skills    | JSONB | `{ languages, frameworks, tools }` — AI extracted              |
| projects  | JSONB | `[{ name, description, techStack, githubUrl }]` — AI extracted |
| summary   | TEXT  | AI-generated 2-3 sentence candidate summary                    |
| githubUrl | TEXT  | Candidate's GitHub profile URL                                 |

**Why JSONB for skills/projects?** These are read as whole units (fed into LLM prompts), never queried by individual sub-fields. JSONB handles varying project shapes without a rigid normalized schema. If we needed `WHERE skill = 'Redis'` queries, a separate Skills table would be better — but that's not this use case.

### Company

| Column         | Type             | Note                            |
| -------------- | ---------------- | ------------------------------- |
| id             | UUID             | Primary key                     |
| name + website | COMPOSITE UNIQUE | Prevents duplicate company rows |

One company row is shared across many jobs. If you add two Backend Intern roles at Razorpay, they share the same Company row.

### Job

| Column                    | Type             | Note                                                        |
| ------------------------- | ---------------- | ----------------------------------------------------------- |
| role + jobDescription     | TEXT             | Role title + full JD text                                   |
| hrEmail / hrName          | TEXT             | Optional recruiter contact (used for email drafting)        |
| source                    | ENUM             | WELLFOUND / LINKEDIN / INDEED / REFERRAL / COLD / OTHER     |
| matchScore                | INT              | 0-100, set by Claude Haiku                                  |
| matchBreakdown            | JSONB            | `{ matched: [], missing: [], reasoning: "" }`               |
| status                    | ENUM             | SAVED → APPLIED → REPLIED → INTERVIEWING → REJECTED → OFFER |
| appliedAt                 | TIMESTAMPTZ      | Nullable — set when status moves to APPLIED                 |
| userId + companyId + role | COMPOSITE UNIQUE | Can't add same job twice                                    |

### JobStatusHistory

Append-only audit trail. Every status change inserts a new row. Never updates. Lets you answer "how long did it take from APPLIED to REPLIED?"

---

## Key Concepts

### 1. Google OAuth2 Flow

```
1. GET /auth/google → redirect to Google login + consent
2. User grants: email, profile, gmail.readonly
3. Google redirects to /auth/google/callback?code=...
4. Passport exchanges code → { accessToken, refreshToken, profile }
5. Server encrypts refreshToken, upserts User, issues our own JWTs
6. JWTs set as httpOnly cookies → user is logged in
```

Two separate token systems:

- **Google tokens** — let our backend call Gmail API on user's behalf (future)
- **Our JWTs** — let the user's browser authenticate to our API

### 2. AES-256-CBC Encryption

```
encrypt(refreshToken, KEY, IV) → "hexIV:hexCiphertext" stored in DB
decrypt("hexIV:hexCiphertext", KEY) → original refreshToken
```

- KEY: 32-byte secret in `.env`, never in the database
- IV: random 16 bytes generated fresh per encryption — same plaintext produces different ciphertext every time
- If DB is leaked: ciphertext is useless without KEY

### 3. JWT Access + Refresh Token Pattern

- **Access token**: 15 minutes, verified on every protected request
- **Refresh token**: 7 days, used only to issue new access tokens
- Both set as `httpOnly` cookies — JS can't read them (XSS protection)
- `SameSite: lax` — cross-site requests don't include cookies (CSRF protection)
- **Refresh token rotation** — new refresh token issued on every refresh call

### 4. PDF Parsing — Two-Pass Approach

```
Pass 1 — pdf-parse  → extracts visible text (names, descriptions, education)
Pass 2 — pdf-lib    → walks PDF annotation tree → extracts all hyperlink URIs

Both passed to Claude Sonnet → structured JSON profile
```

Why two passes? PDF hyperlinks are stored as annotation objects, completely separate from the text layer. `pdf-parse` only sees characters. Without Pass 2, all project GitHub links are invisible to the LLM and it either omits them or hallucinates a placeholder.

### 5. Cost-Aware Model Selection

```
Resume extraction  → Claude Sonnet  (runs once, quality matters)
Job match scoring  → Claude Haiku   (runs on every job add, cost matters)
Cold email draft   → Claude Sonnet  (user-visible output, quality matters)
```

Haiku is ~5x cheaper than Sonnet. Match scoring is a structured comparison task — no deep reasoning needed. Sonnet is reserved for tasks where output quality directly affects the user.

### 6. BullMQ + SSE Pipeline

```
POST /draft-email   → push job to BullMQ → 202 Accepted immediately (client doesn't wait)
GET  /email-stream  → SSE connection opened → registered in sseManager by jobId

Worker (inside API process):
  → dequeue job
  → Promise.all([fetch job, fetch profile])
  → pick a random tone template (direct / confident / casual)
  → Claude Sonnet drafts email (~5-10s)
  → sendSSEEvent(jobId, { status, template, email: { subject, body } })  ← finds waiting connection, writes to it
  → closeSSEClient(jobId)
```

The worker is started in-process by `app.ts` (`import './workers/email.worker'`), so the API and the BullMQ consumer share one Node process. BullMQ retries failed jobs twice with exponential backoff; on final failure the worker pushes `{ status: 'failed', error }` over SSE so the client isn't left hanging.

Each draft randomly selects one of three tone templates so repeated drafts don't read identically. The generated email is streamed to the client but **not persisted** — there's no `emailDraft` column; drafting is treated as a disposable, on-demand action.

The SSE manager is an in-memory `Map<jobId, Response>`. This works for a single server. For horizontal scaling, replace with Redis Pub/Sub — worker publishes to Redis, every server instance subscribes, whichever holds the SSE connection delivers the event.

### 7. Atomic Status Updates with $transaction

```typescript
await prisma.$transaction([
  prisma.job.update({ where: { id }, data: { status } }),
  prisma.jobStatusHistory.create({ data: { jobId: id, status } }),
]);
```

Both succeed or both fail. The Job table and JobStatusHistory can never get out of sync due to a partial write. This is ACID in practice.

### 8. Company Upsert with Composite Unique

```typescript
prisma.company.upsert({
  where: { name_website: { name, website } },
  update: {},
  create: { name, website },
});
```

`name_website` is Prisma's auto-generated name for `@@unique([name, website])`. Find or create in one atomic operation — no race condition window between a separate findUnique and create.

### 9. Redis Sliding-Window Rate Limiting

```
createRateLimiter({ windowMs, max, keyPrefix, message })
  → key = ratelimit:<prefix>:<userId | ip>
  → single Redis Lua script (atomic):
       ZREMRANGEBYSCORE  drop entries older than the window
       ZCARD             count requests still in the window
       if count < max → ZADD (record) + EXPIRE → allow
       else           → reject
```

A Lua script runs the count-and-add as one atomic Redis operation, so concurrent requests can't slip past the limit in the gap between a read and a write. Authenticated callers are keyed by `userId`, anonymous ones by IP. Every response carries `X-RateLimit-Limit` / `X-RateLimit-Remaining`; rejections return `429` with `Retry-After`. If Redis is unreachable the limiter fails open (logs and calls `next()`) rather than taking the API down.

Three tiers are wired up:

| Limiter          | Window | Max | Applied to                                    |
| ---------------- | ------ | --- | --------------------------------------------- |
| `generalLimiter` | 1 min  | 100 | Globally, on every request                    |
| `aiLimiter`      | 1 min  | 10  | AI endpoints (`/profile/upload`, `POST /jobs`, `/jobs/:id/draft-email`) |
| `authLimiter`    | 15 min | 5   | `/auth/google`, `/auth/refresh`               |

### 10. Centralized Error Handling

A terminal Express error middleware (`errorHandler`) is mounted after all routes. Route handlers wrap async work in `try/catch` and forward failures via `next(error)`; the handler logs the method, path, and stack, then returns a consistent `{ error, message }` JSON body. This keeps error shaping out of individual controllers.

---

## Request Flows

### POST /profile/upload

```
1. Multer receives PDF into memory buffer
2. pdf-parse extracts raw text
3. pdf-lib walks annotation tree → extracts hyperlink URIs
4. Claude Sonnet receives: raw text + "Links found: [url1, url2...]"
5. Returns structured JSON: { skills, projects, summary }
6. Profile upserted in PostgreSQL
```

### POST /jobs

```
1. Zod validates { companyName, companyWebsite, role, jobDescription, hrEmail?, hrName?, source }
2. Company upserted (find or create by name+website)
3. Job created with status SAVED
4. JobStatusHistory row inserted (initial SAVED entry)
5. Claude Haiku scores match: candidate profile vs job description
6. Job updated with matchScore + matchBreakdown
7. Return full job with company and match data
```

### POST /jobs/:id/draft-email + GET /jobs/:id/email-stream

```
Client opens SSE connection: GET /jobs/:id/email-stream
  → connection registered in memory map

Client triggers draft: POST /jobs/:id/draft-email
  → BullMQ job pushed
  → 202 Accepted returned immediately

Worker (async):
  → fetch job + profile in parallel
  → pick random tone template
  → Claude Sonnet generates { subject, body }
  → SSE event { status: 'completed', template, email } pushed to waiting connection
  → Connection closed
```

---

## API Reference

### Auth

| Method | Endpoint              | Description                               |
| ------ | --------------------- | ----------------------------------------- |
| GET    | /auth/google          | Redirect to Google OAuth consent          |
| GET    | /auth/google/callback | OAuth callback — sets JWT cookies, redirects to `FRONTEND_URL/dashboard` |
| GET    | /auth/failure         | OAuth failure landing — returns 401       |
| POST   | /auth/refresh         | Get new access token using refresh cookie |
| GET    | /auth/me              | Current user info (id, email, name, avatarUrl, createdAt) — protected |

### Profile

| Method | Endpoint        | Description                               |
| ------ | --------------- | ----------------------------------------- |
| POST   | /profile/upload | Upload resume PDF, triggers AI extraction |
| GET    | /profile        | Get current user's extracted profile      |

### Jobs

| Method | Endpoint               | Description                               |
| ------ | ---------------------- | ----------------------------------------- |
| POST   | /jobs                  | Create job + trigger AI match scoring     |
| GET    | /jobs                  | List all jobs for current user            |
| PATCH  | /jobs/:id/status       | Update job status                         |
| POST   | /jobs/:id/draft-email  | Queue cold email drafting (returns 202)   |
| GET    | /jobs/:id/email-stream | SSE stream — open before triggering draft |

### Health

| Method | Endpoint | Description         |
| ------ | -------- | ------------------- |
| GET    | /health  | Server health check |

---

## Project Structure

```
src/
  config/
    db.ts                ← Prisma client singleton
    redis.ts             ← ioredis client (used by the rate limiter)
    passport.ts          ← Google OAuth2 strategy (no serialize/deserialize)
    anthropic.ts         ← Anthropic client singleton
    emailQueue.ts        ← BullMQ email-draft queue config (2 retries, exp backoff)
  controller/
    job.controller.ts    ← create, list, status update, draft email, SSE stream
    profile.controller.ts
  services/
    auth.service.ts      ← googleAuth (upsert user), generateTokens, verifyRefreshToken
    profile.service.ts   ← extractProfileFromResume (pdf-parse + pdf-lib + Claude), saveProfile
    job.service.ts       ← createJob, getJobs, updateJobStatus
    match.service.ts     ← scoreJobMatch via Claude Haiku
  workers/
    email.worker.ts      ← BullMQ worker: fetch data → tone template → Claude Sonnet → SSE push
  routes/
    auth.routes.ts
    profile.routes.ts
    job.routes.ts
  middleware/
    auth.middleware.ts   ← verifyaccessToken, verifyRefreshToken, AuthenticatedRequest
    upload.middleware.ts ← Multer config (memoryStorage, PDF filter, 5MB limit)
    rateLimiter.ts       ← Redis sliding-window limiter factory + general/ai/auth limiters
    errorHandler.ts      ← terminal Express error middleware
  schemas/
    job.schema.ts        ← Zod schema + inferred CreateJobInput type
  utils/
    encryption.ts        ← AES-256-CBC encrypt / decrypt
    sseManager.ts        ← in-memory Map<jobId, Response>
  app.ts                 ← Express setup, middleware, route mounting (also imports the worker)
  server.ts              ← entry point
prisma/
  schema.prisma          ← single source of truth for DB structure
  migrations/            ← auto-generated SQL migration files
docker-compose.yml       ← postgres (port 5433) + redis (port 6380)
```

Note: Ports 5433 and 6380 are used to avoid conflict with Project 1 (Wrap) which runs on the default 5432/6379.

---

## Running Locally

**Prerequisites:** Docker Desktop, Node.js 20+, Google Cloud project with OAuth2 credentials, Anthropic API key

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL and Redis
docker compose up -d

# 3. Run migrations
npx prisma migrate dev

# 4. Generate Prisma client
npx prisma generate

# 5. Start server
npm run dev
```

**Environment variables (.env):**

```env
PORT=3000
NODE_ENV="development"            # "production" enables secure cookies
DATABASE_URL="postgresql://postgres:secret@localhost:5433/nexus"
REDIS_HOST="localhost"
REDIS_PORT="6380"

GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3000/auth/google/callback"
FRONTEND_URL="http://localhost:5173"   # OAuth callback redirects to FRONTEND_URL/dashboard

JWT_SECRET="generate-with-crypto"
JWT_REFRESH_SECRET="generate-with-crypto-different"
ENCRYPTION_KEY="exactly-32-characters-long"
SESSION_SECRET="generate-with-crypto"

ANTHROPIC_API_KEY="sk-ant-..."
```

**Generate secrets:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run that command separately for JWT_SECRET, JWT_REFRESH_SECRET, and SESSION_SECRET. For ENCRYPTION_KEY it must be exactly 32 characters — take the first 32 characters of one of the outputs.

---

## What's Not Built Yet

- **Gmail watching** — poll inbox for recruiter replies, auto-update job status to REPLIED, create notifications
- **Notifications** — in-app alerts for replies and follow-up reminders
- **Email persistence** — drafted emails are streamed but not saved; no send/edit history
- **Standalone worker process** — the worker currently runs in-process via `app.ts`; the `npm run worker` script points at `src/workers/index.ts`, which doesn't exist yet
- **Frontend** — React/Next.js dashboard for the job board, status dropdown, and email stream UI
- **Deployment** — containerize the API, deploy behind Nginx reverse proxy

**Recently shipped:** Redis sliding-window rate limiting (general / AI / auth tiers) and a centralized Express error handler.
