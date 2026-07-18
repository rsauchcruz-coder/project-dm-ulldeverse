# Continuous mini-world build protocol

## Decision

This recording is **optional supporting evidence**, not an OpenAI Build Week
submission requirement. It must never delay the official under-three-minute
YouTube video or the Devpost submission.

Recommended duration:

- target: **2 hours**;
- correction buffer: **30 minutes**;
- absolute stop: **2 hours 30 minutes**.

A three-hour or heavily edited recording weakens the evidence. If the build does
not pass by 2:30, stop honestly and retain the failed gate as a useful result.

## What the recording should prove

The proof is not that Codex can generate a large JSON file quickly. It should
show that Project DM can turn a one-sentence human premise into a small artifact
whose structure, consequences and runtime behavior are independently checked.

Success means producing:

- one confirmed version 1.2 experience seed;
- 7–10 decision nodes plus 3 concrete endings;
- at least 2 materially different routes;
- 2 optional resources with differential uses;
- 2 deductions that separate suspicion from proof;
- one irreversible choice remembered later;
- 2 ending families and one reachable early failure;
- 3–7 explicit causal promises;
- one compiled `world_v1` artifact;
- at least one declared HTTP smoke route;
- passing schema, world, agency, resource, causal, runtime and experience gates.

Visual placeholders are acceptable. A full image pack is outside the scope.

## Integrity boundary

Allowed preparation:

- this protocol;
- a clean clone of the public repository;
- installed dependencies;
- recording software and a visible clock;
- the one-sentence premise.

Not allowed:

- a prebuilt seed, graph, world JSON or prose file;
- hidden bulk text pasted during recording;
- removing failed tests from the recording;
- working on the submission `main` branch;
- exposing `.env` files, credentials, private chats or personal paths.

Codex may create and edit artifacts. The entrant must personally confirm the
experience seed, product decisions and any change of scope.

## Sealed premise

Reveal this only after recording begins:

> A lighthouse keeper must decide which warning to transmit before a storm cuts
> the last cable.

The premise is intentionally incomplete. The human confirmation phase must
decide audience, central relationship, dominant tension, decision texture and
emotional aftertaste.

## Safe workspace

Use a fresh clone or a disposable copy, never the submission working directory.

On camera:

```powershell
git status --short
git switch -c proof/mini-world-YYYYMMDD
npm ci
npm test
```

Show that Git is clean and that no lighthouse seed or world file exists.

## Exact timeline

### 0:00–0:10 — Preflight

- Show the system clock, branch and clean Git status.
- Run the baseline test suite.
- Show the empty search:

```powershell
rg -n -i "lighthouse|keeper|last cable" fabrica worlds
```

- Reveal the premise.

Evidence checkpoint: clean baseline and no prebuilt world.

### 0:10–0:25 — Human intent

- Codex asks only the questions needed by the Pregenerator.
- The entrant confirms the experience signature.
- Create a version 1.2 seed under `fabrica/semillas/`.
- Validate it immediately:

```powershell
node scripts/qa/qa_semilla_schema.js <seed.json>
```

Evidence checkpoint: validated seed with an explicit human confirmation.

### 0:25–0:55 — Architecture before prose

- Create the structural `world_v1` source under `fabrica/drafts/`.
- Keep prose skeletal.
- Declare resources, deductions, pressure, final families, early failure and
  causal promises.
- Run the structural gates before polishing narrative:

```powershell
node scripts/qa/qa_world.js <source-world.json>
node scripts/qa/preflight_agencia.js --profile=aventura_corta_reactiva <source-world.json>
node scripts/qa/qa_economia_recursos.js --mode=gate <source-world.json>
node scripts/qa/qa_persistencia_causal.js --mode=gate <source-world.json>
```

Do not narrate around a failed architecture. Correct the structure first.

Evidence checkpoint: distinct routes and resource/causal gates pass.

### 0:55–1:25 — Playable content

- Write concise visible Spanish.
- Preserve the approved topology.
- Add dossier presentation, short locations and valid consultation focuses.
- Every action must name a concrete act available in the current scene.
- Every ending must be a specific scene.

Run world QA again after prose changes.

Evidence checkpoint: readable world without engine language or impossible
options.

### 1:25–1:40 — Compile and adapt

Compile to a new file under `worlds/`:

```powershell
node scripts/compile/compile_world_v1.js <source-world.json> <compiled-world.json> <world-id>
node scripts/qa/qa_world.js <compiled-world.json>
node scripts/qa/test_world_v1_runtime.js <compiled-world.json>
node scripts/qa/qa_experiencia_mundo.js <seed.json> <compiled-world.json>
```

Do not overwrite the submitted Ulldecona world.

Evidence checkpoint: source and compiled artifact agree.

### 1:40–1:55 — Runtime proof

- Add `qa.rutas_smoke_runtime` to the new world.
- Run the generic HTTP smoke:

```powershell
node scripts/qa/smoke_world_http.js <compiled-world.json>
```

- If time permits, start the server and show one decision and its later
  consequence in the browser.

Evidence checkpoint: a real server route reaches the declared state or ending.

### 1:55–2:00 — Close

Show:

```powershell
git status --short
git diff --stat
git diff --check
```

State the final numbers: elapsed time, nodes, actions, routes, endings and gate
result. Create one concise commit only if all required gates pass.

### 2:00–2:30 — Correction buffer

Only correct failures already reported by QA. Do not:

- add images;
- expand the story;
- redesign the interface;
- create new mechanics;
- hide or remove a failing check.

At 2:30, stop.

## Copy-ready opening prompt

Use this prompt after the recording and clock are visible:

> Read the factory contracts for the version 1.2 seed, canonical world schema,
> agency, resources, causal persistence, dossier presentation, controlled
> reality and playable staging. Starting only from the premise I am about to
> reveal, ask me the minimum human questions required to confirm the experience
> signature. Do not create plot, nodes or endings until I confirm the seed.
> After confirmation, build a 7–10 decision-node mini-world with three concrete
> endings, two differentiated routes, two optional causal resources, two
> deductions, an early failure and at least one later consequence that remembers
> an irreversible choice. Work on the current proof branch only. Keep visible
> prose in correct Spanish, use placeholders for visuals and stop all scope
> growth at two hours. Run each structural gate before prose, compile the
> canonical artifact, add one HTTP smoke route and report every failed gate
> honestly.

## Publication rule

If the proof succeeds, publish it separately with:

- the uncut recording;
- branch or commit URL;
- seed, source world and compiled artifact;
- exact commands and final QA output;
- a note that it is optional supporting evidence.

Do not replace the official short YouTube video with this recording.
