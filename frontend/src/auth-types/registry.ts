import { apiKeyAuth } from "./api-key";
import { jwtAuth } from "./jwt";
import { oauthAuth } from "./oauth";
import { sessionAuth } from "./session";
import type { AuthTypeDefinition, PlannedAuthType } from "./types";

/** Add new authentication types here. Order = order on the home page. */
export const authTypes: AuthTypeDefinition[] = [sessionAuth, jwtAuth, apiKeyAuth, oauthAuth];

/** Shown as "coming soon" so learners can see where the project is heading. */
export const plannedAuthTypes: PlannedAuthType[] = [
  { id: "magic-link", name: "Passwordless magic link", short: "MGL", tagline: "One-time sign-in links sent by email." },
  { id: "totp", name: "Two-factor (TOTP)", short: "2FA", tagline: "Authenticator-app codes as a second factor." },
  { id: "passkeys", name: "Passkeys (WebAuthn)", short: "PSK", tagline: "Public-key credentials, no shared secret at all." },
];

export const findAuthType = (id: string | undefined) => authTypes.find((type) => type.id === id);
