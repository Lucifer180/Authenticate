import type { FormEvent, ReactNode } from "react";
import { useAction, type Outcome } from "./useAction";

interface Props {
  /** Step number badge; omit for explanatory cards. */
  step?: number;
  title: string;
  /** e.g. "POST /auth/login" */
  endpoint?: string;
  /** What the learner should look for after running this step. */
  notice?: ReactNode;
  children?: ReactNode;
  /** Primary action. Return a message to show on success. */
  onRun?: () => Promise<string | void>;
  runLabel?: string;
  disabled?: boolean;
  /** Extra buttons beside the primary one. */
  actions?: ReactNode;
}

export const OutcomeMessage = ({ outcome }: { outcome: Outcome }) =>
  outcome ? (
    <p className={`outcome outcome--${outcome.kind}`} role="status">
      {outcome.text}
    </p>
  ) : null;

const ActionCard = ({ step, title, endpoint, notice, children, onRun, runLabel = "Send", disabled, actions }: Props) => {
  const { busy, outcome, run } = useAction();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (onRun) run(onRun);
  };

  return (
    <li className="action">
      <form className="action__card" onSubmit={submit}>
        <header className="action__head">
          {step !== undefined && <span className="action__step">{step}</span>}
          <h4>{title}</h4>
          {endpoint && <code className="action__endpoint">{endpoint}</code>}
        </header>
        {children && <div className="action__fields">{children}</div>}
        {(onRun || actions) && (
          <div className="action__buttons">
            {onRun && (
              <button className="btn" type="submit" disabled={busy || disabled}>
                {busy ? "Sending…" : runLabel}
              </button>
            )}
            {actions}
          </div>
        )}
        <OutcomeMessage outcome={outcome} />
        {notice && <div className="action__notice">{notice}</div>}
      </form>
    </li>
  );
};

export default ActionCard;
