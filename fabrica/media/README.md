# Visual production layer

Each published world owns a source visual manifest, inventory, style contract and compact generation log.

The source manifest connects approved assets to stable node and entity identifiers. `npm run media:compile` strips internal production fields and writes the public runtime manifest under `public/media/<world_id>/manifest.json`.

Raw prompts and reference media are deliberately excluded from the public submission.
