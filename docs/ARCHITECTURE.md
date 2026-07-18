# Architecture

Project DM treats a narrative world as compiled content with verifiable contracts, not as an unconstrained prompt.

## Layers

1. **Experience seed**  
   Declares the intended player experience, central relationship, tone and constraints.

2. **World source**  
   Defines nodes, actions, resources, deductions, characters, pressure, causal promises and endings.

3. **Compiler**  
   Produces the canonical world consumed by the runtime while preserving stable identifiers.

4. **QA gates**  
   Explore the graph and reject structural dead ends, fake choices, invalid resource use, broken causal promises, runtime incompatibilities and incomplete visual bindings.

5. **Runtime**  
   The guided mode resolves only declared actions and state transitions. It is deterministic, local and reproducible. The optional free mode can use an external model and falls back to local resolution if no provider is available.

6. **Presentation**  
   ULLDE:VERSE renders the world as a mobile investigation dossier. Visuals are resolved by stable entity and node identifiers, never by searching names in prose.

## Runtime flow

```text
Browser
  ├── GET /mundos
  ├── POST /iniciar
  ├── POST /accio
  └── POST /guardar, /cargar, /cuaderno
          ↓
server_ui.js
  ├── enriches the case-state response
  └── delegates to server.js
          ↓
jocgroq16.js
  ├── loads the compiled world
  ├── applies guided transitions
  ├── persists local runtime state
  └── optionally routes free play to an AI provider
```

## Stable contracts

The contract documents under `fabrica/contratos/` cover:

- canonical world schema;
- narrative quality;
- causal resource economy;
- persistence of player decisions;
- experience signatures;
- dossier presentation;
- controlled reality and finite state;
- playable staging.

The public vertical slice keeps the full contract layer because it is the reusable part of the product.
