import type { Flow } from "../types";

const CONTROLLER = "Backend/controllers/authController.js";
const AUTH_MW = "Backend/middleware/authMiddleware.js";

export const registerFlow: Flow = {
  id: "register",
  title: "Register: storing the password safely",
  summary:
    "The password is never stored. bcrypt adds a random salt and runs a deliberately slow hash; only that hash goes into MongoDB.",
  nodes: [
    { id: "submit", kind: "start", actor: "browser", label: "User submits name, email, password", detail: "The register form sends a JSON body to POST /api/auth/register. Always over HTTPS in production: the password travels in plain text inside the TLS tunnel." },
    { id: "validate", kind: "decision", actor: "server", label: "All fields present?", detail: "Cheap checks first. Reject bad input before touching the database or doing any expensive hashing.", code: { file: CONTROLLER, snippet: `if (!name || !email || !password) {
  return res.status(400).json({ message: "Name, email and password are required" });
}` } },
    { id: "bad", kind: "error", actor: "server", label: "400 Bad Request", detail: "Missing fields. The client should show a validation message." },
    { id: "exists", kind: "storage", actor: "database", label: "User.findOne({ email })", detail: "Look up the email. The User schema lowercases and trims email so 'A@x.com' and 'a@x.com' are the same account." },
    { id: "dup", kind: "decision", actor: "server", label: "Email already used?", detail: "Email is the login identifier, so it must be unique (there is also a unique index in the schema as a safety net)." },
    { id: "conflict", kind: "error", actor: "server", label: "409 Conflict", detail: "The account already exists." },
    { id: "hash", kind: "step", actor: "crypto", label: "bcrypt.hash(password, 12)", detail: "bcrypt generates a random salt and runs 2^12 rounds of hashing. The salt means two users with the same password get different hashes; the cost factor makes brute-forcing a leaked database very slow. The output string contains algorithm + cost + salt + hash.", code: { file: CONTROLLER, snippet: `const hashedPassword = await bcrypt.hash(password, 12);
// e.g. $2b$12$Zp5d0Y...  (version $ cost $ salt+hash)` } },
    { id: "save", kind: "storage", actor: "database", label: "User.create({ ..., password: hash })", detail: "Only the bcrypt hash is persisted. role defaults to 'user' and sessionVersion to 0 (used later to log the user out everywhere).", code: { file: "Backend/models/User.js", snippet: `password: { type: String, required: true, minlength: 8 },
role: { type: String, enum: ["user", "admin"], default: "user" },
sessionVersion: { type: Number, default: 0 }` } },
    { id: "done", kind: "success", actor: "server", label: "201 Created (no password in response)", detail: "The response returns id, name, email and role. Never echo the password or its hash back to the client." },
  ],
  edges: [
    { from: "submit", to: "validate" },
    { from: "validate", to: "bad", label: "no" },
    { from: "validate", to: "exists", label: "yes" },
    { from: "exists", to: "dup" },
    { from: "dup", to: "conflict", label: "yes" },
    { from: "dup", to: "hash", label: "no" },
    { from: "hash", to: "save" },
    { from: "save", to: "done" },
  ],
  walkthrough: ["submit", "validate", "exists", "dup", "hash", "save", "done"],
};

export const loginFlow: Flow = {
  id: "login",
  title: "Login: creating the session",
  summary:
    "After the password checks out, the server creates a session record and gives the browser only an opaque, signed session id in an httpOnly cookie.",
  nodes: [
    { id: "submit", kind: "start", actor: "browser", label: "POST /auth/login { email, password }", detail: "axios is created with withCredentials: true so the browser will store and later send the session cookie for a cross-origin API (5173 → 5000).", code: { file: "frontend/src/auth-types/session/client.ts", snippet: `createClient(sessionLog, { withCredentials: true })` } },
    { id: "find", kind: "storage", actor: "database", label: "User.findOne({ email })", detail: "Fetch the stored hash for this email." },
    { id: "found", kind: "decision", actor: "server", label: "User exists?", detail: "If not, answer exactly like a wrong password. Different messages would let an attacker discover which emails are registered (user enumeration)." },
    { id: "compare", kind: "decision", actor: "crypto", label: "bcrypt.compare(password, hash)", detail: "bcrypt reads the salt and cost out of the stored hash, hashes the submitted password the same way and compares. You never 'decrypt' a password.", code: { file: CONTROLLER, snippet: `const isPasswordValid = await bcrypt.compare(password, user.password);` } },
    { id: "invalid", kind: "error", actor: "server", label: "401 Invalid credentials", detail: "Same message for 'no such user' and 'wrong password'." },
    { id: "regen", kind: "step", actor: "middleware", label: "req.session.regenerate()", detail: "Throw away any pre-login session id and issue a new one. This blocks session fixation, where an attacker plants a known session id in your browser before you log in.", code: { file: CONTROLLER, snippet: `req.session.regenerate((error) => {
  req.session.userId = user._id.toString();
  req.session.sessionVersion = user.sessionVersion;
  ...
});` } },
    { id: "store", kind: "storage", actor: "database", label: "connect-mongo saves session doc", detail: "The session data (userId, sessionVersion) lives on the server in the 'sessions' collection. The browser never sees it.", code: { file: "Backend/app.js", snippet: `store: MongoStore.create({ mongoUrl: process.env.MONGO_URI })` } },
    { id: "cookie", kind: "step", actor: "server", label: "Set-Cookie: connect.sid (httpOnly)", detail: "The cookie holds only the session id, signed with SESSION_SECRET so it cannot be forged. httpOnly stops JavaScript (and XSS) from reading it; sameSite=lax limits CSRF; secure in production forces HTTPS; maxAge is 24h.", code: { file: "Backend/app.js", snippet: `cookie: {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 1000 * 60 * 60 * 24,
}` } },
    { id: "done", kind: "success", actor: "browser", label: "200 OK, browser keeps the cookie", detail: "The React app stores the returned user object for display. Proof of login is the cookie, which the browser manages by itself." },
  ],
  edges: [
    { from: "submit", to: "find" },
    { from: "find", to: "found" },
    { from: "found", to: "invalid", label: "no" },
    { from: "found", to: "compare", label: "yes" },
    { from: "compare", to: "invalid", label: "no match" },
    { from: "compare", to: "regen", label: "match" },
    { from: "regen", to: "store" },
    { from: "store", to: "cookie" },
    { from: "cookie", to: "done" },
  ],
  walkthrough: ["submit", "find", "found", "compare", "regen", "store", "cookie", "done"],
};

export const protectedFlow: Flow = {
  id: "protected",
  title: "Protected route: requireAuth",
  summary:
    "Every request carries the cookie automatically. Middleware turns that cookie back into a user, and also checks the session is still current.",
  nodes: [
    { id: "req", kind: "start", actor: "browser", label: "GET /auth/me (cookie sent automatically)", detail: "No code attaches the cookie. The browser does it because of withCredentials and the cookie's domain/path." },
    { id: "load", kind: "storage", actor: "middleware", label: "express-session loads session by id", detail: "express-session verifies the cookie signature, then fetches the session document from MongoDB and exposes it as req.session." },
    { id: "has", kind: "decision", actor: "middleware", label: "req.session.userId set?", detail: "No userId means not logged in (or the session expired and was removed).", code: { file: AUTH_MW, snippet: `if (req.session && req.session.userId) { ... }` } },
    { id: "user", kind: "storage", actor: "database", label: "User.findById(userId).select('-password')", detail: "Load a fresh copy of the user so role changes or deletions take effect immediately. Exclude the password hash." },
    { id: "exists", kind: "decision", actor: "middleware", label: "User still exists?", detail: "The account may have been deleted after the session was created." },
    { id: "version", kind: "decision", actor: "middleware", label: "session.sessionVersion === user.sessionVersion?", detail: "The key trick for 'log out everywhere'. Resetting the password bumps user.sessionVersion, so every older session fails this check and is destroyed.", code: { file: AUTH_MW, snippet: `if (req.session.sessionVersion !== user.sessionVersion) {
  req.session.destroy(() => {});
  return res.status(401).json({ message: "Session expired. Please log in again." });
}` } },
    { id: "stale", kind: "error", actor: "middleware", label: "401 Session expired", detail: "The session was created before the last password reset." },
    { id: "deny", kind: "error", actor: "middleware", label: "401 Authentication required", detail: "The client should send the user to the login screen." },
    { id: "attach", kind: "step", actor: "middleware", label: "req.user = user; next()", detail: "From here on, controllers only read req.user and do not care how the user was authenticated. That separation is the architecture pattern." },
    { id: "done", kind: "success", actor: "server", label: "Controller responds 200", detail: "getMe simply returns req.user." },
  ],
  edges: [
    { from: "req", to: "load" },
    { from: "load", to: "has" },
    { from: "has", to: "deny", label: "no" },
    { from: "has", to: "user", label: "yes" },
    { from: "user", to: "exists" },
    { from: "exists", to: "deny", label: "no" },
    { from: "exists", to: "version", label: "yes" },
    { from: "version", to: "stale", label: "no" },
    { from: "version", to: "attach", label: "yes" },
    { from: "attach", to: "done" },
  ],
  walkthrough: ["req", "load", "has", "user", "exists", "version", "attach", "done"],
};

export const logoutFlow: Flow = {
  id: "logout",
  title: "Logout: destroying the session",
  summary: "Because state lives on the server, logout is instant and complete: delete the record and the cookie becomes worthless.",
  nodes: [
    { id: "req", kind: "start", actor: "browser", label: "POST /auth/logout", detail: "Protected by requireAuth, so only a logged-in session can call it." },
    { id: "destroy", kind: "storage", actor: "database", label: "req.session.destroy()", detail: "Deletes the session document from MongoDB. Even if someone copied the cookie, it now points to nothing.", code: { file: CONTROLLER, snippet: `req.session.destroy((error) => {
  res.clearCookie("connect.sid");
  return res.status(200).json({ message: "Logout successful" });
});` } },
    { id: "clear", kind: "step", actor: "server", label: "res.clearCookie('connect.sid')", detail: "Tell the browser to drop the cookie as well." },
    { id: "done", kind: "success", actor: "browser", label: "200 OK, client clears user state", detail: "This is the big advantage over plain JWTs: server-side revocation is immediate." },
  ],
  edges: [
    { from: "req", to: "destroy" },
    { from: "destroy", to: "clear" },
    { from: "clear", to: "done" },
  ],
  walkthrough: ["req", "destroy", "clear", "done"],
};

export const resetFlow: Flow = {
  id: "reset",
  title: "Forgot & reset password",
  summary:
    "A one-time random token is emailed, only its SHA-256 hash is stored, it expires in 15 minutes, and a successful reset logs out every existing session.",
  nodes: [
    { id: "ask", kind: "start", actor: "browser", label: "POST /auth/forgot-password { email }", detail: "The user only knows their email." },
    { id: "find", kind: "decision", actor: "database", label: "User with this email?", detail: "Either way, the response message is identical, so the endpoint cannot be used to discover accounts." },
    { id: "generic", kind: "success", actor: "server", label: "200 'If an account exists…'", detail: "Unknown email: return the same generic message and do nothing." },
    { id: "token", kind: "step", actor: "crypto", label: "crypto.randomBytes(32) → raw token", detail: "256 bits of randomness, impossible to guess.", code: { file: CONTROLLER, snippet: `const resetToken = crypto.randomBytes(32).toString("hex");
const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);` } },
    { id: "store", kind: "storage", actor: "database", label: "Store sha256(token) + expiry (15 min)", detail: "Store the hash, not the token, so a database leak cannot be used to reset passwords. SHA-256 is fine here (not bcrypt) because the token is long and random." },
    { id: "mail", kind: "step", actor: "server", label: "Email link /reset-password/<raw token>", detail: "Sent with nodemailer. Note: this backend also returns the raw token in the JSON response, which is handy for learning but must be removed in production." },
    { id: "submit", kind: "step", actor: "browser", label: "POST /auth/reset-password/:token { password }", detail: "The user opens the link and picks a new password (min 8 characters)." },
    { id: "verify", kind: "decision", actor: "database", label: "findOne({ hash, expires > now })", detail: "Hash the token from the URL and look it up together with the expiry condition in a single query." },
    { id: "expired", kind: "error", actor: "server", label: "400 Invalid or expired token", detail: "Wrong, already used, or older than 15 minutes." },
    { id: "update", kind: "storage", actor: "database", label: "New bcrypt hash, clear token, sessionVersion += 1", detail: "Clearing the token makes it single-use. Incrementing sessionVersion invalidates every session created before this moment.", code: { file: CONTROLLER, snippet: `user.password = await bcrypt.hash(password, 12);
user.resetPasswordToken = null;
user.resetPasswordExpires = null;
user.sessionVersion += 1;` } },
    { id: "done", kind: "success", actor: "server", label: "200 Password reset, all old sessions dead", detail: "Any other browser still logged in will get '401 Session expired' on its next request (see the requireAuth flow)." },
  ],
  edges: [
    { from: "ask", to: "find" },
    { from: "find", to: "generic", label: "no" },
    { from: "find", to: "token", label: "yes" },
    { from: "token", to: "store" },
    { from: "store", to: "mail" },
    { from: "mail", to: "submit" },
    { from: "submit", to: "verify" },
    { from: "verify", to: "expired", label: "not found" },
    { from: "verify", to: "update", label: "found" },
    { from: "update", to: "done" },
  ],
  walkthrough: ["ask", "find", "token", "store", "mail", "submit", "verify", "update", "done"],
};

export const sessionFlows: Flow[] = [registerFlow, loginFlow, protectedFlow, logoutFlow, resetFlow];
