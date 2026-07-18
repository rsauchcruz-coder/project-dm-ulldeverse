# Public release checklist

Run this checklist from a fresh checkout before publishing the submission.

## Repository

- [x] `git status --short` was empty before the documentation release.
- [x] No `.env`, `config.js`, local saves, logs, conversations or reference photographs are tracked.
- [x] `npm run qa:repo` reports `APTO`.
- [x] `npm audit --omit=dev` reports no known vulnerabilities.

## Reproducibility

- [x] Install with `npm ci`.
- [x] Run `npm test`.
- [x] Build the hosted artifact with `npm run build`.
- [x] Start with `npm start`.
- [x] Open `http://localhost:3000` without configuring an API key.
- [x] Complete at least one guided route and restart the adventure once.
- [x] Verify the public demo without authentication in a mobile viewport.

## Public presentation

- [x] Player-facing product name is **ULLDE:VERSE**.
- [x] Factory/technology name is **Project DM**.
- [x] Submitted world is **El testigo de Ulldecona**.
- [x] All published character names and portraits are fictional.
- [x] README, architecture, AI use, asset provenance and video evidence links are current.

## Delivery

- [x] Create the public repository from this clean `main`.
- [x] Publish a no-login public demo.
- [x] Prepare final English Devpost copy and judge testing instructions.
- [ ] Record and upload the under-three-minute public YouTube video.
- [ ] Add the primary `/feedback` Codex Session ID to Devpost.
- [ ] Add the final YouTube URL and submission URL.
- [ ] Tag the exact evaluated commit.
