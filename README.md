# FNFF character sheet (fnff-sheet)

A character sheet and combat helper for Friday Night Firefight, for a small group. The site is static on GitHub Pages;
characters are shared through a small AWS API. Players sign in with Google and only emails on a private list get in.

- `app/` the site: Svelte 5 + Vite + TypeScript
- `lambda/` the API
- `terraform/` the AWS resources
- `tools/` builds the rules text from private book notes (kept out of the repo)
