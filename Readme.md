# Nex — AI-Powered Job Application Tracker

A full-stack job application tracker with AI match scoring and cold email drafting. Built to learn OAuth2, JWT auth, PDF parsing, LLM integration, BullMQ async queues, SSE streaming, and PostgreSQL at depth.

---

## What This Does

- **Login with Google** — no passwords, refresh token encrypted at rest
- **Upload your resume PDF** — AI extracts skills, projects, and a candidate summary automatically
- **Add jobs manually** — AI scores each one against your profile (0–100 match) with a skill breakdown
- **Track application status** — full audit trail of every status change with timestamps
- **Draft cold emails** — BullMQ queues the LLM request, SSE streams the result back in real time; drafts persist in localStorage so they survive navigation and refresh
- **Auth-aware landing page** — logged-in users see "Go to Dashboard" without being force-redirected; new visitors see the Google sign-in CTA

---

## Stack

### Backend (`/backend`)

| Layer         | Tool                              |
| ------------- | --------------------------------- |
| Runtime       | Node.js 20 + TypeScript           |
| Framework     | Express 5                         |
| Database      | PostgreSQL + Prisma ORM           |
| Cache / Queue | Redis + BullMQ                    |
| Auth          | Passport.js + Google OAuth2 + JWT |
| AI            | Anthropic Claude API              |
| PDF parsing   | pdf-parse + pdf-lib               |
| Env loading   | dotenvx                           |

### Frontend (`/frontend`)

| Layer         | Tool                                      |
| ------------- | ----------------------------------------- |
| Framework     | React 19 + Vite 8 + TypeScript            |
| Styling       | Tailwind CSS v4 (CSS-first config)        |
| Data fetching | TanStack React Query v5                   |
| Routing       | React Router v6                           |
| HTTP client   | Axios (withCredentials + 401 interceptor) |
| Icons         | Lucide React                              |
| Fonts         | Playfair Display (display) + Inter (UI)   |

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

GET /jobs/:id
  → fetch single job with company + status history (auth required)

PATCH /jobs/:id/status
  → Zod enum validation → prisma.$transaction([update job, insert history row])

POST /jobs/:id/draft-email
  → 202 Accepted immediately → BullMQ job pushed to Redis queue

GET /jobs/:id/email-stream
  → SSE headers set → connection registered in memory map by jobId
       ↓
  Worker picks up BullMQ job
  → fetch Job + Profile in parallel (Promise.all)
  → Claude Sonnet drafts structured cold email (5-10s)
  → sendSSEEvent(jobId, 'done', { draft: { subject, body } }) → push to waiting connection
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
| Claude Sonnet 4.6            | Resume extraction + email drafting  | Best quality for user-visible output and structured extraction               |
| Claude Haiku 4.5             | Match scoring                       | Runs on every job add — cost matters. Fast and cheap for comparison tasks.  |
| pdf-parse                    | PDF text extraction                 | Buffer-based, no filesystem needed                                          |
| pdf-lib                      | PDF hyperlink annotation extraction | pdf-parse only gets visible text. Project GitHub links live in annotations. |
| Multer (memoryStorage)       | File upload                         | Resume processed once and discarded — no filesystem cleanup                 |
| Zod                          | Input validation + TypeScript types | Runtime validation + inferred types from one schema                         |
| Tailwind CSS v4              | Frontend styling                    | CSS-first config via `@theme {}` — no JS config file needed                 |
| TanStack React Query v5      | Frontend data fetching              | Automatic caching, optimistic updates, background refetch                   |
| dotenvx                      | Env loading                         | Single entry point (`config/env.ts`) — no redundant dotenv calls            |

---

## Database Schema

### User

| Column                | Type        | Note                              |
| --------------------- | ----------- | --------------------------------- |
| id                    | UUID        | Primary key                       |
| email                 | VARCHAR     | UNIQUE                            |
| name                  | VARCHAR     | From Google profile               |
| googleId              | VARCHAR     | UNIQUE — OAuth identifier         |
| avatarUrl             | TEXT        | Google profile picture (nullable) |
| encryptedRefreshToken | TEXT        | AES-256-CBC encrypted             |
| accessToken           | TEXT        | Google short-lived token          |
| accessTokenExpiry     | TIMESTAMPTZ | For knowing when to refresh       |
| createdAt / updatedAt | TIMESTAMPTZ | Auto-managed                      |

### Profile (one-to-one with User)

| Column    | Type  | Note                                                           |
| --------- | ----- | -------------------------------------------------------------- |
| resume    | TEXT  | Raw extracted PDF text                                         |
| skills    | JSONB | `{ languages, frameworks, tools }` — AI extracted              |
| projects  | JSONB | `[{ name, description, techStack, githubUrl }]` — AI extracted |
| summary   | TEXT  | AI-generated 2-3 sentence candidate summary                    |
| githubUrl | TEXT  | Candidate's GitHub profile URL                                 |

**Why JSONB for skills/projects?** These are read as whole units (fed into LLM prompts), never queried by individual sub-fields. JSONB handles varying project shapes without a rigid normalized schema.

### Company

| Column         | Type             | Note                            |
| -------------- | ---------------- | ------------------------------- |
| id             | UUID             | Primary key                     |
| name + website | COMPOSITE UNIQUE | Prevents duplicate company rows |

One company row is shared across many jobs. Adding two Backend Intern roles at the same company reuses the same Company row.

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

The frontend Axios instance intercepts 401 responses, calls `/auth/refresh` once, then retries the original request automatically. If the refresh fails, the user is redirected to the landing page.

### 4. PDF Parsing — Two-Pass Approach

```
Pass 1 — pdf-parse  → extracts visible text (names, descriptions, education)
Pass 2 — pdf-lib    → walks PDF annotation tree → extracts all hyperlink URIs

Both passed to Claude Sonnet → structured JSON profile
```

Why two passes? PDF hyperlinks are stored as annotation objects, completely separate from the text layer. `pdf-parse` only sees characters. Without Pass 2, all project GitHub links are invisible to the LLM.

### 5. Cost-Aware Model Selection

```
Resume extraction  → Claude Sonnet  (runs once, quality matters)
Job match scoring  → Claude Haiku   (runs on every job add, cost matters)
Cold email draft   → Claude Sonnet  (user-visible output, quality matters)
```

Haiku is ~5x cheaper than Sonnet. Match scoring is a structured comparison task — no deep reasoning needed.

### 6. BullMQ + SSE Pipeline

```
POST /draft-email   → push job to BullMQ → 202 Accepted immediately (client doesn't wait)
GET  /email-stream  → SSE connection opened → registered in sseManager by jobId

Worker (inside API process):
  → dequeue job
  → Promise.all([fetch job, fetch profile])
  → Claude Sonnet drafts structured cold email (~5-10s)
  → sendSSEEvent(jobId, 'done', { draft: { subject, body } })  ← finds waiting connection, writes to it
  → closeSSEClient(jobId)
```

The worker is started in-process by `app.ts` (`import './workers/email.worker'`). BullMQ retries failed jobs twice with exponential backoff; on final failure the worker pushes an `error` SSE event so the client isn't left hanging.

The SSE manager is an in-memory `Map<jobId, Response>`. This works for a single server. For horizontal scaling, replace with Redis Pub/Sub.

The frontend persists the last draft in localStorage (`nex_draft_{jobId}`) so it survives page refreshes and navigation. Re-drafting is opt-in via a "Re-draft" button.

### 7. Atomic Status Updates with $transaction

```typescript
await prisma.$transaction([
  prisma.job.update({ where: { id }, data: { status } }),
  prisma.jobStatusHistory.create({ data: { jobId: id, status } }),
]);
```

Both succeed or both fail. The Job table and JobStatusHistory can never get out of sync due to a partial write.

### 8. Company Upsert with Composite Unique

```typescript
prisma.company.upsert({
  where: { name_website: { name, website } },
  update: {},
  create: { name, website },
});
```

`name_website` is Prisma's auto-generated name for `@@unique([name, website])`. Find or create in one atomic operation — no race condition between a separate findUnique and create.

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

A Lua script runs the count-and-add as one atomic Redis operation. Authenticated callers are keyed by `userId`, anonymous ones by IP. If Redis is unreachable the limiter fails open (logs and calls `next()`) rather than taking the API down.

Three tiers:

| Limiter          | Window | Max | Applied to                                               |
| ---------------- | ------ | --- | -------------------------------------------------------- |
| `generalLimiter` | 1 min  | 100 | Every request globally                                   |
| `aiLimiter`      | 1 min  | 10  | `/profile/upload`, `POST /jobs`, `/jobs/:id/draft-email` |
| `authLimiter`    | 15 min | 5   | `/auth/google`, `/auth/refresh`                          |

### 10. Centralized Error Handling

A terminal Express error middleware (`errorHandler`) is mounted after all routes. Route handlers wrap async work in `try/catch` and forward failures via `next(error)`. The handler logs method, path, and stack, then returns a consistent `{ error, message }` JSON body.

---

## API Reference

### Auth

| Method | Endpoint              | Description                                                            |
| ------ | --------------------- | ---------------------------------------------------------------------- |
| GET    | /auth/google          | Redirect to Google OAuth consent                                       |
| GET    | /auth/google/callback | OAuth callback — sets JWT cookies, redirects to `FRONTEND_URL/dashboard` |
| GET    | /auth/failure         | OAuth failure landing — returns 401                                    |
| POST   | /auth/refresh         | Get new access token using refresh cookie                              |
| GET    | /auth/me              | Current user info (id, email, name, avatarUrl, createdAt)              |

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
| GET    | /jobs/:id              | Get single job with status history        |
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
Nex/
  backend/
    src/
      config/
        db.ts                ← Prisma client singleton
        redis.ts             ← ioredis client (rate limiter)
        passport.ts          ← Google OAuth2 strategy
        anthropic.ts         ← Anthropic client singleton
        emailQueue.ts        ← BullMQ email-draft queue (2 retries, exp backoff)
        env.ts               ← single dotenvx entry point
      controller/
        job.controller.ts    ← create, list, get single, status update, draft email, SSE stream
        profile.controller.ts
      services/
        auth.service.ts      ← googleAuth (upsert user), generateTokens, verifyRefreshToken
        profile.service.ts   ← extractProfileFromResume (pdf-parse + pdf-lib + Claude), saveProfile
        job.service.ts       ← createJob, getJobs, updateJobStatus
        match.service.ts     ← scoreJobMatch via Claude Haiku
      workers/
        email.worker.ts      ← BullMQ worker: fetch data → Claude Sonnet → SSE push
      routes/
        auth.routes.ts
        profile.routes.ts
        job.routes.ts
      middleware/
        auth.middleware.ts   ← verifyAccessToken, verifyRefreshToken, AuthenticatedRequest
        upload.middleware.ts ← Multer config (memoryStorage, PDF filter, 5MB limit)
        rateLimiter.ts       ← Redis sliding-window limiter factory + general/ai/auth limiters
        errorHandler.ts      ← terminal Express error middleware
      schemas/
        job.schema.ts        ← Zod schema + inferred CreateJobInput type
      utils/
        encryption.ts        ← AES-256-CBC encrypt / decrypt
        sseManager.ts        ← in-memory Map<jobId, Response> with 30s pending-result buffer
      app.ts                 ← Express setup, middleware, route mounting, worker import
      server.ts              ← entry point
    prisma/
      schema.prisma          ← single source of truth for DB structure
      migrations/            ← auto-generated SQL migration files

  frontend/
    src/
      api/
        axios.ts             ← Axios instance (baseURL, withCredentials, 401→refresh interceptor)
        auth.ts              ← /auth/me, /auth/refresh
        jobs.ts              ← Job types, createJob, getJobs, getJob, updateStatus, draft/stream
        profile.ts           ← uploadResume, getProfile
      components/
        ui/
          Toast.tsx          ← ToastProvider + useToast hook (auto-dismiss, enter/exit animation)
      hooks/
        useAuth.ts           ← useQuery wrapper for /auth/me
        useJobs.ts           ← useJobs, useJob, useCreateJob, useUpdateStatus mutations
        useProfile.ts        ← useProfile, useUploadResume
      pages/
        Landing.tsx          ← landing page with rotating mock job cards, auth-aware CTA
        Dashboard.tsx        ← job board with status columns and add-job modal
        JobDetail.tsx        ← single job view: match breakdown, status timeline, email draft
        Profile.tsx          ← resume upload + extracted profile display
      router/
        index.tsx            ← React Router v6 with ProtectedRoute
      index.css              ← Tailwind v4 @theme{} config — all color tokens + font CSS vars
      App.tsx                ← QueryClientProvider + ToastProvider root
      main.tsx               ← React DOM entry
    public/
      favicon.svg            ← custom "N" brand favicon (accent color, rounded rect)
```

---

## Running Locally

**Prerequisites:** Docker Desktop, Node.js 20+, Google Cloud project with OAuth2 credentials, Anthropic API key

### Backend

```bash
cd backend

# 1. Install dependencies
npm install

# 2. Start PostgreSQL and Redis
docker compose up -d

# 3. Run migrations
npx prisma migrate dev

# 4. Generate Prisma client
npx prisma generate

# 5. Start dev server
npm run dev
```

### Frontend

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev
```

Frontend runs on `http://localhost:5173`, backend on `http://localhost:3000`.

### Environment Variables (`backend/.env`)

```env
PORT=3000
NODE_ENV="development"            # "production" enables secure cookies

DATABASE_URL="postgresql://postgres:secret@localhost:5433/nex"
REDIS_HOST="localhost"
REDIS_PORT="6380"

GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3000/auth/google/callback"
FRONTEND_URL="http://localhost:5173"

JWT_SECRET="generate-with-crypto"
JWT_REFRESH_SECRET="generate-with-crypto-different"
ENCRYPTION_KEY="your-32-byte-encryption-key-here"
SESSION_SECRET="generate-with-crypto"

ANTHROPIC_API_KEY="sk-ant-..."
```

**Generate secrets:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run that separately for `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `SESSION_SECRET`. For `ENCRYPTION_KEY` take the first 32 characters of one of the outputs.

**Note:** Ports 5433 and 6380 avoid conflicts with other local services using the defaults 5432/6379.

---

## What's Not Built Yet

- **Gmail watching** — poll inbox for recruiter replies, auto-update job status to REPLIED
- **Notifications** — in-app alerts for replies and follow-up reminders
- **Email send** — draft is generated and persisted locally; no send/edit history on the server
- **Standalone worker process** — the worker currently runs in-process via `app.ts`; a separate process would need a `workers/index.ts` entry point
- **Deployment** — containerize frontend + API, deploy behind Nginx reverse proxy
