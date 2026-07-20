# Submission control / Control de candidatura

Last verified against the official OpenAI Build Week website and rules: **18 July 2026**.

This is the single operational status document for the submission. If another
document appears to disagree with it, verify the official rules first and then
update this file.

## Panel rápido en español

**Decisión:** presentar Project DM en **Apps for Your Life**.

**Fecha límite oficial:** 21 de julio de 2026 a las 17:00 Pacific Time,
equivalente al **22 de julio a las 02:00 CEST** en la España peninsular.
Objetivo interno recomendado: enviar antes del **21 de julio a las 20:00 CEST**.

### Ya está hecho

- Producto jugable y demo pública sin registro.
- Repositorio público, licencia MIT y guía de instalación.
- Nombre definitivo: **Project DM: ULLDE:VERSE**.
- Categoría, tagline y descripción completa en inglés.
- Explicación del uso de Codex y GPT-5.6.
- Separación documentada entre proyecto previo y ampliación de Build Week.
- Auditoría de privacidad, secretos, fotografías y nombres.
- Suite reproducible: `npm test`.
- Guía inglesa del recorrido jugable español y de sus nueve desenlaces.
- Miniatura, tres imágenes de galería y PDF público de evidencias.
- Guion exacto del vídeo oficial y protocolo de la prueba larga.

### Solo falta intervención humana

1. Confirmar que existe un borrador de proyecto dentro de Devpost.
2. Grabar la pantalla y producir la narración inglesa del vídeo oficial.
3. Subir el vídeo a YouTube como **Public** y pegar su URL.
4. En la tarea **Director 2**, ejecutar `/feedback` si todavía no se hizo y
   copiar el Session ID que devuelve. No publicarlo en GitHub.
5. Revisar y enviar el formulario de Devpost.

### Codex puede cerrar después

- Sustituir los marcadores de YouTube y Devpost en la documentación.
- Ejecutar la verificación final.
- Crear y publicar la etiqueta exacta del release evaluado.

### No debe retrasar el envío

- La grabación continua de un minimundo es **opcional**.
- El PDF es apoyo opcional si Devpost permite adjuntarlo.
- No hace falta generar otro paquete visual ni añadir IA en tiempo de ejecución.
- No hace falta traducir la ficción española: la descripción, las instrucciones
  y la narración del vídeo sí estarán en inglés.

## Canonical submission status

| Deliverable | Status | Canonical evidence | Owner |
| --- | --- | --- | --- |
| Working project | READY | Public demo and local runtime | Done |
| Best-fit category | READY | Apps for Your Life | Done |
| Project name and tagline | READY | `docs/DEVPOST_SUBMISSION.md` | Done |
| English project description | READY | `docs/DEVPOST_SUBMISSION.md` | Done |
| English companion for Spanish runtime | READY | `docs/ENGLISH_PLAYTHROUGH_GUIDE.md` | Done |
| Public repository and license | READY | GitHub plus `LICENSE` | Done |
| Setup and testing guidance | READY | `README.md`, `docs/JUDGES_QUICKSTART.md` | Done |
| Codex/GPT-5.6 collaboration disclosure | READY | `README.md`, `docs/AI_USAGE.md` | Done |
| Pre-existing/new-work disclosure | READY | `docs/CONTEST_READINESS.md` | Done |
| Public testing access | READY | No-login production demo | Done |
| Gallery media | READY | Thumbnail plus three 3:2 images | Done |
| Supporting evidence PDF | READY, OPTIONAL | `output/pdf/project-dm-build-week-evidence.pdf` | Done |
| Public YouTube demo under 3 minutes | BLOCKING | `docs/DEMO_SCRIPT.md` | Entrant |
| `/feedback` Codex Session ID | BLOCKING | Primary Director 2 task; keep private | Entrant |
| Devpost draft and final submission | BLOCKING | Devpost dashboard | Entrant |
| Final release tag | WAITING FOR FINAL URLS | Exact evaluated commit | Codex |
| Continuous mini-world proof | OPTIONAL | `docs/RECORDED_BUILD_PROTOCOL.md` | Later |

## Official requirement map

The official Build Week requirements are:

1. A working project built with Codex and GPT-5.6.
2. One selected category.
3. An English project description.
4. A public YouTube demonstration under three minutes, with audio explaining
   both the project and the use of Codex and GPT-5.6.
5. A repository URL, relevant license, README and testing instructions.
6. The `/feedback` Session ID for the Codex project thread where most core
   functionality was built.
7. Clear evidence distinguishing pre-existing work from the meaningful
   extension made during the Submission Period.
8. Free, unrestricted access to the working project through the Judging Period.

Sources:

- https://openai.devpost.com/
- https://openai.devpost.com/rules

## Final Devpost procedure

Follow this sequence; do not improvise from older notes.

1. Open the Devpost draft.
2. Use **Project DM: ULLDE:VERSE** as the project name.
3. Select **Apps for Your Life**.
4. Copy the tagline, built-with list and section text from
   `docs/DEVPOST_SUBMISSION.md`.
5. Add the public demo and GitHub URLs from that same document.
6. Upload `docs/media/devpost-thumbnail.png`.
7. Upload the first three gallery images in their numbered order, then add the
   optional fourth before/after image if Devpost accepts an additional gallery
   slot.
8. Add the public YouTube URL.
9. Paste the private Director 2 `/feedback` Session ID into the dedicated form
   field, not into the public description.
10. Paste the testing instructions.
11. Preview the entry and check every link in a private/incognito browser.
12. Submit before the internal target time and save a screenshot of the
    confirmation page.

## Go/no-go rule

The project is ready to submit when the following four statements are true:

- the YouTube video is public, shorter than 3:00 and audible;
- the `/feedback` Session ID has been accepted by the form;
- the demo and repository links work without authentication;
- Devpost shows the submission confirmation.

The continuous mini-world proof is never part of this gate.
