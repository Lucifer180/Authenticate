import { useEffect, useState } from "react";

/**
 * All examples hit the same users collection, so remember the demo account
 * the learner typed and prefill it everywhere. Password is kept in
 * sessionStorage only (cleared when the tab closes).
 */
export interface DemoUser {
  name: string;
  email: string;
  password: string;
}

const KEY = "auth-lab:demo-user";

const read = (): DemoUser => {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Storage can be unavailable (private mode); fall back to defaults.
  }
  return { name: "Demo Learner", email: "learner@example.com", password: "" };
};

export const useDemoUser = () => {
  const [user, setUser] = useState<DemoUser>(read);

  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(user));
    } catch {
      // ignore
    }
  }, [user]);

  const update = (patch: Partial<DemoUser>) => setUser((current) => ({ ...current, ...patch }));

  return [user, update] as const;
};
