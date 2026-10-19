import { useState, type ReactNode } from "react";
import { useRequestLog, type RequestLog } from "../../lib/requestLog";
import RequestLogView from "./RequestLogView";

interface Props {
  log: RequestLog;
  /** Live state shown above the steps (who is logged in, current token...). */
  status?: ReactNode;
  children: ReactNode;
}

const ExampleLayout = ({ log, status, children }: Props) => {
  const entries = useRequestLog(log);
  // Small screens only: the inspector is a bottom sheet that opens on demand.
  const [sheetOpen, setSheetOpen] = useState(false);
  const latest = entries[0];

  return (
    <div className="example">
      <div className="example__main">
        {status && <div className="example__status">{status}</div>}
        <ol className="example__steps">{children}</ol>
      </div>
      <div className={`example__side ${sheetOpen ? "is-open" : ""}`}>
        <button
          type="button"
          className="sheet-bar"
          onClick={() => setSheetOpen((open) => !open)}
          aria-expanded={sheetOpen}
        >
          <span className="sheet-bar__title">
            Network inspector <span className="sheet-bar__count">{entries.length}</span>
          </span>
          {latest && (
            <span className="sheet-bar__latest">
              {latest.method} {latest.url} ·{" "}
              <b className={latest.error || (latest.status ?? 0) >= 400 ? "is-bad" : "is-ok"}>
                {latest.error ? "ERR" : latest.status ?? "…"}
              </b>
            </span>
          )}
          <span className="sheet-bar__chevron" aria-hidden>
            {sheetOpen ? "▾" : "▴"}
          </span>
        </button>
        <RequestLogView log={log} />
      </div>
    </div>
  );
};

export default ExampleLayout;
