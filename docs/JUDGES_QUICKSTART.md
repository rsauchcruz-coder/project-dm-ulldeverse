# Judge quickstart

The playable historical fiction is intentionally in Spanish. Judges who prefer
English can follow the exact translated route in
[`docs/ENGLISH_PLAYTHROUGH_GUIDE.md`](ENGLISH_PLAYTHROUGH_GUIDE.md).

Project DM can be evaluated in under two minutes without installing anything.

## 90-second public path

1. Open the [public ULLDE:VERSE demo](https://project-dm-ulldeverse.rsauchcruz.chatgpt.site).
2. Keep **Corto guiado · funciona sin API** selected.
3. Select **Jugar este mundo**.
4. Read the opening dossier and open **Personajes**.
5. Under **¿Qué quieres hacer?**, select:

   > Sacar a Mateu de la celda y llevarlo primero a la cisterna.

6. Confirm that the selected decision changes visually, then press **Ejecutar**.
7. Observe the new sheet, location, route, known characters and case state.
8. Open the dossier menu and select **Reiniciar aventura** to verify that the demo is reusable.

The hosted demo stores only per-browser play state. It requires no account, credentials, API key or server-side model call.

## Five-minute technical path

From a fresh checkout with Node.js 20 or newer:

```bash
npm ci
npm test
npm start
```

Open `http://localhost:3000` and choose **Corto guiado**. No `.env` file is required for the judged guided experience.

Expected release-gate summary:

```text
Repository hygiene: APTO
World schema and narrative: APTO
Agency: 1,143 verified routes
Reachable endings: 9
Hosted demo package: APTA
Visual manifest: 37 published assets
HTTP guided routes: APTO
PROJECT DM SUBMISSION: ALL CHECKS PASSED
```

## What to inspect in the repository

The smallest useful artifact chain is:

1. `fabrica/semillas/el_testigo_de_ulldecona_semilla_v1_2.json` — confirmed experience intent.
2. `fabrica/drafts/2026-07-13_testigo_ulldecona_world_v1.json` — authored causal world.
3. `scripts/compile/compile_world_v1.js` — compilation boundary.
4. `worlds/Aventura/aventura_el_testigo_de_ulldecona.json` — canonical runtime artifact.
5. `scripts/qa/qa_submission.js` — release gate.
6. `scripts/qa/qa_static_demo.js` — hosted-artifact equivalence and Worker checks.
7. `public/static-demo-runtime.js` — no-login browser runtime.

## Product naming

- **Project DM:** factory and technical system.
- **ULLDE:VERSE:** player-facing product.
- **El testigo de Ulldecona:** submitted vertical-slice world.

The Spanish visible text is deliberate historical-fiction content. The submission, setup and testing instructions are in English.
