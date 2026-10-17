import type { AuthTypeDefinition } from "../types";
import { sessionArchitecture } from "./architecture";
import { sessionFlows } from "./flows";
import SessionExample from "./SessionExample";

export const sessionAuth: AuthTypeDefinition = {
  id: "session",
  name: "Session-based authentication",
  short: "SES",
  tagline: "Server remembers you. The browser only holds an opaque cookie.",
  summary:
    "After a successful login the server creates a session record (stored in MongoDB) and sends the browser a signed, httpOnly cookie containing only the session id. Every request carries that cookie automatically; middleware looks the session up and attaches the user. Logging out deletes the record.",
  whenToUse: [
    "Classic web apps where the frontend and API share a domain (or a trusted CORS origin)",
    "You need instant logout and 'log out of all devices'",
    "You want the simplest secure option: no tokens in JavaScript",
  ],
  pros: ["Immediate revocation", "Cookie is httpOnly, so XSS cannot steal it", "Small cookie, state can grow server-side"],
  cons: [
    "Every request hits the session store",
    "Needs CSRF thinking (sameSite helps)",
    "Harder for mobile apps and third-party API clients",
  ],
  architecture: sessionArchitecture,
  flows: sessionFlows,
  Example: SessionExample,
};
