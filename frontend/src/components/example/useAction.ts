import { useState } from "react";
import { errorMessage } from "../../lib/http";

export type Outcome = { kind: "ok" | "error"; text: string } | null;

/** Wraps an async action and turns the result into an ok / error message. */
export const useAction = () => {
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);

  const run = async (action: () => Promise<string | void>) => {
    setBusy(true);
    setOutcome(null);
    try {
      const text = await action();
      setOutcome(text ? { kind: "ok", text } : null);
    } catch (error) {
      setOutcome({ kind: "error", text: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  return { busy, outcome, run };
};
