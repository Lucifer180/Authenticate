import { useSyncExternalStore } from "react";

/**
 * A tiny observable store that records every HTTP call an example makes,
 * so the learner can see exactly what went over the wire.
 */
export interface LogEntry {
  id: number;
  startedAt: number;
  method: string;
  url: string;
  /** Only the auth-relevant headers (Authorization, x-api-key, ...). */
  headers: Record<string, string>;
  /** True when the browser was told to attach cookies (withCredentials). */
  sendsCookies: boolean;
  body?: unknown;
  status?: number;
  response?: unknown;
  durationMs?: number;
  error?: string;
  /** Free text, e.g. "retried by refresh interceptor". */
  note?: string;
}

type Listener = () => void;

export const createRequestLog = () => {
  let entries: LogEntry[] = [];
  let nextId = 1;
  const listeners = new Set<Listener>();

  const emit = () => listeners.forEach((listener) => listener());

  return {
    getEntries: () => entries,
    subscribe: (listener: Listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    add: (entry: Omit<LogEntry, "id" | "startedAt">) => {
      const id = nextId++;
      entries = [{ ...entry, id, startedAt: Date.now() }, ...entries].slice(0, 50);
      emit();
      return id;
    },
    update: (id: number, patch: Partial<LogEntry>) => {
      entries = entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry));
      emit();
    },
    clear: () => {
      entries = [];
      emit();
    },
  };
};

export type RequestLog = ReturnType<typeof createRequestLog>;

export const useRequestLog = (log: RequestLog) =>
  useSyncExternalStore(log.subscribe, log.getEntries);
