# FNFF character sheet (fnff-sheet)

A character sheet and combat helper for Friday Night Firefight, for a small group. Characters are shared through a
tiny AWS API; the site itself is static and runs on GitHub Pages.

- `app/` the site: Svelte 5 + Vite + TypeScript
- `lambda/handler.py` the API (API Gateway + Lambda, characters and campaigns in S3, Google sign-in, accounts approved by the admin)
- `terraform/` the AWS resources for the API
- `tools/build_rules.py` builds the rules text, weapon list and armor list from the private book notes. The book files
  and the generated `ruleset.json` stay out of the repo (git-ignored)

## The rules engine

`app/src/core/` has no Svelte or DOM code: the game's arithmetic, damage, character loading and rules search.
**All game numbers live in `core/ruleset.ts`**, commented in book order. To fix a number, edit it there and commit;
the deploy runs the checks first, so a typo fails the build and leaves the live site as it was.
Everything else (`screens/`, `shell/`, `lib/`) is the sheet that uses it.

## Accounts

Players sign in with Google. API Gateway checks the Google token before anything reaches the Lambda, and limits the
whole API to 2 requests a second. A new account sees "Request access"; the admin (`admin_email`) approves or denies it
under **Accounts** in the header. Everyone approved shares the same characters and campaigns.

## Deploy

1. **Google**, once: in Google Cloud Console create an OAuth client ID of type *Web application*. Add the site
   (`https://<user>.github.io`) and `http://127.0.0.1:8000` as authorized JavaScript origins. There is no client secret.
2. **AWS**: `terraform apply` in `terraform/` with `bucket_name`, `google_client_id` and `admin_email` (your Google
   address, which also gets the budget alert). Re-apply after changing `lambda/handler.py`. Add any new site address to
   `allowed_origins`. `lambda_concurrency = 2` caps the Lambda further if your account's concurrency quota allows it.
3. **Rules text**: `python3 tools/build_rules.py`, then
   `aws s3 cp ~/fnff_reference/ruleset.json s3://<bucket>/ruleset.json`. Without it the Rules tab and the weapon and
   armor pickers stay empty.
4. **GitHub**: Pages source = GitHub Actions, and repository *secrets* `VITE_GROUP_API_URL` (terraform's `api_url`
   output) and `VITE_GOOGLE_CLIENT_ID`. Pushing to `master` checks, tests, builds and deploys.

Moving from the shared password: the API address changes, so update `VITE_GROUP_API_URL`; the old SSM password
parameter is no longer used and can be deleted. Characters and campaigns stay as they are.
