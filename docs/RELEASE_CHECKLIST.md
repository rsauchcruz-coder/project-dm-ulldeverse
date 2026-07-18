# Public release checklist

Run this checklist from a fresh checkout before publishing the submission.

## Repository

- [ ] `git status --short` is empty.
- [ ] No `.env`, `config.js`, local saves, logs, conversations or reference photographs are tracked.
- [ ] `npm run qa:repo` reports `APTO`.
- [ ] `npm audit --omit=dev` reports no known vulnerabilities.

## Reproducibility

- [ ] Install with `npm ci`.
- [ ] Run `npm test`.
- [ ] Start with `npm start`.
- [ ] Open `http://localhost:3000` without configuring an API key.
- [ ] Complete at least one guided route and restart the adventure once.

## Public presentation

- [ ] Player-facing product name is **ULLDE:VERSE**.
- [ ] Factory/technology name is **Project DM**.
- [ ] Submitted world is **El testigo de Ulldecona**.
- [ ] All published character names and portraits are fictional.
- [ ] README, architecture, AI use, asset provenance and video evidence links are current.

## Delivery

- [ ] Create the public repository from this clean `main`.
- [ ] Add the final YouTube URL and submission URL.
- [ ] Tag the exact evaluated commit.
