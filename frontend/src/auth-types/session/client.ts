import { createClient } from "../../lib/http";
import { createRequestLog } from "../../lib/requestLog";

/**
 * Session auth needs nothing but `withCredentials: true`.
 * No token handling in JavaScript at all: the browser owns the cookie.
 */
export const sessionLog = createRequestLog();
export const sessionApi = createClient(sessionLog, { withCredentials: true });

export interface PublicUser {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: string;
}
