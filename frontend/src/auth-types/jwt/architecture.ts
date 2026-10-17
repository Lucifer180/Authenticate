import type { Architecture } from "../types";

export const jwtArchitecture: Architecture = {
  diagram: {
    id: "jwt-architecture",
    title: "How a JWT request travels through the backend",
    summary: "Two paths: normal API calls carry the access token in a header; the refresh path carries the refresh token in a cookie.",
    direction: "LR",
    nodes: [
      { id: "store", kind: "start", actor: "browser", label: "tokenStore (memory)", detail: "Holds the access token in a JS variable. Components read it through a hook to display it, but only the axios interceptor sends it." },
      { id: "interceptors", kind: "step", actor: "browser", label: "axios interceptors", detail: "Request interceptor: attach Bearer token. Response interceptor: on 401, refresh once and retry." },
      { id: "routes", kind: "step", actor: "server", label: "routes/authRoutes.js", detail: "/jwt/login, /jwt/refresh, /jwt/logout are public (they authenticate with password or cookie). /jwtProfile and the admin routes are protected." },
      { id: "guard", kind: "decision", actor: "middleware", label: "requireAuthJWT", detail: "Verifies the signature and expiry, loads the user, sets req.user." },
      { id: "authz", kind: "decision", actor: "middleware", label: "requiredRole / requirePermission / requireOwnership", detail: "Optional authorization layer stacked after authentication." },
      { id: "controller", kind: "step", actor: "server", label: "controllers/authController.js", detail: "jwtLogin, refreshAccessToken, jwtLogout, jwtProfile." },
      { id: "tokens", kind: "step", actor: "crypto", label: "utils/tokenService + services/refreshTokenService", detail: "Signing/verifying JWTs and generating/hashing refresh tokens are isolated in their own modules, so controllers stay readable." },
      { id: "db", kind: "storage", actor: "database", label: "MongoDB: users + refreshtokens", detail: "refreshtokens holds sha256(token), user and expiresAt. Access tokens are never stored." },
      { id: "cookie", kind: "step", actor: "browser", label: "refreshToken cookie (httpOnly)", detail: "Only used by /jwt/refresh and /jwt/logout." },
    ],
    edges: [
      { from: "store", to: "interceptors" },
      { from: "interceptors", to: "routes", label: "Bearer" },
      { from: "cookie", to: "routes", label: "cookie" },
      { from: "routes", to: "guard", label: "protected" },
      { from: "guard", to: "authz" },
      { from: "authz", to: "controller" },
      { from: "routes", to: "controller", label: "login / refresh" },
      { from: "controller", to: "tokens" },
      { from: "controller", to: "db" },
    ],
    walkthrough: ["store", "interceptors", "routes", "guard", "authz", "controller", "tokens", "db", "cookie"],
  },
  files: [
    { path: "Backend/utils/tokenService.js", role: "generateAccessToken / verifyAccessToken with JWT_ACCESS_SECRET." },
    { path: "Backend/services/refreshTokenService.js", role: "Random refresh token + SHA-256 hashing." },
    { path: "Backend/models/RefreshToken.js", role: "tokenHash (unique), user, expiresAt." },
    { path: "Backend/middleware/jwtMiddleware.js", role: "requireAuthJWT: Bearer header → verified user." },
    { path: "Backend/middleware/roleMiddleware.js · permissionMiddleware.js · ownershipMiddleware.js", role: "Authorization guards (403)." },
    { path: "Backend/controllers/authController.js", role: "jwtLogin, refreshAccessToken (rotation), jwtLogout, jwtProfile." },
    { path: "frontend/src/auth-types/jwt/client.ts", role: "Token store + interceptors with single-flight refresh." },
  ],
  state: [
    { what: "Access token (JWT)", where: "Browser memory", why: "Short-lived and readable by JS. Memory limits how long XSS could use it." },
    { what: "Refresh token", where: "httpOnly cookie + SHA-256 in MongoDB", why: "Long-lived, so JS must not see it, and it must be revocable server-side." },
    { what: "User identity in the token", where: "JWT payload { userId, role, iat, exp }", why: "Readable by anyone, protected from changes by the signature." },
    { what: "Signing secret", where: "JWT_ACCESS_SECRET in Backend/.env", why: "Whoever has it can mint tokens for any user. Never commit it." },
  ],
  decisions: [
    { title: "Short access token, long refresh token", body: "Limits the damage of a leaked access token while keeping users logged in for days." },
    { title: "Refresh token is random, hashed and rotated", body: "Random means revocable, hashed means safe if the DB leaks, rotated means a stolen token works at most once." },
    { title: "One place attaches tokens", body: "Interceptors keep token logic out of components. Components just call api.get()." },
    { title: "401 means 'who are you?', 403 means 'not allowed'", body: "Refresh or redirect to login on 401; show an error on 403." },
  ],
};
