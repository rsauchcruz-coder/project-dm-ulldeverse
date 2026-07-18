# Build Week evidence

This document maps the central claims of the submission to reproducible artifacts.

| Claim | Evidence |
| --- | --- |
| The project produces structured worlds | Seed, source world and compiler under `fabrica/` and `scripts/compile/` |
| Choices affect later state | `qa:causal` and `qa:resources` |
| Endings are reachable | `qa:agency` and `qa:runtime` |
| The world is playable without an API | `qa:http` starts the server and executes declared routes in guided mode |
| Presentation is smartphone-first | `qa:mobile` plus the responsive dossier UI |
| Visuals are data-driven | Source and runtime visual manifests, plus `media:qa` and `media:coverage` |
| The system is reproducible | `npm test` runs the complete submission suite |

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
```

`npm test` is the release gate and stops at the first failed check.
