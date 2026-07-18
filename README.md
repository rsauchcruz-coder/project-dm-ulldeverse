# Project DM — The AI World Factory

Project DM is an AI-assisted factory for building small, coherent and verifiably playable narrative worlds. **ULLDE:VERSE** is its first complete vertical slice: a smartphone-first historical investigation set in Ulldecona in 1274.

The submission is not just a chatbot or a scripted demo. It separates creative intent, world architecture, playable runtime, visual assets and automated quality gates so that a world can be generated, compiled, tested and played as a reproducible artifact.

## Try the vertical slice

Requirements:

- Node.js 20 or newer.
- No API key for the default guided experience.

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) and choose **Corto guiado**.

The optional **Libre asistido** mode can use Groq, Gemini or OpenRouter credentials configured as environment variables. Copy `.env.example` only as a reference; never commit credentials.

## What is included

- One complete playable world: **El testigo de Ulldecona**.
- 28 narrative nodes and 88 concrete actions.
- 9 reachable endings.
- 1,143 verified routes through the graph.
- Explicit resource economy and causal persistence.
- 37 generated visual assets connected through a runtime manifest.
- A local guided engine that works without network access or model calls.
- Automated checks for world structure, agency, resources, causality, runtime adaptation, experience, mobile layout, visual coverage and HTTP playthroughs.

Run the complete submission verification with:

```bash
npm test
```

## Product identity

- **Project DM** is the factory and technical system.
- **ULLDE:VERSE** is the player-facing experience.
- **El testigo de Ulldecona** is the submitted playable world.

Ulldecona and its historical setting are real. All named characters and published character portraits in this repository are fictional.

## How the factory works

```text
Human intent
   ↓
Experience seed
   ↓
World architecture and causal contracts
   ↓
Compiler
   ↓
Playable world JSON
   ↓
Automated QA gates
   ↓
ULLDE:VERSE runtime and visual manifest
```

The source trail for the submitted world is intentionally small:

- Seed: `fabrica/semillas/el_testigo_de_ulldecona_semilla_v1_2.json`
- Authoring source: `fabrica/drafts/2026-07-13_testigo_ulldecona_world_v1.json`
- Compiled world: `worlds/Aventura/aventura_el_testigo_de_ulldecona.json`
- Visual source manifest: `fabrica/media/aventura_el_testigo_de_ulldecona_001/visual_manifest_source_v1.json`
- Public runtime manifest: `public/media/aventura_el_testigo_de_ulldecona_001/manifest.json`

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [AI use and human control](docs/AI_USAGE.md)
- [Build Week evidence](docs/BUILD_WEEK_EVIDENCE.md)
- [Visual assets and provenance](docs/ASSETS.md)
- [Video and recorded-build plan](docs/DEMO_SCRIPT.md)

## Privacy and repository scope

The submission repository excludes local saves, runtime logs, API configuration, private prompts, conversations, raw reference photography and unrelated prototype worlds. Generated runtime data is ignored through `.gitignore`.

## License

Source code is released under the [MIT License](LICENSE). Generated visual assets are included for evaluation and demonstration as described in [docs/ASSETS.md](docs/ASSETS.md).
