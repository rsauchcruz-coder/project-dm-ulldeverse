# Security and private configuration

The default **Corto guiado** experience runs locally without credentials or network model calls.

## Local secrets

Optional provider credentials must be supplied through environment variables. `.env.example` documents the supported names but contains no values.

Never commit:

- `.env` or local variants;
- `config.js`;
- files under `Dades/` or `saves_web/`;
- prompt logs, exported conversations or raw reference photography.

These paths are excluded by `.gitignore` and checked by `npm run qa:repo`.

Complete prompt logging is disabled by default. `LOG_PROMPTS_COMPLETS=true` should be used only for deliberate local debugging because logs may contain player text.

If a credential is ever exposed, revoke it at the provider before removing it from Git history.
