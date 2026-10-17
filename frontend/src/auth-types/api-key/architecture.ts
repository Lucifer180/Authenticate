import type { Architecture } from "../types";

export const apiKeyArchitecture: Architecture = {
  diagram: {
    id: "api-key-architecture",
    title: "Two audiences, two auth methods",
    summary: "Humans manage keys with JWT. Machines use the keys. Both end up in the same apiKeys collection.",
    direction: "LR",
    nodes: [
      { id: "admin", kind: "start", actor: "browser", label: "Admin dashboard (JWT)", detail: "Creates, lists, rotates and revokes keys." },
      { id: "machine", kind: "start", actor: "client-app", label: "Integration / cron job (x-api-key)", detail: "Calls the API with the key. Has no user, no password, no cookie." },
      { id: "routes", kind: "step", actor: "server", label: "routes/apiKeyRoutes.js · externalRoutes.js", detail: "Management routes use requireAuthJWT; consumer routes use requireApiKey." },
      { id: "jwt", kind: "decision", actor: "middleware", label: "requireAuthJWT + requiredRole('admin')", detail: "Protects key management." },
      { id: "key", kind: "decision", actor: "middleware", label: "requireApiKey", detail: "Hash → lookup → revoked/expiry check → req.apiKey." },
      { id: "scope", kind: "decision", actor: "middleware", label: "requireApiKeyPermission(scope)", detail: "Per-route permission check on the key." },
      { id: "controller", kind: "step", actor: "server", label: "createApiKey · listApiKeys · rotateApiKey · revokeApiKey", detail: "Lives in authController.js today; a dedicated apiKeyController.js would be a good refactor as it grows." },
      { id: "service", kind: "step", actor: "crypto", label: "services/apiKeyServices.js", detail: "generateApiKey and hashApiKey in one place, used by both the controller and the middleware." },
      { id: "db", kind: "storage", actor: "database", label: "MongoDB: apikeys", detail: "keyHash (unique), owner, permissions, expiresAt, revoked, timestamps." },
    ],
    edges: [
      { from: "admin", to: "routes", label: "Bearer" },
      { from: "machine", to: "routes", label: "x-api-key" },
      { from: "routes", to: "jwt", label: "manage" },
      { from: "routes", to: "key", label: "consume" },
      { from: "jwt", to: "controller" },
      { from: "key", to: "scope" },
      { from: "controller", to: "service" },
      { from: "scope", to: "db" },
      { from: "service", to: "db" },
    ],
    walkthrough: ["admin", "routes", "jwt", "controller", "service", "db", "machine", "key", "scope"],
  },
  files: [
    { path: "Backend/services/apiKeyServices.js", role: "generateApiKey ('ak_' + 32 random bytes) and hashApiKey (SHA-256)." },
    { path: "Backend/models/ApiKey.js", role: "name, keyHash (unique), owner → User, permissions[], expiresAt, revoked." },
    { path: "Backend/middleware/apiKeyMiddleware.js", role: "requireApiKey: x-api-key → req.apiKey." },
    { path: "Backend/middleware/apiKeyPermissionMiddleware.js", role: "requireApiKeyPermission(scope) → 403 if missing." },
    { path: "Backend/routes/apiKeyRoutes.js", role: "Management (JWT) plus GET /profile (key)." },
    { path: "Backend/routes/externalRoutes.js", role: "Consumer routes with permission scopes, mounted at /api/external." },
  ],
  state: [
    { what: "Raw API key", where: "Only with the integration (env var / secret manager)", why: "Shown once at creation. The server cannot show it again." },
    { what: "Key hash", where: "apikeys.keyHash (unique index)", why: "Deterministic hash allows O(1) lookup; a leak gives nothing usable." },
    { what: "Who owns the key", where: "apikeys.owner", why: "Requests can act on behalf of that user, and only they can rotate/revoke." },
    { what: "What it may do", where: "apikeys.permissions", why: "Least privilege per integration, checked per route." },
  ],
  decisions: [
    { title: "Hash keys like passwords, but with SHA-256", body: "High-entropy random secrets don't need a slow hash, and must be findable by hash." },
    { title: "Show the key once", body: "If the server can display it later, the server is storing it." },
    { title: "Revoke with a flag, don't delete", body: "Soft revocation keeps an audit trail and makes rotation safe." },
    { title: "Prefix your keys", body: "'ak_' makes leaks detectable by scanners and keys recognisable in support tickets." },
  ],
};
