# OpenAI Build Week readiness

## Recommendation

**Submit.** Project DM is eligible as a meaningfully extended pre-existing project and now has a coherent, runnable vertical slice. The recommended category is **Apps for Your Life**: the primary audience is people who want a short, personal interactive story without learning role-playing systems. The world factory is the technical differentiator, not the category itself.

The submission should be presented as:

- **Project DM** — the AI-assisted, contract-driven world factory.
- **ULLDE:VERSE** — the player-facing narrative product.
- **El testigo de Ulldecona** — the working vertical slice.

## Requirement status

| Requirement | Status | Evidence |
| --- | --- | --- |
| Working project | Ready | Public demo and local guided runtime |
| Public testing access | Ready | No login, account or API key required |
| Public repository and license | Ready | GitHub repository and MIT License |
| Setup and testing instructions | Ready | `README.md`, `npm ci`, `npm test`, `npm start` |
| Codex and GPT-5.6 use | Ready, must be narrated | `docs/AI_USAGE.md`, dated commits and captured primary Codex session |
| Pre-existing versus new work | Ready | Scope below and dated Build Week commit history |
| Public YouTube demo under 3 minutes | Pending human recording/upload | Exact script in `docs/DEMO_SCRIPT.md` |
| `/feedback` Session ID | Captured by entrant | Use the primary Director 2 build session |
| English submission materials | Ready in repository | README and submission documents are in English |

## Pre-existing baseline

Before the Submission Period, the private working project already contained an experimental narrative engine, prototype worlds and an evolving collection of factory contracts. That earlier work is disclosed as the baseline and is not claimed as Build Week output.

## Meaningful Build Week extension

During the Submission Period, Codex with GPT-5.6 was used to turn that experimental baseline into the submitted product:

1. Curated a minimal, public evaluation repository instead of exposing the private workshop.
2. Established the three-level product identity: Project DM, ULLDE:VERSE and El testigo de Ulldecona.
3. Produced and verified the canonical vertical-slice chain: experience seed, authored world, compiler output and runtime artifact.
4. Reworked the mobile dossier interface, centered the sheets, simplified decision confirmation, added visible selection state and restart flow, and integrated the official logo.
5. Replaced personal names and identity-bearing portraits with fictional characters and newly generated fictional designs.
6. Added repository hygiene and security checks and removed credentials, local state, conversations, raw reference media and unrelated prototypes.
7. Added a browser-only guided runtime and deployed a public demo that requires no account, API key or server-side model call.
8. Added deployment packaging and automated QA for the public artifact.

The dated public commits beginning on 18 July 2026 preserve the final extension trail. Private timestamped Codex and ChatGPT captures support the development history without publishing conversations or personal data.

## Fit against judging criteria

### Technological implementation

Strong. The submission is a non-trivial runtime plus compiler and executable QA system. The strongest evidence is not the number of prompts but the conversion of recurring narrative failures into deterministic gates for agency, resources, causality, reachability, presentation and deployment.

### Design

Strong. The public demo is a complete mobile-first dossier experience, not a schema viewer. The naming hierarchy, fictionalized cast, coherent visuals, guided controls and restart flow now read as one product.

### Potential impact

Credible but must be stated precisely. Project DM lowers the cost of making short, coherent interactive stories for non-role-players, local culture, families, education and commissioned experiences. The demo proves the system with one historical investigation; it does not claim marketplace scale yet.

### Quality of the idea

Strong. Many narrative AI demos improvise at runtime. Project DM instead treats a world as a compiled, testable artifact while still using AI throughout production. The combination of an AI-assisted factory and a deterministic judged experience is the distinctive idea.

## Residual risks

| Risk | Response |
| --- | --- |
| Judges treat it as an old project | Lead with the Build Week before/after list and dated commits |
| Judges see only a game, not a factory | Spend roughly 40 seconds of the video on the artifact chain and QA |
| Judges see only tooling, not a product | Spend the first minute on the live player experience |
| GPT-5.6 use appears incidental | Name the concrete decisions and outputs it helped produce; briefly show the model/session capture |
| Spanish runtime creates language friction | Narrate in English and explain that visible Spanish is deliberate historical-fiction content |
| A long build recording dilutes the pitch | Keep it optional and separate from the official three-minute video |

## Go/no-go gate

Submit only after these last human-owned items are complete:

1. Record and upload the public English YouTube video.
2. Paste the primary `/feedback` Session ID into Devpost.
3. Add the YouTube and Devpost URLs to the release checklist.
4. Create a final release tag for the exact evaluated commit.
