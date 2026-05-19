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
