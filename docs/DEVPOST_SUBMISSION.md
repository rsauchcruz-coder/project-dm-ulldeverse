# Devpost submission copy

This document is ready to paste into Devpost. Replace only the marked YouTube and Session ID fields after they are available.

## Project overview

**Project name**

Project DM: ULLDE:VERSE

**Tagline**

An AI-assisted factory for coherent, testable story worlds.

**Gallery thumbnail**

Upload `docs/media/devpost-thumbnail.png`. It is a 1500 × 1000 PNG in Devpost's recommended 3:2 ratio and is under the 5 MB limit.

**Track**

Apps for Your Life

**Project links**

- Demo: https://project-dm-ulldeverse.rsauchcruz.chatgpt.site
- Code: https://github.com/rsauchcruz-coder/project-dm-ulldeverse
- Video: `[ADD PUBLIC YOUTUBE URL]`

**Built with**

Codex, GPT-5.6, JavaScript, Node.js, Express, HTML, CSS, JSON, Cloudflare Workers, automated graph exploration and contract-driven QA.

## Short description

Project DM is an AI-assisted factory for creating small, coherent and verifiably playable narrative worlds. ULLDE:VERSE is its first complete vertical slice: a smartphone-first historical investigation in which every decision updates a canonical, testable case state.

## Inspiration

Generative narrative systems can produce vivid prose, but they are difficult to reproduce, debug and ship. A model may invent an exciting scene while forgetting an earlier promise, exposing an impossible option or ending the story generically.

I wanted a player with no role-playing experience to open a short adventure, read, decide and immediately understand the consequences. At the same time, I wanted the production system behind that experience to behave more like a compiler and test suite than an unconstrained prompt.

## What it does

Project DM turns confirmed human intent into a structured experience seed, a causal world architecture, a compiled runtime artifact and a set of executable quality gates.

ULLDE:VERSE presents the result as a mobile investigation dossier. In *El testigo de Ulldecona*, the player:

- reads scenes and testimony;
- chooses concrete actions;
- discovers characters, objects and deductions;
- changes relationships, resources, pressure and later possibilities;
- reaches one of nine materially different endings.

The public guided demo runs entirely in the browser, stores only local play state and requires no account, API key or runtime model call.

## How we built it

The production chain separates responsibilities:

1. A human confirms the intended experience.
2. A structured seed records audience, tone, central relationship and desired decision texture.
3. World architecture declares nodes, actions, resources, deductions, pressure, causal promises and endings.
4. A compiler produces the canonical world consumed by the runtime.
5. A versioned visual manifest binds scenes, characters and props through stable identifiers.
6. Automated gates explore the graph and reject structural, causal, presentation and deployment failures.
7. ULLDE:VERSE renders the verified artifact as a responsive dossier.

The submitted world contains 28 narrative nodes, 88 actions and 9 reachable endings. Automated exploration verifies 1,143 valid routes.

## How Codex and GPT-5.6 were used

The private project existed before Build Week as an experimental narrative engine with prototype worlds and evolving factory contracts.

During the Submission Period, I used Codex with GPT-5.6 as an engineering and product collaborator to turn that baseline into the submitted vertical slice. The Build Week extension:

- established the Project DM / ULLDE:VERSE / El testigo de Ulldecona product identity;
- redesigned the smartphone dossier and its decision feedback;
- replaced identity-bearing content with fictional names and portraits;
- curated and secured a minimal public evaluation repository;
- built a deterministic browser runtime and production deployment package;
- added repository hygiene, hosted-artifact and HTTP playthrough checks;
- converted recurring narrative and runtime failures into executable QA.

GPT-5.6 helped reason across narrative structure, interaction design, implementation, privacy and release decisions. Codex inspected and edited the repository, ran verification, diagnosed deployment failures and iterated until the public artifact matched the canonical world. Human decisions remained authoritative for product intent, privacy and final acceptance.

The required `/feedback` Session ID comes from the primary Director 2 Codex build task:

`[PASTE PRIMARY CODEX SESSION ID IN DEVPOST — DO NOT ADD IT TO THE PUBLIC REPOSITORY]`

## Challenges we ran into

### Preserving player agency

A branching story can contain many buttons while still producing the same outcome. We addressed this by enumerating routes and checking reachability, irreversible choices, climax differentiation and ending families.

### Making resources and memories causal

Objects and discoveries must change what the player can credibly do. Dedicated gates now validate acquisition, consumption, later reads and declared causal promises.

### Producing a stable judged experience

The private runtime supported optional external providers, but judges should not depend on credentials or network model availability. We created a browser-only guided adapter that uses the same canonical world and verifies its equivalence during QA.

### Publishing without exposing the workshop

The private repository contained local state, reference media, conversations and unrelated prototypes. We created a deliberately small public repository, regenerated fictional portraits and added a hygiene gate that rejects credentials, personal paths and runtime files.

## Accomplishments that we are proud of

- A complete, coherent product experience rather than a prompt demonstration.
- 1,143 verified play routes through one canonical world.
- Nine reachable endings across failure, order, protection and revelation families.
- Thirty-seven approved visual assets resolved through stable identifiers.
- A guided experience that works locally and publicly without credentials.
- One command, `npm test`, that verifies the submission from repository hygiene through HTTP playthroughs and hosted packaging.

## What we learned

AI-assisted narrative production becomes more reliable when creative generation and acceptance are different jobs. Models are valuable for proposing architecture, prose, code and fixes, but the artifact becomes shippable only when stable contracts can reject incoherence.

We also learned that product identity, privacy and ease of evaluation are part of technical quality. A judge should be able to understand the promise, try the product and reproduce its evidence without entering the private workshop that produced it.

## What's next

Project DM currently proves the factory with one finished world. The next steps are:

- record a continuous build of a new mini-world from human premise to passing QA;
- reduce authoring time while preserving the same acceptance gates;
- add reusable visual-production profiles;
- test new worlds for families, local history, education and commissioned experiences;
- measure whether players perceive later consequences as genuinely caused by their earlier decisions.

## Testing instructions

### Fastest path

Open https://project-dm-ulldeverse.rsauchcruz.chatgpt.site, keep **Corto guiado** selected and choose **Jugar este mundo**. No login or API key is required.

For a visible state change, choose:

> Sacar a Mateu de la celda y llevarlo primero a la cisterna.

The selected decision highlights before confirmation. After execution, the location, route, known characters and case state update.

### Local verification

With Node.js 20 or newer:

```bash
npm ci
npm test
npm start
```

Then open `http://localhost:3000`. The optional assisted free mode is not required for evaluation.

## Before/after disclosure

**Pre-existing baseline:** private experimental engine, prototype content and evolving factory documentation.

**Evaluated Build Week extension:** curated vertical slice, product identity, mobile interface redesign, fictionalized public content, deterministic hosted runtime, deployment packaging, security hardening, public documentation and executable submission QA.

The dated commit trail and primary Codex Session ID document this extension.

## Suggested gallery captions

1. **A case, not a chat** — The mobile dossier introduces the world, objective and current pressure without requiring role-playing knowledge.
2. **A visible commitment** — The selected decision changes visually before execution, then updates the canonical case state.
3. **Consequences that persist** — Routes, relationships, evidence and later possibilities remember earlier actions.
4. **A factory behind the fiction** — Seed, authored architecture, compiler, canonical world and visual manifest form one traceable artifact chain.
5. **Verification as a product feature** — Automated gates explore 1,143 valid routes and reject causal, runtime, mobile and deployment regressions.
