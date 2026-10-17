import axios, { AxiosError, type AxiosInstance } from "axios";
import type { RequestLog } from "./requestLog";

declare module "axios" {
  interface InternalAxiosRequestConfig {
    _logId?: number;
    _retry?: boolean;
    /** Do not attach the access token (login / refresh / logout). */
    _skipAuth?: boolean;
  }
  interface AxiosRequestConfig {
    _skipAuth?: boolean;
  }
}

export const API_BASE_URL: string =
  import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

const AUTH_HEADERS = ["authorization", "x-api-key"];

interface ClientOptions {
  /** Send and receive cookies (needed for sessions and the refresh-token cookie). */
  withCredentials?: boolean;
}

/**
 * Every auth type builds its own axios client on top of this one.
 * The logger is registered first, which means:
 *  - its request interceptor runs LAST (axios runs request interceptors in reverse),
 *    so it sees headers added by the auth type's own interceptors;
 *  - its response interceptor runs FIRST, so a 401 is logged before any retry logic.
 */
export const createClient = (log: RequestLog, options: ClientOptions = {}): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: options.withCredentials ?? false,
  });

  client.interceptors.request.use((config) => {
    const headers: Record<string, string> = {};
    for (const name of AUTH_HEADERS) {
      const value = config.headers.get(name);
      if (value) headers[name === "authorization" ? "Authorization" : name] = String(value);
    }

    config._logId = log.add({
      method: (config.method ?? "get").toUpperCase(),
      url: config.url ?? "",
      headers,
      sendsCookies: Boolean(config.withCredentials),
      body: config.data,
      note: config._retry ? "Retried after refreshing the access token" : undefined,
    });
    return config;
  });

  client.interceptors.response.use(
    (response) => {
      const id = response.config._logId;
      if (id) {
        log.update(id, {
          status: response.status,
          response: response.data,
          durationMs: Date.now() - (log.getEntries().find((e) => e.id === id)?.startedAt ?? Date.now()),
        });
      }
      return response;
    },
    (error: AxiosError) => {
      const id = error.config?._logId;
      if (id) {
        log.update(id, {
          status: error.response?.status,
          response: error.response?.data,
          error: error.response
            ? undefined
            : "Network error: is the backend running on " + API_BASE_URL + " ?",
          durationMs: Date.now() - (log.getEntries().find((e) => e.id === id)?.startedAt ?? Date.now()),
        });
      }
      return Promise.reject(error);
    }
  );

  return client;
};

export const errorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    const data = error.response?.data as { message?: string } | undefined;
    if (data?.message) return data.message;
    if (!error.response) return "Cannot reach the backend. Start it with `npm run dev` inside /Backend.";
    return `Request failed with status ${error.response.status}`;
  }
  return error instanceof Error ? error.message : "Something went wrong";
};
