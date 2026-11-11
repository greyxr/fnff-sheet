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
os.environ.update(BUCKET="bucket", ADMIN_EMAIL="GM@example.com")
import handler  # noqa: E402

GM = {"sub": "1", "email": "gm@example.com", "email_verified": "true", "name": "GM"}
KAI = {"sub": "2", "email": "kai@example.com", "email_verified": "true", "name": "Kai"}


def call(claims, method, path, body=None):
    event = {
        "requestContext": {"authorizer": {"jwt": {"claims": claims}}, "http": {"method": method}},
        "rawPath": path,
        "body": None if body is None else json.dumps(body),
    }
    out = handler.handler(event, None)
    return out["statusCode"], json.loads(out["body"]) if "body" in out else None


class Accounts(unittest.TestCase):
    def setUp(self):
        fake.objects.clear()

    def test_a_new_account_is_shut_out_until_the_admin_approves_it(self):
        self.assertEqual(call(KAI, "GET", "/me"), (200, {"email": "kai@example.com", "status": "none", "admin": False}))
        self.assertEqual(call(KAI, "GET", "/campaigns")[0], 403)
        self.assertEqual(call(KAI, "POST", "/access-request")[1]["status"], "pending")
        self.assertEqual(call(KAI, "GET", "/campaigns")[0], 403)
        self.assertEqual(call(GM, "GET", "/users"), (200, [{"sub": "2", "email": "kai@example.com", "name": "Kai", "status": "pending"}]))
        self.assertEqual(call(GM, "PUT", "/users/2", {"status": "approved"})[1][0]["status"], "approved")
        self.assertEqual(call(KAI, "GET", "/campaigns"), (200, []))
        call(GM, "PUT", "/users/2", {"status": "denied"})
        self.assertEqual(call(KAI, "GET", "/campaigns")[0], 403)
        self.assertEqual(call(KAI, "POST", "/access-request")[1]["status"], "denied")

    def test_the_admin_needs_no_approval(self):
        self.assertEqual(call(GM, "GET", "/me")[1], {"email": "gm@example.com", "status": "approved", "admin": True})
        self.assertEqual(call(GM, "GET", "/campaigns"), (200, []))

    def test_only_the_admin_manages_accounts(self):
        call(KAI, "POST", "/access-request")
        self.assertEqual(call(KAI, "GET", "/users")[0], 403)
        self.assertEqual(call(KAI, "PUT", "/users/2", {"status": "approved"})[0], 403)
        self.assertEqual(call(GM, "PUT", "/users/9", {"status": "approved"})[0], 404)
        self.assertEqual(call(GM, "PUT", "/users/2", {"status": "admin"})[0], 400)

    def test_an_unverified_email_is_refused(self):
        self.assertEqual(call({**GM, "email_verified": "false"}, "GET", "/me")[0], 403)

    def test_waiting_requests_are_capped(self):
        for n in range(handler.MAX_PENDING):
            self.assertEqual(call({**KAI, "sub": f"s{n}"}, "POST", "/access-request")[0], 200)
        self.assertEqual(call(KAI, "POST", "/access-request")[0], 429)

    def test_a_large_body_is_refused(self):
        self.assertEqual(call(GM, "PUT", "/campaigns", ["x" * handler.MAX_BODY])[0], 413)


if __name__ == "__main__":
    unittest.main()
