import type { Architecture } from "../types";

export const oauthArchitecture: Architecture = {
  diagram: {
    id: "oauth-architecture",
    title: "Three parties: browser, your backend, Google",
    summary:
      "The browser is redirected between your API and Google. The secret-bearing part (code exchange) happens only between your backend and Google.",
    direction: "LR",
    nodes: [
      { id: "app", kind: "start", actor: "browser", label: "React app: 'Sign in with Google' link", detail: "Just a link to /api/auth/google (or /google/jwt). No OAuth library in the frontend." },
      { id: "start", kind: "step", actor: "server", label: "/auth/google (state cookie + redirect)", detail: "Builds the Google authorization URL." },
      { id: "google", kind: "decision", actor: "client-app", label: "Google accounts (login + consent)", detail: "The identity provider. Your app never sees the user's Google password." },
      { id: "callback", kind: "step", actor: "server", label: "/auth/google/callback", detail: "Checks state, exchanges the code, verifies the ID token." },
      { id: "token", kind: "step", actor: "crypto", label: "oauth2.googleapis.com/token + google-auth-library", detail: "Server-to-server code exchange (client secret) and ID-token signature verification." },
      { id: "db", kind: "storage", actor: "database", label: "MongoDB: googleusers (+ sessions)", detail: "GoogleUser keyed by googleId (Google's sub)." },
      { id: "finish", kind: "decision", actor: "middleware", label: "Session cookie or app JWT", detail: "Your own login mechanism takes over; Google is out of the picture." },
      { id: "guards", kind: "success", actor: "middleware", label: "requireGoogleSession / requireGoogleJwt", detail: "Protect /google/me and /google/jwt/me." },
    ],
    edges: [
      { from: "app", to: "start", label: "navigate" },
      { from: "start", to: "google", label: "302" },
      { from: "google", to: "callback", label: "302 code" },
      { from: "callback", to: "token" },
      { from: "callback", to: "db" },
      { from: "callback", to: "finish" },
      { from: "finish", to: "guards" },
    ],
    walkthrough: ["app", "start", "google", "callback", "token", "db", "finish", "guards"],
  },
  files: [
    { path: "Backend/routes/googleOAuthRoutes.js", role: "Authorization redirect, both callbacks (session and JWT), /google/me, /google/jwt/me, logout." },
    { path: "Backend/src/services/googleService.js", role: "findOrCreateGoogleUser(payload): look up by Google sub, create on first login." },
    { path: "Backend/models/GoogleUser.js", role: "googleId (unique), email, name, emailVerified." },
    { path: "Backend/middleware/googleSessionMiddleware.js", role: "requireGoogleSession: session.googleUserId → req.googleUser." },
    { path: "Backend/middleware/googleMiddleware.js", role: "requireGoogleJwt: verifies the app JWT (iss, aud, authProvider)." },
    { path: "Backend/config/passport.js", role: "Alternative Passport.js strategy that links Google logins to the main User model (not wired to routes yet)." },
  ],
  state: [
    { what: "state", where: "google_oauth_state cookie (5 min, httpOnly)", why: "Ties the callback to a login the same browser started: login-CSRF protection." },
    { what: "Authorization code", where: "Callback URL, used once", why: "Short-lived and useless without the client secret." },
    { what: "Client secret", where: "GOOGLE_CLIENT_SECRET on the server only", why: "Proves to Google that the code exchange comes from your backend." },
    { what: "Google tokens (id/access)", where: "Server memory during the callback, then discarded", why: "Only used to learn who the user is. The app then issues its own session or JWT." },
    { what: "Who is logged in", where: "connect.sid session or the app JWT", why: "Exactly the patterns from the Session and JWT types." },
  ],
  decisions: [
    { title: "Authorization-code flow, exchange on the server", body: "The client secret stays on the backend, and tokens never pass through the browser's address bar." },
    { title: "Always verify the ID token", body: "Check signature, issuer, audience (your client id) and expiry before trusting any claim." },
    { title: "Identify users by sub, not email", body: "Google's sub is permanent; emails can change. Require email_verified before using the email." },
    { title: "OAuth logs in; your app keeps you logged in", body: "Don't use Google's access token as your session. Issue your own session or JWT after the callback." },
  ],
};
