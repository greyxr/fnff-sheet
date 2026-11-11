"""FNFF API behind an API Gateway HTTP API. The gateway checks the Google ID token; this checks the account is approved.
  GET    /me               200 {"email", "status": approved|pending|denied|none, "admin"}
  POST   /access-request   200 like /me; adds the caller as pending (429 when too many are waiting)
  GET    /users            admin only: 200 [{"sub", "email", "name", "status"}]
  PUT    /users/{sub}      admin only: body {"status": approved|denied}; 200 with the list
  The routes below need an approved account (the admin always is).
  GET    /characters       200 [{"id", "data"}]
  PUT    /characters/{id}  204; {id} is a client-chosen lowercase UUID; body: object with charName (1-60 chars) and string charCampaign ("" = none)
  DELETE /characters/{id}  204
  GET    /campaigns        200 ["name", ...]
  POST   /campaigns        {"name"} appends; 200 with the list, 409 if it exists
  PUT    /campaigns        body is the whole list (unique names, 1-60 chars); 200 with it
  GET    /ruleset          200 ruleset.json (404 if missing)
S3: users.json ({sub: {email, name, status}}), characters/{id}.json, campaigns.json (missing = []), ruleset.json (uploaded separately).
"""
import json
import os
import re
from urllib.parse import unquote

import boto3

BUCKET = os.environ["BUCKET"]
ADMIN = os.environ["ADMIN_EMAIL"].lower()
s3 = boto3.client("s3")

PREFIX = "characters/"
CAMPAIGNS = "campaigns.json"
USERS = "users.json"
ID = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")
MAX_NAME = 60
MAX_BODY = 100_000
MAX_PENDING = 20
LIMIT = f"of at most {MAX_NAME} characters"


def respond(status, body=None):
    out = {"statusCode": status, "headers": {"Content-Type": "application/json"}}
    if body is not None:
        out["body"] = body if isinstance(body, str) else json.dumps(body)
    return out


def error(status, message):
    return respond(status, {"error": message})


def valid_name(name):
    return isinstance(name, str) and 0 < len(name) <= MAX_NAME


def is_character(parts):
    return len(parts) == 2 and parts[0] == "characters" and ID.fullmatch(parts[1])


def list_characters():
    chars = []
    for page in s3.get_paginator("list_objects_v2").paginate(Bucket=BUCKET, Prefix=PREFIX):
        for obj in page.get("Contents", []):
            data = json.loads(s3.get_object(Bucket=BUCKET, Key=obj["Key"])["Body"].read())
            chars.append({"id": obj["Key"][len(PREFIX):-len(".json")], "data": data})
    return respond(200, chars)


def read_json(key, default):
    try:
        return json.loads(s3.get_object(Bucket=BUCKET, Key=key)["Body"].read())
    except s3.exceptions.NoSuchKey:
        return default


def write_json(key, value):
    s3.put_object(Bucket=BUCKET, Key=key, Body=json.dumps(value))


def read_campaigns():
    return read_json(CAMPAIGNS, [])


def write_campaigns(names):
    write_json(CAMPAIGNS, names)
    return respond(200, names)


def get_ruleset():
    try:
        return respond(200, s3.get_object(Bucket=BUCKET, Key="ruleset.json")["Body"].read().decode())
    except s3.exceptions.NoSuchKey:
        return error(404, "ruleset.json not found in the bucket")


def get(parts, event):
    routes = {("characters",): list_characters, ("ruleset",): get_ruleset}
    if tuple(parts) in routes:
        return routes[tuple(parts)]()
    return respond(200, read_campaigns()) if parts == ["campaigns"] else error(404, "no such route")


def post(parts, event):
    if parts != ["campaigns"]:
        return error(404, "no such route")
    body, err = body_json(event)
    if err:
        return err
    name = body.get("name") if isinstance(body, dict) else None
    if not valid_name(name):
        return error(400, f"name must be a non-empty string {LIMIT}")
    names = read_campaigns()
    return error(409, "that campaign already exists") if name in names else write_campaigns(names + [name])


def body_json(event):
    try:
        return json.loads(event.get("body") or ""), None
    except ValueError:
        return None, error(400, "body is not valid JSON")


def put(parts, event):
    if not is_character(parts) and parts != ["campaigns"]:
        return error(404, "no such route")
    body, err = body_json(event)
    if err:
        return err
    if parts == ["campaigns"]:
        if not isinstance(body, list) or not all(valid_name(n) for n in body) or len(set(body)) != len(body):
            return error(400, f"body must be a list of unique, non-empty strings {LIMIT}")
        return write_campaigns(body)
    if not isinstance(body, dict):
        return error(400, "body must be a JSON object")
    if not valid_name(body.get("charName")):
        return error(400, f"charName must be a non-empty string {LIMIT}")
    if not isinstance(body.get("charCampaign"), str):
        return error(400, "charCampaign must be a string (empty for no campaign)")
    s3.put_object(Bucket=BUCKET, Key=f"{PREFIX}{parts[1]}.json", Body=json.dumps(body))
    return respond(204)


def delete(parts, event):
    if not is_character(parts):
        return error(404, "no such route")
    s3.delete_object(Bucket=BUCKET, Key=f"{PREFIX}{parts[1]}.json")
    return respond(204)


def user_list(users):
    return respond(200, [{"sub": sub, **user} for sub, user in users.items()])


def account(method, parts, event, claims):
    email, sub = claims["email"].lower(), claims["sub"]
    admin = email == ADMIN
    users = read_json(USERS, {})
    status = "approved" if admin else users.get(sub, {}).get("status", "none")
    me = {"email": email, "status": status, "admin": admin}
    route = (method, *parts)
    if route == ("GET", "me"):
        return respond(200, me)
    if route == ("POST", "access-request"):
        if status == "none":
            if sum(u["status"] == "pending" for u in users.values()) >= MAX_PENDING:
                return error(429, "too many requests are waiting; try again later")
            users[sub] = {"email": email, "name": str(claims.get("name", ""))[:MAX_NAME], "status": "pending"}
            write_json(USERS, users)
            me["status"] = "pending"
        return respond(200, me)
    if parts[0] == "users":
        if not admin:
            return error(403, "admins only")
        if route == ("GET", "users"):
            return user_list(users)
        if method != "PUT" or len(parts) != 2 or parts[1] not in users:
            return error(404, "no such route")
        body, err = body_json(event)
        if err:
            return err
        if not isinstance(body, dict) or body.get("status") not in ("approved", "denied"):
            return error(400, "status must be approved or denied")
        users[parts[1]]["status"] = body["status"]
        write_json(USERS, users)
        return user_list(users)
    return None if status == "approved" else error(403, "this account is not approved")


METHODS = {"GET": get, "POST": post, "PUT": put, "DELETE": delete}


def handler(event, context):
    claims = event["requestContext"]["authorizer"]["jwt"]["claims"]
    if str(claims.get("email_verified")).lower() != "true":
        return error(403, "that Google account's email is not verified")
    if len(event.get("body") or "") > MAX_BODY:
        return error(413, "body too large")
    name = event["requestContext"]["http"]["method"]
    method = METHODS.get(name)
    if not method:
        return error(405, "method not allowed")
    # split before decoding so an encoded slash can't add path segments
    parts = [unquote(p) for p in event["rawPath"].strip("/").split("/")]
    return account(name, parts, event, claims) or method(parts, event)
