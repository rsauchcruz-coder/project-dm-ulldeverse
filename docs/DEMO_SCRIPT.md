# Submission video and optional recorded-build runbook

## Official video: target duration 2:45

The official video must be public on YouTube, under three minutes, narrated in English and free of unlicensed music or third-party material. Record at 1080p, enlarge the browser to keep text legible and use the public demo rather than localhost.

### Shot list and exact narration

#### 0:00–0:15 — Product promise

**Screen:** ULLDE:VERSE title, then open the public demo.

**Voiceover:**

> Generative stories can be imaginative, but they are hard to reproduce, test and ship. Project DM is an AI-assisted factory for small, coherent narrative worlds. ULLDE:VERSE is its first complete player experience.

#### 0:15–1:08 — Working product

**Screen:** Start *El testigo de Ulldecona*. Show the initial dossier, a character card and a scene. Select one decision so its highlighted state is visible, execute it, then open the route/archive and show that the case state changed.

**Voiceover:**

> This is a short historical investigation designed for a phone and for players who do not need to know role-playing games. I read the case, choose a concrete action and immediately see its consequences. The route, known characters, evidence, resources and pressure are derived from the same canonical state. This public guided demo needs no account, API key or runtime model call, so every judge receives a stable experience.

#### 1:08–1:46 — Factory and verification

**Screen:** Fast, readable cuts of the experience seed, authored world JSON, compiled world, visual manifest and final `npm test` summary. Keep each filename visible.

**Voiceover:**

> Behind the dossier, Project DM separates human intent, world architecture, prose, compilation, visuals and quality gates. This world has twenty-eight nodes, eighty-eight actions and nine reachable endings. Automated exploration verifies one thousand one hundred and forty-three valid routes, while separate gates reject fake choices, impossible resource use, broken causal promises, unreachable endings, mobile regressions and incomplete visual bindings.

#### 1:46–2:28 — Codex and GPT-5.6

**Screen:** Show the Director 2 Codex capture with task title, visible GPT-5.6 model and the relevant implementation result. Then show the Build Week commits and one concise diff or the public-demo QA file. Do not show private messages, tokens, paths containing personal information or browser credentials.

**Voiceover:**

> During Build Week, I used Codex with GPT-5.6 as my engineering and product collaborator. Starting from a private experimental engine, we made the extension submission-ready: we chose the product identity, redesigned the mobile interaction, fictionalized identity-bearing content, built the deterministic browser runtime and deployment package, audited the public repository and turned repeated failures into executable tests. GPT-5.6 helped reason across narrative, code, design and release decisions; deterministic tests, not the model, decide whether the artifact ships.

#### 2:28–2:45 — Close

**Screen:** Return to the live dossier, then end on the logo plus the public demo and repository URLs.

**Voiceover:**

> El testigo de Ulldecona is one finished world. Project DM is the factory for making the next one coherent, playable and verifiable. Try ULLDE:VERSE in the public demo.

### Recording checklist

- Use English narration or add a complete English translation.
- Keep the final export at 2:45–2:55; never exceed 3:00.
- Show the working project before showing code.
- Say both “Codex” and “GPT-5.6” and describe concrete contributions.
- Show the selected choice changing visually before executing it.
- Do not show secrets, temporary deployment credentials, personal photographs or private chats.
- Upload to YouTube as **Public**, not Unlisted.
- Suggested title: `Project DM / ULLDE:VERSE — OpenAI Build Week`
- Suggested description: `Project DM is an AI-assisted factory for coherent, testable narrative worlds. Play the public ULLDE:VERSE demo and inspect the reproducible repository using the links below.`

## Optional continuous mini-world proof

This recording is supporting evidence, not the official submission video. Do it only after the official video and Devpost draft are safe.

### Scope

- Target: 2 hours.
- Hard stop: 2 hours 30 minutes, including correction buffer.
- Output: one new 5–8-node mini-world, at least 3 endings and one verified HTTP route.
- Presentation: placeholders are acceptable; do not try to create a full visual pack live.
- Premise to reveal at recording start: **A lighthouse keeper must decide which warning to transmit before a storm cuts the last cable.**

### Preflight — performed on camera

1. Show the system clock and the clean repository status.
2. Create a new branch named `proof/mini-world-YYYYMMDD`.
3. Run `npm ci` and `npm test`.
4. Show that only the one-sentence premise exists; no world files are prebuilt.
5. Confirm that no `.env` or secret value is visible.

### 0:00–0:15 — Human intent

- Answer the Pregenerator questions.
- Create and validate a version 1.2 experience seed.
- Confirm audience, central relationship, dominant tension and the intended emotional aftertaste.

### 0:15–0:45 — Architecture

- Create 5–8 nodes, 2–3 resources, 2 deductions and 3 concrete endings.
- Include one irreversible choice and one later consequence that remembers it.
- Declare causal promises and ending requirements.
- Run agency, resource and causal preflight before final prose.

### 0:45–1:20 — Playable content

- Write concise, correct visible Spanish without changing the approved topology.
- Compile to the canonical world format.
- Correct schema and contract failures as they appear; explain what each failed gate protected.

### 1:20–1:45 — Runtime

- Register the world in the guided runtime.
- Add the initial dossier presentation, short location labels and valid consultation focuses.
- Run one HTTP route to an ending, then demonstrate a materially different ending.

### 1:45–2:00 — Release gate

- Run the complete relevant QA suite.
- Show the generated artifact, the clean diff and a concise commit.
- End with a table of nodes, actions, endings, valid routes and elapsed time.

### 2:00–2:30 — Correction buffer only

Use this time only for failures discovered by QA. Do not add scope or polish. If the build cannot pass by 2:30, stop honestly and preserve the failed gate as evidence.

### Integrity rules

- Continuous desktop recording with a visible clock; cuts only for accidental secret exposure.
- Keep failures and corrections.
- Do not paste a prepared world or bulk hidden content.
- Codex may create code and artifacts, but the human must confirm experience and product decisions.
- Publish the proof separately and link it only as optional supporting evidence.
