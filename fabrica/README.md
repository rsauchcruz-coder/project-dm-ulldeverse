# Project DM factory

This directory contains the reusable production layer behind the submitted ULLDE:VERSE world.

## Production trail

```text
semillas/   human intent and experience signature
drafts/     canonical authoring source
contratos/  stable world, causality, presentation and visual rules
checklists/ human release checks
roles/      bounded responsibilities for AI-assisted production
procesos/   learning and iteration rituals
media/      visual source manifest and provenance
```

The submitted artifact can be rebuilt with:

```bash
npm run compile:world
npm run media:compile
npm test
```

Creation remains flexible, but acceptance is strict: the compiler and QA suite, rather than a prompt, determine whether a world is releasable.
