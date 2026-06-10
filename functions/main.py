# Welcome to Cloud Functions for Firebase for Python!
# To get started, simply uncomment the below code or create your own.
# Deploy with `firebase deploy`

from firebase_functions import https_fn
from firebase_functions.options import set_global_options
from firebase_admin import auth as firebase_auth, initialize_app
import json
import os
from datetime import datetime, timezone
from uuid import uuid4

from pymongo import MongoClient

# For cost control, you can set the maximum number of containers that can be
# running at the same time. This helps mitigate the impact of unexpected
# traffic spikes by instead downgrading performance. This limit is a per-function
# limit. You can override the limit for each function using the max_instances
# parameter in the decorator, e.g. @https_fn.on_request(max_instances=5).
set_global_options(max_instances=10)

initialize_app()

_ALLOWED_WEB_DEV_ORIGINS = frozenset(
     {
          "http://localhost:3000",
          "http://127.0.0.1:3000",
     }
)


def _parse_extra_cors_origins() -> frozenset:
     """Extra browser origins from ALLOWED_CORS_ORIGINS (comma-separated) for deployed Hosting URLs."""
     raw = os.environ.get("ALLOWED_CORS_ORIGINS", "")
     return frozenset(part.strip() for part in raw.split(",") if part.strip())


def _firebase_hosting_origins() -> frozenset:
     """Default Hosting origins for this Firebase project (works in Cloud Functions without extra env)."""
     project = (
          os.environ.get("GCLOUD_PROJECT")
          or os.environ.get("GOOGLE_CLOUD_PROJECT")
          or ""
     )
     if not project:
          return frozenset()
     return frozenset(
          {
               f"https://{project}.web.app",
               f"https://{project}.firebaseapp.com",
          }
     )


def _cors_headers_for_local_web(req: https_fn.Request) -> dict:
     """CORS for React dev (localhost) and Firebase Hosting in production; supports GET/POST with Authorization."""
     origin = req.headers.get("Origin")
     allowed = (
          _ALLOWED_WEB_DEV_ORIGINS
          | _parse_extra_cors_origins()
          | _firebase_hosting_origins()
     )
     allow = origin if origin in allowed else "http://localhost:3000"
     return {
          "Access-Control-Allow-Origin": allow,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Vary": "Origin",
     }


def _mongodb_users_collection():
     """Lynkfi account profiles: database from MONGODB_DATABASE, collection from MONGODB_USERS_COLLECTION (default `users`)."""
     mongo_uri = os.environ.get("MONGODB_URI")
     database_name = os.environ.get("MONGODB_DATABASE", "User")
     collection_name = os.environ.get("MONGODB_USERS_COLLECTION", "EndUser")
     client = MongoClient(mongo_uri)
     return client[database_name][collection_name]


def _mongodb_login_events_collection():
     """Login audit trail: same database as profiles, collection from MONGODB_LOGIN_EVENTS_COLLECTION."""
     mongo_uri = os.environ.get("MONGODB_URI")
     database_name = os.environ.get("MONGODB_DATABASE", "User")
     collection_name = os.environ.get("MONGODB_LOGIN_EVENTS_COLLECTION", "login_events")
     client = MongoClient(mongo_uri)
     return client[database_name][collection_name]


def _mongodb_firms_collection():
     """Firm workspaces: database from MONGODB_DATABASE, collection from MONGODB_FIRMS_COLLECTION."""
     mongo_uri = os.environ.get("MONGODB_URI")
     database_name = os.environ.get("MONGODB_DATABASE", "User")
     collection_name = os.environ.get("MONGODB_FIRMS_COLLECTION", "Firms")
     client = MongoClient(mongo_uri)
     return client[database_name][collection_name]


def _mongodb_clients_collection():
     # (Function meaning): Connect to MongoDB using the secret URI from env, pick the database name from env (or use "User" as the default), pick the collection name from env (or use "Clients" as the default), and return that collection object so callers can run queries against it.
     # (Rename note): The caller named [on_request_example] in the comment below has been renamed to [request_Clients_info]; the comment below is preserved unchanged per project rules.
     # (External references): Uses the same MONGODB_URI and MONGODB_DATABASE env variables as [_mongodb_users_collection] and [_mongodb_firms_collection] above; callers include [on_request_example] below.
     mongo_uri = os.environ.get("MONGODB_URI")
     database_name = os.environ.get("MONGODB_DATABASE", "User")
     collection_name = os.environ.get("MONGODB_CLIENTS_COLLECTION", "Clients")
     client = MongoClient(mongo_uri)
     return client[database_name][collection_name]


def _mongodb_task_templates_collection():
     # (Function meaning): Open a MongoDB connection with the secret URI from env, choose the database name from env (or "User" by default), and return the fixed "TaskTemplate" collection — the collection that holds reusable task blueprints (each with a Steps array) that the frontend fetches when a task type is selected.
     # (External references): Shares MONGODB_URI and MONGODB_DATABASE with all other collection helpers; called by [get_task_template] below; the document shape (TaskName, Steps[...]) matches what is stored in [User.TaskTemplate] in MongoDB.
     mongo_uri = os.environ.get("MONGODB_URI")
     database_name = os.environ.get("MONGODB_DATABASE", "User")
     client = MongoClient(mongo_uri)
     return client[database_name]["TaskTemplate"]


def _mongodb_tasks_collection():
     # (Function meaning): Open a MongoDB connection with the secret URI from env, choose the database name from env (or "User" by default to match every other helper above), choose the task collection name from env (or "Task" by default), and hand back that collection so callers can read and update task documents.
     # (External references): Shares the same MONGODB_URI and MONGODB_DATABASE env variables as [_mongodb_clients_collection] above; callers include [get_my_client_tasks] and [complete_task_step] below; the document shape (TaskID, FirmID, ClientID, Steps[...]) matches what is stored from the task-creation flow.
     mongo_uri = os.environ.get("MONGODB_URI")
     database_name = os.environ.get("MONGODB_DATABASE", "User")
     collection_name = os.environ.get("MONGODB_TASKS_COLLECTION", "Task")
     client = MongoClient(mongo_uri)
     return client[database_name][collection_name]


_ALLOWED_LOGIN_EVENT_TYPES = frozenset({"sign_in", "sign_up", "inactivity_logout"})
_SYSTEM_FIRM_ROLE = "firm_admin"
_ALLOWED_FIRM_ACCESS = frozenset({"full", "standard", "read_only"})
_ALLOWED_LOGIN_METHODS = frozenset({"email", "google", "unknown"})


def _normalize_firm_roles(raw_roles) -> list:
     """Trim, drop empty, dedupe by name (case-insensitive); each entry is { name, firmAccess }."""
     if not isinstance(raw_roles, list):
          return []
     seen = set()
     result = []
     for item in raw_roles:
          if isinstance(item, dict):
               name = str(item.get("name", "")).strip()
               access = str(item.get("firmAccess", "standard")).strip()
          else:
               name = str(item).strip()
               access = "standard"
          if not name:
               continue
          key = name.lower()
          if key in seen:
               continue
          seen.add(key)
          if access not in _ALLOWED_FIRM_ACCESS:
               access = "standard"
          result.append({"name": name, "firmAccess": access})
     return result


def _firm_role_names(firm_roles) -> set:
     """Role name strings from firmRoles (supports legacy string entries or { name } objects)."""
     names = set()
     for item in firm_roles or []:
          if isinstance(item, dict):
               name = str(item.get("name", "")).strip()
          else:
               name = str(item).strip()
          if name:
               names.add(name)
     return names


def _firm_role_allowed_for_firm(firm_id: str, firm_role: str) -> bool:
     """firm_admin is always allowed; other roles must appear on the firm document."""
     if firm_role == _SYSTEM_FIRM_ROLE:
          return True
     firms = _mongodb_firms_collection()
     try:
          firm = firms.find_one({"_id": firm_id}, {"firmRoles": 1})
     except Exception:
          return False
     if not firm:
          return False
     return firm_role in _firm_role_names(firm.get("firmRoles"))


def _verify_bearer_token(req: https_fn.Request):
     """Return decoded Firebase token dict or None if missing/invalid."""
     auth_header = req.headers.get("Authorization", "")
     if not auth_header.startswith("Bearer "):
          return None
     id_token = auth_header[len("Bearer ") :].strip()
     if not id_token:
          return None
     try:
          return firebase_auth.verify_id_token(id_token)
     except Exception:
          return None


def _json_error(
     req: https_fn.Request, message: str, status: int
) -> https_fn.Response:
     return https_fn.Response(
          json.dumps({"error": message}),
          status=status,
          mimetype="application/json",
          headers=_cors_headers_for_local_web(req),
     )


@https_fn.on_request()
def request_Clients_info(req: https_fn.Request) -> https_fn.Response:
     """GET firm-scoped clients from MongoDB for the signed-in user; returns `{ clients: [...] }`."""
     # (Function meaning): If the browser sends a pre-flight OPTIONS request (asking "am I allowed to talk to you?"), reply immediately with the CORS permission headers and an empty 204 body — no auth or DB work needed.
     # (External references): _cors_headers_for_local_web is defined earlier in this file.
     if req.method == "OPTIONS":
          return https_fn.Response("", status=204, headers=_cors_headers_for_local_web(req))

     # (Function meaning): This endpoint only answers GET requests; anything else (POST, PUT, DELETE, etc.) gets a 405 "Method Not Allowed" error back to the caller.
     if req.method != "GET":
          return _json_error(req, "Method not allowed", 405)

     # (Function meaning): Read the Authorization header, check it is a valid Firebase login token, and unpack it; if the header is missing or the token is fake/expired, send back a 401 "Unauthorized" error so the browser knows it must sign in first.
     # (External references): _verify_bearer_token is defined earlier in this file.
     decoded = _verify_bearer_token(req)
     if not decoded:
          return _json_error(req, "Missing or invalid Authorization header", 401)

     # (Function meaning): Pull the user's unique ID (uid) out of the decoded token; if it is somehow absent, refuse the request with a 401.
     uid = decoded.get("uid")
     if not uid:
          return _json_error(req, "Invalid token payload", 401)

     # (Function meaning): Look up this user's profile document in the EndUser collection using their uid as the document key; only fetch the firmId field (we don't need the rest) to keep the query fast.
     # (External references): _mongodb_users_collection is defined earlier in this file; _id in MongoDB equals the uid stored when the profile was saved in save_user_profile below.
     try:
          users = _mongodb_users_collection()
          user_doc = users.find_one({"_id": uid}, {"firmId": 1})
     except Exception:
          return _json_error(req, "Could not read user profile from database", 503)

     # (Function meaning): If no profile document was found for this uid, or if the document exists but has no firmId, return a 403 "Forbidden" error — we cannot filter clients without knowing which firm this user belongs to.
     if not user_doc:
          return _json_error(req, "User profile not found", 404)
     user_firm_id = str(user_doc.get("firmId", "")).strip()
     if not user_firm_id:
          return _json_error(req, "User profile has no firmId", 403)

     # (Function meaning): Query the Clients collection for every document whose FirmId field exactly matches this user's firm; {"_id": 0} tells MongoDB to leave the internal _id field out of every result so the JSON stays clean and the frontend never sees it.
     # (External references): _mongodb_clients_collection is defined just above this function in this file.
     try:
          clients_col = _mongodb_clients_collection()
          client_docs = list(clients_col.find({"FirmId": user_firm_id}, {"_id": 0}))
     except Exception:
          return _json_error(req, "Could not read clients from database", 503)

     # (Function meaning): Wrap the list of client documents in a {"clients": [...]} object and send it back as JSON — this exact shape is what [clientfetch.js] expects when it reads `data.clients`.
     # (External references): Frontend mapping in [src/unAuth/Component/API/clientfetch.js] reads `data.clients` and maps SystemID, FirstName, LastName from each item.
     return https_fn.Response(
          json.dumps({"clients": client_docs}, indent=2),
          mimetype="application/json",
          headers=_cors_headers_for_local_web(req),
     )

@https_fn.on_request()
def save_user_profile(req: https_fn.Request) -> https_fn.Response:
     """POST JSON profile for the signed-in Firebase user; upserts into MongoDB `users` by verified uid."""
     cors = _cors_headers_for_local_web(req)
     if req.method == "OPTIONS":
          return https_fn.Response("", status=204, headers=cors)
     if req.method != "POST":
          return _json_error(req, "Method not allowed", 405)

     auth_header = req.headers.get("Authorization", "")
     if not auth_header.startswith("Bearer "):
          return _json_error(req, "Missing or invalid Authorization header", 401)

     id_token = auth_header[len("Bearer ") :].strip()
     if not id_token:
          return _json_error(req, "Missing ID token", 401)

     try:
          decoded = firebase_auth.verify_id_token(id_token)
     except Exception:
          return _json_error(req, "Invalid or expired sign-in token", 401)

     uid = decoded.get("uid")
     if not uid:
          return _json_error(req, "Invalid token payload", 401)

     email = decoded.get("email") or ""

     body = req.get_json(silent=True)
     if not isinstance(body, dict):
          return _json_error(req, "Expected JSON body", 400)

     first_name = str(body.get("firstName", "")).strip()
     last_name = str(body.get("lastName", "")).strip()
     if not first_name or not last_name:
          return _json_error(req, "firstName and lastName are required", 400)

     firm_id = str(body.get("firmId", "")).strip()
     firm_role = str(body.get("firmRole", "")).strip()
     role = str(body.get("role", "")).strip()

     if firm_id:
          if not firm_role:
               return _json_error(
                    req, "firmRole is required when firmId is set", 400
               )
          if not _firm_role_allowed_for_firm(firm_id, firm_role):
               return _json_error(req, "Invalid firmRole for this firm", 400)
     elif firm_role:
          return _json_error(req, "firmId is required when firmRole is set", 400)
     else:
          if not role:
               return _json_error(
                    req, "firstName, lastName, and role are required", 400
               )

     users = _mongodb_users_collection()

     profile_set = {
          "uid": uid,
          "firstName": first_name,
          "lastName": last_name,
          "email": email,
     }
     if firm_id:
          profile_set["firmId"] = firm_id
          profile_set["firmRole"] = firm_role
     else:
          profile_set["role"] = role

     now = datetime.now(timezone.utc)
     update_doc = {
          "$set": profile_set,
          "$setOnInsert": {"createdAt": now},
     }
     if firm_id:
          update_doc["$unset"] = {"role": ""}

     try:
          users.update_one(
               {"_id": uid},
               update_doc,
               upsert=True,
          )
          if firm_id and firm_role:
               firms = _mongodb_firms_collection()
               firms.update_one(
                    {"_id": firm_id},
                    {
                         "$addToSet": {
                              "approvedMembers": {
                                   "uid": uid,
                                   "firmRole": firm_role,
                                   "email": email,
                              }
                         }
                    },
               )
     except Exception:
          return _json_error(req, "Could not save profile to database", 503)

     return https_fn.Response(
          json.dumps({"ok": True}),
          status=200,
          mimetype="application/json",
          headers=cors,
     )


@https_fn.on_request()
def check_firm_admin(req: https_fn.Request) -> https_fn.Response:
     """GET whether the signed-in user's MongoDB profile has firmRole firm_admin."""
     cors = _cors_headers_for_local_web(req)
     if req.method == "OPTIONS":
          return https_fn.Response("", status=204, headers=cors)
     if req.method != "GET":
          return _json_error(req, "Method not allowed", 405)

     decoded = _verify_bearer_token(req)
     if not decoded:
          return _json_error(req, "Missing or invalid Authorization header", 401)

     uid = decoded.get("uid")
     if not uid:
          return _json_error(req, "Invalid token payload", 401)

     is_firm_admin = False
     try:
          users = _mongodb_users_collection()
          doc = users.find_one({"_id": uid}, {"firmRole": 1})
          if doc and doc.get("firmRole") == _SYSTEM_FIRM_ROLE:
               is_firm_admin = True
     except Exception:
          return _json_error(req, "Could not read profile from database", 503)

     return https_fn.Response(
          json.dumps({"isFirmAdmin": is_firm_admin}),
          status=200,
          mimetype="application/json",
          headers=cors,
     )


@https_fn.on_request()
def save_firm(req: https_fn.Request) -> https_fn.Response:
     """POST firm details during onboarding (no auth); inserts into MongoDB Firms collection."""
     cors = _cors_headers_for_local_web(req)
     if req.method == "OPTIONS":
          return https_fn.Response("", status=204, headers=cors)
     if req.method != "POST":
          return _json_error(req, "Method not allowed", 405)

     body = req.get_json(silent=True)
     if not isinstance(body, dict):
          return _json_error(req, "Expected JSON body", 400)

     firm_name = str(body.get("firmName", "")).strip()
     firm_type = str(body.get("firmType", "")).strip()
     firm_type_other = str(body.get("firmTypeOther", "")).strip()
     if not firm_name:
          return _json_error(req, "firmName is required", 400)
     if not firm_type:
          return _json_error(req, "firmType is required", 400)
     if firm_type == "other" and not firm_type_other:
          return _json_error(req, "firmTypeOther is required when firmType is other", 400)

     firm_roles = _normalize_firm_roles(body.get("firmRoles", []))

     approved_raw = body.get("approvedMembers")
     approved_members = []
     firm_roles_set = _firm_role_names(firm_roles)
     if approved_raw is not None:
          if not isinstance(approved_raw, list):
               return _json_error(req, "approvedMembers must be an array", 400)
          for item in approved_raw:
               if not isinstance(item, dict):
                    return _json_error(req, "Each approvedMembers entry must be an object", 400)
               firm_role = str(item.get("firmRole", "")).strip()
               if firm_role not in firm_roles_set:
                    return _json_error(
                         req,
                         "approvedMembers firmRole must be one of the firm's firmRoles",
                         400,
                    )
               first_name = str(item.get("firstName", "")).strip()
               last_name = str(item.get("lastName", "")).strip()
               email = str(item.get("email", "")).strip()
               if not first_name or not last_name or not email:
                    return _json_error(
                         req,
                         "approvedMembers entries require firstName, lastName, firmRole, and email",
                         400,
                    )
               approved_members.append(
                    {
                         "firmRole": firm_role,
                         "firstName": first_name,
                         "lastName": last_name,
                         "email": email,
                    }
               )

     firm_id = str(uuid4())
     now = datetime.now(timezone.utc)
     doc = {
          "_id": firm_id,
          "firmId": firm_id,
          "firmName": firm_name,
          "firmType": firm_type,
          "firmTypeOther": firm_type_other if firm_type == "other" else "",
          "legalName": str(body.get("legalName", "")).strip(),
          "ein": str(body.get("ein", "")).strip(),
          "phone": str(body.get("phone", "")).strip(),
          "website": str(body.get("website", "")).strip(),
          "addressLine1": str(body.get("addressLine1", "")).strip(),
          "city": str(body.get("city", "")).strip(),
          "state": str(body.get("state", "")).strip(),
          "postalCode": str(body.get("postalCode", "")).strip(),
          "country": str(body.get("country", "")).strip() or "US",
          "teamSize": str(body.get("teamSize", "")).strip(),
          "timezone": str(body.get("timezone", "")).strip(),
          "firmRoles": firm_roles,
          "pendingMembers": [],
          "approvedMembers": approved_members,
          "suspendedMembers": [],
          "onLeaveMembers": [],
          "inactiveMembers": [],
          "createdAt": now,
     }

     firms = _mongodb_firms_collection()
     try:
          firms.insert_one(doc)
     except Exception:
          return _json_error(req, "Could not save firm to database", 503)

     return https_fn.Response(
          json.dumps({"ok": True, "firmId": firm_id}),
          status=200,
          mimetype="application/json",
          headers=cors,
     )


@https_fn.on_request()
def verify_firm(req: https_fn.Request) -> https_fn.Response:
     """Confirm a firm exists after save_firm (GET ?firmId= or POST { firmId }); no auth."""
     cors = _cors_headers_for_local_web(req)
     if req.method == "OPTIONS":
          return https_fn.Response("", status=204, headers=cors)

     firm_id = ""
     if req.method == "GET":
          firm_id = str(req.args.get("firmId", "")).strip()
     elif req.method == "POST":
          body = req.get_json(silent=True)
          if isinstance(body, dict):
               firm_id = str(body.get("firmId", "")).strip()
     else:
          return _json_error(req, "Method not allowed", 405)

     if not firm_id:
          return _json_error(req, "firmId is required", 400)

     firms = _mongodb_firms_collection()
     try:
          found = firms.find_one({"_id": firm_id})
     except Exception:
          return _json_error(req, "Could not verify firm in database", 503)

     if not found:
          return _json_error(req, "Firm not found", 404)

     return https_fn.Response(
          json.dumps({"ok": True, "firmId": firm_id}),
          status=200,
          mimetype="application/json",
          headers=cors,
     )


@https_fn.on_request()
def log_login(req: https_fn.Request) -> https_fn.Response:
     """POST login audit event for the signed-in Firebase user; append-only insert into MongoDB login_events."""
     cors = _cors_headers_for_local_web(req)
     if req.method == "OPTIONS":
          return https_fn.Response("", status=204, headers=cors)
     if req.method != "POST":
          return _json_error(req, "Method not allowed", 405)

     decoded = _verify_bearer_token(req)
     if not decoded:
          return _json_error(req, "Invalid or expired sign-in token", 401)

     uid = decoded.get("uid")
     if not uid:
          return _json_error(req, "Invalid token payload", 401)

     email = decoded.get("email") or ""

     body = req.get_json(silent=True)
     if not isinstance(body, dict):
          return _json_error(req, "Expected JSON body", 400)

     event_type = str(body.get("eventType", "")).strip()
     method = str(body.get("method", "unknown")).strip()
     if event_type not in _ALLOWED_LOGIN_EVENT_TYPES:
          return _json_error(
               req,
               "eventType must be sign_in, sign_up, or inactivity_logout",
               400,
          )
     if method not in _ALLOWED_LOGIN_METHODS:
          method = "unknown"

     user_agent = req.headers.get("User-Agent", "") or ""

     events = _mongodb_login_events_collection()
     now = datetime.now(timezone.utc)
     try:
          events.insert_one(
               {
                    "uid": uid,
                    "email": email,
                    "eventType": event_type,
                    "method": method,
                    "createdAt": now,
                    "userAgent": user_agent,
               }
          )
     except Exception:
          return _json_error(req, "Could not save login event to database", 503)

     return https_fn.Response(
          json.dumps({"ok": True}),
          status=200,
          mimetype="application/json",
          headers=cors,
     )


# (Function meaning): The three status words a step can hold, written down once so the rest of the file never has to guess the spelling — a step starts as "not_started", becomes "in_progress" while someone works on it, and ends as "completed".
_TASK_STEP_NOT_STARTED = "not_started"
_TASK_STEP_IN_PROGRESS = "in_progress"
_TASK_STEP_COMPLETED = "completed"
# (Function meaning): The word that marks a whole task as finished; we set OverallStatus to this once every step is completed.
_TASK_OVERALL_COMPLETED = "completed"


def _to_iso(value):
     # (Function meaning): Turn a value into something JSON can safely carry: if it is a real date/time object, hand back its ISO text like "2026-05-22T00:00:00+00:00"; if it is already empty (None), keep it as None; anything else is turned into plain text.
     # (External references): Used by [get_my_client_tasks] below because MongoDB stores dates as datetime objects, and Python's json.dumps cannot serialize a raw datetime.
     if value is None:
          return None
     if isinstance(value, datetime):
          return value.isoformat()
     return str(value)


def _current_active_step(steps):
     # (Function meaning): Walk through a task's list of steps and return the one the team is actually working on now — defined as the step with the smallest StepNumber whose Status is not yet "completed"; if every step is finished (or the list is empty) hand back None.
     # (External references): Called by [get_my_client_tasks] and [complete_task_step] below; the "lowest unfinished StepNumber" rule is the agreed definition of the current step.
     if not isinstance(steps, list):
          return None
     unfinished = [
          step
          for step in steps
          if isinstance(step, dict)
          and step.get("Status") != _TASK_STEP_COMPLETED
     ]
     if not unfinished:
          return None
     return min(unfinished, key=lambda step: step.get("StepNumber", 0))


def _in_progress_step_for_user(steps, uid):
     # (Function meaning): Look through a task's steps and return the one that is BOTH already marked "in_progress" AND assigned to this user; if more than one matches (which should not normally happen) pick the lowest StepNumber, and if none match return None so the task is skipped.
     # (External references): Called by [get_my_client_tasks] below; this is the rule that makes the client task list show only steps that are actively in progress for the signed-in user, never "not_started" ones.
     if not isinstance(steps, list):
          return None
     mine_in_progress = [
          step
          for step in steps
          if isinstance(step, dict)
          and step.get("Status") == _TASK_STEP_IN_PROGRESS
          and str(step.get("AssignedToUserID", "")).strip() == uid
     ]
     if not mine_in_progress:
          return None
     return min(mine_in_progress, key=lambda step: step.get("StepNumber", 0))


@https_fn.on_request()
def get_my_client_tasks(req: https_fn.Request) -> https_fn.Response:
     """GET the signed-in user's current task steps for one client (?clientId=); firm-scoped, only steps assigned to this user."""
     # (Function meaning): Answer the browser's pre-flight permission question immediately with the CORS headers and an empty 204 body, doing no auth or database work for that probe.
     # (External references): _cors_headers_for_local_web is defined earlier in this file.
     if req.method == "OPTIONS":
          return https_fn.Response("", status=204, headers=_cors_headers_for_local_web(req))

     # (Function meaning): This endpoint only reads data, so it only accepts GET; any other verb gets a 405 "Method Not Allowed".
     if req.method != "GET":
          return _json_error(req, "Method not allowed", 405)

     # (Function meaning): Read the login token from the Authorization header and verify it is a genuine Firebase token; if it is missing or fake, refuse with 401 so the browser knows it must sign in.
     # (External references): _verify_bearer_token is defined earlier in this file.
     decoded = _verify_bearer_token(req)
     if not decoded:
          return _json_error(req, "Missing or invalid Authorization header", 401)

     # (Function meaning): Pull the user's unique id out of the verified token; without it we cannot tell which steps belong to this person, so refuse with 401.
     uid = decoded.get("uid")
     if not uid:
          return _json_error(req, "Invalid token payload", 401)

     # (Function meaning): Read which client's tasks the browser is asking for from the URL query string (?clientId=...) and trim spaces; if it is empty we cannot filter, so return a 400 "Bad Request".
     client_id = str(req.args.get("clientId", "")).strip()
     if not client_id:
          return _json_error(req, "clientId is required", 400)

     # (Function meaning): Look up this user's profile by uid and read only their firmId, because every task must be checked against the firm the user belongs to.
     # (External references): _mongodb_users_collection stores profiles keyed by uid in [save_user_profile] above.
     try:
          users = _mongodb_users_collection()
          user_doc = users.find_one({"_id": uid}, {"firmId": 1})
     except Exception:
          return _json_error(req, "Could not read user profile from database", 503)

     # (Function meaning): If there is no profile, or the profile has no firmId, we cannot safely scope tasks to a firm, so return 404/403 accordingly.
     if not user_doc:
          return _json_error(req, "User profile not found", 404)
     user_firm_id = str(user_doc.get("firmId", "")).strip()
     if not user_firm_id:
          return _json_error(req, "User profile has no firmId", 403)

     # (Function meaning): Ask the Task collection for every task that belongs to this firm AND this client AND is not already finished overall — these are the only tasks that could still have work for the user.
     # (External references): _mongodb_tasks_collection is defined near the top of this file; the field names FirmID, ClientID, OverallStatus match the stored task document shape.
     try:
          tasks_col = _mongodb_tasks_collection()
          task_docs = list(
               tasks_col.find(
                    {
                         "FirmID": user_firm_id,
                         "ClientID": client_id,
                         "OverallStatus": {"$ne": _TASK_OVERALL_COMPLETED},
                    }
               )
          )
     except Exception:
          return _json_error(req, "Could not read tasks from database", 503)

     now = datetime.now(timezone.utc)
     rows = []
     # (Function meaning): Go through each task one at a time and only keep the step that is currently in_progress AND belongs to this user; everything else is skipped.
     for task in task_docs:
          # (Function meaning): Find this user's in_progress step on the task; if there is none (the step is still not_started, is someone else's, or the task is between steps), skip this task entirely so only active work shows.
          active_step = _in_progress_step_for_user(task.get("Steps"), uid)
          if not active_step:
               continue

          # (Function meaning): Read when this in_progress step started so the days-in-step counter has an anchor; if it is somehow missing, fall back to "right now".
          started_at = active_step.get("StartedAt")

          # (Function meaning): If an already-in_progress step is missing its StartedAt (for example it was switched on directly in the database), stamp it now so the live counter is consistent — we only fill the missing time, we never change the status here.
          if not started_at:
               started_at = now
               try:
                    tasks_col.update_one(
                         {
                              "TaskID": task.get("TaskID"),
                              "Steps.StepID": active_step.get("StepID"),
                         },
                         {
                              "$set": {
                                   "Steps.$.StartedAt": now,
                                   "UpdatedAt": now,
                              }
                         },
                    )
               except Exception:
                    # (Function meaning): If stamping the start time fails we still show the row using "now" — a missing stamp should not hide the user's work.
                    pass

          # (Function meaning): Build one clean row for the browser, converting any date objects to text so json.dumps can send them; this is the exact shape [taskfetch.js] expects.
          rows.append(
               {
                    "taskId": task.get("TaskID"),
                    "stepId": active_step.get("StepID"),
                    "stepNumber": active_step.get("StepNumber"),
                    "title": task.get("TaskName"),
                    "stepTitle": active_step.get("StepTitle"),
                    # (Function meaning): Read the task's urgency from "TaskPriority" (the real field name in the stored document); fall back to "Priority" just in case an older document used that spelling, so the badge shows a value either way.
                    "priority": task.get("TaskPriority") or task.get("Priority"),
                    "assignedDate": _to_iso(started_at),
                    "dueDate": _to_iso(active_step.get("DueDate")),
               }
          )

     # (Function meaning): Send the collected rows back wrapped in { "tasks": [...] } as JSON, with the CORS headers so the browser accepts the response.
     return https_fn.Response(
          json.dumps({"tasks": rows}, indent=2),
          mimetype="application/json",
          headers=_cors_headers_for_local_web(req),
     )


@https_fn.on_request()
def complete_task_step(req: https_fn.Request) -> https_fn.Response:
     """POST { taskId, stepId } to mark the user's current step complete, advance to the next step, and finish the task when all steps are done."""
     cors = _cors_headers_for_local_web(req)
     # (Function meaning): Reply to the browser's pre-flight permission probe right away with CORS headers and an empty 204 body.
     if req.method == "OPTIONS":
          return https_fn.Response("", status=204, headers=cors)

     # (Function meaning): This endpoint changes data, so it only accepts POST; any other verb gets a 405 "Method Not Allowed".
     if req.method != "POST":
          return _json_error(req, "Method not allowed", 405)

     # (Function meaning): Verify the Firebase login token and refuse with 401 if it is missing or invalid.
     decoded = _verify_bearer_token(req)
     if not decoded:
          return _json_error(req, "Missing or invalid Authorization header", 401)

     # (Function meaning): Read the user's unique id from the token; without it we cannot prove the step is theirs, so refuse with 401.
     uid = decoded.get("uid")
     if not uid:
          return _json_error(req, "Invalid token payload", 401)

     # (Function meaning): Read the JSON body the browser sent; if it is not an object, the request is malformed, so return 400.
     body = req.get_json(silent=True)
     if not isinstance(body, dict):
          return _json_error(req, "Expected JSON body", 400)

     # (Function meaning): Pull the two ids that say which task and which step to complete, trimming spaces; both are required, so return 400 if either is empty.
     task_id = str(body.get("taskId", "")).strip()
     step_id = str(body.get("stepId", "")).strip()
     if not task_id or not step_id:
          return _json_error(req, "taskId and stepId are required", 400)

     # (Function meaning): Read this user's firmId from their profile so we can confirm the task belongs to their firm before changing anything.
     try:
          users = _mongodb_users_collection()
          user_doc = users.find_one({"_id": uid}, {"firmId": 1})
     except Exception:
          return _json_error(req, "Could not read user profile from database", 503)

     if not user_doc:
          return _json_error(req, "User profile not found", 404)
     user_firm_id = str(user_doc.get("firmId", "")).strip()
     if not user_firm_id:
          return _json_error(req, "User profile has no firmId", 403)

     # (Function meaning): Load the one task that matches both the requested TaskID and this user's firm; scoping by firm stops anyone editing another firm's task.
     try:
          tasks_col = _mongodb_tasks_collection()
          task = tasks_col.find_one({"TaskID": task_id, "FirmID": user_firm_id})
     except Exception:
          return _json_error(req, "Could not read task from database", 503)

     if not task:
          return _json_error(req, "Task not found", 404)

     # (Function meaning): Work out which step is currently active for this task; if none is active the task is already finished, so there is nothing to complete (409 "Conflict").
     steps = task.get("Steps")
     active_step = _current_active_step(steps)
     if not active_step:
          return _json_error(req, "Task has no active step to complete", 409)

     # (Function meaning): Guard against completing the wrong step: the step the browser named must be the one that is actually active right now, otherwise refuse with 409 so steps cannot be skipped or completed out of order.
     if str(active_step.get("StepID", "")).strip() != step_id:
          return _json_error(req, "This step is not the current active step", 409)

     # (Function meaning): Only the person the step is assigned to may complete it; if the active step belongs to someone else, refuse with 403 "Forbidden".
     if str(active_step.get("AssignedToUserID", "")).strip() != uid:
          return _json_error(req, "Step is not assigned to you", 403)

     now = datetime.now(timezone.utc)

     # (Function meaning): Read the running tally of finished steps (default 0 if missing) and add one for the step we are completing now.
     try:
          steps_completed = int(task.get("StepsCompleted", 0) or 0)
     except (TypeError, ValueError):
          steps_completed = 0
     new_steps_completed = steps_completed + 1

     # (Function meaning): Read the total number of steps; if it is missing or unreadable, fall back to counting the Steps list so the "all done?" check still works.
     try:
          steps_total = int(task.get("StepsTotal", 0) or 0)
     except (TypeError, ValueError):
          steps_total = 0
     if steps_total <= 0:
          steps_total = len(steps) if isinstance(steps, list) else new_steps_completed

     # (Function meaning): Stamp the finished step as completed, record the exact finish time, and record which user finished it; also bump the task's last-updated time.
     set_fields = {
          "Steps.$[cur].Status": _TASK_STEP_COMPLETED,
          "Steps.$[cur].CompletedAt": now,
          "Steps.$[cur].CompletedByUserID": uid,
          "UpdatedAt": now,
     }
     # (Function meaning): Start the list of "which array element does each $[name] mean" rules with the rule that "cur" is the step we just completed (matched by its StepID).
     array_filters = [{"cur.StepID": step_id}]

     # (Function meaning): Look for the very next step by StepNumber (the smallest StepNumber larger than the one we just finished) so we can hand the baton to whoever is already assigned to it.
     current_step_number = active_step.get("StepNumber", 0)
     next_step = None
     if isinstance(steps, list):
          later_steps = [
               step
               for step in steps
               if isinstance(step, dict)
               and step.get("StepNumber", 0) > current_step_number
          ]
          if later_steps:
               next_step = min(later_steps, key=lambda step: step.get("StepNumber", 0))

     # (Function meaning): If there is a next step, flip it to in_progress and stamp its StartedAt to now so the next person's days-in-step counter starts here; the assignee already lives on the step, so we leave it alone.
     if next_step is not None:
          set_fields["Steps.$[nxt].Status"] = _TASK_STEP_IN_PROGRESS
          set_fields["Steps.$[nxt].StartedAt"] = now
          array_filters.append({"nxt.StepID": next_step.get("StepID")})

     # (Function meaning): If finishing this step means every step is now done, mark the whole task completed so it drops out of everyone's active lists.
     if new_steps_completed >= steps_total:
          set_fields["OverallStatus"] = _TASK_OVERALL_COMPLETED

     # (Function meaning): Apply all the changes in one database write: $set updates the named fields, $inc adds 1 to StepsCompleted, and array_filters tells MongoDB exactly which steps "cur" and "nxt" point to.
     try:
          tasks_col.update_one(
               {"TaskID": task_id, "FirmID": user_firm_id},
               {
                    "$set": set_fields,
                    "$inc": {"StepsCompleted": 1},
               },
               array_filters=array_filters,
          )
     except Exception:
          return _json_error(req, "Could not update task in database", 503)

     # (Function meaning): Tell the browser it worked and report the new counts and whether the task is now fully complete, so the UI can refresh and the user can see progress.
     return https_fn.Response(
          json.dumps(
               {
                    "ok": True,
                    "stepsCompleted": new_steps_completed,
                    "stepsTotal": steps_total,
                    "overallCompleted": new_steps_completed >= steps_total,
               }
          ),
          status=200,
          mimetype="application/json",
          headers=cors,
     )


def _format_template_steps(raw_steps) -> list:
     # (Function meaning): Take the raw `Steps` array from a TaskTemplate MongoDB document and return a cleaned list where each step only keeps the six fields the frontend needs, with safe string/int types — shared by [get_task_template] and [get_firm_task_types] so both endpoints return steps in the same shape.
     if not isinstance(raw_steps, list):
          return []
     return [
          {
               "StepID":          str(step.get("StepID") or ""),
               "StepNumber":      int(step.get("StepNumber") or 0),
               "StepTitle":       str(step.get("StepTitle") or ""),
               "Reason":          str(step.get("Reason") or ""),
               "NeededInformation": [str(item) for item in (step.get("NeededInformation") or [])],
               "TeamResponsible": str(step.get("TeamResponsible") or ""),
               "Notes":           str(step.get("Notes") or ""),
          }
          for step in raw_steps
          if isinstance(step, dict)
     ]


@https_fn.on_request()
def get_task_template(req: https_fn.Request) -> https_fn.Response:
     """GET the steps for a task template by name; returns `{ steps: [{StepID, StepNumber, StepTitle, Reason, NeededInformation, TeamResponsible, Notes}, ...] }`. Returns `{ steps: [] }` when no matching template exists."""
     # (Function meaning): If the browser sends a pre-flight OPTIONS request (asking "am I allowed to talk to you?"), reply immediately with the CORS permission headers and an empty 204 body — no DB work needed.
     if req.method == "OPTIONS":
          return https_fn.Response("", status=204, headers=_cors_headers_for_local_web(req))

     # (Function meaning): This endpoint only answers GET requests; anything else (POST, PUT, DELETE, etc.) gets a 405 "Method Not Allowed" error back to the caller.
     if req.method != "GET":
          return _json_error(req, "Method not allowed", 405)

     # (Function meaning): Read the `taskName` query parameter from the URL (e.g. `?taskName=Client+Onboarding`); if it is missing or blank, return an empty steps list right away — there is nothing to look up.
     task_name = (req.args.get("taskName") or "").strip()
     if not task_name:
          return https_fn.Response(
               json.dumps({"steps": []}),
               mimetype="application/json",
               headers=_cors_headers_for_local_web(req),
          )

     # (Function meaning): Open the TaskTemplate collection and search for the one document whose `TaskName` field exactly matches what the frontend sent; `find_one` returns the document if found, or `None` if there is no match.
     try:
          col = _mongodb_task_templates_collection()
          doc = col.find_one({"TaskName": task_name}, {"_id": 0, "Steps": 1})
     except Exception:
          return _json_error(req, "Could not read task template from database", 503)

     # (Function meaning): If no matching template was found, return an empty steps list — not an error, because many task types simply do not have a template yet.
     if not doc:
          return https_fn.Response(
               json.dumps({"steps": []}),
               mimetype="application/json",
               headers=_cors_headers_for_local_web(req),
          )

     # (Function meaning): Pull the `Steps` array out of the document and run it through the shared formatter so the response matches what [get_firm_task_types] embeds on each sidebar item.
     steps = _format_template_steps(doc.get("Steps"))

     # (Function meaning): Wrap the cleaned steps list in a `{"steps": [...]}` object and send it back as JSON — this exact shape is what `fetchTaskTemplate` in [taskTypeFetch.js] expects when it reads `data.steps`.
     # (External references): Frontend mapping in [src/unAuth/Component/API/taskTypeFetch.js] reads `data.steps` and passes the array to [TaskEdit.js] → [OutputArea.js].
     return https_fn.Response(
          json.dumps({"steps": steps}, indent=2),
          mimetype="application/json",
          headers=_cors_headers_for_local_web(req),
     )


@https_fn.on_request()
def get_firm_task_types(req: https_fn.Request) -> https_fn.Response:
     """GET all task templates from MongoDB; returns `{ firmTaskTypes: [{id, label, detail, category, steps}, ...] }` where each entry is one document from User.TaskTemplate."""
     # (Function meaning): If the browser sends a pre-flight OPTIONS request (asking "am I allowed to talk to you?"), reply immediately with the CORS permission headers and an empty 204 body — no DB work needed.
     if req.method == "OPTIONS":
          return https_fn.Response("", status=204, headers=_cors_headers_for_local_web(req))

     # (Function meaning): This endpoint only answers GET requests; anything else (POST, PUT, DELETE, etc.) gets a 405 "Method Not Allowed" error back to the caller.
     if req.method != "GET":
          return _json_error(req, "Method not allowed", 405)

     # (Function meaning): Open the TaskTemplate collection and fetch every document, pulling only the three fields we need so MongoDB sends less data over the wire; the internal `_id` field is excluded to keep the JSON clean.
     # (External references): `_mongodb_task_templates_collection` is defined earlier in this file and connects to the User.TaskTemplate collection.
     try:
          col = _mongodb_task_templates_collection()
          docs = list(col.find({}, {"_id": 0, "TaskName": 1, "TaskCategory": 1, "Steps": 1}))
     except Exception:
          return _json_error(req, "Could not read task templates from database", 503)

     # (Function meaning): Turn each MongoDB document into a sidebar card object — `id` and `label` come from `TaskName`, `category` from `TaskCategory` (slugified to lowercase-hyphen so it matches filter ids), `detail` shows the step count, and `steps` carries the full formatted step list so [LandingPage.js] can pass everything to [TaskEdit.js] in one startup fetch.
     # (External references): Frontend mapping in [src/unAuth/Component/API/taskTypeFetch.js] reads `data.firmTaskTypes` and maps each item to `{ id, label, detail, category, steps }`.
     firm_task_types = []
     for doc in docs:
          task_name = str(doc.get("TaskName") or "").strip()
          if not task_name:
               continue
          formatted_steps = _format_template_steps(doc.get("Steps"))
          step_count = len(formatted_steps)
          firm_task_types.append({
               "id":       task_name,
               "label":    task_name,
               "detail":   f"{step_count} step{'s' if step_count != 1 else ''}",
               "category": str(doc.get("TaskCategory") or "").strip().lower().replace(" ", "-"),
               "steps":    formatted_steps,
          })

     # (Function meaning): Derive the unique category list from the same docs already in memory — walk through the raw documents so we keep the original display label (before slugification); use an ordered dict keyed on the slug so each category appears only once; sort alphabetically by label so the dropdown is always in a predictable order.
     seen_slugs = {}
     for doc in docs:
          original = str(doc.get("TaskCategory") or "").strip()
          if not original:
               continue
          slug = original.lower().replace(" ", "-")
          if slug not in seen_slugs:
               seen_slugs[slug] = original
     task_categories = sorted(
          [{"id": slug, "label": label} for slug, label in seen_slugs.items()],
          key=lambda x: x["label"].lower(),
     )

     # (Function meaning): Return both `firmTaskTypes` (sidebar cards) and `taskCategories` (filter dropdown options) in a single JSON response — `fetchFirmTaskTypes` in [taskTypeFetch.js] reads both keys and passes them separately to [LandingPage.js] so only one network call is needed at startup instead of two.
     # (External references): Frontend mapping in [src/unAuth/Component/API/taskTypeFetch.js] reads `data.firmTaskTypes` and `data.taskCategories`.
     return https_fn.Response(
          json.dumps({"firmTaskTypes": firm_task_types, "taskCategories": task_categories}, indent=2),
          mimetype="application/json",
          headers=_cors_headers_for_local_web(req),
     )