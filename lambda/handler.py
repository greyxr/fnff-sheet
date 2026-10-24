"""FNFF API behind a Lambda Function URL (every route needs the password in the authorization header).
  GET    /characters       200 [{"id", "data"}]
  PUT    /characters/{id}  204; {id} is a client-chosen lowercase UUID; body: object with charName (1-60 chars) and string charCampaign ("" = none)
  DELETE /characters/{id}  204
  GET    /campaigns        200 ["name", ...]
  POST   /campaigns        {"name"} appends; 200 with the list, 409 if it exists
  PUT    /campaigns        body is the whole list (unique names, 1-60 chars); 200 with it
  GET    /ruleset          200 ruleset.json (404 if missing)
S3: characters/{id}.json, campaigns.json (missing = []), ruleset.json (uploaded separately).
"""
import hmac
import json
import os
import re
from urllib.parse import unquote

import boto3

BUCKET = os.environ["BUCKET"]
s3 = boto3.client("s3")
ssm = boto3.client("ssm")
password = ssm.get_parameter(Name=os.environ["PASSWORD_PARAM"], WithDecryption=True)["Parameter"]["Value"]

PREFIX = "characters/"
CAMPAIGNS = "campaigns.json"
ID = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")
MAX_NAME = 60
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


def read_campaigns():
    try:
        return json.loads(s3.get_object(Bucket=BUCKET, Key=CAMPAIGNS)["Body"].read())
    except s3.exceptions.NoSuchKey:
        return []


def write_campaigns(names):
    s3.put_object(Bucket=BUCKET, Key=CAMPAIGNS, Body=json.dumps(names))
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


METHODS = {"GET": get, "POST": post, "PUT": put, "DELETE": delete}


def handler(event, context):
    supplied = (event.get("headers") or {}).get("authorization", "")
    if not password or not hmac.compare_digest(supplied.encode(), password.encode()):   # empty password never authorizes
        return error(401, "unauthorized")
    method = METHODS.get(event["requestContext"]["http"]["method"])
    if not method:
        return error(405, "method not allowed")
    # split before decoding so an encoded slash can't add path segments
    return method([unquote(p) for p in event["rawPath"].strip("/").split("/")], event)
