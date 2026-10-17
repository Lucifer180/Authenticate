import { AxiosError } from "axios";
import { useSyncExternalStore } from "react";
import { createClient } from "../../lib/http";
import type { RequestLog } from "../../lib/requestLog";

/**
 * The access token lives in a plain JavaScript variable (memory):
 *  - not localStorage, which any XSS can read forever;
 *  - lost on page reload, which is fine because the refresh cookie gets a new one.
 */
const createTokenStore = () => {
  let token: string | null = null;
  const listeners = new Set<() => void>();
  return {
    get: () => token,
    set: (value: string | null) => {
      token = value;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};

export type TokenStore = ReturnType<typeof createTokenStore>;

export const useAccessToken = (store: TokenStore) => useSyncExternalStore(store.subscribe, store.get);

/**
 * Builds an axios client that:
 *  1. adds `Authorization: Bearer <token>` to every request (request interceptor);
 *  2. on a 401, calls /auth/jwt/refresh once and retries the original request (response interceptor).
 * The API-key example reuses this to log in as an admin.
 */
export const createJwtClient = (log: RequestLog) => {
  const tokens = createTokenStore();
  // Cookies are only needed for login / refresh / logout, so they opt in per request.
  const api = createClient(log);
  const options = { autoRefresh: true };

  let refreshing: Promise<string> | null = null;

  /** Single flight: if five requests 401 at once, only one refresh call is made. */
  const refresh = () => {
    if (!refreshing) {
      refreshing = api
        .post("/auth/jwt/refresh", {}, { withCredentials: true, _skipAuth: true })
        .then((response) => {
          tokens.set(response.data.accessToken);
          return response.data.accessToken as string;
        })
        .finally(() => {
          refreshing = null;
        });
    }
    return refreshing;
  };

  api.interceptors.request.use((config) => {
    const token = tokens.get();
    if (token && !config._skipAuth) config.headers.set("Authorization", `Bearer ${token}`);
    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const original = error.config;
      if (options.autoRefresh && error.response?.status === 401 && original && !original._retry && !original._skipAuth) {
        original._retry = true;
        try {
          await refresh();
          return api(original); // the request interceptor attaches the new token
        } catch {
          tokens.set(null); // refresh failed: the user must log in again
        }
      }
      return Promise.reject(error);
    }
  );

  const login = async (email: string, password: string) => {
    const response = await api.post(
      "/auth/jwt/login",
      { email, password },
      { withCredentials: true, _skipAuth: true }
    );
    tokens.set(response.data.accessToken);
    return response.data as { message: string; accessToken: string; user: { id: string; name: string; email: string; role: string } };
  };

  const logout = async () => {
    try {
      const response = await api.post("/auth/jwt/logout", {}, { withCredentials: true, _skipAuth: true });
      return response.data.message as string;
    } finally {
      tokens.set(null);
    }
  };

  return { api, tokens, refresh, login, logout, options };
};
