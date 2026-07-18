# Build Week evidence

This document maps the central claims of the submission to reproducible artifacts.

| Claim | Evidence |
| --- | --- |
| Judges can try the product immediately | [Public ULLDE:VERSE demo](https://project-dm-ulldeverse.rsauchcruz.chatgpt.site), with no login or API key |
| The project produces structured worlds | Seed, source world and compiler under `fabrica/` and `scripts/compile/` |
| Choices affect later state | `qa:causal` and `qa:resources` |
| Endings are reachable | `qa:agency` and `qa:runtime` |
| The world is playable without an API | `qa:http` starts the server and executes declared routes in guided mode |
| The hosted build matches the canonical world | `qa:static` compares the public artifact and tests its Worker package |
| Presentation is smartphone-first | `qa:mobile` plus the responsive dossier UI |
| Visuals are data-driven | Source and runtime visual manifests, plus `media:qa` and `media:coverage` |
| The system is reproducible | `npm test` runs the complete submission suite |
| Build Week work is distinguishable | Dated commit trail plus `docs/CONTEST_READINESS.md` |

## Expected verification profile

The submitted world currently contains:

- 28 nodes.
- 88 actions.
- 9 reachable endings.
- 1,143 valid routes.
- 37 published visual assets.

The commands are available separately for diagnosis:

```bash
npm run qa:world
npm run qa:agency
npm run qa:resources
npm run qa:causal
npm run qa:runtime
npm run qa:experience
npm run qa:mobile
npm run media:qa
npm run media:coverage
npm run qa:http
npm run qa:static
```

`npm test` is the release gate and stops at the first failed check.

## Codex and GPT-5.6 evidence

The primary evidence is the `/feedback` Session ID from the Director 2 Codex task in which the core Build Week extension was implemented. The entrant also retains private captures showing:

- the Codex task title and timestamped implementation result;
- GPT-5.6 selected in Codex;
- the Proyecto DM ChatGPT project and its dated GPT-5.6 work;
- the concrete repository outputs associated with those discussions.

Only the primary Codex Session ID belongs in the required Devpost field. Screenshots are supporting evidence and must be cropped to avoid private conversations, personal paths, temporary credentials and usage information.

## Dated public extension trail

| Commit | Build Week result |
| --- | --- |
| `91c339e` | Curated submission baseline and reproducible vertical-slice repository |
| `4a071fb` | Contest interface, identity and privacy-facing content polish |
| `b9a1002` | Explicit choice feedback and logo spacing correction |
| `63972b8` | Repository hygiene, security policy and public-release gate |
| `43af5cb` | Browser-only public guided runtime and deployment QA |
| `532b3b1` | Static production artifact |
| `b4d448e` | Production Worker package |

The public repository is deliberately smaller than the private workshop. Excluded material is not required to run, test or judge the submission.
