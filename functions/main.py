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
     # (External references): Uses the same MONGODB_URI and MONGODB_DATABASE env variables as [_mongodb_users_collection] and [_mongodb_firms_collection] above; callers include [on_request_example] below.
     mongo_uri = os.environ.get("MONGODB_URI")
     database_name = os.environ.get("MONGODB_DATABASE", "User")
     collection_name = os.environ.get("MONGODB_CLIENTS_COLLECTION", "Clients")
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
def on_request_example(req: https_fn.Request) -> https_fn.Response:
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