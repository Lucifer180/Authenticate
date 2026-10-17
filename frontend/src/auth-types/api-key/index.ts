import type { AuthTypeDefinition } from "../types";
import ApiKeyExample from "./ApiKeyExample";
import { apiKeyArchitecture } from "./architecture";
import { apiKeyFlows } from "./flows";

export const apiKeyAuth: AuthTypeDefinition = {
  id: "api-key",
  name: "API key authentication",
  short: "KEY",
  tagline: "Long-lived secrets for machines, scoped by permissions.",
  summary:
    "An admin creates a key for an integration. The server returns a random 'ak_…' secret once and stores only its SHA-256 hash with an owner, permissions and optional expiry. The integration sends it in the x-api-key header; middleware hashes it, finds the active key, checks expiry and permissions.",
  whenToUse: [
    "Server-to-server integrations, cron jobs, partner APIs",
    "No human is present to type a password",
    "You need per-integration permissions and easy revocation",
  ],
  pros: ["Simple for API consumers (one header)", "Scoped and individually revocable", "No login round-trip"],
  cons: [
    "Long-lived: a leaked key works until revoked",
    "Must never ship in frontend or mobile code",
    "Rotation needs coordination with the consumer",
  ],
  architecture: apiKeyArchitecture,
  flows: apiKeyFlows,
  Example: ApiKeyExample,
};
