import type { Flow } from "../types";

const CONTROLLER = "Backend/controllers/authController.js";
const JWT_MW = "Backend/middleware/jwtMiddleware.js";
const CLIENT = "frontend/src/auth-types/jwt/client.ts";

export const jwtLoginFlow: Flow = {
  id: "login",
  title: "Login: issuing an access token and a refresh token",
  summary:
    "Two tokens with two jobs: a short-lived signed JWT that proves who you are on each request, and a long-lived random refresh token, kept in an httpOnly cookie, whose only job is getting new access tokens.",
  nodes: [
    { id: "submit", kind: "start", actor: "browser", label: "POST /auth/jwt/login { email, password }", detail: "Sent with withCredentials so the browser accepts the refresh-token cookie from the API origin." },
    { id: "find", kind: "storage", actor: "database", label: "User.findOne({ email })", detail: "Same lookup as session login. Passwords are stored and checked the same way regardless of the auth type." },
    { id: "compare", kind: "decision", actor: "crypto", label: "bcrypt.compare(password, hash)", detail: "Re-hashes the submitted password with the stored salt and compares." },
    { id: "invalid", kind: "error", actor: "server", label: "401 Invalid credentials", detail: "Same answer for unknown email and wrong password." },
    { id: "access", kind: "step", actor: "crypto", label: "jwt.sign({ userId, role }, SECRET, { expiresIn })", detail: "The access token is header.payload.signature. The payload is only base64-encoded, so anyone can read it: never put secrets in it. The HMAC signature, made with JWT_ACCESS_SECRET, makes it tamper-proof. Keep expiresIn short (for example 15m).", code: { file: "Backend/utils/tokenService.js", snippet: `jwt.sign(
  { userId: user._id.toString(), role: user.role },
  process.env.JWT_ACCESS_SECRET,
  { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN }
)` } },
    { id: "refresh", kind: "step", actor: "crypto", label: "crypto.randomBytes(64) → refresh token", detail: "The refresh token is NOT a JWT. It is an opaque random string, so the server must look it up, which means it can be revoked.", code: { file: "Backend/services/refreshTokenService.js", snippet: `const generateRefreshToken = () => crypto.randomBytes(64).toString("hex");
const hashRefreshToken = (token) => crypto.createHash("sha256").update(token).digest("hex");` } },
    { id: "store", kind: "storage", actor: "database", label: "RefreshToken.create({ sha256(token), user, expiresAt: +7d })", detail: "Like passwords and reset tokens, only the hash is stored. A database leak does not hand out working refresh tokens." },
    { id: "cookie", kind: "step", actor: "server", label: "Set-Cookie: refreshToken (httpOnly, 7d)", detail: "JavaScript can never read it, so an XSS bug cannot steal the long-lived credential.", code: { file: CONTROLLER, snippet: `res.cookie("refreshToken", refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});` } },
    { id: "body", kind: "success", actor: "browser", label: "200 { accessToken, user } → kept in memory", detail: "The React app stores the access token in a JS variable, not localStorage. On reload it is gone, and a silent refresh gets a new one.", code: { file: CLIENT, snippet: `const response = await api.post("/auth/jwt/login", { email, password },
  { withCredentials: true, _skipAuth: true });
tokens.set(response.data.accessToken);` } },
  ],
  edges: [
    { from: "submit", to: "find" },
    { from: "find", to: "compare" },
    { from: "compare", to: "invalid", label: "no match" },
    { from: "compare", to: "access", label: "match" },
    { from: "access", to: "refresh" },
    { from: "refresh", to: "store" },
    { from: "store", to: "cookie" },
    { from: "cookie", to: "body" },
  ],
  walkthrough: ["submit", "find", "compare", "access", "refresh", "store", "cookie", "body"],
};

export const jwtProtectedFlow: Flow = {
  id: "protected",
  title: "Protected route: validating the access token",
  summary:
    "The server checks the signature and expiry. That proves the token was issued by us and has not been modified. No session lookup is needed for that part.",
  nodes: [
    { id: "attach", kind: "start", actor: "browser", label: "Interceptor adds Authorization: Bearer <jwt>", detail: "One place in the client attaches the token for every request, so components never handle tokens.", code: { file: CLIENT, snippet: `api.interceptors.request.use((config) => {
  const token = tokens.get();
  if (token && !config._skipAuth) config.headers.set("Authorization", \`Bearer \${token}\`);
  return config;
});` } },
    { id: "header", kind: "decision", actor: "middleware", label: "Authorization header present?", detail: "requireAuthJWT starts by reading req.headers.authorization." },
    { id: "noheader", kind: "error", actor: "middleware", label: "401 Authorization header required", detail: "The client did not send a token." },
    { id: "scheme", kind: "decision", actor: "middleware", label: "Format is 'Bearer <token>'?", detail: "Split on the space and check the scheme.", code: { file: JWT_MW, snippet: `const [scheme, token] = authHeader.split(" ");
if (scheme !== "Bearer" || !token) {
  return res.status(401).json({ message: "Invalid authorization format" });
}` } },
    { id: "badformat", kind: "error", actor: "middleware", label: "401 Invalid authorization format", detail: "For example 'Token abc' or a missing token." },
    { id: "verify", kind: "decision", actor: "crypto", label: "jwt.verify(token, SECRET)", detail: "Recomputes the HMAC over header.payload with the secret and compares it with the signature, then checks exp. Change a single character of the payload (e.g. role: 'admin') and the signature no longer matches. Try it in the live example.", code: { file: "Backend/utils/tokenService.js", snippet: `const verifyAccessToken = (token) => jwt.verify(token, process.env.JWT_ACCESS_SECRET);` } },
    { id: "invalid", kind: "error", actor: "middleware", label: "401 Invalid or expired token", detail: "Bad signature or past exp. The client's response interceptor treats this as 'try a refresh'." },
    { id: "user", kind: "storage", actor: "database", label: "User.findById(decoded.userId)", detail: "This backend re-loads the user, so a deleted user or a role change takes effect immediately. A purely stateless setup would trust the payload and skip this query." },
    { id: "attachuser", kind: "step", actor: "middleware", label: "req.user = user; next()", detail: "Same contract as session auth: everything downstream only reads req.user." },
    { id: "done", kind: "success", actor: "server", label: "Controller responds 200", detail: "jwtProfile returns req.user." },
  ],
  edges: [
    { from: "attach", to: "header" },
    { from: "header", to: "noheader", label: "no" },
    { from: "header", to: "scheme", label: "yes" },
    { from: "scheme", to: "badformat", label: "no" },
    { from: "scheme", to: "verify", label: "yes" },
    { from: "verify", to: "invalid", label: "fails" },
    { from: "verify", to: "user", label: "valid" },
    { from: "user", to: "attachuser" },
    { from: "attachuser", to: "done" },
  ],
  walkthrough: ["attach", "header", "scheme", "verify", "user", "attachuser", "done"],
};

export const jwtRefreshFlow: Flow = {
  id: "refresh",
  title: "Refresh: rotating tokens when the access token expires",
  summary:
    "When an API call returns 401, the client silently exchanges the refresh cookie for a new access token, rotates the refresh token, and retries the original call. The user never notices.",
  nodes: [
    { id: "fail", kind: "start", actor: "browser", label: "API responds 401 (access token expired)", detail: "Normal after JWT_ACCESS_EXPIRES_IN has passed." },
    { id: "retry", kind: "decision", actor: "browser", label: "Already retried this request?", detail: "The _retry flag prevents an infinite loop if the refreshed token is also rejected.", code: { file: CLIENT, snippet: `if (error.response?.status === 401 && !original._retry) {
  original._retry = true;
  await refresh();
  return api(original);
}` } },
    { id: "giveup", kind: "error", actor: "browser", label: "Clear token, send user to login", detail: "Refresh failed or already tried: the session is really over." },
    { id: "single", kind: "step", actor: "browser", label: "Single-flight refresh promise", detail: "If several requests fail at the same moment, they all await the same refresh call. Otherwise the second refresh would use an already-rotated token and fail." },
    { id: "call", kind: "step", actor: "browser", label: "POST /auth/jwt/refresh (cookie sent)", detail: "withCredentials: true makes the browser attach the httpOnly refreshToken cookie. JavaScript never touches it." },
    { id: "cookie", kind: "decision", actor: "server", label: "refreshToken cookie present?", detail: "Read via cookie-parser: req.cookies.refreshToken." },
    { id: "lookup", kind: "decision", actor: "database", label: "RefreshToken.findOne({ tokenHash: sha256(cookie) })", detail: "Hash the presented token and look it up. Not found means it was already rotated, logged out, or never valid." },
    { id: "expired", kind: "decision", actor: "server", label: "expiresAt in the past?", detail: "Expired tokens are deleted and rejected." },
    { id: "reject", kind: "error", actor: "server", label: "401 Invalid / expired refresh token", detail: "The client gives up and shows the login screen." },
    { id: "rotate", kind: "storage", actor: "database", label: "Rotate: new random token, overwrite stored hash", detail: "Each refresh token works once. If a stolen token is used after the real user refreshed, it is simply not found.", code: { file: CONTROLLER, snippet: `const newRefreshToken = generateRefreshToken();
storedToken.tokenHash = hashRefreshToken(newRefreshToken);
storedToken.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
await storedToken.save();
res.cookie("refreshToken", newRefreshToken, { httpOnly: true, ... });` } },
    { id: "sign", kind: "step", actor: "crypto", label: "Sign a new access token", detail: "Fresh claims from the current user record (role changes are picked up here)." },
    { id: "replay", kind: "success", actor: "browser", label: "Store new token, retry original request", detail: "The original API call is sent again with the new Authorization header. The inspector shows it with the note 'Retried after refreshing'." },
  ],
  edges: [
    { from: "fail", to: "retry" },
    { from: "retry", to: "giveup", label: "yes" },
    { from: "retry", to: "single", label: "no" },
    { from: "single", to: "call" },
    { from: "call", to: "cookie" },
    { from: "cookie", to: "reject", label: "no" },
    { from: "cookie", to: "lookup", label: "yes" },
    { from: "lookup", to: "reject", label: "not found" },
    { from: "lookup", to: "expired", label: "found" },
    { from: "expired", to: "reject", label: "yes" },
    { from: "expired", to: "rotate", label: "no" },
    { from: "rotate", to: "sign" },
    { from: "sign", to: "replay" },
    { from: "reject", to: "giveup" },
  ],
  walkthrough: ["fail", "retry", "single", "call", "cookie", "lookup", "expired", "rotate", "sign", "replay"],
};

export const jwtLogoutFlow: Flow = {
  id: "logout",
  title: "Logout: what can and cannot be revoked",
  summary:
    "The refresh token is deleted, so no new access tokens can be minted. The current access token keeps working until it expires. That is why it must be short-lived.",
  nodes: [
    { id: "req", kind: "start", actor: "browser", label: "POST /auth/jwt/logout (cookie sent)", detail: "Called with withCredentials so the server receives the refresh cookie." },
    { id: "delete", kind: "storage", actor: "database", label: "RefreshToken.deleteOne({ tokenHash })", detail: "Removes the server-side record. The refresh cookie, even if stolen, is now useless.", code: { file: CONTROLLER, snippet: `const refreshToken = req.cookies.refreshToken;
if (refreshToken) {
  await RefreshToken.deleteOne({ tokenHash: hashRefreshToken(refreshToken) });
}
res.clearCookie("refreshToken", { httpOnly: true, sameSite: "lax", ... });` } },
    { id: "clear", kind: "step", actor: "server", label: "Clear the refreshToken cookie", detail: "clearCookie must use the same options (path, sameSite, secure) the cookie was set with." },
    { id: "forget", kind: "step", actor: "browser", label: "Client forgets the access token", detail: "tokens.set(null) in memory." },
    { id: "caveat", kind: "decision", actor: "crypto", label: "A copied access token is still valid until exp", detail: "JWT verification needs no database, so the server cannot 'un-sign' a token. Mitigations: short expiry, a token version on the user (like sessionVersion), or a denylist." },
    { id: "done", kind: "success", actor: "browser", label: "Logged out", detail: "No refresh possible; the remaining access token dies within minutes." },
  ],
  edges: [
    { from: "req", to: "delete" },
    { from: "delete", to: "clear" },
    { from: "clear", to: "forget" },
    { from: "forget", to: "caveat" },
    { from: "caveat", to: "done" },
  ],
  walkthrough: ["req", "delete", "clear", "forget", "caveat", "done"],
};

export const authorizationFlow: Flow = {
  id: "authorization",
  title: "After login: role, permission and ownership checks",
  summary:
    "Authentication answers 'who are you?' (401 when unknown). Authorization answers 'are you allowed?' (403 when not). They are separate middleware stacked on the route.",
  nodes: [
    { id: "authn", kind: "start", actor: "middleware", label: "requireAuthJWT sets req.user", detail: "Every authorization middleware below assumes this ran first." },
    { id: "which", kind: "decision", actor: "server", label: "Which guard is on the route?", detail: "Routes compose guards: router.get('/admin-only', requireAuthJWT, requiredRole('admin'), handler)." },
    { id: "role", kind: "decision", actor: "middleware", label: "requiredRole('admin'): role allowed?", detail: "Coarse-grained: checks req.user.role against a list.", code: { file: "Backend/middleware/roleMiddleware.js", snippet: `const requiredRole = (...allowedRoles) => (req, res, next) => {
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
};` } },
    { id: "perm", kind: "decision", actor: "middleware", label: "requirePermission('users:delete')", detail: "Fine-grained: maps role → list of permissions. Routes ask for a capability, not a role, so adding a 'manager' role needs no route changes.", code: { file: "Backend/middleware/permissionMiddleware.js", snippet: `const permissions = {
  user:  ["profile:read", "profile:update"],
  admin: ["profile:read", ..., "users:delete"],
};` } },
    { id: "own", kind: "decision", actor: "middleware", label: "requireOwnership: own id or admin?", detail: "Resource-level: /users/:id is allowed only if :id is your own id, unless you are an admin.", code: { file: "Backend/middleware/ownershipMiddleware.js", snippet: `if (req.user.role === "admin") return next();
if (req.user._id.toString() !== req.params.id) {
  return res.status(403).json({ message: "You can only access your own resource" });
}` } },
    { id: "forbidden", kind: "error", actor: "middleware", label: "403 Forbidden", detail: "We know who you are, you just may not do this. Do NOT send the user to the login page for a 403." },
    { id: "ok", kind: "success", actor: "server", label: "Handler runs, 200", detail: "All guards passed." },
  ],
  edges: [
    { from: "authn", to: "which" },
    { from: "which", to: "role", label: "role" },
    { from: "which", to: "perm", label: "permission" },
    { from: "which", to: "own", label: "ownership" },
    { from: "role", to: "forbidden", label: "no" },
    { from: "perm", to: "forbidden", label: "no" },
    { from: "own", to: "forbidden", label: "no" },
    { from: "role", to: "ok", label: "yes" },
    { from: "perm", to: "ok", label: "yes" },
    { from: "own", to: "ok", label: "yes" },
  ],
  walkthrough: ["authn", "which", "role", "perm", "own", "ok"],
};

export const jwtFlows: Flow[] = [jwtLoginFlow, jwtProtectedFlow, jwtRefreshFlow, jwtLogoutFlow, authorizationFlow];
