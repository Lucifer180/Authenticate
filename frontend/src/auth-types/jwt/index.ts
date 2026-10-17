import type { AuthTypeDefinition } from "../types";
import { jwtArchitecture } from "./architecture";
import { jwtFlows } from "./flows";
import JwtExample from "./JwtExample";

export const jwtAuth: AuthTypeDefinition = {
  id: "jwt",
  name: "JWT (access + refresh tokens)",
  short: "JWT",
  tagline: "A signed token proves who you are. A refresh cookie keeps you logged in.",
  summary:
    "On login the server signs a short-lived JSON Web Token containing the user id and role, and sets a long-lived random refresh token in an httpOnly cookie. The client sends the JWT in the Authorization header; the server only has to verify the signature. When it expires, the client trades the refresh cookie for a new pair (rotation).",
  whenToUse: [
    "SPAs and mobile apps talking to an API on another domain",
    "Several services need to verify identity without sharing a session store",
    "You can accept that access tokens live until they expire",
  ],
  pros: ["Verification needs no DB lookup", "Works across domains and for mobile", "Claims (role) travel with the request"],
  cons: [
    "Cannot revoke an access token before exp",
    "More moving parts: refresh, rotation, interceptors",
    "Storing tokens in JS needs XSS discipline",
  ],
  architecture: jwtArchitecture,
  flows: jwtFlows,
  Example: JwtExample,
};
