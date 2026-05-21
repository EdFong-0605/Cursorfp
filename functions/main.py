# Welcome to Cloud Functions for Firebase for Python!
# To get started, simply uncomment the below code or create your own.
# Deploy with `firebase deploy`

from firebase_functions import https_fn
from firebase_functions.options import set_global_options
from firebase_admin import auth as firebase_auth, initialize_app
import json
import os
from datetime import datetime, timezone

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


_ALLOWED_LOGIN_EVENT_TYPES = frozenset({"sign_in", "sign_up", "inactivity_logout"})
_ALLOWED_LOGIN_METHODS = frozenset({"email", "google", "unknown"})


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
     """HTTP JSON used by the React app (`fetchDummyClientsFromMainPy`); returns every dummy client row (no limit)."""
     if req.method == "OPTIONS":
          return https_fn.Response("", status=204, headers=_cors_headers_for_local_web(req))

     dummy_clients = [
          {
               "SystemID": "SYS-1001",
               "FirstName": "John",
               "LastName": "Johnson",
               "Age": 42,
               "Sex": "Male",
               "HeadOfHousehold": True,
               "AUM": 2_340_000,
               "StartDate": "2019-03-15",
          },
          {
               "SystemID": "SYS-1002",
               "FirstName": "Ariana",
               "LastName": "Lopez",
               "Age": 34,
               "Sex": "Female",
               "HeadOfHousehold": False,
               "AUM": 890_500,
               "StartDate": "2021-07-22",
          },
          {
               "SystemID": "SYS-1003",
               "FirstName": "daniel",
               "LastName": "Kim",
               "Age": 28,
               "Sex": "Male",
               "HeadOfHousehold": False,
               "AUM": 456_789,
               "StartDate": "2023-01-10",
          },
          {
               "SystemID": "SYS-1004",
               "FirstName": "Brian",
               "LastName": "Johnson",
               "Age": 91,
               "Sex": "Male",
               "HeadOfHousehold": True,
               "AUM": 5_120_000,
               "StartDate": "2016-11-01",
          },
     ]

     return https_fn.Response(
          json.dumps({"clients": dummy_clients}, indent=2),
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
     role = str(body.get("role", "")).strip()
     if not first_name or not last_name or not role:
          return _json_error(
               req, "firstName, lastName, and role are required", 400
          )

     users = _mongodb_users_collection()

     now = datetime.now(timezone.utc)
     try:
          users.update_one(
               {"_id": uid},
               {
                    "$set": {
                         "uid": uid,
                         "firstName": first_name,
                         "lastName": last_name,
                         "role": role,
                         "email": email,
                    },
                    "$setOnInsert": {"createdAt": now},
               },
               upsert=True,
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