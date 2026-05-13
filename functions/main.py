# Welcome to Cloud Functions for Firebase for Python!
# To get started, simply uncomment the below code or create your own.
# Deploy with `firebase deploy`

from firebase_functions import https_fn
from firebase_functions.options import set_global_options
from firebase_admin import initialize_app, firestore
import json
import os

from pymongo import MongoClient

# For cost control, you can set the maximum number of containers that can be
# running at the same time. This helps mitigate the impact of unexpected
# traffic spikes by instead downgrading performance. This limit is a per-function
# limit. You can override the limit for each function using the max_instances
# parameter in the decorator, e.g. @https_fn.on_request(max_instances=5).
set_global_options(max_instances=10)

initialize_app()

_CORS_LOCAL = {
     "Access-Control-Allow-Origin": "http://localhost:3000",
     "Access-Control-Allow-Methods": "GET, OPTIONS",
     "Access-Control-Allow-Headers": "Content-Type",
}


@https_fn.on_request()
def on_request_example(req: https_fn.Request) -> https_fn.Response:
     if req.method == "OPTIONS":
          return https_fn.Response("", status=204, headers=_CORS_LOCAL)

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
          headers=_CORS_LOCAL,
     )


@https_fn.on_request()
def get_clients_from_db(req: https_fn.Request) -> https_fn.Response:
     db = firestore.client()
     client_docs = (
          db.collection("clients")
          .select(
               [
                    "SystemID",
                    "FirstName",
                    "LastName",
                    "Age",
                    "Sex",
                    "HeadOfHousehold",
               ]
          )
          .limit(3)
          .stream()
     )

     clients = [
          {
               "SystemID": doc.to_dict().get("SystemID"),
               "FirstName": doc.to_dict().get("FirstName"),
               "LastName": doc.to_dict().get("LastName"),
               "Age": doc.to_dict().get("Age"),
               "Sex": doc.to_dict().get("Sex"),
               "HeadOfHousehold": doc.to_dict().get("HeadOfHousehold"),
          }
          for doc in client_docs
     ]

     return https_fn.Response(
          json.dumps({"clients": clients}, indent=2),
          mimetype="application/json",
     )


@https_fn.on_request()
def get_clients_from_mongodb(req: https_fn.Request) -> https_fn.Response:
     # PyMongo read pattern (filter, projection, limit): see MongoDB PyMongo driver
     # "Find Documents" and "Specify Documents to Return" (limit / projection).
     client = MongoClient(os.environ.get("MONGODB_URI", "mongodb://127.0.0.1:27017"))
     collection = client[os.environ.get("MONGODB_DATABASE", "app")]["clients"]

     projection = {
          "_id": 0,
          "SystemID": 1,
          "FirstName": 1,
          "LastName": 1,
          "Age": 1,
          "Sex": 1,
          "HeadOfHousehold": 1,
     }

     cursor = collection.find({}, projection, limit=3)

     clients = [
          {
               "SystemID": doc.get("SystemID"),
               "FirstName": doc.get("FirstName"),
               "LastName": doc.get("LastName"),
               "Age": doc.get("Age"),
               "Sex": doc.get("Sex"),
               "HeadOfHousehold": doc.get("HeadOfHousehold"),
          }
          for doc in cursor
     ]

     return https_fn.Response(
          json.dumps({"clients": clients}, indent=2),
          mimetype="application/json",
     )