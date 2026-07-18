# Video and recorded-build plan

## Three-minute submission video

### 0:00–0:20 — The problem

“Generative narrative demos can improvise, but they are difficult to reproduce, test and scale. Project DM turns a narrative world into a compiled and verifiable product.”

Show the Project DM name and the ULLDE:VERSE home screen.

### 0:20–1:25 — Play

Start **El testigo de Ulldecona** in **Corto guiado**.

Show:

- the dossier presentation;
- scene and character assets;
- one resource or deduction;
- a decision with an explicit consequence;
- the route/archive changing after the action.

Do not attempt a complete playthrough in the video.

### 1:25–2:15 — The factory

Show, in this order:

1. Experience seed.
2. World source with nodes and actions.
3. Compiler command.
4. `npm test`.
5. Final summary showing routes, endings and visual coverage.

### 2:15–2:45 — AI and control

Explain that AI assists seed development, architecture, prose, implementation and visuals, while deterministic contracts verify state, resources, causality, endings and presentation.

Mention that the submitted guided world runs without an API.

### 2:45–3:00 — Closing

“ULLDE:VERSE is one world. Project DM is the factory that can build the next one.”

## Recorded mini-world build

Recommended length: **two hours**, with an optional thirty-minute QA buffer.

### Before recording

- Start from a clean branch.
- Verify `npm install` and `npm test`.
- Prepare only the human premise; do not prebuild the world.
- Keep the clock and full desktop visible.
- Do not cut failures. They are evidence of the QA loop.

### 0:00–0:15 — Human intent

Answer the experience questions and create a new seed. Confirm the experience signature before generating architecture.

### 0:15–0:45 — Structural skeleton

Create:

- 5–8 nodes;
- 2–3 resources;
- 2 deductions;
- 3 endings;
- causal promises;
- one irreversible choice.

Run agency, resource and causal preflight before writing final prose.

### 0:45–1:20 — Playable content

Write concise visible Spanish for each node without changing the approved topology. Compile the world and correct schema errors.

### 1:20–1:45 — Runtime and presentation

Add the world to the runtime, declare the initial dossier presentation and verify the guided route over HTTP.

For a two-hour proof, use placeholders or a minimal generated visual set. The factory logic matters more than producing dozens of polished images live.

### 1:45–2:00 — Release gate

Run the complete relevant QA, play one path and show one alternate ending. Finish by displaying the clean diff and the generated artifact.

### Optional 2:00–2:30 — Correction buffer

Use this only for failures discovered by QA. Explain what the failed gate protected and rerun it after the correction.
