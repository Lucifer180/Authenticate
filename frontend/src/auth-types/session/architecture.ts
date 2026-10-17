import type { Architecture } from "../types";

export const sessionArchitecture: Architecture = {
  diagram: {
    id: "session-architecture",
    title: "How a session request travels through the backend",
    summary: "Each layer has one job. Read it left to right, the same order a request takes.",
    direction: "LR",
    nodes: [
      { id: "browser", kind: "start", actor: "browser", label: "React app (axios, withCredentials)", detail: "Holds no secrets. It only displays the user; the browser stores and sends the session cookie." },
      { id: "cors", kind: "step", actor: "middleware", label: "cors({ origin, credentials: true })", detail: "Frontend (5173) and API (5000) are different origins. credentials: true plus an explicit origin is required for cookies to cross origins.", code: { file: "Backend/app.js", snippet: `app.use(cors({ origin: "http://localhost:5173", credentials: true }));` } },
      { id: "session", kind: "step", actor: "middleware", label: "express-session + connect-mongo", detail: "Runs on every request: reads the connect.sid cookie, verifies its signature and loads the session into req.session." },
      { id: "routes", kind: "step", actor: "server", label: "routes/authRoutes.js", detail: "Maps URLs to a chain: [middleware..., controller]. Public routes have no auth middleware.", code: { file: "Backend/routes/authRoutes.js", snippet: `router.post("/login", login);
router.get("/me", requireAuth, getMe);
router.post("/logout", requireAuth, logout);` } },
      { id: "guard", kind: "decision", actor: "middleware", label: "requireAuth", detail: "The gatekeeper. Converts req.session.userId into req.user or responds 401." },
      { id: "controller", kind: "step", actor: "server", label: "controllers/authController.js", detail: "Business logic: register, login, logout, reset. Controllers trust req.user and never parse cookies themselves." },
      { id: "crypto", kind: "step", actor: "crypto", label: "bcrypt / crypto", detail: "bcrypt for passwords (slow on purpose), crypto.randomBytes + SHA-256 for reset tokens." },
      { id: "db", kind: "storage", actor: "database", label: "MongoDB: users + sessions", detail: "users holds hashes and sessionVersion; sessions holds server-side session state." },
    ],
    edges: [
      { from: "browser", to: "cors" },
      { from: "cors", to: "session" },
      { from: "session", to: "routes" },
      { from: "routes", to: "guard", label: "protected" },
      { from: "routes", to: "controller", label: "public" },
      { from: "guard", to: "controller", label: "req.user" },
      { from: "controller", to: "crypto" },
      { from: "controller", to: "db" },
    ],
    walkthrough: ["browser", "cors", "session", "routes", "guard", "controller", "crypto", "db"],
  },
  files: [
    { path: "Backend/app.js", role: "Wires cors, cookie-parser and express-session (with connect-mongo store) before any route." },
    { path: "Backend/routes/authRoutes.js", role: "Declares public vs protected endpoints by placing requireAuth in the chain." },
    { path: "Backend/middleware/authMiddleware.js", role: "requireAuth: session → user, with the sessionVersion check." },
    { path: "Backend/controllers/authController.js", role: "register, login, getMe, logout, forgotPassword, resetPassword." },
    { path: "Backend/models/User.js", role: "Schema: email (unique, lowercase), password hash, role, reset token hash, sessionVersion." },
    { path: "Backend/services/emailService.js", role: "Sends the password-reset link with nodemailer." },
  ],
  state: [
    { what: "Who is logged in", where: "MongoDB 'sessions' collection", why: "Server-side state can be deleted at any time, so logout is instant." },
    { what: "Session id", where: "connect.sid cookie (httpOnly, signed)", why: "Opaque pointer only. JavaScript cannot read it, so XSS cannot steal it." },
    { what: "Password", where: "users.password as a bcrypt hash", why: "Irreversible and salted. A leak does not reveal passwords." },
    { what: "Reset token", where: "Email (raw) + users.resetPasswordToken (SHA-256)", why: "The database copy is useless to an attacker; 15-minute expiry." },
  ],
  decisions: [
    { title: "Regenerate the session on login", body: "Prevents session fixation. Always call req.session.regenerate() before writing userId." },
    { title: "Same error for unknown user and wrong password", body: "Responding 401 'Invalid credentials' in both cases prevents account enumeration." },
    { title: "sessionVersion for 'log out everywhere'", body: "One integer on the user, copied into each session, lets you revoke every session with a single increment." },
    { title: "Controllers depend on req.user, not on cookies", body: "Middleware does authentication; controllers do business logic. Swapping sessions for JWT only changes the middleware." },
  ],
};
