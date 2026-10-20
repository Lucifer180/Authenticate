import type { AuthTypeDefinition } from "../types";
import { oauthArchitecture } from "./architecture";
import { oauthFlows } from "./flows";
import OAuthExample from "./OAuthExample";

export const oauthAuth: AuthTypeDefinition = {
  id: "oauth",
  name: "OAuth 2.0 / OpenID Connect (Google)",
  short: "OAU",
  tagline: "Let Google check the password. Your app issues its own session or JWT.",
  summary:
    "The user is redirected to Google, signs in there, and comes back to your API with a one-time authorization code. The backend exchanges the code (with its client secret) for an ID token, verifies the token's signature and claims, finds or creates the user, and then logs them in with your own mechanism: a server session or an application JWT.",
  whenToUse: [
    "'Sign in with Google / GitHub' instead of (or next to) passwords",
    "You don't want to store or reset passwords yourself",
    "You trust the provider to have verified the email address",
  ],
  pros: ["No passwords to store or reset", "Google handles MFA and suspicious-login checks", "Fast sign-up: name and verified email come with it"],
  cons: [
    "Redirect-based flow, harder to debug",
    "Depends on the provider being available",
    "Account linking (same email, different method) needs a policy",
  ],
  architecture: oauthArchitecture,
  flows: oauthFlows,
  Example: OAuthExample,
};
