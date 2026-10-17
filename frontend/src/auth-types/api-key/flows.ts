import type { Flow } from "../types";

const CONTROLLER = "Backend/controllers/authController.js";
const KEY_MW = "Backend/middleware/apiKeyMiddleware.js";

export const issueKeyFlow: Flow = {
  id: "issue",
  title: "Issuing a key: show it once, store only a hash",
  summary:
    "A human (an admin, logged in with JWT) creates the key. The raw key is returned exactly once; the database keeps a SHA-256 hash, the owner, the permissions and an optional expiry.",
  nodes: [
    { id: "admin", kind: "start", actor: "browser", label: "Admin is logged in with a JWT", detail: "API keys are for machines, but a human must create them. Key management is protected by user authentication (JWT here)." },
    { id: "req", kind: "step", actor: "browser", label: "POST /api-keys { name, permissions, expiresAt }", detail: "Choose the smallest set of permissions the integration needs (least privilege)." },
    { id: "jwt", kind: "decision", actor: "middleware", label: "requireAuthJWT", detail: "Valid Bearer token → req.user." },
    { id: "role", kind: "decision", actor: "middleware", label: "requiredRole('admin')", detail: "Only admins may mint keys.", code: { file: "Backend/routes/apiKeyRoutes.js", snippet: `router.post("/", requireAuthJWT, requiredRole("admin"), createApiKey);` } },
    { id: "deny401", kind: "error", actor: "middleware", label: "401 not logged in", detail: "No or invalid access token." },
    { id: "deny403", kind: "error", actor: "middleware", label: "403 Access denied", detail: "Logged in, but not an admin." },
    { id: "gen", kind: "step", actor: "crypto", label: "'ak_' + randomBytes(32).hex", detail: "256 random bits. The 'ak_' prefix makes keys easy to recognise in logs and lets secret scanners (like GitHub's) detect leaked keys.", code: { file: "Backend/services/apiKeyServices.js", snippet: `const generateApiKey = () => \`ak_\${crypto.randomBytes(32).toString("hex")}\`;
const hashApiKey = (apiKey) => crypto.createHash("sha256").update(apiKey).digest("hex");` } },
    { id: "hash", kind: "step", actor: "crypto", label: "keyHash = sha256(key)", detail: "Why SHA-256 and not bcrypt? The key is long and random, so it cannot be brute-forced, and a deterministic hash can be looked up directly with an index. bcrypt's random salt would make a lookup by key impossible." },
    { id: "save", kind: "storage", actor: "database", label: "ApiKey.create({ name, keyHash, owner, permissions, expiresAt })", detail: "The raw key is never written anywhere on the server." },
    { id: "once", kind: "success", actor: "browser", label: "201 { apiKey } → shown ONCE", detail: "The UI must tell the user to copy it now. If it is lost, rotate it; nobody can retrieve the original.", code: { file: CONTROLLER, snippet: `res.status(201).json({
  message: "API key created successfully",
  apiKey,                       // raw key, only in this response
  key: { id, name, permissions, expiresAt },
});` } },
  ],
  edges: [
    { from: "admin", to: "req" },
    { from: "req", to: "jwt" },
    { from: "jwt", to: "deny401", label: "invalid" },
    { from: "jwt", to: "role", label: "ok" },
    { from: "role", to: "deny403", label: "not admin" },
    { from: "role", to: "gen", label: "admin" },
    { from: "gen", to: "hash" },
    { from: "hash", to: "save" },
    { from: "save", to: "once" },
  ],
  walkthrough: ["admin", "req", "jwt", "role", "gen", "hash", "save", "once"],
};

export const useKeyFlow: Flow = {
  id: "use",
  title: "Using a key: x-api-key on every request",
  summary:
    "A server-to-server client sends the key in a header. The middleware hashes it, finds the matching active key, checks expiry and then (optionally) its permissions.",
  nodes: [
    { id: "send", kind: "start", actor: "client-app", label: "GET /api-keys/profile, header x-api-key", detail: "Typically a backend job or partner server, never a public web page. Keys embedded in frontend code are public." },
    { id: "present", kind: "decision", actor: "middleware", label: "x-api-key header present?", detail: "Express lower-cases header names: req.headers['x-api-key'].", code: { file: KEY_MW, snippet: `const apiKey = req.headers["x-api-key"];
if (!apiKey) return res.status(401).json({ message: "API key required" });` } },
    { id: "missing", kind: "error", actor: "middleware", label: "401 API key required", detail: "No credentials at all." },
    { id: "lookup", kind: "decision", actor: "database", label: "findOne({ keyHash: sha256(key), revoked: false })", detail: "One indexed query finds the key and filters out revoked ones.", code: { file: KEY_MW, snippet: `const storedKey = await ApiKey.findOne({ keyHash: hashApiKey(apiKey), revoked: false });` } },
    { id: "invalid", kind: "error", actor: "middleware", label: "401 Invalid API key", detail: "Unknown or revoked." },
    { id: "exp", kind: "decision", actor: "middleware", label: "expiresAt passed?", detail: "Keys without expiresAt never expire. Give keys an expiry where you can." },
    { id: "expired", kind: "error", actor: "middleware", label: "401 API key expired", detail: "The owner must rotate or create a new key." },
    { id: "attach", kind: "step", actor: "middleware", label: "req.apiKey = storedKey; next()", detail: "Note it is req.apiKey, not req.user: the caller is an integration acting for an owner." },
    { id: "perm", kind: "decision", actor: "middleware", label: "requireApiKeyPermission('profile:read')", detail: "Scope check: does this key carry the permission the route needs?", code: { file: "Backend/middleware/apiKeyPermissionMiddleware.js", snippet: `if (!req.apiKey.permissions.includes(permission)) {
  return res.status(403).json({ message: "API key permission denied" });
}` } },
    { id: "forbidden", kind: "error", actor: "middleware", label: "403 API key permission denied", detail: "Valid key, wrong scope." },
    { id: "ok", kind: "success", actor: "server", label: "200 Handler responds", detail: "The handler can read req.apiKey.owner to act on behalf of the owning user." },
  ],
  edges: [
    { from: "send", to: "present" },
    { from: "present", to: "missing", label: "no" },
    { from: "present", to: "lookup", label: "yes" },
    { from: "lookup", to: "invalid", label: "not found" },
    { from: "lookup", to: "exp", label: "found" },
    { from: "exp", to: "expired", label: "yes" },
    { from: "exp", to: "attach", label: "no" },
    { from: "attach", to: "perm", label: "scoped route" },
    { from: "attach", to: "ok", label: "any valid key" },
    { from: "perm", to: "forbidden", label: "missing" },
    { from: "perm", to: "ok", label: "granted" },
  ],
  walkthrough: ["send", "present", "lookup", "exp", "attach", "perm", "ok"],
};

export const rotateKeyFlow: Flow = {
  id: "rotate",
  title: "Rotate and revoke",
  summary:
    "Rotation creates a new key with the same name and permissions and revokes the old one. Revocation flips a flag, so the next request with that key is rejected immediately.",
  nodes: [
    { id: "req", kind: "start", actor: "browser", label: "POST /api-keys/:id/rotate (JWT)", detail: "Done by the key owner, e.g. on a schedule or after a suspected leak." },
    { id: "valid", kind: "decision", actor: "server", label: "Valid ObjectId?", detail: "mongoose.isValidObjectId(id) avoids a CastError (500) for garbage ids." },
    { id: "bad", kind: "error", actor: "server", label: "400 Invalid API key ID", detail: "" },
    { id: "own", kind: "decision", actor: "database", label: "findOne({ _id, owner: req.user._id, revoked: false })", detail: "Including owner in the query is the ownership check: you can only rotate your own keys.", code: { file: CONTROLLER, snippet: `const apiKey = await ApiKey.findOne({ _id: id, owner: req.user._id, revoked: false });` } },
    { id: "nf", kind: "error", actor: "server", label: "404 Active API key not found", detail: "404 rather than 403, so callers cannot probe which key ids exist." },
    { id: "new", kind: "storage", actor: "database", label: "Create replacement (same name, permissions, expiry)", detail: "New random key, new hash." },
    { id: "revoke", kind: "storage", actor: "database", label: "old.revoked = true", detail: "Soft delete: keep the record for audit history. The middleware's revoked: false filter rejects it." },
    { id: "done", kind: "success", actor: "browser", label: "201 new raw key (shown once)", detail: "Deploy the new key to the integration; the old one already stopped working." },
  ],
  edges: [
    { from: "req", to: "valid" },
    { from: "valid", to: "bad", label: "no" },
    { from: "valid", to: "own", label: "yes" },
    { from: "own", to: "nf", label: "not found" },
    { from: "own", to: "new", label: "found" },
    { from: "new", to: "revoke" },
    { from: "revoke", to: "done" },
  ],
  walkthrough: ["req", "valid", "own", "new", "revoke", "done"],
};

export const apiKeyFlows: Flow[] = [issueKeyFlow, useKeyFlow, rotateKeyFlow];
