# Auth Architecture Lab (frontend)

An interactive guide to the authentication patterns implemented in `../Backend`.
For every auth type the learner goes through three steps:

1. **Architecture**: which layer does what, which file implements it, where auth state lives.
2. **Flows**: step-by-step flowcharts (register, login, protected route, refresh, logout…) linked to the real backend code.
3. **Try it**: a live example that calls the backend and shows every request in a network inspector.

## Run

```bash
cd Backend && npm run dev      # API on http://localhost:5000
cd frontend && npm run dev     # UI on http://localhost:5173
```

Set `VITE_API_URL` to point the UI at a different API (default `http://localhost:5000/api`).

## Folder structure

```
src/
  auth-types/            one folder per authentication type
    types.ts             the contract every type implements (AuthTypeDefinition)
    registry.ts          list of types shown in the UI
    session/  jwt/  api-key/
      index.ts           name, summary, pros/cons → AuthTypeDefinition
      architecture.ts    component diagram, file map, state table, decisions
      flows.ts           flowcharts as plain node/edge data
      client.ts          the axios client for this type
      *Example.tsx       the live, step-by-step example
  components/
    flow/                FlowChart (React Flow + dagre auto-layout + walkthrough)
    example/             ExampleLayout, ActionCard, network inspector
  lib/                   http client with request logging, JWT decoder
  pages/                 Home, AuthTypePage (Architecture → Flows → Try it), reset-password
```

## Adding a new authentication type

1. Copy `src/auth-types/api-key/` to `src/auth-types/<your-type>/`.
2. Describe the flows in `flows.ts`: nodes (`kind`, `actor`, `detail`, optional `code`) and edges. Layout is automatic.
3. Fill in `architecture.ts` and `index.ts`, and build the example component.
4. Add it to `authTypes` in `registry.ts` (and remove it from `plannedAuthTypes`).

## Libraries

- `@xyflow/react` (React Flow) renders interactive flowcharts.
- `@dagrejs/dagre` auto-positions flowchart nodes.
- `axios` is the HTTP client; its interceptors attach tokens, refresh them and log requests.
- `react-router-dom` handles routing.

The previous version of the UI is kept in `legacy/` for reference.
