/**
 * Decode (NOT verify) a JWT so we can show what is inside it.
 * Anyone can decode a JWT; only the server, holding the secret, can verify it.
 */
export interface DecodedJwt {
  header: Record<string, unknown>;
  payload: Record<string, unknown> & { exp?: number; iat?: number };
  signature: string;
  parts: [string, string, string];
}

const base64UrlDecode = (segment: string) => {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return decodeURIComponent(
    atob(padded)
      .split("")
      .map((char) => "%" + char.charCodeAt(0).toString(16).padStart(2, "0"))
      .join("")
  );
};

const base64UrlEncode = (text: string) =>
  btoa(unescape(encodeURIComponent(text))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export const decodeJwt = (token: string): DecodedJwt | null => {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    return {
      header: JSON.parse(base64UrlDecode(parts[0])),
      payload: JSON.parse(base64UrlDecode(parts[1])),
      signature: parts[2],
      parts: [parts[0], parts[1], parts[2]],
    };
  } catch {
    return null;
  }
};

/** Rewrite the payload but keep the original signature: exactly what an attacker would try. */
export const tamperJwt = (token: string, changes: Record<string, unknown>) => {
  const decoded = decodeJwt(token);
  if (!decoded) return token;
  const payload = base64UrlEncode(JSON.stringify({ ...decoded.payload, ...changes }));
  return `${decoded.parts[0]}.${payload}.${decoded.parts[2]}`;
};
