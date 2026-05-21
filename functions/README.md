# Cloud Functions (Python)

## Brain chat (`brain_chat`) and OpenAI

The HTTPS function `brain_chat` in `main.py` calls OpenAI’s Chat Completions API. The **OpenAI API key must never be committed to git** or placed in React `REACT_APP_*` variables (the browser bundle is public).

### Local emulator

1. Install dependencies: `pip install -r requirements.txt` (or let the Firebase CLI install them when emulating).
2. Set the environment variable **before** starting the emulator so the Python process can read it:
   - **PowerShell:** `$env:OPENAI_API_KEY = "sk-..."`
   - **cmd:** `set OPENAI_API_KEY=sk-...`
   - **macOS / Linux:** `export OPENAI_API_KEY=sk-...`
3. Run: `firebase emulators:start --only functions` (or your usual emulator command).

Optional:

- `OPENAI_CHAT_MODEL` — defaults to `gpt-4o-mini` if unset.
- `ALLOWED_CORS_ORIGINS` — comma-separated extra browser origins for CORS (see `main.py`).

### Deployed functions (production)

Configure `OPENAI_API_KEY` in the **runtime environment** for the deployed function (Google Cloud Console → Cloud Functions → select `brain_chat` → edit → environment variables, or your team’s preferred secret manager / Firebase secrets workflow for Python 2nd gen).

After changing env vars, redeploy functions so new values apply.

### Frontend URL

The React app calls the same Cloud Function URL pattern as `on_request_example` (see `src/unAuth/Component/API/openaiChat.js` and `clientfetch.js`): project id, region (`us-central1` by default), and emulator vs production hosting.

## User profiles (`save_user_profile`) and MongoDB

Sign-up saves **first name**, **last name**, and **role** to MongoDB collection `users` (keyed by Firebase `uid`). The connection string stays on the server only — never in React or git.

### Environment variables

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | Atlas connection string (required for real data; local default is `mongodb://127.0.0.1:27017`) |
| `MONGODB_DATABASE` | Database name (default `app`) — must match the database you open in Atlas |
| `MONGODB_USERS_COLLECTION` | Collection for sign-up profiles (default `users`) — must match your Atlas collection name exactly |
| `ALLOWED_CORS_ORIGINS` | Optional comma-separated extra origins (Hosting is auto-allowed via `GCLOUD_PROJECT`) |

### Local emulator

1. **Rotate** any MongoDB password that was ever pasted in chat, then set the new URI:
   - **PowerShell:** `$env:MONGODB_URI = "mongodb+srv://..."`
   - Optional: `$env:MONGODB_DATABASE = "your_db_name"`
2. Start functions: `npx -y firebase-tools@latest emulators:start --only functions`
3. Start React: `npm start` → create account on the sign-up screen.
4. In Atlas → **Browse Collections** → `users` → confirm `uid`, names, `role`, and `email`.

The browser sends a Firebase **ID token** in `Authorization: Bearer …`; the function verifies it and uses the token’s `uid` (not a client-supplied uid).

### Deployed functions (production)

Set `MONGODB_URI` and `MONGODB_DATABASE` in the Cloud Functions runtime environment (Console or your team’s secrets workflow), then redeploy:

`npx -y firebase-tools@latest deploy --only functions:save_user_profile`

After deploy, sign up on your hosted app and confirm the same `users` document in Atlas.

## Login audit log (`log_login`) and MongoDB

Sign-in history is **append-only**: one MongoDB document per event, never updated. That is different from the profile collection (`EndUser` / `users`), which stores one document per person and gets upserted when they sign up.

| Collection (env-driven name) | Purpose | Documents |
|------------------------------|---------|-----------|
| `MONGODB_USERS_COLLECTION` (default `EndUser`) | Profile (name, role, email) | One per `uid`, updated on sign-up |
| `MONGODB_LOGIN_EVENTS_COLLECTION` (default `login_events`) | Audit trail | One per sign-in / sign-up / idle logout |

Each explicit sign-in, sign-up, or inactivity sign-out calls `log_login`. Refreshing the page while still signed in does **not** create a new row — only actions in `authService.js` and idle logout call this endpoint.

You do **not** need to create `login_events` in Atlas manually; MongoDB creates the collection on the first `insert_one`. Optional index for “login history per user” queries: `{ uid: 1, createdAt: -1 }`.

### Environment variables

Uses the **same** `MONGODB_URI` and `MONGODB_DATABASE` as `save_user_profile`; only the collection name is separate.

| Variable | Default | Purpose |
|----------|---------|---------|
| `MONGODB_URI` | (none — required for Atlas) | Connection string (server only; never in React or git) |
| `MONGODB_DATABASE` | `User` | Database name — must match Atlas |
| `MONGODB_LOGIN_EVENTS_COLLECTION` | `login_events` | Audit collection for login events |

### Document shape

Each insert includes: `uid`, `email`, `eventType` (`sign_in` \| `sign_up` \| `inactivity_logout`), `method` (`email` \| `google` \| `unknown`), `createdAt` (UTC), `userAgent` (from request header).

### Local emulator

1. Set Mongo env vars **before** starting the functions emulator (same URI/database as profiles):
   - **PowerShell:** `$env:MONGODB_URI = "mongodb+srv://..."`
   - Optional: `$env:MONGODB_DATABASE = "User"`
   - Optional: `$env:MONGODB_LOGIN_EVENTS_COLLECTION = "login_events"`
2. Start: `npx -y firebase-tools@latest emulators:start --only functions`
3. Restart the emulator after changing `functions/main.py` so `log_login` is loaded.
4. Sign in from React → Atlas → **Browse Collections** → `login_events` → confirm a new document (`uid`, `eventType`, `method`, `createdAt`).
5. Refresh while signed in → **no** extra document.

### Deployed functions (production)

Set the same Mongo env vars on the function runtime, then redeploy:

`npx -y firebase-tools@latest deploy --only functions:log_login`

Or deploy all functions: `npx -y firebase-tools@latest deploy --only functions`

### Frontend

- [`src/Auth/API/loginLogApi.js`](../src/Auth/API/loginLogApi.js) — POST to `log_login`
- [`src/Auth/authService.js`](../src/Auth/authService.js) — logs after sign-in / sign-up (failures only go to console)
- [`src/Auth/useInactivityLogout.js`](../src/Auth/useInactivityLogout.js) — 1 hour idle → `inactivity_logout` then sign-out
