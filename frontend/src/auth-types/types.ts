import type { ComponentType } from "react";

/**
 * The contract every authentication type implements.
 * To add a new type (OAuth, magic link, TOTP...), create a folder next to
 * `session/`, `jwt/` and `api-key/` that exports an `AuthTypeDefinition`,
 * then add it to `registry.ts`. The UI picks it up automatically.
 */

/** Who performs a step. Each actor gets its own colour in the flowcharts. */
export type Actor = "browser" | "server" | "middleware" | "database" | "crypto" | "client-app";

/** The shape of a flowchart node. */
export type NodeKind = "start" | "step" | "decision" | "storage" | "success" | "error";

export interface CodeRef {
  /** Path relative to the repo root, e.g. `Backend/controllers/authController.js`. */
  file: string;
  snippet: string;
}

export interface FlowNode {
  id: string;
  label: string;
  kind: NodeKind;
  actor: Actor;
  /** Explanation shown in the side panel when this node is selected. */
  detail: string;
  code?: CodeRef;
}

export interface FlowEdge {
  from: string;
  to: string;
  /** Short label, e.g. "yes" / "no" for decisions. */
  label?: string;
}

export interface Flow {
  id: string;
  title: string;
  summary: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  /** The order the walkthrough visits nodes in (the happy path plus key branches). */
  walkthrough: string[];
  /** Layout direction: top-to-bottom (default) or left-to-right. */
  direction?: "TB" | "LR";
}

export interface FileRole {
  path: string;
  role: string;
}

export interface Architecture {
  /** A component diagram: how a request travels through the layers. */
  diagram: Flow;
  /** Which files implement each layer. */
  files: FileRole[];
  /** Where each piece of auth state lives and why. */
  state: { what: string; where: string; why: string }[];
  /** The design decisions a junior developer should copy. */
  decisions: { title: string; body: string }[];
}

export interface AuthTypeDefinition {
  id: string;
  name: string;
  /** Two or three letters for the card badge. */
  short: string;
  tagline: string;
  /** "How it works in one paragraph". */
  summary: string;
  whenToUse: string[];
  pros: string[];
  cons: string[];
  architecture: Architecture;
  flows: Flow[];
  Example: ComponentType;
}

/** Shown as "coming soon" cards on the home page. */
export interface PlannedAuthType {
  id: string;
  name: string;
  short: string;
  tagline: string;
}
