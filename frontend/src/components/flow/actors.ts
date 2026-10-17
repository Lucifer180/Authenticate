import type { Actor, NodeKind } from "../../auth-types/types";

export const ACTOR_LABEL: Record<Actor, string> = {
  browser: "Browser / React",
  "client-app": "API client",
  server: "Express route / controller",
  middleware: "Middleware",
  database: "MongoDB",
  crypto: "Crypto",
};

export const KIND_LABEL: Record<NodeKind, string> = {
  start: "Start",
  step: "Step",
  decision: "Decision",
  storage: "Database read / write",
  success: "Success",
  error: "Rejected",
};
