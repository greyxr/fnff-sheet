import json
import os
import sys
import types
import unittest


class NoSuchKey(Exception):
    pass


class Body:
    def __init__(self, data):
        self.data = data

    def read(self):
        return self.data


class FakeS3:
    exceptions = types.SimpleNamespace(NoSuchKey=NoSuchKey)

    def __init__(self):
        self.objects = {}

    def get_object(self, Bucket, Key):
        if Key not in self.objects:
            raise NoSuchKey()
        return {"Body": Body(self.objects[Key].encode())}

    def put_object(self, Bucket, Key, Body):
        self.objects[Key] = Body


fake = FakeS3()
sys.modules["boto3"] = types.SimpleNamespace(client=lambda name: fake)
os.environ.update(BUCKET="bucket")
import handler  # noqa: E402

GM = {"sub": "1", "email": "GM@example.com", "email_verified": "true"}
KAI = {"sub": "2", "email": "kai@example.com", "email_verified": "true"}


def call(claims, method, path, body=None):
    event = {
        "requestContext": {"authorizer": {"jwt": {"claims": claims}}, "http": {"method": method}},
        "rawPath": path,
        "body": None if body is None else json.dumps(body),
    }
    out = handler.handler(event, None)
    return out["statusCode"], json.loads(out["body"]) if "body" in out else None


class Allowlist(unittest.TestCase):
    def setUp(self):
        fake.objects.clear()
        fake.objects["allowed.json"] = json.dumps(["gm@EXAMPLE.com"])

    def test_a_listed_email_gets_in_whatever_its_case(self):
        self.assertEqual(call(GM, "GET", "/me"), (200, {"email": "gm@example.com"}))
        self.assertEqual(call(GM, "GET", "/campaigns"), (200, []))

    def test_an_unlisted_email_is_refused_and_told_which_email_it_used(self):
        self.assertEqual(call(KAI, "GET", "/me"), (403, {"error": "kai@example.com is not on the player list; ask the GM"}))
        self.assertEqual(call(KAI, "GET", "/campaigns")[0], 403)

    def test_no_list_lets_nobody_in(self):
        del fake.objects["allowed.json"]
        self.assertEqual(call(GM, "GET", "/me")[0], 403)

    def test_an_unverified_email_is_refused(self):
        self.assertEqual(call({**GM, "email_verified": "false"}, "GET", "/me")[0], 403)

    def test_a_large_body_is_refused(self):
        self.assertEqual(call(GM, "PUT", "/campaigns", ["x" * handler.MAX_BODY])[0], 413)


if __name__ == "__main__":
    unittest.main()
