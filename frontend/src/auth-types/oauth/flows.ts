import type { Flow } from "../types";

const ROUTES = "Backend/routes/googleOAuthRoutes.js";

export const authorizeFlow: Flow = {
  id: "authorize",
  title: "Step 1: send the user to Google (authorization request)",
  summary:
    "The browser leaves your site. Your server builds the Google URL and remembers a random `state` in a cookie so it can recognise the user when Google sends them back.",
  nodes: [
    { id: "click", kind: "start", actor: "browser", label: "User clicks 'Sign in with Google'", detail: "This is a normal link (a full-page navigation), not a fetch() call. Google's login page must be shown in the top-level window; it refuses to load inside an iframe or via XHR." },
    { id: "route", kind: "step", actor: "server", label: "GET /api/auth/google", detail: "Your backend owns the OAuth flow. The frontend only needs a link to this endpoint." },
    { id: "state", kind: "step", actor: "crypto", label: "state = randomBytes(32)", detail: "A one-time random value. When Google redirects back, the callback compares it with the cookie. An attacker cannot forge a login into their own account (login CSRF) because they cannot guess or set your state cookie.", code: { file: ROUTES, snippet: `const state = crypto.randomBytes(32).toString("hex");
res.cookie("google_oauth_state", state, {
  httpOnly: true, sameSite: "lax", maxAge: 5 * 60 * 1000,
});` } },
    { id: "cookie", kind: "storage", actor: "browser", label: "Set-Cookie: google_oauth_state (5 min)", detail: "sameSite=lax is enough here: the callback is a top-level GET navigation, and lax cookies are sent on those." },
    { id: "url", kind: "step", actor: "server", label: "302 → accounts.google.com/o/oauth2/v2/auth", detail: "Query: client_id (who is asking), redirect_uri (where to send the user back; must be registered in Google Cloud), response_type=code (authorization-code flow), scope=openid email profile (what we want to know), state.", code: { file: ROUTES, snippet: `const params = new URLSearchParams({
  client_id: process.env.GOOGLE_CLIENT_ID,
  redirect_uri: process.env.GOOGLE_CALLBACK_URL,
  response_type: "code",
  scope: "openid email profile",
  state,
});
res.redirect(\`https://accounts.google.com/o/oauth2/v2/auth?\${params}\`);` } },
    { id: "consent", kind: "decision", actor: "client-app", label: "Google: sign in + consent", detail: "The password is typed into Google, never into your app. The user sees which app is asking and for which scopes." },
    { id: "denied", kind: "error", actor: "client-app", label: "?error=access_denied", detail: "The user cancelled. Google still redirects to the callback, with error instead of code." },
    { id: "back", kind: "success", actor: "browser", label: "302 → /callback?code=…&state=…", detail: "Google sends the browser back to redirect_uri with a short-lived, single-use authorization code. The code alone is useless without your client secret." },
  ],
  edges: [
    { from: "click", to: "route" },
    { from: "route", to: "state" },
    { from: "state", to: "cookie" },
    { from: "cookie", to: "url" },
    { from: "url", to: "consent" },
    { from: "consent", to: "denied", label: "cancel" },
    { from: "consent", to: "back", label: "allow" },
  ],
  walkthrough: ["click", "route", "state", "cookie", "url", "consent", "back"],
};

export const callbackFlow: Flow = {
  id: "callback",
  title: "Step 2: the callback (code → tokens → verified identity)",
  summary:
    "The server checks state, trades the code for tokens directly with Google (using the client secret), verifies the ID token's signature and claims, and finds or creates the user.",
  nodes: [
    { id: "arrive", kind: "start", actor: "server", label: "GET /api/auth/google/callback?code&state", detail: "Arrives as a browser navigation, so the browser also sends the google_oauth_state cookie." },
    { id: "err", kind: "decision", actor: "server", label: "error param present?", detail: "User denied consent or Google reported a problem." },
    { id: "state", kind: "decision", actor: "middleware", label: "state === cookie state?", detail: "The CSRF check. A callback that did not start from our own /google route has no matching cookie.", code: { file: ROUTES, snippet: `if (!state || !savedState || state !== savedState) {
  return redirectWithError(res, "invalid Oauth state");
}
res.clearCookie("google_oauth_state");   // single use` } },
    { id: "fail", kind: "error", actor: "server", label: "Redirect to app with ?oauth_error", detail: "The callback is a page navigation, so errors are sent back to the frontend as a query parameter and shown there." },
    { id: "exchange", kind: "step", actor: "server", label: "POST oauth2.googleapis.com/token", detail: "Server-to-server: code + client_id + client_secret + redirect_uri. The secret never reaches the browser, which is why this exchange must happen on the backend.", code: { file: ROUTES, snippet: `const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ code, client_id, client_secret, redirect_uri,
                              grant_type: "authorization_code" }),
});` } },
    { id: "verify", kind: "decision", actor: "crypto", label: "verifyIdToken(id_token, audience)", detail: "google-auth-library checks the RS256 signature against Google's public keys, that iss is Google, aud is YOUR client id (not a token issued for some other app), and exp. Only then can you trust the claims.", code: { file: ROUTES, snippet: `const ticket = await googleClient.verifyIdToken({
  idToken: tokens.id_token,
  audience: process.env.GOOGLE_CLIENT_ID,
});
const payload = ticket.getPayload();   // sub, email, email_verified, name` } },
    { id: "verified", kind: "decision", actor: "server", label: "email_verified === true?", detail: "Never trust an unverified email: someone could create a Google account with your user's address." },
    { id: "user", kind: "storage", actor: "database", label: "findOrCreateGoogleUser(payload)", detail: "Look up by payload.sub (Google's stable user id; emails can change). Create a GoogleUser on first login.", code: { file: "Backend/src/services/googleService.js", snippet: `let user = await GoogleUser.findOne({ googleId: profile.sub });
if (!user) {
  user = await GoogleUser.create({ googleId: profile.sub, email: profile.email,
    name: profile.name || "", emailVerified: profile.email_verified === true });
}` } },
    { id: "issue", kind: "success", actor: "server", label: "Issue YOUR OWN login (session or JWT)", detail: "Google's tokens have done their job and are discarded. From here on, the user is authenticated with your app's own mechanism; see the next two flows." },
  ],
  edges: [
    { from: "arrive", to: "err" },
    { from: "err", to: "fail", label: "yes" },
    { from: "err", to: "state", label: "no" },
    { from: "state", to: "fail", label: "mismatch" },
    { from: "state", to: "exchange", label: "match" },
    { from: "exchange", to: "verify" },
    { from: "verify", to: "fail", label: "invalid" },
    { from: "verify", to: "verified", label: "valid" },
    { from: "verified", to: "fail", label: "no" },
    { from: "verified", to: "user", label: "yes" },
    { from: "user", to: "issue" },
  ],
  walkthrough: ["arrive", "err", "state", "exchange", "verify", "verified", "user", "issue"],
};

export const sessionFinishFlow: Flow = {
  id: "session",
  title: "Variant A: finish with a server session",
  summary:
    "Same idea as classic session auth: regenerate the session, store the Google user's id in it, and send the browser back to the app with an httpOnly cookie.",
  nodes: [
    { id: "regen", kind: "step", actor: "middleware", label: "req.session.regenerate()", detail: "New session id after login, to prevent session fixation." },
    { id: "store", kind: "storage", actor: "database", label: "session.googleUserId = user._id", detail: "Stored server-side in the sessions collection via connect-mongo.", code: { file: ROUTES, snippet: `req.session.regenerate(() => {
  req.session.googleUserId = user._id.toString();
  req.session.save(() =>
    res.redirect(\`\${frontendOAuthUrl()}?login=google-session\`));
});` } },
    { id: "redirect", kind: "step", actor: "server", label: "302 → app /learn/oauth/example?login=google-session", detail: "Set-Cookie: connect.sid travels with this redirect. The app sees ?login=google-session and asks the API who is logged in." },
    { id: "me", kind: "step", actor: "browser", label: "GET /api/auth/google/me (cookie sent)", detail: "A normal credentialed fetch, exactly like the session example." },
    { id: "guard", kind: "decision", actor: "middleware", label: "requireGoogleSession: googleUserId in session?", detail: "Loads the GoogleUser by the id in the session.", code: { file: "Backend/middleware/googleSessionMiddleware.js", snippet: `const googleUserId = req.session.googleUserId;
if (!googleUserId) return res.status(401).json({ message: "Googe login required" });
req.googleUser = await GoogleUser.findById(googleUserId);` } },
    { id: "deny", kind: "error", actor: "middleware", label: "401 Google login required", detail: "No session, or it was destroyed by logout." },
    { id: "ok", kind: "success", actor: "server", label: "200 { user }", detail: "Logout (POST /google/logout) destroys the session, just like normal session logout." },
  ],
  edges: [
    { from: "regen", to: "store" },
    { from: "store", to: "redirect" },
    { from: "redirect", to: "me" },
    { from: "me", to: "guard" },
    { from: "guard", to: "deny", label: "no" },
    { from: "guard", to: "ok", label: "yes" },
  ],
  walkthrough: ["regen", "store", "redirect", "me", "guard", "ok"],
};

export const jwtFinishFlow: Flow = {
  id: "jwt",
  title: "Variant B: finish with an application JWT",
  summary:
    "Instead of a session, the server signs its own JWT (not Google's token) and hands it to the SPA in the URL fragment. The SPA then sends it as a Bearer token.",
  nodes: [
    { id: "sign", kind: "step", actor: "crypto", label: "jwt.sign({ sub, authProvider: 'google' })", detail: "Signed with GOOGLE_APP_JWT_SECRET, plus iss and aud claims so a token minted for another purpose cannot be replayed here.", code: { file: ROUTES, snippet: `const appToken = jwt.sign(
  { sub: user._id.toString(), authProvider: "google" },
  process.env.GOOGLE_APP_JWT_SECRET,
  { expiresIn: "15m", issuer: "authentication-lab", audience: "authentication-lab-api" }
);` } },
    { id: "fragment", kind: "step", actor: "server", label: "302 → app?login=google-jwt#access_token=…", detail: "The callback is a redirect, so a JSON body would never reach the React app. The URL fragment (after #) is the classic hand-off: browsers do not send it to any server, so it is not in server logs." },
    { id: "read", kind: "step", actor: "browser", label: "Read token from location.hash, then erase it", detail: "history.replaceState removes the fragment immediately, so the token does not stay in the address bar or get bookmarked. The token is then kept only in memory." },
    { id: "call", kind: "step", actor: "browser", label: "GET /api/auth/google/jwt/me, Authorization: Bearer", detail: "No cookies involved." },
    { id: "check", kind: "decision", actor: "middleware", label: "requireGoogleJwt: verify sig, iss, aud, exp", detail: "Then checks authProvider === 'google' and that sub exists.", code: { file: "Backend/middleware/googleMiddleware.js", snippet: `const decoded = jwt.verify(token, process.env.GOOGLE_APP_JWT_SECRET, {
  issuer: "authentication-lab",
  audience: "authentication-lab-api",
});
if (decoded.authProvider !== "google" || !decoded.sub) { /* 401 */ }` } },
    { id: "deny", kind: "error", actor: "middleware", label: "401 Invalid / expired application JWT", detail: "There is no refresh token in this variant: when it expires, sign in with Google again." },
    { id: "ok", kind: "success", actor: "server", label: "200 Application JWT authenticated", detail: "req.auth = { userId, authProvider }." },
  ],
  edges: [
    { from: "sign", to: "fragment" },
    { from: "fragment", to: "read" },
    { from: "read", to: "call" },
    { from: "call", to: "check" },
    { from: "check", to: "deny", label: "fails" },
    { from: "check", to: "ok", label: "valid" },
  ],
  walkthrough: ["sign", "fragment", "read", "call", "check", "ok"],
};

export const oauthFlows: Flow[] = [authorizeFlow, callbackFlow, sessionFinishFlow, jwtFinishFlow];
