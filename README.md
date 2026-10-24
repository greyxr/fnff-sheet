# FNFF character sheet (fnff-sheet)

A character sheet and combat helper for Friday Night Firefight, for a small group. Characters are shared through a
tiny AWS API; the site itself is static and runs on GitHub Pages.

- `app/` the site: Svelte 5 + Vite + TypeScript
- `lambda/handler.py` the API (Lambda Function URL, characters and campaigns in S3, one shared group password)
- `terraform/` the AWS resources for the API
- `tools/build_rules.py` builds the rules text, weapon list and armor list from the private book notes. The book files
  and the generated `ruleset.json` stay out of the repo (git-ignored)

## The rules engine

`app/src/core/` has no Svelte or DOM code: the game's arithmetic, damage, character loading and rules search.
**All game numbers live in `core/ruleset.ts`**, commented in book order. To fix a number, edit it there and commit;
the deploy runs the checks first, so a typo fails the build and leaves the live site as it was.
Everything else (`screens/`, `shell/`, `lib/`) is the sheet that uses it.

## Deploy

1. **AWS**, once: create the group password as a SecureString SSM parameter, then `terraform apply` in `terraform/`. Re-apply after changing `lambda/handler.py`. Add any new site address to `allowed_origins`.
2. **Rules text**: `python3 tools/build_rules.py`, then
   `aws s3 cp ~/fnff_reference/ruleset.json s3://<bucket>/ruleset.json`. Without it the Rules tab and the weapon and
   armor pickers stay empty.
3. **GitHub**: Pages source = GitHub Actions, and a repository *secret* `VITE_GROUP_API_URL` set to the Function
   URL (a secret so it stays out of the public logs). Pushing to `main` checks, tests, builds and deploys.

Players enter the group password once per browser; it is kept in `localStorage` and sent with every API call.
